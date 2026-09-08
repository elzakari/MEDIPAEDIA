import pytest
from app.schemas.nurse import (
    AVPUConsciousness,
    ExtendedVitalsCreateRequest,
    MedicationAdminStatus,
)
from app.api.v1.endpoints.nurse import calculate_esi_level


def test_esi_level_1_resuscitation_calculation():
    """
    Test ESI Level 1 (Resuscitation) triggered by severe shock, extreme hypoxia, or unresponsiveness.
    """
    req_unresponsive = ExtendedVitalsCreateRequest(
        patient_id="p-1",
        systolic_bp=60,
        diastolic_bp=38,
        heart_rate=145,
        respiratory_rate=28,
        temperature_celsius=39.6,
        spo2_percent=82,
        avpu=AVPUConsciousness.UNRESPONSIVE,
        pain_score=0,
    )
    level, category, is_critical, alert_msg = calculate_esi_level(req_unresponsive)
    assert level == 1
    assert category == "RED"
    assert is_critical is True
    assert "CRITICAL LEVEL 1 ALERT" in alert_msg


def test_esi_level_2_emergent_calculation():
    """
    Test ESI Level 2 (Emergent) triggered by severe pain (>=8), hypoxia (SpO2 < 92%), or severe hypoglycemia (RBS < 3.5).
    """
    # 1. Severe Intractable Pain (Pain 9/10)
    req_pain = ExtendedVitalsCreateRequest(
        patient_id="p-2",
        systolic_bp=130,
        diastolic_bp=85,
        heart_rate=88,
        temperature_celsius=37.0,
        spo2_percent=97,
        pain_score=9,
        avpu=AVPUConsciousness.ALERT,
    )
    level, category, is_critical, alert_msg = calculate_esi_level(req_pain)
    assert level == 2
    assert category == "ORANGE"
    assert is_critical is True
    assert "Severe Intractable Pain" in alert_msg

    # 2. Critical Hypoglycemia (RBS 2.8 mmol/L)
    req_hypo = ExtendedVitalsCreateRequest(
        patient_id="p-3",
        systolic_bp=110,
        diastolic_bp=70,
        heart_rate=95,
        temperature_celsius=36.8,
        spo2_percent=98,
        blood_glucose_rbs=2.8,
        pain_score=2,
        avpu=AVPUConsciousness.ALERT,
    )
    level, category, is_critical, alert_msg = calculate_esi_level(req_hypo)
    assert level == 2
    assert category == "ORANGE"
    assert is_critical is True
    assert "Critical Hypoglycemia" in alert_msg


def test_esi_level_3_urgent_and_level_5_non_urgent():
    """
    Test ESI Level 3 (Urgent) for moderate pyrexia / tachycardia, and Level 5 for normal vitals.
    """
    # Level 3: Pyrexia 38.6°C + moderate pain
    req_level3 = ExtendedVitalsCreateRequest(
        patient_id="p-4",
        systolic_bp=120,
        diastolic_bp=80,
        heart_rate=105,
        temperature_celsius=38.6,
        spo2_percent=98,
        pain_score=6,
        avpu=AVPUConsciousness.ALERT,
    )
    level3, cat3, crit3, _ = calculate_esi_level(req_level3)
    assert level3 == 3
    assert cat3 == "YELLOW"
    assert crit3 is False

    # Level 5: Completely normal vitals, no pain
    req_level5 = ExtendedVitalsCreateRequest(
        patient_id="p-5",
        systolic_bp=118,
        diastolic_bp=76,
        heart_rate=72,
        temperature_celsius=36.8,
        spo2_percent=99,
        pain_score=0,
        avpu=AVPUConsciousness.ALERT,
    )
    level5, cat5, crit5, _ = calculate_esi_level(req_level5)
    assert level5 == 5
    assert cat5 == "GREEN"
    assert crit5 is False


def test_fluid_balance_net_calculation():
    """
    Test 24-hour fluid intake and output ledger net balance calculation.
    """
    intakes = [500.0, 250.0, 500.0]  # Total Intake: 1250 mL
    outputs = [350.0, 420.0]         # Total Output: 770 mL

    total_in = sum(intakes)
    total_out = sum(outputs)
    net_balance = round(total_in - total_out, 1)

    assert total_in == 1250.0
    assert total_out == 770.0
    assert net_balance == 480.0
    status_str = f"POSITIVE (+{net_balance} mL)" if net_balance > 0 else "NEGATIVE"
    assert "POSITIVE (+480.0 mL)" in status_str
