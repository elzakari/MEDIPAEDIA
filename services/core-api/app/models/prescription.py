import enum
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PrescriptionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARTIALLY_DISPENSED = "PARTIALLY_DISPENSED"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class Prescription(BaseModel):
    __tablename__ = "prescriptions"

    prescription_number = Column(String(100), unique=True, index=True, nullable=False)

    consultation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("consultations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    patient_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Cryptographic Verification Hash (HMAC-SHA256)
    verification_hash = Column(String(255), unique=True, index=True, nullable=False)

    # 6-Character human readable access code (e.g. 7X9K2L)
    access_code = Column(String(20), unique=True, index=True, nullable=False)

    status = Column(
        Enum(PrescriptionStatus, name="prescription_status_enum"),
        default=PrescriptionStatus.PENDING,
        nullable=False,
        index=True,
    )

    notes = Column(Text, nullable=True)
    expires_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(days=30),
        nullable=False,
    )

    # Relationships
    consultation = relationship("Consultation", back_populates="prescription")
    patient_account = relationship("PatientAccount", back_populates="prescriptions")
    tenant = relationship("Tenant", back_populates="prescriptions")
    doctor = relationship("User", back_populates="prescriptions_authored", foreign_keys=[doctor_id])
    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
    )
    orders = relationship("Order", back_populates="prescription")


class PrescriptionItem(BaseModel):
    __tablename__ = "prescription_items"

    prescription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)  # e.g. "500mg"
    frequency = Column(String(100), nullable=False)  # e.g. "TDS (3 times daily)"
    duration_days = Column(Integer, nullable=False)  # e.g. 7
    instructions = Column(Text, nullable=True)  # e.g. "Take after meals"

    quantity_prescribed = Column(Integer, nullable=False)
    quantity_dispensed = Column(Integer, default=0, nullable=False)

    # Relationships
    prescription = relationship("Prescription", back_populates="items")
