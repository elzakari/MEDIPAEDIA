import asyncio
import uuid
import pytest

from app.services.ai_copilot import (
    generate_ambient_soap_from_audio,
    suggest_icd10_differentials,
    generate_multilingual_counseling,
    strip_phi_identifiers,
)
from app.api.v1.endpoints.ai_clinical import (
    transcribe_ambient_soap,
    suggest_icd10_differential_diagnoses,
    generate_patient_pharmacy_counseling,
)
from app.schemas.ai_clinical import (
    AIScribeRequest,
    ICD10DifferentialRequest,
    MultilingualCounselingRequest,
    PrescriptionCounselingInputItem,
    SupportedCounselingLanguage,
)
from app.models.user import UserRole


class MockDoctorUser:
    id = "usr-doc-01"
    email = "doctor.afia@ridgehospital.health"
    full_name = "Dr. Afia Appiah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.DOCTOR


class MockPharmacistUser:
    id = "usr-pharm-01"
    email = "pharmacist.kojo@osugeneral.pharmacy"
    full_name = "Pharm. Kojo Asante"
    tenant_id = uuid.UUID("22222222-2222-2222-2222-222222222222")
    role = UserRole.PHARMACIST


def test_phi_token_redaction():
    raw = "Patient Kwesi Mensah GHA-71298412-1 phone +233244123456 MRN-RDG-2026-99120 had high fever."
    stripped = strip_phi_identifiers(raw)
    assert "GHA-71298412-1" not in stripped
    assert "[GHANA_CARD_REDACTED]" in stripped
    assert "[PHONE_REDACTED]" in stripped
    assert "[MRN_REDACTED]" in stripped


def test_generate_ambient_soap_from_audio_malaria():
    transcript = (
        "Patient complains of high fevers, bitter taste in mouth, shaking chills, and generalized headache for 3 days. "
        "Prior malaria treated last year. Vitals: Temp 38.6, BP 128/84. Positive malaria rapid diagnostic test."
    )
    res = generate_ambient_soap_from_audio(
        transcript_text=transcript,
        patient_context={"vitals": {"temperature": "38.6 °C", "blood_pressure": "128/84 mmHg"}},
    )

    assert res["success"] is True
    assert res["ambient_audio_processed"] is True
    assert res["soap"].subjective is not None
    assert "fevers" in res["soap"].subjective.lower() or "chills" in res["soap"].subjective.lower()
    assert "128/84" in res["soap"].objective
    assert "Malaria" in res["soap"].assessment
    assert res["suggested_icd10_code"] == "B50.9"
    assert len(res["suggested_prescriptions"]) >= 2
    assert res["suggested_follow_up_days"] == 3


def test_generate_ambient_soap_from_audio_hypertension():
    transcript = "Patient reports early morning occipital headaches and dizziness for 2 weeks. Blood pressure measured at 155/95 mmHg."
    res = generate_ambient_soap_from_audio(transcript_text=transcript)
    assert res["success"] is True
    assert "Hypertension" in res["soap"].assessment
    assert res["suggested_icd10_code"] == "I10"
    assert any("Amlodipine" in rx["name"] for rx in res["suggested_prescriptions"])


def test_suggest_icd10_differentials_matching():
    # 1. Malaria + Dehydration symptoms
    symptoms = ["fever", "chills", "rigors", "body aches"]
    vitals = "Temp 39.0°C, HR 102 bpm"
    res = suggest_icd10_differentials(symptoms=symptoms, vitals_summary=vitals)

    assert res.success is True
    assert res.total_differentials_evaluated >= 1
    assert res.primary_diagnosis.icd10_code == "B50.9"
    assert res.primary_diagnosis.confidence_score >= 0.85
    assert len(res.primary_diagnosis.recommended_investigations) >= 2

    # 2. Respiratory symptoms
    resp_res = suggest_icd10_differentials(symptoms=["productive cough", "sore throat", "catarrh"])
    assert resp_res.primary_diagnosis.icd10_code == "J06.9"

    # 3. GI symptoms
    gi_res = suggest_icd10_differentials(symptoms=["watery diarrhea", "vomiting", "abdominal cramps"])
    assert gi_res.primary_diagnosis.icd10_code == "A09"


def test_generate_multilingual_counseling_all_languages():
    prescription = [
        PrescriptionCounselingInputItem(
            medication_name="Coartem (Artemether-Lumefantrine 20/120mg)",
            dosage="4 tablets stat, then 4 at 8h, 24h, 36h, 48h, 60h",
            frequency="BD",
            duration_days=3,
        ),
        PrescriptionCounselingInputItem(
            medication_name="Amoxicillin 500mg",
            dosage="1 capsule TDS",
            frequency="TDS",
            duration_days=5,
        ),
    ]

    # 1. English
    res_en = generate_multilingual_counseling(
        prescription_items=prescription,
        target_language=SupportedCounselingLanguage.ENGLISH,
        patient_name="Kwesi Mensah",
    )
    assert res_en.success is True
    assert "fatty meal" in res_en.medications_counseling[0].meal_instructions.lower()
    assert "Ridge Pharmacy" in res_en.sms_whatsapp_dispatch_copy

    # 2. French (Français)
    res_fr = generate_multilingual_counseling(
        prescription_items=prescription,
        target_language=SupportedCounselingLanguage.FRENCH,
        patient_name="Kwesi Mensah",
    )
    assert res_fr.success is True
    assert "repas" in res_fr.medications_counseling[0].meal_instructions.lower()
    assert "Bonjour" in res_fr.patient_greeting

    # 3. Twi (Akan)
    res_twi = generate_multilingual_counseling(
        prescription_items=prescription,
        target_language=SupportedCounselingLanguage.TWI,
        patient_name="Kwesi Mensah",
    )
    assert res_twi.success is True
    assert "aduro" in res_twi.medications_counseling[0].how_to_take.lower()
    assert "nsuo" in res_twi.general_lifestyle_advice.lower()

    # 4. Ewe (Eʋegbe)
    res_ewe = generate_multilingual_counseling(
        prescription_items=prescription,
        target_language=SupportedCounselingLanguage.EWE,
        patient_name="Kwesi Mensah",
    )
    assert res_ewe.success is True
    assert "atike" in res_ewe.medications_counseling[0].how_to_take.lower()

    # 5. Ga
    res_ga = generate_multilingual_counseling(
        prescription_items=prescription,
        target_language=SupportedCounselingLanguage.GA,
        patient_name="Kwesi Mensah",
    )
    assert res_ga.success is True
    assert "tsofa" in res_ga.medications_counseling[0].how_to_take.lower()


def test_ai_clinical_endpoints():
    async def _test():
        doc = MockDoctorUser()
        pharm = MockPharmacistUser()

        # 1. Test POST /api/v1/ai/scribe/transcribe-soap
        scribe_req = AIScribeRequest(
            transcript_text="Patient has fever and vomiting for 2 days. On exam, temperature 38.5C, abdomen soft. Malaria test positive.",
            patient_context={"vitals": {"temperature": "38.5 °C"}},
        )
        scribe_res = await transcribe_ambient_soap(req=scribe_req, current_user=doc, db=None)
        assert scribe_res["success"] is True
        assert scribe_res["suggested_icd10_code"] == "B50.9"

        # 2. Test POST /api/v1/ai/diagnostics/icd10-suggest
        diag_req = ICD10DifferentialRequest(
            symptoms=["fever", "chills"],
            vitals_summary="Temp 38.9°C",
            history="Known G6PD normal",
        )
        diag_res = await suggest_icd10_differential_diagnoses(req=diag_req, current_user=doc, db=None)
        assert diag_res.success is True
        assert len(diag_res.differentials) >= 1

        # 3. Test POST /api/v1/ai/pharmacy/counseling
        counsel_req = MultilingualCounselingRequest(
            prescription_items=[
                PrescriptionCounselingInputItem(
                    medication_name="Amlodipine 10mg",
                    dosage="1 tablet daily",
                    frequency="OD",
                    duration_days=30,
                )
            ],
            target_language=SupportedCounselingLanguage.TWI,
            patient_name="Akosua Mansa",
        )
        counsel_res = await generate_patient_pharmacy_counseling(req=counsel_req, current_user=pharm, db=None)
        assert counsel_res.success is True
        assert counsel_res.language == SupportedCounselingLanguage.TWI
        assert len(counsel_res.medications_counseling) == 1

    asyncio.run(_test())
