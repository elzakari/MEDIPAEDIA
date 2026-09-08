import asyncio
import hashlib
import json
import uuid
import pytest

from app.services.pharmacy_analytics import calculate_stock_depletion_velocity
from app.api.v1.endpoints.pharmacy_admin import (
    get_stock_depletion_forecast,
    generate_bulk_po_from_forecast,
)
from app.api.v1.endpoints.superintendent import (
    export_regulatory_compliance_bundle,
    get_compliance_audit_history,
)
from app.api.v1.endpoints.pharmacy import (
    get_unified_dispatch_queue,
    dispatch_courier_delivery,
)
from app.schemas.pharmacy import (
    BulkPOGenerationRequest,
    BulkPOGenerationItemInput,
    ComplianceExportRequest,
    CourierDispatchActionRequest,
)
from app.models.user import UserRole


class MockPharmacyAdminUser:
    id = "usr-pharm-admin-01"
    email = "admin.pharmacy@ridgehospital.health"
    full_name = "Pharm. Ellen Mensah"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.TENANT_ADMIN


class MockSuperintendentUser:
    id = "usr-supt-01"
    email = "superintendent@ridgehospital.health"
    full_name = "Pharm. Kojo Asante (FPCPharm)"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.PHARMACIST


def test_calculate_stock_depletion_velocity_math():
    results = calculate_stock_depletion_velocity(days_lookback=30)
    assert len(results) >= 4

    # Critical stockouts should be prioritized at the top
    assert results[0]["urgency"] in ["CRITICAL", "WARNING"]
    for item in results:
        assert "medication_id" in item
        assert "daily_velocity" in item
        assert "days_until_depletion" in item
        assert "predicted_runout_date" in item
        assert "suggested_packs_order" in item
        assert item["suggested_packs_order"] >= 10
        assert item["estimated_po_cost_ghs"] > 0


def test_depletion_forecast_endpoint_and_bulk_po_generation():
    async def _test():
        admin = MockPharmacyAdminUser()

        # 1. Fetch depletion forecast
        forecast = await get_stock_depletion_forecast(admin=admin, db=None)
        assert forecast.total_items_monitored >= 4
        assert forecast.critical_stockouts_count >= 1
        assert forecast.total_estimated_restock_cost_ghs > 0
        assert len(forecast.forecast_timeline) >= 4

        # 2. 1-Click Convert Forecast into Supplier Purchase Orders
        critical_items = [
            BulkPOGenerationItemInput(
                medication_id=i.medication_id,
                supplier_id=i.supplier_id,
                suggested_packs=i.suggested_packs_order,
                unit_cost_ghs=i.unit_cost_ghs,
            )
            for i in forecast.forecast_timeline
            if i.urgency in ["CRITICAL", "WARNING"]
        ]

        req = BulkPOGenerationRequest(
            items=critical_items,
            notes="Testing automated bulk PO conversion from depletion radar",
        )

        po_res = await generate_bulk_po_from_forecast(req=req, admin=admin, db=None)
        assert po_res.purchase_orders_created >= 1
        assert len(po_res.po_numbers) == po_res.purchase_orders_created
        assert po_res.total_commitment_ghs > 0
        for po_num in po_res.po_numbers:
            assert po_num.startswith("PO-")

    asyncio.run(_test())


def test_regulatory_compliance_package_export_and_sha256_hash():
    async def _test():
        supt = MockSuperintendentUser()

        req = ComplianceExportRequest(
            start_date="2026-08-01",
            end_date="2026-08-21",
            inspectorate_agency="Pharmacy Council of Ghana & FDA",
            include_dangerous_drugs=True,
            include_cold_chain=True,
            include_quarantine_logs=True,
            include_adr_reports=True,
        )

        bundle = await export_regulatory_compliance_bundle(req=req, current_user=supt, db=None)
        assert bundle.certificate_id.startswith("REG-CERT-PCG-")
        assert bundle.superintendent_pin == "PSGH/REG/89201"
        assert bundle.facility_license_number == "PC/GAR/09124-SP"
        assert len(bundle.sections) == 4
        assert bundle.total_records_certified > 0

        # Cryptographic verification: Verify SHA-256 hash
        payload_str = json.dumps(bundle.raw_compliance_payload, sort_keys=True, default=str)
        expected_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        assert bundle.tamper_proof_sha256_hash == expected_hash

        # Audit History Verification
        history = await get_compliance_audit_history(current_user=supt, db=None)
        assert len(history) >= 1
        assert history[0].certificate_number == bundle.certificate_id
        assert history[0].sha256_hash == bundle.tamper_proof_sha256_hash

    asyncio.run(_test())


def test_unified_dispensary_dispatch_desk_and_courier_handover():
    async def _test():
        supt = MockSuperintendentUser()

        # 1. Fetch unified dispatch queue
        queue = await get_unified_dispatch_queue(current_user=supt, db=None)
        assert len(queue.counter_pickups) >= 2
        assert len(queue.courier_deliveries) >= 2
        assert queue.pending_counter_count >= 1

        # Check pickup item fields
        pickup = queue.counter_pickups[0]
        assert pickup.order_type == "STORE_PICKUP"
        assert len(pickup.items) >= 1
        assert pickup.collection_otp is not None

        # 2. Dispatch a courier order
        target_delivery = queue.courier_deliveries[1]  # ord-cd-202 (AWAITING_COURIER)
        dispatch_req = CourierDispatchActionRequest(
            order_id=target_delivery.order_id,
            courier_provider="BOLT",
            rider_name="Emmanuel Darko (Bolt Courier #4102)",
            rider_phone="+233 24 991 8273",
            vehicle_registration="M-26-AS-1029",
            notes="Fast express medical delivery",
        )

        dispatch_res = await dispatch_courier_delivery(req=dispatch_req, current_user=supt, db=None)
        assert dispatch_res.order_id == target_delivery.order_id
        assert dispatch_res.status == "IN_TRANSIT"
        assert dispatch_res.courier_provider == "BOLT"
        assert dispatch_res.rider_name == "Emmanuel Darko (Bolt Courier #4102)"
        assert dispatch_res.tracking_code.startswith("TRK-BOL-")

    asyncio.run(_test())
