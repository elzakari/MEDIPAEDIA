import asyncio
from decimal import Decimal
import uuid
import pytest
from app.core.deps import (
    require_clinical_staff,
    require_hospital_role,
    require_pharmacy_role,
    require_super_admin,
    require_superintendent_pharmacist,
    require_zero_phi_financial_role,
)
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from fastapi import HTTPException


def test_doctor_clinical_access_and_financial_rejection():
    """
    Doctor can access clinical records, but is strictly rejected (403)
    from accessing financial cash registers or billing ledgers.
    """
    doctor_user = User(
        id=uuid.uuid4(),
        email="doctor.afia@ridgehospital.health",
        full_name="Dr. Afia Appiah",
        role=UserRole.DOCTOR,
        tenant_id=uuid.uuid4(),
        is_active=True,
    )

    # 1. Doctor passes require_clinical_staff
    res = asyncio.run(require_clinical_staff(current_user=doctor_user))
    assert res.role == UserRole.DOCTOR

    # 2. Doctor is rejected from modifying/auditing financial accounting registers
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_zero_phi_financial_role(current_user=doctor_user))
    assert exc_info.value.status_code == 403
    assert "Clinical separation" in exc_info.value.detail


def test_hospital_finance_zero_phi_isolation():
    """
    Hospital Finance cashier can collect card fees, but is strictly rejected (403)
    from viewing or querying patient clinical encounter notes or diagnoses.
    """
    finance_user = User(
        id=uuid.uuid4(),
        email="finance.esi@ridgehospital.health",
        full_name="Esi Mensah (Finance)",
        role=UserRole.HOSPITAL_FINANCE,
        tenant_id=uuid.uuid4(),
        is_active=True,
    )

    # 1. Finance user passes require_zero_phi_financial_role
    res = asyncio.run(require_zero_phi_financial_role(current_user=finance_user))
    assert res.role == UserRole.HOSPITAL_FINANCE

    # 2. Finance user is strictly rejected from clinical encounter records
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_clinical_staff(current_user=finance_user))
    assert exc_info.value.status_code == 403
    assert "Zero-PHI Financial Isolation" in exc_info.value.detail


def test_superintendent_pharmacist_authority():
    """
    Superintendent Pharmacist has regulatory authority over dangerous drugs
    and defective drug batch quarantines.
    """
    superintendent_user = User(
        id=uuid.uuid4(),
        email="pharm.kojo@osupharmacy.health",
        full_name="Pharm. Kojo Asante",
        role=UserRole.SUPERINTENDENT_PHARMACIST,
        tenant_id=uuid.uuid4(),
        license_number="PC/PIN/4819-GH",
        is_active=True,
    )

    # Mock DB session for pharmacy tenant check
    class MockResult:
        def scalars(self):
            return self

        def first(self):
            return Tenant(
                id=superintendent_user.tenant_id,
                name="Osu Community Pharmacy",
                tenant_type=TenantType.PHARMACY,
            )

    class MockDB:
        async def execute(self, query):
            return MockResult()

    res = asyncio.run(
        require_superintendent_pharmacist(
            current_user=superintendent_user,
            db=MockDB(),
        )
    )
    assert res.role == UserRole.SUPERINTENDENT_PHARMACIST


def test_pharmacy_finance_escrow_access_and_clinical_block():
    """
    Pharmacy Finance can inspect escrow balances and payout ledgers,
    but is blocked from clinical PHI.
    """
    pharm_finance = User(
        id=uuid.uuid4(),
        email="finance.addo@osupharmacy.health",
        full_name="Ebenezer Addo (Dispensary Accountant)",
        role=UserRole.PHARMACY_FINANCE,
        tenant_id=uuid.uuid4(),
        is_active=True,
    )

    # 1. Accesses financial ledger
    res = asyncio.run(require_zero_phi_financial_role(current_user=pharm_finance))
    assert res.role == UserRole.PHARMACY_FINANCE

    # 2. Blocked from clinical encounters
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_clinical_staff(current_user=pharm_finance))
    assert exc_info.value.status_code == 403
    assert "Zero-PHI Financial Isolation" in exc_info.value.detail
