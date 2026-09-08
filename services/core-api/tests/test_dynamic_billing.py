import asyncio
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_list_and_create_custom_subscription_plan():
    client = TestClient(app)
    # 1. List plans
    res = client.get("/api/v1/admin/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) >= 3
    codes = [p["code"] for p in plans]
    assert "PLAN-STARTER" in codes
    assert "PLAN-GROWTH" in codes
    assert "PLAN-ENTERPRISE" in codes

    # 2. Create a custom plan
    plan_code = f"PLAN-CLINIC-VIP-{uuid.uuid4().hex[:4].upper()}"
    payload = {
        "code": plan_code,
        "name": "Bespoke Polyclinic Network VIP",
        "tier": "CUSTOM",
        "target_facility_type": "CLINIC",
        "description": "Custom high-tier package with CPOE CDS and cold chain IoT.",
        "price_ghs_monthly": 2800.00,
        "price_xof_monthly": 140000.00,
        "price_usd_monthly": 250.00,
        "price_ghs_annual": 28000.00,
        "price_xof_annual": 1400000.00,
        "price_usd_annual": 2500.00,
        "trial_days": 21,
        "max_staff_seats": 40,
        "max_beds": 80,
        "max_monthly_rx": 20000,
        "max_branches": 5,
        "features": [
            "40 Clinical Staff Seats",
            "5 Clinic Branches with IBT",
            "Cold Chain IoT Active Telemetry",
        ],
        "feature_flags": {
            "enable_cpoe": True,
            "enable_emar": True,
            "enable_controlled_drugs": True,
            "enable_multibranch": True,
            "enable_telemetry": True,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": True,
            "enable_custom_tariffs": True,
            "enable_api_access": True,
        },
        "is_active": True,
    }

    create_res = client.post("/api/v1/admin/plans", json=payload)
    assert create_res.status_code == 201
    created_plan = create_res.json()
    assert created_plan["code"] == payload["code"]
    assert created_plan["max_staff_seats"] == 40
    assert created_plan["feature_flags"]["enable_cold_chain_iot"] is True
    assert Decimal(str(created_plan["price_ghs_monthly"])) == Decimal("2800.00")
    assert Decimal(str(created_plan["price_xof_monthly"])) == Decimal("140000.00")


def test_update_and_archive_subscription_plan():
    client = TestClient(app)
    # Create plan to update
    create_payload = {
        "code": "PLAN-TEMP-TO-UPDATE",
        "name": "Temporary Plan",
        "tier": "GROWTH",
        "target_facility_type": "PHARMACY",
        "description": "Temporary description",
        "price_ghs_monthly": 600.00,
        "price_xof_monthly": 30000.00,
        "price_ghs_annual": 6000.00,
        "price_xof_annual": 300000.00,
    }
    res_create = client.post("/api/v1/admin/plans", json=create_payload)
    assert res_create.status_code == 201
    plan_id = res_create.json()["id"]

    # Update plan
    update_payload = {
        "name": "Updated Temporary Plan",
        "price_ghs_monthly": 750.00,
        "max_staff_seats": 12,
    }
    res_update = client.put(f"/api/v1/admin/plans/{plan_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Updated Temporary Plan"
    assert Decimal(str(res_update.json()["price_ghs_monthly"])) == Decimal("750.00")
    assert res_update.json()["max_staff_seats"] == 12

    # Delete / Archive plan
    res_del = client.delete(f"/api/v1/admin/plans/{plan_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "archived"


def test_gateway_configuration_and_ping_test():
    client = TestClient(app)
    # List gateways
    res = client.get("/api/v1/admin/gateways")
    assert res.status_code == 200
    gws = res.json()
    gw_ids = [g["id"] for g in gws]
    assert "paystack" in gw_ids
    assert "fedapay" in gw_ids
    assert "hub2" in gw_ids

    # Update gateway environment
    update_res = client.put(
        "/api/v1/admin/gateways/paystack",
        json={"environment": "live", "priority": 1},
    )
    assert update_res.status_code == 200
    assert update_res.json()["environment"] == "live"

    # Test gateway connection ping
    ping_res = client.post("/api/v1/admin/gateways/paystack/test")
    assert ping_res.status_code == 200
    ping_data = ping_res.json()
    assert ping_data["status"] == "SUCCESS"
    assert ping_data["latency_ms"] > 0
    assert "Paystack" in ping_data["message"]


def test_tenant_billing_policy_and_custom_commission_override():
    client = TestClient(app)
    tenant_id = "11111111-1111-1111-1111-111111111111"

    # 1. Fetch current policy
    res = client.get(f"/api/v1/admin/billing/tenant-policy/{tenant_id}")
    assert res.status_code == 200
    policy = res.json()
    assert Decimal(str(policy["standard_commission_pct"])) == Decimal("5.00")

    # 2. Update to custom 3.2% commission and 21-day grace period
    update_res = client.put(
        f"/api/v1/admin/billing/tenant-policy/{tenant_id}",
        json={
            "custom_commission_pct": 3.20,
            "grace_period_days": 21,
            "discount_pct": 20.00,
            "notes": "Regional referral teaching center rate approved.",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert Decimal(str(updated["custom_commission_pct"])) == Decimal("3.20")
    assert Decimal(str(updated["effective_commission_pct"])) == Decimal("3.20")
    assert updated["grace_period_days"] == 21
    assert Decimal(str(updated["discount_pct"])) == Decimal("20.00")


def test_custom_enterprise_invoice_issuance():
    client = TestClient(app)
    payload = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "invoice_title": "Annual Enterprise Healthcare Suite & 24/7 SLA",
        "amount": 40000.00,
        "currency": "GHS",
        "due_date": "2026-09-30",
        "billing_period": "2026-2027 Annual Subscription",
        "line_items": [
            {
                "description": "Enterprise Core EHR (500 Beds & Telemetry)",
                "quantity": 1,
                "unit_price": 30000.00,
                "total": 30000.00,
            },
            {
                "description": "Statutory Cold Chain IoT Module + Dedicated Support",
                "quantity": 1,
                "unit_price": 10000.00,
                "total": 10000.00,
            },
        ],
        "send_momo_prompt": True,
        "momo_phone": "+233 24 412 3456",
        "momo_network": "mtn",
    }

    res = client.post("/api/v1/admin/subscriptions/custom-invoice", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["currency"] == "GHS"
    assert Decimal(str(data["amount"])) == Decimal("40000.00")
    assert data["status"] == "SENT_MOMO_PROMPT"
    assert data["momo_prompt_sent"] is True
    assert len(data["line_items"]) == 2
    assert "INV-ENT-" in data["invoice_number"]
