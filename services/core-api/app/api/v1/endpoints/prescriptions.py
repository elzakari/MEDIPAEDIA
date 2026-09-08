import random
import string
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import generate_prescription_signature
from app.models.prescription import Prescription, PrescriptionItem, PrescriptionStatus
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionVerifyRequest,
)

router = APIRouter()


def generate_access_code() -> str:
    """Generates a 6-character alphanumeric redemption token (e.g. 7X9K2L)"""
    chars = string.ascii_uppercase + "23456789"
    return "".join(random.choice(chars) for _ in range(6))


@router.get("", response_model=List[PrescriptionResponse])
async def list_prescriptions(
    patient_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Prescription).options(selectinload(Prescription.items))
    if patient_id:
        query = query.where(Prescription.patient_account_id == patient_id)
    if tenant_id:
        query = query.where(Prescription.tenant_id == tenant_id)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    prescription_in: PrescriptionCreate,
    tenant_id: uuid.UUID = Query(...),
    doctor_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    prescription_id = uuid.uuid4()
    prescription_num = f"RX-{datetime.now().year}-{random.randint(100000, 999999)}"
    access_code = generate_access_code()
    timestamp_str = datetime.now(timezone.utc).isoformat()

    items_payload = [item.model_dump() for item in prescription_in.items]

    # Compute immutable HMAC-SHA256 signature
    verification_hash = generate_prescription_signature(
        prescription_id=str(prescription_id),
        patient_id=str(prescription_in.patient_account_id),
        doctor_id=str(doctor_id),
        tenant_id=str(tenant_id),
        items=items_payload,
        timestamp=timestamp_str,
    )

    prescription = Prescription(
        id=prescription_id,
        prescription_number=prescription_num,
        consultation_id=prescription_in.consultation_id,
        patient_account_id=prescription_in.patient_account_id,
        tenant_id=tenant_id,
        doctor_id=doctor_id,
        verification_hash=verification_hash,
        access_code=access_code,
        status=PrescriptionStatus.PENDING,
        notes=prescription_in.notes,
    )
    db.add(prescription)

    for item_data in prescription_in.items:
        item = PrescriptionItem(
            prescription_id=prescription_id,
            medication_name=item_data.medication_name,
            dosage=item_data.dosage,
            frequency=item_data.frequency,
            duration_days=item_data.duration_days,
            instructions=item_data.instructions,
            quantity_prescribed=item_data.quantity_prescribed,
            quantity_dispensed=0,
        )
        db.add(item)

    await db.commit()

    # Fetch with items loaded
    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.items))
        .where(Prescription.id == prescription_id)
    )
    return result.scalars().first()


@router.post("/verify", response_model=PrescriptionResponse)
async def verify_prescription(
    req: PrescriptionVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Used by Pharmacy POS scanners to verify prescription validity using either
    the 6-character access code or the cryptographic HMAC hash token.
    """
    token_str = req.token.strip()

    query = select(Prescription).options(selectinload(Prescription.items)).where(
        (Prescription.access_code == token_str.upper())
        | (Prescription.verification_hash == token_str)
        | (Prescription.prescription_number == token_str)
    )

    result = await db.execute(query)
    prescription = result.scalars().first()

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription token could not be verified or does not exist.",
        )

    return prescription
