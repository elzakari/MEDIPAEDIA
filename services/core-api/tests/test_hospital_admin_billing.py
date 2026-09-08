import asyncio
from decimal import Decimal
import uuid
import pytest

from app.schemas.hospital_admin_billing import (
    BulkTariffAdjustmentRequest,
    CreateCorporateAccountRequest,
    CreateHospitalServiceTariffRequest,
    UpdateCorporateAccountRequest,
    UpdateFacilityGatewayConfigRequest,
    UpdateHospitalServiceTariffRequest,
)
from app.api.v1.endpoints.hospital_admin import (
    get_facility_gateway_config,
    update_facility_gateway_config,
    test_facility_payout_ping as api_test_facility_payout_ping,
    list_hospital_services,
    create_hospital_service,
    update_hospital_service,
    delete_hospital_service,
    bulk_tariff_adjustment,
    list_corporate_accounts,
    create_corporate_account,
    update_corporate_account,
    generate_corporate_statement,
    list_cashier_shifts_audit,
)


class MockUser:
    id = "usr-admin-01"
    email = "admin.ridge@ridgehospital.health"
    full_name = "Hospital Administrator"
    role = type("Role", (), {"value": "HOSPITAL_ADMIN"})()


def test_facility_gateway_config_and_payout_ping():
    async def _test():
        user = MockUser()

        # 1. Fetch gateway config
        config = await get_facility_gateway_config(current_user=user, db=None)
        assert config.facility_id == "fac-ridge-01"
        assert config.payout_network == "MTN_MOMO"
        assert config.is_verified is True
        assert config.max_cashier_drawer_limit == Decimal("5000.00")

        # 2. Update payout account & drawer limit
        update_req = UpdateFacilityGatewayConfigRequest(
            payout_network="TELECEL_CASH",
            payout_account_number="0209998877",
            payout_account_name="Ridge Regional Main Hospital Finance",
            max_cashier_drawer_limit=Decimal("6000.00"),
            fee_bearer="PATIENT",
        )
        updated = await update_facility_gateway_config(req=update_req, current_user=user, db=None)
        assert updated.payout_network == "TELECEL_CASH"
        assert updated.payout_account_number == "0209998877"
        assert updated.max_cashier_drawer_limit == Decimal("6000.00")
        assert updated.fee_bearer == "PATIENT"

        # 3. Test payout ping
        ping_data = await api_test_facility_payout_ping(current_user=user, db=None)
        assert ping_data.status == "SUCCESS"
        assert ping_data.latency_ms > 0
        assert ping_data.payout_network == "TELECEL_CASH"

    asyncio.run(_test())


def test_service_tariff_crud_and_nhis_copay_calculation():
    async def _test():
        user = MockUser()

        # 1. List services
        services = await list_hospital_services(category=None, include_inactive=False, current_user=user, db=None)
        assert len(services) >= 7
        codes = [s.service_code for s in services]
        assert "SRV-REG-NEW" in codes
        assert "SRV-CONS-GEN" in codes
        assert "SRV-LAB-FBC" in codes

        # 2. Create new service tariff
        srv_code = f"SRV-RAD-MRI-{uuid.uuid4().hex[:4].upper()}"
        create_req = CreateHospitalServiceTariffRequest(
            service_code=srv_code,
            name="Magnetic Resonance Imaging (Brain MRI with Contrast)",
            category="PROCEDURE",
            department="Radiology & Advanced Imaging",
            base_price=Decimal("1800.00"),
            currency="GHS",
            nhis_covered=True,
            nhis_tariff_amount=Decimal("1200.00"),
            patient_copay=Decimal("600.00"),
            is_emergency_waiver_eligible=False,
        )
        created = await create_hospital_service(req=create_req, current_user=user, db=None)
        assert created.service_code == srv_code
        assert created.base_price == Decimal("1800.00")
        assert created.patient_copay == Decimal("600.00")

        # 3. Update service tariff
        srv_id = created.id
        update_req = UpdateHospitalServiceTariffRequest(
            base_price=Decimal("2000.00"),
            patient_copay=Decimal("800.00"),
        )
        updated = await update_hospital_service(service_id=srv_id, req=update_req, current_user=user, db=None)
        assert updated.base_price == Decimal("2000.00")
        assert updated.patient_copay == Decimal("800.00")

        # 4. Delete / Archive service
        del_res = await delete_hospital_service(service_id=srv_id, current_user=user, db=None)
        assert del_res["status"] == "archived"

    asyncio.run(_test())


def test_bulk_tariff_margin_adjustment():
    async def _test():
        user = MockUser()

        req = BulkTariffAdjustmentRequest(category="LABORATORY", percentage_change=Decimal("10.00"))
        data = await bulk_tariff_adjustment(req=req, current_user=user, db=None)
        assert data["status"] == "success"
        assert data["updated_services_count"] >= 2
        assert data["percentage_applied"] == 10.0

    asyncio.run(_test())


def test_corporate_insurance_accounts_and_statement_generation():
    async def _test():
        user = MockUser()

        # 1. List corporate accounts
        accounts = await list_corporate_accounts(account_type=None, current_user=user, db=None)
        assert len(accounts) >= 3
        acc_codes = [a.account_code for a in accounts]
        assert "HMO-ACACIA-GH" in acc_codes
        assert "HMO-ENTERPRISE-01" in acc_codes

        # 2. Create new corporate HMO account
        corp_code = f"HMO-GLICO-{uuid.uuid4().hex[:4].upper()}"
        create_req = CreateCorporateAccountRequest(
            account_name="Glico Healthcare Private HMO",
            account_code=corp_code,
            account_type="PRIVATE_INSURANCE_HMO",
            contact_person="Eunice Antwi (Pre-auth Desk)",
            contact_email="preauth@glicohealthcare.com",
            contact_phone="+233 30 221 8800",
            credit_limit=Decimal("120000.00"),
            payment_terms_days=30,
            discount_pct=Decimal("5.00"),
            status="ACTIVE",
        )
        created_acc = await create_corporate_account(req=create_req, current_user=user, db=None)
        assert created_acc.account_code == corp_code
        assert created_acc.credit_limit == Decimal("120000.00")

        # 3. Generate statement of account
        stmt_data = await generate_corporate_statement(account_id=created_acc.id, current_user=user, db=None)
        assert stmt_data.account_id == created_acc.id
        assert stmt_data.account_name == "Glico Healthcare Private HMO"
        assert "download.pdf" in stmt_data.download_url

    asyncio.run(_test())


def test_cashier_shift_reconciliation_and_discrepancy_audit():
    async def _test():
        user = MockUser()

        shifts = await list_cashier_shifts_audit(current_user=user, db=None)
        assert len(shifts) >= 2
        shift_ids = [s.shift_id for s in shifts]
        assert "SHF-2026-0821-MORN" in shift_ids
        assert "SHF-2026-0820-EVNG" in shift_ids

        morn_shift = next(s for s in shifts if s.shift_id == "SHF-2026-0821-MORN")
        assert morn_shift.discrepancy_type == "BALANCED"
        assert morn_shift.discrepancy_amount == Decimal("0.00")
        assert morn_shift.supervisor_signed_off is True

    asyncio.run(_test())
