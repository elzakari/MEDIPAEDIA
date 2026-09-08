import asyncio
from decimal import Decimal
import pytest

from app.schemas.hospital_admin import (
    ClinicalIncidentCreateRequest,
    CreateShiftRosterRequest,
    IncidentSeverity,
    ShiftType,
    StaffCredentialUpdateRequest,
    StaffInviteRequest,
    TheatreStatus,
    TheatreStatusUpdateRequest,
    UpdateDepartmentBedsRequest,
    UpdateHospitalTariffRequest,
)
from app.api.v1.endpoints.hospital_admin import (
    get_hospital_staff,
    invite_hospital_staff,
    update_staff_credentials,
    get_shift_roster,
    create_shift_roster_entry,
    get_facility_departments,
    update_department_beds,
    get_operating_theatres,
    update_theatre_status,
    get_hospital_tariffs,
    update_hospital_tariffs,
    get_throughput_analytics,
    get_clinical_incidents,
    log_clinical_incident,
)


class MockUser:
    id = "usr-admin-01"
    email = "admin.ridge@ridgehospital.health"
    full_name = "Hospital Administrator"
    role = type("Role", (), {"value": "HOSPITAL_ADMIN"})()


def test_staff_workforce_and_credentialing():
    """
    Test staff listing, new practitioner provisioning with MDC/NMC license PIN,
    and credential updates.
    """
    async def _test():
        user = MockUser()

        # 1. List staff
        staff_list = await get_hospital_staff(role=None, department=None, current_user=user, db=None)
        assert len(staff_list) >= 4
        assert any(s.council_pin == "MDC/RN/89124" for s in staff_list)

        # 2. Invite new staff
        invite_req = StaffInviteRequest(
            full_name="Dr. Samuel Osei",
            email="doctor.osei@ridgehospital.health",
            phone="0244998877",
            role="DOCTOR",
            department="Male Medical Ward",
            council_pin="MDC/RN/99214",
            license_expiry="31 Dec 2026",
        )
        new_staff = await invite_hospital_staff(invite_req, current_user=user, db=None)
        assert new_staff.full_name == "Dr. Samuel Osei"
        assert new_staff.council_pin == "MDC/RN/99214"
        assert new_staff.license_status == "VERIFIED"

        # 3. Update staff credentials & on-duty toggle
        cred_req = StaffCredentialUpdateRequest(
            council_pin="MDC/RN/99214-UPDATED",
            license_expiry="31 Dec 2027",
            is_on_duty=True,
        )
        updated = await update_staff_credentials(new_staff.staff_id, cred_req, current_user=user, db=None)
        assert updated.council_pin == "MDC/RN/99214-UPDATED"
        assert updated.is_on_duty is True

    asyncio.run(_test())


def test_shift_rostering_and_theatre_telemetry():
    """
    Test shift allocation, ward bed adjustment, and operating theatre status updates.
    """
    async def _test():
        user = MockUser()

        # 1. Create shift roster entry
        roster_req = CreateShiftRosterRequest(
            staff_id="stf-001",
            staff_name="Dr. Afia Appiah",
            role="DOCTOR",
            department="Triage & Emergency",
            shift_date="2026-08-21",
            shift_type=ShiftType.AFTERNOON,
            start_time="14:00",
            end_time="22:00",
        )
        roster_res = await create_shift_roster_entry(roster_req, current_user=user, db=None)
        assert roster_res.shift_type == ShiftType.AFTERNOON
        assert roster_res.department == "Triage & Emergency"

        # 2. Update ward bed capacity
        bed_req = UpdateDepartmentBedsRequest(total_beds=16, head_of_department="Dr. Kwame Antwi")
        dept = await update_department_beds("dept-01", bed_req, current_user=user, db=None)
        assert dept.total_beds == 16
        assert dept.available_beds == 6

        # 3. Update theatre telemetry
        theatre_req = TheatreStatusUpdateRequest(
            status=TheatreStatus.AVAILABLE,
            current_procedure="Ready for Elective Cases",
            next_available_time="Immediate",
        )
        theatre = await update_theatre_status("th-01", theatre_req, current_user=user, db=None)
        assert theatre.status == TheatreStatus.AVAILABLE

    asyncio.run(_test())


def test_tariffs_and_clinical_incident_registry():
    """
    Test tariff updates, operational throughput analytics, and clinical adverse incident logging.
    """
    async def _test():
        user = MockUser()

        # 1. Update tariffs
        tariff_req = UpdateHospitalTariffRequest(
            opd_registration_fee_ghs=Decimal("60.00"),
            specialist_consultation_fee_ghs=Decimal("150.00"),
            general_ward_night_ghs=Decimal("180.00"),
        )
        tariffs = await update_hospital_tariffs(tariff_req, current_user=user, db=None)
        assert tariffs.opd_registration_fee_ghs == Decimal("60.00")
        assert tariffs.specialist_consultation_fee_ghs == Decimal("150.00")

        # 2. Throughput analytics
        throughput = await get_throughput_analytics(current_user=user, db=None)
        assert throughput.daily_patient_footfall == 148
        assert len(throughput.pipeline_stages) == 5

        # 3. Log clinical incident
        inc_req = ClinicalIncidentCreateRequest(
            department="Operating Theatre",
            severity=IncidentSeverity.LOW,
            incident_type="Cautery Unit Warning Check",
            description="Routine pre-op calibration alert handled before surgery started.",
            action_taken="Biomedical engineering validated equipment.",
        )
        incident = await log_clinical_incident(inc_req, current_user=user, db=None)
        assert incident.department == "Operating Theatre"
        assert incident.status == "UNDER_INVESTIGATION"

    asyncio.run(_test())
