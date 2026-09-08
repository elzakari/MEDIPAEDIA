from __future__ import annotations

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class HospitalIntakeTrack(str, enum.Enum):
    STANDARD = "STANDARD"
    CORPORATE_INSURANCE = "CORPORATE_INSURANCE"
    EMERGENCY = "EMERGENCY"


class HospitalBillingStatus(str, enum.Enum):
    PENDING_REGISTRATION_PAYMENT = "PENDING_REGISTRATION_PAYMENT"
    BILL_TO_PAYER = "BILL_TO_PAYER"
    PAID = "PAID"
    DEFERRED_EMERGENCY = "DEFERRED_EMERGENCY"


class HospitalTriageStatus(str, enum.Enum):
    NOT_QUEUED = "NOT_QUEUED"
    QUEUED_FOR_TRIAGE = "QUEUED_FOR_TRIAGE"
    IN_TRIAGE = "IN_TRIAGE"
    AWAITING_DOCTOR = "AWAITING_DOCTOR"
    DISCHARGED = "DISCHARGED"


class PatientAccount(BaseModel):
    __tablename__ = "patient_accounts"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    ghana_card_id = Column(String(50), unique=True, index=True, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    nhis_number = Column(String(50), index=True, nullable=True)
    nhis_status = Column(String(50), default="ACTIVE", nullable=True)
    is_trauma_temporary = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="patient_profile")
    hospital_cards = relationship(
        "HospitalPatientCard",
        back_populates="patient_account",
        cascade="all, delete-orphan",
    )
    prescriptions = relationship("Prescription", back_populates="patient_account")
    orders = relationship("Order", back_populates="patient_account")
    vitals = relationship("Vitals", back_populates="patient_account")


class HospitalPatientCard(BaseModel):
    """
    Facility-specific electronic hospital folder/card.
    Binds the global patient to a specific hospital with its unique MRN.
    """
    __tablename__ = "hospital_patient_cards"

    patient_account_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    card_number = Column(String(40), nullable=True, unique=True, index=True)
    mrn = Column(String(100), nullable=False, index=True)
    qr_token = Column(String(255), unique=True, nullable=False, index=True)
    registration_fee_paid = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    intake_type = Column(
        SAEnum(HospitalIntakeTrack, name="opd_intake_track_enum"),
        nullable=False,
        default=HospitalIntakeTrack.STANDARD,
        server_default="STANDARD",
        index=True,
    )
    billing_status = Column(
        SAEnum(HospitalBillingStatus, name="opd_billing_status_enum"),
        nullable=False,
        default=HospitalBillingStatus.PENDING_REGISTRATION_PAYMENT,
        server_default="PENDING_REGISTRATION_PAYMENT",
        index=True,
    )
    emergency_deferred = Column(Boolean, default=False, nullable=False)
    triage_status = Column(
        SAEnum(HospitalTriageStatus, name="opd_triage_status_enum"),
        nullable=False,
        default=HospitalTriageStatus.NOT_QUEUED,
        server_default="NOT_QUEUED",
        index=True,
    )
    queued_at = Column(DateTime(timezone=True), nullable=True)
    physical_folder_rack = Column(String(50), default="Rack-A1", nullable=True)
    physical_folder_shelf = Column(String(50), default="Shelf-01", nullable=True)
    folder_status = Column(String(50), default="IN_ARCHIVE", nullable=True)

    patient_account = relationship("PatientAccount", back_populates="hospital_cards")
    tenant = relationship("Tenant", back_populates="patient_cards")
    consultations = relationship(
        "Consultation", back_populates="hospital_card", cascade="all, delete-orphan"
    )
    folder_transits = relationship(
        "PhysicalFolderTransit", back_populates="hospital_card", cascade="all, delete-orphan"
    )





class PhysicalFolderTransit(BaseModel):
    """
    Physical paper folder check-out and transit ledger.
    Tracks folder movement from records archive rack/shelf to doctor consultation rooms / wards.
    """
    __tablename__ = "physical_folder_transits"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hospital_card_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospital_patient_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_department = Column(String(100), nullable=False)  # e.g. "Consulting Room 2"
    checked_out_to_doctor_name = Column(String(255), nullable=True)
    status = Column(String(50), default="CHECKED_OUT", nullable=False)  # CHECKED_OUT, RETURNED, OVERDUE
    notes = Column(Text, nullable=True)
    returned_at = Column(Date, nullable=True)

    # Relationships
    hospital_card = relationship("HospitalPatientCard", back_populates="folder_transits")


class PhysicalFolderLocation(BaseModel):
    """
    Detailed physical shelf, rack, and box mapping for physical medical records archival.
    """
    __tablename__ = "physical_folder_locations"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hospital_card_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospital_patient_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rack_number = Column(String(50), default="Rack-A1", nullable=False)
    shelf_row = Column(String(50), default="Shelf-01", nullable=False)
    file_box_code = Column(String(50), default="BOX-2026-01", nullable=True)
    current_holder_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="IN_ARCHIVE", nullable=False)  # IN_ARCHIVE, WITH_DOCTOR, IN_WARD, IN_TRANSIT


class MedicationDoseLog(BaseModel):
    """
    Interactive patient daily pill box medication adherence dose tracking log.
    """
    __tablename__ = "medication_dose_logs"

    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prescription_item_id = Column(UUID(as_uuid=True), nullable=True)
    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), default="1 tablet", nullable=False)
    time_of_day = Column(String(50), default="MORNING", nullable=False)  # MORNING, AFTERNOON, EVENING, NIGHT
    scheduled_time = Column(String(50), nullable=False)
    taken_time = Column(String(50), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # TAKEN, MISSED, SKIPPED, PENDING
    adherence_score = Column(String(20), default="100%", nullable=True)


class TelehealthSession(BaseModel):
    """
    Encrypted WebRTC Telehealth consultation session with room tokens.
    """
    __tablename__ = "telehealth_sessions"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    appointment_id = Column(UUID(as_uuid=True), nullable=True)
    doctor_name = Column(String(255), nullable=False)
    specialty = Column(String(100), default="General Medicine", nullable=False)
    scheduled_start = Column(String(100), nullable=False)
    duration_minutes = Column(String(20), default="30", nullable=False)
    room_token = Column(String(255), nullable=False)
    session_status = Column(String(50), default="SCHEDULED", nullable=False)  # SCHEDULED, ACTIVE, COMPLETED, CANCELLED


