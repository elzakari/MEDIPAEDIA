import asyncio
import uuid
import pytest

from app.api.v1.endpoints.patient import (
    get_patient_pillbox_schedule,
    log_pillbox_dose,
    book_telehealth_session,
)
from app.api.v1.endpoints.reception import (
    scan_fast_intake,
    get_folder_archive_map,
    checkout_physical_folder,
    return_physical_folder,
    get_queue_audio_stream,
)
from app.schemas.patient_portal import (
    LogPillBoxDoseRequest,
    BookTelehealthSessionRequest,
)
from app.schemas.reception import (
    FastScannerIntakeRequest,
    FolderCheckoutActionRequest,
    FolderReturnActionRequest,
)
from app.models.user import UserRole


class MockPatientUser:
    id = "usr-patient-01"
    email = "kwesi.mensah@medipaedia.health"
    full_name = "Kwesi Mensah"
    tenant_id = None
    role = UserRole.PATIENT


class MockReceptionClerkUser:
    id = "usr-clerk-01"
    email = "clerk.kofi@ridgehospital.health"
    full_name = "Kofi Asante (Record Clerk)"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.RECORD_CLERK


def test_patient_pillbox_schedule_and_dose_logging():
    async def _test():
        patient = MockPatientUser()

        # 1. Fetch daily schedule
        schedule = await get_patient_pillbox_schedule(current_user=patient, db=None)
        assert schedule.streak_days >= 6
        assert len(schedule.morning_doses) >= 1
        assert len(schedule.evening_doses) >= 1
        assert schedule.total_doses_today >= 4

        # 2. Log a dose
        target_compartment = schedule.evening_doses[0].compartment_id
        req = LogPillBoxDoseRequest(
            compartment_id=target_compartment,
            status="TAKEN",
            taken_time="07:15 PM",
        )
        res = await log_pillbox_dose(req=req, current_user=patient, db=None)
        assert res.success is True
        assert res.status == "TAKEN"
        assert res.compliance_percentage >= 80

    asyncio.run(_test())


def test_telehealth_session_booking():
    async def _test():
        patient = MockPatientUser()

        req = BookTelehealthSessionRequest(
            doctor_name="Dr. Afia Appiah",
            specialty="General Medicine",
            scheduled_start="Today, 17:00 GMT",
            duration_minutes=30,
            reason_for_visit="Routine hypertension review",
            payment_method="WALLET",
        )

        res = await book_telehealth_session(req=req, current_user=patient, db=None)
        assert res.session_id.startswith("tel-")
        assert res.room_token.startswith("medrtc_")
        assert "telehealth.medipaedia.health/room/" in res.join_url
        assert res.session_status == "SCHEDULED"

    asyncio.run(_test())


def test_fast_scanner_intake_ghana_card_and_barcode():
    async def _test():
        clerk = MockReceptionClerkUser()

        # Fast scan with Ghana Card payload
        req = FastScannerIntakeRequest(
            raw_payload="GHA-71298412-1",
            scanner_type="GHANA_CARD_NFC",
            target_department="GENERAL_OPD",
            priority="ROUTINE",
        )

        res = await scan_fast_intake(req=req, current_user=clerk, db=None)
        assert res.success is True
        assert res.patient.ghana_card_id == "GHA-71298412-1"
        assert res.patient.mrn == "MRN-RDG-2026-99120"
        assert res.patient.physical_folder_rack == "Rack-A1"
        assert res.patient.physical_folder_shelf == "Shelf-02"
        assert res.queue_ticket_number.startswith("OPD-")
        assert res.destination_department == "GENERAL_OPD"

    asyncio.run(_test())


def test_folder_archive_map_and_checkout_return_lifecycle():
    async def _test():
        clerk = MockReceptionClerkUser()

        # 1. Fetch Archival Map
        archive_map = await get_folder_archive_map(search=None, current_user=clerk, db=None)
        assert archive_map.total_folders_tracked >= 4
        assert len(archive_map.available_racks) >= 3
        assert len(archive_map.folders) >= 4

        # 2. Check-out physical folder
        checkout_req = FolderCheckoutActionRequest(
            card_id="crd-01",
            destination_department="Consulting Room 2",
            doctor_name="Dr. Afia Appiah",
            notes="Follow-up consultation",
        )
        checkout_res = await checkout_physical_folder(req=checkout_req, current_user=clerk, db=None)
        assert checkout_res.success is True
        assert checkout_res.status == "WITH_DOCTOR"

        # 3. Return folder to archive shelf
        return_req = FolderReturnActionRequest(
            card_id="crd-01",
            rack_number="Rack-A1",
            shelf_row="Shelf-02",
            file_box_code="BOX-2026-01",
        )
        return_res = await return_physical_folder(req=return_req, current_user=clerk, db=None)
        assert return_res.success is True
        assert return_res.status == "IN_ARCHIVE"
        assert "Rack-A1" in return_res.location_summary

    asyncio.run(_test())


def test_waiting_room_tv_queue_audio_stream():
    async def _test():
        clerk = MockReceptionClerkUser()

        stream = await get_queue_audio_stream(current_user=clerk, db=None)
        assert len(stream.active_calls) >= 1
        assert stream.current_calling is not None
        assert "Ticket" in stream.current_calling.announcement_text
        assert stream.waiting_count >= 1

    asyncio.run(_test())
