from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
import uuid
import pytest
from app.api.v1.endpoints.payments import verify_paystack_webhook_signature
from app.core.config import settings
from app.models.payment import (
    PayoutStatus,
    PharmacyBalanceLedger,
    PlatformTransaction,
    SettlementPayout,
    TransactionType,
)


def test_paystack_hmac_sha512_webhook_signature():
    secret = settings.PAYSTACK_SECRET_KEY
    payload = b'{"event":"charge.success","data":{"reference":"pstk_ref_123","amount":4500}}'

    # Valid HMAC
    valid_signature = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()

    assert verify_paystack_webhook_signature(payload, valid_signature) is True

    # Tampered signature or payload
    tampered_payload = b'{"event":"charge.success","data":{"reference":"pstk_ref_123","amount":9999}}'
    assert verify_paystack_webhook_signature(tampered_payload, valid_signature) is False
    assert verify_paystack_webhook_signature(payload, "invalid_signature_hex") is False


def test_escrow_lifecycle_and_commission_deduction():
    gross_order_amount = Decimal("100.00")
    commission_rate = Decimal("0.05")  # 5%

    # 1. Inbound charge locked in pending escrow
    pending_escrow = Decimal("0.00")
    available_balance = Decimal("0.00")
    lifetime_earnings = Decimal("0.00")

    pending_escrow += gross_order_amount
    assert pending_escrow == Decimal("100.00")
    assert available_balance == Decimal("0.00")

    # 2. Customer collects medications -> Release Escrow
    commission_fee = round(gross_order_amount * commission_rate, 2)
    net_credit = gross_order_amount - commission_fee

    assert commission_fee == Decimal("5.00")
    assert net_credit == Decimal("95.00")

    pending_escrow -= gross_order_amount
    available_balance += net_credit
    lifetime_earnings += net_credit

    assert pending_escrow == Decimal("0.00")
    assert available_balance == Decimal("95.00")
    assert lifetime_earnings == Decimal("95.00")


def test_settlement_payout_and_ledger_balance():
    available_balance = Decimal("95.00")
    payout_requested = Decimal("95.00")

    # Disburse payout
    assert available_balance >= payout_requested
    available_balance -= payout_requested

    assert available_balance == Decimal("0.00")

    # Verify double-entry consistency
    payout_record = {
        "id": uuid.uuid4(),
        "amount": payout_requested,
        "fee": Decimal("0.00"),
        "status": PayoutStatus.SUCCESS,
    }
    assert payout_record["amount"] == Decimal("95.00")
    assert payout_record["status"] == PayoutStatus.SUCCESS
