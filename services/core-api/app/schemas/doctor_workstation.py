from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class AllergySeverity(str, Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE_ANAPHYLAXIS = "SEVERE_ANAPHYLAXIS"


class AllergyCategory(str, Enum):
    DRUG = "DRUG"
    FOOD = "FOOD"
    ENVIRONMENTAL = "ENVIRONMENTAL"


class CDSAlertSeverity(str, Enum):
    CRITICAL_CONTRAINDICATION = "CRITICAL_CONTRAINDICATION"
    WARNING = "WARNING"
    INFO = "INFO"


class DiagnosticCategory(str, Enum):
    LABORATORY = "LABORATORY"
    IMAGING = "IMAGING"
    POINT_OF_CARE = "POINT_OF_CARE"
    PATHOLOGY = "PATHOLOGY"


class DiagnosticPriority(str, Enum):
    STAT = "STAT"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


class AdmissionPriority(str, Enum):
    EMERGENT = "EMERGENT"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


# ============================================================================
# 1. PATIENT ALLERGIES & CDS SAFETY CHECK
# ============================================================================
class PatientAllergyItem(BaseModel):
    allergy_id: str
    patient_id: str
    allergen_name: str
    allergen_category: AllergyCategory
    reaction_description: str
    severity: AllergySeverity
    diagnosed_date: Optional[str] = None
    verified_by: str


class PatientAllergyCreateRequest(BaseModel):
    allergen_name: str
    allergen_category: AllergyCategory = AllergyCategory.DRUG
    reaction_description: str
    severity: AllergySeverity = AllergySeverity.SEVERE_ANAPHYLAXIS


class CDSAlertItem(BaseModel):
    alert_id: str
    severity: CDSAlertSeverity
    title: str
    message: str
    conflicting_drug: str
    matched_allergen_or_drug: str
    recommendation: str


class PrescriptionDrugItem(BaseModel):
    drug_name: str
    dosage: str
    route: str = "Oral"
    frequency: str = "OD"
    duration_days: int = 5


class PrescriptionSafetyValidationRequest(BaseModel):
    patient_id: str
    medications: List[PrescriptionDrugItem]
    current_conditions: List[str] = []


class PrescriptionSafetyValidationResponse(BaseModel):
    is_safe: bool
    critical_contraindications_count: int
    warnings_count: int
    alerts: List[CDSAlertItem]


# ============================================================================
# 2. CPOE DIAGNOSTIC ORDERS
# ============================================================================
class DiagnosticOrderItem(BaseModel):
    test_code: str
    test_name: str
    category: DiagnosticCategory
    priority: DiagnosticPriority = DiagnosticPriority.ROUTINE
    clinical_indication: str


class CPOEDiagnosticOrderRequest(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    tests: List[DiagnosticOrderItem]
    ordering_doctor_name: str
    ordering_doctor_pin: str
    clinical_notes: Optional[str] = None


class CPOEDiagnosticOrderResponse(BaseModel):
    order_id: str
    patient_id: str
    ordered_at: datetime
    status: str
    tests_count: int
    tests: List[DiagnosticOrderItem]
    ordering_doctor: str
    estimated_turnaround: str


class DiagnosticResultItem(BaseModel):
    result_id: str
    test_code: str
    test_name: str
    category: str
    result_value: str
    reference_range: str
    is_abnormal: bool
    critical_flag: Optional[str] = None
    completed_at: str
    verified_by: str


class PatientDiagnosticHistoryResponse(BaseModel):
    patient_id: str
    patient_name: str
    pending_orders: List[CPOEDiagnosticOrderResponse] = []
    completed_results: List[DiagnosticResultItem] = []


# ============================================================================
# 3. INPATIENT ADMISSIONS & SPECIALIST REFERRALS
# ============================================================================
class InpatientAdmissionOrderRequest(BaseModel):
    patient_id: str
    patient_name: str
    consultation_id: Optional[str] = None
    target_ward: str
    admitting_diagnosis: str
    admitting_icd10: str
    priority: AdmissionPriority = AdmissionPriority.URGENT
    nursing_orders: List[str]
    oxygen_therapy_order: Optional[str] = None
    iv_fluid_regimen: Optional[str] = None
    admitting_doctor_name: str
    admitting_doctor_pin: str


class InpatientAdmissionOrderResponse(BaseModel):
    admission_order_id: str
    patient_id: str
    target_ward: str
    status: str
    admitting_diagnosis: str
    admitting_icd10: str
    priority: AdmissionPriority
    ordered_at: datetime
    admitting_doctor: str
    confirmation_message: str


class SpecialistReferralRequest(BaseModel):
    patient_id: str
    patient_name: str
    receiving_facility: str
    receiving_specialty: str
    referral_priority: str = "URGENT"
    clinical_summary: str
    working_diagnosis: str
    icd10_code: str
    current_medications: List[str] = []
    investigation_findings: str
    reason_for_referral: str
    referring_doctor_name: str
    referring_doctor_pin: str


class SpecialistReferralResponse(BaseModel):
    referral_id: str
    patient_id: str
    receiving_facility: str
    receiving_specialty: str
    qr_verification_token: str
    generated_at: datetime
    referring_doctor: str
    document_summary: str


# ============================================================================
# 4. ENHANCED ENCOUNTER WITH ICD-10 & DISPOSITION
# ============================================================================
class EnhancedSOAPConsultationCreate(BaseModel):
    patient_account_id: str
    hospital_card_id: Optional[str] = None
    queue_id: Optional[str] = None
    chief_complaint: str
    hpi: Optional[str] = None
    subjective: str
    objective: str
    assessment: str
    plan: str
    primary_icd10_code: str
    primary_icd10_description: str
    differential_icd10_codes: List[str] = []
    disposition_status: str = "DISCHARGED"  # DISCHARGED, ADMITTED, REFERRED
    review_date: Optional[str] = None
    prescriptions: Optional[List[dict]] = None
    diagnostic_tests: Optional[List[DiagnosticOrderItem]] = None
