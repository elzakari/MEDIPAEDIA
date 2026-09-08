"""
Tests for queue ticket number formatting.

Verifies:
  - All intake paths produce shortcodes matching ^(OPD|EMER|ANC|PED|EYE|DNT|SUR)-\d{3,}$
  - _sanitize_ticket_number converts raw UUIDs to safe shortcodes
  - _is_uuid_like correctly identifies UUIDs vs clean codes
"""
import asyncio
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.v1.endpoints.reception import (
    _make_ticket_number,
    _sanitize_ticket_number,
    _is_uuid_like,
    _DEPT_PREFIX_MAP,
)
from app.schemas.reception import ClinicDepartment

# Pattern all generated tickets must satisfy
TICKET_RE = re.compile(r"^(OPD|EMER|ANC|PED|EYE|DNT|SUR)-\d{3,}$")


class TestIsUuidLike:
    def test_standard_uuid_detected(self):
        assert _is_uuid_like("2fd5de72-354d-4a57-b6a0-40b2a584122f") is True

    def test_clean_code_not_detected(self):
        assert _is_uuid_like("OPD-102") is False
        assert _is_uuid_like("EMER-009") is False
        assert _is_uuid_like("ANC-047") is False

    def test_empty_string(self):
        assert _is_uuid_like("") is False


class TestMakeTicketNumber:
    def test_all_departments_produce_correct_prefix(self):
        for dept, expected_prefix in _DEPT_PREFIX_MAP.items():
            ticket = _make_ticket_number(dept)
            assert ticket.startswith(f"{expected_prefix}-"), (
                f"Expected {expected_prefix}- prefix for {dept}, got {ticket}"
            )
            assert TICKET_RE.match(ticket), f"Ticket {ticket!r} does not match pattern"

    def test_sequential_number_padded(self):
        ticket = _make_ticket_number(ClinicDepartment.GENERAL_OPD, seq=5)
        assert ticket == "OPD-005"

    def test_sequential_number_large(self):
        ticket = _make_ticket_number(ClinicDepartment.EMERGENCY, seq=142)
        assert ticket == "EMER-142"

    def test_random_seq_in_range(self):
        for _ in range(20):
            ticket = _make_ticket_number(ClinicDepartment.ANTENATAL)
            assert TICKET_RE.match(ticket), f"Generated ticket {ticket!r} does not match pattern"


class TestSanitizeTicketNumber:
    def test_clean_code_passes_through(self):
        assert _sanitize_ticket_number("OPD-102") == "OPD-102"
        assert _sanitize_ticket_number("EMER-009") == "EMER-009"
        assert _sanitize_ticket_number("ANC-047") == "ANC-047"

    def test_uuid_replaced_with_dept_prefix(self):
        raw_uuid = "2fd5de72-354d-4a57-b6a0-40b2a584122f"
        result = _sanitize_ticket_number(
            raw_uuid,
            dept=ClinicDepartment.GENERAL_OPD,
            entry_id=raw_uuid,
        )
        assert result.startswith("OPD-"), f"Expected OPD- prefix, got {result}"
        assert TICKET_RE.match(result), f"Sanitized {result!r} does not match pattern"

    def test_none_replaced_with_random(self):
        result = _sanitize_ticket_number(None, dept=ClinicDepartment.EMERGENCY)
        assert result.startswith("EMER-"), f"Expected EMER- prefix, got {result}"
        assert TICKET_RE.match(result), f"Sanitized {result!r} does not match pattern"

    def test_emergency_uuid_gets_emer_prefix(self):
        raw_uuid = "7c79fb9c-2a26-5f28-845b-c13bdb7dabef"
        result = _sanitize_ticket_number(
            raw_uuid,
            dept=ClinicDepartment.EMERGENCY,
            entry_id=raw_uuid,
        )
        assert result.startswith("EMER-"), f"Expected EMER- prefix, got {result}"
        assert TICKET_RE.match(result), f"Sanitized {result!r} does not match pattern"


def test_make_ticket_number_all_depts():
    """Standalone pytest-compatible test: all departments generate valid shortcodes."""
    t = TestMakeTicketNumber()
    t.test_all_departments_produce_correct_prefix()
    t.test_sequential_number_padded()
    t.test_sequential_number_large()
    t.test_random_seq_in_range()


def test_sanitize_uuid_leak_prevention():
    """Standalone pytest-compatible test: raw UUIDs are sanitized."""
    t = TestSanitizeTicketNumber()
    t.test_clean_code_passes_through()
    t.test_uuid_replaced_with_dept_prefix()
    t.test_none_replaced_with_random()
    t.test_emergency_uuid_gets_emer_prefix()
