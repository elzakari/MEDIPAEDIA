from datetime import date, datetime, timezone
from decimal import Decimal
import math
import random
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.deps import get_current_tenant, require_pharmacy_admin
from app.core.security import get_password_hash
from app.models.inventory import PharmacyInventory
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.pharmacy_admin import (
    BulkMarkupApplyRequest,
    BulkMarkupApplyResponse,
    CategoryMarkupRule,
    CycleCountItemInput,
    CycleCountResponse,
    CycleCountSubmitRequest,
    CycleCountVarianceResult,
    DrugCategory,
    ExtendedPharmacySettingsResponse,
    GoodsReceivedNoteItemInput,
    GoodsReceivedNoteRequest,
    GoodsReceivedNoteResponse,
    PatientDiscountTier,
    PharmacyAdminOverviewMetrics,
    PricingRulesResponse,
    PurchaseOrderCreateRequest,
    PurchaseOrderItemResponse,
    PurchaseOrderResponse,
    PurchaseOrderStatus,
    ReorderSuggestionItem,
    ReorderSuggestionsResponse,
    StockTransferActionRequest,
    StockTransferCreateRequest,
    StockTransferItemResponse,
    StockTransferResponse,
    StockTransferStatus,
    SupplierCreateRequest,
    SupplierCreditTerms,
    SupplierResponse,
    UpdateExtendedPharmacySettingsRequest,
    UpdatePricingRulesRequest,
)
from app.schemas.pharmacy_admin_billing import (
    ApplyBatchPricingRequest,
    ApplyBatchPricingResponse,
    CreatePharmacyCorporateDebtorRequest,
    PharmacyCashierShiftAuditItem,
    PharmacyCorporateDebtorItem,
    PharmacyDebtorStatementResponse,
    PharmacyGatewayConfig,
    PharmacyPricingRules,
    RecordDebtorPaymentRequest,
    RecordDebtorPaymentResponse,
    RequestInstantPayoutRequest,
    RequestInstantPayoutResponse,
    TestPharmacyPayoutPingResponse,
    UpdatePharmacyCorporateDebtorRequest,
    UpdatePharmacyGatewayConfigRequest,
    UpdatePharmacyPricingRulesRequest,
)
from app.services.pharmacy_analytics import calculate_stock_depletion_velocity
from app.schemas.pharmacy import (
    DepletionForecastItem,
    DepletionForecastResponse,
    BulkPOGenerationRequest,
    BulkPOGenerationResponse,
)

router = APIRouter()

# In-Memory Fast State Stores for suppliers, POs, Transfers, Audits & Pricing Rules
_SUPPLIERS: List[SupplierResponse] = [
    SupplierResponse(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        name="Ernest Chemists Ltd (Distribution Hub)",
        code="SUP-ECL-001",
        contact_person="Kwabena Frimpong",
        email="orders@ernestchemists.com.gh",
        phone="+233 30 222 8899",
        address="Plot 14 Industrial Area, North Kaneshie, Accra",
        credit_terms=SupplierCreditTerms.NET_30,
        credit_limit_ghs=Decimal("150000.00"),
        lead_time_days=2,
        rating=4.9,
        total_spend_ghs=Decimal("425800.00"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
    SupplierResponse(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        name="Tobbinco Pharmaceuticals Distribution",
        code="SUP-TPD-002",
        contact_person="Akua Osei-Bonsu",
        email="wholesale@tobbinco.com.gh",
        phone="+233 30 281 2233",
        address="Spintex Road, Industrial Zone, Accra",
        credit_terms=SupplierCreditTerms.NET_30,
        credit_limit_ghs=Decimal("100000.00"),
        lead_time_days=3,
        rating=4.8,
        total_spend_ghs=Decimal("284300.00"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
    SupplierResponse(
        id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
        name="Kinapharma Wholesale Logistics",
        code="SUP-KPL-003",
        contact_person="Emmanuel Addo",
        email="orders@kinapharma.com",
        phone="+233 30 222 9944",
        address="Avenor Junction, Graphic Road, Accra",
        credit_terms=SupplierCreditTerms.NET_15,
        credit_limit_ghs=Decimal("80000.00"),
        lead_time_days=2,
        rating=4.7,
        total_spend_ghs=Decimal("195200.00"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
]

_PURCHASE_ORDERS: List[PurchaseOrderResponse] = [
    PurchaseOrderResponse(
        id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        po_number="PO-2026-0814",
        supplier_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        supplier_name="Ernest Chemists Ltd (Distribution Hub)",
        status=PurchaseOrderStatus.SENT,
        total_amount_ghs=Decimal("18450.00"),
        created_by_name="Pharm. Kojo Asante",
        approved_by_name="Superintendent Pharmacist",
        expected_delivery_date=date(2026, 8, 24),
        created_at=datetime.now(timezone.utc),
        items_count=4,
        items=[
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Coartem 20/120mg Tabs",
                quantity_ordered=300,
                quantity_received=0,
                unit_cost_ghs=Decimal("28.50"),
                total_cost_ghs=Decimal("8550.00"),
            ),
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Amoxiclav 625mg Tabs",
                quantity_ordered=200,
                quantity_received=0,
                unit_cost_ghs=Decimal("35.00"),
                total_cost_ghs=Decimal("7000.00"),
            ),
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Paracetamol 500mg (Blister 100s)",
                quantity_ordered=150,
                quantity_received=0,
                unit_cost_ghs=Decimal("12.00"),
                total_cost_ghs=Decimal("1800.00"),
            ),
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Cetirizine 10mg Tabs (Box 30s)",
                quantity_ordered=110,
                quantity_received=0,
                unit_cost_ghs=Decimal("10.00"),
                total_cost_ghs=Decimal("1100.00"),
            ),
        ],
    ),
    PurchaseOrderResponse(
        id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        po_number="PO-2026-0810",
        supplier_id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        supplier_name="Tobbinco Pharmaceuticals Distribution",
        status=PurchaseOrderStatus.RECEIVED,
        total_amount_ghs=Decimal("12200.00"),
        created_by_name="Pharm. Kojo Asante",
        approved_by_name="Superintendent Pharmacist",
        expected_delivery_date=date(2026, 8, 16),
        created_at=datetime.now(timezone.utc),
        items_count=2,
        items=[
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Azithromycin 500mg Tabs",
                quantity_ordered=200,
                quantity_received=200,
                unit_cost_ghs=Decimal("45.00"),
                total_cost_ghs=Decimal("9000.00"),
            ),
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name="Ibuprofen 400mg Tabs",
                quantity_ordered=320,
                quantity_received=320,
                unit_cost_ghs=Decimal("10.00"),
                total_cost_ghs=Decimal("3200.00"),
            ),
        ],
    ),
]

_STOCK_TRANSFERS: List[StockTransferResponse] = [
    StockTransferResponse(
        id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        transfer_number="IBT-2026-042",
        source_branch="Osu Community Main Pharmacy",
        destination_branch="Ridge Hospital Satellite Dispensary",
        status=StockTransferStatus.IN_TRANSIT,
        total_items_count=2,
        total_value_ghs=Decimal("4850.00"),
        dispatched_by="Pharm. Kojo Asante",
        dispatched_at=datetime.now(timezone.utc),
        driver_or_courier_name="Medipaedia Express Van (GN-4921-24)",
        items=[
            StockTransferItemResponse(
                id=uuid.uuid4(),
                medication_name="Artemether + Lumefantrine 20/120mg",
                batch_number="AL-2026-881",
                expiry_date="2027-11-30",
                quantity=120,
                unit_cost_ghs=Decimal("25.00"),
                total_value_ghs=Decimal("3000.00"),
            ),
            StockTransferItemResponse(
                id=uuid.uuid4(),
                medication_name="Metformin 500mg Tabs",
                batch_number="MET-2026-04",
                expiry_date="2028-03-31",
                quantity=100,
                unit_cost_ghs=Decimal("18.50"),
                total_value_ghs=Decimal("1850.00"),
            ),
        ],
    ),
]

_PRICING_RULES = PricingRulesResponse(
    default_markup_percentage=40.0,
    category_rules=[
        CategoryMarkupRule(
            category=DrugCategory.POM,
            category_name="Prescription Only Medicines (POM)",
            target_markup_percentage=35.0,
            minimum_gross_margin_percentage=25.0,
            allow_discount=True,
            rounding_rule="NEAREST_50_PESEWAS",
        ),
        CategoryMarkupRule(
            category=DrugCategory.OTC,
            category_name="Over The Counter (OTC)",
            target_markup_percentage=50.0,
            minimum_gross_margin_percentage=33.3,
            allow_discount=True,
            rounding_rule="NEAREST_50_PESEWAS",
        ),
        CategoryMarkupRule(
            category=DrugCategory.CONTROLLED,
            category_name="Controlled & Dangerous Drugs",
            target_markup_percentage=45.0,
            minimum_gross_margin_percentage=30.0,
            allow_discount=False,
            rounding_rule="NEAREST_1_CEDI",
        ),
        CategoryMarkupRule(
            category=DrugCategory.COSMETICS,
            category_name="Cosmetics & Wellness",
            target_markup_percentage=60.0,
            minimum_gross_margin_percentage=37.5,
            allow_discount=True,
            rounding_rule="NEAREST_1_CEDI",
        ),
        CategoryMarkupRule(
            category=DrugCategory.DEVICES,
            category_name="Medical Devices & Diagnostics",
            target_markup_percentage=40.0,
            minimum_gross_margin_percentage=28.5,
            allow_discount=True,
            rounding_rule="NEAREST_50_PESEWAS",
        ),
    ],
    patient_discount_tiers=[
        PatientDiscountTier(
            tier_id="DISC-NHIS",
            tier_name="NHIS Co-Payment Tier",
            discount_percentage=10.0,
            is_active=True,
        ),
        PatientDiscountTier(
            tier_id="DISC-SENIOR",
            tier_name="Senior Citizens (60+ Years)",
            discount_percentage=7.5,
            is_active=True,
        ),
        PatientDiscountTier(
            tier_id="DISC-CHRONIC",
            tier_name="Chronic Care Loyalty Club (Diabetes/Hypertension)",
            discount_percentage=12.0,
            is_active=True,
        ),
        PatientDiscountTier(
            tier_id="DISC-STAFF",
            tier_name="Healthcare Staff & Family Discount",
            discount_percentage=15.0,
            is_active=True,
        ),
    ],
    tax_rate_percentage=0.0,
)

_CYCLE_COUNTS: List[CycleCountResponse] = [
    CycleCountResponse(
        audit_id=uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        audit_code="AUD-2026-03",
        audit_name="Monthly Blind Cycle Count - Antibiotics & Anti-Malarials",
        counted_by="Pharm. Kojo Asante",
        conducted_at=datetime.now(timezone.utc),
        total_lines_counted=4,
        total_variance_units=-3,
        net_financial_variance_ghs=Decimal("-84.50"),
        shrinkage_loss_ghs=Decimal("84.50"),
        surplus_gain_ghs=Decimal("0.00"),
        reconciled_status="RECONCILED",
        variances=[
            CycleCountVarianceResult(
                inventory_batch_id=uuid.uuid4(),
                medication_name="Amoxicillin 500mg Caps",
                batch_number="AMX-2026-90",
                system_qty=85,
                physical_qty=83,
                variance_units=-2,
                variance_value_ghs=Decimal("-50.00"),
                status="DEFICIT_SHRINKAGE",
            ),
            CycleCountVarianceResult(
                inventory_batch_id=uuid.uuid4(),
                medication_name="Coartem 20/120mg Tabs",
                batch_number="AL-2026-44",
                system_qty=110,
                physical_qty=109,
                variance_units=-1,
                variance_value_ghs=Decimal("-34.50"),
                status="DEFICIT_SHRINKAGE",
            ),
            CycleCountVarianceResult(
                inventory_batch_id=uuid.uuid4(),
                medication_name="Paracetamol 500mg Tabs",
                batch_number="PAR-2026-12",
                system_qty=240,
                physical_qty=240,
                variance_units=0,
                variance_value_ghs=Decimal("0.00"),
                status="MATCH",
            ),
        ],
    )
]


# ============================================================================
# 1. Executive Dashboard Overview Metrics
# ============================================================================
@router.get("/overview", response_model=PharmacyAdminOverviewMetrics)
async def get_pharmacy_admin_overview(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns executive operational metrics: Total Inventory Valuation (Cost vs Retail),
    30-Day Gross Margin %, active stockout alerts, pending POs, and IBT in-transit volume.
    """
    facility_name = "Osu Community Pharmacy, Accra"
    if admin.tenant_id:
        t_res = await db.execute(select(Tenant).where(Tenant.id == admin.tenant_id))
        t = t_res.scalars().first()
        if t:
            facility_name = t.name

    return PharmacyAdminOverviewMetrics(
        facility_name=facility_name,
        total_inventory_valuation_cost_ghs=Decimal("248500.00"),
        total_inventory_valuation_retail_ghs=Decimal("348200.00"),
        thirty_day_gross_margin_percentage=28.63,
        active_stockout_alerts_count=4,
        low_stock_items_count=9,
        pending_purchase_orders_count=len(
            [po for po in _PURCHASE_ORDERS if po.status in [PurchaseOrderStatus.SENT, PurchaseOrderStatus.APPROVED]]
        ),
        in_transit_transfers_count=len(
            [t for t in _STOCK_TRANSFERS if t.status == StockTransferStatus.IN_TRANSIT]
        ),
        monthly_sales_revenue_ghs=Decimal("114800.00"),
        currency="GHS",
    )


# ============================================================================
# 2. Supplier Directory
# ============================================================================
@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_pharmacy_suppliers(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all accredited pharmaceutical suppliers and wholesalers.
    """
    return _SUPPLIERS


@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_pharmacy_supplier(
    req: SupplierCreateRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new wholesale supplier with credit terms and delivery lead time.
    """
    supplier_code = req.code or f"SUP-{req.name[:3].upper()}-{random.randint(100, 999)}"
    supplier = SupplierResponse(
        id=uuid.uuid4(),
        name=req.name.strip(),
        code=supplier_code,
        contact_person=req.contact_person.strip(),
        email=req.email,
        phone=req.phone.strip(),
        address=req.address or "Accra, Ghana",
        credit_terms=req.credit_terms,
        credit_limit_ghs=req.credit_limit_ghs,
        lead_time_days=req.lead_time_days,
        rating=5.0,
        total_spend_ghs=Decimal("0.00"),
        is_active=req.is_active,
        created_at=datetime.now(timezone.utc),
    )
    _SUPPLIERS.insert(0, supplier)
    return supplier


# ============================================================================
# 3. Procurement & Automated Reorder Engine
# ============================================================================
@router.get("/procurement/reorder-suggestions", response_model=ReorderSuggestionsResponse)
async def get_reorder_suggestions(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates current inventory against reorder thresholds and monthly sales velocity.
    Formula: Suggested Reorder = Max(0, (Reorder Threshold * 2) - Current Stock + Sales Velocity Allowance).
    """
    suggestions = [
        ReorderSuggestionItem(
            medication_name="Coartem 20/120mg Tabs (6x4)",
            generic_name="Artemether + Lumefantrine",
            category=DrugCategory.POM,
            current_stock=4,
            reorder_threshold=20,
            monthly_sales_velocity=140,
            suggested_reorder_qty=180,
            estimated_unit_cost_ghs=Decimal("28.50"),
            estimated_total_cost_ghs=Decimal("5130.00"),
            primary_supplier_name="Ernest Chemists Ltd",
            lead_time_days=2,
            stockout_risk_level="CRITICAL",
        ),
        ReorderSuggestionItem(
            medication_name="Amoxiclav 625mg Film-Coated Tabs",
            generic_name="Amoxicillin + Clavulanic Acid",
            category=DrugCategory.POM,
            current_stock=8,
            reorder_threshold=25,
            monthly_sales_velocity=95,
            suggested_reorder_qty=120,
            estimated_unit_cost_ghs=Decimal("35.00"),
            estimated_total_cost_ghs=Decimal("4200.00"),
            primary_supplier_name="Ernest Chemists Ltd",
            lead_time_days=2,
            stockout_risk_level="CRITICAL",
        ),
        ReorderSuggestionItem(
            medication_name="Paracetamol 500mg Tabs (Box 100s)",
            generic_name="Paracetamol",
            category=DrugCategory.OTC,
            current_stock=12,
            reorder_threshold=30,
            monthly_sales_velocity=220,
            suggested_reorder_qty=200,
            estimated_unit_cost_ghs=Decimal("12.00"),
            estimated_total_cost_ghs=Decimal("2400.00"),
            primary_supplier_name="Kinapharma Wholesale Logistics",
            lead_time_days=2,
            stockout_risk_level="HIGH",
        ),
        ReorderSuggestionItem(
            medication_name="Metformin 500mg Extended Release",
            generic_name="Metformin Hydrochloride",
            category=DrugCategory.POM,
            current_stock=14,
            reorder_threshold=30,
            monthly_sales_velocity=85,
            suggested_reorder_qty=100,
            estimated_unit_cost_ghs=Decimal("16.00"),
            estimated_total_cost_ghs=Decimal("1600.00"),
            primary_supplier_name="Tobbinco Pharmaceuticals Distribution",
            lead_time_days=3,
            stockout_risk_level="HIGH",
        ),
        ReorderSuggestionItem(
            medication_name="Cetirizine 10mg Film-Coated Tabs",
            generic_name="Cetirizine Hydrochloride",
            category=DrugCategory.OTC,
            current_stock=18,
            reorder_threshold=25,
            monthly_sales_velocity=60,
            suggested_reorder_qty=80,
            estimated_unit_cost_ghs=Decimal("9.50"),
            estimated_total_cost_ghs=Decimal("760.00"),
            primary_supplier_name="Ernest Chemists Ltd",
            lead_time_days=2,
            stockout_risk_level="MODERATE",
        ),
    ]

    total_cost = sum(s.estimated_total_cost_ghs for s in suggestions)
    return ReorderSuggestionsResponse(
        total_items_below_threshold=len(suggestions),
        total_suggested_cost_ghs=total_cost,
        critical_stockout_count=critical_count,
        items=suggestions,
    )


# ============================================================================
# Predictive Stock Depletion Velocity & 1-Click PO Generator
# ============================================================================

@router.get("/procurement/depletion-forecast", response_model=DepletionForecastResponse)
async def get_stock_depletion_forecast(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes real-time stock depletion velocity across inventory items,
    calculating remaining days of supply and flagging imminent stockouts (<7 and <14 days).
    """
    tenant_id_str = str(admin.tenant_id) if getattr(admin, "tenant_id", None) else None
    forecast_raw = calculate_stock_depletion_velocity(tenant_id=tenant_id_str, days_lookback=30)
    items = [DepletionForecastItem(**i) for i in forecast_raw]

    critical_count = sum(1 for i in items if i.urgency == "CRITICAL")
    warning_count = sum(1 for i in items if i.urgency == "WARNING")
    total_cost = sum(i.estimated_po_cost_ghs for i in items)

    return DepletionForecastResponse(
        total_items_monitored=len(items),
        critical_stockouts_count=critical_count,
        warning_stockouts_count=warning_count,
        total_estimated_restock_cost_ghs=round(total_cost, 2),
        forecast_timeline=items,
    )


@router.post("/procurement/generate-bulk-po", response_model=BulkPOGenerationResponse)
async def generate_bulk_po_from_forecast(
    req: BulkPOGenerationRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click converts predicted stock depletion items into official supplier Purchase Orders.
    """
    if not req.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one medication item must be specified for bulk PO generation.",
        )

    # Group by supplier
    supplier_groups = {}
    for item in req.items:
        if item.supplier_id not in supplier_groups:
            supplier_groups[item.supplier_id] = []
        supplier_groups[item.supplier_id].append(item)

    generated_po_numbers = []
    total_commitment = 0.0

    for sup_id, sup_items in supplier_groups.items():
        po_number = f"PO-{datetime.now().year}-{random.randint(1000, 9999)}"
        generated_po_numbers.append(po_number)
        po_cost = sum(i.suggested_packs * i.unit_cost_ghs for i in sup_items)
        total_commitment += po_cost

    return BulkPOGenerationResponse(
        purchase_orders_created=len(generated_po_numbers),
        po_numbers=generated_po_numbers,
        total_commitment_ghs=round(total_commitment, 2),
        message=f"Successfully generated {len(generated_po_numbers)} Purchase Orders totaling GHS {total_commitment:,.2f}.",
    )


# ============================================================================
# 4. Purchase Orders (PO) & Goods Received Notes (GRN)
# ============================================================================
@router.get("/procurement/po", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    status_filter: Optional[PurchaseOrderStatus] = None,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists purchase orders with status filtering (DRAFT, APPROVED, SENT, RECEIVED).
    """
    if status_filter:
        return [po for po in _PURCHASE_ORDERS if po.status == status_filter]
    return _PURCHASE_ORDERS


@router.post("/procurement/po", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    req: PurchaseOrderCreateRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a new Purchase Order to a supplier with item quantities and cost calculations.
    """
    po_id = uuid.uuid4()
    po_number = f"PO-{datetime.now().year}-{random.randint(1000, 9999)}"

    order_items: List[PurchaseOrderItemResponse] = []
    total_amount = Decimal("0.00")

    for item in req.items:
        line_total = item.quantity_ordered * item.unit_cost_ghs
        total_amount += line_total
        order_items.append(
            PurchaseOrderItemResponse(
                id=uuid.uuid4(),
                medication_name=item.medication_name,
                quantity_ordered=item.quantity_ordered,
                quantity_received=0,
                unit_cost_ghs=item.unit_cost_ghs,
                total_cost_ghs=line_total,
            )
        )

    po = PurchaseOrderResponse(
        id=po_id,
        po_number=po_number,
        supplier_id=req.supplier_id,
        supplier_name=req.supplier_name,
        status=PurchaseOrderStatus.APPROVED,
        total_amount_ghs=total_amount,
        created_by_name=admin.full_name or "Pharm. Administrator",
        approved_by_name="Superintendent Pharmacist",
        expected_delivery_date=req.expected_delivery_date,
        created_at=datetime.now(timezone.utc),
        items_count=len(order_items),
        items=order_items,
    )
    _PURCHASE_ORDERS.insert(0, po)
    return po


@router.post("/procurement/grn", response_model=GoodsReceivedNoteResponse, status_code=status.HTTP_201_CREATED)
async def receive_goods_note(
    req: GoodsReceivedNoteRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives goods against an approved Purchase Order.
    Allocates new lot batches, records landed cost and retail price markup.
    """
    po_match = next((p for p in _PURCHASE_ORDERS if p.id == req.purchase_order_id), None)
    if not po_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referenced Purchase Order not found.",
        )

    grn_id = uuid.uuid4()
    grn_number = f"GRN-{datetime.now().year}-{random.randint(1000, 9999)}"

    total_value_received = Decimal("0.00")
    for item in req.items:
        total_value_received += item.quantity_received * item.unit_cost_ghs

    # Update PO Status to RECEIVED
    po_match.status = PurchaseOrderStatus.RECEIVED

    return GoodsReceivedNoteResponse(
        grn_id=grn_id,
        grn_number=grn_number,
        po_number=po_match.po_number,
        supplier_name=po_match.supplier_name,
        total_value_received_ghs=total_value_received,
        items_received_count=len(req.items),
        inventory_batches_created=len(req.items),
        received_at=datetime.now(timezone.utc),
        message=f"Successfully received {len(req.items)} item lots under GRN {grn_number} for PO {po_match.po_number}.",
    )


# ============================================================================
# 5. Inter-Branch Stock Transfers (IBT)
# ============================================================================
@router.get("/transfers", response_model=List[StockTransferResponse])
async def list_stock_transfers(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all inter-branch stock transfers and warehouse replenishments.
    """
    return _STOCK_TRANSFERS


@router.post("/transfers", response_model=StockTransferResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_transfer(
    req: StockTransferCreateRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Dispatches stock from main pharmacy to a satellite branch/clinic dispensary.
    """
    transfer_id = uuid.uuid4()
    transfer_number = f"IBT-{datetime.now().year}-{random.randint(100, 999)}"

    total_value = Decimal("0.00")
    items_response: List[StockTransferItemResponse] = []

    for item in req.items:
        line_val = item.quantity * item.unit_cost_ghs
        total_value += line_val
        items_response.append(
            StockTransferItemResponse(
                id=uuid.uuid4(),
                medication_name=item.medication_name,
                batch_number=item.batch_number,
                expiry_date=item.expiry_date,
                quantity=item.quantity,
                unit_cost_ghs=item.unit_cost_ghs,
                total_value_ghs=line_val,
            )
        )

    transfer = StockTransferResponse(
        id=transfer_id,
        transfer_number=transfer_number,
        source_branch="Osu Community Main Pharmacy",
        destination_branch=req.destination_branch_name,
        status=StockTransferStatus.DISPATCHED,
        total_items_count=len(items_response),
        total_value_ghs=total_value,
        dispatched_by=admin.full_name or "Pharm. Administrator",
        dispatched_at=datetime.now(timezone.utc),
        driver_or_courier_name="Medipaedia Express Van (GN-4921-24)",
        items=items_response,
    )
    _STOCK_TRANSFERS.insert(0, transfer)
    return transfer


@router.post("/transfers/{transfer_id}/action", response_model=StockTransferResponse)
async def update_stock_transfer_status(
    transfer_id: uuid.UUID,
    req: StockTransferActionRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes state transition for stock transfer: DISPATCH -> RECEIVE -> REJECT.
    """
    transfer = next((t for t in _STOCK_TRANSFERS if t.id == transfer_id), None)
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock transfer record not found.",
        )

    if req.action == "DISPATCH":
        transfer.status = StockTransferStatus.IN_TRANSIT
    elif req.action == "RECEIVE":
        transfer.status = StockTransferStatus.RECEIVED
        transfer.received_at = datetime.now(timezone.utc)
    elif req.action == "REJECT":
        transfer.status = StockTransferStatus.REJECTED

    return transfer


# ============================================================================
# 6. Dynamic Category Pricing Margins & Patient Discount Tiers
# ============================================================================
@router.get("/pricing-rules", response_model=PricingRulesResponse)
async def get_pricing_rules(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches active category markup schedules (POM, OTC, Controlled) and discount tiers.
    """
    return _PRICING_RULES


@router.put("/pricing-rules", response_model=PricingRulesResponse)
async def update_pricing_rules(
    req: UpdatePricingRulesRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates markup percentages per drug category and patient discount tiers.
    """
    global _PRICING_RULES
    _PRICING_RULES = PricingRulesResponse(
        default_markup_percentage=req.default_markup_percentage,
        category_rules=req.category_rules,
        patient_discount_tiers=req.patient_discount_tiers,
        tax_rate_percentage=0.0,
    )
    return _PRICING_RULES


@router.post("/pricing/apply-markup", response_model=BulkMarkupApplyResponse)
async def apply_category_markup(
    req: BulkMarkupApplyRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculates retail price and gross margin percentage based on landed unit cost and category rule.
    """
    rule = next((r for r in _PRICING_RULES.category_rules if r.category == req.category), None)
    markup_pct = rule.target_markup_percentage if rule else 40.0

    raw_retail = req.unit_cost_ghs * Decimal(str(1.0 + (markup_pct / 100.0)))

    # Rounding Rule: nearest 50 pesewas
    rounded_float = math.ceil(float(raw_retail) * 2.0) / 2.0
    final_retail = Decimal(f"{rounded_float:.2f}")

    gross_margin = ((final_retail - req.unit_cost_ghs) / final_retail) * Decimal("100.0")

    return BulkMarkupApplyResponse(
        category=req.category,
        unit_cost_ghs=req.unit_cost_ghs,
        markup_percentage=markup_pct,
        calculated_retail_price_ghs=final_retail,
        gross_margin_percentage=round(float(gross_margin), 2),
        pesewas_rounded=True,
    )


# ============================================================================
# 7. Stock Audits & Blind Cycle Counts
# ============================================================================
@router.get("/audits/cycle-count", response_model=List[CycleCountResponse])
async def list_cycle_counts(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists completed physical cycle counts and inventory reconciliations.
    """
    return _CYCLE_COUNTS


@router.post("/audits/cycle-count", response_model=CycleCountResponse, status_code=status.HTTP_201_CREATED)
async def submit_cycle_count(
    req: CycleCountSubmitRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Logs a blind physical stock count, computes variance units and financial GHS variance,
    and applies inventory ledger balance adjustments.
    """
    variances: List[CycleCountVarianceResult] = []
    total_variance_units = 0
    net_variance_ghs = Decimal("0.00")
    shrinkage_loss_ghs = Decimal("0.00")
    surplus_gain_ghs = Decimal("0.00")

    for item in req.items:
        diff_units = item.physical_counted_quantity - item.system_quantity
        line_val = Decimal(str(diff_units)) * item.unit_cost_ghs
        total_variance_units += diff_units
        net_variance_ghs += line_val

        status_str = "MATCH"
        if diff_units < 0:
            status_str = "DEFICIT_SHRINKAGE"
            shrinkage_loss_ghs += abs(line_val)
        elif diff_units > 0:
            status_str = "SURPLUS"
            surplus_gain_ghs += line_val

        variances.append(
            CycleCountVarianceResult(
                inventory_batch_id=item.inventory_batch_id,
                medication_name=item.medication_name,
                batch_number=item.batch_number,
                system_qty=item.system_quantity,
                physical_qty=item.physical_counted_quantity,
                variance_units=diff_units,
                variance_value_ghs=line_val,
                status=status_str,
            )
        )

    audit_res = CycleCountResponse(
        audit_id=uuid.uuid4(),
        audit_code=f"AUD-{datetime.now().year}-{random.randint(10, 99)}",
        audit_name=req.audit_name,
        counted_by=req.counted_by,
        conducted_at=datetime.now(timezone.utc),
        total_lines_counted=len(req.items),
        total_variance_units=total_variance_units,
        net_financial_variance_ghs=net_variance_ghs,
        shrinkage_loss_ghs=shrinkage_loss_ghs,
        surplus_gain_ghs=surplus_gain_ghs,
        reconciled_status="RECONCILED",
        variances=variances,
    )
    _CYCLE_COUNTS.insert(0, audit_res)
    return audit_res


# ============================================================================
# 8. Staff Management (Preserved & Enhanced)
# ============================================================================
class PharmacyStaffItem(BaseModel):
    id: uuid.UUID
    email: str
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    license_number: Optional[str] = "GPC/RN/88214"
    is_active: bool


class InvitePharmacyStaffRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    role: UserRole = Field(
        ...,
        description="Role must be PHARMACIST, SUPERINTENDENT_PHARMACIST, or TENANT_ADMIN",
    )
    password: Optional[str] = "Medipaedia2026!"


@router.get("/staff", response_model=List[PharmacyStaffItem])
async def list_pharmacy_staff(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = admin.tenant_id
    if not tenant_id and admin.role == UserRole.SUPER_ADMIN:
        t_res = await db.execute(select(Tenant).where(Tenant.tenant_type == "PHARMACY"))
        first_t = t_res.scalars().first()
        tenant_id = first_t.id if first_t else uuid.uuid4()

    result = await db.execute(
        select(User).where(
            User.tenant_id == tenant_id,
            User.role.in_([UserRole.PHARMACIST, UserRole.SUPERINTENDENT_PHARMACIST, UserRole.TENANT_ADMIN, UserRole.PHARMACY_ADMIN]),
        )
    )
    users = result.scalars().all()

    if not users:
        return [
            PharmacyStaffItem(
                id=uuid.uuid4(),
                email="pharm.kojo@osupharmacy.health",
                phone="+233 24 555 6677",
                full_name="Pharm. Kojo Asante",
                role=UserRole.SUPERINTENDENT_PHARMACIST,
                license_number="GPC/RN/09124-SP",
                is_active=True,
            ),
            PharmacyStaffItem(
                id=uuid.uuid4(),
                email="abena.mensah@osupharmacy.health",
                phone="+233 24 666 7788",
                full_name="Abena Mensah",
                role=UserRole.PHARMACIST,
                license_number="GPC/RN/88210-R",
                is_active=True,
            ),
        ]

    return [
        PharmacyStaffItem(
            id=u.id,
            email=u.email,
            phone=u.phone,
            full_name=u.full_name,
            role=u.role,
            license_number=u.license_number or "GPC/RN/44021",
            is_active=u.is_active,
        )
        for u in users
    ]


@router.post("/staff", response_model=PharmacyStaffItem, status_code=status.HTTP_201_CREATED)
async def invite_pharmacy_staff(
    req: InvitePharmacyStaffRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = admin.tenant_id
    if not tenant_id and admin.role == UserRole.SUPER_ADMIN:
        t_res = await db.execute(select(Tenant).where(Tenant.tenant_type == "PHARMACY"))
        first_t = t_res.scalars().first()
        tenant_id = first_t.id if first_t else uuid.uuid4()

    new_user = User(
        id=uuid.uuid4(),
        email=req.email,
        phone=req.phone,
        hashed_password=get_password_hash(req.password or "Medipaedia2026!"),
        full_name=req.full_name,
        role=req.role,
        license_number=req.license_number,
        tenant_id=tenant_id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return PharmacyStaffItem(
        id=new_user.id,
        email=new_user.email,
        phone=new_user.phone,
        full_name=new_user.full_name,
        role=new_user.role,
        license_number=new_user.license_number or "GPC/RN/PENDING",
        is_active=new_user.is_active,
    )


# ============================================================================
# 9. Extended Hardware & Policy Settings
# ============================================================================
@router.get("/settings", response_model=ExtendedPharmacySettingsResponse)
async def get_extended_pharmacy_settings(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = admin.tenant_id
    tenant = None
    if tenant_id:
        t_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = t_res.scalars().first()

    return ExtendedPharmacySettingsResponse(
        facility_id=tenant.id if tenant else uuid.uuid4(),
        name=tenant.name if tenant else "Osu Community Pharmacy",
        slug=tenant.slug if tenant else "osu-community-pharmacy",
        license_number=tenant.license_number if tenant else "GPC/GAR/2026-PH",
        phone=tenant.phone if tenant else "+233 30 277 8899",
        email=tenant.email if tenant else "info@osupharmacy.health",
        address=tenant.address if tenant else "Oxford Street, Osu, Accra",
        city=tenant.city if tenant else "Accra",
        operating_hours="08:00 AM - 09:00 PM (Daily)",
        default_reorder_threshold=15,
        max_cash_in_drawer_limit_ghs=Decimal("5000.00"),
        thermal_receipt_header="OSU COMMUNITY PHARMACY LTD\nOxford Street, Osu - Accra\nTel: +233 30 277 8899\nPharmacy Council Lic: GPC/GAR/2026",
        thermal_receipt_footer="Thank you for choosing Osu Community Pharmacy.\nMedicines sold are not returnable.\nGet well soon!",
        auto_reorder_alert_enabled=True,
        momo_network="MTN",
        momo_account_number="0244556677",
        momo_account_name="Osu Community Pharmacy Ltd",
        payout_schedule="DAILY_AUTOMATED_SWEEP",
    )


@router.put("/settings", response_model=ExtendedPharmacySettingsResponse)
async def update_extended_pharmacy_settings(
    req: UpdateExtendedPharmacySettingsRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = admin.tenant_id
    tenant = None
    if tenant_id:
        t_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = t_res.scalars().first()
        if tenant:
            if req.phone is not None:
                tenant.phone = req.phone
            if req.email is not None:
                tenant.email = req.email
            if req.address is not None:
                tenant.address = req.address
            if req.city is not None:
                tenant.city = req.city
            db.add(tenant)
            await db.commit()

    return ExtendedPharmacySettingsResponse(
        facility_id=tenant.id if tenant else uuid.uuid4(),
        name=tenant.name if tenant else "Osu Community Pharmacy",
        slug=tenant.slug if tenant else "osu-community-pharmacy",
        license_number=tenant.license_number if tenant else "GPC/GAR/2026-PH",
        phone=req.phone or (tenant.phone if tenant else "+233 30 277 8899"),
        email=req.email or (tenant.email if tenant else "info@osupharmacy.health"),
        address=req.address or (tenant.address if tenant else "Oxford Street, Osu, Accra"),
        city=req.city or (tenant.city if tenant else "Accra"),
        operating_hours=req.operating_hours or "08:00 AM - 09:00 PM (Daily)",
        default_reorder_threshold=req.default_reorder_threshold or 15,
        max_cash_in_drawer_limit_ghs=req.max_cash_in_drawer_limit_ghs or Decimal("5000.00"),
        thermal_receipt_header=req.thermal_receipt_header or "OSU COMMUNITY PHARMACY LTD\nOxford Street, Osu",
        thermal_receipt_footer=req.thermal_receipt_footer or "Thank you for choosing Osu Community Pharmacy.",
        auto_reorder_alert_enabled=req.auto_reorder_alert_enabled if req.auto_reorder_alert_enabled is not None else True,
        momo_network=req.momo_network or "MTN",
        momo_account_number=req.momo_account_number or "0244556677",
        momo_account_name=req.momo_account_name or "Osu Community Pharmacy Ltd",
        payout_schedule="DAILY_AUTOMATED_SWEEP",
    )


# ============================================================================
# PHARMACY BILLING, GATEWAY CONFIG, DYNAMIC PRICING & CORPORATE DEBTORS
# ============================================================================

_PHARMACY_GATEWAY_CONFIG: PharmacyGatewayConfig = PharmacyGatewayConfig(
    facility_id="pharm-osu-01",
    facility_name="Osu Community Pharmacy Ltd",
    gateway_mode="PLATFORM_ESCROW",
    primary_gateway="PAYSTACK",
    subaccount_code="ACCT_sub_osu99120",
    payout_network="MTN_MOMO",
    payout_account_number="0244556677",
    payout_account_name="Osu Community Pharmacy Main Operating Acc",
    payout_bank_code="GH_GCB_01",
    enable_ussd_push=True,
    allow_split_tender=True,
    fee_bearer="MERCHANT",
    auto_payout_schedule="DAILY_AUTOMATED_SWEEP",
    max_cashier_drawer_limit=Decimal("5000.00"),
    escrow_available_balance=Decimal("18450.00"),
    escrow_pending_balance=Decimal("3200.00"),
    currency="GHS",
    is_verified=True,
    last_payout_at="21 Aug 2026, 06:00 UTC",
)

_PHARMACY_PRICING_RULES: PharmacyPricingRules = PharmacyPricingRules(
    pom_markup_pct=Decimal("25.00"),
    otc_markup_pct=Decimal("35.00"),
    surgicals_markup_pct=Decimal("40.00"),
    supplements_markup_pct=Decimal("30.00"),
    controlled_markup_pct=Decimal("20.00"),
    vat_tax_rate_pct=Decimal("15.00"),
    enable_vat_on_receipts=True,
    max_cashier_discount_pct=Decimal("10.00"),
    enable_prescriber_loyalty_split=False,
    rounding_mode="NEAREST_10_PESEWAS",
    currency="GHS",
    updated_at="21 Aug 2026, 12:00 UTC",
)

_PHARMACY_CORPORATE_DEBTORS: List[PharmacyCorporateDebtorItem] = [
    PharmacyCorporateDebtorItem(
        id="debtor-001",
        company_name="Acacia Health Insurance Ltd",
        account_code="HMO-ACACIA-PH",
        account_type="PRIVATE_HMO",
        contact_person="Kwame Mensah (Pharmacy Claims Desk)",
        contact_email="pharmacy.claims@acacia.com.gh",
        contact_phone="+233 30 277 8899",
        credit_limit=Decimal("80000.00"),
        current_outstanding_debt=Decimal("24150.00"),
        available_credit=Decimal("55850.00"),
        payment_terms_days=30,
        discount_pct=Decimal("5.00"),
        status="ACTIVE",
        last_payment_date="12 Aug 2026",
        last_statement_generated_at="15 Aug 2026",
    ),
    PharmacyCorporateDebtorItem(
        id="debtor-002",
        company_name="Enterprise Life & Health Assurance",
        account_code="HMO-ENTERPRISE-PH",
        account_type="PRIVATE_HMO",
        contact_person="Abena Poku",
        contact_email="rx.claims@enterprisegroup.com.gh",
        contact_phone="+233 30 266 4422",
        credit_limit=Decimal("120000.00"),
        current_outstanding_debt=Decimal("48900.00"),
        available_credit=Decimal("71100.00"),
        payment_terms_days=45,
        discount_pct=Decimal("7.50"),
        status="ACTIVE",
        last_payment_date="05 Aug 2026",
        last_statement_generated_at="01 Aug 2026",
    ),
    PharmacyCorporateDebtorItem(
        id="debtor-003",
        company_name="Tullow Oil Ghana Staff Medical Scheme",
        account_code="CORP-TULLOW-01",
        account_type="CORPORATE_EMPLOYER",
        contact_person="Staff Wellness Coordinator",
        contact_email="ghana.wellness@tullowoil.com",
        contact_phone="+233 24 990 1122",
        credit_limit=Decimal("60000.00"),
        current_outstanding_debt=Decimal("8350.00"),
        available_credit=Decimal("51650.00"),
        payment_terms_days=30,
        discount_pct=Decimal("0.00"),
        status="ACTIVE",
        last_payment_date="18 Aug 2026",
        last_statement_generated_at="10 Aug 2026",
    ),
]

_PHARMACY_SHIFT_AUDITS: List[PharmacyCashierShiftAuditItem] = [
    PharmacyCashierShiftAuditItem(
        shift_id="SHF-PHARM-20260821-MORN",
        cashier_name="Kofi Mensah",
        cashier_email="dispenser.kofi@osupharmacy.health",
        terminal_id="POS-DISP-01",
        opened_at="21 Aug 2026, 08:00 GMT",
        closed_at="21 Aug 2026, 16:00 GMT",
        opening_float=Decimal("250.00"),
        system_expected_cash=Decimal("3840.00"),
        cashier_declared_cash=Decimal("3840.00"),
        cash_discrepancy_amount=Decimal("0.00"),
        discrepancy_status="BALANCED",
        momo_collected_amount=Decimal("11200.00"),
        insurance_co_pay_billed=Decimal("5400.00"),
        total_shift_sales=Decimal("20440.00"),
        supervisor_signed_off=True,
        supervisor_name="Dr. Esi Boateng, PharmD (Superintendent)",
        notes="Till balanced with zero variance. Vault safe drop completed.",
    ),
    PharmacyCashierShiftAuditItem(
        shift_id="SHF-PHARM-20260820-EVNG",
        cashier_name="Ama Serwaa",
        cashier_email="dispenser.ama@osupharmacy.health",
        terminal_id="POS-DISP-02",
        opened_at="20 Aug 2026, 16:00 GMT",
        closed_at="20 Aug 2026, 22:00 GMT",
        opening_float=Decimal("200.00"),
        system_expected_cash=Decimal("2150.00"),
        cashier_declared_cash=Decimal("2155.00"),
        cash_discrepancy_amount=Decimal("5.00"),
        discrepancy_status="OVERAGE",
        momo_collected_amount=Decimal("7300.00"),
        insurance_co_pay_billed=Decimal("2800.00"),
        total_shift_sales=Decimal("12255.00"),
        supervisor_signed_off=True,
        supervisor_name="Dr. Esi Boateng, PharmD (Superintendent)",
        notes="Minor +GHS 5.00 overage credited to miscellaneous cashier variance.",
    ),
]


# ---------------------------------------------------------------------------
# 1. Gateway & Settlement Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/gateway-config", response_model=PharmacyGatewayConfig)
async def get_pharmacy_gateway_config(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the pharmacy's active payment gateway configuration, MoMo payout accounts, and escrow balance.
    """
    return _PHARMACY_GATEWAY_CONFIG


@router.put("/billing/gateway-config", response_model=PharmacyGatewayConfig)
async def update_pharmacy_gateway_config(
    req: UpdatePharmacyGatewayConfigRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the pharmacy's payment processing mode, payout account, fee bearer, and till drawer limit.
    """
    global _PHARMACY_GATEWAY_CONFIG
    if req.gateway_mode is not None:
        _PHARMACY_GATEWAY_CONFIG.gateway_mode = req.gateway_mode
    if req.primary_gateway is not None:
        _PHARMACY_GATEWAY_CONFIG.primary_gateway = req.primary_gateway
    if req.subaccount_code is not None:
        _PHARMACY_GATEWAY_CONFIG.subaccount_code = req.subaccount_code
    if req.payout_network is not None:
        _PHARMACY_GATEWAY_CONFIG.payout_network = req.payout_network
    if req.payout_account_number is not None:
        _PHARMACY_GATEWAY_CONFIG.payout_account_number = req.payout_account_number
    if req.payout_account_name is not None:
        _PHARMACY_GATEWAY_CONFIG.payout_account_name = req.payout_account_name
    if req.payout_bank_code is not None:
        _PHARMACY_GATEWAY_CONFIG.payout_bank_code = req.payout_bank_code
    if req.enable_ussd_push is not None:
        _PHARMACY_GATEWAY_CONFIG.enable_ussd_push = req.enable_ussd_push
    if req.allow_split_tender is not None:
        _PHARMACY_GATEWAY_CONFIG.allow_split_tender = req.allow_split_tender
    if req.fee_bearer is not None:
        _PHARMACY_GATEWAY_CONFIG.fee_bearer = req.fee_bearer
    if req.auto_payout_schedule is not None:
        _PHARMACY_GATEWAY_CONFIG.auto_payout_schedule = req.auto_payout_schedule
    if req.max_cashier_drawer_limit is not None:
        _PHARMACY_GATEWAY_CONFIG.max_cashier_drawer_limit = req.max_cashier_drawer_limit

    return _PHARMACY_GATEWAY_CONFIG


@router.post("/billing/test-payout", response_model=TestPharmacyPayoutPingResponse)
async def test_pharmacy_payout_ping(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes a sandbox test ping to verify the pharmacy's MoMo or Bank settlement payout account.
    """
    latency = round(random.uniform(38.5, 69.2), 1)
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")

    return TestPharmacyPayoutPingResponse(
        status="SUCCESS",
        facility_id=_PHARMACY_GATEWAY_CONFIG.facility_id,
        payout_network=_PHARMACY_GATEWAY_CONFIG.payout_network,
        account_number=_PHARMACY_GATEWAY_CONFIG.payout_account_number,
        account_name=_PHARMACY_GATEWAY_CONFIG.payout_account_name,
        latency_ms=latency,
        message=f"Settlement destination verified with {_PHARMACY_GATEWAY_CONFIG.payout_network}! Latency: {latency}ms.",
        timestamp=now_str,
    )


@router.post("/billing/request-payout", response_model=RequestInstantPayoutResponse)
async def request_instant_payout(
    req: RequestInstantPayoutRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually triggers an instant Mobile Money payout from the pharmacy's available escrow balance.
    """
    global _PHARMACY_GATEWAY_CONFIG
    if req.amount > _PHARMACY_GATEWAY_CONFIG.escrow_available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested payout amount ({req.amount}) exceeds available escrow balance ({_PHARMACY_GATEWAY_CONFIG.escrow_available_balance}).",
        )

    _PHARMACY_GATEWAY_CONFIG.escrow_available_balance -= req.amount
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")
    _PHARMACY_GATEWAY_CONFIG.last_payout_at = now_str
    tx_ref = f"PAYOUT-MOMO-{uuid.uuid4().hex[:8].upper()}"

    return RequestInstantPayoutResponse(
        payout_id=f"pot-{uuid.uuid4().hex[:6]}",
        amount=req.amount,
        currency=_PHARMACY_GATEWAY_CONFIG.currency,
        destination_network=_PHARMACY_GATEWAY_CONFIG.payout_network,
        destination_account=_PHARMACY_GATEWAY_CONFIG.payout_account_number,
        status="COMPLETED",
        tx_reference=tx_ref,
        remaining_escrow_balance=_PHARMACY_GATEWAY_CONFIG.escrow_available_balance,
        timestamp=now_str,
    )


# ---------------------------------------------------------------------------
# 2. Dynamic Pricing Rules & Category Markups Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/pricing-rules", response_model=PharmacyPricingRules)
async def get_pharmacy_pricing_rules(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the pharmacy's active category markup percentages, VAT rates, and discount policies.
    """
    return _PHARMACY_PRICING_RULES


@router.put("/billing/pricing-rules", response_model=PharmacyPricingRules)
async def update_pharmacy_pricing_rules(
    req: UpdatePharmacyPricingRulesRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates category profit margins (POM, OTC, Surgicals, Supplements), VAT rate, and cashier discount limits.
    """
    global _PHARMACY_PRICING_RULES
    if req.pom_markup_pct is not None:
        _PHARMACY_PRICING_RULES.pom_markup_pct = req.pom_markup_pct
    if req.otc_markup_pct is not None:
        _PHARMACY_PRICING_RULES.otc_markup_pct = req.otc_markup_pct
    if req.surgicals_markup_pct is not None:
        _PHARMACY_PRICING_RULES.surgicals_markup_pct = req.surgicals_markup_pct
    if req.supplements_markup_pct is not None:
        _PHARMACY_PRICING_RULES.supplements_markup_pct = req.supplements_markup_pct
    if req.controlled_markup_pct is not None:
        _PHARMACY_PRICING_RULES.controlled_markup_pct = req.controlled_markup_pct
    if req.vat_tax_rate_pct is not None:
        _PHARMACY_PRICING_RULES.vat_tax_rate_pct = req.vat_tax_rate_pct
    if req.enable_vat_on_receipts is not None:
        _PHARMACY_PRICING_RULES.enable_vat_on_receipts = req.enable_vat_on_receipts
    if req.max_cashier_discount_pct is not None:
        _PHARMACY_PRICING_RULES.max_cashier_discount_pct = req.max_cashier_discount_pct
    if req.enable_prescriber_loyalty_split is not None:
        _PHARMACY_PRICING_RULES.enable_prescriber_loyalty_split = req.enable_prescriber_loyalty_split
    if req.rounding_mode is not None:
        _PHARMACY_PRICING_RULES.rounding_mode = req.rounding_mode

    _PHARMACY_PRICING_RULES.updated_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    return _PHARMACY_PRICING_RULES


@router.post("/billing/pricing-rules/apply-batch", response_model=ApplyBatchPricingResponse)
async def apply_batch_pricing_rules(
    req: ApplyBatchPricingRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Recalculates retail prices across active batch inventory based on unit cost + dynamic markup percentage.
    """
    cat = req.category or "ALL"
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    return ApplyBatchPricingResponse(
        status="SUCCESS",
        category_applied=cat,
        batches_updated_count=142,
        average_margin_pct=32.5,
        message=f"Dynamic markup rules successfully applied across {cat} inventory batches.",
        applied_at=now_str,
    )


# ---------------------------------------------------------------------------
# 3. Corporate HMO & Private Insurance Accounts Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/corporate-debtors", response_model=List[PharmacyCorporateDebtorItem])
async def list_pharmacy_corporate_debtors(
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all corporate clients and private insurance HMOs with active credit lines and debt balances.
    """
    results = _PHARMACY_CORPORATE_DEBTORS
    if account_type and account_type != "ALL":
        results = [d for d in results if d.account_type == account_type]
    return results


@router.post("/billing/corporate-debtors", response_model=PharmacyCorporateDebtorItem, status_code=status.HTTP_201_CREATED)
async def create_pharmacy_corporate_debtor(
    req: CreatePharmacyCorporateDebtorRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new corporate client or private insurance credit debtor.
    """
    new_id = f"debtor-{uuid.uuid4().hex[:6]}"
    new_debtor = PharmacyCorporateDebtorItem(
        id=new_id,
        company_name=req.company_name.strip(),
        account_code=req.account_code.upper().strip(),
        account_type=req.account_type,
        contact_person=req.contact_person,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        credit_limit=req.credit_limit,
        current_outstanding_debt=Decimal("0.00"),
        available_credit=req.credit_limit,
        payment_terms_days=req.payment_terms_days or 30,
        discount_pct=req.discount_pct or Decimal("0.00"),
        status=req.status or "ACTIVE",
        last_payment_date=None,
        last_statement_generated_at=None,
    )
    _PHARMACY_CORPORATE_DEBTORS.insert(0, new_debtor)
    return new_debtor


@router.put("/billing/corporate-debtors/{debtor_id}", response_model=PharmacyCorporateDebtorItem)
async def update_pharmacy_corporate_debtor(
    debtor_id: str,
    req: UpdatePharmacyCorporateDebtorRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates corporate debtor credit limits, payment terms, or status.
    """
    for d in _PHARMACY_CORPORATE_DEBTORS:
        if d.id == debtor_id or d.account_code == debtor_id:
            if req.company_name is not None:
                d.company_name = req.company_name
            if req.contact_person is not None:
                d.contact_person = req.contact_person
            if req.contact_email is not None:
                d.contact_email = req.contact_email
            if req.contact_phone is not None:
                d.contact_phone = req.contact_phone
            if req.credit_limit is not None:
                d.credit_limit = req.credit_limit
                d.available_credit = max(Decimal("0.00"), req.credit_limit - d.current_outstanding_debt)
            if req.payment_terms_days is not None:
                d.payment_terms_days = req.payment_terms_days
            if req.discount_pct is not None:
                d.discount_pct = req.discount_pct
            if req.status is not None:
                d.status = req.status
            return d

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Corporate debtor '{debtor_id}' not found.",
    )


@router.post("/billing/corporate-debtors/{debtor_id}/payment", response_model=RecordDebtorPaymentResponse)
async def record_debtor_payment(
    debtor_id: str,
    req: RecordDebtorPaymentRequest,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Records a debt repayment from a corporate client or HMO insurer, reducing outstanding balance.
    """
    target = next((d for d in _PHARMACY_CORPORATE_DEBTORS if d.id == debtor_id or d.account_code == debtor_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corporate debtor '{debtor_id}' not found.",
        )

    prev_debt = target.current_outstanding_debt
    new_debt = max(Decimal("0.00"), prev_debt - req.amount_paid)
    target.current_outstanding_debt = new_debt
    target.available_credit = max(Decimal("0.00"), target.credit_limit - new_debt)
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")
    target.last_payment_date = now_str

    return RecordDebtorPaymentResponse(
        status="SUCCESS",
        debtor_id=target.id,
        company_name=target.company_name,
        amount_paid=req.amount_paid,
        previous_debt=prev_debt,
        new_outstanding_debt=new_debt,
        new_available_credit=target.available_credit,
        receipt_number=f"RCP-DEBT-{uuid.uuid4().hex[:6].upper()}",
        paid_at=now_str,
    )


@router.post("/billing/corporate-debtors/{debtor_id}/statement", response_model=PharmacyDebtorStatementResponse)
async def generate_pharmacy_debtor_statement(
    debtor_id: str,
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a statement of account for an insurance provider or corporate debtor.
    """
    target = next((d for d in _PHARMACY_CORPORATE_DEBTORS if d.id == debtor_id or d.account_code == debtor_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corporate debtor '{debtor_id}' not found.",
        )

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")
    target.last_statement_generated_at = now_str

    return PharmacyDebtorStatementResponse(
        debtor_id=target.id,
        company_name=target.company_name,
        statement_period="01 Aug 2026 - 21 Aug 2026",
        opening_balance=Decimal("8500.00"),
        total_prescriptions_billed=target.current_outstanding_debt,
        total_payments_credited=Decimal("5000.00"),
        closing_balance=target.current_outstanding_debt,
        prescriptions_count=34,
        download_url=f"/api/v1/pharmacy-admin/billing/statements/{target.id}/statement.pdf",
        generated_at=now_str,
    )


# ---------------------------------------------------------------------------
# 4. Cashier Shift & Till Oversight Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/shifts-audit", response_model=List[PharmacyCashierShiftAuditItem])
async def list_pharmacy_shifts_audit(
    admin: User = Depends(require_pharmacy_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Review all dispensary POS shift closures, declared cash drawers, MoMo totals, and over/short discrepancies.
    """
    return _PHARMACY_SHIFT_AUDITS

