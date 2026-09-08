from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# 1. SEASONAL DEMAND FORECASTING SCHEMAS
# ============================================================================

class SeasonalForecastItem(BaseModel):
    medication_name: str
    category: str
    current_stock_on_hand: int
    daily_velocity: float
    seasonal_factor_multiplier: float  # e.g. 2.4x for rainy season malaria
    predicted_monthly_demand: int
    recommended_order_quantity: int
    stockout_risk_level: str  # HIGH_RISK, MODERATE_RISK, HEALTHY
    primary_surge_driver: str  # e.g. "Rainy Season May-July Peak", "Harmattan Dry Season Dust"
    estimated_purchase_cost_ghs: float


class SeasonalDemandResponse(BaseModel):
    success: bool
    target_period: str
    season_name: str
    climate_driver: str
    total_forecasted_spend_ghs: float
    total_items_analyzed: int
    high_risk_stockouts_count: int
    forecast_items: List[SeasonalForecastItem]


# ============================================================================
# 2. AI INSURANCE CLAIM SCRUBBER SCHEMAS
# ============================================================================

class ClaimScrubIssue(BaseModel):
    issue_id: str
    claim_id: str
    patient_name: str
    patient_identifier: str
    insurance_scheme: str  # NHIS, ACACIA_HMO, GLICO_HEALTH, NATIONWIDE
    severity: str  # CRITICAL_REJECTION_RISK, WARNING, TARIFF_MISMATCH
    issue_type: str  # MISSING_PRE_AUTH, TARIFF_OVERCHARGE, INVALID_ICD10, DUPLICATE_BILLING
    description: str
    suggested_auto_fix: str
    impact_amount_ghs: float


class ClaimScrubberReportResponse(BaseModel):
    success: bool
    batch_id: str
    total_claims_audited: int
    clean_claim_rate_percent: float  # e.g. 96.5%
    total_audited_value_ghs: float
    potential_rejection_value_ghs: float
    passed_clean_count: int
    issues_flagged_count: int
    issues: List[ClaimScrubIssue]
    ready_for_adjudication: bool


class ClaimScrubBatchRequest(BaseModel):
    batch_id: Optional[str] = "BATCH-CLAIM-2026-08"
    claims_count: Optional[int] = 15
    insurance_provider: Optional[str] = "ALL"


# ============================================================================
# 3. EPIDEMIC OUTBREAK SENTINEL SCHEMAS
# ============================================================================

class EpidemicOutbreakAlertItem(BaseModel):
    alert_id: str
    icd10_code: str
    disease_name: str
    region_cluster: str  # e.g. "Greater Accra (Accra Metro)", "Lomé Maritime", "Ashanti (Kumasi Metro)"
    baseline_30d_cases: int
    current_7d_cases: int
    surge_multiplier: float  # e.g. 2.8x
    severity_level: str  # HIGH_ALERT, WATCH_CLUSTER, LOW_RISK
    confidence_level: float  # 0.00 to 1.00
    public_health_guideline: str
    anonymized_patient_sample_count: int


class EpidemicSentinelResponse(BaseModel):
    success: bool
    telemetry_timestamp: str
    total_anonymized_encounters_scanned: int
    active_outbreak_alerts_count: int
    regional_clusters: List[EpidemicOutbreakAlertItem]
