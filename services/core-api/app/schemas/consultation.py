from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.clinical import ConsultationStatus


class VitalsBase(BaseModel):
    temperature: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmi: Optional[float] = None


class VitalsCreate(VitalsBase):
    patient_account_id: UUID
    consultation_id: Optional[UUID] = None


class VitalsResponse(VitalsBase):
    id: UUID
    consultation_id: Optional[UUID] = None
    patient_account_id: UUID
    recorded_by_nurse_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConsultationBase(BaseModel):
    hospital_card_id: UUID
    chief_complaint: str
    history_of_present_illness: Optional[str] = None
    examination_findings: Optional[str] = None
    clinical_notes: Optional[str] = None
    icd10_diagnosis_code: Optional[str] = None
    diagnosis_description: Optional[str] = None
    consultation_status: ConsultationStatus = ConsultationStatus.IN_PROGRESS


class ConsultationCreate(ConsultationBase):
    doctor_id: UUID


class ConsultationResponse(ConsultationBase):
    id: UUID
    tenant_id: UUID
    doctor_id: UUID
    created_at: datetime
    vitals: Optional[VitalsResponse] = None

    model_config = ConfigDict(from_attributes=True)
