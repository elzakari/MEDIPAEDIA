from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class GatewayHealthMetric(BaseModel):
    provider: str
    name: str
    region: str
    status: str  # HEALTHY, DEGRADED, DOWN
    latency_ms: float
    uptime_percent: float
    error_rate_percent: float
    last_checked: datetime
    auto_failover_enabled: bool = True
    active_fallback_provider: Optional[str] = None


class GatewayHealthResponse(BaseModel):
    gateways: List[GatewayHealthMetric]
    system_status: str
    auto_failover_active: bool
    last_updated: datetime


class FailoverUpdateRequest(BaseModel):
    provider: str
    auto_failover_enabled: bool
    fallback_provider: Optional[str] = None


class WebhookDLQItem(BaseModel):
    id: str
    gateway_provider: str
    event_type: str
    payload: Dict[str, Any]
    headers: Optional[Dict[str, Any]] = None
    error_reason: str
    retry_count: int
    status: str  # PENDING, REPLAYED, DISCARDED
    received_at: datetime
    last_retry_at: Optional[datetime] = None


class WebhookDLQListResponse(BaseModel):
    items: List[WebhookDLQItem]
    total_count: int
    pending_count: int
    replayed_count: int
    discarded_count: int


class WebhookReplayResponse(BaseModel):
    id: str
    success: bool
    message: str
    retry_count: int
    execution_timestamp: datetime


class TenantHealthAuditItem(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    check_type: str  # ISOLATION, INTEGRITY, LEDGER
    status: str  # PASSED, WARNING, FAILED
    details: Dict[str, Any]
    audited_at: datetime


class TenantAuditSweepResponse(BaseModel):
    audit_id: str
    total_checks: int
    passed_checks: int
    warning_checks: int
    failed_checks: int
    overall_status: str
    results: List[TenantHealthAuditItem]
    completed_at: datetime
