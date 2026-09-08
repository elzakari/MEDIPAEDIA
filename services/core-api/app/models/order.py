import enum
from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

# Geographic Coordinates (supports PostGIS when available or Float lat/lng)
location_column = Column(Text, nullable=True)


class EscrowStatus(str, enum.Enum):
    HELD = "HELD"  # Funds securely locked in platform escrow
    RELEASED = "RELEASED"  # Released to pharmacy upon verified dispensation/delivery
    REFUNDED = "REFUNDED"  # Returned to patient on cancellation/unavailability


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class FulfillmentType(str, enum.Enum):
    PICKUP = "PICKUP"
    DELIVERY = "DELIVERY"


class Order(BaseModel):
    """
    Patient order with multi-party escrow protections.
    """
    __tablename__ = "orders"

    order_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    pharmacy_tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    prescription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    total_amount = Column(Numeric(12, 2), nullable=False)
    escrow_status = Column(
        Enum(EscrowStatus, name="escrow_status_enum"),
        default=EscrowStatus.HELD,
        nullable=False,
        index=True,
    )
    payment_status = Column(
        Enum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    paystack_reference = Column(String(100), unique=True, nullable=True)
    fulfillment_type = Column(
        Enum(FulfillmentType, name="fulfillment_type_enum"),
        default=FulfillmentType.PICKUP,
        nullable=False,
    )

    delivery_address = Column(Text, nullable=True)
    delivery_location = location_column
    delivery_latitude = Column(Float, nullable=True)
    delivery_longitude = Column(Float, nullable=True)
    dispatcher_notes = Column(Text, nullable=True)

    # Relationships
    patient_account = relationship("PatientAccount", back_populates="orders")
    pharmacy_tenant = relationship("Tenant", back_populates="orders")
    prescription = relationship("Prescription", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(BaseModel):
    __tablename__ = "order_items"

    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inventory_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pharmacy_inventories.id", ondelete="RESTRICT"),
        nullable=False,
    )

    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    inventory = relationship("PharmacyInventory", back_populates="order_items")
