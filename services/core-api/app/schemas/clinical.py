from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.clinical import ConsultationStatus, OpdQueueStatus, TriagePriority
from app.models.prescription import PrescriptionStatus


class CheckInRequest(BaseModel):
    identifier: str = Field(
        ...,
        description="Ghana Card ID, Mobile Phone, MRN, or Card QR token",
    )
    priority: TriagePriority = TriagePriority.ROUTINE


class CheckInResponse(BaseModel):
    queue_id: UUID
    queue_number: str
    mrn: str
    patient_id: UUID
    patient_name: str
    phone: Optional[str] = None
    ghana_card_id: Optional[str] = None
    status: OpdQueueStatus
    priority: TriagePriority
    registration_fee_waived: bool
    fee_amount: Decimal
    checked_in_at: datetime


class OpdQueueItemResponse(BaseModel):
    queue_id: UUID
    queue_number: str
    patient_id: UUID
    hospital_card_id: UUID
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    mrn: str
    priority: TriagePriority
    status: OpdQueueStatus
    checked_in_at: datetime
    temperature: Optional[float] = None
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    spo2: Optional[float] = None
    has_vitals: bool = False


class VitalsCreateRequest(BaseModel):
    patient_account_id: UUID
    consultation_id: Optional[UUID] = None
    queue_id: Optional[UUID] = None
    temperature: Optional[float] = Field(None, example=37.2)
    systolic_bp: Optional[int] = Field(None, example=120)
    diastolic_bp: Optional[int] = Field(None, example=80)
    heart_rate: Optional[int] = Field(None, example=72)
    respiratory_rate: Optional[int] = Field(None, example=16)
    spo2: Optional[float] = Field(None, example=98.5)
    weight_kg: Optional[float] = Field(None, example=70.0)
    height_cm: Optional[float] = Field(None, example=175.0)


class VitalsResultResponse(BaseModel):
    id: UUID
    patient_account_id: UUID
    temperature: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmi: Optional[float] = None
    is_fever: bool = False
    is_hypertensive: bool = False
    is_hypoxic: bool = False
    recorded_at: datetime


class SOAPConsultationCreateRequest(BaseModel):
    hospital_card_id: UUID
    queue_id: Optional[UUID] = None
    chief_complaint: str
    subjective_note: Optional[str] = None
    objective_note: Optional[str] = None
    assessment_note: Optional[str] = None
    plan_note: Optional[str] = None
    icd10_diagnosis_code: Optional[str] = None
    diagnosis_description: Optional[str] = None


class ICD10ItemResponse(BaseModel):
    code: str
    description: str
    category: str
    is_common: bool = False


class PrescriptionItemInput(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None
    quantity_prescribed: int


class PrescriptionMintRequest(BaseModel):
    patient_account_id: UUID
    consultation_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemInput]


class PrescriptionItemPrint(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None
    quantity_prescribed: int


class PrescriptionPrintResponse(BaseModel):
    prescription_id: UUID
    prescription_number: str
    access_code: str
    verification_hash: str
    qr_payload: str
    doctor_name: str
    doctor_license: Optional[str] = None
    facility_name: str
    facility_address: Optional[str] = None
    patient_name: str
    patient_mrn: str
    patient_dob: Optional[str] = None
    patient_gender: Optional[str] = None
    allergies: Optional[str] = None
    diagnosis: Optional[str] = None
    issued_date: str
    expires_date: str
    status: PrescriptionStatus
    items: List[PrescriptionItemPrint]


class PastConsultationSummary(BaseModel):
    id: UUID
    date: datetime
    doctor_name: str
    chief_complaint: str
    icd10_code: Optional[str] = None
    diagnosis: Optional[str] = None
    prescriptions_count: int = 0


class PatientHistoryResponse(BaseModel):
    patient_id: UUID
    full_name: str
    ghana_card_id: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    consultations: List[PastConsultationSummary] = []
    recent_vitals: List[VitalsResultResponse] = []


# --- Dedicated Modular Portal Models ---

class VitalsCreate(BaseModel):
    patient_id: UUID
    vitals_id: Optional[UUID] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate_bpm: Optional[int] = None
    respiratory_rate_bpm: Optional[int] = None
    temperature_c: Optional[float] = None
    oxygen_saturation_percent: Optional[float] = None
    blood_glucose_mmol_l: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    triage_category: Optional[str] = None
    nurse_notes: Optional[str] = None


class VitalsResponse(BaseModel):
    id: UUID
    patient_id: UUID
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate_bpm: Optional[int] = None
    temperature_c: Optional[float] = None
    oxygen_saturation_percent: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmi: Optional[float] = None
    triage_category: Optional[str] = None
    nurse_notes: Optional[str] = None

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    patient_id: UUID
    vitals_id: Optional[UUID] = None
    chief_complaint: str
    history_of_present_illness: Optional[str] = None
    subjective_notes: Optional[str] = None
    objective_findings: Optional[str] = None
    assessment_diagnosis: Optional[str] = None
    plan_treatment: Optional[str] = None
    primary_icd10_code: Optional[str] = None
    secondary_icd10_codes: Optional[str] = None
    diagnosis_summary: Optional[str] = None
    clinical_notes: Optional[str] = None


class ConsultationListItem(BaseModel):
    id: UUID
    consultation_number: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: str
    diagnosis_summary: Optional[str] = None
    status: ConsultationStatus
    created_at: datetime
    has_prescriptions: bool = False


class ConsultationDetailResponse(BaseModel):
    id: UUID
    consultation_number: str
    patient_id: UUID
    doctor_id: UUID
    chief_complaint: str
    assessment_diagnosis: Optional[str] = None
    primary_icd10_code: Optional[str] = None
    diagnosis_summary: Optional[str] = None
    status: ConsultationStatus
    created_at: datetime

    class Config:
        from_attributes = True


class OpdQueueResponse(BaseModel):
    id: UUID
    queue_number: str
    patient_id: UUID
    triage_priority: TriagePriority
    status: OpdQueueStatus
    chief_complaint: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Clinical Acceleration Schemas
# ==========================================

class SOAPMacroTemplate(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class PrescriptionMacroItem(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    quantity: int
    instructions: Optional[str] = None


class ClinicalMacroCreateRequest(BaseModel):
    macro_name: str
    specialty: str = "GENERAL_PRACTICE"
    icd10_code: str
    diagnosis_title: str
    default_soap_template: SOAPMacroTemplate
    default_prescription_items: List[PrescriptionMacroItem]
    default_lab_orders: Optional[List[str]] = []


class ClinicalMacroResponse(BaseModel):
    id: str
    macro_name: str
    specialty: str
    icd10_code: str
    diagnosis_title: str
    default_soap_template: SOAPMacroTemplate
    default_prescription_items: List[PrescriptionMacroItem]
    default_lab_orders: List[str] = []
    is_active: bool = True


class VitalTrendPoint(BaseModel):
    recorded_at: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    spo2: Optional[float] = None
    mews_score: int = 0
    mews_severity: str = "NORMAL"


class LabTrendPoint(BaseModel):
    recorded_at: str
    test_name: str
    result_value: float
    unit: str
    reference_range: str
    is_abnormal: bool = False


class PatientLongitudinalTrendsResponse(BaseModel):
    patient_id: str
    patient_name: str
    mrn: str
    vitals_history: List[VitalTrendPoint]
    hb_history: List[LabTrendPoint]
    rbs_history: List[LabTrendPoint]
    creatinine_history: List[LabTrendPoint]


class StatNursingOrderCreateRequest(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    instruction: str
    urgency: str = "STAT"  # "STAT", "URGENT", "ROUTINE"
    notes: Optional[str] = None


class StatNursingOrderResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    mrn: str
    doctor_name: str
    consultation_id: Optional[str] = None
    instruction: str
    urgency: str
    status: str  # "PENDING", "EXECUTED", "CANCELLED"
    issued_at: str
    executed_by_nurse_name: Optional[str] = None
    executed_at: Optional[str] = None
    execution_notes: Optional[str] = None


class StatNursingOrderExecuteRequest(BaseModel):
    execution_notes: Optional[str] = "Administered per doctor protocol"

