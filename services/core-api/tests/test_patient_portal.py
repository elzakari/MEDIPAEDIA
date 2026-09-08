import asyncio
from decimal import Decimal
import pytest

from app.schemas.patient_portal import (
    AddDependentRequest,
    BookAppointmentRequest,
    EmergencyICEUpdateRequest,
    LogDoseTakenRequest,
    PreCheckinRequest,
    VitalsLogCreateRequest,
    WalletTopupRequest,
)
from app.api.v1.endpoints.patient import (
    get_emergency_profile,
    update_emergency_profile,
    get_public_emergency_ice,
    get_patient_diagnostics,
    get_patient_vitals_history,
    log_patient_vitals,
    get_patient_appointments,
    book_patient_appointment,
    pre_checkin_appointment,
    get_patient_dependents,
    add_patient_dependent,
    get_medication_adherence_schedule,
    log_medication_dose_taken,
    get_patient_wallet,
    topup_patient_wallet,
)


class MockPatientUser:
    id = "usr-patient-01"
    email = "kwesi.mensah@ghanahealth.gov"
    full_name = "Kwesi Mensah"
    role = type("Role", (), {"value": "PATIENT"})()


def test_emergency_ice_profile_and_public_lookup():
    """
    Test Emergency ICE profile fetching, updating, and unauthenticated public lookup for first responders.
    """
    async def _test():
        user = MockPatientUser()

        # 1. Fetch initial profile
        prof = await get_emergency_profile(current_user=user, db=None)
        assert prof.blood_group == "O+"
        assert prof.genotype == "AA"
        assert "Amoxicillin / Penicillins" in prof.allergies

        # 2. Update profile
        up_req = EmergencyICEUpdateRequest(
            blood_group="O+",
            genotype="AA",
            allergies=["Amoxicillin / Penicillins", "Peanuts", "Ciprofloxacin"],
            chronic_conditions=["Mild Intermittent Asthma"],
            emergency_contact_name="Kofi Mensah (Brother)",
            emergency_contact_phone="0244998877",
            emergency_contact_relationship="Brother",
            organ_donor=True,
        )
        updated = await update_emergency_profile(up_req, current_user=user, db=None)
        assert "Ciprofloxacin" in updated.allergies

        # 3. Unauthenticated public ICE lookup
        pub_ice = await get_public_emergency_ice(token=prof.ice_token)
        assert pub_ice.full_name == "Kwesi Mensah"
        assert pub_ice.blood_group == "O+"
        assert "Ciprofloxacin" in pub_ice.allergies
        assert pub_ice.emergency_contact_phone == "0244998877"

    asyncio.run(_test())


def test_diagnostics_and_vitals_logging():
    """
    Test diagnostic reports listing and patient vitals self-logging.
    """
    async def _test():
        user = MockPatientUser()

        # 1. Diagnostics reports
        diags = await get_patient_diagnostics(category=None, current_user=user, db=None)
        assert len(diags) >= 3
        assert any(d.has_abnormal_flag for d in diags)

        # 2. Log vitals
        v_req = VitalsLogCreateRequest(
            systolic_bp=120,
            diastolic_bp=80,
            pulse_bpm=74,
            blood_glucose_mg_dl=95.0,
            temperature_c=36.6,
            weight_kg=74.2,
        )
        new_v = await log_patient_vitals(v_req, current_user=user, db=None)
        assert new_v.systolic_bp == 120
        assert new_v.blood_glucose_mg_dl == 95.0
        assert new_v.source == "PATIENT_SELF_LOG"

        # 3. Vitals history
        history = await get_patient_vitals_history(current_user=user, db=None)
        assert len(history) >= 4

    asyncio.run(_test())


def test_appointments_dependents_and_adherence():
    """
    Test booking appointments, pre-checkin, dependent addition, and dose adherence tracking.
    """
    async def _test():
        user = MockPatientUser()

        # 1. Book appointment
        apt_req = BookAppointmentRequest(
            facility_id="fac-ridge-01",
            facility_name="Ridge Regional Hospital",
            department="General Outpatient (OPD)",
            doctor_name="Dr. Afia Appiah",
            scheduled_time="Friday, 10:00 AM",
            reason="Malaria Follow-up & Lab Review",
        )
        new_apt = await book_patient_appointment(apt_req, current_user=user, db=None)
        assert "Q-" in new_apt.queue_number
        assert new_apt.status == "CONFIRMED"

        # 2. Pre-checkin
        pre_req = PreCheckinRequest(
            appointment_id=new_apt.appointment_id,
            symptoms_summary="Fever resolved, completing Coartem course.",
        )
        checked_in = await pre_checkin_appointment(pre_req, current_user=user, db=None)
        assert checked_in.status == "CHECKED_IN"
        assert checked_in.pre_checkin_completed is True

        # 3. Add family dependent
        dep_req = AddDependentRequest(
            full_name="Kwame Mensah",
            relationship="CHILD",
            date_of_birth="2022-06-15",
            gender="MALE",
            blood_group="O+",
            nhis_number="GHA-NHIS-8821943",
        )
        new_dep = await add_patient_dependent(dep_req, current_user=user, db=None)
        assert new_dep.full_name == "Kwame Mensah"
        assert new_dep.relationship == "CHILD"

        # 4. Medication dose adherence
        adh_list = await get_medication_adherence_schedule(current_user=user, db=None)
        assert len(adh_list) >= 3
        dose_req = LogDoseTakenRequest(schedule_id=adh_list[1].schedule_id)
        dose_res = await log_medication_dose_taken(dose_req, current_user=user, db=None)
        assert dose_res.taken_today is True

    asyncio.run(_test())


def test_patient_wallet_and_topup():
    """
    Test patient health wallet balance retrieval and Paystack MoMo top-up initialization.
    """
    async def _test():
        user = MockPatientUser()

        # 1. Wallet balance
        wallet = await get_patient_wallet(current_user=user, db=None)
        assert wallet.balance_ghs == Decimal("450.00")
        assert wallet.nhis_active is True
        assert len(wallet.recent_transactions) >= 2

        # 2. Top-up request
        top_req = WalletTopupRequest(
            amount_ghs=Decimal("150.00"),
            payment_method="MOMO",
            phone_number="0244123456",
        )
        top_res = await topup_patient_wallet(top_req, current_user=user, db=None)
        assert "wlt_top_" in top_res.paystack_reference
        assert "checkout.paystack.com" in top_res.authorization_url
        assert top_res.amount_ghs == Decimal("150.00")

    asyncio.run(_test())
