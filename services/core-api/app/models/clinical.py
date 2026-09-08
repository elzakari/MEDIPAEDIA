import enum
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ICD10Code(BaseModel):
    """
    Statutory WHO / Ghana Ministry of Health ICD-10 Diagnostic Master Registry.
    """
    __tablename__ = "icd10_codes"

    code = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(150), nullable=False)
    is_common_tropical = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class NHISGDRGTariff(BaseModel):
    """
    Statutory Ghana National Health Insurance Authority (NHIA) G-DRG Tariff Catalog.
    """
    __tablename__ = "nhis_gdrg_tariffs"

    gdrg_code = Column(String(50), unique=True, index=True, nullable=False)
    service_name = Column(String(255), index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)  # CONSULTATION, LABORATORY, RADIOLOGY, SURGERY, DELIVERY, WARD_ACCOMMODATION, PROCEDURE
    standard_tariff_ghs = Column(Numeric(10, 2), nullable=False)
    nhis_covered_amount_ghs = Column(Numeric(10, 2), nullable=False)
    patient_copay_ghs = Column(Numeric(10, 2), default=0.00, nullable=False)
    preauth_required = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)




class ConsultationStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REFERRED = "REFERRED"
    CANCELLED = "CANCELLED"


class OpdQueueStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    TRIAGE = "TRIAGE"
    WITH_DOCTOR = "WITH_DOCTOR"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TriagePriority(str, enum.Enum):
    ROUTINE = "ROUTINE"
    PRIORITY = "PRIORITY"
    EMERGENCY = "EMERGENCY"


class OpdQueueEntry(BaseModel):
    __tablename__ = "opd_queue_entries"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hospital_card_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospital_patient_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    queue_number = Column(String(50), nullable=False)
    status = Column(
        Enum(OpdQueueStatus, name="opd_queue_status_enum"),
        default=OpdQueueStatus.QUEUED,
        nullable=False,
        index=True,
    )
    priority = Column(
        Enum(TriagePriority, name="triage_priority_enum"),
        default=TriagePriority.ROUTINE,
        nullable=False,
    )

    checked_in_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    destination_clinic = Column(String(50), default="GENERAL_OPD", nullable=False)
    consulting_room = Column(String(100), nullable=True)
    fee_waiver_badge = Column(String(50), default="WAIVED", nullable=True)
    triaged_at = Column(DateTime(timezone=True), nullable=True)
    called_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient_account = relationship("PatientAccount")
    hospital_card = relationship("HospitalPatientCard")


class Consultation(BaseModel):
    __tablename__ = "consultations"

    hospital_card_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospital_patient_cards.id", ondelete="CASCADE"),
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

    chief_complaint = Column(Text, nullable=False)
    history_of_present_illness = Column(Text, nullable=True)
    examination_findings = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)

    # Structured SOAP Notes
    subjective_note = Column(Text, nullable=True)
    objective_note = Column(Text, nullable=True)
    assessment_note = Column(Text, nullable=True)
    plan_note = Column(Text, nullable=True)

    # ICD-10 Coding
    icd10_diagnosis_code = Column(String(20), nullable=True, index=True)
    diagnosis_description = Column(String(255), nullable=True)

    consultation_status = Column(
        Enum(ConsultationStatus, name="consultation_status_enum"),
        default=ConsultationStatus.IN_PROGRESS,
        nullable=False,
    )

    # Relationships
    hospital_card = relationship("HospitalPatientCard", back_populates="consultations")
    tenant = relationship("Tenant", back_populates="consultations")
    doctor = relationship(
        "User", back_populates="consultations", foreign_keys=[doctor_id]
    )
    vitals = relationship("Vitals", back_populates="consultation", uselist=False)
    prescription = relationship(
        "Prescription", back_populates="consultation", uselist=False
    )


class Vitals(BaseModel):
    __tablename__ = "vitals"

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
    recorded_by_nurse_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    temperature = Column(Float, nullable=True)  # in Celsius, e.g. 37.2
    systolic_bp = Column(Integer, nullable=True)  # mmHg, e.g. 120
    diastolic_bp = Column(Integer, nullable=True)  # mmHg, e.g. 80
    heart_rate = Column(Integer, nullable=True)  # bpm, e.g. 72
    respiratory_rate = Column(Integer, nullable=True)  # breaths/min, e.g. 16
    spo2 = Column(Float, nullable=True)  # Oxygen saturation %, e.g. 98.5
    weight_kg = Column(Float, nullable=True)  # kg, e.g. 70.5
    height_cm = Column(Float, nullable=True)  # cm, e.g. 175.0
    bmi = Column(Float, nullable=True)  # calculated BMI

    # Modified Early Warning Score (MEWS)
    mews_score = Column(Integer, nullable=True, default=0)
    mews_severity = Column(String(50), nullable=True, default="NORMAL")  # "NORMAL", "WARNING", "CRITICAL"

    # Relationships
    consultation = relationship("Consultation", back_populates="vitals")
    patient_account = relationship("PatientAccount", back_populates="vitals")
    recorded_by_nurse = relationship(
        "User",
        back_populates="vitals_recorded",
        foreign_keys=[recorded_by_nurse_id],
    )


class ClinicalMacro(BaseModel):
    __tablename__ = "clinical_macros"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    macro_name = Column(String(150), nullable=False, index=True)
    specialty = Column(String(100), default="GENERAL_PRACTICE", nullable=False)
    icd10_code = Column(String(20), nullable=False, index=True)
    diagnosis_title = Column(String(255), nullable=False)
    default_soap_template = Column(Text, nullable=False)  # JSON string or formatted text
    default_prescription_items = Column(Text, nullable=False)  # JSON string of default meds
    default_lab_orders = Column(Text, nullable=True)  # JSON string of default labs
    is_active = Column(Integer, default=1, nullable=False)


class StatNursingOrderUrgency(str, enum.Enum):
    STAT = "STAT"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


class StatNursingOrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"


class StatNursingOrder(BaseModel):
    __tablename__ = "stat_nursing_orders"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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
    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    instruction = Column(Text, nullable=False)
    urgency = Column(
        Enum(StatNursingOrderUrgency, name="stat_order_urgency_enum"),
        default=StatNursingOrderUrgency.STAT,
        nullable=False,
    )
    status = Column(
        Enum(StatNursingOrderStatus, name="stat_order_status_enum"),
        default=StatNursingOrderStatus.PENDING,
        nullable=False,
        index=True,
    )
    executed_by_nurse_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    executed_at = Column(DateTime(timezone=True), nullable=True)
    execution_notes = Column(Text, nullable=True)

