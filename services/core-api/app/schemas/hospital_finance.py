from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ChargeCategory(str, Enum):
    OPD_REGISTRATION = "OPD_REGISTRATION"
    DOCTOR_CONSULTATION = "DOCTOR_CONSULTATION"
    LABORATORY = "LABORATORY"
    IMAGING = "IMAGING"
    WARD_BED_NIGHT = "WARD_BED_NIGHT"
    NURSING_PROCEDURE = "NURSING_PROCEDURE"
    MEDICATION = "MEDICATION"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    MOMO = "MOMO"
    CARD = "CARD"
    INSURANCE_DIRECT = "INSURANCE_DIRECT"


class ShiftStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class ClaimStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    ADJUDICATING = "ADJUDICATING"
    REIMBURSED = "REIMBURSED"
    REJECTED = "REJECTED"


# ============================================================================
# 1. BILLING FOLIO & CHARGES
# ============================================================================
class PendingChargeItem(BaseModel):
    charge_id: str
    patient_id: str
    description: str
    category: ChargeCategory
    quantity: int = 1
    unit_price: Decimal
    total_price: Decimal
    service_date: str
    ordered_by: str
    is_nhis_covered: bool = False
    nhis_tariff: Decimal = Decimal("0.00")
    co_pay_amount: Decimal = Decimal("0.00")
    patient_payable: Decimal


class PatientPendingChargesResponse(BaseModel):
    patient_id: str
    patient_name: Optional[str] = None
    ghana_card: Optional[str] = None
    mrn: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    total_gross_unbilled: Decimal
    total_insurance_covered: Decimal
    total_patient_payable: Decimal
    charges: List[PendingChargeItem]


# ============================================================================
# 2. INVOICING & PAYMENT SETTLEMENT
# ============================================================================
class InvoiceGenerateRequest(BaseModel):
    patient_id: str
    patient_name: str
    selected_charge_ids: List[str]
    cashier_name: str
    notes: Optional[str] = None


class PatientInvoiceItem(BaseModel):
    description: str
    category: str
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    nhis_covered_amount: Decimal
    patient_portion: Decimal


class PatientInvoiceResponse(BaseModel):
    invoice_id: str
    invoice_number: str
    patient_id: str
    patient_name: str
    ghana_card: str
    mrn: str
    gross_amount: Decimal
    insurance_covered_amount: Decimal
    net_payable: Decimal
    status: str
    created_at: datetime
    items: List[PatientInvoiceItem]
    payment_reference: Optional[str] = None


class InvoicePaymentRequest(BaseModel):
    invoice_id: str
    payment_method: PaymentMethod
    amount_tendered: Decimal
    momo_phone_number: Optional[str] = None
    momo_network: Optional[str] = "MTN"
    cashier_name: str
    workstation_id: Optional[str] = None


class InvoicePaymentResponse(BaseModel):
    receipt_number: str
    invoice_id: str
    patient_name: str
    amount_paid: Decimal
    amount_tendered: Decimal
    change_due: Decimal
    payment_method: PaymentMethod
    transaction_reference: str
    paid_at: datetime
    cashier_name: str
    thermal_receipt_payload: str


# ============================================================================
# 3. CASHIER SHIFT & DRAWER RECONCILIATION
# ============================================================================
class OpenShiftRequest(BaseModel):
    cashier_name: str
    cashier_id: str
    opening_float: Decimal
    workstation_id: str = "TILL-01-OPD"


class CashierShiftResponse(BaseModel):
    shift_id: str
    cashier_name: str
    cashier_id: str
    workstation_id: str
    status: ShiftStatus
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_float: Decimal
    total_cash_collected: Decimal
    total_momo_collected: Decimal
    total_card_collected: Decimal
    total_collections: Decimal
    expected_drawer_cash: Decimal
    transaction_count: int


class CloseShiftRequest(BaseModel):
    declared_cash_count: Decimal
    closing_notes: Optional[str] = None


class CloseShiftResponse(BaseModel):
    shift_id: str
    cashier_name: str
    opened_at: datetime
    closed_at: datetime
    opening_float: Decimal
    expected_cash: Decimal
    declared_cash: Decimal
    discrepancy: Decimal
    status: str  # BALANCED, OVERAGE, SHORTAGE
    total_momo: Decimal
    total_card: Decimal
    total_revenue: Decimal
    transactions_processed: int
    summary_report: str


# ============================================================================
# 4. INSURANCE CLAIMS & NHIS HUB
# ============================================================================
class InsuranceClaimItem(BaseModel):
    claim_id: str
    claim_batch_id: str
    patient_name: str
    ghana_card: str
    nhis_number: str
    diagnosis_icd10: str
    service_rendered: str
    claimed_amount: Decimal
    approved_amount: Optional[Decimal] = None
    status: ClaimStatus
    submitted_date: str
    adjudicated_date: Optional[str] = None
    rejection_reason: Optional[str] = None


class ClaimBatchCreateRequest(BaseModel):
    provider_name: str
    claim_ids: List[str]
    batch_notes: Optional[str] = None


class ClaimBatchResponse(BaseModel):
    batch_id: str
    provider_name: str
    total_claims: int
    total_claimed_amount: Decimal
    status: str
    created_at: datetime


class ClaimStatusUpdateRequest(BaseModel):
    status: ClaimStatus
    approved_amount: Optional[Decimal] = None
    rejection_reason: Optional[str] = None


# ============================================================================
# 5. DEPARTMENTAL FINANCIAL ANALYTICS
# ============================================================================
class DepartmentRevenueItem(BaseModel):
    department: str
    gross_revenue: Decimal
    percentage: float
    patient_count: int


class PaymentChannelBreakdown(BaseModel):
    channel: str
    amount: Decimal
    percentage: float


class HospitalRevenueAnalyticsResponse(BaseModel):
    period: str
    total_gross_revenue: Decimal
    total_nhis_claims_receivable: Decimal
    total_out_of_pocket_cash: Decimal
    department_breakdown: List[DepartmentRevenueItem]
    channel_breakdown: List[PaymentChannelBreakdown]
    average_revenue_per_patient: Decimal
    daily_trends: List[dict] = []
