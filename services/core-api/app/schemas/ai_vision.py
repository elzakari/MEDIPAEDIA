from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# 1. ID CARD OCR SCHEMAS
# ============================================================================

class IDCardOCRRequest(BaseModel):
    image_base64: Optional[str] = None
    document_type: Optional[str] = "GHANA_CARD"  # GHANA_CARD, PASSPORT, DRIVERS_LICENSE
    raw_text_hint: Optional[str] = None


class IDCardOCRResponse(BaseModel):
    success: bool
    document_type: str
    id_number: str
    full_name: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    nationality: str = "Ghanaian"
    expiry_date: Optional[str] = None
    confidence_score: float = 0.98  # 0.00 to 1.00
    ocr_quality: str = "HIGH_CONFIDENCE"
    raw_text_extracted: Optional[str] = None
    processing_time_ms: int = 240


# ============================================================================
# 2. PRESCRIPTION HANDWRITING OCR SCHEMAS
# ============================================================================

class PrescriptionOCRRequest(BaseModel):
    image_base64: Optional[str] = None
    doctor_notes_hint: Optional[str] = None
    raw_text_hint: Optional[str] = None


class ExtractedDrugItem(BaseModel):
    drug_id: Optional[str] = None
    medication_name: str = Field(..., alias="medication_name")
    generic_name: str
    strength: str
    dosage_instructions: str
    frequency: str
    duration_days: int = 5
    quantity_prescribed: int = 1
    unit_price: float = 12.00
    confidence_score: float = 0.95
    in_stock_inventory_id: Optional[str] = None

    class Config:
        populate_by_name = True


class PrescriptionOCRResponse(BaseModel):
    success: bool
    doctor_name: Optional[str] = "Dr. Afia Appiah"
    prescriber_pin: Optional[str] = "MDC/RN/89124"
    facility_name: Optional[str] = "Ridge Regional Hospital"
    prescription_date: Optional[str] = "Today, 10:30 AM"
    confidence_score: float = 0.94
    extracted_items: List[ExtractedDrugItem]
    detected_diagnosis: Optional[str] = "Uncomplicated Malaria & Pyrexia"
    handwriting_legibility_score: float = 0.92
    processing_time_ms: int = 380


# ============================================================================
# 3. PREDICTIVE OPD QUEUE WAIT-TIME ESTIMATOR SCHEMAS
# ============================================================================

class QueueWaitTimeEstimateResponse(BaseModel):
    success: bool
    department: str
    queue_position: int
    estimated_wait_minutes: int
    estimated_consultation_eta: str
    active_physicians_count: int
    average_pace_minutes_per_patient: float
    urgency_tier: str  # STAT, URGENT, ROUTINE
    live_traffic_status: str  # OPTIMAL, MODERATE, CONGESTED
