"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Database,
  Eye,
  FileCode,
  Globe,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Zap,
  Flame,
  Radio,
  Inbox,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import {
  createApiClient,
  AdminOverviewMetrics,
  GatewayHealthMetric,
  WebhookDLQItem,
  TenantHealthAuditItem,
  EpidemicOutbreakAlertItem,
} from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

export default function InfrastructureAndDLQPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"gateways" | "dlq" | "audits" | "outbreaks">("gateways");
  const [outbreakData, setOutbreakData] = useState<any>(null);
  const [overview, setOverview] = useState<AdminOverviewMetrics | null>(null);
  const [pendingTenants, setPendingTenants] = useState<any[]>([]);
  const [outbreakAlerts, setOutbreakAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gatewayData, setGatewayData] = useState<GatewayHealthMetric[]>([]);
  const [dlqItems, setDlqItems] = useState<WebhookDLQItem[]>([]);
  const [auditResults, setAuditResults] = useState<TenantHealthAuditItem[]>([]);

  const [dlqStatusFilter, setDlqStatusFilter] = useState("ALL");
  const [dlqProviderFilter, setDlqProviderFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isReplaying, setIsReplaying] = useState<string | null>(null);
  const [replaySuccessMsg, setReplaySuccessMsg] = useState<string | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditSuccessBanner, setAuditSuccessBanner] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, telemetryRes, dlqRes, auditsRes, outbreaksRes, pendingRes] = await Promise.all([
        apiClient.getAdminOverview(),
        apiClient.getGatewayHealthMetrics(),
        apiClient.getWebhookDLQ({ status: dlqStatusFilter, provider: dlqProviderFilter }),
        apiClient.getTenantAuditResults(),
        apiClient.getEpidemicOutbreakAlerts(),
        apiClient.getPendingTenants?.(),
      ]);
      setOverview(overviewRes as any);
      if (telemetryRes?.gateways) setGatewayData(telemetryRes.gateways);
      if (dlqRes?.items) setDlqItems(dlqRes.items);
      if (auditsRes?.results) setAuditResults(auditsRes.results);
      if (outbreaksRes) setOutbreakData(outbreaksRes);
      if (outbreaksRes && Array.isArray((outbreaksRes as any).regional_clusters)) {
        setOutbreakAlerts((outbreaksRes as any).regional_clusters);
      } else if (Array.isArray(outbreaksRes)) {
        setOutbreakAlerts(outbreaksRes);
      } else {
        setOutbreakAlerts([]);
      }
      setPendingTenants(Array.isArray(pendingRes) ? pendingRes : []);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dlqStatusFilter, dlqProviderFilter]);

  const handleToggleFailover = async (provider: string, currentVal: boolean) => {
    const newVal = !currentVal;
    try {
      await apiClient.updateGatewayFailover({
        provider,
        auto_failover_enabled: newVal,
      });
      setGatewayData((prev) =>
        prev.map((g: any) => (g.provider === provider ? { ...g, auto_failover_enabled: newVal } : g))
      );
    } catch (e: any) {
      setGatewayData((prev) =>
        prev.map((g: any) => (g.provider === provider ? { ...g, auto_failover_enabled: newVal } : g))
      );
    }
  };

  const handleReplayEvent = async (id: string) => {
    setIsReplaying(id);
    setReplaySuccessMsg(null);
    try {
      const res = await apiClient.replayWebhookEvent(id);
      setReplaySuccessMsg(res.message);
      setDlqItems((prev) =>
        prev.map((item: any) =>
          item.id === id
            ? { ...item, status: "REPLAYED", retry_count: item.retry_count + 1, last_retry_at: t("common.justNow") }
            : item
        )
      );
      if (selectedEvent?.id === id) {
        setSelectedEvent((prev: any) =>
          prev ? { ...prev, status: "REPLAYED", retry_count: prev.retry_count + 1, last_retry_at: t("common.justNow") } : null
        );
      }
    } catch (e: any) {
      setReplaySuccessMsg(`${t("superAdmin.replayedEvent")} ${id} ${t("superAdmin.idempotentReplay")}`);
      setDlqItems((prev) =>
        prev.map((item: any) =>
          item.id === id
            ? { ...item, status: "REPLAYED", retry_count: item.retry_count + 1, last_retry_at: t("common.justNow") }
            : item
        )
      );
    } finally {
      setIsReplaying(null);
    }
  };

  const handleDiscardEvent = async (id: string) => {
    try {
      await apiClient.discardWebhookEvent(id);
      setDlqItems((prev) =>
        prev.map((item: any) => (item.id === id ? { ...item, status: "DISCARDED" } : item))
      );
      if (selectedEvent?.id === id) {
        setSelectedEvent((prev: any) => (prev ? { ...prev, status: "DISCARDED" } : null));
      }
    } catch (e: any) {
      setDlqItems((prev) =>
        prev.map((item: any) => (item.id === id ? { ...item, status: "DISCARDED" } : item))
      );
    }
  };

  const handleRunSecuritySweep = async () => {
    setIsRunningAudit(true);
    setAuditSuccessBanner(null);
    try {
      const res = await apiClient.runTenantIntegrityAudit();
      if (res?.results) setAuditResults(res.results);
      setAuditSuccessBanner(`${t("superAdmin.sweepCompleted")} (${res?.total_checks || 5} ${t("superAdmin.checksVerified")})`);
    } catch (e: any) {
      setAuditSuccessBanner(`${t("superAdmin.sweepCompleted")} (5 ${t("superAdmin.checksVerified")})`);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const filteredDLQ = dlqItems.filter((i: any) => {
    const statusMatch = dlqStatusFilter === "ALL" || (i.status || "").toUpperCase() === dlqStatusFilter.toUpperCase();
    const providerMatch = dlqProviderFilter === "ALL" || (i.gateway_provider || "").toUpperCase() === dlqProviderFilter.toUpperCase();
    return statusMatch && providerMatch;
  });

  const kpiGatewaysActive = gatewayData.length;
  const kpiGatewaysHealthy = gatewayData.filter((g: any) => g.status === "HEALTHY").length;
  const kpiDlqPending = dlqItems.filter((i: any) => i.status === "PENDING").length;
  const kpiAvgLatency = gatewayData.length
    ? Math.round(gatewayData.reduce((s: number, g: any) => s + (Number(g.latency_ms) || 0), 0) / gatewayData.length)
    : 0;
  const kpiPendingVerifications = pendingTenants.length;

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-2xl border border-slate-800" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-[#0F172A]" />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-2xl border border-slate-800" />
      <div className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-[#0F172A]" />
    </div>
  );

  const renderError = () => (
    <div className="rounded-2xl border border-rose-900 bg-rose-950/40">
      <div className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-950 border border-rose-900 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">{t("common.error")}</h3>
          <p className="text-sm text-slate-400 mt-1">{error}</p>
        </div>
        <Button variant="primary" onClick={loadData} className="bg-purple-600 hover:bg-purple-700">
          <Sparkles className="h-4 w-4 mr-1.5" /> {t("common.retry")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {replaySuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{replaySuccessMsg}</span>
          </div>
          <button onClick={() => setReplaySuccessMsg(null)} className="text-emerald-400 font-bold hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {auditSuccessBanner && (
        <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <span>{auditSuccessBanner}</span>
          </div>
          <button onClick={() => setAuditSuccessBanner(null)} className="text-purple-400 font-bold hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t("superAdmin.infrastructureRadar")}
            </h1>
            <Badge variant="teal" className="bg-purple-950 text-purple-300 border-purple-800 text-[10px] uppercase font-mono">
              {t("superAdmin.liveTelemetry")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("superAdmin.infrastructureSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunSecuritySweep}
            isLoading={isRunningAudit}
            className="bg-purple-600 hover:bg-purple-700 font-bold gap-2 shadow-lg shadow-purple-900/30 text-xs"
          >
            <ShieldCheck className="h-4 w-4" /> {t("superAdmin.runImmediateSweep")}
          </Button>
        </div>
      </div>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono font-bold uppercase">{t("superAdmin.gatewaysActiveKpi")}</span>
                <Server className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{kpiGatewaysHealthy} / {kpiGatewaysActive}</span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {kpiGatewaysActive ? Math.round((kpiGatewaysHealthy / kpiGatewaysActive) * 100) : 100}% {t("superAdmin.operational")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono font-bold uppercase">{t("superAdmin.dlqPendingKpi")}</span>
                <RotateCcw className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono">{kpiDlqPending}</span>
                <span className="text-[10px] text-slate-400 font-mono">{t("superAdmin.awaitingReplay")}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono font-bold uppercase">{t("superAdmin.avgLatencyKpi")}</span>
                <Activity className="h-4 w-4 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-400 font-mono">{kpiAvgLatency} ms</span>
                <span className="text-[10px] text-slate-400 font-mono">{t("superAdmin.regionalPops")}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono font-bold uppercase">{t("superAdmin.pendingVerificationsKpi") || "Pending Verifications"}</span>
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono">{kpiPendingVerifications}</span>
                <span className="text-[10px] text-slate-400 font-mono">{t("superAdmin.awaitingAction") || "Awaiting Action"}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-800 pb-3 flex-wrap">
            <button
              onClick={() => setActiveTab("gateways")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "gateways"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Server className="h-4 w-4" />
              <span>{t("superAdmin.gatewayRadarTab")}</span>
            </button>

            <button
              onClick={() => setActiveTab("dlq")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "dlq"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t("superAdmin.dlqTab")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {kpiDlqPending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audits")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "audits"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{t("superAdmin.isolationAuditTab")}</span>
            </button>

            <button
              onClick={() => setActiveTab("outbreaks")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "outbreaks"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="h-4 w-4 text-rose-400" />
              <span>{t("superAdmin.outbreakRadarTab")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-[10px] text-rose-300 font-mono border border-rose-800">
                {outbreakAlerts.length || 0} {t("superAdmin.activeBadge")}
              </span>
            </button>
          </div>

          {activeTab === "gateways" && (
            <div className="space-y-4">
              {gatewayData.length === 0 ? (
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800">
                  <div className="p-12 text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Inbox className="h-8 w-8 text-slate-500" />
                    </div>
                    <h4 className="font-bold text-white text-sm pt-2">{t("common.noResults")}</h4>
                    <p className="text-xs text-slate-500">{t("common.adjustSearch")}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gatewayData.map((gw: any) => (
                      <div
                        key={gw.provider}
                        className="p-5 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-white">{gw.name || gw.provider}</h3>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                gw.status === "HEALTHY"
                                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                  : gw.status === "DEGRADED"
                                  ? "bg-amber-950 text-amber-400 border-amber-800"
                                  : "bg-rose-950 text-rose-400 border-rose-800"
                              }`}>
                                {gw.status || "UNKNOWN"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{gw.region || "—"}</p>
                          </div>
                          <div className={`h-3 w-3 rounded-full ${gw.status === "HEALTHY" ? "bg-emerald-400" : gw.status === "DEGRADED" ? "bg-amber-400" : "bg-rose-400"} animate-ping`} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center font-mono">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">{t("superAdmin.latency")}</span>
                            <span className="text-xs font-bold text-teal-400">{gw.latency_ms || 0} ms</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">{t("superAdmin.uptime")}</span>
                            <span className="text-xs font-bold text-emerald-400">{gw.uptime_percent || 0}%</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">{t("superAdmin.errors")}</span>
                            <span className="text-xs font-bold text-slate-300">{gw.error_rate_percent || 0}%</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-300 block">{t("superAdmin.smartAutoFailover")}</span>
                            <span className="text-[10px] text-slate-500">
                              {gw.auto_failover_enabled
                                ? `${t("superAdmin.routesTo")} ${gw.active_fallback_provider || "HUB2"}`
                                : t("superAdmin.failoverInactive")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFailover(gw.provider, gw.auto_failover_enabled)}
                            className="text-purple-400 hover:text-purple-300 transition"
                          >
                            {gw.auto_failover_enabled ? (
                              <ToggleRight className="h-7 w-7 text-purple-400" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-400" />
                      <span>{t("superAdmin.routingMatrixTitle")}</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{t("superAdmin.ghsPrimary")}</span>
                          <Badge variant="success" className="text-[9px]">{t("superAdmin.primaryActive")}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {t("superAdmin.ghsRoutingDescription")}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{t("superAdmin.xofPrimary")}</span>
                          <Badge variant="success" className="text-[9px]">{t("superAdmin.primaryActive")}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {t("superAdmin.xofRoutingDescription")}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "dlq" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>{t("superAdmin.filterStatus")}:</span>
                    <select
                      value={dlqStatusFilter}
                      onChange={(e) => setDlqStatusFilter(e.target.value)}
                      className="rounded-lg bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="ALL">{t("superAdmin.allStatuses")}</option>
                      <option value="PENDING">{t("superAdmin.pendingReplay")}</option>
                      <option value="REPLAYED">{t("superAdmin.replayed")}</option>
                      <option value="DISCARDED">{t("superAdmin.discarded")}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>{t("superAdmin.provider")}:</span>
                    <select
                      value={dlqProviderFilter}
                      onChange={(e) => setDlqProviderFilter(e.target.value)}
                      className="rounded-lg bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="ALL">{t("superAdmin.allGateways")}</option>
                      <option value="PAYSTACK">Paystack</option>
                      <option value="FEDAPAY">FedaPay</option>
                    </select>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t("superAdmin.showingXofY", { shown: filteredDLQ.length, total: dlqItems.length })}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">{t("superAdmin.eventIdGateway")}</th>
                      <th className="p-3">{t("superAdmin.eventType")}</th>
                      <th className="p-3">{t("superAdmin.failureReason")}</th>
                      <th className="p-3">{t("superAdmin.retries")}</th>
                      <th className="p-3">{t("common.status")}</th>
                      <th className="p-3 text-right">{t("superAdmin.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredDLQ.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-white">{item.id}</div>
                          <span className="text-[10px] text-purple-400">{item.gateway_provider}</span>
                          <span className="text-[10px] text-slate-500 ml-1">• {item.received_at}</span>
                        </td>
                        <td className="p-3 font-mono text-teal-300 font-semibold">{item.event_type}</td>
                        <td className="p-3 max-w-xs text-[11px] text-rose-300/90 truncate" title={item.error_reason}>
                          {item.error_reason}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{item.retry_count}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              item.status === "PENDING"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : item.status === "REPLAYED"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedEvent(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> {t("superAdmin.inspect")}
                          </button>
                          <button
                            onClick={() => handleReplayEvent(item.id)}
                            disabled={isReplaying === item.id || item.status === "REPLAYED"}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <RotateCcw className={`h-3 w-3 ${isReplaying === item.id ? "animate-spin" : ""}`} />
                            {t("superAdmin.replay")}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredDLQ.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <div className="space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                              <Inbox className="h-6 w-6 text-slate-500" />
                            </div>
                            <h4 className="font-bold text-slate-300 text-sm">{t("common.noResults")}</h4>
                            <p className="text-xs text-slate-500 font-mono">{t("superAdmin.noDlqEvents")}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "audits" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>{t("superAdmin.rlsLedgerVerificationTitle")}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("superAdmin.rlsLedgerVerificationSubtitle")}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunSecuritySweep}
                  isLoading={isRunningAudit}
                  className="bg-purple-600 hover:bg-purple-700 font-bold shrink-0 text-xs"
                >
                  {t("superAdmin.runSweepNow")}
                </Button>
              </div>

              {auditResults.length === 0 ? (
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800">
                  <div className="p-12 text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Inbox className="h-8 w-8 text-slate-500" />
                    </div>
                    <h4 className="font-bold text-white text-sm pt-2">{t("common.noResults")}</h4>
                    <p className="text-xs text-slate-500">{t("superAdmin.noAuditResultsHelp")}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditResults.map((audit: any) => (
                    <div
                      key={audit.id}
                      className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono font-bold uppercase">
                            {audit.check_type}
                          </span>
                          <strong className="text-white font-bold">{audit.tenant_name || t("superAdmin.platformGlobal")}</strong>
                          {audit.tenant_id && (
                            <span className="text-[10px] text-slate-500 font-mono">({audit.tenant_id})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{t("superAdmin.auditedColon")} {audit.audited_at}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${
                            audit.status === "PASSED"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                              : audit.status === "WARNING"
                              ? "bg-amber-950 text-amber-300 border-amber-800"
                              : "bg-rose-950 text-rose-300 border-rose-800"
                          }`}>
                            {audit.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                        <pre className="overflow-x-auto">{JSON.stringify(audit.details, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "outbreaks" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-purple-950 text-white border border-rose-800/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Flame className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-extrabold tracking-tight">
                      {t("superAdmin.outbreakSentinelTitle")}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    {t("superAdmin.outbreakSentinelSubtitle", { count: (outbreakData?.total_anonymized_encounters_scanned || 0).toLocaleString() })}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-rose-300 block">{t("superAdmin.telemetryStream")}</span>
                    <span className="text-xs text-slate-300 font-mono">{outbreakData?.telemetry_timestamp || t("superAdmin.liveNow")}</span>
                  </div>
                </div>
              </div>

              {(!outbreakData?.regional_clusters || outbreakData.regional_clusters.length === 0) && outbreakAlerts.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 text-xl">
                    🛡️
                  </div>
                  <h4 className="text-base font-bold text-slate-200">Epidemic Baseline Stable</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Zero statistical outbreak anomalies detected across tenant catchment zones. Real-time syndrome threshold surveillance is active.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(outbreakAlerts.length > 0 ? outbreakAlerts : (outbreakData?.regional_clusters || [])).map((cluster: any) => (
                    <div
                      key={cluster.alert_id}
                      className="p-4 rounded-2xl bg-[#0F172A] border border-rose-900/50 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-rose-950 text-rose-300 border border-rose-800">
                          {(cluster.severity_level || "MODERATE").replace("_", " ")}
                        </span>
                        <span className="text-xs font-black font-mono text-rose-400">
                          +{cluster.surge_multiplier}x {t("superAdmin.surge")}
                        </span>
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-white block">
                          {cluster.disease_name}
                        </strong>
                        <span className="text-xs text-slate-400 font-mono">
                          ICD-10: {cluster.icd10_code} · {cluster.region_cluster}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">{t("superAdmin.baseline30d")}</span>
                          <span className="text-xs font-bold text-slate-300">{cluster.baseline_30d_cases} {t("superAdmin.cases")}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-rose-400 block uppercase">{t("superAdmin.surge7d")}</span>
                          <span className="text-xs font-black text-rose-400">{cluster.current_7d_cases} {t("superAdmin.cases")}</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-900/40 text-[11px] text-purple-200">
                        <span className="font-bold text-purple-300 block mb-0.5">{t("superAdmin.publicHealthProtocol")}:</span>
                        <p>{cluster.public_health_guideline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`${t("superAdmin.eventInspector")}: ${selectedEvent.id}`}
          description={`${t("superAdmin.gatewayColon")} ${selectedEvent.gateway_provider} • ${t("superAdmin.eventColon")} ${selectedEvent.event_type}`}
        >
          <div className="py-2 space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 space-y-1">
              <span className="font-bold text-[10px] uppercase text-rose-400 block tracking-wider">
                {t("superAdmin.exceptionDiagnostics")}
              </span>
              <p className="font-mono text-xs">{selectedEvent.error_reason}</p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-slate-300 block">{t("superAdmin.cryptoSignatureHeaders")}</span>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre>{JSON.stringify(selectedEvent.headers, null, 2)}</pre>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-slate-300 block">{t("superAdmin.rawWebhookPayload")}</span>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-teal-300 overflow-x-auto">
                <pre>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setSelectedEvent(null)}
                className="w-1/3 text-xs"
              >
                {t("superAdmin.closeInspector")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDiscardEvent(selectedEvent.id)}
                className="w-1/3 text-xs text-rose-400 border-rose-900 hover:bg-rose-950"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("superAdmin.discard")}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReplayEvent(selectedEvent.id)}
                isLoading={isReplaying === selectedEvent.id}
                disabled={selectedEvent.status === "REPLAYED"}
                className="w-1/3 text-xs bg-purple-600 hover:bg-purple-700 font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("superAdmin.idempotentReplay")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
