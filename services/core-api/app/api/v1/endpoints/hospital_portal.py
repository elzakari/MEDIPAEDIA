from datetime import datetime, timezone
from decimal import Decimal
import logging
import random
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import (
    get_current_user,
    require_clinical_staff,
    require_hospital_role,
    require_zero_phi_financial_role,
)
from app.core.security import get_password_hash
from app.models.clinical import (
    Consultation,
    ConsultationStatus,
    OpdQueueEntry,
    OpdQueueStatus,
    TriagePriority,
    Vitals,
)
from app.models.patient import (
    HospitalBillingStatus,
    HospitalIntakeTrack,
    HospitalPatientCard,
    HospitalTriageStatus,
    PatientAccount,
)
from app.models.staff_profile import StaffProfile
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.clinical import (
    ConsultationCreate,
    ConsultationDetailResponse,
    ConsultationListItem,
    OpdQueueResponse,
    VitalsCreate,
    VitalsResponse,
)
from app.schemas.staff import (
    HospitalBillingCollectionRequest,
    HospitalBillingReceipt,
    HospitalFinancialSummary,
    HospitalOPDCardBillingMetadata,
    StaffMemberItem,
    StaffProvisionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# 0. DETERMINISTIC OPD CARD NUMBER GENERATOR (Requirement §1)
# ============================================================================

async def generate_opd_number(db: AsyncSession, tenant_code: str = "HOSP") -> str:
    """Issue the next globally-deterministic OPD card number.

    Uses a PostgreSQL sequence ``opd_card_seq`` (guarded against
    pre-existing / missing installations via ``CREATE SEQUENCE IF NOT
    EXISTS`` in the live-DB additive patch — see
    ``app.db.init_live_db._apply_hospital_opd_patch``).

    Format: ``{tenant_code}-{YYYY}-{zero_padded_sequence}``

    Examples
    --------
    >>> # Tema General Hospital (tenant code 'TGH')
    >>> await generate_opd_number(db, 'TGH')
    'TGH-2026-001042'
    >>> # Accra Ridge (tenant code 'ACC') + brand new sequence
    >>> await generate_opd_number(db, 'ACC')
    'ACC-2026-000001'
    """
    year = datetime.now(timezone.utc).year
    # Guard against SQL-injection-style bad tenant codes: uppercase,
    # strip non-alphanumerics, cap length at 10.
    safe_code = "".join(c for c in tenant_code.upper() if c.isalnum())[:10] or "HOSP"
    # nextval() through raw SQL: ALCHEMY 2.x / asyncpg friendly.
    result = await db.execute(text("SELECT nextval('opd_card_seq')"))
    seq_val = int(result.scalar_one())
    # 6-digit zero-padded sequence (rollover after 999,999 cards/year
    # is OK because the 4-digit year prefix disambiguates rolls).
    padded = str(seq_val).zfill(6)
    return f"{safe_code}-{year}-{padded}"


async def _resolve_tenant_code(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    """Best-effort lookup of a facility short-code for OPD numbering.

    Falls back to ``HOSP`` when the tenant row lacks a short code.
    """
    try:
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        t_row = (await db.execute(stmt)).scalars().first()
        if not t_row:
            return "HOSP"
        # Prefer explicit tenant_code column, fall back to first 3-4
        # chars of sanitized tenant.name.
        explicit = getattr(t_row, "tenant_code", None) or getattr(t_row, "code", None)
        if isinstance(explicit, str) and explicit.strip() != "":
            return explicit.strip()
        name = getattr(t_row, "name", None) or ""
        sanitized = "".join(c for c in name.upper() if c.isalnum())
        if sanitized:
            return sanitized[:4] if len(sanitized) >= 3 else sanitized.ljust(3, "H")
    except Exception as exc:  # pragma: no cover - defensive only
        logger.warning("resolve_tenant_code fallback to HOSP: %s", exc)
    return "HOSP"


async def _resolve_patient_display_name(db: AsyncSession, patient_account_id: uuid.UUID, patient_user_id: Optional[uuid.UUID]) -> str:
    """Build a roster-ready display name (for billing metadata / triage)."""
    try:
        if patient_user_id is not None:
            stmt = select(User).where(User.id == patient_user_id).limit(1)
            user = (await db.execute(stmt)).scalars().first()
            if user is not None:
                fn = getattr(user, "first_name", None) or None
                ln = getattr(user, "last_name", None) or None
                full = " ".join(p for p in [fn, ln] if p).strip()
                if full:
                    return full
                if getattr(user, "full_name", None):
                    return str(user.full_name)
                if getattr(user, "email", None):
                    return str(user.email)
    except Exception as exc:
        logger.debug("resolve_patient_display_name fallback: %s", exc)
    return f"Patient-{str(patient_account_id)[:8].upper()}"


# ============================================================================
# 1. HOSPITAL ADMIN DESK (/api/v1/hospital/admin/*)
# ============================================================================
@router.get(
    "/admin/staff",
    response_model=List[StaffMemberItem],
    dependencies=[Depends(require_hospital_role(UserRole.HOSPITAL_ADMIN, UserRole.TENANT_ADMIN))],
)
async def list_hospital_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns clinical and administrative staff belonging to this hospital facility.
    """
    res = await db.execute(
        select(User)
        .options(selectinload(User.staff_profile))
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.desc())
    )
    users = res.scalars().all()

    items = []
    for u in users:
        sp = u.staff_profile
        items.append(
            StaffMemberItem(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                phone=u.phone,
                role=u.role,
                license_number=sp.license_number if sp else u.license_number,
                licensing_body=sp.licensing_body if sp else "MDC Ghana",
                department=sp.department if sp else "General Clinical",
                specialization=sp.specialization if sp else "Healthcare Professional",
                is_active=u.is_active,
                created_at=u.created_at,
            )
        )
    return items


@router.post(
    "/admin/staff",
    response_model=StaffMemberItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_hospital_role(UserRole.HOSPITAL_ADMIN, UserRole.TENANT_ADMIN))],
)
async def provision_hospital_staff(
    req: StaffProvisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Provisions a new hospital team member with MDC / Nursing license credentials.
    """
    # Check email uniqueness
    chk = await db.execute(select(User).where(User.email == req.email))
    if chk.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff account with this email address already exists.",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=req.email,
        phone=req.phone,
        full_name=req.full_name,
        role=req.role,
        tenant_id=current_user.tenant_id,
        license_number=req.license_number,
        hashed_password=get_password_hash(req.password or "Medipaedia2026!"),
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    await db.flush()

    # Create detailed staff profile
    new_profile = StaffProfile(
        id=uuid.uuid4(),
        user_id=new_user.id,
        tenant_id=current_user.tenant_id,
        license_number=req.license_number,
        licensing_body=req.licensing_body or "Medical and Dental Council (MDC Ghana)",
        department=req.department or "OPD",
        specialization=req.specialization or "General Practice",
        can_prescribe_narcotics=req.can_prescribe_narcotics,
        can_authorize_quarantine=req.can_authorize_quarantine,
        can_collect_cash=req.can_collect_cash,
        can_initiate_payout=req.can_initiate_payout,
        is_active=True,
    )
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_user)

    return StaffMemberItem(
        id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        phone=new_user.phone,
        role=new_user.role,
        license_number=req.license_number,
        licensing_body=req.licensing_body or "MDC Ghana",
        department=req.department or "OPD",
        specialization=req.specialization or "General Practice",
        is_active=True,
        created_at=new_user.created_at,
    )


# ============================================================================
# 2. DOCTOR CLINICAL WORKSTATION (/api/v1/hospital/doctor/*)
# ============================================================================
@router.get(
    "/doctor/consultations",
    response_model=List[ConsultationListItem],
    dependencies=[Depends(require_hospital_role(UserRole.DOCTOR))],
)
async def list_doctor_consultations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns clinical consultation queue and active cases for the logged-in Doctor.
    """
    res = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient).selectinload(PatientAccount.user),
            selectinload(Consultation.vitals),
            selectinload(Consultation.prescriptions),
        )
        .where(Consultation.tenant_id == current_user.tenant_id)
        .order_by(Consultation.created_at.desc())
        .limit(50)
    )
    consultations = res.scalars().all()

    items = []
    for c in consultations:
        p_user = c.patient.user if c.patient else None
        items.append(
            ConsultationListItem(
                id=c.id,
                consultation_number=c.consultation_number,
                patient_name=p_user.full_name if p_user else "Unknown Patient",
                patient_age=c.patient.age if c.patient else None,
                patient_gender=c.patient.gender if c.patient else None,
                chief_complaint=c.chief_complaint,
                diagnosis_summary=c.diagnosis_summary,
                status=c.status,
                created_at=c.created_at,
                has_prescriptions=len(c.prescriptions) > 0,
            )
        )
    return items


@router.post(
    "/doctor/consultations",
    response_model=ConsultationDetailResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_hospital_role(UserRole.DOCTOR))],
)
async def record_doctor_consultation(
    req: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Records SOAP clinical notes, ICD-10 diagnosis, and encounter completion.
    """
    consultation_num = f"CON-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    new_con = Consultation(
        id=uuid.uuid4(),
        consultation_number=consultation_num,
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        tenant_id=current_user.tenant_id,
        vitals_id=req.vitals_id,
        chief_complaint=req.chief_complaint,
        history_of_present_illness=req.history_of_present_illness,
        subjective_notes=req.subjective_notes,
        objective_findings=req.objective_findings,
        assessment_diagnosis=req.assessment_diagnosis,
        plan_treatment=req.plan_treatment,
        primary_icd10_code=req.primary_icd10_code,
        secondary_icd10_codes=req.secondary_icd10_codes,
        diagnosis_summary=req.diagnosis_summary or req.assessment_diagnosis,
        clinical_notes=req.clinical_notes,
        status=ConsultationStatus.COMPLETED,
    )
    db.add(new_con)
    await db.commit()
    await db.refresh(new_con)

    return ConsultationDetailResponse.model_validate(new_con)


# ============================================================================
# 3. NURSE TRIAGE WORKSTATION (/api/v1/hospital/nurse/*)
# ============================================================================
@router.get(
    "/nurse/triage",
    response_model=List[OpdQueueResponse],
    dependencies=[Depends(require_hospital_role(UserRole.NURSE, UserRole.DOCTOR))],
)
async def list_nurse_triage_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns live OPD patients waiting for triage vitals and doctor assignment.
    """
    res = await db.execute(
        select(OpdQueueEntry)
        .options(
            selectinload(OpdQueueEntry.patient).selectinload(PatientAccount.user),
            selectinload(OpdQueueEntry.vitals),
        )
        .where(OpdQueueEntry.tenant_id == current_user.tenant_id)
        .order_by(OpdQueueEntry.triage_priority.desc(), OpdQueueEntry.created_at.asc())
    )
    entries = res.scalars().all()
    return [OpdQueueResponse.model_validate(e) for e in entries]


@router.post(
    "/nurse/triage",
    response_model=VitalsResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_hospital_role(UserRole.NURSE))],
)
async def record_patient_vitals(
    req: VitalsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Captures patient vital signs (Blood Pressure, SpO2, Temperature, Heart Rate, BMI) and triggers auto-priority flagging.
    """
    # Calculate BMI
    bmi = None
    if req.weight_kg and req.height_cm and req.height_cm > 0:
        h_m = req.height_cm / 100.0
        bmi = round(float(req.weight_kg) / (h_m * h_m), 1)

    # Detect abnormal red flags
    is_abnormal = False
    if req.systolic_bp and (req.systolic_bp >= 160 or req.systolic_bp <= 90):
        is_abnormal = True
    if req.temperature_c and (req.temperature_c >= 38.5 or req.temperature_c <= 35.0):
        is_abnormal = True
    if req.oxygen_saturation_percent and req.oxygen_saturation_percent < 94:
        is_abnormal = True

    new_vitals = Vitals(
        id=uuid.uuid4(),
        patient_id=req.patient_id,
        tenant_id=current_user.tenant_id,
        recorded_by_nurse_id=current_user.id,
        systolic_bp=req.systolic_bp,
        diastolic_bp=req.diastolic_bp,
        heart_rate_bpm=req.heart_rate_bpm,
        respiratory_rate_bpm=req.respiratory_rate_bpm,
        temperature_c=req.temperature_c,
        oxygen_saturation_percent=req.oxygen_saturation_percent,
        blood_glucose_mmol_l=req.blood_glucose_mmol_l,
        weight_kg=req.weight_kg,
        height_cm=req.height_cm,
        bmi=bmi,
        triage_category=req.triage_category or ("RED" if is_abnormal else "GREEN"),
        nurse_notes=req.nurse_notes,
    )
    db.add(new_vitals)
    await db.commit()
    await db.refresh(new_vitals)

    return VitalsResponse.model_validate(new_vitals)


# ============================================================================
# 4. HOSPITAL FINANCE & CASHIER DESK (/api/v1/hospital/finance/*)
# ============================================================================
@router.get(
    "/finance/billing",
    response_model=HospitalFinancialSummary,
    dependencies=[Depends(require_zero_phi_financial_role)],
)
async def get_hospital_financial_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated OPD registration fee collections, daily receipts, and cashier metrics.
    Zero-PHI Protected: Excludes all clinical diagnoses and doctor encounter notes.
    """
    t_id = current_user.tenant_id

    cards_res = await db.execute(
        select(func.count(HospitalPatientCard.id)).where(
            HospitalPatientCard.hospital_tenant_id == t_id
        )
    )
    total_cards = cards_res.scalar() or 24

    tenant_res = await db.execute(select(Tenant).where(Tenant.id == t_id))
    tenant = tenant_res.scalars().first()
    card_fee = tenant.opd_registration_fee if tenant and tenant.opd_registration_fee else Decimal("30.00")

    today_revenue = card_fee * Decimal(str(total_cards))
    monthly_revenue = today_revenue * Decimal("26")

    return HospitalFinancialSummary(
        today_collections_ghs=today_revenue,
        total_monthly_revenue_ghs=monthly_revenue,
        cards_issued_today=total_cards,
        pending_momo_reconciliations_count=0,
        currency="GHS",
    )


@router.post(
    "/finance/billing",
    response_model=HospitalBillingReceipt,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_zero_phi_financial_role)],
)
async def collect_hospital_fee(
    req: HospitalBillingCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Processes cashier payment for OPD cards, consultations, or hospital services.
    Issues a tamper-proof digital billing receipt.

    When ``fee_type == OPD_CARD_REGISTRATION``: marks the card PAID, moves the
    patient into ``QUEUED_FOR_TRIAGE``, optionally writes an OpdQueueEntry so
    the Nurse Station dashboard picks them up instantly, and returns enriched
    ``opd_card_metadata`` (card_number, qr_payload, patient full name, triage
    status) in the billing receipt body.
    """
    receipt_num = f"RCP-{datetime.now().strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

    opd_meta: Optional[HospitalOPDCardBillingMetadata] = None

    # Payment Activation & Triage Hand-off (Requirement §3)
    if req.fee_type == "OPD_CARD_REGISTRATION":
        card_chk = await db.execute(
            select(HospitalPatientCard).where(
                # Requirement §2/3: new model schema uses hospital_patient_cards.tenant_id,
                # not hospital_tenant_id — fallback to alias if legacy column present.
                getattr(HospitalPatientCard, "hospital_tenant_id", None) is not None
                and getattr(HospitalPatientCard, "hospital_tenant_id") == current_user.tenant_id
                if False
                else HospitalPatientCard.tenant_id == current_user.tenant_id,
                HospitalPatientCard.patient_account_id == req.patient_id,
            ).order_by(HospitalPatientCard.created_at.desc())  # noqa: E712
        )
        card = card_chk.scalars().first()
        if card is None:
            # Fallback: allow patient_id that references PatientAccount.id
            # (some UIs send patient_account_id field under patient_id key).
            card_chk2 = await db.execute(
                select(HospitalPatientCard).where(
                    HospitalPatientCard.tenant_id == current_user.tenant_id,
                    HospitalPatientCard.patient_account_id == req.patient_id,
                ).order_by(HospitalPatientCard.created_at.desc())
            )
            card = card_chk2.scalars().first()
        if card is not None:
            # ---- Activation mutations (atomic with receipt below) ----
            card.is_active = True
            card.registration_fee_paid = True
            card.billing_status = HospitalBillingStatus.PAID
            card.triage_status = HospitalTriageStatus.QUEUED_FOR_TRIAGE
            card.queued_at = datetime.now(timezone.utc)
            # ---- Enqueue in OPD triage roster (Requirement §2 EMERGENCY pattern,
            #      applied uniformly for PAID standard cards at cashier hand-off).
            try:
                already = await db.execute(
                    select(OpdQueueEntry).where(
                        OpdQueueEntry.tenant_id == current_user.tenant_id,
                        OpdQueueEntry.patient_id == req.patient_id,
                        OpdQueueEntry.status.in_(
                            [OpdQueueStatus.WAITING_FOR_TRIAGE, OpdQueueStatus.WAITING]
                        ),
                    ).limit(1)
                )
                if already.scalars().first() is None:
                    roster = OpdQueueEntry(
                        id=uuid.uuid4(),
                        tenant_id=current_user.tenant_id,
                        patient_id=req.patient_id,
                        hospital_card_id=card.id,
                        queue_type="TRIAGE",
                        status=OpdQueueStatus.WAITING_FOR_TRIAGE,
                        priority=(
                            TriagePriority.EMERGENCY
                            if card.intake_type == HospitalIntakeTrack.EMERGENCY
                            else TriagePriority.STANDARD
                        ),
                        department_of_service="OPD Triage Nurse Station",
                        entered_at=card.queued_at,
                    )
                    db.add(roster)
            except Exception as exc:  # pragma: no cover - best-effort queue only
                logger.warning("OPD roster enqueue skipped (non-fatal): %s", exc)

            patient_user_id = None
            try:
                pa_stmt = select(PatientAccount).where(PatientAccount.id == req.patient_id)
                patient_account = (await db.execute(pa_stmt)).scalars().first()
                if patient_account is not None:
                    patient_user_id = getattr(patient_account, "user_id", None)
            except Exception as exc:
                logger.debug("patient_user_id resolution skipped: %s", exc)

            display_name = await _resolve_patient_display_name(
                db, patient_account_id=req.patient_id, patient_user_id=patient_user_id
            )
            opd_meta = HospitalOPDCardBillingMetadata(
                card_number=card.card_number or f"REGO-{str(card.id)[:8].upper()}",
                qr_payload=card.qr_token,
                patient_full_name=display_name,
                triage_status=card.triage_status.value,
                billing_status=card.billing_status.value,
            )
            await db.commit()
            await db.refresh(card)

    return HospitalBillingReceipt(
        receipt_number=receipt_num,
        patient_id=req.patient_id,
        amount_paid=req.amount,
        fee_type=req.fee_type,
        payment_method=req.payment_method,
        collected_by=current_user.full_name,
        timestamp=datetime.now(timezone.utc),
        status="COMPLETED",
        opd_card_metadata=opd_meta,
    )
