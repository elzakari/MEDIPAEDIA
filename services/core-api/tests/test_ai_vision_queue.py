import asyncio
import uuid
import pytest

from app.services.ai_vision_ocr import (
    extract_id_card_data,
    extract_prescription_ocr,
    predict_queue_wait_time,
)
from app.api.v1.endpoints.ai_vision import (
    process_id_card_ocr,
    process_prescription_handwriting_ocr,
    get_queue_wait_time_estimate,
)
from app.schemas.ai_vision import (
    IDCardOCRRequest,
    PrescriptionOCRRequest,
)
from app.models.user import UserRole


class MockClerkUser:
    id = "usr-clerk-01"
    email = "clerk.mensah@ridgehospital.health"
    full_name = "Clerk Mensah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.RECORD_CLERK


def test_extract_id_card_data_ghana_card():
    raw_ghana_card = (
        "REPUBLIC OF GHANA NATIONAL IDENTITY CARD\n"
        "SURNAME: MENSAH\n"
        "FIRST NAMES: KWESI KOJO\n"
        "NATIONALITY: GHANAIAN\n"
        "SEX: M\n"
        "DATE OF BIRTH: 1988-08-14\n"
        "PERSONAL ID NUMBER: GHA-71298412-1\n"
        "EXPIRY DATE: 2032-05-12"
    )
    res = extract_id_card_data(raw_text_hint=raw_ghana_card)

    assert res.success is True
    assert res.id_number == "GHA-71298412-1"
    assert res.first_name == "Kwesi"
    assert res.last_name == "Mensah"
    assert res.gender == "MALE"
    assert res.date_of_birth == "1988-08-14"
    assert res.confidence_score >= 0.95
    assert res.ocr_quality == "HIGH_CONFIDENCE"


def test_extract_id_card_data_passport():
    raw_passport = (
        "REPUBLIC OF GHANA PASSPORT\n"
        "SURNAME: BOATENG\n"
        "FIRST NAMES: ESI ABENA\n"
        "SEX: F\n"
        "DATE OF BIRTH: 1994-02-20\n"
        "PERSONAL ID NUMBER: GHA-894120349-1\n"
        "NATIONALITY: GHANAIAN\n"
        "EXPIRY DATE: 2030-11-18"
    )
    res = extract_id_card_data(raw_text_hint=raw_passport, document_type="PASSPORT")

    assert res.success is True
    assert res.id_number == "GHA-894120349-1"
    assert res.first_name == "Esi"
    assert res.last_name == "Boateng"
    assert res.gender == "FEMALE"
    assert res.date_of_birth == "1994-02-20"


def test_extract_prescription_ocr_multiple_drugs():
    sample_rx = (
        "Dr. Afia Appiah - Ridge Hospital OPD\n"
        "Rx:\n"
        "1. Coartem 20/120mg 4 tabs stat, then 4 at 8h, then BD x 3 days\n"
        "2. Paracetamol 500mg TDS x 3 days\n"
        "3. Amoxicillin-Clavulanate 625mg BD x 5 days"
    )
    res = extract_prescription_ocr(raw_text_hint=sample_rx)

    assert res.success is True
    assert res.confidence_score >= 0.90
    assert len(res.extracted_items) >= 3

    names = [it.medication_name for it in res.extracted_items]
    assert any("Coartem" in n for n in names)
    assert any("Paracetamol" in n for n in names)
    assert any("Amoxicillin" in n for n in names)


def test_predict_queue_wait_time_calculations():
    # 1. Routine Priority Wait Time
    pos_5 = predict_queue_wait_time(department="GENERAL_OPD", queue_position=5, triage_priority="ROUTINE")
    assert pos_5.success is True
    assert pos_5.department == "GENERAL_OPD"
    assert pos_5.queue_position == 5
    assert pos_5.estimated_wait_minutes >= 10
    assert pos_5.urgency_tier == "ROUTINE"
    assert ":" in pos_5.estimated_consultation_eta

    # 2. STAT Priority Wait Time
    stat_pos = predict_queue_wait_time(department="EMERGENCY", queue_position=8, triage_priority="STAT")
    assert stat_pos.estimated_wait_minutes <= 3
    assert stat_pos.urgency_tier == "STAT"

    # 3. Urgent Priority Wait Time
    urgent_pos = predict_queue_wait_time(department="ANTENATAL", queue_position=3, triage_priority="URGENT")
    assert urgent_pos.estimated_wait_minutes < pos_5.estimated_wait_minutes
    assert urgent_pos.urgency_tier == "URGENT"


def test_ai_vision_endpoints():
    async def _test():
        clerk = MockClerkUser()

        # 1. Test POST /api/v1/ai/ocr/id-card
        id_req = IDCardOCRRequest(
            raw_text_hint="SURNAME: MENSAH\nFIRST NAMES: KWESI KOJO\nSEX: M\nDATE OF BIRTH: 1988-08-14\nPERSONAL ID NUMBER: GHA-71298412-1"
        )
        id_res = await process_id_card_ocr(req=id_req, current_user=clerk, db=None)
        assert id_res.success is True
        assert id_res.id_number == "GHA-71298412-1"

        # 2. Test POST /api/v1/ai/ocr/prescription
        rx_req = PrescriptionOCRRequest(
            doctor_notes_hint="Amlodipine 10mg OD x 30d, Paracetamol 500mg TDS"
        )
        rx_res = await process_prescription_handwriting_ocr(req=rx_req, current_user=clerk, db=None)
        assert rx_res.success is True
        assert len(rx_res.extracted_items) >= 2

        # 3. Test GET /api/v1/ai/queue/wait-time-estimate
        queue_res = await get_queue_wait_time_estimate(
            department="GENERAL_OPD",
            queue_position=4,
            triage_priority="ROUTINE",
            current_user=clerk,
            db=None,
        )
        assert queue_res.success is True
        assert queue_res.estimated_wait_minutes > 0

    asyncio.run(_test())
