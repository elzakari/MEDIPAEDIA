from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# 1. CLINICAL SAFETY & GENERIC SUBSTITUTION
# ============================================================================
class SafetyAlertSeverity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH_CONTRAINDICATION = "HIGH_CONTRAINDICATION"


class ClinicalSafetyAlertItem(BaseModel):
    alert_id: str
    severity: SafetyAlertSeverity
    title: str
    message: str
    recommendation: str


class PrescriptionSafetyCheckRequest(BaseModel):
    patient_id: Optional[str] = "default"
    patient_allergies: List[str] = ["Amoxicillin / Penicillins", "Peanuts"]
    medications: List[str] = ["Coartem 20/120mg Tablets", "Paracetamol 500mg Tablets"]
    patient_age: Optional[int] = 34
    is_pregnant: Optional[bool] = False


class PrescriptionSafetyCheckResponse(BaseModel):
    is_safe_to_dispense: bool
    has_contraindications: bool
    alerts: List[ClinicalSafetyAlertItem]


class GenericSubstituteItem(BaseModel):
    generic_name: str
    brand_name: str
    strength: str
    manufacturer: str
    stock_available: int
    batch_number: str
    expiry_date: str
    price_ghs: Decimal
    is_cheaper: bool
    cost_difference_ghs: Decimal


# ============================================================================
# 2. FEFO-ENFORCED DISPENSATION & LABEL MINTING
# ============================================================================
class FEFODispenseItem(BaseModel):
    prescription_item_id: str
    medication_name: str
    generic_name: str
    quantity_prescribed: int
    batch_id: str
    batch_number: str
    batch_expiry: str
    unit_price_ghs: Decimal
    total_price_ghs: Decimal
    instructions: str


class FEFODispenseRequest(BaseModel):
    prescription_id: str
    claim_pin: str
    patient_name: str
    pharmacist_name: str
    pharmacist_council_pin: str
    items: List[FEFODispenseItem]


class PrintableRxLabelItem(BaseModel):
    label_id: str
    pharmacy_name: str = "Osu Community Pharmacy, Accra"
    pharmacy_phone: str = "+233 30 277 8899"
    patient_name: str
    medication_name: str
    dosage_instructions: str
    quantity_dispensed: str
    batch_number: str
    expiry_date: str
    dispensed_by: str
    dispense_date: str
    caution_text: str = "KEEP OUT OF REACH OF CHILDREN. STORE BELOW 30°C IN A DRY PLACE."
    barcode_payload: str


class FEFODispenseResponse(BaseModel):
    dispense_id: str
    prescription_id: str
    status: str = "DISPENSED"
    dispensed_at: str
    total_amount_ghs: Decimal
    labels: List[PrintableRxLabelItem]


# ============================================================================
# 3. CONTROLLED SUBSTANCES REGISTRY (FDA / PHARMACY COUNCIL GHANA)
# ============================================================================
class ControlledDrugLogRequest(BaseModel):
    drug_name: str
    quantity_dispensed: int
    batch_number: str
    patient_name: str
    patient_ghana_card: str
    prescribing_doctor: str
    doctor_mdc_pin: str
    diagnosis_indication: str
    superintendent_pharmacist: str = "Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)"
    approval_pin: str = "7749"


class ControlledDrugRegisterItem(BaseModel):
    entry_id: str
    entry_date: str
    drug_name: str
    class_type: str = "CLASS_A_POM"
    quantity_dispensed: int
    batch_number: str
    balance_in_safe: int
    patient_name: str
    patient_ghana_card: str
    prescribing_doctor: str
    doctor_mdc_pin: str
    superintendent_signature: str
    regulatory_status: str = "AUDITED_FDA_GH"


# ============================================================================
# 4. MULTI-CHANNEL MARKETPLACE ORDER FULFILLMENT
# ============================================================================
class FulfillmentStage(str, Enum):
    RECEIVED = "RECEIVED"
    PICKING = "PICKING"
    PACKED = "PACKED"
    DISPATCHED = "DISPATCHED"
    COLLECTED = "COLLECTED"


class FulfillmentOrderItem(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    order_type: str
    fulfillment_stage: FulfillmentStage
    total_amount_ghs: Decimal
    escrow_status: str
    items: List[dict]
    created_at: str
    collection_otp: str


class PackOrderRequest(BaseModel):
    order_id: str
    batch_lot_verified: bool = True
    packer_name: str = "Pharm. Kojo Asante"


class HandoverOrderRequest(BaseModel):
    order_id: str
    otp_or_qr_code: str
    pharmacist_name: str = "Pharm. Kojo Asante"


class HandoverOrderResponse(BaseModel):
    order_id: str
    order_number: str
    status: str = "COMPLETED"
    escrow_released_ghs: Decimal
    payout_status: str = "CREDITED_TO_PHARMACY_WALLET"
