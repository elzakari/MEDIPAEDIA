from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SupportedCounselingLanguage(str, Enum):
    ENGLISH = "ENGLISH"
    FRENCH = "FRENCH"
    TWI = "TWI"
    EWE = "EWE"
    GA = "GA"


# ============================================================================
# 1. AMBIENT CLINICAL SOAP SCRIBE
# ============================================================================

class SOAPSections(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class AIScribeRequest(BaseModel):
    transcript_text: str
    patient_context: Optional[dict] = None
    consultation_id: Optional[str] = None
    doctor_notes_hint: Optional[str] = None


class AISoapScribeResponse(BaseModel):
    success: bool
    ambient_audio_processed: bool = True
    word_count: int
    soap: SOAPSections
    suggested_icd10_code: str
    suggested_icd10_title: str
    suggested_prescriptions: List[dict]
    suggested_follow_up_days: int
    phi_token_stripped: bool = True
    inference_latency_ms: int = 184


# ============================================================================
# 2. AI ICD-10 DIFFERENTIAL SUGGESTION ENGINE
# ============================================================================

class ICD10DifferentialRequest(BaseModel):
    symptoms: List[str]
    vitals_summary: Optional[str] = None
    history: Optional[str] = None
    encounter_notes: Optional[str] = None


class ICD10DifferentialItem(BaseModel):
    icd10_code: str
    title: str
    confidence_score: float  # 0.00 to 1.00
    category: str
    clinical_reasoning: str
    recommended_investigations: List[str]
    is_primary_recommendation: bool = False


class ICD10SuggestionResponse(BaseModel):
    success: bool
    total_differentials_evaluated: int
    primary_diagnosis: ICD10DifferentialItem
    differentials: List[ICD10DifferentialItem]
    clinical_guideline_reference: str = "Standard Treatment Guidelines (MOH / GHS Ghana)"


# ============================================================================
# 3. MULTILINGUAL PHARMACY COUNSELING GENERATOR
# ============================================================================

class PrescriptionCounselingInputItem(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: Optional[int] = 5
    instructions: Optional[str] = None


class MultilingualCounselingRequest(BaseModel):
    prescription_items: List[PrescriptionCounselingInputItem]
    target_language: SupportedCounselingLanguage = SupportedCounselingLanguage.ENGLISH
    patient_name: Optional[str] = "Patient"


class DrugCounselingItem(BaseModel):
    medication_name: str
    how_to_take: str
    meal_instructions: str
    warnings_and_precautions: List[str]
    auxiliary_label_text: str


class MultilingualCounselingResponse(BaseModel):
    success: bool
    language: SupportedCounselingLanguage
    language_display_name: str
    patient_greeting: str
    medications_counseling: List[DrugCounselingItem]
    general_lifestyle_advice: str
    emergency_warning: str
    sms_whatsapp_dispatch_copy: str
