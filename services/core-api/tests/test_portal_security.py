import asyncio
import time
import uuid
import pytest
from app.api.v1.endpoints.auth import compute_default_redirect
from app.core.deps import (
    require_clinical_staff,
    require_hospital_admin,
    require_pharmacy_admin,
    require_super_admin,
)
from app.core.redis_session import (
    is_token_revoked,
    revoke_all_user_sessions,
    revoke_token,
)
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from fastapi import HTTPException


def test_zero_phi_super_admin_prohibition():
    """
    Zero-PHI Governance: SUPER_ADMIN MUST be explicitly rejected with 403 Forbidden
    when attempting to inspect clinical consultation or patient SOAP records.
    """
    super_admin_user = User(
        id=uuid.uuid4(),
        email="super.admin@medipaedia.health",
        full_name="National Super Admin",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_clinical_staff(current_user=super_admin_user))

    assert exc_info.value.status_code == 403
    assert "Zero-PHI Privacy Violation" in exc_info.value.detail


def test_clinical_staff_allowed_access():
    """
    Licensed Doctor or Nurse can access clinical consultation workflow.
    """
    doctor_user = User(
        id=uuid.uuid4(),
        email="doctor.afia@ridgehospital.health",
        full_name="Dr. Afia Appiah",
        role=UserRole.DOCTOR,
        is_active=True,
    )

    result = asyncio.run(require_clinical_staff(current_user=doctor_user))
    assert result.id == doctor_user.id
    assert result.role == UserRole.DOCTOR


def test_super_admin_governance_access():
    """
    SUPER_ADMIN passes require_super_admin check for platform governance.
    Non-super-admins (DOCTOR, NURSE, TENANT_ADMIN) are rejected with 403.
    """
    super_admin = User(
        id=uuid.uuid4(),
        email="super.admin@medipaedia.health",
        full_name="Super Admin",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    doctor = User(
        id=uuid.uuid4(),
        email="doctor.afia@ridgehospital.health",
        full_name="Dr. Afia Appiah",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    nurse = User(
        id=uuid.uuid4(),
        email="nurse.grace@ridgehospital.health",
        full_name="Nurse Grace",
        role=UserRole.NURSE,
        is_active=True,
    )

    # Super admin succeeds
    res = asyncio.run(require_super_admin(current_user=super_admin))
    assert res.role == UserRole.SUPER_ADMIN

    # Doctor fails
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_super_admin(current_user=doctor))
    assert exc_info.value.status_code == 403

    # Nurse fails
    with pytest.raises(HTTPException) as exc_info2:
        asyncio.run(require_super_admin(current_user=nurse))
    assert exc_info2.value.status_code == 403


def test_role_based_default_redirect_paths():
    """
    Verifies that compute_default_redirect returns dedicated portal paths tailored to roles.
    """
    hospital_tenant = Tenant(
        id=uuid.uuid4(),
        name="Ridge Regional Hospital",
        slug="ridge-regional-hospital",
        tenant_type=TenantType.HOSPITAL,
    )
    pharmacy_tenant = Tenant(
        id=uuid.uuid4(),
        name="Osu Community Pharmacy",
        slug="osu-community-pharmacy",
        tenant_type=TenantType.PHARMACY,
    )

    assert compute_default_redirect(UserRole.SUPER_ADMIN) == "/super-admin"
    assert compute_default_redirect(UserRole.HOSPITAL_ADMIN, hospital_tenant) == "/hospital-admin"
    assert compute_default_redirect(UserRole.DOCTOR) == "/doctor"
    assert compute_default_redirect(UserRole.NURSE) == "/nurse"
    assert compute_default_redirect(UserRole.HOSPITAL_FINANCE) == "/hospital-finance"
    assert compute_default_redirect(UserRole.PHARMACY_ADMIN, pharmacy_tenant) == "/pharmacy-admin"
    assert compute_default_redirect(UserRole.PHARMACY_FINANCE) == "/pharmacy-finance"
    assert compute_default_redirect(UserRole.SUPERINTENDENT_PHARMACIST) == "/superintendent"
    assert compute_default_redirect(UserRole.PHARMACIST) == "/dispensary"
    assert compute_default_redirect(UserRole.PATIENT) == "/dashboard"


def test_token_revocation_lifecycle():
    """
    Verifies that a JWT token is active by default and becomes revoked immediately after revoke_token().
    """
    token = create_access_token(
        subject=uuid.uuid4(),
        role="DOCTOR",
    )

    # Initially not revoked
    is_rev = asyncio.run(is_token_revoked(token))
    assert is_rev is False

    # Revoke token
    asyncio.run(revoke_token(token, expires_in_seconds=3600))

    # Now revoked
    is_rev_after = asyncio.run(is_token_revoked(token))
    assert is_rev_after is True


def test_password_hash_verification_and_update():
    """
    Verifies current password validation and secure password hash replacement.
    """
    initial_password = "Medipaedia2026!"
    hashed = get_password_hash(initial_password)

    # Valid current password verifies
    assert verify_password("Medipaedia2026!", hashed) is True

    # Invalid password fails
    assert verify_password("WrongPassword123!", hashed) is False

    # New password hash works
    new_password = "NewSecurePassword2026#$"
    new_hash = get_password_hash(new_password)
    assert verify_password(new_password, new_hash) is True
    assert verify_password(initial_password, new_hash) is False
