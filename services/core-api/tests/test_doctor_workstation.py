import asyncio
import pytest
from app.schemas.doctor_workstation import (
    AllergyCategory,
    AllergySeverity,
    AdmissionPriority,
    CDSAlertSeverity,
    CPOEDiagnosticOrderRequest,
    DiagnosticCategory,
    DiagnosticOrderItem,
    DiagnosticPriority,
    InpatientAdmissionOrderRequest,
    PatientAllergyCreateRequest,
    PrescriptionDrugItem,
    PrescriptionSafetyValidationRequest,
    SpecialistReferralRequest,
)
from app.api.v1.endpoints.clinical import (
    validate_prescription_safety,
    order_diagnostic_tests,
    order_inpatient_admission,
    generate_specialist_referral,
    add_patient_allergy,
    get_patient_allergies,
)


def test_allergy_conflict_detection_penicillin_and_sulfa():
    """
    Test Clinical Decision Support (CDS) engine detection of direct Penicillin and Sulfa allergy contraindications.
    """
    async def _test():
        # Prescribing Amoxicillin (Penicillin class) to patient with Penicillin allergy
        req_penicillin = PrescriptionSafetyValidationRequest(
            patient_id="default",
            medications=[
                PrescriptionDrugItem(drug_name="Amoxicillin 500mg Capsules", dosage="500mg TDS"),
                PrescriptionDrugItem(drug_name="Paracetamol 1000mg", dosage="1g TDS"),
            ],
        )
        result = await validate_prescription_safety(req_penicillin, current_user=None, db=None)
        assert result.is_safe is False
        assert result.critical_contraindications_count >= 1
        contraindications = [a for a in result.alerts if a.severity == CDSAlertSeverity.CRITICAL_CONTRAINDICATION]
        assert any("Penicillin" in a.title for a in contraindications)

        # Prescribing Co-trimoxazole (Sulfa drug) to patient with Sulfa allergy
        req_sulfa = PrescriptionSafetyValidationRequest(
            patient_id="default",
            medications=[
                PrescriptionDrugItem(drug_name="Co-trimoxazole 960mg (Septrin)", dosage="960mg BD"),
            ],
        )
        result_sulfa = await validate_prescription_safety(req_sulfa, current_user=None, db=None)
        assert result_sulfa.is_safe is False
        assert any("Sulfonamide" in a.title for a in result_sulfa.alerts)

    asyncio.run(_test())


def test_drug_drug_interaction_detection():
    """
    Test CDS detection of lethal co-administration of Sildenafil and Nitrates.
    """
    async def _test():
        req_interaction = PrescriptionSafetyValidationRequest(
            patient_id="patient-no-allergies",
            medications=[
                PrescriptionDrugItem(drug_name="Sildenafil 50mg", dosage="50mg PRN"),
                PrescriptionDrugItem(drug_name="Isosorbide Dinitrate 10mg", dosage="10mg TDS"),
            ],
        )
        result = await validate_prescription_safety(req_interaction, current_user=None, db=None)
        assert result.is_safe is False
        assert any("PDE-5 Inhibitor + Nitrate" in a.title for a in result.alerts)

    asyncio.run(_test())


def test_cpoe_diagnostic_orders():
    """
    Test Computerized Physician Order Entry (CPOE) diagnostic laboratory and imaging requests.
    """
    async def _test():
        req_cpoe = CPOEDiagnosticOrderRequest(
            patient_id="p-101",
            tests=[
                DiagnosticOrderItem(
                    test_code="LAB-FBC",
                    test_name="Full Blood Count (FBC) + Diff",
                    category=DiagnosticCategory.LABORATORY,
                    priority=DiagnosticPriority.STAT,
                    clinical_indication="Evaluate anemia and leukocytosis in severe malaria",
                ),
                DiagnosticOrderItem(
                    test_code="RAD-CXR",
                    test_name="Chest X-Ray PA View",
                    category=DiagnosticCategory.IMAGING,
                    priority=DiagnosticPriority.ROUTINE,
                    clinical_indication="Check for pulmonary consolidation",
                ),
            ],
            ordering_doctor_name="Dr. Afia Appiah",
            ordering_doctor_pin="MDC/RN/89124",
            clinical_notes="STAT priority on FBC",
        )
        order_res = await order_diagnostic_tests(req_cpoe, current_user=None, db=None)
        assert order_res.order_id.startswith("cpoe-")
        assert order_res.tests_count == 2
        assert order_res.status == "ORDERED"
        assert "STAT Priority" in order_res.estimated_turnaround

    asyncio.run(_test())


def test_inpatient_admission_and_referral_generation():
    """
    Test hospital ward inpatient admission orders and specialist referral letter generation.
    """
    async def _test():
        # 1. Ward Admission
        req_adm = InpatientAdmissionOrderRequest(
            patient_id="p-101",
            patient_name="Kwesi Mensah",
            target_ward="Male Medical Ward",
            admitting_diagnosis="Severe Plasmodium Falciparum Malaria with Dehydration",
            admitting_icd10="B50.9",
            priority=AdmissionPriority.URGENT,
            nursing_orders=["Bed rest", "Continuous pulse oximetry", "IV Ringers Lactate @ 100mL/hr"],
            admitting_doctor_name="Dr. Afia Appiah",
            admitting_doctor_pin="MDC/RN/89124",
        )
        adm_res = await order_inpatient_admission(req_adm, current_user=None, db=None)
        assert adm_res.admission_order_id.startswith("adm-")
        assert adm_res.target_ward == "Male Medical Ward"
        assert adm_res.status == "PENDING_BED_ASSIGNMENT"

        # 2. Specialist Referral
        req_ref = SpecialistReferralRequest(
            patient_id="p-102",
            patient_name="Kofi Boakye",
            receiving_facility="Korle Bu Teaching Hospital",
            receiving_specialty="Cardiology",
            clinical_summary="52M with unstable angina and uncontrolled Stage 2 Hypertension.",
            working_diagnosis="Unstable Angina Pectoris",
            icd10_code="I20.0",
            investigation_findings="ECG shows ST-depression in V4-V6. Troponin I mildly elevated at 0.08 ng/mL.",
            reason_for_referral="Coronary Angiography and Specialist Cardiology Evaluation",
            referring_doctor_name="Dr. Kwame Antwi",
            referring_doctor_pin="MDC/RN/44201",
        )
        ref_res = await generate_specialist_referral(req_ref, current_user=None, db=None)
        assert ref_res.referral_id.startswith("ref-")
        assert "medipaedia://referral" in ref_res.qr_verification_token
        assert ref_res.receiving_facility == "Korle Bu Teaching Hospital"

    asyncio.run(_test())
