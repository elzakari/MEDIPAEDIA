"""
==============================================================================
Medipaedia SaaS Subscription Entitlements, Seat Quotas & Feature Flag Guards
==============================================================================
Provides hierarchical feature entitlements, seat quota verification, branch limits,
and FastAPI dependency guards for multi-tenant multi-country healthcare facilities.
"""

from decimal import Decimal
import logging
from typing import Any, Callable, Dict, List, Optional
import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import get_current_user, user_has_role_exact
from app.models.branch import FacilityBranch
from app.models.tenant import SubscriptionPlan, Tenant
from app.models.user import User, UserRole

logger = logging.getLogger("medipaedia.entitlements")

# ============================================================================
# Canonical Feature Flags Dictionary & Normalizer Mapping
# ============================================================================

FEATURE_ALIASES: Dict[str, str] = {
    "MULTIBRANCH_IBT": "enable_multibranch",
    "MULTIBRANCH": "enable_multibranch",
    "BRANCHES": "enable_multibranch",
    "NARCOTICS_ACT_857": "enable_controlled_drugs",
    "CONTROLLED_DRUGS": "enable_controlled_drugs",
    "NARCOTICS": "enable_controlled_drugs",
    "COLD_CHAIN_IOT": "enable_cold_chain_iot",
    "IOT_TELEMETRY": "enable_cold_chain_iot",
    "CPOE": "enable_cpoe",
    "CPOE_DECISION_SUPPORT": "enable_cpoe",
    "EMAR": "enable_emar",
    "MEDICATION_ADMINISTRATION": "enable_emar",
    "INSURANCE_RCM": "enable_insurance_rcm",
    "NHIS_SCRUBBER": "enable_insurance_rcm",
    "CUSTOM_TARIFFS": "enable_custom_tariffs",
    "API_ACCESS": "enable_api_access",
    "TELEMETRY": "enable_telemetry",
    "ESCROW": "enable_escrow",
}

DEFAULT_TIER_FLAGS: Dict[str, Dict[str, bool]] = {
    "PLAN-STARTER": {
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
    "PLAN-GROWTH": {
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
    "PLAN-ENTERPRISE": {
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
}

DEFAULT_TIER_LIMITS: Dict[str, Dict[str, int]] = {
    "PLAN-STARTER": {
        "max_staff_seats": 5,
        "max_branches": 1,
        "max_beds": 10,
        "max_monthly_rx": 1000,
    },
    "PLAN-GROWTH": {
        "max_staff_seats": 25,
        "max_branches": 3,
        "max_beds": 60,
        "max_monthly_rx": 10000,
    },
    "PLAN-ENTERPRISE": {
        "max_staff_seats": 9999,
        "max_branches": 999,
        "max_beds": 5000,
        "max_monthly_rx": 9999999,
    },
}


def normalize_feature_key(key: str) -> str:
    """Normalizes uppercase / hyphenated aliases into internal canonical boolean keys."""
    raw = key.strip()
    upper = raw.upper().replace("-", "_")
    if upper in FEATURE_ALIASES:
        return FEATURE_ALIASES[upper]
    return raw.lower().replace("-", "_")


async def get_tenant_plan_details(
    tenant_id: uuid.UUID, db: AsyncSession
) -> Dict[str, Any]:
    """
    Fetches the active subscription plan, feature flags, and quota limits for a tenant.
    """
    # 1. Fetch tenant
    res_tenant = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = res_tenant.scalars().first()
    plan_code = getattr(tenant, "subscription_plan_code", None) or "PLAN-GROWTH"

    # 2. Fetch SubscriptionPlan record if in DB
    plan_stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == plan_code)
    res_plan = await db.execute(plan_stmt)
    db_plan = res_plan.scalars().first()

    if db_plan:
        flags = db_plan.feature_flags or DEFAULT_TIER_FLAGS.get(plan_code, {})
        limits = {
            "max_staff_seats": db_plan.max_staff_seats,
            "max_branches": db_plan.max_branches,
            "max_beds": db_plan.max_beds,
            "max_monthly_rx": db_plan.max_monthly_rx,
        }
        plan_name = db_plan.name
        tier = db_plan.tier
    else:
        flags = DEFAULT_TIER_FLAGS.get(plan_code, DEFAULT_TIER_FLAGS["PLAN-GROWTH"])
        limits = DEFAULT_TIER_LIMITS.get(plan_code, DEFAULT_TIER_LIMITS["PLAN-GROWTH"])
        plan_name = plan_code.replace("PLAN-", "").title() + " Plan"
        tier = plan_code.replace("PLAN-", "")

    return {
        "tenant_id": str(tenant_id),
        "plan_code": plan_code,
        "plan_name": plan_name,
        "tier": tier,
        "feature_flags": flags,
        "limits": limits,
    }


# ============================================================================
# Quota Barrier Verifiers
# ============================================================================

async def verify_seat_limit(tenant_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """
    Checks active staff user headcount against subscription seat quota.
    Rejects creation when exceeded with HTTP 402 Payment Required.
    """
    plan_details = await get_tenant_plan_details(tenant_id, db)
    max_seats = plan_details["limits"]["max_staff_seats"]

    # Count active users belonging to this tenant
    count_stmt = select(func.count(User.id)).where(
        (User.tenant_id == tenant_id) & (User.is_active == True)
    )
    res = await db.execute(count_stmt)
    active_seats = res.scalar_one() or 0

    if active_seats >= max_seats and max_seats < 900:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Staff seat limit reached for {plan_details['plan_name']} "
                f"({active_seats}/{max_seats} active seats). "
                f"Upgrade your subscription plan to Growth or Enterprise to invite additional clinical staff."
            ),
        )

    return {
        "active_seats": active_seats,
        "max_seats": max_seats,
        "seats_remaining": max(0, max_seats - active_seats),
    }


async def verify_branch_limit(tenant_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """
    Checks registered facility branches against subscription tier quota.
    Rejects creation when exceeded with HTTP 403 Forbidden.
    """
    plan_details = await get_tenant_plan_details(tenant_id, db)
    max_branches = plan_details["limits"]["max_branches"]

    # Count active branches for this tenant
    count_stmt = select(func.count(FacilityBranch.id)).where(
        (FacilityBranch.tenant_id == tenant_id) & (FacilityBranch.is_active == True)
    )
    res = await db.execute(count_stmt)
    active_branches = res.scalar_one() or 0

    if active_branches >= max_branches and max_branches < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Branch allowance reached for {plan_details['plan_name']} "
                f"({active_branches}/{max_branches} branches). "
                f"Upgrade to Growth (up to 3 branches) or Enterprise (unlimited) to open additional facility locations."
            ),
        )

    return {
        "active_branches": active_branches,
        "max_branches": max_branches,
        "branches_remaining": max(0, max_branches - active_branches),
    }


# ============================================================================
# FastAPI Dependency Guard: require_feature_flag
# ============================================================================

def require_feature_flag(feature_key: str) -> Callable:
    """
    FastAPI dependency factory to enforce subscription feature flag entitlements.
    Example usage:
        @router.post("/ibt", dependencies=[Depends(require_feature_flag("MULTIBRANCH_IBT"))])
    """
    canonical_key = normalize_feature_key(feature_key)

    async def _feature_guard(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        # Platform Super Admins bypass feature blocks for platform oversight
        if user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
            return True

        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Facility tenant context required to evaluate subscription entitlements.",
            )

        plan_details = await get_tenant_plan_details(current_user.tenant_id, db)
        flags = plan_details.get("feature_flags", {})

        is_enabled = flags.get(canonical_key, False) or flags.get(feature_key, False)

        if not is_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Feature '{feature_key}' is not enabled on your current {plan_details['plan_name']} tier. "
                    f"Please upgrade to Growth or Enterprise to unlock this capability."
                ),
            )
        return True

    return _feature_guard
