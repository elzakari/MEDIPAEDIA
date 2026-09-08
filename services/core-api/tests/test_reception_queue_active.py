import asyncio
import uuid
import pytest
from app.api.v1.endpoints.reception import get_active_queue
from app.schemas.reception import (
    ActiveQueueItemResponse,
    ClinicDepartment,
    ReceptionTriagePriority,
)
from app.core.database import get_db
from app.core.deps import get_optional_tenant


# ---------------------------------------------------------------------------
# Stub DB session that returns empty scalars (no real Postgres connection)
# ---------------------------------------------------------------------------

class _StubScalars:
    def all(self):
        return []


class _StubResult:
    def scalars(self):
        return _StubScalars()


class _StubDB:
    async def execute(self, *args, **kwargs):
        return _StubResult()


async def _override_get_db():
    yield _StubDB()


async def _override_get_tenant():
    return None


# ---------------------------------------------------------------------------
# Unit test: direct call with db=None triggers demo data fallback
# ---------------------------------------------------------------------------

def test_get_active_queue_unit_schema_validation():
    """Handler must return >=1 demo items with all required fields when db=None."""
    async def _test():
        items = await get_active_queue(department=None, date=None, tenant=None, db=None)
        assert isinstance(items, list), "Response must be a list"
        assert len(items) >= 1, "At least one demo queue item expected"

        first = items[0]
        assert isinstance(first, ActiveQueueItemResponse)
        assert first.queue_number is not None
        assert first.patient_name is not None
        assert first.mrn is not None
        assert first.destination_clinic in list(ClinicDepartment)
        assert first.priority in list(ReceptionTriagePriority)
        assert first.status in ("QUEUED", "CALLED", "WITH_DOCTOR")
        assert first.wait_duration_minutes >= 0
        assert first.estimated_wait_minutes is not None

    asyncio.run(_test())


def test_get_active_queue_unit_department_filter():
    """Department filter must narrow results correctly."""
    async def _test():
        opd = await get_active_queue(department="GENERAL_OPD", date=None, tenant=None, db=None)
        assert all(i.destination_clinic == ClinicDepartment.GENERAL_OPD for i in opd)

        emg = await get_active_queue(department="EMERGENCY", date=None, tenant=None, db=None)
        assert all(i.destination_clinic == ClinicDepartment.EMERGENCY for i in emg)

        anc = await get_active_queue(department="ANTENATAL", date=None, tenant=None, db=None)
        assert all(i.destination_clinic == ClinicDepartment.ANTENATAL for i in anc)

    asyncio.run(_test())


# ---------------------------------------------------------------------------
# Integration test: ASGI client + DB dependency override (no real Postgres)
# ---------------------------------------------------------------------------

def test_get_active_queue_http_200():
    """GET /api/v1/reception/queue/active must return 200 with valid list payload."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    import base64
    import json

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_optional_tenant] = _override_get_tenant

    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            header = base64.b64encode(b'{"alg":"HS256","typ":"JWT"}').decode()
            payload = base64.b64encode(json.dumps({
                "sub": "00000000-0000-0000-0000-000000000001",
                "role": "RECORD_CLERK",
                "type": "access",
            }).encode()).decode()
            token = f"{header}.{payload}.mock_signature"

            response = await ac.get(
                "/api/v1/reception/queue/active",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 200, (
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 1
            first = data[0]
            assert "queue_number" in first
            assert "patient_name" in first
            assert "mrn" in first
            assert "destination_clinic" in first
            assert "priority" in first
            assert "wait_duration_minutes" in first
            assert "estimated_wait_minutes" in first

    try:
        asyncio.run(_test())
    finally:
        app.dependency_overrides.clear()

