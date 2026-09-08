from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
import uuid
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


HospitalTriageStatusLiteral = Literal[
    "NOT_QUEUED",
    "QUEUED_FOR_TRIAGE",
    "IN_TRIAGE",
    "AWAITING_DOCTOR",
    "DISCHARGED",
]


class HospitalOPDCardBillingMetadata(BaseModel):
    """OPD card metadata returned on the billing receipt when the
    ``OPD_CARD_REGISTRATION`` fee is successfully collected.

    Powers the cashier → nurse station hand-off toast on the Hospital
    portal dashboard. Card number + QR payload are the two strings
    physically printed on the laminated patient card.
    """

    card_number: str = Field(
        ...,
        min_length=8,
        max_length=40,
        description="Deterministic OPD number: {TENANT_CODE}-{YYYY}-{SEQ}",
    )
    qr_payload: str = Field(
        ...,
        description="HospitalPatientCard.qr_token — printed on the card's QR sticker.",
    )
    patient_full_name: str = Field(
        ...,
        description="Display name for the Nurse Station triage roster.",
    )
    triage_status: HospitalTriageStatusLiteral = Field(
        default="QUEUED_FOR_TRIAGE",
        description="Hand-off flag; set to QUEUED_FOR_TRIAGE after successful OPD_CARD_REGISTRATION receipt.",
    )
    billing_status: Literal[
        "PAID",
        "BILL_TO_PAYER",
        "DEFERRED_EMERGENCY",
        "PENDING_REGISTRATION_PAYMENT",
    ] = "PAID"


class StaffProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tenant_id: Optional[uuid.UUID] = None
    license_number: Optional[str] = None
    licensing_body: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    can_prescribe_narcotics: bool = False
    can_authorize_quarantine: bool = False
    can_collect_cash: bool = False
    can_initiate_payout: bool = False
    is_active: bool = True

    class Config:
        from_attributes = True


class StaffProvisionRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    password: Optional[str] = "Medipaedia2026!"
    license_number: Optional[str] = None
    licensing_body: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    can_prescribe_narcotics: bool = False
    can_authorize_quarantine: bool = False
    can_collect_cash: bool = False
    can_initiate_payout: bool = False


class StaffMemberItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    license_number: Optional[str] = None
    licensing_body: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    is_active: bool = True
    created_at: datetime


# --- Hospital Portal Schemas ---

class HospitalBillingCollectionRequest(BaseModel):
    patient_id: uuid.UUID
    ghana_card_id: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    fee_type: str = "OPD_CARD_REGISTRATION"  # OPD_CARD_REGISTRATION, CONSULTATION_FEE, LAB_SERVICE
    payment_method: str = "CASH"  # CASH, MOMO_MTN, MOMO_TELECEL, POS_CARD
    payer_phone: Optional[str] = None
    reference_note: Optional[str] = None


class HospitalBillingReceipt(BaseModel):
    receipt_number: str
    patient_id: uuid.UUID
    amount_paid: Decimal
    fee_type: str
    payment_method: str
    collected_by: str
    timestamp: datetime
    status: str = "COMPLETED"
    opd_card_metadata: Optional[HospitalOPDCardBillingMetadata] = Field(
        default=None,
        description=(
            "Populated only when fee_type=OPD_CARD_REGISTRATION and the "
            "card activation + triage-queue hand-off succeed. All other "
            "fee types return this field as null."
        ),
    )


class HospitalFinancialSummary(BaseModel):
    today_collections_ghs: Decimal
    total_monthly_revenue_ghs: Decimal
    cards_issued_today: int
    pending_momo_reconciliations_count: int
    currency: str = "GHS"


# --- Pharmacy Portal Schemas ---

class ControlledSubstanceLogItem(BaseModel):
    id: uuid.UUID
    prescription_id: Optional[uuid.UUID] = None
    drug_name: str
    dosage_form: str
    quantity_dispensed: int
    patient_name: str
    patient_ghana_card: str
    prescribing_doctor: str
    prescriber_mdc_pin: str
    superintendent_approver: str
    dispensed_at: datetime
    narcotics_schedule: str = "CLASS_A_CONTROLLED"


class BatchQuarantineRequest(BaseModel):
    batch_number: str
    drug_name: str
    quarantine_reason: str
    fda_ghana_notice_reference: Optional[str] = None
    quarantine_all_inventory_units: bool = True


class BatchQuarantineResponse(BaseModel):
    quarantine_id: uuid.UUID
    batch_number: str
    drug_name: str
    units_quarantined: int
    authorized_by: str
    superintendent_pin: str
    timestamp: datetime
    status: str = "QUARANTINED_PENDING_REGULATORY_DISPOSAL"
