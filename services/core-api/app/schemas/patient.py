from datetime import date, datetime
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

HospitalIntakeTrackLiteral = Literal["STANDARD", "CORPORATE_INSURANCE", "EMERGENCY"]
HospitalBillingStatusLiteral = Literal[
    "PENDING_REGISTRATION_PAYMENT",
    "BILL_TO_PAYER",
    "PAID",
    "DEFERRED_EMERGENCY",
]
HospitalTriageStatusLiteral = Literal[
    "NOT_QUEUED",
    "QUEUED_FOR_TRIAGE",
    "IN_TRIAGE",
    "AWAITING_DOCTOR",
    "DISCHARGED",
]


class HospitalPatientCardBase(BaseModel):
    tenant_id: UUID
    mrn: str
    qr_token: str
    registration_fee_paid: bool = False
    intake_type: HospitalIntakeTrackLiteral = Field(
        default="STANDARD",
        description=(
            "Intake routing lane: STANDARD (cashier before triage), "
            "CORPORATE_INSURANCE (bill-to-payer), EMERGENCY (bypass payment)."
        ),
    )


class HospitalPatientCardResponse(HospitalPatientCardBase):
    id: UUID
    patient_account_id: UUID
    is_active: bool
    card_number: Optional[str] = None
    billing_status: HospitalBillingStatusLiteral = "PENDING_REGISTRATION_PAYMENT"
    emergency_deferred: bool = False
    triage_status: HospitalTriageStatusLiteral = "NOT_QUEUED"
    queued_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientAccountBase(BaseModel):
    ghana_card_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientAccountCreate(PatientAccountBase):
    user_id: UUID


class PatientAccountResponse(PatientAccountBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    hospital_cards: List[HospitalPatientCardResponse] = []

    model_config = ConfigDict(from_attributes=True)
