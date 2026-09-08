import asyncio
from decimal import Decimal
import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.superintendent import (
    AuthorizeNarcoticsRequest,
    FreezeBatchRequest,
    QuarantineReason,
)
from app.schemas.pharmacist_operations import (
    FEFODispenseItem,
    FEFODispenseRequest,
)
from app.core.deps import (
    require_pharmacy_admin,
    require_superintendent,
    require_pharmacy_finance,
    require_dispenser,
)
from app.api.v1.endpoints.superintendent import (
    get_narcotics_register,
    authorize_narcotics_dispense,
    freeze_batch_quarantine,
)
from app.api.v1.endpoints.pharmacy import (
    dispense_fefo_prescription,
)


class MockUser:
    def __init__(self, user_id: str, email: str, full_name: str, role_value: str):
        self.id = user_id
        self.email = email
        self.full_name = full_name
        self.role = getattr(UserRole, role_value)


def test_pharmacy_admin_rbac_isolation():
    """
    Verifies that PHARMACY_ADMIN is strictly isolated:
    - Allowed on require_pharmacy_admin
    - 403 Forbidden on require_superintendent
    - 403 Forbidden on require_dispenser
    - 403 Forbidden on require_pharmacy_finance
    """
    async def _test():
        admin_user = MockUser("usr-admin-01", "admin.osu@osupharmacy.health", "Yaw Boakye", "PHARMACY_ADMIN")

        # 1. Admin allowed on pharmacy_admin
        allowed_admin = await require_pharmacy_admin(current_user=admin_user, db=None)
        assert allowed_admin.role == UserRole.PHARMACY_ADMIN

        # 2. Admin blocked from Superintendent Regulatory
        with pytest.raises(HTTPException) as exc_info:
            await require_superintendent(current_user=admin_user, db=None)
        assert exc_info.value.status_code == 403
        assert "Superintendent" in exc_info.value.detail

        # 3. Admin blocked from Dispensing
        with pytest.raises(HTTPException) as exc_info:
            await require_dispenser(current_user=admin_user, db=None)
        assert exc_info.value.status_code == 403

        # 4. Admin blocked from Finance Payouts
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_finance(current_user=admin_user, db=None)
        assert exc_info.value.status_code == 403

    asyncio.run(_test())


def test_superintendent_pharmacist_rbac_isolation():
    """
    Verifies that SUPERINTENDENT_PHARMACIST:
    - Allowed on require_superintendent and regulatory endpoints
    - Allowed on require_dispenser
    - 403 Forbidden on require_pharmacy_admin
    - 403 Forbidden on require_pharmacy_finance
    """
    async def _test():
        super_user = MockUser("usr-super-01", "superintendent.kojo@osupharmacy.health", "Pharm. Kojo Asante", "SUPERINTENDENT_PHARMACIST")

        # 1. Superintendent allowed on superintendent deps
        allowed_super = await require_superintendent(current_user=super_user, db=None)
        assert allowed_super.role == UserRole.SUPERINTENDENT_PHARMACIST

        # 2. Superintendent allowed on clinical dispensing
        allowed_disp = await require_dispenser(current_user=super_user, db=None)
        assert allowed_disp.role == UserRole.SUPERINTENDENT_PHARMACIST

        # 3. Superintendent blocked from Pharmacy Admin store operations
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_admin(current_user=super_user, db=None)
        assert exc_info.value.status_code == 403

        # 4. Superintendent blocked from Finance Ledger Payouts
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_finance(current_user=super_user, db=None)
        assert exc_info.value.status_code == 403

    asyncio.run(_test())


def test_dispensing_pharmacist_rbac_isolation():
    """
    Verifies that counter PHARMACIST:
    - Allowed on require_dispenser
    - 403 Forbidden on require_superintendent
    - 403 Forbidden on require_pharmacy_admin
    - 403 Forbidden on require_pharmacy_finance
    """
    async def _test():
        pharm_user = MockUser("usr-pharm-01", "pharm.kojo@osupharmacy.health", "Pharm. Kojo Asante", "PHARMACIST")

        # 1. Pharmacist allowed on dispensary
        allowed_disp = await require_dispenser(current_user=pharm_user, db=None)
        assert allowed_disp.role == UserRole.PHARMACIST

        # 2. Pharmacist blocked from Superintendent narcotics sign-offs
        with pytest.raises(HTTPException) as exc_info:
            await require_superintendent(current_user=pharm_user, db=None)
        assert exc_info.value.status_code == 403

        # 3. Pharmacist blocked from Pharmacy Admin
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_admin(current_user=pharm_user, db=None)
        assert exc_info.value.status_code == 403

        # 4. Pharmacist blocked from Finance
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_finance(current_user=pharm_user, db=None)
        assert exc_info.value.status_code == 403

    asyncio.run(_test())


def test_pharmacy_finance_rbac_isolation():
    """
    Verifies that PHARMACY_FINANCE:
    - Allowed on require_pharmacy_finance
    - 403 Forbidden on require_dispenser (Zero-PHI Protection)
    - 403 Forbidden on require_superintendent
    - 403 Forbidden on require_pharmacy_admin
    """
    async def _test():
        finance_user = MockUser("usr-fin-01", "finance.abena@osupharmacy.health", "Abena Osei", "PHARMACY_FINANCE")

        # 1. Finance user allowed on finance
        allowed_fin = await require_pharmacy_finance(current_user=finance_user, db=None)
        assert allowed_fin.role == UserRole.PHARMACY_FINANCE

        # 2. Finance blocked from clinical dispensing (Zero-PHI)
        with pytest.raises(HTTPException) as exc_info:
            await require_dispenser(current_user=finance_user, db=None)
        assert exc_info.value.status_code == 403

        # 3. Finance blocked from Superintendent desk
        with pytest.raises(HTTPException) as exc_info:
            await require_superintendent(current_user=finance_user, db=None)
        assert exc_info.value.status_code == 403

        # 4. Finance blocked from Store Admin
        with pytest.raises(HTTPException) as exc_info:
            await require_pharmacy_admin(current_user=finance_user, db=None)
        assert exc_info.value.status_code == 403

    asyncio.run(_test())
