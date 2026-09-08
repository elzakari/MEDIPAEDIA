from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# 1. EMERGENCY ICE & PUBLIC HEALTH PASSPORT
# ============================================================================
class EmergencyICEProfile(BaseModel):
    blood_group: str = "O+"
    genotype: str = "AA"
    allergies: List[str] = ["Amoxicillin / Penicillins", "Peanuts"]
    chronic_conditions: List[str] = ["Mild Intermittent Asthma"]
    current_medications: List[str] = ["Salbutamol Inhaler 100mcg PRN"]
    emergency_contact_name: str = "Kofi Mensah"
    emergency_contact_phone: str = "0244998877"
    emergency_contact_relationship: str = "Brother"
    organ_donor: bool = True
    ice_token: str = "ICE-RDG-2026-99120"
    qr_data_uri: str = "https://medipaedia.health/ice/ICE-RDG-2026-99120"


class EmergencyICEUpdateRequest(BaseModel):
    blood_group: str
    genotype: str
    allergies: List[str]
    chronic_conditions: List[str]
    emergency_contact_name: str
    emergency_contact_phone: str
    emergency_contact_relationship: str
    organ_donor: Optional[bool] = True


class PublicICEResponse(BaseModel):
    full_name: str
    ghana_card: str
    blood_group: str
    genotype: str
    allergies: List[str]
    chronic_conditions: List[str]
    emergency_contact_name: str
    emergency_contact_phone: str
    emergency_contact_relationship: str
    organ_donor: bool
    issued_by: str = "Ridge Regional Hospital / Medipaedia National Health Grid"


# ============================================================================
# 2. DIAGNOSTICS & VITALS HISTORY
# ============================================================================
class DiagnosticReportItem(BaseModel):
    report_id: str
    test_name: str
    category: str
    facility_name: str
    ordered_by: str
    order_date: str
    completion_date: str
    status: str = "FINAL"
    has_abnormal_flag: bool = False
    key_findings: str
    download_url: str = "#"


class VitalsLogItem(BaseModel):
    log_id: str
    recorded_at: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    blood_glucose_mg_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    weight_kg: Optional[float] = None
    source: str = "PATIENT_SELF_LOG"


class VitalsLogCreateRequest(BaseModel):
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    blood_glucose_mg_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    weight_kg: Optional[float] = None


# ============================================================================
# 3. APPOINTMENTS & PRE-CHECKIN
# ============================================================================
class PatientAppointmentItem(BaseModel):
    appointment_id: str
    facility_id: str
    facility_name: str
    department: str
    doctor_name: str
    scheduled_time: str
    status: str = "CONFIRMED"
    queue_number: Optional[str] = "Q-042"
    pre_checkin_completed: bool = False


class BookAppointmentRequest(BaseModel):
    facility_id: str
    facility_name: str
    department: str
    doctor_name: str
    scheduled_time: str
    reason: str


class PreCheckinRequest(BaseModel):
    appointment_id: str
    symptoms_summary: Optional[str] = None


# ============================================================================
# 4. FAMILY DEPENDENTS & ADHERENCE
# ============================================================================
class DependentProfileItem(BaseModel):
    dependent_id: str
    full_name: str
    relationship: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str] = None
    nhis_number: Optional[str] = None


class AddDependentRequest(BaseModel):
    full_name: str
    relationship: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str] = None
    nhis_number: Optional[str] = None


class AdherenceScheduleItem(BaseModel):
    schedule_id: str
    medication_name: str
    dosage: str
    frequency: str
    time_of_day: str
    taken_today: bool = False
    streak_days: int = 4


class LogDoseTakenRequest(BaseModel):
    schedule_id: str
    taken_at: Optional[str] = None


# ============================================================================
# 5. WALLET & PAYSTACK TOP-UP
# ============================================================================
class WalletTransactionItem(BaseModel):
    id: str
    type: str  # TOPUP, HOSPITAL_PAYMENT, PHARMACY_ESCROW
    description: str
    amount: Decimal
    timestamp: str
    status: str = "COMPLETED"


class PatientWalletResponse(BaseModel):
    wallet_id: str
    balance_ghs: Decimal
    currency: str = "GHS"
    nhis_active: bool = True
    nhis_number: str = "GHA-NHIS-8821940"
    private_insurance_provider: Optional[str] = "Nationwide Medical Insurance"
    private_insurance_policy: Optional[str] = "NMI-GOLD-2026-99"
    recent_transactions: List[WalletTransactionItem]


class WalletTopupRequest(BaseModel):
    amount_ghs: Decimal
    payment_method: str = "MOMO"
    phone_number: Optional[str] = "0244123456"


class WalletTopupResponse(BaseModel):
    transaction_id: str
    paystack_reference: str
    authorization_url: str
    amount_ghs: Decimal
    status: str = "PENDING_PUSH"


# ============================================================================
# 6. INTERACTIVE PILL BOX & 1-CLICK TELEHEALTH
# ============================================================================

class PillBoxCompartmentItem(BaseModel):
    compartment_id: str
    medication_name: str
    brand_name: Optional[str] = None
    dosage: str
    instructions: str
    time_of_day: str  # MORNING, AFTERNOON, EVENING, NIGHT
    scheduled_time: str
    status: str  # PENDING, TAKEN, MISSED, SKIPPED
    taken_at: Optional[str] = None
    can_refill: bool = False
    refill_remaining_days: int = 5
    pharmacy_pickup_partner: Optional[str] = "Ridge Regional Pharmacy Hub"


class PillBoxDailyScheduleResponse(BaseModel):
    current_date: str
    streak_days: int
    compliance_percentage: int
    morning_doses: List[PillBoxCompartmentItem]
    afternoon_doses: List[PillBoxCompartmentItem]
    evening_doses: List[PillBoxCompartmentItem]
    night_doses: List[PillBoxCompartmentItem]
    total_doses_today: int
    doses_completed_today: int


class LogPillBoxDoseRequest(BaseModel):
    compartment_id: str
    status: str = "TAKEN"  # TAKEN, MISSED, SKIPPED
    taken_time: Optional[str] = None


class LogPillBoxDoseResponse(BaseModel):
    success: bool
    compartment_id: str
    status: str
    streak_days: int
    compliance_percentage: int
    message: str


class BookTelehealthSessionRequest(BaseModel):
    doctor_name: str = "Dr. Afia Appiah"
    specialty: str = "General Medicine / Family Physician"
    scheduled_start: str  # e.g. "Today, 15:30 GMT"
    duration_minutes: int = 30
    reason_for_visit: str = "Follow-up consultation & routine lab review"
    payment_method: str = "WALLET"  # WALLET, MOMO, NHIS


class BookTelehealthSessionResponse(BaseModel):
    session_id: str
    appointment_id: str
    doctor_name: str
    specialty: str
    scheduled_start: str
    duration_minutes: int
    room_token: str
    join_url: str
    session_status: str
    message: str

