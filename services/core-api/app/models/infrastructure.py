from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class DLQStatus(str, enum.Enum):
    PENDING = "PENDING"
    REPLAYED = "REPLAYED"
    DISCARDED = "DISCARDED"


class GatewayHealthStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    DOWN = "DOWN"


class AuditCheckType(str, enum.Enum):
    ISOLATION = "ISOLATION"
    INTEGRITY = "INTEGRITY"
    LEDGER = "LEDGER"


class AuditStatus(str, enum.Enum):
    PASSED = "PASSED"
    WARNING = "WARNING"
    FAILED = "FAILED"


class WebhookDeadLetter(BaseModel):
    """
    Webhook Dead-Letter Queue (DLQ) for failed or unroutable webhook events
    with idempotent replay capability.
    """
    __tablename__ = "webhook_dead_letters"

    gateway_provider = Column(String(50), nullable=False, index=True)  # PAYSTACK, FEDAPAY, HUB2
    event_type = Column(String(100), nullable=False, index=True)        # charge.success, transaction.approved, etc.
    payload = Column(JSON, nullable=False)
    headers = Column(JSON, nullable=True)
    error_reason = Column(Text, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    status = Column(
        Enum(DLQStatus, native_enum=False, create_type=False),
        default=DLQStatus.PENDING,
        nullable=False,
        index=True,
    )
    received_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_retry_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


class GatewayHealthLog(BaseModel):
    """
    Periodic telemetry log of payment gateway response latency and availability.
    """
    __tablename__ = "gateway_health_logs"

    provider = Column(String(50), nullable=False, index=True)  # PAYSTACK, FEDAPAY, HUB2
    latency_ms = Column(Float, nullable=False)
    status = Column(
        Enum(GatewayHealthStatus, native_enum=False, create_type=False),
        default=GatewayHealthStatus.HEALTHY,
        nullable=False,
    )
    error_rate_percent = Column(Float, default=0.0, nullable=False)
    checked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class TenantHealthAudit(BaseModel):
    """
    Tenant isolation, foreign key referential integrity, and balance ledger audit records.
    """
    __tablename__ = "tenant_health_audits"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    check_type = Column(
        Enum(AuditCheckType, native_enum=False, create_type=False),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(AuditStatus, native_enum=False, create_type=False),
        default=AuditStatus.PASSED,
        nullable=False,
    )
    details = Column(JSON, nullable=False, default=dict)
    audited_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
