from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.models.base import BaseModel


class AuditLog(BaseModel):
    """
    Immutable regulatory and clinical audit ledger.
    """
    __tablename__ = "audit_logs"

    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_role = Column(String(50), nullable=True)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action = Column(String(100), nullable=False, index=True)  # e.g. PRESCRIPTION_DISPENSED, VITALS_RECORDED
    resource_type = Column(String(100), nullable=False, index=True)  # e.g. Prescription, Consultation, Order
    resource_id = Column(String(255), nullable=False, index=True)

    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)

    # JSON representation of before & after state or snapshot diff
    changes_json = Column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_audit_logs_action_resource", "action", "resource_type"),
    )
