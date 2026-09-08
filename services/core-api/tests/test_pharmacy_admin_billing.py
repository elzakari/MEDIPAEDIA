import asyncio
from decimal import Decimal
import uuid
import pytest

from app.schemas.pharmacy_admin_billing import (
    ApplyBatchPricingRequest,
    CreatePharmacyCorporateDebtorRequest,
    RecordDebtorPaymentRequest,
    RequestInstantPayoutRequest,
    UpdatePharmacyCorporateDebtorRequest,
    UpdatePharmacyGatewayConfigRequest,
    UpdatePharmacyPricingRulesRequest,
)
from app.api.v1.endpoints.pharmacy_admin import (
    get_pharmacy_gateway_config,
    update_pharmacy_gateway_config,
    test_pharmacy_payout_ping as api_test_pharmacy_payout_ping,
    request_instant_payout,
    get_pharmacy_pricing_rules,
    update_pharmacy_pricing_rules,
    apply_batch_pricing_rules,
    list_pharmacy_corporate_debtors,
    create_pharmacy_corporate_debtor,
    update_pharmacy_corporate_debtor,
    record_debtor_payment,
    generate_pharmacy_debtor_statement,
    list_pharmacy_shifts_audit,
)


class MockAdminUser:
    id = "usr-pharm-admin-01"
    email = "admin.osu@osupharmacy.health"
    full_name = "Pharmacy Administrator"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = type("Role", (), {"value": "PHARMACY_ADMIN"})()


def test_pharmacy_gateway_config_and_payout_ping():
    async def _test():
        admin = MockAdminUser()

        # 1. Fetch gateway config
        config = await get_pharmacy_gateway_config(admin=admin, db=None)
        assert config.facility_id == "pharm-osu-01"
        assert config.payout_network == "MTN_MOMO"
        assert config.is_verified is True
        assert config.escrow_available_balance > Decimal("0.00")

        # 2. Update gateway settings
        update_req = UpdatePharmacyGatewayConfigRequest(
            payout_network="TELECEL_CASH",
            payout_account_number="0201122334",
            payout_account_name="Osu Community Pharmacy Operations",
            auto_payout_schedule="WEEKLY",
            fee_bearer="PATIENT",
        )
        updated = await update_pharmacy_gateway_config(req=update_req, admin=admin, db=None)
        assert updated.payout_network == "TELECEL_CASH"
        assert updated.payout_account_number == "0201122334"
        assert updated.auto_payout_schedule == "WEEKLY"
        assert updated.fee_bearer == "PATIENT"

        # 3. Test payout ping
        ping_res = await api_test_pharmacy_payout_ping(admin=admin, db=None)
        assert ping_res.status == "SUCCESS"
        assert ping_res.latency_ms > 0
        assert ping_res.payout_network == "TELECEL_CASH"

    asyncio.run(_test())


def test_instant_payout_request_and_escrow_deduction():
    async def _test():
        admin = MockAdminUser()

        initial_config = await get_pharmacy_gateway_config(admin=admin, db=None)
        initial_balance = initial_config.escrow_available_balance
        payout_amt = Decimal("2500.00")

        payout_req = RequestInstantPayoutRequest(
            amount=payout_amt,
            notes="Midday merchant liquidity settlement",
        )
        payout_res = await request_instant_payout(req=payout_req, admin=admin, db=None)
        assert payout_res.status == "COMPLETED"
        assert payout_res.amount == payout_amt
        assert payout_res.remaining_escrow_balance == initial_balance - payout_amt
        assert "PAYOUT-MOMO-" in payout_res.tx_reference

    asyncio.run(_test())


def test_pharmacy_pricing_rules_and_batch_recalculation():
    async def _test():
        admin = MockAdminUser()

        # 1. Fetch pricing rules
        rules = await get_pharmacy_pricing_rules(admin=admin, db=None)
        assert rules.pom_markup_pct == Decimal("25.00")
        assert rules.otc_markup_pct == Decimal("35.00")
        assert rules.vat_tax_rate_pct == Decimal("15.00")

        # 2. Update pricing rules
        update_req = UpdatePharmacyPricingRulesRequest(
            pom_markup_pct=Decimal("28.00"),
            otc_markup_pct=Decimal("38.00"),
            vat_tax_rate_pct=Decimal("15.00"),
            max_cashier_discount_pct=Decimal("12.00"),
            rounding_mode="EXACT",
        )
        updated_rules = await update_pharmacy_pricing_rules(req=update_req, admin=admin, db=None)
        assert updated_rules.pom_markup_pct == Decimal("28.00")
        assert updated_rules.otc_markup_pct == Decimal("38.00")
        assert updated_rules.max_cashier_discount_pct == Decimal("12.00")
        assert updated_rules.rounding_mode == "EXACT"

        # 3. Apply pricing across batches
        apply_req = ApplyBatchPricingRequest(category="POM", round_prices=True)
        batch_res = await apply_batch_pricing_rules(req=apply_req, admin=admin, db=None)
        assert batch_res.status == "SUCCESS"
        assert batch_res.category_applied == "POM"
        assert batch_res.batches_updated_count > 0

    asyncio.run(_test())


def test_pharmacy_corporate_debtors_crud_and_repayment():
    async def _test():
        admin = MockAdminUser()

        # 1. List debtors
        debtors = await list_pharmacy_corporate_debtors(account_type=None, admin=admin, db=None)
        assert len(debtors) >= 3
        codes = [d.account_code for d in debtors]
        assert "HMO-ACACIA-PH" in codes
        assert "HMO-ENTERPRISE-PH" in codes

        # 2. Create new debtor
        new_code = f"HMO-GLICO-{uuid.uuid4().hex[:4].upper()}"
        create_req = CreatePharmacyCorporateDebtorRequest(
            company_name="Glico Healthcare HMO Desk",
            account_code=new_code,
            account_type="PRIVATE_HMO",
            contact_person="Eunice Mensah",
            contact_email="rx.preauth@glico.com",
            contact_phone="+233 30 222 3344",
            credit_limit=Decimal("75000.00"),
            payment_terms_days=30,
            discount_pct=Decimal("5.00"),
            status="ACTIVE",
        )
        created = await create_pharmacy_corporate_debtor(req=create_req, admin=admin, db=None)
        assert created.account_code == new_code
        assert created.credit_limit == Decimal("75000.00")
        assert created.current_outstanding_debt == Decimal("0.00")

        # 3. Update debtor
        update_req = UpdatePharmacyCorporateDebtorRequest(credit_limit=Decimal("90000.00"))
        updated_debtor = await update_pharmacy_corporate_debtor(debtor_id=created.id, req=update_req, admin=admin, db=None)
        assert updated_debtor.credit_limit == Decimal("90000.00")

        # 4. Record repayment
        repay_req = RecordDebtorPaymentRequest(
            amount_paid=Decimal("500.00"),
            payment_method="MOMO",
            reference_number="MOMO-TX-998877",
            notes="Opening credit clearance",
        )
        repay_res = await record_debtor_payment(debtor_id=created.id, req=repay_req, admin=admin, db=None)
        assert repay_res.status == "SUCCESS"
        assert repay_res.amount_paid == Decimal("500.00")
        assert "RCP-DEBT-" in repay_res.receipt_number

        # 5. Generate statement
        stmt_res = await generate_pharmacy_debtor_statement(debtor_id=created.id, admin=admin, db=None)
        assert stmt_res.debtor_id == created.id
        assert stmt_res.company_name == "Glico Healthcare HMO Desk"
        assert "statement.pdf" in stmt_res.download_url

    asyncio.run(_test())


def test_pharmacy_cashier_shifts_audit():
    async def _test():
        admin = MockAdminUser()

        shifts = await list_pharmacy_shifts_audit(admin=admin, db=None)
        assert len(shifts) >= 2
        shift_ids = [s.shift_id for s in shifts]
        assert "SHF-PHARM-20260821-MORN" in shift_ids
        assert "SHF-PHARM-20260820-EVNG" in shift_ids

        morn = next(s for s in shifts if s.shift_id == "SHF-PHARM-20260821-MORN")
        assert morn.discrepancy_status == "BALANCED"
        assert morn.cash_discrepancy_amount == Decimal("0.00")
        assert morn.supervisor_signed_off is True

    asyncio.run(_test())
