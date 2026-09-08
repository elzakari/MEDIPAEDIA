from datetime import datetime, timezone
from decimal import Decimal
import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TransactionType(str, enum.Enum):
    ESCROW_HOLD = "ESCROW_HOLD"          # Inbound charge locked in escrow
    ESCROW_RELEASE = "ESCROW_RELEASE"    # Order delivered/collected, released to pharmacy
    COMMISSION_FEE = "COMMISSION_FEE"    # 5% platform commission deducted
    PAYOUT_TRANSFER = "PAYOUT_TRANSFER"  # Bank/MoMo settlement paid out to pharmacy
    REFUND = "REFUND"                    # Returned to patient on cancellation


class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REVERSED = "REVERSED"


class PharmacyBalanceLedger(BaseModel):
    """
    Real-time balance ledger per pharmacy tenant.
    """
    __tablename__ = "pharmacy_balance_ledgers"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    pending_escrow_balance = Column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    available_balance = Column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    lifetime_earnings = Column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    currency = Column(String(10), default="GHS", nullable=False)

    # Paystack Transfer Recipient Details
    paystack_recipient_code = Column(String(100), nullable=True)
    recipient_account_name = Column(String(255), nullable=True)
    recipient_account_number = Column(String(50), nullable=True)
    recipient_bank_code = Column(String(50), nullable=True)  # e.g., "MTN", "VOD", "GCB"
    is_payout_configured = Column(Boolean, default=False, nullable=False)

    # Relationships
    tenant = relationship("Tenant")


class SettlementPayout(BaseModel):
    """
    Individual or batch payout disbursed to a pharmacy's Mobile Money or bank account.
    """
    __tablename__ = "settlement_payouts"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payout_reference = Column(String(100), unique=True, index=True, nullable=False)
    transfer_code = Column(String(100), unique=True, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    fee_deducted = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    currency = Column(String(10), default="GHS", nullable=False)

    status = Column(
        Enum(PayoutStatus, name="payout_status_enum"),
        default=PayoutStatus.PENDING,
        nullable=False,
        index=True,
    )

    recipient_name = Column(String(255), nullable=False)
    recipient_phone = Column(String(50), nullable=True)
    bank_or_momo_network = Column(String(50), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant = relationship("Tenant")


class PlatformTransaction(BaseModel):
    """
    Double-entry platform transaction audit log.
    """
    __tablename__ = "platform_transactions"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_reference = Column(
        String(100), unique=True, index=True, nullable=False
    )
    transaction_type = Column(
        Enum(TransactionType, name="transaction_type_enum"),
        nullable=False,
        index=True,
    )

    gross_amount = Column(Numeric(12, 2), nullable=False)
    fee_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="GHS", nullable=False)

    paystack_reference = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Relationships
    tenant = relationship("Tenant")
    order = relationship("Order")
