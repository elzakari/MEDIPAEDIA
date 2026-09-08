import asyncio
from decimal import Decimal
import pytest

from app.schemas.hospital_finance import (
    ClaimBatchCreateRequest,
    ClaimStatus,
    ClaimStatusUpdateRequest,
    CloseShiftRequest,
    InvoiceGenerateRequest,
    InvoicePaymentRequest,
    OpenShiftRequest,
    PaymentMethod,
    ShiftStatus,
)
from app.api.v1.endpoints.hospital_finance import (
    get_patient_pending_charges,
    generate_patient_invoice,
    pay_patient_invoice,
    open_cashier_shift,
    get_current_cashier_shift,
    close_cashier_shift,
    list_insurance_claims,
    create_claim_batch,
    get_hospital_revenue_analytics,
)


def test_auto_aggregation_and_invoice_split():
    """
    Test automated aggregation of unbilled clinical orders (consultation, lab, nursing)
    and patient invoice generation with NHIS tariff deduction.
    """
    async def _test():
        # 1. Fetch pending charges
        charges_resp = await get_patient_pending_charges(patient_id="default", current_user=None, db=None)
        assert charges_resp.total_gross_unbilled == Decimal("315.00")
        assert charges_resp.total_insurance_covered == Decimal("180.00")
        assert charges_resp.total_patient_payable == Decimal("135.00")
        assert len(charges_resp.charges) == 4

        # 2. Generate invoice
        inv_req = InvoiceGenerateRequest(
            patient_id="default",
            patient_name="Kwesi Mensah",
            selected_charge_ids=["chg-101", "chg-102", "chg-103", "chg-104"],
            cashier_name="Esi Boateng",
        )
        invoice = await generate_patient_invoice(inv_req, current_user=None, db=None)
        assert invoice.gross_amount == Decimal("315.00")
        assert invoice.insurance_covered_amount == Decimal("180.00")
        assert invoice.net_payable == Decimal("135.00")
        assert invoice.status == "UNPAID"

        # 3. Pay invoice with Cash Tender
        pay_req = InvoicePaymentRequest(
            invoice_id=invoice.invoice_id,
            payment_method=PaymentMethod.CASH,
            amount_tendered=Decimal("150.00"),
            cashier_name="Esi Boateng",
        )
        pay_res = await pay_patient_invoice(pay_req, current_user=None, db=None)
        assert pay_res.amount_paid == Decimal("135.00")
        assert pay_res.amount_tendered == Decimal("150.00")
        assert pay_res.change_due == Decimal("15.00")
        assert "RCP-2026-" in pay_res.receipt_number
        assert "RIDGE REGIONAL HOSPITAL" in pay_res.thermal_receipt_payload

    asyncio.run(_test())


def test_cashier_shift_balancing_and_reconciliation():
    """
    Test opening a cashier till shift, tracking expected cash, and closing with discrepancy calculation.
    """
    async def _test():
        # 1. Open shift with float GHS 500
        open_req = OpenShiftRequest(
            cashier_name="Esi Boateng",
            cashier_id="usr-finance-01",
            opening_float=Decimal("500.00"),
            workstation_id="TILL-01-TEST",
        )
        opened_shift = await open_cashier_shift(open_req, current_user=None, db=None)
        assert opened_shift.status == ShiftStatus.OPEN
        assert opened_shift.opening_float == Decimal("500.00")
        assert opened_shift.expected_drawer_cash == Decimal("500.00")

        # 2. Close shift with declared cash GHS 500 (Balanced)
        close_req = CloseShiftRequest(
            declared_cash_count=Decimal("500.00"),
            closing_notes="Perfect balance test",
        )
        close_res = await close_cashier_shift(close_req, workstation_id="TILL-01-TEST", current_user=None, db=None)
        assert close_res.status == "BALANCED"
        assert close_res.discrepancy == Decimal("0.00")
        assert close_res.declared_cash == Decimal("500.00")

    asyncio.run(_test())


def test_insurance_claims_batching_and_analytics():
    """
    Test NHIS insurance claims listing, batch aggregation, and departmental revenue analytics.
    """
    async def _test():
        # 1. List claims
        claims = await list_insurance_claims(claim_status=None, current_user=None, db=None)
        assert len(claims) >= 3

        # 2. Create batch
        batch_req = ClaimBatchCreateRequest(
            provider_name="NHIS National Health Insurance",
            claim_ids=["clm-901", "clm-902"],
        )
        batch_res = await create_claim_batch(batch_req, current_user=None, db=None)
        assert "NHIS-BATCH-" in batch_res.batch_id
        assert batch_res.total_claims == 2
        assert batch_res.status == "SUBMITTED_TO_PAYER"

        # 3. Revenue analytics
        analytics = await get_hospital_revenue_analytics(period="AUGUST_2026", current_user=None, db=None)
        assert analytics.total_gross_revenue == Decimal("184500.00")
        assert len(analytics.department_breakdown) >= 4
        assert len(analytics.channel_breakdown) >= 4

    asyncio.run(_test())
