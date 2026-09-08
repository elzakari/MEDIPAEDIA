from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class AVPUConsciousness(str, Enum):
    ALERT = "ALERT"
    VOICE = "VOICE"
    PAIN = "PAIN"
    UNRESPONSIVE = "UNRESPONSIVE"


class MedicationAdminStatus(str, Enum):
    GIVEN = "GIVEN"
    HELD = "HELD"
    REFUSED = "REFUSED"


class FluidIntakeType(str, Enum):
    ORAL = "ORAL"
    IV_CRYSTALLOID = "IV_CRYSTALLOID"
    IV_COLLOID = "IV_COLLOID"
    BLOOD_PRODUCT = "BLOOD_PRODUCT"
    ENTERAL = "ENTERAL"


class FluidOutputType(str, Enum):
    URINE = "URINE"
    DRAIN = "DRAIN"
    VOMIT = "VOMIT"
    STOOL = "STOOL"
    NG_TUBE = "NG_TUBE"
    INSENSIBLE = "INSENSIBLE"


# ============================================================================
# 1. EXTENDED VITALS & ESI TRIAGE SCHEMAS
# ============================================================================
class ExtendedVitalsCreateRequest(BaseModel):
    patient_id: Optional[str] = Field(None, description="Patient UUID or MRN")
    patient_name: Optional[str] = Field(None, description="Patient Name")
    queue_id: Optional[str] = None
    consultation_id: Optional[str] = None
    systolic_bp: int = Field(..., description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: int = Field(..., description="Diastolic Blood Pressure (mmHg)")
    heart_rate: int = Field(..., description="Heart Rate (bpm)")
    respiratory_rate: Optional[int] = Field(16, description="Respiratory Rate (bpm)")
    temperature_celsius: float = Field(..., description="Core Body Temperature (°C)")
    spo2_percent: int = Field(..., description="Oxygen Saturation (%)")
    weight_kg: Optional[float] = Field(None, description="Body Weight (kg)")
    height_cm: Optional[float] = Field(None, description="Body Height (cm)")
    blood_glucose_rbs: Optional[float] = Field(None, description="Random Blood Sugar (mmol/L)")
    pain_score: Optional[int] = Field(0, ge=0, le=10, description="Pain score 0-10 on Wong-Baker scale")
    avpu: Optional[AVPUConsciousness] = Field(AVPUConsciousness.ALERT, description="Consciousness scale")
    urine_dipstick: Optional[str] = Field(None, description="Urine dipstick PoC results")
    nurse_notes: Optional[str] = None


class ExtendedVitalsResponse(BaseModel):
    vitals_id: str
    patient_id: Optional[str]
    patient_name: Optional[str]
    systolic_bp: int
    diastolic_bp: int
    heart_rate: int
    respiratory_rate: Optional[int]
    temperature_celsius: float
    spo2_percent: int
    bmi: Optional[float]
    blood_glucose_rbs: Optional[float]
    pain_score: Optional[int]
    avpu: AVPUConsciousness
    urine_dipstick: Optional[str]
    esi_level: int = Field(..., ge=1, le=5, description="Computed Emergency Severity Index (1: Resuscitation, 2: Emergent, 3: Urgent, 4: Less Urgent, 5: Non-Urgent)")
    triage_category: str = Field(..., description="RED, ORANGE, YELLOW, or GREEN")
    is_critical_alert: bool = False
    critical_alert_message: Optional[str] = None
    recorded_at: datetime
    recorded_by: str


# ============================================================================
# 2. eMAR MEDICATION ADMINISTRATION SCHEMAS
# ============================================================================
class MedicationScheduleItem(BaseModel):
    medication_id: str
    prescription_id: str
    medication_name: str
    dosage: str
    route: str
    frequency: str
    scheduled_time: str
    status: str = "PENDING"  # PENDING, GIVEN, HELD, REFUSED
    last_administered_at: Optional[str] = None
    administered_by_nurse: Optional[str] = None
    special_instructions: Optional[str] = None


class PatientMedicationScheduleResponse(BaseModel):
    patient_id: str
    patient_name: str
    age: Optional[int]
    gender: Optional[str]
    allergies: List[str] = []
    active_prescriptions_count: int
    schedule: List[MedicationScheduleItem]


class MedicationAdministerRequest(BaseModel):
    patient_id: str
    medication_id: str
    prescription_id: str
    medication_name: str
    dose_given: str
    route: str
    status: MedicationAdminStatus = MedicationAdminStatus.GIVEN
    reason_if_not_given: Optional[str] = None
    five_rights_verified: bool = Field(True, description="Right Patient, Drug, Dose, Route, Time verified")
    nurse_signature: str
    nurse_pin: Optional[str] = None


class MedicationAdministerResponse(BaseModel):
    administration_id: str
    patient_id: str
    medication_name: str
    dose_given: str
    status: MedicationAdminStatus
    timestamp: datetime
    nurse_signature: str
    verified_5_rights: bool
    audit_message: str


# ============================================================================
# 3. INPATIENT WARD & BED SCHEMAS
# ============================================================================
class InpatientBedItem(BaseModel):
    bed_id: str
    bed_number: str
    ward_id: str
    ward_name: str
    is_occupied: bool
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    ghana_card: Optional[str] = None
    diagnosis: Optional[str] = None
    allergies: List[str] = []
    oxygen_flow_rate: Optional[str] = None
    current_iv_fluids: Optional[str] = None
    admitted_at: Optional[str] = None
    admission_duration_days: Optional[int] = None
    attending_physician: Optional[str] = None


class WardBedGridResponse(BaseModel):
    total_facility_beds: int
    occupied_beds: int
    vacant_beds: int
    occupancy_rate_percent: int
    wards: List[dict]


class AssignBedRequest(BaseModel):
    patient_id: str
    patient_name: str
    gender: str
    age: int
    ghana_card: str
    ward_id: str
    bed_id: str
    diagnosis: str
    allergies: List[str] = []
    oxygen_flow_rate: Optional[str] = None
    current_iv_fluids: Optional[str] = None
    attending_physician: str


# ============================================================================
# 4. FLUID BALANCE TRACKER SCHEMAS
# ============================================================================
class FluidBalanceLogRequest(BaseModel):
    patient_id: str
    patient_name: Optional[str] = None
    intake_type: Optional[FluidIntakeType] = None
    intake_volume_ml: float = 0.0
    intake_solution_name: Optional[str] = None
    output_type: Optional[FluidOutputType] = None
    output_volume_ml: float = 0.0
    notes: Optional[str] = None
    nurse_name: str


class FluidBalanceLogItem(BaseModel):
    entry_id: str
    timestamp: datetime
    intake_type: Optional[str]
    intake_volume_ml: float
    intake_solution_name: Optional[str]
    output_type: Optional[str]
    output_volume_ml: float
    nurse_name: str
    notes: Optional[str]


class PatientFluidBalanceSummaryResponse(BaseModel):
    patient_id: str
    patient_name: str
    total_intake_24h_ml: float
    total_output_24h_ml: float
    net_balance_24h_ml: float
    fluid_status: str  # POSITIVE (+350mL), NEGATIVE (-200mL), EVEN
    logs: List[FluidBalanceLogItem]


# ============================================================================
# 5. SBAR SHIFT HANDOVER SCHEMAS
# ============================================================================
class SBARHandoverCreateRequest(BaseModel):
    ward_name: str
    shift: str = Field(..., description="MORNING, AFTERNOON, or NIGHT")
    outgoing_nurse_name: str
    outgoing_nurse_pin: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    situation: str = Field(..., description="Current clinical status and urgent priorities")
    background: str = Field(..., description="Admitting diagnosis, medical history, code status")
    assessment: str = Field(..., description="Current vitals, consciousness, fluid balance, lab status")
    recommendation: str = Field(..., description="Planned medications, pending labs, doctor reviews")


class SBARHandoverItem(BaseModel):
    handover_id: str
    ward_name: str
    shift: str
    outgoing_nurse_name: str
    outgoing_nurse_pin: str
    patient_id: Optional[str]
    patient_name: Optional[str]
    situation: str
    background: str
    assessment: str
    recommendation: str
    created_at: datetime
    is_acknowledged: bool = False
    incoming_nurse_name: Optional[str] = None
    incoming_nurse_pin: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class AcknowledgeHandoverRequest(BaseModel):
    incoming_nurse_name: str
    incoming_nurse_pin: str
