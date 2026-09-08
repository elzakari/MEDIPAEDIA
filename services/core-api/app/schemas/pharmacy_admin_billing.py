from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# 1. Gateway, Escrow & Settlement Schemas
# ==========================================

class PharmacyGatewayConfig(BaseModel):
    facility_id: str = "pharm-osu-01"
    facility_name: str = "Osu Community Pharmacy Ltd"
    gateway_mode: str = "PLATFORM_ESCROW"  # "PLATFORM_ESCROW", "DIRECT_SUBACCOUNT"
    primary_gateway: str = "PAYSTACK"  # "PAYSTACK", "FEDAPAY", "HUB2"
    subaccount_code: Optional[str] = "ACCT_sub_osu99120"
    payout_network: str = "MTN_MOMO"  # "MTN_MOMO", "TELECEL_CASH", "TMONEY_TOGO", "MOOV_TOGO", "MTN_BENIN", "MOOV_BENIN", "BANK_TRANSFER"
    payout_account_number: str = "0244556677"
    payout_account_name: str = "Osu Community Pharmacy Main Operating Acc"
    payout_bank_code: Optional[str] = "GH_GCB_01"
    enable_ussd_push: bool = True
    allow_split_tender: bool = True
    fee_bearer: str = "MERCHANT"  # "MERCHANT", "PATIENT"
    auto_payout_schedule: str = "DAILY_AUTOMATED_SWEEP"  # "DAILY_AUTOMATED_SWEEP", "WEEKLY", "MANUAL"
    max_cashier_drawer_limit: Decimal = Decimal("5000.00")
    escrow_available_balance: Decimal = Decimal("18450.00")
    escrow_pending_balance: Decimal = Decimal("3200.00")
    currency: str = "GHS"
    is_verified: bool = True
    last_payout_at: Optional[str] = "21 Aug 2026, 06:00 UTC"


class UpdatePharmacyGatewayConfigRequest(BaseModel):
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
    auto_payout_schedule: Optional[str] = None
    max_cashier_drawer_limit: Optional[Decimal] = Field(None, ge=100)


class TestPharmacyPayoutPingResponse(BaseModel):
    status: str
    facility_id: str
    payout_network: str
    account_number: str
    account_name: str
    latency_ms: float
    message: str
    timestamp: str


class RequestInstantPayoutRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payout_destination: Optional[str] = None
    notes: Optional[str] = "Manual midday merchant settlement payout request"


class RequestInstantPayoutResponse(BaseModel):
    payout_id: str
    amount: Decimal
    currency: str
    destination_network: str
    destination_account: str
    status: str
    tx_reference: str
    remaining_escrow_balance: Decimal
    timestamp: str


# ==========================================
# 2. Dynamic Pricing Rules & Category Markups
# ==========================================

class PharmacyPricingRules(BaseModel):
    pom_markup_pct: Decimal = Decimal("25.00")
    otc_markup_pct: Decimal = Decimal("35.00")
    surgicals_markup_pct: Decimal = Decimal("40.00")
    supplements_markup_pct: Decimal = Decimal("30.00")
    controlled_markup_pct: Decimal = Decimal("20.00")
    vat_tax_rate_pct: Decimal = Decimal("15.00")
    enable_vat_on_receipts: bool = True
    max_cashier_discount_pct: Decimal = Decimal("10.00")
    enable_prescriber_loyalty_split: bool = False
    rounding_mode: str = "NEAREST_10_PESEWAS"  # "NEAREST_10_PESEWAS", "EXACT", "ROUND_UP"
    currency: str = "GHS"
    updated_at: Optional[str] = None


class UpdatePharmacyPricingRulesRequest(BaseModel):
    pom_markup_pct: Optional[Decimal] = Field(None, ge=0, le=200)
    otc_markup_pct: Optional[Decimal] = Field(None, ge=0, le=200)
    surgicals_markup_pct: Optional[Decimal] = Field(None, ge=0, le=200)
    supplements_markup_pct: Optional[Decimal] = Field(None, ge=0, le=200)
    controlled_markup_pct: Optional[Decimal] = Field(None, ge=0, le=200)
    vat_tax_rate_pct: Optional[Decimal] = Field(None, ge=0, le=50)
    enable_vat_on_receipts: Optional[bool] = None
    max_cashier_discount_pct: Optional[Decimal] = Field(None, ge=0, le=50)
    enable_prescriber_loyalty_split: Optional[bool] = None
    rounding_mode: Optional[str] = None


class ApplyBatchPricingRequest(BaseModel):
    category: Optional[str] = "ALL"  # "ALL", "POM", "OTC", "SURGICALS", "SUPPLEMENTS", "CONTROLLED"
    round_prices: Optional[bool] = True


class ApplyBatchPricingResponse(BaseModel):
    status: str
    category_applied: str
    batches_updated_count: int
    average_margin_pct: float
    message: str
    applied_at: str


# ==========================================
# 3. Corporate HMO & Debtors Ledger Schemas
# ==========================================

class PharmacyCorporateDebtorItem(BaseModel):
    id: str
    company_name: str
    account_code: str
    account_type: str  # "PRIVATE_HMO", "CORPORATE_EMPLOYER", "EMBASSY_NGO"
    contact_person: str
    contact_email: str
    contact_phone: str
    credit_limit: Decimal
    current_outstanding_debt: Decimal
    available_credit: Decimal
    payment_terms_days: int
    discount_pct: Decimal
    status: str  # "ACTIVE", "ON_HOLD", "SUSPENDED"
    last_payment_date: Optional[str] = None
    last_statement_generated_at: Optional[str] = None


class CreatePharmacyCorporateDebtorRequest(BaseModel):
    company_name: str = Field(..., min_length=2)
    account_code: str = Field(..., min_length=2)
    account_type: str = "PRIVATE_HMO"
    contact_person: str
    contact_email: str
    contact_phone: str
    credit_limit: Decimal = Field(..., gt=0)
    payment_terms_days: Optional[int] = 30
    discount_pct: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "ACTIVE"


class UpdatePharmacyCorporateDebtorRequest(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    status: Optional[str] = None


class RecordDebtorPaymentRequest(BaseModel):
    amount_paid: Decimal = Field(..., gt=0)
    payment_method: str = "MOMO"  # "MOMO", "BANK_WIRE", "CHEQUE"
    reference_number: str
    notes: Optional[str] = None


class RecordDebtorPaymentResponse(BaseModel):
    status: str
    debtor_id: str
    company_name: str
    amount_paid: Decimal
    previous_debt: Decimal
    new_outstanding_debt: Decimal
    new_available_credit: Decimal
    receipt_number: str
    paid_at: str


class PharmacyDebtorStatementResponse(BaseModel):
    debtor_id: str
    company_name: str
    statement_period: str
    opening_balance: Decimal
    total_prescriptions_billed: Decimal
    total_payments_credited: Decimal
    closing_balance: Decimal
    prescriptions_count: int
    download_url: str
    generated_at: str


# ==========================================
# 4. Cashier Shift & Till Oversight Schemas
# ==========================================

class PharmacyCashierShiftAuditItem(BaseModel):
    shift_id: str
    cashier_name: str
    cashier_email: str
    terminal_id: str
    opened_at: str
    closed_at: str
    opening_float: Decimal
    system_expected_cash: Decimal
    cashier_declared_cash: Decimal
    cash_discrepancy_amount: Decimal
    discrepancy_status: str  # "BALANCED", "OVERAGE", "SHORTAGE"
    momo_collected_amount: Decimal
    insurance_co_pay_billed: Decimal
    total_shift_sales: Decimal
    supervisor_signed_off: bool
    supervisor_name: Optional[str] = None
    notes: Optional[str] = None
