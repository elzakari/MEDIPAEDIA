import asyncio
import uuid
import pytest

from app.api.v1.endpoints.clinical import (
    calculate_mews,
    list_clinical_macros,
    create_clinical_macro,
    get_patient_longitudinal_trends,
    create_stat_nursing_order,
    list_stat_nursing_orders,
    execute_stat_nursing_order,
)
from app.schemas.clinical import (
    ClinicalMacroCreateRequest,
    SOAPMacroTemplate,
    PrescriptionMacroItem,
    StatNursingOrderCreateRequest,
    StatNursingOrderExecuteRequest,
)


class MockClinicalUser:
    id = "usr-doc-01"
    email = "doctor.afia@ridgehospital.health"
    full_name = "Dr. Afia Appiah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = type("Role", (), {"value": "DOCTOR"})()


class MockNurseUser:
    id = "usr-nurse-01"
    email = "nurse.grace@ridgehospital.health"
    full_name = "Nurse Grace Mensah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = type("Role", (), {"value": "NURSE"})()


def test_mews_score_calculations_and_severity():
    # 1. Normal baseline (Score 0 -> NORMAL)
    score, sev = calculate_mews(
        respiratory_rate=14,
        heart_rate=72,
        systolic_bp=120,
        temperature=36.8,
        spo2=98.0,
    )
    assert score == 0
    assert sev == "NORMAL"

    # 2. Moderate warning signs (Score 3 -> WARNING)
    # Temp 38.6 (+2), RR 22 (+2) -> score 4
    score_warn, sev_warn = calculate_mews(
        respiratory_rate=22,
        heart_rate=88,
        systolic_bp=130,
        temperature=38.6,
        spo2=97.0,
    )
    assert score_warn == 4
    assert sev_warn == "WARNING"

    # 3. Critical deterioration (Score >= 5 -> CRITICAL)
    # SBP 68 (+3), HR 142 (+3), RR 28 (+2), Temp 39.8 (+2), SpO2 84% (+3) -> score 13
    score_crit, sev_crit = calculate_mews(
        respiratory_rate=28,
        heart_rate=142,
        systolic_bp=68,
        temperature=39.8,
        spo2=84.0,
    )
    assert score_crit >= 5
    assert sev_crit == "CRITICAL"


def test_clinical_macros_listing_and_injection():
    async def _test():
        doc = MockClinicalUser()

        # 1. List default macros
        macros = await list_clinical_macros(specialty=None, current_user=doc, db=None)
        assert len(macros) >= 4
        macro_names = [m.macro_name for m in macros]
        assert "Adult Acute Uncomplicated Malaria" in macro_names
        assert "Essential Hypertension Initial Workup" in macro_names

        # Verify malaria macro payload
        malaria_macro = next(m for m in macros if m.icd10_code == "B50.9")
        assert malaria_macro.specialty == "GENERAL_PRACTICE"
        assert "Coartem" in malaria_macro.default_prescription_items[0].medication_name
        assert malaria_macro.default_soap_template.subjective is not None

        # 2. Create custom macro
        new_req = ClinicalMacroCreateRequest(
            macro_name="Paediatric Bronchopneumonia Initial Stabilisation",
            specialty="PAEDIATRICS",
            icd10_code="J18.0",
            diagnosis_title="Bronchopneumonia, Unspecified",
            default_soap_template=SOAPMacroTemplate(
                subjective="5-year-old presenting with cough, fast breathing, and chest in-drawing for 2 days.",
                objective="T 39.0°C, RR 46 bpm, SpO2 93% on room air, bilateral crepitations.",
                assessment="Severe Community-Acquired Bronchopneumonia (ICD-10: J18.0)",
                plan="1. Supplemental humidified Oxygen via nasal prongs at 2L/min.\n2. IV Ampicillin + Gentamicin.",
            ),
            default_prescription_items=[
                PrescriptionMacroItem(
                    medication_name="Amoxicillin-Clavulanate (Augmentin) Syrup 228mg/5ml",
                    dosage="7.5ml",
                    frequency="BD",
                    duration="7 days",
                    quantity=1,
                    instructions="Take after food",
                ),
            ],
            default_lab_orders=["Chest Radiograph (CXR)", "Full Blood Count"],
        )
        created = await create_clinical_macro(req=new_req, current_user=doc, db=None)
        assert created.macro_name == "Paediatric Bronchopneumonia Initial Stabilisation"
        assert created.icd10_code == "J18.0"
        assert len(created.default_prescription_items) == 1

    asyncio.run(_test())


def test_patient_longitudinal_trends():
    async def _test():
        doc = MockClinicalUser()

        trends = await get_patient_longitudinal_trends(patient_id="p-101", current_user=doc, db=None)
        assert trends.patient_id == "p-101"
        assert len(trends.vitals_history) >= 3
        assert len(trends.hb_history) >= 2
        assert len(trends.rbs_history) >= 2
        assert len(trends.creatinine_history) >= 2

        # Verify MEWS presence in vitals trend points
        latest_vital = trends.vitals_history[0]
        assert latest_vital.mews_score >= 0
        assert latest_vital.mews_severity in ["NORMAL", "WARNING", "CRITICAL"]

    asyncio.run(_test())


def test_stat_nursing_orders_lifecycle():
    async def _test():
        doc = MockClinicalUser()
        nurse = MockNurseUser()

        # 1. Doctor creates STAT order
        create_req = StatNursingOrderCreateRequest(
            patient_id="p-101",
            consultation_id="c-201",
            instruction="STAT IV Paracetamol 1g over 15 mins + Cold compresses.",
            urgency="STAT",
            notes="Temperature reached 39.2°C at consultation desk",
        )
        order = await create_stat_nursing_order(req=create_req, current_user=doc, db=None)
        assert order.status == "PENDING"
        assert order.urgency == "STAT"
        assert order.instruction == "STAT IV Paracetamol 1g over 15 mins + Cold compresses."
        assert "Dr. Afia Appiah" in order.doctor_name

        # 2. Nurse views pending orders
        pending_orders = await list_stat_nursing_orders(status_filter="PENDING", current_user=nurse, db=None)
        assert any(o.id == order.id for o in pending_orders)

        # 3. Nurse executes STAT order
        exec_req = StatNursingOrderExecuteRequest(
            execution_notes="Paracetamol 1g IV infused completely. Patient comfortable."
        )
        executed_order = await execute_stat_nursing_order(order_id=order.id, req=exec_req, current_user=nurse, db=None)
        assert executed_order.status == "EXECUTED"
        assert "Nurse Grace Mensah" in executed_order.executed_by_nurse_name
        assert executed_order.executed_at is not None
        assert "Paracetamol 1g IV infused" in executed_order.execution_notes

    asyncio.run(_test())
