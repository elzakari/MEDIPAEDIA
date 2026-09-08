from datetime import datetime, timedelta, timezone
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from fastapi import HTTPException

from app.core.config import settings
from app.models.base import BaseModel
from app.models.invitation import InvitationStatus, StaffOnboardingInvitation, TenantOnboardingInvitation
from app.models.tenant import SubscriptionPlan, Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.onboarding import (
    CompanyInvitationCreateRequest,
    CompanyOnboardingCompletionRequest,
    StaffInvitationCreateRequest,
    StaffOnboardingCompletionRequest,
)
from app.services.staff_onboarding import StaffOnboardingService
from app.services.tenant_onboarding import TenantOnboardingService


@pytest.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


@pytest.mark.anyio
async def test_company_invitation_lifecycle(db_session: AsyncSession):
    """
    Tests full company onboarding flow:
    1. Super Admin invites new hospital.
    2. Verification returns company metadata.
    3. Completion atomically provisions Tenant, Primary Branch, and Root Admin.
    4. Re-verifying consumed token fails.
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

    # 1. Create company invitation
    unique_suffix = uuid.uuid4().hex[:6]
    req = CompanyInvitationCreateRequest(
        company_name=f"Tema Specialist Hospital {unique_suffix}",
        admin_email=f"admin.{unique_suffix}@outlook.com",
        tenant_type=TenantType.HOSPITAL,
        country="Ghana",
        currency="GHS",
        assigned_plan_code="PLAN-GROWTH",
    )
    invite = await TenantOnboardingService.create_company_invitation(req, super_admin, db_session)
    assert invite.company_name == f"Tema Specialist Hospital {unique_suffix}"
    assert invite.status == "PENDING"
    assert invite.token is not None
    assert "/onboard/company?token=" in invite.onboarding_url

    # 2. Verify token
    verified = await TenantOnboardingService.verify_company_invitation_token(invite.token, db_session)
    assert verified.valid is True
    assert verified.company_name == f"Tema Specialist Hospital {unique_suffix}"
    assert verified.tenant_type == "HOSPITAL"

    # 3. Complete onboarding
    import random
    random_phone = f"+23324{random.randint(1000000, 9999999)}"
    comp_req = CompanyOnboardingCompletionRequest(
        token=invite.token,
        admin_full_name="Dr. Joseph Darko",
        password="SecureHospitalPass@2026",
        phone_number=random_phone,
        registration_number=f"HeFRA/TMA/{unique_suffix}",
        physical_address="Hospital Road, Tema",
        digital_address="GT-012-9912",
        city="Tema",
    )
    res = await TenantOnboardingService.complete_company_onboarding(comp_req, db_session)
    assert res.success is True
    assert res.tenant_name == f"Tema Specialist Hospital {unique_suffix}"
    assert res.user_email == f"admin.{unique_suffix}@outlook.com"
    assert res.user_role == "HOSPITAL_ADMIN"
    assert res.access_token is not None
    assert res.default_redirect_path == "/hospital-admin"

    # 4. Token is now ACCEPTED and cannot be verified/completed again
    with pytest.raises(HTTPException) as exc:
        await TenantOnboardingService.verify_company_invitation_token(invite.token, db_session)
    assert exc.value.status_code == 400


@pytest.mark.anyio
async def test_staff_invitation_lifecycle(db_session: AsyncSession):
    """
    Tests staff onboarding flow:
    1. Hospital Admin creates staff invitation.
    2. Verification returns role and facility name.
    3. Completion creates User and assigns StaffProfile.
    """
    unique_suffix = uuid.uuid4().hex[:6]

    # Create test tenant & admin user
    tenant = Tenant(
        name=f"Cape Coast Regional Hospital {unique_suffix}",
        slug=f"cape-coast-{unique_suffix}",
        tenant_type=TenantType.HOSPITAL,
        country="Ghana",
        subscription_plan_code="PLAN-GROWTH",
        subscription_status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.flush()

    hospital_admin = User(
        email=f"admin.{unique_suffix}@outlook.com",
        full_name="Dr. Kwesi Appiah",
        role=UserRole.HOSPITAL_ADMIN,
        tenant_id=tenant.id,
        hashed_password="hashedpassword",
    )
    db_session.add(hospital_admin)
    await db_session.commit()

    # 1. Create Staff Invitation
    staff_req = StaffInvitationCreateRequest(
        email=f"dr.mensah.{unique_suffix}@outlook.com",
        first_name="Kofi",
        last_name="Mensah",
        role=UserRole.DOCTOR,
    )
    staff_invite = await StaffOnboardingService.create_staff_invitation(
        staff_req, tenant.id, hospital_admin, db_session
    )
    assert staff_invite.email == f"dr.mensah.{unique_suffix}@outlook.com"
    assert staff_invite.role == "DOCTOR"
    assert staff_invite.status == "PENDING"
    assert "/onboard/staff?token=" in staff_invite.invitation_url

    # 2. Verify Staff Token
    verified_staff = await StaffOnboardingService.verify_staff_invitation_token(
        staff_invite.token, db_session
    )
    assert verified_staff.valid is True
    assert verified_staff.first_name == "Kofi"
    assert verified_staff.role == "DOCTOR"
    assert verified_staff.facility_name == f"Cape Coast Regional Hospital {unique_suffix}"

    # 3. Complete Staff Onboarding
    import random
    random_phone_staff = f"+23320{random.randint(1000000, 9999999)}"
    comp_staff = StaffOnboardingCompletionRequest(
        token=staff_invite.token,
        password="DoctorStaffPass@2026",
        phone_number=random_phone_staff,
        license_number=f"MDC/RN/{unique_suffix}",
        license_expiry="2027-12-31",
    )
    staff_res = await StaffOnboardingService.complete_staff_onboarding(comp_staff, db_session)
    assert staff_res.success is True
    assert staff_res.email == f"dr.mensah.{unique_suffix}@outlook.com"
    assert staff_res.role == "DOCTOR"
    assert staff_res.default_redirect_path == "/doctor"


@pytest.mark.anyio
async def test_expired_token_rejection(db_session: AsyncSession):
    """
    Tests that expired invitation tokens return HTTP 410 Gone.
    """
    token_str = f"expired-{uuid.uuid4().hex}"
    expired_inv = TenantOnboardingInvitation(
        token=token_str,
        company_name="Expired Clinic Test",
        admin_email=f"expired.{uuid.uuid4().hex[:6]}@clinic.com",
        tenant_type=TenantType.CLINIC,
        country="Ghana",
        currency="GHS",
        assigned_plan_code="PLAN-STARTER",
        status=InvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(expired_inv)
    await db_session.commit()

    with pytest.raises(HTTPException) as exc:
        await TenantOnboardingService.verify_company_invitation_token(token_str, db_session)
    assert exc.value.status_code == 410


@pytest.mark.anyio
async def test_staff_seat_quota_summary(db_session: AsyncSession):
    """
    Tests seat quota summary calculation.
    """
    tenant = Tenant(
        name=f"Quota Test Clinic {uuid.uuid4().hex[:6]}",
        slug=f"quota-test-{uuid.uuid4().hex[:6]}",
        tenant_type=TenantType.CLINIC,
        country="Ghana",
        subscription_plan_code="PLAN-GROWTH",
        subscription_status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.commit()

    quota = await StaffOnboardingService.get_seat_quota_summary(tenant.id, db_session)
    assert quota.active_seats == 0
    assert quota.max_seats == 25
    assert quota.seats_remaining == 25
