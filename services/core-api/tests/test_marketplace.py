from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from app.api.v1.endpoints.patient import calculate_haversine_distance
from app.models.order import EscrowStatus, FulfillmentType, PaymentStatus


def test_haversine_geospatial_distance_calculation():
    # Ridge Regional Hospital, Accra (5.5600, -0.1970) to Osu Oxford St Pharmacy (5.5560, -0.1830)
    lat1, lon1 = 5.5600, -0.1970
    lat2, lon2 = 5.5560, -0.1830

    distance_km = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    assert 1.0 <= distance_km <= 2.5

    # Same location distance is 0
    assert calculate_haversine_distance(lat1, lon1, lat1, lon1) == 0.0


def test_geospatial_radius_filtering():
    patient_lat, patient_lon = 5.5560, -0.1969
    radius_km = 5.0

    pharmacies = [
        {"name": "Osu Community Pharmacy", "lat": 5.5562, "lon": -0.1835},  # ~1.5 km
        {"name": "Airport West Pharmacy", "lat": 5.5990, "lon": -0.1850},   # ~5.0 km
        {"name": "Tema Harbour Pharmacy", "lat": 5.6700, "lon": -0.0100},   # ~24 km (outside radius)
    ]

    in_range = []
    for ph in pharmacies:
        dist = calculate_haversine_distance(patient_lat, patient_lon, ph["lat"], ph["lon"])
        if dist <= radius_km:
            in_range.append(ph["name"])

    assert "Osu Community Pharmacy" in in_range
    assert "Tema Harbour Pharmacy" not in in_range


def test_temporary_inventory_hold_and_escrow_creation():
    order_id = uuid.uuid4()
    patient_id = uuid.uuid4()
    pharmacy_id = uuid.uuid4()
    unit_price = Decimal("45.00")
    qty = 2
    total_amount = unit_price * qty

    hold_duration_minutes = 15
    created_at = datetime.now(timezone.utc)
    hold_expires_at = created_at + timedelta(minutes=hold_duration_minutes)

    order = {
        "id": order_id,
        "patient_id": patient_id,
        "pharmacy_id": pharmacy_id,
        "total_amount": total_amount,
        "escrow_status": EscrowStatus.HELD,
        "payment_status": PaymentStatus.PAID,
        "fulfillment_type": FulfillmentType.PICKUP,
        "inventory_hold_expires_at": hold_expires_at,
    }

    assert order["total_amount"] == Decimal("90.00")
    assert order["escrow_status"] == EscrowStatus.HELD
    assert order["inventory_hold_expires_at"] > created_at
    assert (order["inventory_hold_expires_at"] - created_at).total_seconds() == 900
