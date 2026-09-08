from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.prescription import PrescriptionStatus


class PrescriptionItemBase(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None
    quantity_prescribed: int


class PrescriptionItemCreate(PrescriptionItemBase):
    pass


class PrescriptionItemResponse(PrescriptionItemBase):
    id: UUID
    prescription_id: UUID
    quantity_dispensed: int

    model_config = ConfigDict(from_attributes=True)


class PrescriptionCreate(BaseModel):
    patient_account_id: UUID
    consultation_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemCreate]


class PrescriptionVerifyRequest(BaseModel):
    token: str  # Can be access_code or verification_hash


class PrescriptionResponse(BaseModel):
    id: UUID
    prescription_number: str
    consultation_id: Optional[UUID] = None
    patient_account_id: UUID
    tenant_id: UUID
    doctor_id: UUID
    verification_hash: str
    access_code: str
    status: PrescriptionStatus
    notes: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    items: List[PrescriptionItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
