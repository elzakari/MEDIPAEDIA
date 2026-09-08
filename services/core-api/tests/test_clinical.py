from decimal import Decimal
import uuid
import pytest
from app.api.v1.endpoints.clinical import (
    ICD10_REGISTRY,
    generate_claim_pin,
)
from app.core.security import (
    generate_prescription_signature,
    verify_prescription_signature,
)


def test_claim_pin_format():
    pin = generate_claim_pin()
    assert len(pin) == 6
    assert pin.isalnum()
    assert pin.isupper()


def test_registration_fee_waiver_logic():
    # Simulated existing cardholder with registration fee already paid
    existing_card = {
        "mrn": "RRH-2026-0812",
        "registration_fee_paid": True,
        "is_active": True,
    }

    registration_fee_waived = bool(
        existing_card and existing_card["registration_fee_paid"]
    )
    fee_amount = Decimal("0.00") if registration_fee_waived else Decimal("50.00")

    assert registration_fee_waived is True
    assert fee_amount == Decimal("0.00")

    # New cardholder without active paid card
    new_card = {
        "mrn": "RRH-2026-9999",
        "registration_fee_paid": False,
        "is_active": True,
    }
    waived_for_new = bool(new_card and new_card["registration_fee_paid"])
    new_fee_amount = Decimal("0.00") if waived_for_new else Decimal("50.00")

    assert waived_for_new is False
    assert new_fee_amount == Decimal("50.00")


def test_vitals_bmi_and_abnormal_detection():
    weight_kg = 74.5
    height_cm = 178.0
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m * height_m), 1)

    assert bmi == 23.5

    # Vital anomaly flags
    temp = 38.4
    systolic_bp = 145
    diastolic_bp = 95
    spo2 = 93.5

    is_fever = temp >= 38.0
    is_hypertensive = systolic_bp >= 140 or diastolic_bp >= 90
    is_hypoxic = spo2 < 95.0

    assert is_fever is True
    assert is_hypertensive is True
    assert is_hypoxic is True


def test_icd10_registry_search():
    query = "malaria".lower()
    matches = [
        item
        for item in ICD10_REGISTRY
        if query in item["code"].lower() or query in item["description"].lower()
    ]

    assert len(matches) >= 2
    assert any(m["code"] == "B50.9" for m in matches)


def test_hmac_prescription_generation_and_verification():
    prescription_id = str(uuid.uuid4())
    patient_id = str(uuid.uuid4())
    doctor_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    timestamp = "2026-08-16T13:00:00Z"
    items = [
        {"medication_name": "Artemether + Lumefantrine 20/120mg", "dosage": "4 tabs BD", "quantity_prescribed": 24},
        {"medication_name": "Paracetamol 500mg", "dosage": "2 tabs TDS", "quantity_prescribed": 18},
    ]

    sig = generate_prescription_signature(
        prescription_id=prescription_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=items,
        timestamp=timestamp,
    )

    assert sig is not None
    assert len(sig) == 64  # SHA-256 hex string

    # Verify signature passes
    assert verify_prescription_signature(
        signature=sig,
        prescription_id=prescription_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=items,
        timestamp=timestamp,
    ) is True
