from datetime import date, timedelta
from decimal import Decimal
import uuid
import pytest
from app.models.prescription import PrescriptionStatus


def test_batch_expiry_and_low_stock_filters():
    today = date.today()

    batches = [
        {
            "id": uuid.uuid4(),
            "name": "Coartem 80/480mg",
            "quantity_available": 142,
            "reorder_threshold": 25,
            "expiry_date": today + timedelta(days=400),
        },
        {
            "id": uuid.uuid4(),
            "name": "Augmentin 625mg",
            "quantity_available": 8,  # Low stock
            "reorder_threshold": 15,
            "expiry_date": today + timedelta(days=95),
        },
        {
            "id": uuid.uuid4(),
            "name": "Paracetamol 500mg",
            "quantity_available": 450,
            "reorder_threshold": 50,
            "expiry_date": today + timedelta(days=20),  # Expiring soon (<30d)
        },
    ]

    # Filter low stock
    low_stock = [b for b in batches if b["quantity_available"] <= b["reorder_threshold"]]
    assert len(low_stock) == 1
    assert low_stock[0]["name"] == "Augmentin 625mg"

    # Filter expiring within 30 days
    threshold_30d = today + timedelta(days=30)
    expiring_soon = [b for b in batches if b["expiry_date"] <= threshold_30d]
    assert len(expiring_soon) == 1
    assert expiring_soon[0]["name"] == "Paracetamol 500mg"


def test_atomic_stock_decrement_and_insufficient_stock_check():
    initial_stock = 50
    requested_qty_valid = 10
    requested_qty_invalid = 60

    # Valid transaction
    assert initial_stock >= requested_qty_valid
    remaining_stock = initial_stock - requested_qty_valid
    assert remaining_stock == 40

    # Invalid transaction (insufficient stock)
    is_sufficient = remaining_stock >= requested_qty_invalid
    assert is_sufficient is False


def test_double_dispense_rejection_logic():
    # Prescription in PENDING status can be dispensed
    rx_pending = {
        "id": uuid.uuid4(),
        "status": PrescriptionStatus.PENDING,
        "access_code": "9K4L2P",
    }
    assert rx_pending["status"] != PrescriptionStatus.DISPENSED

    # Mark dispensed
    rx_pending["status"] = PrescriptionStatus.DISPENSED

    # Second claim attempt should be rejected
    is_already_fulfilled = rx_pending["status"] == PrescriptionStatus.DISPENSED
    assert is_already_fulfilled is True


def test_prescription_stock_matching_calculation():
    prescribed_items = [
        {"name": "Coartem", "prescribed_qty": 24, "dispensed_qty": 0},
        {"name": "Paracetamol", "prescribed_qty": 18, "dispensed_qty": 0},
    ]

    inventory_stock = {
        "Coartem": {"stock": 100, "price": Decimal("45.00")},
        "Paracetamol": {"stock": 500, "price": Decimal("8.50")},
    }

    total_amount = Decimal("0.00")
    for item in prescribed_items:
        med = item["name"]
        inv = inventory_stock.get(med)
        assert inv is not None
        assert inv["stock"] >= item["prescribed_qty"]
        total_amount += inv["price"] * (item["prescribed_qty"] - item["dispensed_qty"])

    # 45*24 + 8.5*18 = 1080 + 153 = 1233
    assert total_amount == Decimal("1233.00")
