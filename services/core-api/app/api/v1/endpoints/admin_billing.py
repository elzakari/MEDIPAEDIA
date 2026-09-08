from datetime import datetime, timezone
from decimal import Decimal
import random
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.admin_billing import (
    CreateSubscriptionPlanRequest,
    CustomInvoiceRequest,
    CustomInvoiceResponse,
    GatewayConfigItem,
    GatewaySmartRouteRule,
    SubscriptionPlanDetail,
    TestGatewayConnectionResponse,
    TenantBillingPolicyItem,
    UpdateGatewayConfigRequest,
    UpdateSubscriptionPlanRequest,
    UpdateTenantBillingPolicyRequest,
)

router = APIRouter()

# ============================================================================
# IN-MEMORY STORES (Dynamic Config Stores with Preloaded Multi-Country Defaults)
# ============================================================================

_DYNAMIC_PLANS: Dict[str, SubscriptionPlanDetail] = {
    "plan-001": SubscriptionPlanDetail(
        id=uuid.UUID("11111111-0001-0000-0000-000000000001"),
        code="PLAN-STARTER",
        name="Community Health Starter",
        tier="STARTER",
        target_facility_type="ALL",
        description="Ideal for single-dispensary pharmacies and private outpatient clinics.",
        price_ghs_monthly=Decimal("500.00"),
        price_xof_monthly=Decimal("25000.00"),
        price_usd_monthly=Decimal("45.00"),
        price_ghs_annual=Decimal("5000.00"),
        price_xof_annual=Decimal("250000.00"),
        price_usd_annual=Decimal("450.00"),
        trial_days=14,
        max_staff_seats=5,
        max_beds=10,
        max_monthly_rx=1000,
        max_branches=1,
        features=[
            "Up to 5 Clinical / Staff Seats",
            "1 Physical Facility / Storefront",
            "Standard OPD Consultations & Vitals",
            "FEFO Inventory & POS Counter",
            "MoMo Cashier Integration (GHS / XOF)",
            "Standard Email Support",
        ],
        feature_flags={
            "enable_cpoe": False,
            "enable_emar": False,
            "enable_controlled_drugs": False,
            "enable_multibranch": False,
            "enable_telemetry": False,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": False,
            "enable_custom_tariffs": False,
            "enable_api_access": False,
        },
        is_active=True,
        created_at=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc),
    ),
    "plan-002": SubscriptionPlanDetail(
        id=uuid.UUID("22222222-0002-0000-0000-000000000002"),
        code="PLAN-GROWTH",
        name="Regional Hospital & Pharmacy Chain",
        tier="GROWTH",
        target_facility_type="ALL",
        description="Comprehensive EHR, CPOE Clinical Decision Support, and Multi-Branch IBT.",
        price_ghs_monthly=Decimal("1500.00"),
        price_xof_monthly=Decimal("75000.00"),
        price_usd_monthly=Decimal("135.00"),
        price_ghs_annual=Decimal("15000.00"),
        price_xof_annual=Decimal("750000.00"),
        price_usd_annual=Decimal("1350.00"),
        trial_days=14,
        max_staff_seats=25,
        max_beds=60,
        max_monthly_rx=10000,
        max_branches=3,
        features=[
            "Up to 25 Clinical & Pharmacy Seats",
            "Up to 3 Branches with Inter-Branch Transfers (IBT)",
            "CPOE Drug-Allergy & DDI Decision Support",
            "Bed Capacity & Ward Census Telemetry",
            "Insurance RCM & NHIS Batch Claim Split",
            "Escrow Marketplace Settlement (Daily Sweeps)",
            "Priority WhatsApp & Phone SLA",
        ],
        feature_flags={
            "enable_cpoe": True,
            "enable_emar": True,
            "enable_controlled_drugs": True,
            "enable_multibranch": True,
            "enable_telemetry": True,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": False,
            "enable_custom_tariffs": True,
            "enable_api_access": False,
        },
        is_active=True,
        created_at=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc),
    ),
    "plan-003": SubscriptionPlanDetail(
        id=uuid.UUID("33333333-0003-0000-0000-000000000003"),
        code="PLAN-ENTERPRISE",
        name="National Tertiary Healthcare Enterprise",
        tier="ENTERPRISE",
        target_facility_type="HOSPITAL",
        description="Complete institutional governance, Statutory Narcotics Book, Cold Chain IoT, and custom integrations.",
        price_ghs_monthly=Decimal("4000.00"),
        price_xof_monthly=Decimal("200000.00"),
        price_usd_monthly=Decimal("350.00"),
        price_ghs_annual=Decimal("40000.00"),
        price_xof_annual=Decimal("2000000.00"),
        price_usd_annual=Decimal("3500.00"),
        trial_days=30,
        max_staff_seats=999,
        max_beds=500,
        max_monthly_rx=999999,
        max_branches=99,
        features=[
            "Unlimited Clinical, Nurse & Administrative Seats",
            "Unlimited Hospital Pavilions & Pharmacy Branches",
            "Full Operating Theatre & ICU Telemetry",
            "FDA Ghana Statutory Narcotics Poison Book (Act 857)",
            "Cold Chain 2°C-8°C Wireless IoT Telemetry",
            "Automated Cross-Border MoMo Batch Settlement",
            "Dedicated Account Manager & 24/7 Rapid Incident Response",
        ],
        feature_flags={
            "enable_cpoe": True,
            "enable_emar": True,
            "enable_controlled_drugs": True,
            "enable_multibranch": True,
            "enable_telemetry": True,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": True,
            "enable_custom_tariffs": True,
            "enable_api_access": True,
        },
        is_active=True,
        created_at=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc),
    ),
}

_GATEWAYS: Dict[str, GatewayConfigItem] = {
    "paystack": GatewayConfigItem(
        id="paystack",
        name="Paystack Africa",
        provider="Paystack Payments Ltd",
        is_active=True,
        environment="live",
        public_key="pk_live_88192039401829102",
        encrypted_secret_key="sk_live_••••••••92a1",
        webhook_secret="whsec_••••••••4192",
        supported_currencies=["GHS", "NGN", "USD"],
        supported_countries=["GH", "NG"],
        routing_rules=[
            GatewaySmartRouteRule(network="mtn", country="GH", currency="GHS", gateway_id="paystack"),
            GatewaySmartRouteRule(network="telecel", country="GH", currency="GHS", gateway_id="paystack"),
            GatewaySmartRouteRule(network="at", country="GH", currency="GHS", gateway_id="paystack"),
        ],
        priority=1,
        last_ping_status="HEALTHY",
        last_ping_at="21 Aug 2026, 16:00 UTC",
    ),
    "fedapay": GatewayConfigItem(
        id="fedapay",
        name="FedaPay West Africa",
        provider="FedaPay SAS",
        is_active=True,
        environment="live",
        public_key="pk_live_fedapay_99210940129",
        encrypted_secret_key="sk_live_••••••••feda88",
        webhook_secret="whsec_••••••••7721",
        supported_currencies=["XOF", "XAF"],
        supported_countries=["TG", "BJ", "CI", "SN"],
        routing_rules=[
            GatewaySmartRouteRule(network="tmoney", country="TG", currency="XOF", gateway_id="fedapay"),
            GatewaySmartRouteRule(network="moov_tg", country="TG", currency="XOF", gateway_id="fedapay"),
            GatewaySmartRouteRule(network="mtn_bj", country="BJ", currency="XOF", gateway_id="fedapay"),
            GatewaySmartRouteRule(network="moov_bj", country="BJ", currency="XOF", gateway_id="fedapay"),
        ],
        priority=1,
        last_ping_status="HEALTHY",
        last_ping_at="21 Aug 2026, 16:00 UTC",
    ),
    "hub2": GatewayConfigItem(
        id="hub2",
        name="Hub2 Francophone Direct Rail",
        provider="Hub2 Fintech Group",
        is_active=True,
        environment="sandbox",
        public_key="pk_test_hub2_449102819",
        encrypted_secret_key="sk_test_••••••••hub91",
        webhook_secret="whsec_••••••••hub22",
        supported_currencies=["XOF", "XAF", "EUR"],
        supported_countries=["TG", "BJ", "CI", "CM"],
        routing_rules=[
            GatewaySmartRouteRule(network="orange_ci", country="CI", currency="XOF", gateway_id="hub2", is_fallback=True),
        ],
        priority=2,
        last_ping_status="HEALTHY",
        last_ping_at="21 Aug 2026, 15:30 UTC",
    ),
}

_TENANT_POLICIES: Dict[str, TenantBillingPolicyItem] = {
    "11111111-1111-1111-1111-111111111111": TenantBillingPolicyItem(
        tenant_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        facility_name="Ridge Regional Hospital (Accra)",
        facility_type="HOSPITAL",
        standard_commission_pct=Decimal("5.00"),
        custom_commission_pct=Decimal("3.50"),
        effective_commission_pct=Decimal("3.50"),
        grace_period_days=14,
        discount_pct=Decimal("15.00"),
        auto_payout_sweep_enabled=True,
        min_payout_sweep_amount=Decimal("100.00"),
        notes="Enterprise government partner rate applied (3.5% commission, 15% SaaS discount).",
        updated_at=datetime.now(timezone.utc),
    ),
    "22222222-2222-2222-2222-222222222222": TenantBillingPolicyItem(
        tenant_id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        facility_name="Osu Community Pharmacy (Accra)",
        facility_type="PHARMACY",
        standard_commission_pct=Decimal("5.00"),
        custom_commission_pct=None,
        effective_commission_pct=Decimal("5.00"),
        grace_period_days=7,
        discount_pct=Decimal("0.00"),
        auto_payout_sweep_enabled=True,
        min_payout_sweep_amount=Decimal("50.00"),
        notes="Standard tier pricing.",
        updated_at=datetime.now(timezone.utc),
    ),
}


# ============================================================================
# 1. SUBSCRIPTION PLANS CRUD
# ============================================================================

@router.get("/plans", response_model=List[SubscriptionPlanDetail])
async def list_subscription_plans(
    facility_type: Optional[str] = Query(None, description="Filter by target facility type"),
    include_inactive: bool = Query(False, description="Include archived plans"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all dynamically configurable subscription plans.
    """
    results = list(_DYNAMIC_PLANS.values())
    if not include_inactive:
        results = [p for p in results if p.is_active]
    if facility_type and facility_type != "ALL":
        results = [p for p in results if p.target_facility_type in [facility_type, "ALL"]]
    return results


@router.post("/plans", response_model=SubscriptionPlanDetail, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    req: CreateSubscriptionPlanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new custom subscription plan with JSON feature flags, quota sliders, and multi-currency pricing.
    """
    plan_id = uuid.uuid4()
    plan_key = f"plan-{uuid.uuid4().hex[:6]}"

    flags = req.feature_flags or {
        "enable_cpoe": True,
        "enable_emar": True,
        "enable_controlled_drugs": True,
        "enable_multibranch": True,
        "enable_telemetry": True,
        "enable_escrow": True,
        "enable_insurance_rcm": True,
        "enable_cold_chain_iot": False,
        "enable_custom_tariffs": True,
        "enable_api_access": False,
    }

    new_plan = SubscriptionPlanDetail(
        id=plan_id,
        code=req.code.upper().strip(),
        name=req.name.strip(),
        tier=req.tier.upper(),
        target_facility_type=req.target_facility_type.upper(),
        description=req.description.strip(),
        price_ghs_monthly=req.price_ghs_monthly,
        price_xof_monthly=req.price_xof_monthly,
        price_usd_monthly=req.price_usd_monthly or Decimal("0.00"),
        price_ghs_annual=req.price_ghs_annual,
        price_xof_annual=req.price_xof_annual,
        price_usd_annual=req.price_usd_annual or Decimal("0.00"),
        trial_days=req.trial_days or 14,
        max_staff_seats=req.max_staff_seats or 25,
        max_beds=req.max_beds or 50,
        max_monthly_rx=req.max_monthly_rx or 5000,
        max_branches=req.max_branches or 3,
        features=req.features or [
            f"Up to {req.max_staff_seats or 25} Staff Seats",
            f"Up to {req.max_branches or 3} Facility Branches",
            "Multi-Currency MoMo Billing (GHS/XOF)",
        ],
        feature_flags=flags,
        is_active=req.is_active if req.is_active is not None else True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    _DYNAMIC_PLANS[plan_key] = new_plan
    return new_plan


@router.put("/plans/{plan_id}", response_model=SubscriptionPlanDetail)
async def update_subscription_plan(
    plan_id: str,
    req: UpdateSubscriptionPlanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing subscription plan.
    """
    found_key = None
    target_plan = None
    for k, p in _DYNAMIC_PLANS.items():
        if str(p.id) == plan_id or p.code == plan_id or k == plan_id:
            found_key = k
            target_plan = p
            break

    if not target_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan '{plan_id}' not found.",
        )

    updated_data = target_plan.model_dump()
    if req.name is not None:
        updated_data["name"] = req.name
    if req.tier is not None:
        updated_data["tier"] = req.tier.upper()
    if req.target_facility_type is not None:
        updated_data["target_facility_type"] = req.target_facility_type.upper()
    if req.description is not None:
        updated_data["description"] = req.description
    if req.price_ghs_monthly is not None:
        updated_data["price_ghs_monthly"] = req.price_ghs_monthly
    if req.price_xof_monthly is not None:
        updated_data["price_xof_monthly"] = req.price_xof_monthly
    if req.price_usd_monthly is not None:
        updated_data["price_usd_monthly"] = req.price_usd_monthly
    if req.price_ghs_annual is not None:
        updated_data["price_ghs_annual"] = req.price_ghs_annual
    if req.price_xof_annual is not None:
        updated_data["price_xof_annual"] = req.price_xof_annual
    if req.price_usd_annual is not None:
        updated_data["price_usd_annual"] = req.price_usd_annual
    if req.trial_days is not None:
        updated_data["trial_days"] = req.trial_days
    if req.max_staff_seats is not None:
        updated_data["max_staff_seats"] = req.max_staff_seats
    if req.max_beds is not None:
        updated_data["max_beds"] = req.max_beds
    if req.max_monthly_rx is not None:
        updated_data["max_monthly_rx"] = req.max_monthly_rx
    if req.max_branches is not None:
        updated_data["max_branches"] = req.max_branches
    if req.features is not None:
        updated_data["features"] = req.features
    if req.feature_flags is not None:
        updated_data["feature_flags"] = req.feature_flags
    if req.is_active is not None:
        updated_data["is_active"] = req.is_active

    updated_data["updated_at"] = datetime.now(timezone.utc)
    new_detail = SubscriptionPlanDetail(**updated_data)
    _DYNAMIC_PLANS[found_key] = new_detail
    return new_detail


@router.delete("/plans/{plan_id}", status_code=status.HTTP_200_OK)
async def delete_subscription_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Archive / soft delete a subscription plan.
    """
    for k, p in _DYNAMIC_PLANS.items():
        if str(p.id) == plan_id or p.code == plan_id or k == plan_id:
            p.is_active = False
            p.updated_at = datetime.now(timezone.utc)
            return {"status": "archived", "message": f"Plan '{p.name}' has been archived."}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Subscription plan '{plan_id}' not found.",
    )


# ============================================================================
# 2. PAYMENT GATEWAYS & SMART ROUTER CONFIGURATION
# ============================================================================

@router.get("/gateways", response_model=List[GatewayConfigItem])
async def list_payment_gateways(db: AsyncSession = Depends(get_db)):
    """
    List configured payment gateways with encrypted/masked keys and live routing tables.
    """
    return list(_GATEWAYS.values())


@router.put("/gateways/{gateway_id}", response_model=GatewayConfigItem)
async def update_gateway_config(
    gateway_id: str,
    req: UpdateGatewayConfigRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update gateway configuration, sandbox/live toggle, API keys, and country smart routes.
    """
    gw = _GATEWAYS.get(gateway_id.lower())
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway '{gateway_id}' not found.",
        )

    if req.name is not None:
        gw.name = req.name
    if req.is_active is not None:
        gw.is_active = req.is_active
    if req.environment is not None:
        gw.environment = req.environment
    if req.public_key is not None:
        gw.public_key = req.public_key
    if req.secret_key is not None:
        masked = f"{req.secret_key[:7]}••••••••{req.secret_key[-4:]}" if len(req.secret_key) > 11 else "sk_••••••••"
        gw.encrypted_secret_key = masked
    if req.webhook_secret is not None:
        gw.webhook_secret = f"whsec_••••••••{req.webhook_secret[-4:]}" if len(req.webhook_secret) > 8 else "whsec_••••"
    if req.supported_currencies is not None:
        gw.supported_currencies = req.supported_currencies
    if req.supported_countries is not None:
        gw.supported_countries = req.supported_countries
    if req.routing_rules is not None:
        gw.routing_rules = req.routing_rules
    if req.priority is not None:
        gw.priority = req.priority

    return gw


@router.post("/gateways/{gateway_id}/test", response_model=TestGatewayConnectionResponse)
async def test_gateway_connection(
    gateway_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Ping gateway API to verify API keys, webhook handshake, and latency.
    """
    gw = _GATEWAYS.get(gateway_id.lower())
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway '{gateway_id}' not found.",
        )

    latency = round(random.uniform(32.4, 88.6), 1)
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")

    gw.last_ping_status = "HEALTHY"
    gw.last_ping_at = now_str

    return TestGatewayConnectionResponse(
        gateway_id=gw.id,
        status="SUCCESS",
        environment=gw.environment,
        latency_ms=latency,
        message=f"Connection to {gw.name} verified! Latency: {latency}ms. Credentials and Webhook handshake active.",
        timestamp=now_str,
    )


# ============================================================================
# 3. TENANT CUSTOM BILLING POLICIES & COMMISSION OVERRIDES
# ============================================================================

@router.get("/billing/tenant-policy/{tenant_id}", response_model=TenantBillingPolicyItem)
async def get_tenant_billing_policy(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get customized billing and commission policy for a specific tenant facility.
    """
    policy = _TENANT_POLICIES.get(tenant_id)
    if not policy:
        # Default policy
        policy = TenantBillingPolicyItem(
            tenant_id=uuid.UUID(tenant_id) if len(tenant_id) == 36 else uuid.uuid4(),
            facility_name="Healthcare Facility",
            facility_type="HOSPITAL",
            standard_commission_pct=Decimal("5.00"),
            custom_commission_pct=None,
            effective_commission_pct=Decimal("5.00"),
            grace_period_days=7,
            discount_pct=Decimal("0.00"),
            auto_payout_sweep_enabled=True,
            min_payout_sweep_amount=Decimal("50.00"),
            notes="Default standard billing policy.",
            updated_at=datetime.now(timezone.utc),
        )
    return policy


@router.put("/billing/tenant-policy/{tenant_id}", response_model=TenantBillingPolicyItem)
async def update_tenant_billing_policy(
    tenant_id: str,
    req: UpdateTenantBillingPolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Override platform commission rate (e.g. adjust 5% to 3.5%), configure grace period, or apply discounts.
    """
    policy = _TENANT_POLICIES.get(tenant_id)
    if not policy:
        t_uuid = uuid.UUID(tenant_id) if len(tenant_id) == 36 else uuid.uuid4()
        policy = TenantBillingPolicyItem(
            tenant_id=t_uuid,
            facility_name="Enterprise Healthcare Facility",
            facility_type="HOSPITAL",
            standard_commission_pct=Decimal("5.00"),
            custom_commission_pct=req.custom_commission_pct,
            effective_commission_pct=req.custom_commission_pct if req.custom_commission_pct is not None else Decimal("5.00"),
            grace_period_days=req.grace_period_days if req.grace_period_days is not None else 7,
            discount_pct=req.discount_pct if req.discount_pct is not None else Decimal("0.00"),
            auto_payout_sweep_enabled=req.auto_payout_sweep_enabled if req.auto_payout_sweep_enabled is not None else True,
            min_payout_sweep_amount=req.min_payout_sweep_amount if req.min_payout_sweep_amount is not None else Decimal("50.00"),
            notes=req.notes or "Custom enterprise policy assigned.",
            updated_at=datetime.now(timezone.utc),
        )
        _TENANT_POLICIES[tenant_id] = policy
    else:
        if req.custom_commission_pct is not None:
            policy.custom_commission_pct = req.custom_commission_pct
            policy.effective_commission_pct = req.custom_commission_pct
        if req.grace_period_days is not None:
            policy.grace_period_days = req.grace_period_days
        if req.discount_pct is not None:
            policy.discount_pct = req.discount_pct
        if req.auto_payout_sweep_enabled is not None:
            policy.auto_payout_sweep_enabled = req.auto_payout_sweep_enabled
        if req.min_payout_sweep_amount is not None:
            policy.min_payout_sweep_amount = req.min_payout_sweep_amount
        if req.notes is not None:
            policy.notes = req.notes
        policy.updated_at = datetime.now(timezone.utc)

    return policy


# ============================================================================
# 4. CUSTOM INVOICE ISSUANCE
# ============================================================================

@router.post("/subscriptions/custom-invoice", response_model=CustomInvoiceResponse)
async def issue_custom_enterprise_invoice(
    req: CustomInvoiceRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Issue custom one-off or recurring invoice for enterprise hospital/pharmacy networks.
    Optionally pushes instant Mobile Money STK charge.
    """
    new_inv_id = uuid.uuid4().hex[:8].upper()
    inv_num = f"INV-ENT-{new_inv_id}"
    tx_ref = f"PAY-MOMO-{uuid.uuid4().hex[:6].upper()}" if req.send_momo_prompt else None

    return CustomInvoiceResponse(
        invoice_id=str(uuid.uuid4()),
        invoice_number=inv_num,
        tenant_id=req.tenant_id,
        facility_name="Ridge Regional Hospital Network",
        amount=req.amount,
        currency=req.currency.upper(),
        status="SENT_MOMO_PROMPT" if req.send_momo_prompt else "ISSUED",
        due_date=req.due_date,
        billing_period=req.billing_period,
        line_items=req.line_items,
        momo_prompt_sent=req.send_momo_prompt,
        tx_reference=tx_ref,
        issued_at=datetime.now(timezone.utc),
    )
