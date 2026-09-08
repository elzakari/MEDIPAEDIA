from datetime import datetime, timezone
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.config import settings
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.onboarding import CompanyInvitationCreateRequest
from app.services.tenant_onboarding import TenantOnboardingService


@pytest.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


@pytest.mark.anyio
async def test_facility_invitation_handles_unpersisted_user_gracefully(db_session: AsyncSession):
    """
    Ensures that when invited_by user is a mock/dev user (or unpersisted UUID),
    it is safely coerced and does not violate PostgreSQL foreign key constraints or throw 500.
    """
    mock_super_admin = User(
        id=uuid.uuid4(),  # Not saved in database
        email="dev.mock@medipaedia.health",
        full_name="Dev Mock Super Admin",
        role=UserRole.SUPER_ADMIN,
        hashed_password="mock",
    )

    req = CompanyInvitationCreateRequest(
        company_name=f"Mock Facility Test {uuid.uuid4().hex[:6]}",
        admin_email=f"admin.{uuid.uuid4().hex[:6]}@mocktest.health",
        tenant_type=TenantType.CLINIC,
        country="Ghana",
        currency="GHS",
        assigned_plan_code="PLAN-GROWTH",
    )

    invite = await TenantOnboardingService.create_company_invitation(req, mock_super_admin, db_session)
    assert invite is not None
    assert invite.status == "PENDING"
    assert "/onboard/company?token=" in invite.onboarding_url


@pytest.mark.anyio
async def test_facility_invitation_handles_unknown_plan_code_gracefully(db_session: AsyncSession):
    """
    Ensures invalid or unknown plan codes fallback to PLAN-GROWTH safely.
    """
    super_admin_email = f"super.{uuid.uuid4().hex[:6]}@medipaedia.health"
    super_admin = User(
        email=super_admin_email,
        full_name="Platform Super Admin",
        role=UserRole.SUPER_ADMIN,
        hashed_password="hashedpassword",
    )
    db_session.add(super_admin)
    await db_session.commit()

    req = CompanyInvitationCreateRequest(
        company_name=f"Edge Plan Hospital {uuid.uuid4().hex[:6]}",
        admin_email=f"admin.{uuid.uuid4().hex[:6]}@edgeplan.health",
        tenant_type=TenantType.HOSPITAL,
        country="Ghana",
        currency="GHS",
        assigned_plan_code="UNKNOWN-CUSTOM-PLAN-XYZ",
    )

    invite = await TenantOnboardingService.create_company_invitation(req, super_admin, db_session)
    assert invite is not None
    assert invite.assigned_plan_code == "PLAN-GROWTH"


@pytest.mark.anyio
async def test_facility_invitation_duplicate_registered_tenant_rejection(db_session: AsyncSession):
    """
    Ensures attempting to invite a tenant whose email is already registered returns HTTP 400.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    existing_email = f"admin.{unique_suffix}@activehospital.health"

    tenant = Tenant(
        name=f"Active Hospital {unique_suffix}",
        slug=f"active-hospital-{unique_suffix}",
        tenant_type=TenantType.HOSPITAL,
        country="Ghana",
        email=existing_email,
        subscription_plan_code="PLAN-GROWTH",
        subscription_status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.commit()

    req = CompanyInvitationCreateRequest(
        company_name="Duplicate Hospital Name",
        admin_email=existing_email,
        tenant_type=TenantType.HOSPITAL,
        country="Ghana",
        currency="GHS",
        assigned_plan_code="PLAN-GROWTH",
    )

    with pytest.raises(HTTPException) as exc:
        await TenantOnboardingService.create_company_invitation(req, None, db_session)
    assert exc.value.status_code == 400
    assert "already registered" in exc.value.detail
