import asyncio
import pytest
from pydantic import ValidationError
from fastapi import HTTPException, status

from app.core.email_verifier import validate_deliverable_email
from app.schemas.hospital_admin import StaffInviteRequest, StaffMemberResponse
from app.schemas.staff import StaffProvisionRequest, StaffMemberItem
from app.schemas.user import AdminUserCreateRequest
from app.schemas.onboarding import StaffInvitationCreateRequest, CompanyInvitationCreateRequest
from app.api.v1.endpoints.hospital_admin import invite_hospital_staff, _HOSPITAL_STAFF
from app.models.user import UserRole


class MockAdminUser:
    id = "usr-test-admin-01"
    email = "admin.ridge@gmail.com"
    full_name = "Facility Administrator"
    tenant_id = "tenant-001"
    role = type("Role", (), {"value": "HOSPITAL_ADMIN"})()


def test_validate_deliverable_email_valid_domain():
    """Valid MX domains normalize and pass verification."""
    normalized = validate_deliverable_email("ELZAKARI2025@OUTLOOK.COM")
    assert normalized == "elzakari2025@outlook.com"


def test_validate_deliverable_email_nonexistent_domain():
    """Non-existent domains raise ValueError indicating deliverability check failure."""
    with pytest.raises(ValueError, match="Email deliverability check failed"):
        validate_deliverable_email("test@nonexistentdomain991823.org")


def test_staff_invite_request_schema_rejects_undeliverable_domain():
    """Pydantic schema validation rejects undeliverable email domain."""
    with pytest.raises(ValidationError) as exc_info:
        StaffInviteRequest(
            full_name="Dr. Test Undeliverable",
            email="doctor.fake@nonexistentdomain991823.org",
            role="DOCTOR",
            department="OPD",
        )
    errors = exc_info.value.errors()
    assert any("Email deliverability check failed" in e["msg"] for e in errors)


def test_staff_provision_request_schema_rejects_undeliverable_domain():
    """StaffProvisionRequest rejects undeliverable email domain."""
    with pytest.raises(ValidationError) as exc_info:
        StaffProvisionRequest(
            email="nurse.fake@notarealhospitaldomain18492.health",
            full_name="Nurse Fake",
            role=UserRole.NURSE,
        )
    errors = exc_info.value.errors()
    assert any("Email deliverability check failed" in e["msg"] for e in errors)


def test_admin_user_create_request_rejects_undeliverable_domain():
    """AdminUserCreateRequest rejects undeliverable email domain."""
    with pytest.raises(ValidationError) as exc_info:
        AdminUserCreateRequest(
            email="admin@nonexistentdomain991823.org",
            full_name="Hospital Admin",
            password="SecurePassword123!",
            roles=["HOSPITAL_ADMIN"],
        )
    errors = exc_info.value.errors()
    assert any("Email deliverability check failed" in e["msg"] for e in errors)


def test_staff_invitation_create_request_rejects_undeliverable_domain():
    """StaffInvitationCreateRequest rejects undeliverable email domain."""
    with pytest.raises(ValidationError) as exc_info:
        StaffInvitationCreateRequest(
            email="invitation@nonexistentdomain991823.org",
            first_name="Jane",
            last_name="Doe",
            role=UserRole.DOCTOR,
        )
    errors = exc_info.value.errors()
    assert any("Email deliverability check failed" in e["msg"] for e in errors)


def test_quarantined_account_creation_and_scoped_uniqueness():
    """
    Verifies that:
    1. New staff invitations are created in a quarantined pending state (is_active=False, license_status='PENDING_VERIFICATION').
    2. Duplicate email invitations in the same facility are rejected with 409 Conflict.
    """
    async def _test():
        admin = MockAdminUser()

        unique_email = "quarantined.nurse@outlook.com"
        # Ensure clean initial state in memory
        _HOSPITAL_STAFF[:] = [s for s in _HOSPITAL_STAFF if s.email != unique_email]

        invite_req = StaffInviteRequest(
            full_name="Nurse Abena Quarantined",
            email=unique_email,
            phone="0244123456",
            role="NURSE",
            department="Female Ward",
            council_pin="NMC/RN/10293",
        )

        # 1. First invite succeeds with quarantined status
        new_staff = await invite_hospital_staff(invite_req, current_user=admin, db=None)
        assert new_staff.email == unique_email
        assert new_staff.is_active is False
        assert new_staff.license_status == "PENDING_VERIFICATION"
        assert new_staff.is_on_duty is False

        # 2. Duplicate invite in the same facility triggers 409 Conflict
        with pytest.raises(HTTPException) as exc_info:
            await invite_hospital_staff(invite_req, current_user=admin, db=None)

        assert exc_info.value.status_code == status.HTTP_409_CONFLICT
        assert exc_info.value.detail["code"] == "TENANT_EMAIL_NOT_UNIQUE"

    asyncio.run(_test())
