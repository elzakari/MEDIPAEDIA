from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.payment import PayoutStatus, TransactionType


class PaystackWebhookPayload(BaseModel):
    event: str
    data: Dict[str, Any]


class PaymentRecipientSetupRequest(BaseModel):
    account_name: str
    account_number: str = Field(..., description="Mobile Money number or Bank Account number")
    bank_or_network_code: str = Field(..., description="MTN, VOD, AIR, TMONEY, MOOV_TG, MTN_BJ, MOOV_BJ, or Bank Code")
    currency: str = "GHS"


class PaymentRecipientSetupResponse(BaseModel):
    tenant_id: UUID
    recipient_code: str
    account_name: str
    account_number: str
    bank_or_network: str
    currency: str
    is_payout_configured: bool
    updated_at: datetime


class PlatformTransactionItemResponse(BaseModel):
    id: UUID
    transaction_reference: str
    transaction_type: TransactionType
    gross_amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    currency: str
    order_id: Optional[UUID] = None
    paystack_reference: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime


class SettlementPayoutResponse(BaseModel):
    id: UUID
    payout_reference: str
    transfer_code: Optional[str] = None
    amount: Decimal
    fee_deducted: Decimal
    currency: str
    status: PayoutStatus
    recipient_name: str
    bank_or_momo_network: str
    created_at: datetime
    processed_at: Optional[datetime] = None


class PharmacyLedgerResponse(BaseModel):
    tenant_id: UUID
    facility_name: str
    pending_escrow_balance: Decimal
    available_balance: Decimal
    lifetime_earnings: Decimal
    currency: str
    is_payout_configured: bool
    recipient_account_name: Optional[str] = None
    recipient_account_number: Optional[str] = None
    recent_transactions: List[PlatformTransactionItemResponse] = []
    payout_history: List[SettlementPayoutResponse] = []


class ExecutePayoutRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, description="Amount to disburse. If omitted, sweeps full available balance.")


class ReleaseEscrowRequest(BaseModel):
    order_id: UUID
    verification_code: Optional[str] = Field(None, description="Pickup OTP or courier confirmation code")


class ReleaseEscrowResponse(BaseModel):
    order_id: UUID
    order_number: str
    gross_amount: Decimal
    platform_commission: Decimal
    net_payout_to_pharmacy: Decimal
    new_available_balance: Decimal
    escrow_status: str
    released_at: datetime
    message: str


# ==========================================
# Multi-Country MoMo Push & Thermal Receipts
# ==========================================

class MultiCountryMoMoChargeRequest(BaseModel):
    country: str = Field("GH", description="Country ISO: GH, TG, BJ")
    currency: str = Field("GHS", description="Currency: GHS or XOF")
    amount: Decimal = Field(..., gt=0, description="Charge amount")
    phone: str = Field(..., description="Mobile money telephone number")
    network: str = Field(..., description="Mobile operator (mtn, telecel, tmoney, moov_tg, mtn_bj, moov_bj)")
    customer_name: Optional[str] = "Patient Kwesi Mensah"
    customer_email: Optional[str] = "patient.kwesi@gmail.com"
    invoice_number: Optional[str] = None
    order_id: Optional[str] = None
    description: Optional[str] = "Medical Consultation & Pharmacy Services"


class MultiCountryMoMoChargeResponse(BaseModel):
    transaction_reference: str
    gateway: str
    country: str
    currency: str
    amount: Decimal
    phone: str
    network: str
    network_display_name: str
    status: str
    ussd_prompt_instruction: str
    qr_verification_payload: str
    checkout_url: Optional[str] = None
    created_at: str


class MoMoStatusCheckResponse(BaseModel):
    transaction_reference: str
    status: str  # PENDING_USER_ACTION, PROCESSING, SUCCESS, FAILED
    amount: Decimal
    currency: str
    gateway: str
    phone: str
    network: str
    is_paid: bool
    paid_at: Optional[str] = None
    receipt_ready: bool
    receipt_data: Optional[Dict[str, Any]] = None


class MoMoSweepRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, description="Amount to sweep. If omitted, sweeps full balance.")
    momo_phone: Optional[str] = None
    network: Optional[str] = None
    currency: Optional[str] = None
    country: Optional[str] = None
