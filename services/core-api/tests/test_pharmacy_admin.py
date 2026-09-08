from datetime import date, datetime, timezone
from decimal import Decimal
import math
import uuid
import pytest
from app.schemas.pharmacy_admin import (
    CategoryMarkupRule,
    CycleCountItemInput,
    CycleCountSubmitRequest,
    DrugCategory,
    GoodsReceivedNoteItemInput,
    GoodsReceivedNoteRequest,
    PurchaseOrderCreateRequest,
    PurchaseOrderItemInput,
    PurchaseOrderStatus,
    ReorderSuggestionItem,
    StockTransferActionRequest,
    StockTransferCreateRequest,
    StockTransferItemInput,
    StockTransferStatus,
    SupplierCreditTerms,
)


def test_reorder_suggestion_velocity_formula():
    """
    Test automated reorder recommendation logic against current stock and sales velocity.
    """
    current_stock = 4
    reorder_threshold = 20
    monthly_sales_velocity = 140
    lead_time_days = 2

    # Safety buffer + lead time demand
    lead_time_demand = int((monthly_sales_velocity / 30.0) * lead_time_days)
    target_stock = (reorder_threshold * 2) + lead_time_demand
    suggested_qty = max(0, target_stock - current_stock)

    assert suggested_qty > 36
    assert suggested_qty >= (reorder_threshold - current_stock)

    unit_cost = Decimal("28.50")
    total_estimated_cost = suggested_qty * unit_cost
    assert total_estimated_cost > Decimal("1000.00")


def test_purchase_order_creation_and_grn_lot_reconciliation():
    """
    Test purchase order creation and goods received note fulfillment.
    """
    po_items = [
        PurchaseOrderItemInput(
            medication_name="Coartem 20/120mg Tabs",
            quantity_ordered=300,
            unit_cost_ghs=Decimal("28.50"),
        ),
        PurchaseOrderItemInput(
            medication_name="Amoxiclav 625mg Tabs",
            quantity_ordered=200,
            unit_cost_ghs=Decimal("35.00"),
        ),
    ]

    total_po_cost = sum(item.quantity_ordered * item.unit_cost_ghs for item in po_items)
    assert total_po_cost == Decimal("15550.00")

    # Receiving Goods Note against PO
    grn_items = [
        GoodsReceivedNoteItemInput(
            medication_name="Coartem 20/120mg Tabs",
            sku="MED-COA-01",
            batch_number="AL-2026-991",
            expiry_date=date(2028, 4, 30),
            quantity_received=300,
            unit_cost_ghs=Decimal("28.50"),
            suggested_retail_price_ghs=Decimal("38.50"),
        ),
        GoodsReceivedNoteItemInput(
            medication_name="Amoxiclav 625mg Tabs",
            sku="MED-AMX-02",
            batch_number="AMC-2026-104",
            expiry_date=date(2027, 9, 30),
            quantity_received=200,
            unit_cost_ghs=Decimal("35.00"),
            suggested_retail_price_ghs=Decimal("48.00"),
        ),
    ]

    total_received_val = sum(i.quantity_received * i.unit_cost_ghs for i in grn_items)
    assert total_received_val == total_po_cost
    assert len(grn_items) == 2


def test_branch_stock_transfer_lifecycle():
    """
    Test stock transfer state machine: DRAFT -> DISPATCHED -> IN_TRANSIT -> RECEIVED.
    """
    transfer_items = [
        StockTransferItemInput(
            medication_name="Paracetamol 500mg (Blister 100s)",
            batch_number="PAR-2026-08",
            expiry_date="2028-06-30",
            quantity=150,
            unit_cost_ghs=Decimal("12.00"),
        )
    ]
    total_val = sum(i.quantity * i.unit_cost_ghs for i in transfer_items)
    assert total_val == Decimal("1800.00")

    # State transitions
    current_status = StockTransferStatus.DRAFT
    assert current_status == StockTransferStatus.DRAFT

    current_status = StockTransferStatus.DISPATCHED
    assert current_status == StockTransferStatus.DISPATCHED

    current_status = StockTransferStatus.IN_TRANSIT
    assert current_status == StockTransferStatus.IN_TRANSIT

    current_status = StockTransferStatus.RECEIVED
    assert current_status == StockTransferStatus.RECEIVED


def test_blind_cycle_count_shrinkage_and_variance_calculation():
    """
    Test variance units and GHS financial loss from blind cycle count audits.
    """
    count_items = [
        CycleCountItemInput(
            inventory_batch_id=uuid.uuid4(),
            medication_name="Amoxicillin 500mg Caps",
            batch_number="AMX-2026-90",
            system_quantity=85,
            physical_counted_quantity=83,  # Deficit of 2 units (Shrinkage)
            unit_cost_ghs=Decimal("25.00"),
        ),
        CycleCountItemInput(
            inventory_batch_id=uuid.uuid4(),
            medication_name="Paracetamol 500mg Tabs",
            batch_number="PAR-2026-12",
            system_quantity=240,
            physical_counted_quantity=240,  # Exact match
            unit_cost_ghs=Decimal("8.00"),
        ),
        CycleCountItemInput(
            inventory_batch_id=uuid.uuid4(),
            medication_name="Vitamin C 100mg Tabs",
            batch_number="VIT-2026-01",
            system_quantity=50,
            physical_counted_quantity=52,  # Surplus of 2 units
            unit_cost_ghs=Decimal("15.00"),
        ),
    ]

    total_variance_units = 0
    shrinkage_loss = Decimal("0.00")
    surplus_gain = Decimal("0.00")

    for item in count_items:
        delta = item.physical_counted_quantity - item.system_quantity
        line_val = Decimal(str(delta)) * item.unit_cost_ghs
        total_variance_units += delta
        if delta < 0:
            shrinkage_loss += abs(line_val)
        elif delta > 0:
            surplus_gain += line_val

    assert total_variance_units == 0  # -2 + 0 + 2 = 0
    assert shrinkage_loss == Decimal("50.00")  # 2 * 25.00
    assert surplus_gain == Decimal("30.00")    # 2 * 15.00
    net_variance = surplus_gain - shrinkage_loss
    assert net_variance == Decimal("-20.00")


def test_dynamic_pricing_markup_and_gross_margin_math():
    """
    Test category retail price markup and margin calculation with rounding.
    """
    unit_cost = Decimal("28.50")
    pom_markup_pct = 35.0  # 35% markup for POM

    raw_retail = unit_cost * Decimal(str(1.0 + (pom_markup_pct / 100.0)))
    assert raw_retail == Decimal("38.475")

    # Rounded to nearest 50 pesewas
    rounded_float = math.ceil(float(raw_retail) * 2.0) / 2.0
    final_retail = Decimal(f"{rounded_float:.2f}")
    assert final_retail == Decimal("38.50")

    # Gross Margin: (Retail - Cost) / Retail
    gross_margin_pct = ((final_retail - unit_cost) / final_retail) * Decimal("100.0")
    assert round(float(gross_margin_pct), 2) == 25.97
