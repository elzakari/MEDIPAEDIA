from datetime import datetime, timezone
from decimal import Decimal
import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BranchType(str, enum.Enum):
    MAIN_HUB = "MAIN_HUB"
    CLINIC = "CLINIC"
    DISPENSARY = "DISPENSARY"
    OUTLET = "OUTLET"
    WAREHOUSE = "WAREHOUSE"


class IBTStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class FacilityBranch(BaseModel):
    """
    Facility branch or satellite clinic/dispensary under a tenant organisation.
    """
    __tablename__ = "facility_branches"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    branch_type = Column(
        Enum(BranchType, name="branch_type_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=BranchType.CLINIC,
        nullable=False,
    )
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    is_main_hub = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="branches")
    transfers_sent = relationship(
        "InterBranchTransfer",
        foreign_keys="[InterBranchTransfer.source_branch_id]",
        back_populates="source_branch",
        cascade="all, delete-orphan",
    )
    transfers_received = relationship(
        "InterBranchTransfer",
        foreign_keys="[InterBranchTransfer.destination_branch_id]",
        back_populates="destination_branch",
    )


class InterBranchTransfer(BaseModel):
    """
    Inter-Branch Stock Transfer (IBT) ledger tracking stock movement between branches.
    """
    __tablename__ = "inter_branch_transfers"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transfer_number = Column(String(100), unique=True, index=True, nullable=False)
    source_branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facility_branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facility_branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(IBTStatus, name="ibt_status_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=IBTStatus.DISPATCHED,
        nullable=False,
        index=True,
    )
    dispatched_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    received_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    dispatched_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    received_at = Column(DateTime(timezone=True), nullable=True)
    driver_courier_name = Column(String(255), nullable=True)
    driver_courier_phone = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="ibt_transfers")
    source_branch = relationship(
        "FacilityBranch",
        foreign_keys=[source_branch_id],
        back_populates="transfers_sent",
    )
    destination_branch = relationship(
        "FacilityBranch",
        foreign_keys=[destination_branch_id],
        back_populates="transfers_received",
    )
    dispatched_by = relationship("User", foreign_keys=[dispatched_by_user_id])
    received_by = relationship("User", foreign_keys=[received_by_user_id])
    items = relationship(
        "InterBranchTransferItem",
        back_populates="transfer",
        cascade="all, delete-orphan",
    )


class InterBranchTransferItem(BaseModel):
    """
    Individual stock line items in an Inter-Branch Transfer.
    """
    __tablename__ = "inter_branch_transfer_items"

    transfer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inter_branch_transfers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    global_medication_id = Column(
        UUID(as_uuid=True),
        ForeignKey("global_medications.id", ondelete="SET NULL"),
        nullable=True,
    )
    medication_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True)
    batch_number = Column(String(100), nullable=False)
    expiry_date = Column(String(50), nullable=True)
    quantity_dispatched = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    transfer = relationship("InterBranchTransfer", back_populates="items")
    medication = relationship("GlobalMedication")
