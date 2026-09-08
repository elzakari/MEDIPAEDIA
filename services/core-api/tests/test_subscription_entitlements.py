"""
==============================================================================
Subscription Entitlements, Quota Limits & Multi-Branch IBT Test Suite
==============================================================================
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import os
import sys
import uuid
import pytest
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.future import select
from sqlalchemy.pool import NullPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.core.entitlements import (
    get_tenant_plan_details,
    normalize_feature_key,
    require_feature_flag,
    verify_branch_limit,
    verify_seat_limit,
)
from app.models.branch import (
    BranchType,
    FacilityBranch,
    IBTStatus,
    InterBranchTransfer,
    InterBranchTransferItem,
)
from app.models.tenant import SubscriptionPlan, Tenant, TenantType
from app.models.user import User, UserRole


def test_feature_flag_normalizer():
    """Validates alias normalizer handles canonical, upper, and hyphenated keys."""
    assert normalize_feature_key("MULTIBRANCH_IBT") == "enable_multibranch"
    assert normalize_feature_key("NARCOTICS_ACT_857") == "enable_controlled_drugs"
    assert normalize_feature_key("COLD_CHAIN_IOT") == "enable_cold_chain_iot"
    assert normalize_feature_key("CPOE") == "enable_cpoe"
    assert normalize_feature_key("EMAR") == "enable_emar"
    assert normalize_feature_key("enable_multibranch") == "enable_multibranch"


def test_all_subscription_entitlements_and_multibranch_ibt():
    """
    Comprehensive integration test verifying:
    1. Feature flag guards across Starter vs Growth tiers
    2. Seat limit quota enforcement (HTTP 402)
    3. Branch quota barrier (HTTP 403)
    4. End-to-end IBT dispatch and receive lifecycle
    """
    async def _test():
        test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        test_session_factory = async_sessionmaker(
            bind=test_engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )

        try:
            async with test_session_factory() as session:
                # -------------------------------------------------------------
                # 1. Feature Flag Guards on Starter vs Growth
                # -------------------------------------------------------------
                starter_tenant_id = uuid.uuid4()
                starter_tenant = Tenant(
                    id=starter_tenant_id,
                    name="Community Clinic Starter",
                    slug=f"starter-{uuid.uuid4().hex[:6]}",
                    tenant_type=TenantType.CLINIC,
                    subscription_plan_code="PLAN-STARTER",
                    subscription_status="ACTIVE",
                )
                session.add(starter_tenant)

                starter_user = User(
                    id=uuid.uuid4(),
                    email=f"doc-{uuid.uuid4().hex[:6]}@starter.health",
                    phone=f"024{uuid.uuid4().int % 10000000:07d}",
                    hashed_password="mock_password",
                    full_name="Dr. Starter",
                    role=UserRole.DOCTOR,
                    tenant_id=starter_tenant_id,
                    is_active=True,
                )
                session.add(starter_user)
                await session.commit()

                plan_details = await get_tenant_plan_details(starter_tenant_id, session)
                assert plan_details["plan_code"] == "PLAN-STARTER"
                assert plan_details["feature_flags"]["enable_multibranch"] is False
                assert plan_details["feature_flags"]["enable_controlled_drugs"] is False

                guard_multibranch = require_feature_flag("MULTIBRANCH_IBT")
                with pytest.raises(HTTPException) as exc_info:
                    await guard_multibranch(current_user=starter_user, db=session)
                assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

                # Upgrade to Growth -> guard passes
                starter_tenant.subscription_plan_code = "PLAN-GROWTH"
                await session.commit()

                growth_details = await get_tenant_plan_details(starter_tenant_id, session)
                assert growth_details["feature_flags"]["enable_multibranch"] is True
                assert await guard_multibranch(current_user=starter_user, db=session) is True

                # Super Admin bypass
                super_admin_user = User(
                    id=uuid.uuid4(),
                    email="platform.super@medipaedia.health",
                    phone=f"024{uuid.uuid4().int % 10000000:07d}",
                    hashed_password="mock_password",
                    full_name="Super Admin",
                    role=UserRole.SUPER_ADMIN,
                    tenant_id=None,
                    is_active=True,
                )
                assert await guard_multibranch(current_user=super_admin_user, db=session) is True

                # -------------------------------------------------------------
                # 2. Seat Limit Quota Barrier
                # -------------------------------------------------------------
                quota_tenant_id = uuid.uuid4()
                quota_tenant = Tenant(
                    id=quota_tenant_id,
                    name="Small Clinic (Starter)",
                    slug=f"clinic-{uuid.uuid4().hex[:6]}",
                    tenant_type=TenantType.CLINIC,
                    subscription_plan_code="PLAN-STARTER",  # Max 5 seats
                    subscription_status="ACTIVE",
                )
                session.add(quota_tenant)

                for i in range(4):
                    u = User(
                        id=uuid.uuid4(),
                        email=f"staff{i}-{uuid.uuid4().hex[:6]}@clinic.health",
                        phone=f"024{uuid.uuid4().int % 10000000:07d}",
                        hashed_password="mock",
                        full_name=f"Staff {i}",
                        role=UserRole.NURSE,
                        tenant_id=quota_tenant_id,
                        is_active=True,
                    )
                    session.add(u)
                await session.commit()

                seat_status = await verify_seat_limit(quota_tenant_id, session)
                assert seat_status["active_seats"] == 4
                assert seat_status["seats_remaining"] == 1

                # 5th user reaches max limit
                u5 = User(
                    id=uuid.uuid4(),
                    email=f"staff5-{uuid.uuid4().hex[:6]}@clinic.health",
                    phone=f"024{uuid.uuid4().int % 10000000:07d}",
                    hashed_password="mock",
                    full_name="Staff 5",
                    role=UserRole.NURSE,
                    tenant_id=quota_tenant_id,
                    is_active=True,
                )
                session.add(u5)
                await session.commit()

                with pytest.raises(HTTPException) as exc_info:
                    await verify_seat_limit(quota_tenant_id, session)
                assert exc_info.value.status_code == status.HTTP_402_PAYMENT_REQUIRED
                assert "Staff seat limit reached" in exc_info.value.detail

                # -------------------------------------------------------------
                # 3. Branch Quota & IBT Stock Transfer Lifecycle
                # -------------------------------------------------------------
                net_tenant_id = uuid.uuid4()
                net_tenant = Tenant(
                    id=net_tenant_id,
                    name="Apex Health Network",
                    slug=f"apex-{uuid.uuid4().hex[:6]}",
                    tenant_type=TenantType.HOSPITAL,
                    subscription_plan_code="PLAN-GROWTH",  # Max 3 branches
                    subscription_status="ACTIVE",
                )
                session.add(net_tenant)

                b1 = FacilityBranch(
                    id=uuid.uuid4(),
                    tenant_id=net_tenant_id,
                    name="Apex Main Hospital Hub",
                    code=f"APX-{uuid.uuid4().hex[:4].upper()}",
                    branch_type=BranchType.MAIN_HUB,
                    is_main_hub=True,
                    is_active=True,
                )
                b2 = FacilityBranch(
                    id=uuid.uuid4(),
                    tenant_id=net_tenant_id,
                    name="Apex Osu Clinic",
                    code=f"APX-{uuid.uuid4().hex[:4].upper()}",
                    branch_type=BranchType.CLINIC,
                    is_main_hub=False,
                    is_active=True,
                )
                session.add_all([b1, b2])
                await session.commit()

                b_status = await verify_branch_limit(net_tenant_id, session)
                assert b_status["active_branches"] == 2
                assert b_status["branches_remaining"] == 1

                # Dispatch IBT Transfer
                ibt = InterBranchTransfer(
                    id=uuid.uuid4(),
                    tenant_id=net_tenant_id,
                    transfer_number=f"IBT-2026-{uuid.uuid4().hex[:4].upper()}",
                    source_branch_id=b1.id,
                    destination_branch_id=b2.id,
                    status=IBTStatus.DISPATCHED,
                    dispatched_at=datetime.now(timezone.utc),
                    driver_courier_name="Kwame Logistics Driver",
                    notes="Emergency ACT malaria drug transfer.",
                )
                session.add(ibt)
                await session.flush()

                item = InterBranchTransferItem(
                    id=uuid.uuid4(),
                    transfer_id=ibt.id,
                    medication_name="Artemether + Lumefantrine 20/120mg",
                    batch_number="LOT-ACT-2026-X1",
                    quantity_dispatched=50,
                    quantity_received=0,
                    unit_cost=Decimal("15.50"),
                )
                session.add(item)
                await session.commit()

                res_ibt = await session.execute(
                    select(InterBranchTransfer).where(InterBranchTransfer.id == ibt.id)
                )
                loaded_ibt = res_ibt.scalars().first()
                assert loaded_ibt.status == IBTStatus.DISPATCHED

                # Receive Transfer & Credit
                loaded_ibt.status = IBTStatus.RECEIVED
                loaded_ibt.received_at = datetime.now(timezone.utc)
                item.quantity_received = 50
                await session.commit()

                assert loaded_ibt.status == IBTStatus.RECEIVED
                assert item.quantity_received == 50
        finally:
            await test_engine.dispose()

    asyncio.run(_test())
