import asyncio
import uuid
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.admin_infrastructure import (
    get_gateway_health,
    update_gateway_failover_setting,
    list_webhook_dlq,
    replay_webhook_event,
    discard_webhook_event,
    run_tenant_integrity_sweep,
    get_tenant_audit_results,
    require_super_admin,
)
from app.schemas.infrastructure import (
    FailoverUpdateRequest,
)
from app.models.user import UserRole


class MockSuperAdminUser:
    id = "usr-superadmin-01"
    email = "admin@medipaedia.health"
    full_name = "System Super Administrator"
    tenant_id = None
    role = UserRole.SUPER_ADMIN


class MockDoctorUser:
    id = "usr-doc-01"
    email = "doctor.afia@ridgehospital.health"
    full_name = "Dr. Afia Appiah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.DOCTOR


def test_super_admin_role_enforcement():
    super_admin = MockSuperAdminUser()
    doctor = MockDoctorUser()

    # Super admin passes
    require_super_admin(super_admin)

    # Doctor is blocked
    with pytest.raises(HTTPException) as exc:
        require_super_admin(doctor)
    assert exc.value.status_code == 403


def test_gateway_health_telemetry_and_failover_toggle():
    async def _test():
        super_admin = MockSuperAdminUser()

        # 1. Fetch gateway telemetry
        health = await get_gateway_health(current_user=super_admin, db=None)
        assert len(health.gateways) >= 2
        providers = [g.provider for g in health.gateways]
        assert "PAYSTACK" in providers
        assert "FEDAPAY" in providers
        assert health.system_status in ["OPERATIONAL", "DEGRADED"]

        # 2. Update failover setting
        req = FailoverUpdateRequest(
            provider="PAYSTACK",
            auto_failover_enabled=True,
            fallback_provider="HUB2",
        )
        updated = await update_gateway_failover_setting(req=req, current_user=super_admin, db=None)
        assert updated.provider == "PAYSTACK"
        assert updated.auto_failover_enabled is True
        assert updated.active_fallback_provider == "HUB2"

    asyncio.run(_test())


def test_webhook_dlq_listing_filtering_and_replay():
    async def _test():
        super_admin = MockSuperAdminUser()

        # 1. List all DLQ events
        all_events = await list_webhook_dlq(status_filter=None, provider_filter=None, current_user=super_admin, db=None)
        assert all_events.total_count >= 1
        assert len(all_events.items) >= 1

        # 2. Filter by status
        pending = await list_webhook_dlq(status_filter="PENDING", provider_filter=None, current_user=super_admin, db=None)
        for item in pending.items:
            assert item.status == "PENDING"

        # 3. Idempotent replay of an event
        target_event = all_events.items[0]
        replay_res = await replay_webhook_event(event_id=target_event.id, current_user=super_admin, db=None)
        assert replay_res.success is True
        assert replay_res.id == target_event.id
        assert replay_res.retry_count >= 1

        # 4. Discard an event
        discard_res = await discard_webhook_event(event_id=target_event.id, current_user=super_admin, db=None)
        assert discard_res.success is True
        assert discard_res.id == target_event.id

    asyncio.run(_test())


def test_tenant_isolation_and_db_integrity_sweep():
    async def _test():
        super_admin = MockSuperAdminUser()

        # 1. Run live security sweep
        sweep_res = await run_tenant_integrity_sweep(current_user=super_admin, db=None)
        assert sweep_res.total_checks >= 3
        assert sweep_res.passed_checks >= 3
        assert sweep_res.failed_checks == 0
        assert sweep_res.overall_status == "HEALTHY"

        check_types = [c.check_type for c in sweep_res.results]
        assert "ISOLATION" in check_types
        assert "INTEGRITY" in check_types
        assert "LEDGER" in check_types

        # 2. Get latest cached audit results
        cached_results = await get_tenant_audit_results(current_user=super_admin, db=None)
        assert cached_results.total_checks == sweep_res.total_checks

    asyncio.run(_test())
