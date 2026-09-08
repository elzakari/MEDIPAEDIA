from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# 1. STATUTORY NARCOTICS & POISONS (ACT 857)
# ============================================================================
class PoisonClassType(str, Enum):
    CLASS_A_NARCOTIC = "CLASS_A_NARCOTIC"
    CLASS_B_PSYCHOTROPIC = "CLASS_B_PSYCHOTROPIC"
    CLASS_C_RESTRICTED = "CLASS_C_RESTRICTED"


class NarcoticsRegisterItem(BaseModel):
    entry_id: str
    entry_date: str
    substance_name: str
    class_type: PoisonClassType
    batch_number: str
    quantity_dispensed: int
    running_balance: int
    patient_name: str
    patient_ghana_card: str
    prescribing_doctor: str
    doctor_mdc_pin: str
    clinical_indication: str
    superintendent_name: str
    superintendent_pin: str
    is_authorized: bool = True
    audit_status: str = "AUDITED_ACT857"


class AuthorizeNarcoticsRequest(BaseModel):
    entry_id: Optional[str] = None
    substance_name: str
    quantity: int
    batch_number: str
    patient_name: str
    patient_ghana_card: str
    prescribing_doctor: str
    doctor_mdc_pin: str
    clinical_indication: str
    superintendent_pin: str  # e.g. "7749" or "89201"


class NarcoticsExportResponse(BaseModel):
    export_id: str
    export_format: str  # "PDF" or "CSV"
    facility_name: str
    generated_at: str
    total_entries: int
    download_url: str


# ============================================================================
# 2. BATCH QUARANTINE & RECALL HUB
# ============================================================================
class QuarantineReason(str, Enum):
    FDA_RECALL = "FDA_RECALL"
    QUALITY_DEFECT = "QUALITY_DEFECT"
    BATCH_EXPIRY = "BATCH_EXPIRY"
    CONTAMINATION_SUSPICION = "CONTAMINATION_SUSPICION"


class QuarantineResolution(str, Enum):
    RETURN_TO_SUPPLIER = "RETURN_TO_SUPPLIER"
    WITNESSED_DESTRUCTION = "WITNESSED_DESTRUCTION"
    QUALITY_RELEASE = "QUALITY_RELEASE"


class QuarantinedBatchItem(BaseModel):
    quarantine_id: str
    medication_name: str
    batch_number: str
    quantity_quarantined: int
    reason: QuarantineReason
    supplier_name: str
    supplier_debit_note: Optional[str] = None
    quarantined_at: str
    status: str = "QUARANTINED_LOCKED"
    resolution: Optional[QuarantineResolution] = None
    resolved_at: Optional[str] = None
    superintendent_notes: Optional[str] = None


class FreezeBatchRequest(BaseModel):
    batch_number: str
    medication_name: str
    quantity: int
    reason: QuarantineReason
    supplier_name: str
    notes: Optional[str] = None
    superintendent_pin: str


class ResolveQuarantineRequest(BaseModel):
    quarantine_id: str
    resolution: QuarantineResolution
    witness_name: Optional[str] = "FDA Officer Kwame Boateng"
    debit_note_reference: Optional[str] = None
    superintendent_pin: str


# ============================================================================
# 3. COLD CHAIN & STORAGE MONITORING
# ============================================================================
class TemperatureExcursionLevel(str, Enum):
    NORMAL = "NORMAL"  # 2.0°C - 8.0°C
    WARNING_LOW = "WARNING_LOW"  # < 2.0°C
    WARNING_HIGH = "WARNING_HIGH"  # > 8.0°C
    CRITICAL_EXCURSION = "CRITICAL_EXCURSION"  # > 12.0°C or < 0.0°C


class ColdChainLogItem(BaseModel):
    log_id: str
    unit_name: str  # e.g. "Main Vaccine & Biologics Refrigerator #1"
    recorded_at: str
    shift: str  # "MORNING" or "EVENING"
    temperature_celsius: float
    min_24h_celsius: float
    max_24h_celsius: float
    excursion_status: TemperatureExcursionLevel
    logged_by: str
    corrective_action: Optional[str] = None


class LogTemperatureRequest(BaseModel):
    unit_name: str = "Main Vaccine & Biologics Refrigerator #1"
    shift: str = "MORNING"
    temperature_celsius: float
    min_24h_celsius: float
    max_24h_celsius: float
    corrective_action: Optional[str] = None


# ============================================================================
# 4. PHARMACOVIGILANCE (ADR / FDA YELLOW FORM)
# ============================================================================
class ADRReactionSeverity(str, Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE_LIFE_THREATENING = "SEVERE_LIFE_THREATENING"
    FATAL = "FATAL"


class ADRReportItem(BaseModel):
    report_id: str
    patient_identifier: str  # e.g. "PAT-GHA-71298412-1"
    patient_age: int
    patient_gender: str
    suspected_drug: str
    brand_name: Optional[str] = None
    batch_number: str
    adverse_reaction_description: str
    severity: ADRReactionSeverity
    onset_date: str
    outcome: str  # "RECOVERED", "RECOVERING", "PERSISTING"
    reported_by: str
    fda_yellow_form_synced: bool = True
    created_at: str


class FileADRRequest(BaseModel):
    patient_identifier: str
    patient_age: int
    patient_gender: str
    suspected_drug: str
    brand_name: Optional[str] = None
    batch_number: str
    adverse_reaction_description: str
    severity: ADRReactionSeverity
    onset_date: str
    outcome: str = "RECOVERED"


# ============================================================================
# 5. EXTEMPORANEOUS COMPOUNDING & MASTER FORMULAS
# ============================================================================
class CompoundingLogItem(BaseModel):
    compound_id: str
    formula_name: str
    active_ingredients: List[str]
    batch_quantity_prepared: str
    prepared_date: str
    beyond_use_date: str  # BUD
    pharmacist_compiler: str
    superintendent_verifier: str
    storage_conditions: str
