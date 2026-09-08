from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SupplierCreditTerms(str, Enum):
    NET_7 = "NET_7"
    NET_15 = "NET_15"
    NET_30 = "NET_30"
    NET_60 = "NET_60"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    PREPAYMENT = "PREPAYMENT"


class PurchaseOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    SENT = "SENT"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class StockTransferStatus(str, Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"


class DrugCategory(str, Enum):
    POM = "POM"  # Prescription Only Medicine
    OTC = "OTC"  # Over the Counter
    CONTROLLED = "CONTROLLED"  # Class A / Class B
    COSMETICS = "COSMETICS"
    DEVICES = "DEVICES"


# ==========================================
# 1. Supplier & Procurement Schemas
# ==========================================

class SupplierCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    code: Optional[str] = None
    contact_person: str
    email: EmailStr
    phone: str
    address: Optional[str] = "Accra, Ghana"
    credit_terms: SupplierCreditTerms = SupplierCreditTerms.NET_30
    credit_limit_ghs: Decimal = Decimal("50000.00")
    lead_time_days: int = 3
    is_active: bool = True


class SupplierResponse(BaseModel):
    id: UUID
    name: str
    code: str
    contact_person: str
    email: str
    phone: str
    address: str
    credit_terms: SupplierCreditTerms
    credit_limit_ghs: Decimal
    lead_time_days: int
    rating: float = 4.8
    total_spend_ghs: Decimal = Decimal("0.00")
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReorderSuggestionItem(BaseModel):
    medication_name: str
    generic_name: str
    category: DrugCategory
    current_stock: int
    reorder_threshold: int
    monthly_sales_velocity: int
    suggested_reorder_qty: int
    estimated_unit_cost_ghs: Decimal
    estimated_total_cost_ghs: Decimal
    primary_supplier_name: str
    lead_time_days: int
    stockout_risk_level: str  # "CRITICAL", "HIGH", "MODERATE"


class ReorderSuggestionsResponse(BaseModel):
    total_items_below_threshold: int
    total_suggested_cost_ghs: Decimal
    critical_stockout_count: int
    items: List[ReorderSuggestionItem]


class PurchaseOrderItemInput(BaseModel):
    medication_name: str
    sku: Optional[str] = None
    generic_name: Optional[str] = None
    quantity_ordered: int = Field(..., ge=1)
    unit_cost_ghs: Decimal = Field(..., ge=0)


class PurchaseOrderCreateRequest(BaseModel):
    supplier_id: UUID
    supplier_name: str
    expected_delivery_date: date
    notes: Optional[str] = None
    items: List[PurchaseOrderItemInput]


class PurchaseOrderItemResponse(BaseModel):
    id: UUID
    medication_name: str
    quantity_ordered: int
    quantity_received: int = 0
    unit_cost_ghs: Decimal
    total_cost_ghs: Decimal


class PurchaseOrderResponse(BaseModel):
    id: UUID
    po_number: str
    supplier_id: UUID
    supplier_name: str
    status: PurchaseOrderStatus
    total_amount_ghs: Decimal
    created_by_name: str
    approved_by_name: Optional[str] = None
    expected_delivery_date: date
    created_at: datetime
    items_count: int
    items: List[PurchaseOrderItemResponse] = []


class GoodsReceivedNoteItemInput(BaseModel):
    medication_name: str
    sku: str
    batch_number: str
    expiry_date: date
    quantity_received: int = Field(..., ge=1)
    unit_cost_ghs: Decimal = Field(..., ge=0)
    suggested_retail_price_ghs: Decimal = Field(..., ge=0)


class GoodsReceivedNoteRequest(BaseModel):
    purchase_order_id: UUID
    invoice_number: str
    received_by_name: Optional[str] = "Pharm. Kojo Asante"
    supplier_delivery_note: Optional[str] = None
    items: List[GoodsReceivedNoteItemInput]


class GoodsReceivedNoteResponse(BaseModel):
    grn_id: UUID
    grn_number: str
    po_number: str
    supplier_name: str
    total_value_received_ghs: Decimal
    items_received_count: int
    inventory_batches_created: int
    received_at: datetime
    message: str


# ==========================================
# 2. Inter-Branch Stock Transfers (IBT)
# ==========================================

class StockTransferItemInput(BaseModel):
    medication_name: str
    batch_number: str
    expiry_date: str
    quantity: int = Field(..., ge=1)
    unit_cost_ghs: Decimal


class StockTransferCreateRequest(BaseModel):
    destination_branch_name: str  # e.g. "Ridge Hospital Dispensary" or "Tema Branch"
    destination_branch_id: Optional[UUID] = None
    transfer_type: str = "INTER_BRANCH"  # INTER_BRANCH, WAREHOUSE_REPLENISHMENT
    notes: Optional[str] = None
    items: List[StockTransferItemInput]


class StockTransferItemResponse(BaseModel):
    id: UUID
    medication_name: str
    batch_number: str
    expiry_date: str
    quantity: int
    unit_cost_ghs: Decimal
    total_value_ghs: Decimal


class StockTransferResponse(BaseModel):
    id: UUID
    transfer_number: str
    source_branch: str
    destination_branch: str
    status: StockTransferStatus
    total_items_count: int
    total_value_ghs: Decimal
    dispatched_by: str
    dispatched_at: datetime
    received_at: Optional[datetime] = None
    driver_or_courier_name: Optional[str] = "Medipaedia Logistics"
    items: List[StockTransferItemResponse] = []


class StockTransferActionRequest(BaseModel):
    action: str = Field(..., pattern="^(DISPATCH|RECEIVE|REJECT)$")
    actor_name: str
    rejection_reason: Optional[str] = None


# ==========================================
# 3. Dynamic Pricing Schedules & Margins
# ==========================================

class CategoryMarkupRule(BaseModel):
    category: DrugCategory
    category_name: str
    target_markup_percentage: float  # e.g. 35.0% for POM, 50.0% for OTC
    minimum_gross_margin_percentage: float  # e.g. 25.0%
    allow_discount: bool = True
    rounding_rule: str = "NEAREST_50_PESEWAS"  # EXACT, NEAREST_50_PESEWAS, NEAREST_1_CEDI


class PatientDiscountTier(BaseModel):
    tier_id: str
    tier_name: str  # e.g. "NHIS Co-Pay", "Senior Citizen (60+)", "Chronic Care Club", "Staff Discount"
    discount_percentage: float  # e.g. 10.0%
    is_active: bool = True


class PricingRulesResponse(BaseModel):
    default_markup_percentage: float = 40.0
    category_rules: List[CategoryMarkupRule]
    patient_discount_tiers: List[PatientDiscountTier]
    tax_rate_percentage: float = 0.0  # Exempt essential medicines under Act 851


class UpdatePricingRulesRequest(BaseModel):
    default_markup_percentage: float = Field(..., ge=0, le=200)
    category_rules: List[CategoryMarkupRule]
    patient_discount_tiers: List[PatientDiscountTier]


class BulkMarkupApplyRequest(BaseModel):
    category: DrugCategory
    unit_cost_ghs: Decimal


class BulkMarkupApplyResponse(BaseModel):
    category: DrugCategory
    unit_cost_ghs: Decimal
    markup_percentage: float
    calculated_retail_price_ghs: Decimal
    gross_margin_percentage: float
    pesewas_rounded: bool


# ==========================================
# 4. Stock Audits & Blind Cycle Counts
# ==========================================

class CycleCountItemInput(BaseModel):
    inventory_batch_id: UUID
    medication_name: str
    batch_number: str
    system_quantity: int
    physical_counted_quantity: int
    unit_cost_ghs: Decimal


class CycleCountSubmitRequest(BaseModel):
    audit_name: str = "Q3 Blind Cycle Count - Antibiotics & Analgesics"
    counted_by: str = "Pharm. Kojo Asante"
    approved_by: Optional[str] = "Superintendent Pharmacist"
    notes: Optional[str] = None
    items: List[CycleCountItemInput]


class CycleCountVarianceResult(BaseModel):
    inventory_batch_id: UUID
    medication_name: str
    batch_number: str
    system_qty: int
    physical_qty: int
    variance_units: int  # physical - system (e.g. -2 for shrinkage)
    variance_value_ghs: Decimal  # variance_units * unit_cost
    status: str  # "MATCH", "DEFICIT_SHRINKAGE", "SURPLUS"


class CycleCountResponse(BaseModel):
    audit_id: UUID
    audit_code: str
    audit_name: str
    counted_by: str
    conducted_at: datetime
    total_lines_counted: int
    total_variance_units: int
    net_financial_variance_ghs: Decimal
    shrinkage_loss_ghs: Decimal
    surplus_gain_ghs: Decimal
    reconciled_status: str  # "RECONCILED", "PENDING_APPROVAL"
    variances: List[CycleCountVarianceResult]


# ==========================================
# 5. Executive Overview & Hardware Settings
# ==========================================

class PharmacyAdminOverviewMetrics(BaseModel):
    facility_name: str
    total_inventory_valuation_cost_ghs: Decimal
    total_inventory_valuation_retail_ghs: Decimal
    thirty_day_gross_margin_percentage: float
    active_stockout_alerts_count: int
    low_stock_items_count: int
    pending_purchase_orders_count: int
    in_transit_transfers_count: int
    monthly_sales_revenue_ghs: Decimal
    currency: str = "GHS"


class ExtendedPharmacySettingsResponse(BaseModel):
    facility_id: UUID
    name: str
    slug: str
    license_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    operating_hours: str = "08:00 AM - 09:00 PM (Daily)"
    default_reorder_threshold: int = 15
    max_cash_in_drawer_limit_ghs: Decimal = Decimal("5000.00")
    thermal_receipt_header: str = "OSU COMMUNITY PHARMACY LTD\nOxford Street, Osu - Accra\nTel: +233 30 277 8899"
    thermal_receipt_footer: str = "Thank you for choosing Osu Community Pharmacy.\nMedicines sold are not returnable.\nGet well soon!"
    auto_reorder_alert_enabled: bool = True
    momo_network: str = "MTN"
    momo_account_number: str = "0244556677"
    momo_account_name: str = "Osu Community Pharmacy Ltd"
    payout_schedule: str = "DAILY_AUTOMATED_SWEEP"


class UpdateExtendedPharmacySettingsRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    operating_hours: Optional[str] = None
    default_reorder_threshold: Optional[int] = Field(None, ge=1)
    max_cash_in_drawer_limit_ghs: Optional[Decimal] = Field(None, ge=100)
    thermal_receipt_header: Optional[str] = None
    thermal_receipt_footer: Optional[str] = None
    auto_reorder_alert_enabled: Optional[bool] = None
    momo_network: Optional[str] = None
    momo_account_number: Optional[str] = None
    momo_account_name: Optional[str] = None
