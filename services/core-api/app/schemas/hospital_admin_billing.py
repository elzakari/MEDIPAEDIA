from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


# ==========================================
# 1. Facility Payment Gateway & MoMo Payout Config
# ==========================================

class FacilityGatewayConfig(BaseModel):
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    gateway_mode: str = "PLATFORM_ESCROW"
    primary_gateway: Optional[str] = None
    subaccount_code: Optional[str] = None
    payout_network: Optional[str] = None
    payout_account_number: Optional[str] = None
    payout_account_name: Optional[str] = None
    payout_bank_code: Optional[str] = None
    enable_ussd_push: bool = False
    allow_split_tender: bool = False
    fee_bearer: str = "HOSPITAL"
    max_cashier_drawer_limit: Decimal = Decimal("0.00")
    auto_payout_schedule: str = "MANUAL"
    is_verified: bool = False
    last_tested_at: Optional[str] = None


class UpdateFacilityGatewayConfigRequest(BaseModel):
    gateway_mode: Optional[str] = None
    primary_gateway: Optional[str] = None
    subaccount_code: Optional[str] = None
    payout_network: Optional[str] = None
    payout_account_number: Optional[str] = None
    payout_account_name: Optional[str] = None
    payout_bank_code: Optional[str] = None
    enable_ussd_push: Optional[bool] = None
    allow_split_tender: Optional[bool] = None
    fee_bearer: Optional[str] = None
    max_cashier_drawer_limit: Optional[Decimal] = None
    auto_payout_schedule: Optional[str] = None


class TestPayoutPingResponse(BaseModel):
    status: str  # SUCCESS | FAILED
    facility_id: str
    payout_network: str
    account_number: str
    account_name: str
    latency_ms: float
    message: str
    timestamp: str


# ==========================================
# 2. Dynamic Service Catalog & Tariffs
# ==========================================

class HospitalServiceTariffItem(BaseModel):
    id: str
    service_code: str
    name: str
    category: str  # REGISTRATION, CONSULTATION, LABORATORY, WARD_STAY, PROCEDURE, PHARMACY
    department: str
    base_price: Decimal
    currency: str = "GHS"
    nhis_covered: bool = True
    nhis_tariff_amount: Decimal = Decimal("0.00")
    patient_copay: Decimal = Decimal("0.00")
    is_emergency_waiver_eligible: bool = False
    is_active: bool = True
    updated_at: datetime


class CreateHospitalServiceTariffRequest(BaseModel):
    service_code: str
    name: str
    category: str
    department: str
    base_price: Decimal
    currency: Optional[str] = "GHS"
    nhis_covered: Optional[bool] = True
    nhis_tariff_amount: Optional[Decimal] = Decimal("0.00")
    patient_copay: Optional[Decimal] = Decimal("0.00")
    is_emergency_waiver_eligible: Optional[bool] = False
    is_active: Optional[bool] = True


class UpdateHospitalServiceTariffRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    base_price: Optional[Decimal] = None
    currency: Optional[str] = None
    nhis_covered: Optional[bool] = None
    nhis_tariff_amount: Optional[Decimal] = None
    patient_copay: Optional[Decimal] = None
    is_emergency_waiver_eligible: Optional[bool] = None
    is_active: Optional[bool] = None


class BulkTariffAdjustmentRequest(BaseModel):
    category: Optional[str] = None  # ALL or specific category
    percentage_change: Decimal  # e.g. 5.0 for +5%, -10.0 for -10%
    round_to_nearest: Optional[Decimal] = Decimal("1.00")


# ==========================================
# 3. Corporate & Private Insurance Accounts
# ==========================================

class CorporateInsuranceAccountItem(BaseModel):
    id: str
    account_name: str
    account_code: str
    account_type: str  # PRIVATE_INSURANCE_HMO, CORPORATE_EMPLOYER, EMBASSY_NGO
    contact_person: str
    contact_email: str
    contact_phone: str
    credit_limit: Decimal
    current_balance: Decimal
    available_credit: Decimal
    payment_terms_days: int = 30
    discount_pct: Decimal = Decimal("0.00")
    status: str = "ACTIVE"  # ACTIVE, ON_HOLD, SUSPENDED
    last_invoice_date: Optional[str] = None


class CreateCorporateAccountRequest(BaseModel):
    account_name: str
    account_code: str
    account_type: str
    contact_person: str
    contact_email: str
    contact_phone: str
    credit_limit: Decimal
    payment_terms_days: Optional[int] = 30
    discount_pct: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "ACTIVE"


class UpdateCorporateAccountRequest(BaseModel):
    account_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    status: Optional[str] = None


class StatementOfAccountResponse(BaseModel):
    account_id: str
    account_name: str
    generated_at: str
    statement_period: str
    opening_balance: Decimal
    total_claims_billed: Decimal
    total_payments_received: Decimal
    closing_balance: Decimal
    claims_count: int
    download_url: str


# ==========================================
# 4. Cashier Shift Audit & Oversight
# ==========================================

class CashierShiftAuditItem(BaseModel):
    shift_id: str
    cashier_name: str
    cashier_email: str
    opened_at: str
    closed_at: str
    opening_float: Decimal
    system_cash_expected: Decimal
    cashier_declared_cash: Decimal
    discrepancy_amount: Decimal
    discrepancy_type: str  # BALANCED, OVERAGE, SHORTAGE
    momo_collected: Decimal
    insurance_billed: Decimal
    total_revenue: Decimal
    supervisor_signed_off: bool = True
    supervisor_name: Optional[str] = None
    supervisor_notes: Optional[str] = None
