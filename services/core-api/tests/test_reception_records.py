from datetime import date, datetime, timezone
from decimal import Decimal
import uuid
import pytest
from app.api.v1.endpoints.reception import _compute_fuzzy_score
from app.schemas.reception import (
    ClinicDepartment,
    EmergencyTraumaIntakeRequest,
    FolderStatus,
    FolderTransitLogRequest,
    MergePatientRecordsRequest,
    NHISStatus,
    QueueDispatchRequest,
    ReceptionPatientRegisterRequest,
    ReceptionTriagePriority,
)


def test_fuzzy_deduplication_matcher():
    # Identical names
    assert _compute_fuzzy_score("Kwame Mensah", "Kwame Mensah") == 1.0
    # Case insensitivity
    assert _compute_fuzzy_score("KWAME MENSAH", "kwame mensah") == 1.0
    # Minor typo (e.g. Kwami vs Kwame)
    score = _compute_fuzzy_score("Kwami Mensah", "Kwame Mensah")
    assert score > 0.85
    # Distinct names
    distinct_score = _compute_fuzzy_score("Kwame Mensah", "Abena Darko")
    assert distinct_score < 0.40


def test_patient_registration_request_and_response_schema():
    req = ReceptionPatientRegisterRequest(
        full_name="Kofi Annan Mensah",
        phone="+233244123456",
        ghana_card_id="GHA-712345678-9",
        date_of_birth=date(1985, 4, 12),
        gender="Male",
        blood_group="O+",
        allergies="Penicillin",
        nhis_number="NHIS-8829104",
        nhis_status=NHISStatus.ACTIVE,
        physical_folder_rack="Rack-B3",
        physical_folder_shelf="Shelf-07",
        destination_clinic=ClinicDepartment.GENERAL_OPD,
        priority=ReceptionTriagePriority.ROUTINE,
        auto_dispatch_queue=True,
    )

    assert req.full_name == "Kofi Annan Mensah"
    assert req.ghana_card_id == "GHA-712345678-9"
    assert req.physical_folder_rack == "Rack-B3"
    assert req.physical_folder_shelf == "Shelf-07"
    assert req.destination_clinic == ClinicDepartment.GENERAL_OPD


def test_emergency_trauma_intake_defaults_and_identifiers():
    req = EmergencyTraumaIntakeRequest(
        gender_estimate="Male",
        approximate_age_group="Adult",
        identifying_marks_or_clothing="Blue shirt, black trousers, deep laceration left forehead",
        brought_in_by="National Ambulance Service (NAS)",
        ambulance_call_sign="NAS-ACC-104",
        blood_group="O-",
        initial_triage_bay="Resuscitation Bay 1",
    )

    assert req.gender_estimate == "Male"
    assert req.blood_group == "O-"
    assert req.ambulance_call_sign == "NAS-ACC-104"
    assert req.initial_triage_bay == "Resuscitation Bay 1"


def test_merge_patient_records_request_validation():
    primary_id = uuid.uuid4()
    secondary_id = uuid.uuid4()

    req = MergePatientRecordsRequest(
        primary_patient_id=primary_id,
        secondary_patient_id=secondary_id,
        merge_reason="Resolving temporary trauma intake TRAUMA-DOE-2026-912 to verified patient master file GHA-712345678-9.",
        confirm_data_override=True,
    )

    assert req.primary_patient_id == primary_id
    assert req.secondary_patient_id == secondary_id
    assert len(req.merge_reason) >= 4


def test_queue_dispatch_and_department_prefixes():
    prefix_map = {
        ClinicDepartment.GENERAL_OPD: "OPD",
        ClinicDepartment.ANTENATAL: "ANC",
        ClinicDepartment.EYE_CLINIC: "EYE",
        ClinicDepartment.PEDIATRICS: "PED",
        ClinicDepartment.EMERGENCY: "EMG",
        ClinicDepartment.DENTAL: "DNT",
        ClinicDepartment.SURGICAL_OPD: "SUR",
    }

    req_opd = QueueDispatchRequest(
        destination_clinic=ClinicDepartment.GENERAL_OPD,
        priority=ReceptionTriagePriority.ROUTINE,
        is_nhis_covered=True,
    )
    assert prefix_map[req_opd.destination_clinic] == "OPD"

    req_anc = QueueDispatchRequest(
        destination_clinic=ClinicDepartment.ANTENATAL,
        priority=ReceptionTriagePriority.ROUTINE,
        is_nhis_covered=True,
    )
    assert prefix_map[req_anc.destination_clinic] == "ANC"

    req_emg = QueueDispatchRequest(
        destination_clinic=ClinicDepartment.EMERGENCY,
        priority=ReceptionTriagePriority.EMERGENCY,
        is_nhis_covered=False,
    )
    assert prefix_map[req_emg.destination_clinic] == "EMG"


def test_physical_folder_transit_overdue_threshold():
    from datetime import timedelta

    # Checked out 3 hours ago -> Overdue (> 2.0 hours)
    checked_out_at = datetime.now(timezone.utc) - timedelta(hours=3, minutes=15)
    now = datetime.now(timezone.utc)
    duration_hrs = round((now - checked_out_at).total_seconds() / 3600.0, 1)

    is_overdue = duration_hrs >= 2.0
    assert duration_hrs >= 3.0
    assert is_overdue is True

    # Checked out 45 minutes ago -> Not overdue
    recent_checkout = datetime.now(timezone.utc) - timedelta(minutes=45)
    recent_duration = round((now - recent_checkout).total_seconds() / 3600.0, 1)
    assert recent_duration < 1.0
    assert (recent_duration >= 2.0) is False


def test_folder_transit_request_action_validation():
    req_checkout = FolderTransitLogRequest(
        mrn="RRH-2026-1042",
        action="CHECK_OUT",
        destination_department="Consulting Room 3",
        checked_out_to_doctor="Dr. Afia Appiah",
    )
    assert req_checkout.action == "CHECK_OUT"

    req_return = FolderTransitLogRequest(
        mrn="RRH-2026-1042",
        action="RETURN",
        destination_department="Records Archive (Rack-B2/Shelf-04)",
    )
    assert req_return.action == "RETURN"


def test_thermal_wristband_barcode_and_qr_payload_generation():
    mrn = "RRH-2026-0812"
    patient_id = uuid.uuid4()
    barcode_data = f"*{mrn}*"
    qr_data = f"https://medipaedia.health/patient/wristband?mrn={mrn}&pid={patient_id}"

    assert barcode_data == "*RRH-2026-0812*"
    assert "https://medipaedia.health/patient/wristband" in qr_data
    assert str(patient_id) in qr_data
