import asyncio
import uuid
import pytest

from app.services.ai_predictive_analytics import (
    forecast_seasonal_demand,
    scrub_insurance_claims,
    detect_epidemic_clusters,
)
from app.api.v1.endpoints.ai_analytics import (
    get_seasonal_demand_forecast,
    scrub_insurance_claim_batch,
    get_epidemic_outbreak_sentinel,
)
from app.schemas.ai_analytics import ClaimScrubBatchRequest
from app.models.user import UserRole


class MockFinanceUser:
    id = "usr-fin-01"
    email = "finance.officer@ridgehospital.health"
    full_name = "Finance Officer"
    tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    role = UserRole.HOSPITAL_FINANCE


def test_forecast_seasonal_demand_multipliers():
    res = forecast_seasonal_demand(target_month="June 2026")
    assert res.success is True
    assert res.target_period == "June 2026"
    assert res.total_forecasted_spend_ghs > 0
    assert len(res.forecast_items) >= 4

    coartem = next((it for it in res.forecast_items if "Coartem" in it.medication_name), None)
    assert coartem is not None
    assert coartem.seasonal_factor_multiplier >= 2.0
    assert coartem.stockout_risk_level == "HIGH_RISK"
    assert coartem.predicted_monthly_demand > 1000

    salbutamol = next((it for it in res.forecast_items if "Salbutamol" in it.medication_name), None)
    assert salbutamol is not None
    assert salbutamol.seasonal_factor_multiplier >= 2.0


def test_scrub_insurance_claims_rules():
    res = scrub_insurance_claims(batch_id="NHIS-BATCH-202608-01", claims_count=15)
    assert res.success is True
    assert res.batch_id == "NHIS-BATCH-202608-01"
    assert res.total_claims_audited == 15
    assert res.clean_claim_rate_percent >= 80.0
    assert len(res.issues) >= 3

    # Verify specific discrepancy types
    issue_types = [i.issue_type for i in res.issues]
    assert "MISSING_PRE_AUTH" in issue_types
    assert "TARIFF_OVERCHARGE" in issue_types
    assert "DUPLICATE_BILLING" in issue_types

    # Pre-auth issue details
    pre_auth_issue = next(i for i in res.issues if i.issue_type == "MISSING_PRE_AUTH")
    assert pre_auth_issue.insurance_scheme == "ACACIA_HMO"
    assert "AC-AUTH-" in pre_auth_issue.suggested_auto_fix


def test_detect_epidemic_clusters_surge():
    res = detect_epidemic_clusters()
    assert res.success is True
    assert res.total_anonymized_encounters_scanned > 10000
    assert res.active_outbreak_alerts_count >= 3

    # Check Accra malaria surge
    malaria_cluster = next((c for c in res.regional_clusters if "B50.9" in c.icd10_code), None)
    assert malaria_cluster is not None
    assert malaria_cluster.surge_multiplier >= 2.5
    assert malaria_cluster.severity_level == "HIGH_ALERT"

    # Check Lomé enteric surge
    gastro_cluster = next((c for c in res.regional_clusters if "A09" in c.icd10_code), None)
    assert gastro_cluster is not None
    assert gastro_cluster.surge_multiplier >= 3.0


def test_ai_analytics_endpoints():
    async def _test():
        user = MockFinanceUser()

        # 1. Test GET /api/v1/ai/analytics/demand-forecast
        demand_res = await get_seasonal_demand_forecast(
            target_month="July 2026",
            current_user=user,
            db=None,
        )
        assert demand_res.success is True
        assert demand_res.target_period == "July 2026"

        # 2. Test POST /api/v1/ai/insurance/scrub-batch
        scrub_req = ClaimScrubBatchRequest(batch_id="NHIS-BATCH-202608-05", claims_count=20)
        scrub_res = await scrub_insurance_claim_batch(
            req=scrub_req,
            current_user=user,
            db=None,
        )
        assert scrub_res.success is True
        assert scrub_res.total_claims_audited == 20
        assert scrub_res.ready_for_adjudication is True

        # 3. Test GET /api/v1/ai/epidemiology/outbreak-sentinel
        sentinel_res = await get_epidemic_outbreak_sentinel(
            current_user=user,
            db=None,
        )
        assert sentinel_res.success is True
        assert len(sentinel_res.regional_clusters) >= 3

    asyncio.run(_test())
