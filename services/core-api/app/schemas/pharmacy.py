from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.order import PaymentStatus
from app.models.prescription import PrescriptionStatus


class InventoryBatchCreate(BaseModel):
    global_medication_id: Optional[UUID] = None
    medication_name: str
    dosage_form: str = "Tablet"
    strength: str = "500mg"
    category: Optional[str] = "General"
    sku: str
    batch_number: str
    unit_price: Decimal = Field(..., ge=0)
    quantity_available: int = Field(..., ge=0)
    reorder_threshold: int = Field(10, ge=0)
    expiry_date: date
    is_available_for_marketplace: bool = True


class InventoryBatchResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    medication_id: Optional[UUID] = None
    generic_name: str
    brand_name: str
    dosage_form: str
    strength: str
    sku: str
    batch_number: str
    unit_price: Decimal
    quantity_available: int
    reorder_threshold: int
    expiry_date: date
    is_low_stock: bool
    is_expiring_soon: bool
    days_to_expiry: int
    is_available_for_marketplace: bool


class PrescriptionVerifyRequest(BaseModel):
    token: str = Field(
        ...,
        description="6-character alphanumeric claim PIN or full QR code verification URL",
    )


class PrescriptionMatchItem(BaseModel):
    item_id: UUID
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None
    quantity_prescribed: int
    quantity_dispensed: int
    quantity_remaining: int
    in_stock: bool
    available_stock: int
    unit_price: Optional[Decimal] = None
    estimated_total: Optional[Decimal] = None
    matched_batch_number: Optional[str] = None


class PrescriptionVerifyResponse(BaseModel):
    prescription_id: UUID
    prescription_number: str
    access_code: str
    is_signature_valid: bool
    status: PrescriptionStatus
    doctor_name: str
    doctor_license: Optional[str] = None
    prescribing_facility: str
    patient_name: str
    patient_mrn: Optional[str] = None
    allergies: Optional[str] = None
    diagnosis: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_expired: bool
    items: List[PrescriptionMatchItem]
    all_items_in_stock: bool
    total_estimated_amount: Decimal


class DispenseItemInput(BaseModel):
    prescription_item_id: Optional[UUID] = None
    inventory_id: UUID
    quantity_to_dispense: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)


class DispenseRequest(BaseModel):
    prescription_id: Optional[UUID] = None
    payment_method: str = Field("MOMO", description="MOMO, CASH, or CARD")
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    items: List[DispenseItemInput]


class DispenseResponse(BaseModel):
    receipt_id: UUID
    receipt_number: str
    prescription_id: Optional[UUID] = None
    prescription_status: Optional[PrescriptionStatus] = None
    total_amount: Decimal
    payment_method: str
    payment_status: PaymentStatus
    dispensed_at: datetime
    dispensed_by: str
    facility_name: str
    items_dispensed: int
    receipt_url: str


class DispensaryLogItemResponse(BaseModel):
    id: UUID
    receipt_number: str
    prescription_number: Optional[str] = None
    customer_name: str
    items_count: int
    total_amount: Decimal
    payment_method: str
    payment_status: PaymentStatus
    dispensed_at: datetime
    dispensed_by: str


class ReceiptPrintItem(BaseModel):
    medication_name: str
    batch_number: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class ReceiptPrintResponse(BaseModel):
    receipt_id: UUID
    receipt_number: str
    prescription_number: Optional[str] = None
    facility_name: str
    facility_address: Optional[str] = None
    facility_phone: Optional[str] = None
    pharmacist_name: str
    customer_name: str
    customer_phone: Optional[str] = None
    date: str
    payment_method: str
    subtotal: Decimal
    tax: Decimal
    total_amount: Decimal
    items: List[ReceiptPrintItem]


# --- Dedicated Modular Portal Models ---

class DispenseClaimRequest(BaseModel):
    prescription_id: UUID
    claim_pin: str
    notes: Optional[str] = None


class DispenseClaimResponse(BaseModel):
    prescription_id: UUID
    status: PrescriptionStatus
    dispensed_at: datetime
    pharmacy_id: UUID
    pharmacist_name: str
    message: str


class PharmacyFinancialSummary(BaseModel):
    available_balance_ghs: Decimal
    pending_escrow_balance_ghs: Decimal
    total_paid_out_ghs: Decimal
    momo_account_masked: str
    momo_network: str
    next_automated_sweep: str
    currency: str = "GHS"


# ==========================================
# Predictive Stock Depletion Schemas
# ==========================================

class DepletionForecastItem(BaseModel):
    medication_id: str
    medication_name: str
    brand_name: str
    generic_name: str
    sku: str
    category: str
    current_stock: int
    dispensed_last_30_days: int
    daily_velocity: float
    days_until_depletion: float
    predicted_runout_date: str
    urgency: str  # CRITICAL, WARNING, NORMAL
    lead_time_days: int
    unit_cost_ghs: float
    suggested_packs_order: int
    estimated_po_cost_ghs: float
    supplier_id: str
    supplier_name: str


class DepletionForecastResponse(BaseModel):
    total_items_monitored: int
    critical_stockouts_count: int  # < 7 days
    warning_stockouts_count: int   # < 14 days
    total_estimated_restock_cost_ghs: float
    forecast_timeline: List[DepletionForecastItem]


class BulkPOGenerationItemInput(BaseModel):
    medication_id: str
    supplier_id: str
    suggested_packs: int
    unit_cost_ghs: float


class BulkPOGenerationRequest(BaseModel):
    items: List[BulkPOGenerationItemInput]
    notes: Optional[str] = "Auto-generated via Predictive Stock Depletion Velocity Engine"


class BulkPOGenerationResponse(BaseModel):
    purchase_orders_created: int
    po_numbers: List[str]
    total_commitment_ghs: float
    message: str


# ==========================================
# Regulatory Compliance Export Package Schemas
# ==========================================

class ComplianceExportRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    inspectorate_agency: Optional[str] = "Pharmacy Council of Ghana & FDA"
    include_dangerous_drugs: bool = True
    include_cold_chain: bool = True
    include_quarantine_logs: bool = True
    include_adr_reports: bool = True


class ComplianceBundleRecordItem(BaseModel):
    section: str
    record_count: int
    status: str
    summary: str


class ComplianceExportBundleResponse(BaseModel):
    certificate_id: str
    issued_at: str
    date_range: str
    pharmacy_name: str
    superintendent_name: str
    superintendent_pin: str
    facility_license_number: str
    tamper_proof_sha256_hash: str
    total_records_certified: int
    sections: List[ComplianceBundleRecordItem]
    raw_compliance_payload: dict


class AuditPackageHistoryItem(BaseModel):
    id: str
    certificate_number: str
    date_range: str
    generated_at: str
    generated_by: str
    agency: str
    sha256_hash: str
    status: str


# ==========================================
# Unified Split-Screen Dispensary & Dispatch Schemas
# ==========================================

class CounterPickupItem(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    order_type: str  # STORE_PICKUP
    items: List[dict]
    total_amount_ghs: float
    escrow_status: str
    collection_otp: str
    ready_since: str
    status: str  # READY_FOR_PICKUP, COLLECTED


class CourierDeliveryItem(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    digital_gps_address: str
    order_type: str  # EXPRESS_COURIER
    items: List[dict]
    total_amount_ghs: float
    escrow_status: str
    courier_provider: Optional[str] = None  # YANGO, BOLT, IN_HOUSE
    rider_name: Optional[str] = None
    rider_phone: Optional[str] = None
    tracking_code: Optional[str] = None
    delivery_otp: str
    dispatched_at: Optional[str] = None
    status: str  # AWAITING_COURIER, DISPATCHED, IN_TRANSIT, DELIVERED


class UnifiedDispatchQueueResponse(BaseModel):
    counter_pickups: List[CounterPickupItem]
    courier_deliveries: List[CourierDeliveryItem]
    pending_counter_count: int
    pending_courier_count: int


class CourierDispatchActionRequest(BaseModel):
    order_id: str
    courier_provider: str  # YANGO, BOLT, IN_HOUSE
    rider_name: str
    rider_phone: str
    vehicle_registration: Optional[str] = None
    notes: Optional[str] = None


class CourierDispatchActionResponse(BaseModel):
    order_id: str
    order_number: str
    tracking_code: str
    courier_provider: str
    rider_name: str
    status: str
    dispatched_at: str
    message: str

