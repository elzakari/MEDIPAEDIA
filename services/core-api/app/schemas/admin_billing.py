from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class PlanFeatureFlags(BaseModel):
    enable_cpoe: bool = True
    enable_emar: bool = True
    enable_controlled_drugs: bool = True
    enable_multibranch: bool = True
    enable_telemetry: bool = True
    enable_escrow: bool = True
    enable_insurance_rcm: bool = True
    enable_cold_chain_iot: bool = False
    enable_custom_tariffs: bool = True
    enable_api_access: bool = False


class SubscriptionPlanDetail(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    tier: str = "GROWTH"  # STARTER, GROWTH, ENTERPRISE, CUSTOM
    target_facility_type: str = "ALL"  # ALL, HOSPITAL, CLINIC, PHARMACY
    description: str
    price_ghs_monthly: Decimal
    price_xof_monthly: Decimal
    price_usd_monthly: Decimal = Decimal("0.00")
    price_ghs_annual: Decimal
    price_xof_annual: Decimal
    price_usd_annual: Decimal = Decimal("0.00")
    trial_days: int = 14
    max_staff_seats: int = 25
    max_beds: int = 50
    max_monthly_rx: int = 5000
    max_branches: int = 3
    features: List[str] = []
    feature_flags: Dict[str, bool] = Field(default_factory=dict)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class CreateSubscriptionPlanRequest(BaseModel):
    code: str
    name: str
    tier: str = "GROWTH"
    target_facility_type: str = "ALL"
    description: str
    price_ghs_monthly: Decimal
    price_xof_monthly: Decimal
    price_usd_monthly: Optional[Decimal] = Decimal("0.00")
    price_ghs_annual: Decimal
    price_xof_annual: Decimal
    price_usd_annual: Optional[Decimal] = Decimal("0.00")
    trial_days: Optional[int] = 14
    max_staff_seats: Optional[int] = 25
    max_beds: Optional[int] = 50
    max_monthly_rx: Optional[int] = 5000
    max_branches: Optional[int] = 3
    features: Optional[List[str]] = []
    feature_flags: Optional[Dict[str, bool]] = None
    is_active: Optional[bool] = True


class UpdateSubscriptionPlanRequest(BaseModel):
    name: Optional[str] = None
    tier: Optional[str] = None
    target_facility_type: Optional[str] = None
    description: Optional[str] = None
    price_ghs_monthly: Optional[Decimal] = None
    price_xof_monthly: Optional[Decimal] = None
    price_usd_monthly: Optional[Decimal] = None
    price_ghs_annual: Optional[Decimal] = None
    price_xof_annual: Optional[Decimal] = None
    price_usd_annual: Optional[Decimal] = None
    trial_days: Optional[int] = None
    max_staff_seats: Optional[int] = None
    max_beds: Optional[int] = None
    max_monthly_rx: Optional[int] = None
    max_branches: Optional[int] = None
    features: Optional[List[str]] = None
    feature_flags: Optional[Dict[str, bool]] = None
    is_active: Optional[bool] = None


# ==========================================
# Gateway Management & Smart Routing
# ==========================================

class GatewaySmartRouteRule(BaseModel):
    network: str
    country: str
    currency: str
    gateway_id: str
    is_fallback: bool = False


class GatewayConfigItem(BaseModel):
    id: str  # paystack, fedapay, hub2
    name: str
    provider: str
    is_active: bool = True
    environment: str = "sandbox"  # sandbox | live
    public_key: str
    encrypted_secret_key: str  # Masked e.g. "sk_test_••••••••12"
    webhook_secret: Optional[str] = None
    supported_currencies: List[str] = []
    supported_countries: List[str] = []
    routing_rules: List[GatewaySmartRouteRule] = []
    priority: int = 1
    last_ping_status: Optional[str] = "HEALTHY"
    last_ping_at: Optional[str] = None


class UpdateGatewayConfigRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    environment: Optional[str] = None
    public_key: Optional[str] = None
    secret_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    supported_currencies: Optional[List[str]] = None
    supported_countries: Optional[List[str]] = None
    routing_rules: Optional[List[GatewaySmartRouteRule]] = None
    priority: Optional[int] = None


class TestGatewayConnectionResponse(BaseModel):
    gateway_id: str
    status: str  # SUCCESS, FAILED
    environment: str
    latency_ms: float
    message: str
    timestamp: str


# ==========================================
# Tenant Custom Policy & Commission Overrides
# ==========================================

class TenantBillingPolicyItem(BaseModel):
    tenant_id: uuid.UUID
    facility_name: str
    facility_type: str
    standard_commission_pct: Decimal = Decimal("5.00")
    custom_commission_pct: Optional[Decimal] = None
    effective_commission_pct: Decimal = Decimal("5.00")
    grace_period_days: int = 7
    discount_pct: Decimal = Decimal("0.00")
    auto_payout_sweep_enabled: bool = True
    min_payout_sweep_amount: Decimal = Decimal("50.00")
    notes: Optional[str] = None
    updated_at: datetime


class UpdateTenantBillingPolicyRequest(BaseModel):
    custom_commission_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    grace_period_days: Optional[int] = Field(None, ge=0, le=90)
    discount_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    auto_payout_sweep_enabled: Optional[bool] = None
    min_payout_sweep_amount: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None


# ==========================================
# Custom Enterprise Invoice Issuance
# ==========================================

class InvoiceLineItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal
    total: Decimal


class CustomInvoiceRequest(BaseModel):
    tenant_id: uuid.UUID
    invoice_title: str = "Enterprise SaaS Subscription & Dedicated SLA"
    amount: Decimal
    currency: str = "GHS"
    due_date: str
    billing_period: str
    line_items: List[InvoiceLineItem] = []
    notes: Optional[str] = None
    send_momo_prompt: bool = False
    momo_phone: Optional[str] = None
    momo_network: Optional[str] = None


class CustomInvoiceResponse(BaseModel):
    invoice_id: str
    invoice_number: str
    tenant_id: uuid.UUID
    facility_name: str
    amount: Decimal
    currency: str
    status: str  # ISSUED, SENT_MOMO_PROMPT, PAID
    due_date: str
    billing_period: str
    line_items: List[InvoiceLineItem]
    momo_prompt_sent: bool
    tx_reference: Optional[str] = None
    issued_at: datetime
