from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.ai_analytics import (
    ClaimScrubBatchRequest,
    ClaimScrubberReportResponse,
    EpidemicSentinelResponse,
    SeasonalDemandResponse,
)
from app.services.ai_predictive_analytics import (
    detect_epidemic_clusters,
    forecast_seasonal_demand,
    scrub_insurance_claims,
)

router = APIRouter()


@router.get("/analytics/demand-forecast", response_model=SeasonalDemandResponse)
async def get_seasonal_demand_forecast(
    target_month: Optional[str] = Query(default=None, description="Forecast target month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Seasonal Demand Forecasting Engine: Computes forecasted inventory requirements combining
    30-day velocity burn rates, historical seasonal multipliers, and safety buffers.
    """
    res = forecast_seasonal_demand(
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        target_month=target_month,
    )
    return res


@router.post("/insurance/scrub-batch", response_model=ClaimScrubberReportResponse)
async def scrub_insurance_claim_batch(
    req: ClaimScrubBatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Insurance Claim Scrubber: Scans patient claim line items against Ghana DRG rules,
    active NHIS tariff catalogs, and private HMO pre-authorizations. Flags missing diagnosis codes,
    mismatched service rates, duplicate billing items, and computes a Clean Claim Rate %.
    """
    res = scrub_insurance_claims(
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        batch_id=req.batch_id or "BATCH-CLAIM-2026-08",
        claims_count=req.claims_count or 15,
    )
    return res


@router.get("/epidemiology/outbreak-sentinel", response_model=EpidemicSentinelResponse)
async def get_epidemic_outbreak_sentinel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Epidemic Outbreak Sentinel: Evaluates aggregated, anonymized ICD-10 visit records across
    geographic postal clusters to identify statistically significant disease spikes (>2.0x 30-day baseline).
    """
    res = detect_epidemic_clusters()
    return res
