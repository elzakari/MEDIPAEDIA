from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Set
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator
from app.models.payment import PayoutStatus, TransactionType
from app.models.tenant import TenantType


class AdminOverviewMetrics(BaseModel):
    gross_marketplace_volume: Decimal = Field(..., description="Total Gross Transaction Volume (GHS)")
    platform_commission_earned: Decimal = Field(..., description="Total 5% Platform Commission (GHS)")
    escrow_in_transit: Decimal = Field(..., description="Active funds currently held in escrow (GHS)")
    available_payout_pool: Decimal = Field(..., description="Total pharmacy balance ready for payout (GHS)")
    total_tenants_count: int
    active_hospitals_count: int
    active_pharmacies_count: int
    total_prescriptions_dispensed: int
    total_patient_accounts: int
    pending_verifications_count: int
    system_telemetry: Dict[str, Any]


class PendingFacilityItem(BaseModel):
    id: UUID
    name: str
    slug: str
    tenant_type: TenantType
    license_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime
    is_verified: bool


class VerifyFacilityRequest(BaseModel):
    tenant_id: UUID
    approve: bool
    rejection_reason: Optional[str] = None
    assigned_tier: Optional[str] = "STANDARD"


class VerifyFacilityResponse(BaseModel):
    tenant_id: UUID
    facility_name: str
    status: str
    is_verified: bool
    verified_at: datetime
    message: str


class BatchSettlementSummary(BaseModel):
    total_eligible_pharmacies: int
    total_payout_amount: Decimal
    currency: str = "GHS"
    batches_pending: int
    recent_payouts_count: int


class ExecuteBatchPayoutRequest(BaseModel):
    notes: Optional[str] = "Automated daily platform escrow sweep"


class BatchPayoutExecutionResult(BaseModel):
    batch_reference: str
    pharmacies_paid_count: int
    total_amount_disbursed: Decimal
    currency: str = "GHS"
    status: str
    executed_at: datetime
    message: str


class SettlementPayoutItem(BaseModel):
    id: UUID
    payout_reference: str
    transfer_code: Optional[str] = None
    amount: Optional[Decimal] = None
    gross_amount: Optional[Decimal] = None
    fee_deducted: Decimal
    net_amount: Optional[Decimal] = None
    tenant_id: Optional[UUID] = None
    currency: str
    status: PayoutStatus
    recipient_name: Optional[str] = None
    recipient_details: Optional[Dict[str, Any]] = None
    bank_or_momo_network: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None


class AdminAuditLogItem(BaseModel):
    id: UUID
    actor_name: str
    actor_email: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime


# ==========================================
# Multi-Country SaaS Subscription & Billing
# ==========================================

class SubscriptionPlanTier(str, Enum):
    STARTER = "STARTER"
    GROWTH = "GROWTH"
    ENTERPRISE = "ENTERPRISE"


class SubscriptionPlanItem(BaseModel):
    id: str
    code: str
    name: str
    tier: SubscriptionPlanTier
    description: str
    price_ghs_monthly: Decimal
    price_xof_monthly: Decimal
    price_ghs_annual: Decimal
    price_xof_annual: Decimal
    features: List[str]
    max_staff_seats: int
    max_branches: int
    includes_cpoe: bool
    includes_escrow: bool
    includes_telemetry: bool
    is_active: bool = True


class CreateSubscriptionPlanRequest(BaseModel):
    code: str
    name: str
    tier: SubscriptionPlanTier
    description: str
    price_ghs_monthly: Decimal
    price_xof_monthly: Decimal
    price_ghs_annual: Decimal
    price_xof_annual: Decimal
    features: List[str]
    max_staff_seats: int = 10
    max_branches: int = 1
    includes_cpoe: bool = True
    includes_escrow: bool = True
    includes_telemetry: bool = True


class TenantSubscriptionMatrixItem(BaseModel):
    tenant_id: str
    facility_name: str
    facility_type: str
    country: str
    currency: str
    plan_code: str
    plan_name: str
    billing_interval: str
    status: str  # ACTIVE, TRIALING, PAST_DUE, RESTRICTED_LOCKED, SUSPENDED
    days_overdue: int
    is_locked: bool
    momo_phone: str
    momo_network: str
    next_billing_date: str
    last_payment_date: str
    last_amount_paid: Decimal
    contact_email: str


class RecurringCollectionRequest(BaseModel):
    tenant_ids: Optional[List[str]] = None
    currency_filter: Optional[str] = None
    dry_run: bool = False


class RecurringCollectionResult(BaseModel):
    collection_batch_id: str
    total_tenants_processed: int
    total_collected_ghs: Decimal
    total_collected_xof: Decimal
    successful_charges: int
    failed_charges: int
    dunning_lockouts_applied: int
    executed_at: str
    details: List[Dict[str, Any]]


ALLOWED_FACILITY_ROLES: Set[str] = {
    "HOSPITAL_ADMIN",
    "PHARMACY_ADMIN",
    "DOCTOR",
    "NURSE",
    "RECORD_CLERK",
    "ACCOUNTANT",
}
FacilityRoleLiteral = Literal[
    "HOSPITAL_ADMIN",
    "PHARMACY_ADMIN",
    "DOCTOR",
    "NURSE",
    "RECORD_CLERK",
    "ACCOUNTANT",
]
FacilityStatusLiteral = Literal["ACTIVE", "RESTRICTED"]
FacilityTierLiteral = Literal["STARTER", "PROFESSIONAL", "ENTERPRISE"]


class UpdateFacilityRequest(BaseModel):
    model_config = {"extra": "forbid"}

    name: Optional[str] = Field(default=None, min_length=2, max_length=255, description="Display name for the facility")
    tier: Optional[FacilityTierLiteral] = Field(default=None, description="Subscription tier label (maps to PLAN-*)")
    country: Optional[str] = Field(default=None, min_length=2, max_length=50)
    currency: Optional[str] = Field(default=None, min_length=2, max_length=10, description="ISO 4217 code e.g. GHS, XOF, USD")
    status: Optional[FacilityStatusLiteral] = Field(default=None, description="ACTIVE or RESTRICTED — maps to is_active boolean")
    subscription_plan_code: Optional[str] = Field(default=None, min_length=3, max_length=50, description="Direct PLAN-* code override — supercedes tier if both supplied")


class UpdateFacilityResponse(BaseModel):
    success: Literal[True] = True
    message: str
    tenant_id: UUID
    name: str
    country: Optional[str]
    currency: str
    subscription_plan_code: str
    status: FacilityStatusLiteral
    is_active: bool
    updated_at: datetime


class TenantStaffItem(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    roles: List[str]
    primary_role: Optional[str] = None
    license_number: Optional[str] = None
    is_active: bool
    tenant_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    invitation_sent: bool = Field(default=True, description="Forward-compat — current implementation never dispatches email")


class CreateTenantStaffRequest(BaseModel):
    model_config = {"extra": "forbid"}

    full_name: str = Field(..., min_length=2, max_length=180)
    email: str = Field(..., max_length=255)
    license_number: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    roles: List[FacilityRoleLiteral] = Field(..., min_length=1, max_length=10, description="Must be subset of ALLOWED_FACILITY_ROLES and contain at least one role")

    @field_validator("email")
    @classmethod
    def _v_email(cls, v: str) -> str:
        if "@" not in v or "." not in v:
            raise ValueError("email must contain @ and a domain dot")
        return v.strip().lower()

    @field_validator("roles")
    @classmethod
    def _v_roles_nonempty_unique(cls, v: List[str]) -> List[str]:
        if len(v) == 0:
            raise ValueError("roles list must contain at least one item")
        seen: Set[str] = set()
        out: List[str] = []
        for r in v:
            if r not in ALLOWED_FACILITY_ROLES:
                raise ValueError(f"role '{r}' is not in the allowed facility role palette")
            if r in seen:
                raise ValueError(f"duplicate role '{r}' in roles array — please omit duplicates")
            seen.add(r)
            out.append(r)
        return out


class GenerateAdminResetLinkRequest(BaseModel):
    model_config = {"extra": "forbid"}
    validity_hours: Optional[int] = Field(default=24, ge=1, le=720, description="Requested validity in hours; server will clamp to [1..72]")


class GenerateAdminResetLinkResponse(BaseModel):
    reset_link: str
    token_id: UUID
    expires_at: datetime
    validity_hours: int
    user_id: UUID
    status: str = "success"
    raw_token: Optional[str] = None
    reset_url: Optional[str] = None
    expires_in: Optional[str] = None
    email_sent: bool = False
    email_dispatch_status: Optional[str] = None
    email_error: Optional[str] = None


class OverridePasswordRequest(BaseModel):
    model_config = {"extra": "forbid"}
    new_password: str = Field(..., min_length=8, max_length=256, description="New bcrypt'd password — 8 chars minimum")


class OverridePasswordResponse(BaseModel):
    success: Literal[True] = True
    message: str
    user_id: UUID
    sessions_revoked: bool
    updated_at: datetime
