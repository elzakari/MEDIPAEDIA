import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.v1.endpoints.hospital_portal import (
    generate_opd_number,
    _resolve_tenant_code,
)
from app.models.clinical import OpdQueueEntry, OpdQueueStatus, TriagePriority
from app.models.patient import (
    HospitalBillingStatus,
    HospitalIntakeTrack,
    HospitalPatientCard,
    HospitalTriageStatus,
    PatientAccount,
)
from app.schemas.patient import (
    HospitalPatientCardBase,
    HospitalPatientCardResponse,
    PatientAccountCreate,
    PatientAccountResponse,
)

router = APIRouter()


@router.get("", response_model=List[PatientAccountResponse])
async def list_patients(
    ghana_card_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(PatientAccount).options(selectinload(PatientAccount.hospital_cards))
    if ghana_card_id:
        query = query.where(PatientAccount.ghana_card_id == ghana_card_id)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=PatientAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_account(
    patient_in: PatientAccountCreate, db: AsyncSession = Depends(get_db)
):
    patient = PatientAccount(
        user_id=patient_in.user_id,
        ghana_card_id=patient_in.ghana_card_id,
        date_of_birth=patient_in.date_of_birth,
        gender=patient_in.gender,
        blood_group=patient_in.blood_group,
        allergies=patient_in.allergies,
        emergency_contact_name=patient_in.emergency_contact_name,
        emergency_contact_phone=patient_in.emergency_contact_phone,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/{patient_id}/hospital-cards", response_model=HospitalPatientCardResponse)
async def issue_hospital_card(
    patient_id: uuid.UUID,
    card_in: HospitalPatientCardBase,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new OPD card for a hospital-bound patient.

    Implements the **Multi-Track Intake Support** (Requirement §2):

    * ``EMERGENCY`` → card pre-activated, emergency_deferred=True,
      ``DEFERRED_EMERGENCY`` billing_status, and patient is pushed
      straight to the Nurse Station triage roster with EMERGENCY
      priority (bypasses cashier).
    * ``CORPORATE_INSURANCE`` → card active, bill to employer / NHIS.
    * ``STANDARD`` (default) → card inactive pending payment at the
      ``POST /hospital/finance/billing`` cashier endpoint with
      ``OPD_CARD_REGISTRATION`` fee_type.

    The deterministic OPD card number is generated via ``generate_opd_number``
    using the global Postgres sequence ``opd_card_seq`` (additive patch in
    ``init_live_db``; format ``{TENANT}-{YYYY}-{SEQ6}``).
    """
    # Validate patient account exists
    pa_stmt = select(PatientAccount).where(PatientAccount.id == patient_id)
    pa_row = (await db.execute(pa_stmt)).scalars().first()
    if pa_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PatientAccount {patient_id} not found",
        )

    # --- §1 Deterministic OPD number ---
    tenant_short_code = await _resolve_tenant_code(db, card_in.tenant_id)
    opd_number = await generate_opd_number(db, tenant_short_code)

    # --- §2 Multi-Track Intake default column values per track ---
    intake_raw = (card_in.intake_type or "STANDARD").strip().upper()
    if intake_raw not in {"STANDARD", "CORPORATE_INSURANCE", "EMERGENCY"}:
        intake_raw = "STANDARD"
    intake_track = HospitalIntakeTrack(intake_raw)

    # Defaults aligned to §2 contract:
    is_active = False
    emergency_deferred = False
    billing_status = HospitalBillingStatus.PENDING_REGISTRATION_PAYMENT
    triage_status = HospitalTriageStatus.NOT_QUEUED
    queued_at = None

    if intake_track == HospitalIntakeTrack.EMERGENCY:
        is_active = True
        emergency_deferred = True
        billing_status = HospitalBillingStatus.DEFERRED_EMERGENCY
        triage_status = HospitalTriageStatus.QUEUED_FOR_TRIAGE
        queued_at = datetime.now(timezone.utc)
    elif intake_track == HospitalIntakeTrack.CORPORATE_INSURANCE:
        is_active = True
        billing_status = HospitalBillingStatus.BILL_TO_PAYER
    # else STANDARD: card inactive pending cashier payment (requirement §2)

    card = HospitalPatientCard(
        patient_account_id=patient_id,
        tenant_id=card_in.tenant_id,
        mrn=card_in.mrn,
        qr_token=card_in.qr_token or f"MEDICARD-{uuid.uuid4().hex[:12].upper()}",
        registration_fee_paid=card_in.registration_fee_paid,
        card_number=opd_number,
        intake_type=intake_track,
        billing_status=billing_status,
        emergency_deferred=emergency_deferred,
        triage_status=triage_status,
        queued_at=queued_at,
        is_active=is_active,
    )
    db.add(card)
    await db.flush()

    # --- §2 EMERGENCY: enqueue in the Nurse Station triage roster ---
    if intake_track == HospitalIntakeTrack.EMERGENCY:
        try:
            roster = OpdQueueEntry(
                id=uuid.uuid4(),
                tenant_id=card_in.tenant_id,
                patient_id=patient_id,
                hospital_card_id=card.id,
                queue_type="TRIAGE",
                status=OpdQueueStatus.WAITING_FOR_TRIAGE,
                priority=TriagePriority.EMERGENCY,
                department_of_service="Emergency Department Triage",
                entered_at=queued_at or datetime.now(timezone.utc),
            )
            db.add(roster)
        except Exception as exc:  # pragma: no cover - best effort only
            import logging as _logging  # local import avoids top-level dep
            _logging.getLogger(__name__).warning(
                "EMERGENCY OPD roster enqueue failed (non-fatal): %s", exc
            )

    await db.commit()
    await db.refresh(card)
    return card
