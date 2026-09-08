import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
import uuid
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.payment_orchestrator import (
    GatewayType,
    MoMoNetwork,
    PaymentOrchestrator,
    payment_orchestrator,
)
from app.schemas.admin import (
    CreateSubscriptionPlanRequest,
    RecurringCollectionRequest,
    SubscriptionPlanTier,
)
from app.api.v1.endpoints.admin import (
    get_subscription_plans,
    create_or_update_subscription_plan,
    get_tenant_subscriptions_matrix,
    collect_recurring_subscriptions,
    toggle_tenant_lockout,
)


def test_gateway_routing_ghs_vs_xof():
    """
    Verifies that the payment orchestrator dynamically resolves the correct West African gateway:
    - Ghana GHS -> PAYSTACK
    - Togo XOF -> FEDAPAY
    - Benin XOF -> FEDAPAY
    """
    assert PaymentOrchestrator.resolve_gateway("GH", "GHS") == GatewayType.PAYSTACK
    assert PaymentOrchestrator.resolve_gateway("GH", "ghs") == GatewayType.PAYSTACK
    assert PaymentOrchestrator.resolve_gateway("TG", "XOF") == GatewayType.FEDAPAY
    assert PaymentOrchestrator.resolve_gateway("BJ", "XOF") == GatewayType.FEDAPAY
    assert PaymentOrchestrator.resolve_gateway("CI", "XOF") == GatewayType.FEDAPAY


def test_initiate_momo_charge_ghs_paystack():
    """
    Tests initiation of Ghana GHS Mobile Money push charge via Paystack.
    """
    result = payment_orchestrator.initiate_momo_charge(
        country="GH",
        currency="GHS",
        amount=Decimal("135.00"),
        phone="0244123456",
        network="mtn",
        customer_name="Kwesi Mensah",
        description="OPD Consultation & Medication",
    )

    assert result.gateway == "PAYSTACK"
    assert result.currency == "GHS"
    assert result.amount == Decimal("135.00")
    assert result.transaction_reference.startswith("PAY-GH-")
    assert "*170#" in result.ussd_prompt_instruction
    assert "0244123456" in result.ussd_prompt_instruction
    assert "MEDIPAEDIA-TX:PAY-GH-" in result.qr_verification_payload


def test_initiate_momo_charge_xof_fedapay():
    """
    Tests initiation of Togo & Benin XOF Mobile Money charge via FedaPay.
    """
    # Togo T-Money
    togo_result = payment_orchestrator.initiate_momo_charge(
        country="TG",
        currency="XOF",
        amount=Decimal("25000.00"),
        phone="+228 90 12 34 56",
        network="tmoney",
        customer_name="Clinique Sainte-Famille",
        description="SaaS Subscription Starter",
    )

    assert togo_result.gateway == "FEDAPAY"
    assert togo_result.currency == "XOF"
    assert togo_result.amount == Decimal("25000.00")
    assert togo_result.transaction_reference.startswith("FEDA-XOF-TG-")
    assert "*145#" in togo_result.ussd_prompt_instruction

    # Benin MTN MoMo
    benin_result = payment_orchestrator.initiate_momo_charge(
        country="BJ",
        currency="XOF",
        amount=Decimal("75000.00"),
        phone="+229 97 00 11 22",
        network="mtn_bj",
        customer_name="Pharmacie Principale Cotonou",
        description="SaaS Growth Plan",
    )

    assert benin_result.gateway == "FEDAPAY"
    assert benin_result.currency == "XOF"
    assert benin_result.transaction_reference.startswith("FEDA-XOF-BJ-")
    assert "*880#" in benin_result.ussd_prompt_instruction


def test_webhook_cryptographic_signature_validation():
    """
    Tests HMAC-SHA512 signature verification for Paystack and FedaPay webhooks.
    """
    payload = b'{"event":"charge.success","data":{"reference":"PAY-GH-TEST","amount":10000}}'

    # Valid Paystack Signature
    valid_paystack_sig = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()

    assert payment_orchestrator.verify_webhook_signature("PAYSTACK", payload, valid_paystack_sig) is True
    assert payment_orchestrator.verify_webhook_signature("PAYSTACK", payload, "invalid_sig_12345") is False

    # Valid FedaPay Signature
    valid_fedapay_sig = hmac.new(
        settings.FEDAPAY_SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()

    assert payment_orchestrator.verify_webhook_signature("FEDAPAY", payload, valid_fedapay_sig) is True
    assert payment_orchestrator.verify_webhook_signature("FEDAPAY", payload, "invalid_feda_sig") is False

    # Sandbox bypass
    assert payment_orchestrator.verify_webhook_signature("PAYSTACK", payload, "sandbox_bypass") is True


def test_merchant_payout_and_sweeps():
    """
    Tests merchant payout and mobile money sweep disbursement calculations.
    """
    tenant_id = uuid.uuid4()

    # Ghana Payout (1% fee capped at 10 GHS)
    payout_ghs = payment_orchestrator.execute_merchant_payout(
        tenant_id=tenant_id,
        amount=Decimal("4500.00"),
        currency="GHS",
        recipient_phone="+233 24 412 3456",
        network="mtn",
        country="GH",
        recipient_name="Osu Community Pharmacy",
    )

    assert payout_ghs.gateway == "PAYSTACK"
    assert payout_ghs.currency == "GHS"
    assert payout_ghs.amount == Decimal("4500.00")
    assert payout_ghs.fee_deducted == Decimal("10.00")
    assert payout_ghs.net_payout == Decimal("4490.00")
    assert payout_ghs.status == "PROCESSED_SUCCESS"

    # Togo XOF Payout
    payout_xof = payment_orchestrator.execute_merchant_payout(
        tenant_id=tenant_id,
        amount=Decimal("200000.00"),
        currency="XOF",
        recipient_phone="+228 90 12 34 56",
        network="tmoney",
        country="TG",
        recipient_name="Clinique Sainte-Famille",
    )

    assert payout_xof.gateway == "FEDAPAY"
    assert payout_xof.currency == "XOF"
    assert payout_xof.fee_deducted == Decimal("1000.00")
    assert payout_xof.net_payout == Decimal("199000.00")


def test_saas_subscription_plans_dual_pricing():
    """
    Verifies subscription plans offer dual pricing in GHS and XOF with feature gates.
    """
    async def _test():
        plans = await get_subscription_plans(db=None)
        assert len(plans) >= 3

        starter = next(p for p in plans if p.code == "PLAN-STARTER")
        growth = next(p for p in plans if p.code == "PLAN-GROWTH")
        enterprise = next(p for p in plans if p.code == "PLAN-ENTERPRISE")

        # Starter Dual Pricing
        assert starter.price_ghs_monthly == Decimal("500.00")
        assert starter.price_xof_monthly == Decimal("25000.00")

        # Growth Dual Pricing & Features
        assert growth.price_ghs_monthly == Decimal("1500.00")
        assert growth.price_xof_monthly == Decimal("75000.00")
        assert growth.includes_cpoe is True

        # Enterprise Dual Pricing & Features
        assert enterprise.price_ghs_monthly == Decimal("4000.00")
        assert enterprise.price_xof_monthly == Decimal("200000.00")
        assert enterprise.includes_telemetry is True

    asyncio.run(_test())


def test_tenant_subscription_matrix_and_dunning_lockout():
    """
    Verifies the tenant subscription matrix, automated recurring collections,
    and dunning lockout rule (>7 days overdue -> RESTRICTED_LOCKED).
    """
    async def _test():
        matrix = await get_tenant_subscriptions_matrix(status_filter=None, country_filter=None, db=None)
        assert len(matrix) >= 5

        # Check that delinquent tenant (>7 days) is locked
        delinquent = next((t for t in matrix if t.days_overdue > 7), None)
        assert delinquent is not None
        assert delinquent.is_locked is True
        assert delinquent.status == "RESTRICTED_LOCKED"

        # Test lockout toggle endpoint
        unlock_res = await toggle_tenant_lockout(tenant_id=delinquent.tenant_id, lock=False, db=None)
        assert unlock_res["is_locked"] is False
        assert unlock_res["status"] == "ACTIVE"

        # Relock
        lock_res = await toggle_tenant_lockout(tenant_id=delinquent.tenant_id, lock=True, db=None)
        assert lock_res["is_locked"] is True
        assert lock_res["status"] == "RESTRICTED_LOCKED"

        # Test Recurring Collection Batch
        batch_res = await collect_recurring_subscriptions(
            req=RecurringCollectionRequest(dry_run=False),
            db=None,
        )
        assert batch_res.total_tenants_processed >= 5
        assert batch_res.total_collected_ghs > Decimal("0.00")
        assert batch_res.total_collected_xof > Decimal("0.00")

    asyncio.run(_test())
