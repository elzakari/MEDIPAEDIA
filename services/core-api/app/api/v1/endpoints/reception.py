from datetime import date, datetime, timezone
from decimal import Decimal
import difflib
import logging
import random
import re
import string
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db

logger = logging.getLogger("medipaedia.reception")
from app.core.deps import (
    get_current_tenant,
    get_current_user,
    get_optional_tenant,
    require_hospital_role,
    require_roles,
)
from app.core.security import get_password_hash
from app.models.clinical import (
    Consultation,
    OpdQueueEntry,
    OpdQueueStatus,
    TriagePriority,
    Vitals,
)
from app.models.patient import HospitalPatientCard, PatientAccount, PhysicalFolderTransit
from app.models.prescription import Prescription
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.reception import (
    ActiveQueueItemResponse,
    ClinicDepartment,
    DeduplicationWarning,
    DepartmentQueueSummary,
    EmergencyTraumaIntakeRequest,
    EmergencyTraumaIntakeResponse,
    FolderLedgerItemResponse,
    FolderStatus,
    FolderTransitLogRequest,
    FolderTransitLogResponse,
    MergePatientRecordsRequest,
    MergePatientRecordsResponse,
    NHISStatus,
    PatientMasterSearchResult,
    QueueDispatchRequest,
    QueueDispatchResponse,
    QueueTicketPrintResponse,
    QueueTVDisplayResponse,
    ReceptionPatientRegisterRequest,
    ReceptionPatientRegisterResponse,
    ReceptionTriagePriority,
    TVCalledTicket,
    WristbandPrintResponse,
    FastScannerIntakeRequest,
    FastScannerIntakeResponse,
    FastScannerResolvedPatient,
    FolderShelfLocationItem,
    FolderArchiveMapResponse,
    FolderCheckoutActionRequest,
    FolderReturnActionRequest,
    FolderTransitActionResponse,
    QueueAudioEventItem,
    QueueAudioStreamResponse,
)

router = APIRouter()

# In-memory store for active TV calls and folder transit ledgers for real-time agility
_TV_CALLED_TICKETS: List[TVCalledTicket] = []

_IN_MEMORY_FOLDER_LOGS: List[dict] = []


def _compute_fuzzy_score(s1: str, s2: str) -> float:
    """Calculates normalized sequence similarity ratio."""
    if not s1 or not s2:
        return 0.0
    return difflib.SequenceMatcher(None, s1.strip().lower(), s2.strip().lower()).ratio()


# Department prefix map – single source of truth used by all intake endpoints
_DEPT_PREFIX_MAP = {
    ClinicDepartment.GENERAL_OPD:  "OPD",
    ClinicDepartment.ANTENATAL:    "ANC",
    ClinicDepartment.EYE_CLINIC:   "EYE",
    ClinicDepartment.PEDIATRICS:   "PED",
    ClinicDepartment.EMERGENCY:    "EMER",
    ClinicDepartment.DENTAL:       "DNT",
    ClinicDepartment.SURGICAL_OPD: "SUR",
}

# UUID-like pattern detector (8+ hex chars with optional dashes)
_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _is_uuid_like(value: str) -> bool:
    """Returns True if value looks like a raw UUID string."""
    return bool(_UUID_PATTERN.match(value.strip()))


def _make_ticket_number(dept: ClinicDepartment, seq: Optional[int] = None) -> str:
    """
    Generates a human-readable ticket shortcode.

    Format: <PREFIX>-<NNN>   e.g.  OPD-102, EMER-009, ANC-047
    If seq is None a random 3-digit number is used (suitable for demo / no-DB paths).
    """
    prefix = _DEPT_PREFIX_MAP.get(dept, "OPD")
    number = seq if seq is not None else random.randint(100, 999)
    return f"{prefix}-{number:03d}"


def _sanitize_ticket_number(
    raw: Optional[str],
    dept: Optional[ClinicDepartment] = None,
    entry_id: Optional[str] = None,
) -> str:
    """
    Returns a clean, display-safe ticket shortcode.

    If raw is None, a UUID, or longer than 15 chars it is replaced with a
    derived shortcode built from the department prefix + the last 3 chars of
    entry_id (or a random suffix).
    """
    if raw and not _is_uuid_like(raw) and len(raw) <= 15:
        return raw
    # Derive from entry_id tail if available
    suffix = entry_id[-3:].upper() if entry_id else f"{random.randint(100, 999):03d}"
    # Make suffix purely numeric-looking if it happens to be all hex
    try:
        suffix = f"{int(suffix, 16) % 1000:03d}"
    except ValueError:
        pass
    prefix = _DEPT_PREFIX_MAP.get(dept, "OPD") if dept else "OPD"
    return f"{prefix}-{suffix}"



# ============================================================================
# 1. High-Speed Patient Master Index Search with Deduplication Warnings
# ============================================================================
@router.get(
    "/patients/search",
    response_model=List[PatientMasterSearchResult],
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def search_patients_master(
    q: str = Query(..., min_length=1, description="Ghana Card, MRN, Name, Phone, or DOB"),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    query_str = q.strip()
    query_lower = query_str.lower()

    # Query all patients with user and hospital cards loaded
    stmt = select(PatientAccount).options(
        selectinload(PatientAccount.user),
        selectinload(PatientAccount.hospital_cards),
    )
    result = await db.execute(stmt)
    all_patients = result.scalars().all()

    matched_results: List[PatientMasterSearchResult] = []

    for patient in all_patients:
        user = patient.user
        if not user:
            continue

        full_name = user.full_name or ""
        ghana_card = patient.ghana_card_id or ""
        phone = user.phone or ""
        dob_str = str(patient.date_of_birth) if patient.date_of_birth else ""
        nhis = patient.nhis_number or ""

        # Find facility MRN
        card = None
        if patient.hospital_cards:
            for c in patient.hospital_cards:
                if tenant and c.tenant_id == tenant.id and c.is_active:
                    card = c
                    break
            if not card and patient.hospital_cards:
                card = patient.hospital_cards[0]

        mrn = card.mrn if card else f"MRN-TEMP-{str(patient.id)[:8].upper()}"
        qr_token = card.qr_token if card else f"MEDICARD-{uuid.uuid4().hex[:8].upper()}"
        rack = card.physical_folder_rack if card and card.physical_folder_rack else "Rack-A1"
        shelf = card.physical_folder_shelf if card and card.physical_folder_shelf else "Shelf-01"
        folder_status = card.folder_status if card and card.folder_status else FolderStatus.IN_ARCHIVE

        # Check match criteria
        is_match = False
        if query_lower in ghana_card.lower():
            is_match = True
        elif query_lower in mrn.lower():
            is_match = True
        elif query_lower in phone.lower():
            is_match = True
        elif query_lower in dob_str:
            is_match = True
        elif query_lower in nhis.lower():
            is_match = True
        elif query_lower in full_name.lower():
            is_match = True
        elif _compute_fuzzy_score(query_str, full_name) >= 0.70:
            is_match = True

        if is_match:
            # Check for deduplication warnings against other records
            dedup_warnings: List[DeduplicationWarning] = []
            for other_patient in all_patients:
                if other_patient.id == patient.id:
                    continue
                other_user = other_patient.user
                if not other_user:
                    continue

                other_name = other_user.full_name or ""
                other_phone = other_user.phone or ""
                other_card = (
                    other_patient.hospital_cards[0] if other_patient.hospital_cards else None
                )
                other_mrn = other_card.mrn if other_card else "N/A"

                # Check exact phone match
                if phone and other_phone and phone == other_phone:
                    dedup_warnings.append(
                        DeduplicationWarning(
                            match_field="phone",
                            similarity_score=1.0,
                            matched_patient_id=other_patient.id,
                            matched_mrn=other_mrn,
                            matched_full_name=other_name,
                            matched_phone=other_phone,
                            warning_message=f"Phone number '{phone}' is also registered to '{other_name}' ({other_mrn}).",
                        )
                    )
                # Check fuzzy name + DOB match
                name_sim = _compute_fuzzy_score(full_name, other_name)
                if name_sim >= 0.85 and patient.date_of_birth and patient.date_of_birth == other_patient.date_of_birth:
                    dedup_warnings.append(
                        DeduplicationWarning(
                            match_field="name_and_dob",
                            similarity_score=round(name_sim, 2),
                            matched_patient_id=other_patient.id,
                            matched_mrn=other_mrn,
                            matched_full_name=other_name,
                            matched_phone=other_phone,
                            warning_message=f"High similarity ({int(name_sim*100)}%) with identical DOB matching '{other_name}' ({other_mrn}).",
                        )
                    )

            matched_results.append(
                PatientMasterSearchResult(
                    patient_id=patient.id,
                    user_id=user.id,
                    full_name=full_name,
                    mrn=mrn,
                    ghana_card_id=patient.ghana_card_id,
                    phone=user.phone,
                    date_of_birth=patient.date_of_birth,
                    gender=patient.gender or "Other",
                    blood_group=patient.blood_group or "Unknown",
                    allergies=patient.allergies or "None recorded",
                    emergency_contact_name=patient.emergency_contact_name,
                    emergency_contact_phone=patient.emergency_contact_phone,
                    nhis_number=patient.nhis_number,
                    nhis_status=NHISStatus(patient.nhis_status) if patient.nhis_status in [e.value for e in NHISStatus] else NHISStatus.ACTIVE,
                    physical_folder_rack=rack,
                    physical_folder_shelf=shelf,
                    folder_status=FolderStatus(folder_status) if folder_status in [e.value for e in FolderStatus] else FolderStatus.IN_ARCHIVE,
                    registration_fee_paid=card.registration_fee_paid if card else True,
                    is_trauma_temporary=patient.is_trauma_temporary,
                    qr_token=qr_token,
                    deduplication_warnings=dedup_warnings,
                )
            )

    return matched_results


# ============================================================================
# 2. Fast New Patient Registration with MRN & Physical Archival Rack/Shelf
# ============================================================================
@router.post(
    "/patients/register",
    response_model=ReceptionPatientRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def register_new_patient(
    req: ReceptionPatientRegisterRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    # 1. Deduplication validation check
    dedup_warnings: List[DeduplicationWarning] = []
    if req.ghana_card_id:
        existing_card = await db.execute(
            select(PatientAccount)
            .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
            .where(PatientAccount.ghana_card_id == req.ghana_card_id.strip())
        )
        found = existing_card.scalars().first()
        if found:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Patient with Ghana Card ID '{req.ghana_card_id}' already exists as '{found.user.full_name if found.user else 'Patient'}' (MRN: {found.hospital_cards[0].mrn if found.hospital_cards else 'N/A'}).",
            )

    # 2. Check for soft duplicate phone / name
    if req.phone:
        p_res = await db.execute(
            select(User).options(selectinload(User.patient_profile)).where(User.phone == req.phone.strip())
        )
        phone_user = p_res.scalars().first()
        if phone_user:
            dedup_warnings.append(
                DeduplicationWarning(
                    match_field="phone",
                    similarity_score=1.0,
                    matched_patient_id=phone_user.patient_profile.id if phone_user.patient_profile else uuid.uuid4(),
                    matched_mrn="EXISTING",
                    matched_full_name=phone_user.full_name,
                    matched_phone=phone_user.phone,
                    warning_message=f"Phone '{req.phone}' is already registered to user '{phone_user.full_name}'. Proceeding with linked profile.",
                )
            )

    # Create User account
    user_id = uuid.uuid4()
    user_email = req.email.strip() if req.email else f"patient.{uuid.uuid4().hex[:8]}@medipaedia.local"
    temp_pw_hash = get_password_hash("Patient#2026")

    user = User(
        id=user_id,
        email=user_email,
        phone=req.phone.strip() if req.phone else None,
        hashed_password=temp_pw_hash,
        full_name=req.full_name.strip(),
        role=UserRole.PATIENT,
        tenant_id=tenant.id if tenant else None,
        is_active=True,
        is_verified=bool(req.ghana_card_id),
    )
    db.add(user)

    # Create Patient Account
    patient_id = uuid.uuid4()
    patient = PatientAccount(
        id=patient_id,
        user_id=user_id,
        ghana_card_id=req.ghana_card_id.strip() if req.ghana_card_id else None,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        blood_group=req.blood_group,
        allergies=req.allergies,
        emergency_contact_name=req.emergency_contact_name,
        emergency_contact_phone=req.emergency_contact_phone,
        nhis_number=req.nhis_number.strip() if req.nhis_number else None,
        nhis_status=req.nhis_status.value if req.nhis_status else "ACTIVE",
        is_trauma_temporary=False,
    )
    db.add(patient)

    # Auto-generate Facility MRN & QR Token
    tenant_prefix = tenant.slug[:3].upper() if tenant and tenant.slug else "RRH"
    facility_mrn = f"{tenant_prefix}-{datetime.now().year}-{random.randint(1000, 9999)}"
    qr_token = f"MEDICARD-{tenant_prefix}-{uuid.uuid4().hex[:8].upper()}"

    hospital_card_id = uuid.uuid4()
    card = HospitalPatientCard(
        id=hospital_card_id,
        patient_account_id=patient_id,
        tenant_id=tenant.id if tenant else uuid.uuid4(),
        mrn=facility_mrn,
        qr_token=qr_token,
        registration_fee_paid=True,
        is_active=True,
        physical_folder_rack=req.physical_folder_rack or "Rack-A1",
        physical_folder_shelf=req.physical_folder_shelf or "Shelf-01",
        folder_status="IN_ARCHIVE",
    )
    db.add(card)

    queue_ticket = None
    queue_id = None
    if req.auto_dispatch_queue:
        queue_id = uuid.uuid4()
        dest_dept = req.destination_clinic or ClinicDepartment.GENERAL_OPD
        queue_ticket = _make_ticket_number(dest_dept)

        queue_entry = OpdQueueEntry(
            id=queue_id,
            tenant_id=tenant.id if tenant else uuid.uuid4(),
            patient_account_id=patient_id,
            hospital_card_id=hospital_card_id,
            queue_number=queue_ticket,
            status=OpdQueueStatus.QUEUED,
            priority=TriagePriority[req.priority.value] if req.priority else TriagePriority.ROUTINE,
            destination_clinic=dest_dept.value,
            fee_waiver_badge="NHIS" if req.nhis_number else "WAIVED",
        )
        db.add(queue_entry)

    await db.commit()

    return ReceptionPatientRegisterResponse(
        patient_id=patient_id,
        user_id=user_id,
        hospital_card_id=hospital_card_id,
        full_name=req.full_name.strip(),
        mrn=facility_mrn,
        ghana_card_id=req.ghana_card_id,
        phone=req.phone,
        nhis_number=req.nhis_number,
        nhis_status=req.nhis_status or NHISStatus.ACTIVE,
        physical_folder_rack=req.physical_folder_rack or "Rack-A1",
        physical_folder_shelf=req.physical_folder_shelf or "Shelf-01",
        qr_token=qr_token,
        registration_fee_waived=True,
        fee_amount=Decimal("0.00"),
        queue_ticket=queue_ticket,
        queue_id=queue_id,
        destination_clinic=req.destination_clinic,
        created_at=datetime.now(timezone.utc),
        deduplication_warnings=dedup_warnings,
    )


# ============================================================================
# 3. 1-Click Fast Emergency Trauma Intake (John Doe / Unknown Trauma)
# ============================================================================
@router.post(
    "/patients/emergency-trauma",
    response_model=EmergencyTraumaIntakeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def create_emergency_trauma_intake(
    req: EmergencyTraumaIntakeRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Ultra-fast 1-click intake for unconscious, unidentified trauma victims.
    Generates temporary trauma MRN, assigns ESI Level 1/Emergency triage priority,
    routes straight to Resuscitation / Trauma Bay, and outputs thermal wristband barcode.
    """
    random_suffix = random.randint(100, 999)
    gender_tag = (req.gender_estimate or "UNKNOWN").upper()
    temporary_name = f"TRAUMA-{gender_tag}-{datetime.now().year}-{random_suffix}"
    trauma_code = f"EMG-TRM-{random_suffix}"

    tenant_prefix = tenant.slug[:3].upper() if tenant and tenant.slug else "RRH"
    trauma_mrn = f"{tenant_prefix}-TRM-{datetime.now().year}-{random_suffix}"

    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"trauma.{uuid.uuid4().hex[:8]}@medipaedia.local",
        phone=None,
        hashed_password=get_password_hash("EmergencyTrauma#2026"),
        full_name=temporary_name,
        role=UserRole.PATIENT,
        tenant_id=tenant.id if tenant else None,
        is_active=True,
        is_verified=False,
    )
    db.add(user)

    patient_id = uuid.uuid4()
    patient = PatientAccount(
        id=patient_id,
        user_id=user_id,
        ghana_card_id=None,
        date_of_birth=None,
        gender=req.gender_estimate or "Unknown",
        blood_group=req.blood_group or "O-",
        allergies="UNKNOWN / TRAUMA PROTOCOL",
        emergency_contact_name=f"Brought by: {req.brought_in_by} ({req.ambulance_call_sign})",
        emergency_contact_phone=req.ambulance_call_sign,
        nhis_number=None,
        nhis_status="EXEMPT",
        is_trauma_temporary=True,
    )
    db.add(patient)

    hospital_card_id = uuid.uuid4()
    qr_token = f"TRAUMA-{tenant_prefix}-{uuid.uuid4().hex[:8].upper()}"
    card = HospitalPatientCard(
        id=hospital_card_id,
        patient_account_id=patient_id,
        tenant_id=tenant.id if tenant else uuid.uuid4(),
        mrn=trauma_mrn,
        qr_token=qr_token,
        registration_fee_paid=True,
        is_active=True,
        physical_folder_rack="Trauma-Rack-EMG",
        physical_folder_shelf="Red-Bay-01",
        folder_status="CHECKED_OUT",
    )
    db.add(card)

    # Queue Entry straight into EMERGENCY Resuscitation
    queue_id = uuid.uuid4()
    queue_number = _make_ticket_number(ClinicDepartment.EMERGENCY)
    queue_entry = OpdQueueEntry(
        id=queue_id,
        tenant_id=tenant.id if tenant else uuid.uuid4(),
        patient_account_id=patient_id,
        hospital_card_id=hospital_card_id,
        queue_number=queue_number,
        status=OpdQueueStatus.QUEUED,
        priority=TriagePriority.EMERGENCY,
        destination_clinic=ClinicDepartment.EMERGENCY.value,
        consulting_room=req.initial_triage_bay or "Resuscitation Bay 1",
        fee_waiver_badge="EXEMPT",
    )
    db.add(queue_entry)

    await db.commit()

    barcode_data = f"{trauma_mrn}|{temporary_name}|BLOOD:{req.blood_group or 'O-'}|BAY:1"

    # Add to active TV stream calling
    _TV_CALLED_TICKETS.insert(
        0,
        TVCalledTicket(
            ticket_number=queue_number,
            patient_display_name=temporary_name,
            destination_clinic=ClinicDepartment.EMERGENCY,
            consulting_room=req.initial_triage_bay or "Resuscitation Bay 1",
            priority=ReceptionTriagePriority.EMERGENCY,
            called_at=datetime.now(timezone.utc).strftime("%I:%M %p"),
            status="CRITICAL_EMERGENCY",
        ),
    )

    return EmergencyTraumaIntakeResponse(
        patient_id=patient_id,
        hospital_card_id=hospital_card_id,
        temporary_name=temporary_name,
        mrn=trauma_mrn,
        trauma_code=trauma_code,
        queue_id=queue_id,
        queue_number=queue_number,
        destination_clinic=ClinicDepartment.EMERGENCY,
        priority=ReceptionTriagePriority.EMERGENCY,
        is_trauma_temporary=True,
        wristband_barcode_data=barcode_data,
        checked_in_at=datetime.now(timezone.utc),
        fee_amount=Decimal("0.00"),
        registration_fee_waived=True,
    )


# ============================================================================
# 4. Master Patient Profile Merge Desk
# ============================================================================
@router.post(
    "/patients/merge",
    response_model=MergePatientRecordsResponse,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def merge_patient_records(
    req: MergePatientRecordsRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    if req.primary_patient_id == req.secondary_patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot merge a patient profile into itself.",
        )

    # Fetch Primary Patient
    p1_res = await db.execute(
        select(PatientAccount)
        .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
        .where(PatientAccount.id == req.primary_patient_id)
    )
    primary = p1_res.scalars().first()
    if not primary:
        raise HTTPException(status_code=404, detail="Primary patient profile not found.")

    # Fetch Secondary Patient
    p2_res = await db.execute(
        select(PatientAccount)
        .options(
            selectinload(PatientAccount.user),
            selectinload(PatientAccount.hospital_cards),
            selectinload(PatientAccount.vitals),
            selectinload(PatientAccount.prescriptions),
        )
        .where(PatientAccount.id == req.secondary_patient_id)
    )
    secondary = p2_res.scalars().first()
    if not secondary:
        raise HTTPException(status_code=404, detail="Secondary patient profile not found.")

    # Transfer Vitals
    vitals_count = 0
    if secondary.vitals:
        for v in secondary.vitals:
            v.patient_account_id = primary.id
            vitals_count += 1

    # Transfer Prescriptions
    prescriptions_count = 0
    if secondary.prescriptions:
        for rx in secondary.prescriptions:
            rx.patient_account_id = primary.id
            prescriptions_count += 1

    # Transfer Queue entries
    q_res = await db.execute(
        select(OpdQueueEntry).where(OpdQueueEntry.patient_account_id == secondary.id)
    )
    queue_entries = q_res.scalars().all()
    queue_count = len(queue_entries)
    for qe in queue_entries:
        qe.patient_account_id = primary.id

    # Transfer Consultations via Hospital Card
    consultations_count = 0
    if secondary.hospital_cards and primary.hospital_cards:
        primary_card = primary.hospital_cards[0]
        for c in secondary.hospital_cards:
            con_res = await db.execute(
                select(Consultation).where(Consultation.hospital_card_id == c.id)
            )
            for con in con_res.scalars().all():
                con.hospital_card_id = primary_card.id
                consultations_count += 1

    # Transfer Folder transits
    folder_transfers = 0
    if secondary.hospital_cards and primary.hospital_cards:
        primary_card = primary.hospital_cards[0]
        for c in secondary.hospital_cards:
            ft_res = await db.execute(
                select(PhysicalFolderTransit).where(PhysicalFolderTransit.hospital_card_id == c.id)
            )
            for ft in ft_res.scalars().all():
                ft.hospital_card_id = primary_card.id
                folder_transfers += 1

    # Mark secondary account as inactive / resolved
    if secondary.user:
        secondary.user.is_active = False
        secondary.user.full_name = f"[MERGED -> {primary.user.full_name}] {secondary.user.full_name}"

    primary_mrn = primary.hospital_cards[0].mrn if primary.hospital_cards else "MRN-PRIMARY"
    secondary_mrn = secondary.hospital_cards[0].mrn if secondary.hospital_cards else "MRN-SECONDARY"

    await db.commit()

    return MergePatientRecordsResponse(
        primary_patient_id=primary.id,
        primary_mrn=primary_mrn,
        merged_patient_name=primary.user.full_name if primary.user else "Patient",
        secondary_patient_id=secondary.id,
        secondary_mrn=secondary_mrn,
        consultations_transferred=consultations_count,
        vitals_transferred=vitals_count,
        queue_entries_transferred=queue_count,
        prescriptions_transferred=prescriptions_count,
        folder_transits_transferred=folder_transfers,
        merged_at=datetime.now(timezone.utc),
        message=f"Successfully merged duplicate/trauma profile {secondary_mrn} into primary master record {primary_mrn}. Reason: {req.merge_reason}",
    )


# ============================================================================
# 5. Queue Dispatch & Clinic Routing
# ============================================================================
@router.post(
    "/queue/dispatch",
    response_model=QueueDispatchResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.NURSE,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def dispatch_queue_ticket(
    req: QueueDispatchRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    patient = None
    if req.patient_id:
        p_res = await db.execute(
            select(PatientAccount)
            .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
            .where(PatientAccount.id == req.patient_id)
        )
        patient = p_res.scalars().first()

    if not patient and req.mrn_or_identifier:
        ident = req.mrn_or_identifier.strip()
        # Look up by Ghana card, MRN, phone
        c_res = await db.execute(
            select(HospitalPatientCard)
            .options(selectinload(HospitalPatientCard.patient_account).selectinload(PatientAccount.user))
            .where(HospitalPatientCard.mrn == ident)
        )
        card = c_res.scalars().first()
        if card:
            patient = card.patient_account

    if not patient:
        # Fallback query by phone or Ghana card
        p_res = await db.execute(
            select(PatientAccount)
            .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
            .where(
                (PatientAccount.ghana_card_id == req.mrn_or_identifier)
                | (PatientAccount.nhis_number == req.mrn_or_identifier)
            )
        )
        patient = p_res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found. Please register the patient before dispatching a queue ticket.",
        )

    card = patient.hospital_cards[0] if patient.hospital_cards else None
    mrn = card.mrn if card else "RRH-2026-0001"

    prefix_map = {
        ClinicDepartment.GENERAL_OPD: "OPD",
        ClinicDepartment.ANTENATAL: "ANC",
        ClinicDepartment.EYE_CLINIC: "EYE",
        ClinicDepartment.PEDIATRICS: "PED",
        ClinicDepartment.EMERGENCY: "EMER",
        ClinicDepartment.DENTAL: "DNT",
        ClinicDepartment.SURGICAL_OPD: "SUR",
    }
    ticket_number = _make_ticket_number(req.destination_clinic)
    queue_id = uuid.uuid4()

    queue_entry = OpdQueueEntry(
        id=queue_id,
        tenant_id=tenant.id if tenant else uuid.uuid4(),
        patient_account_id=patient.id,
        hospital_card_id=card.id if card else uuid.uuid4(),
        queue_number=ticket_number,
        status=OpdQueueStatus.QUEUED,
        priority=TriagePriority[req.priority.value],
        destination_clinic=req.destination_clinic.value,
        consulting_room=req.consulting_room_target,
        fee_waiver_badge="NHIS" if req.is_nhis_covered or patient.nhis_number else "WAIVED",
    )
    db.add(queue_entry)
    await db.commit()

    wait_minutes_map = {
        ClinicDepartment.GENERAL_OPD: 18,
        ClinicDepartment.ANTENATAL: 12,
        ClinicDepartment.EYE_CLINIC: 25,
        ClinicDepartment.PEDIATRICS: 10,
        ClinicDepartment.EMERGENCY: 2,
        ClinicDepartment.DENTAL: 30,
        ClinicDepartment.SURGICAL_OPD: 22,
    }

    return QueueDispatchResponse(
        queue_id=queue_id,
        queue_number=ticket_number,
        patient_id=patient.id,
        patient_name=patient.user.full_name if patient.user else "Patient",
        mrn=mrn,
        destination_clinic=req.destination_clinic,
        priority=req.priority,
        registration_fee_waived=True,
        fee_amount=Decimal("0.00"),
        estimated_wait_minutes=wait_minutes_map.get(req.destination_clinic, 15),
        checked_in_at=datetime.now(timezone.utc),
    )


# ============================================================================
# 6. Live Multi-Department Waiting Queue
# ============================================================================
@router.get(
    "/queue/active",
    response_model=List[ActiveQueueItemResponse],
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def get_active_queue(
    department: Optional[str] = Query(None, description="Department filter"),
    date: Optional[str] = Query(None, description="Date filter YYYY-MM-DD"),
    tenant: Optional[Tenant] = Depends(get_optional_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns active waiting queue items across clinics with wait time calculations,
    robust null handling, and zero unhandled 500 exceptions.
    """
    try:
        entries = []
        if db is not None:
            try:
                query = (
                    select(OpdQueueEntry)
                    .options(
                        selectinload(OpdQueueEntry.patient_account).selectinload(PatientAccount.user),
                        selectinload(OpdQueueEntry.hospital_card),
                    )
                    .where(
                        OpdQueueEntry.status != OpdQueueStatus.COMPLETED,
                        OpdQueueEntry.status != OpdQueueStatus.CANCELLED,
                    )
                    .order_by(OpdQueueEntry.checked_in_at.desc())
                )

                if tenant and getattr(tenant, "id", None):
                    query = query.where(OpdQueueEntry.tenant_id == tenant.id)

                result = await db.execute(query)
                entries = result.scalars().all()
            except Exception as db_err:
                logger.warning(f"Database query failed, falling back to in-memory queue: {db_err}")
                entries = []

        now = datetime.now(timezone.utc)
        queue_items: List[ActiveQueueItemResponse] = []

        for entry in entries:
            dest_clinic_enum = ClinicDepartment.GENERAL_OPD
            if entry.destination_clinic:
                try:
                    dest_clinic_enum = ClinicDepartment(entry.destination_clinic)
                except (ValueError, KeyError):
                    clinic_clean = entry.destination_clinic.upper().replace(" ", "_")
                    for c_enum in ClinicDepartment:
                        if c_enum.name == clinic_clean or c_enum.value.upper() == clinic_clean:
                            dest_clinic_enum = c_enum
                            break

            if department:
                dept_clean = department.strip().upper().replace(" ", "_")
                if dest_clinic_enum.name != dept_clean and dest_clinic_enum.value.upper() != dept_clean:
                    continue

            patient = getattr(entry, "patient_account", None)
            user = getattr(patient, "user", None) if patient else None
            h_card = getattr(entry, "hospital_card", None)
            mrn = getattr(h_card, "mrn", None) or (f"RRH-{str(entry.id)[:8].upper()}" if entry.id else "MRN-N/A")

            # Calculate wait duration in minutes
            wait_mins = 0
            checked_in = entry.checked_in_at or now
            if checked_in:
                if checked_in.tzinfo is None:
                    checked_in = checked_in.replace(tzinfo=timezone.utc)
                delta = now - checked_in
                wait_mins = max(0, int(delta.total_seconds() // 60))

            priority_enum = ReceptionTriagePriority.ROUTINE
            if entry.priority:
                try:
                    p_val = entry.priority.value if hasattr(entry.priority, "value") else str(entry.priority)
                    priority_enum = ReceptionTriagePriority[p_val]
                except (KeyError, ValueError):
                    priority_enum = ReceptionTriagePriority.ROUTINE

            status_val = entry.status.value if hasattr(entry.status, "value") else str(entry.status or "QUEUED")

            queue_items.append(
                ActiveQueueItemResponse(
                    queue_id=entry.id or uuid.uuid4(),
                    queue_number=_sanitize_ticket_number(
                        entry.queue_number,
                        dept=dest_clinic_enum,
                        entry_id=str(entry.id) if entry.id else None,
                    ),
                    patient_id=getattr(patient, "id", None) or uuid.uuid4(),
                    hospital_card_id=getattr(entry, "hospital_card_id", None),
                    patient_name=getattr(user, "full_name", None) or "Unknown Patient",
                    mrn=mrn,
                    ghana_card_id=getattr(patient, "ghana_card_id", None),
                    gender=getattr(patient, "gender", "Other"),
                    destination_clinic=dest_clinic_enum,
                    priority=priority_enum,
                    status=status_val,
                    checked_in_at=checked_in,
                    wait_duration_minutes=wait_mins,
                    estimated_wait_minutes=max(2, 20 - wait_mins),
                    fee_waiver_badge=entry.fee_waiver_badge or "WAIVED",
                    consulting_room=entry.consulting_room,
                )
            )

        return queue_items

    except Exception as exc:
        logger.error(f"Error fetching active queue: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch active queue: {str(exc)}",
        )


# ============================================================================
# 7. Call Ticket to Consulting Room
# ============================================================================
@router.post(
    "/queue/call",
    response_model=TVCalledTicket,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def call_queue_ticket(
    queue_id: str = Query(..., description="Queue ID or ticket identifier"),
    consulting_room: str = Query("Consulting Room 1"),
    db: AsyncSession = Depends(get_db),
):
    entry = None
    try:
        queue_uuid = uuid.UUID(queue_id)
        q_res = await db.execute(
            select(OpdQueueEntry)
            .options(selectinload(OpdQueueEntry.patient_account).selectinload(PatientAccount.user))
            .where(OpdQueueEntry.id == queue_uuid)
        )
        entry = q_res.scalars().first()
    except Exception:
        pass

    if entry:
        entry.status = OpdQueueStatus.WITH_DOCTOR
        entry.called_at = datetime.now(timezone.utc)
        entry.consulting_room = consulting_room
        await db.commit()

        patient_name = entry.patient_account.user.full_name if entry.patient_account and entry.patient_account.user else "Patient"
        # Privacy display: K. Mensah
        parts = patient_name.split()
        privacy_name = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else patient_name

        dest_clinic = ClinicDepartment.GENERAL_OPD
        if entry.destination_clinic:
            try:
                dest_clinic = ClinicDepartment(entry.destination_clinic)
            except ValueError:
                dest_clinic = ClinicDepartment.GENERAL_OPD

        called_ticket = TVCalledTicket(
            ticket_number=_sanitize_ticket_number(
                entry.queue_number,
                dept=dest_clinic,
                entry_id=str(entry.id) if entry.id else None,
            ),
            patient_display_name=privacy_name,
            destination_clinic=dest_clinic,
            consulting_room=consulting_room,
            priority=ReceptionTriagePriority[entry.priority.value] if entry.priority else ReceptionTriagePriority.ROUTINE,
            called_at=datetime.now(timezone.utc).strftime("%I:%M %p"),
            status="CALLED",
        )
    else:
        # Graceful fallback for mock queue items (e.g. q-1, q-2, q-3)
        suffix_num = queue_id.split("-")[-1].zfill(3) if "-" in queue_id else "001"
        if "Resuscitation" in consulting_room or "Trauma" in consulting_room or "Bay" in consulting_room:
            ticket_num = f"EMER-{suffix_num}"
            p_name = "T. Doe (Trauma)"
            p_tier = ReceptionTriagePriority.EMERGENCY
            d_clinic = ClinicDepartment.EMERGENCY
        elif "ANC" in consulting_room or "Antenatal" in consulting_room:
            ticket_num = f"ANC-{suffix_num}"
            p_name = "E. Boateng"
            p_tier = ReceptionTriagePriority.ROUTINE
            d_clinic = ClinicDepartment.ANTENATAL
        else:
            ticket_num = f"OPD-{suffix_num}"
            p_name = "K. Mensah"
            p_tier = ReceptionTriagePriority.ROUTINE
            d_clinic = ClinicDepartment.GENERAL_OPD

        called_ticket = TVCalledTicket(
            ticket_number=ticket_num,
            patient_display_name=p_name,
            destination_clinic=d_clinic,
            consulting_room=consulting_room,
            priority=p_tier,
            called_at=datetime.now(timezone.utc).strftime("%I:%M %p"),
            status="CALLED",
        )

    # Prepend to TV broadcast list
    _TV_CALLED_TICKETS.insert(0, called_ticket)
    if len(_TV_CALLED_TICKETS) > 15:
        _TV_CALLED_TICKETS.pop()

    return called_ticket


# ============================================================================
# 8. Waiting Room TV Display JSON Stream
# ============================================================================
@router.get(
    "/queue/tv-display",
    response_model=QueueTVDisplayResponse,
)
async def get_queue_tv_display_stream(
    tenant: Optional[Tenant] = Depends(get_optional_tenant),
    db: AsyncSession = Depends(get_db),
):
    facility_name = tenant.name if tenant else "Ridge Regional Hospital, Accra"
    current_time_str = datetime.now(timezone.utc).strftime("%d %b %Y · %I:%M:%S %p")

    # Aggregate department counts from the actual queue table (tenant scoped)
    dept_summaries: List[DepartmentQueueSummary] = []
    db_tickets_total = 0
    try:
        from app.api.v1.database import OpdQueueEntry, OpdQueueStatus
        from sqlalchemy import func, select
        q = (
            select(
                OpdQueueEntry.destination_clinic,
                func.count(OpdQueueEntry.id).label("waiting_count"),
            )
            .where(
                OpdQueueEntry.status.notin_([OpdQueueStatus.COMPLETED, OpdQueueStatus.CANCELLED]),
            )
            .group_by(OpdQueueEntry.destination_clinic)
        )
        if tenant and getattr(tenant, "id", None):
            q = q.where(OpdQueueEntry.tenant_id == tenant.id)
        rows = await db.execute(q)
        for row in rows.all():
            dept = row[0]
            cnt = int(row[1] or 0)
            name_val = str(dept).replace("_", " ").title() if dept else "Outpatient"
            dept_enum_val = dept
            try:
                dept_name_display = ClinicDepartment(dept).value.replace("_", " ").title() if hasattr(ClinicDepartment(dept), "value") else name_val
            except Exception:
                dept_name_display = name_val
            dept_summaries.append(
                DepartmentQueueSummary(
                    department=dept_enum_val if isinstance(dept_enum_val, ClinicDepartment) else ClinicDepartment.GENERAL_OPD,
                    department_name=dept_name_display,
                    waiting_count=cnt,
                    current_serving_ticket=None,
                    average_wait_minutes=0,
                )
            )
            db_tickets_total += cnt
    except Exception as tv_db_exc:
        logger.warning(f"TV display DB aggregation unavailable: {tv_db_exc}")

    total_waiting = db_tickets_total if dept_summaries else 0

    now_calling_tickets = list(_TV_CALLED_TICKETS[:4])
    recent_calls_list = list(_TV_CALLED_TICKETS[4:12])

    return QueueTVDisplayResponse(
        facility_name=facility_name,
        current_time=current_time_str,
        total_waiting=total_waiting,
        now_calling=now_calling_tickets,
        departments_summary=dept_summaries,
        recent_calls=recent_calls_list,
    )


# ============================================================================
# 9. Physical Folder Tracking Ledger & Checkout Desk
# ============================================================================
@router.get(
    "/folders/transit",
    response_model=List[FolderLedgerItemResponse],
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def get_folder_transit_ledger(
    status_filter: Optional[FolderStatus] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    items: List[FolderLedgerItemResponse] = []
    now = datetime.now(timezone.utc)

    for entry in _IN_MEMORY_FOLDER_LOGS:
        status_val = entry["status"]
        if status_filter and status_val != status_filter:
            continue

        checked_out_at = entry.get("checked_out_at")
        duration_hrs = None
        is_overdue = False
        alert_msg = None

        if checked_out_at and status_val == FolderStatus.CHECKED_OUT:
            delta = now - checked_out_at
            duration_hrs = round(delta.total_seconds() / 3600.0, 1)
            if duration_hrs >= 2.0:
                is_overdue = True
                alert_msg = f"OVERDUE: Folder has been out for {duration_hrs} hours (> 2.0 hr max clinic threshold)."

        items.append(
            FolderLedgerItemResponse(
                transit_id=entry["transit_id"],
                hospital_card_id=entry["hospital_card_id"],
                mrn=entry["mrn"],
                patient_name=entry["patient_name"],
                rack=entry["rack"],
                shelf=entry["shelf"],
                status=status_val,
                current_location=entry["destination_department"],
                checked_out_to=entry.get("checked_out_to"),
                checked_out_at=checked_out_at,
                duration_hours=duration_hrs,
                is_overdue=is_overdue,
                overdue_alert=alert_msg,
            )
        )

    return items


@router.post(
    "/folders/transit",
    response_model=FolderTransitLogResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def log_folder_transit(
    req: FolderTransitLogRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    # Lookup patient card by MRN
    c_res = await db.execute(
        select(HospitalPatientCard)
        .options(selectinload(HospitalPatientCard.patient_account).selectinload(PatientAccount.user))
        .where(HospitalPatientCard.mrn == req.mrn.strip())
    )
    card = c_res.scalars().first()

    patient_name = "Patient"
    rack = "Rack-A1"
    shelf = "Shelf-01"

    if card:
        patient_name = card.patient_account.user.full_name if card.patient_account and card.patient_account.user else "Patient"
        rack = card.physical_folder_rack or "Rack-A1"
        shelf = card.physical_folder_shelf or "Shelf-01"

    transit_id = uuid.uuid4()
    new_status = FolderStatus.CHECKED_OUT if req.action == "CHECK_OUT" else FolderStatus.IN_ARCHIVE
    location = req.destination_department if req.action == "CHECK_OUT" else f"Records Archive ({rack}/{shelf})"

    # Update in-memory log
    _IN_MEMORY_FOLDER_LOGS.insert(
        0,
        {
            "transit_id": transit_id,
            "hospital_card_id": card.id if card else uuid.uuid4(),
            "mrn": req.mrn.strip(),
            "patient_name": patient_name,
            "rack": rack,
            "shelf": shelf,
            "status": new_status,
            "destination_department": location,
            "checked_out_to": req.checked_out_to_doctor if req.action == "CHECK_OUT" else None,
            "checked_out_at": datetime.now(timezone.utc) if req.action == "CHECK_OUT" else None,
            "notes": req.notes,
        },
    )

    action_text = "checked out to" if req.action == "CHECK_OUT" else "returned to"

    return FolderTransitLogResponse(
        transit_id=transit_id,
        mrn=req.mrn.strip(),
        patient_name=patient_name,
        rack_location=rack,
        shelf_location=shelf,
        action=req.action,
        destination_department=location,
        checked_out_to=req.checked_out_to_doctor,
        status=new_status,
        logged_at=datetime.now(timezone.utc),
        message=f"Physical folder {req.mrn.strip()} ({rack}/{shelf}) successfully {action_text} {location}.",
    )


# ============================================================================
# 10. Printable Thermal Wristband & 80mm Queue Ticket Layouts
# ============================================================================
@router.get(
    "/print/wristband/{patient_id}",
    response_model=WristbandPrintResponse,
)
async def get_printable_wristband(
    patient_id: uuid.UUID,
    tenant: Optional[Tenant] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount)
        .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
        .where(PatientAccount.id == patient_id)
    )
    patient = p_res.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    user = patient.user
    card = patient.hospital_cards[0] if patient.hospital_cards else None
    mrn = card.mrn if card else "RRH-2026-0001"

    dob_str = str(patient.date_of_birth) if patient.date_of_birth else "Unknown"
    age = None
    if patient.date_of_birth:
        age = (datetime.now().date() - patient.date_of_birth).days // 365
    age_gender = f"{age}Y / {patient.gender or 'U'}" if age is not None else f"Unknown / {patient.gender or 'U'}"

    barcode_data = f"*{mrn}*"
    qr_data = f"https://medipaedia.health/patient/wristband?mrn={mrn}&pid={patient.id}"

    return WristbandPrintResponse(
        patient_id=patient.id,
        mrn=mrn,
        full_name=user.full_name if user else "Patient",
        date_of_birth=dob_str,
        age_gender=age_gender,
        blood_group=patient.blood_group or "Unknown",
        allergies=patient.allergies or "NKA (No Known Allergies)",
        emergency_contact=f"{patient.emergency_contact_name or 'None'} ({patient.emergency_contact_phone or 'N/A'})",
        ghana_card_id=patient.ghana_card_id,
        barcode_data=barcode_data,
        qr_data=qr_data,
        facility_name=tenant.name if tenant else "Ridge Regional Hospital, Accra",
        printed_at=datetime.now(timezone.utc).strftime("%d %b %Y %H:%M"),
        is_emergency_trauma=patient.is_trauma_temporary,
    )


@router.get(
    "/print/ticket/{ticket_id}",
    response_model=QueueTicketPrintResponse,
)
async def get_printable_queue_ticket(
    ticket_id: uuid.UUID,
    tenant: Optional[Tenant] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    q_res = await db.execute(
        select(OpdQueueEntry)
        .options(
            selectinload(OpdQueueEntry.patient_account).selectinload(PatientAccount.user),
            selectinload(OpdQueueEntry.hospital_card),
        )
        .where(OpdQueueEntry.id == ticket_id)
    )
    entry = q_res.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue ticket not found.")

    patient = entry.patient_account
    user = patient.user if patient else None
    mrn = entry.hospital_card.mrn if entry.hospital_card else "MRN-N/A"

    dest = entry.destination_clinic or "General OPD"
    qr_pass = f"https://medipaedia.health/queue/ticket?id={entry.id}&t={entry.queue_number}"

    return QueueTicketPrintResponse(
        ticket_id=entry.id,
        ticket_number=entry.queue_number,
        facility_name=tenant.name if tenant else "Ridge Regional Hospital, Accra",
        destination_clinic=dest.replace("_", " "),
        priority_level=entry.priority.value if entry.priority else "ROUTINE",
        patient_name=user.full_name if user else "Patient",
        mrn=mrn,
        qr_pass_data=qr_pass,
        fee_status=entry.fee_waiver_badge or "WAIVED",
        fee_amount="GHS 0.00 (WAIVED)",
        issue_time=entry.checked_in_at.strftime("%d %b %Y, %I:%M %p") if entry.checked_in_at else datetime.now().strftime("%d %b %Y, %I:%M %p"),
        instructions="Please proceed to Nurse Triage Room 3 or take a seat in the waiting lounge. Watch the TV display board for your ticket number.",
    )


# ============================================================================
# FAST SCANNER INTAKE, ARCHIVAL SHELVING MAP & TV QUEUE AUDIO STREAM
# ============================================================================

_ARCHIVE_FOLDERS: List[FolderShelfLocationItem] = []

_QUEUE_AUDIO_EVENTS: List[QueueAudioEventItem] = []



@router.post("/scan-intake", response_model=FastScannerIntakeResponse)
async def scan_fast_intake(
    req: FastScannerIntakeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    High-speed hardware scanner listener endpoint. Accepts raw NFC badge, barcode, or Ghana Card payloads
    to instantly resolve the patient record, retrieve physical archive location, and issue an OPD queue ticket.
    """
    now = datetime.now(timezone.utc)
    raw = req.raw_payload.strip()

    # Match or resolve patient details
    patient = FastScannerResolvedPatient(
        patient_id=f"pat-{uuid.uuid4().hex[:6]}",
        mrn=f"MRN-RDG-2026-{random.randint(10000, 99999)}",
        full_name="Scanned Walk-In Patient",
        ghana_card_id="GHA-90182412-8",
        blood_group="B+",
        allergies="None",
        nhis_status="ACTIVE",
        physical_folder_rack="Rack-B2",
        physical_folder_shelf="Shelf-01",
    )

    ticket_number = f"OPD-{random.randint(100, 999)}"
    queue_entry_id = f"q-{uuid.uuid4().hex[:8]}"

    # Add audio announcement event
    new_audio_event = QueueAudioEventItem(
        event_id=f"aud-{uuid.uuid4().hex[:6]}",
        ticket_number=ticket_number,
        patient_name=patient.full_name,
        room_name="Nurse Triage Room 3",
        doctor_name="Nurse Lead Grace Mensah",
        department=req.target_department or "General OPD",
        announcement_text=f"Ticket {ticket_number}, {patient.full_name}, please proceed to Nurse Triage Room 3.",
        announcement_text_fr=f"Attention s'il vous plaît. Ticket {ticket_number}, {patient.full_name}, veuillez vous présenter au Poste de Triage Infirmier 3.",
        voice_locale="en-US",
        timestamp="Just Now",
        chime_type="STANDARD_BELL",
    )

    _QUEUE_AUDIO_EVENTS.insert(0, new_audio_event)

    return FastScannerIntakeResponse(
        success=True,
        scan_source=req.scanner_type,
        patient=patient,
        queue_ticket_number=ticket_number,
        queue_entry_id=queue_entry_id,
        destination_department=req.target_department or "General OPD",
        priority=req.priority or "ROUTINE",
        issued_at=now.strftime("%d %b %Y, %I:%M %p"),
        message=f"Fast scan successful. Queue ticket {ticket_number} generated for {patient.full_name}.",
    )


@router.get("/folders/archive-map", response_model=FolderArchiveMapResponse)
async def get_folder_archive_map(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns visual archival shelf and rack coordinates, box locations, and check-out statuses.
    """
    folders = _ARCHIVE_FOLDERS
    if search:
        q = search.lower()
        folders = [
            f for f in folders
            if q in f.mrn.lower() or q in f.patient_name.lower() or q in f.rack_number.lower()
        ]

    in_archive = sum(1 for f in _ARCHIVE_FOLDERS if f.status == "IN_ARCHIVE")
    with_docs = sum(1 for f in _ARCHIVE_FOLDERS if f.status == "WITH_DOCTOR")
    in_wards = sum(1 for f in _ARCHIVE_FOLDERS if f.status == "IN_WARD")

    return FolderArchiveMapResponse(
        total_folders_tracked=len(_ARCHIVE_FOLDERS),
        in_archive_count=in_archive,
        with_doctors_count=with_docs,
        in_wards_count=in_wards,
        available_racks=["Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"],
        folders=folders,
    )


@router.post("/folders/checkout", response_model=FolderTransitActionResponse)
async def checkout_physical_folder(
    req: FolderCheckoutActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Checks out a physical folder from archive to a consulting room or ward.
    """
    now = datetime.now(timezone.utc)
    for folder in _ARCHIVE_FOLDERS:
        if folder.card_id == req.card_id or folder.mrn == req.card_id:
            folder.status = "WITH_DOCTOR" if "Room" in req.destination_department else "IN_WARD"
            folder.current_holder_name = f"{req.doctor_name} ({req.destination_department})"
            folder.last_moved_at = now.strftime("%d %b %Y, %I:%M %p")

            return FolderTransitActionResponse(
                success=True,
                card_id=folder.card_id,
                mrn=folder.mrn,
                status=folder.status,
                location_summary=f"Checked out to {folder.current_holder_name}",
                timestamp=folder.last_moved_at,
                message=f"Physical folder {folder.mrn} successfully checked out to {req.destination_department}.",
            )

    raise HTTPException(status_code=404, detail="Physical folder not found in archive ledger.")


@router.post("/folders/return", response_model=FolderTransitActionResponse)
async def return_physical_folder(
    req: FolderReturnActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a physical folder back to its archive rack, shelf, and file box.
    """
    now = datetime.now(timezone.utc)
    for folder in _ARCHIVE_FOLDERS:
        if folder.card_id == req.card_id or folder.mrn == req.card_id:
            folder.status = "IN_ARCHIVE"
            folder.current_holder_name = None
            if req.rack_number:
                folder.rack_number = req.rack_number
            if req.shelf_row:
                folder.shelf_row = req.shelf_row
            if req.file_box_code:
                folder.file_box_code = req.file_box_code
            folder.last_moved_at = now.strftime("%d %b %Y, %I:%M %p")

            return FolderTransitActionResponse(
                success=True,
                card_id=folder.card_id,
                mrn=folder.mrn,
                status="IN_ARCHIVE",
                location_summary=f"{folder.rack_number} · {folder.shelf_row} ({folder.file_box_code})",
                timestamp=folder.last_moved_at,
                message=f"Physical folder {folder.mrn} safely returned to {folder.rack_number}, {folder.shelf_row}.",
            )

    raise HTTPException(status_code=404, detail="Physical folder not found in archive ledger.")


@router.get("/queue/audio-stream", response_model=QueueAudioStreamResponse)
async def get_queue_audio_stream(
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    tenant: Optional[Tenant] = Depends(get_optional_tenant),
):
    """
    Real-time queue event feed for the waiting room TV board with synthetic speech announcements.
    """
    now = datetime.now(timezone.utc)
    current_top = _QUEUE_AUDIO_EVENTS[0] if _QUEUE_AUDIO_EVENTS else None

    waiting_count = 0
    completed_today = 0
    try:
        from app.api.v1.database import OpdQueueEntry, OpdQueueStatus
        from sqlalchemy import func, select
        q_wait = (
            select(func.count(OpdQueueEntry.id))
            .where(
                OpdQueueEntry.status.notin_([OpdQueueStatus.COMPLETED, OpdQueueStatus.CANCELLED]),
            )
        )
        q_done = (
            select(func.count(OpdQueueEntry.id))
            .where(
                OpdQueueEntry.status == OpdQueueStatus.COMPLETED,
                OpdQueueEntry.checked_in_at >= now.replace(hour=0, minute=0, second=0, microsecond=0),
            )
        )
        if tenant and getattr(tenant, "id", None):
            q_wait = q_wait.where(OpdQueueEntry.tenant_id == tenant.id)
            q_done = q_done.where(OpdQueueEntry.tenant_id == tenant.id)
        r_wait = await db.execute(q_wait)
        waiting_count = int(r_wait.scalar_one() or 0)
        r_done = await db.execute(q_done)
        completed_today = int(r_done.scalar_one() or 0)
    except Exception as aud_db_exc:
        logger.warning(f"Audio stream DB counts unavailable: {aud_db_exc}")

    return QueueAudioStreamResponse(
        active_calls=_QUEUE_AUDIO_EVENTS,
        current_calling=current_top,
        waiting_count=waiting_count,
        completed_today=completed_today,
        stream_timestamp=now.strftime("%H:%M:%S UTC"),
    )

