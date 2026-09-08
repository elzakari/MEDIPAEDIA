"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Building2,
  FileCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Database,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
} from "@medipaedia/ui";
import {
  createApiClient,
  type AdminOverviewMetrics,
  type PendingFacilityItem,
} from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

export default function SuperAdminMissionControlOverviewPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [pendingTenants, setPendingTenants] = useState<any[]>([]);
  const [facilityStats, setFacilityStats] = useState<{
    total: number;
    hospitals: number;
    pharmacies: number;
  }>({
    total: 0,
    hospitals: 0,
    pharmacies: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const apiClient = createApiClient();

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [overviewData, pendingData, tenantsData] = await Promise.all([
        apiClient.getAdminOverview(),
        apiClient.getPendingTenants(),
        apiClient.getTenants?.(),
      ]);

      setMetrics(overviewData);
      setPendingTenants(Array.isArray(pendingData) ? pendingData : []);
      const liveTenants = Array.isArray(tenantsData) ? tenantsData : [];
      setTenants(liveTenants);
      const hospitalCount = liveTenants.filter((t: any) => (t.type || t.tenant_type) === "HOSPITAL").length;
      const pharmacyCount = liveTenants.filter((t: any) => (t.type || t.tenant_type) === "PHARMACY").length;
      setFacilityStats({
        total: liveTenants.length,
        hospitals: hospitalCount,
        pharmacies: pharmacyCount,
      });
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (fac: any, approve: boolean) => {
    try {
      await apiClient.verifyTenantLicense({
        tenant_id: fac.id,
        approve,
      });

      setPendingTenants((prev) => prev.filter((f) => f.id !== fac.id));
      setActionSuccess(
        approve
          ? t("superAdmin.noPendingFacilities")
          : t("common.success")
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 animate-pulse">
        <div className="h-4 w-64 bg-slate-800 rounded mb-3" />
        <div className="h-6 w-96 bg-slate-800 rounded mb-2" />
        <div className="h-3 w-full max-w-xl bg-slate-800 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 animate-pulse space-y-2">
            <div className="h-3 w-32 bg-slate-800 rounded" />
            <div className="h-8 w-28 bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="border-rose-300 bg-rose-50/50">
      <CardContent className="p-8 text-center space-y-3">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">{t("common.error")}</h3>
        <p className="text-sm text-slate-600">{error}</p>
        <Button variant="primary" onClick={loadData} className="mt-2 bg-rose-600 hover:bg-rose-500">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.retry")}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 text-slate-100">
      {isLoading && !metrics && renderSkeleton()}

      {!isLoading && error && (
        <Card className="border-rose-300 bg-rose-50/50">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="font-bold text-slate-900 text-lg">{t("common.error") || "Overview unavailable"}</h3>
            <p className="text-sm text-slate-600">{error}</p>
            <Button variant="primary" onClick={loadData} className="mt-2 bg-rose-600 hover:bg-rose-500">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.retry") || "Retry"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 shadow-xl">
        <div className="pb-4 sm:pb-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-slate-800/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-black tracking-[0.18em] text-purple-400 uppercase">
              {t("superAdmin.telemetryBanner") || "NATIONAL HEALTH PLATFORM TELEMETRY (ZERO-PHI)"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            {t("navigation.missionControl") || "Super Admin Mission Control"}
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {t("superAdmin.overviewSubtitle") || "Real-time network governance across multi-tenant clinical hospital nodes, dispensary POS counters, and escrow settlement rails."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-slate-900/40"
            title={t("common.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/super-admin/settlements">
            <Button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-purple-900/40">
              <CreditCard className="h-4 w-4" /> {t("navigation.settlements")}
            </Button>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Global Financial & Operational KPIs */}
      {metrics && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 space-y-2 shadow-lg hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-200 ease-out">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono font-extrabold uppercase tracking-[0.08em]">
              <span>{t("superAdmin.grossMarketplaceVol") || "Gross Marketplace Vol."}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <strong className="text-2xl font-black font-mono text-white block tracking-tight">
              GHS {Number(metrics.gross_marketplace_volume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> {t("superAdmin.momGrowth") || "+18.4% MoM Growth"}
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 space-y-2 shadow-lg hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-200 ease-out">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono font-extrabold uppercase tracking-[0.08em]">
              <span>{t("superAdmin.platformCommission") || "5% Platform Commission"}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <CreditCard className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <strong className="text-2xl font-black font-mono text-purple-300 block tracking-tight">
              GHS {Number(metrics.platform_commission_earned || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[11px] text-slate-400 font-semibold">{t("superAdmin.commissionCollectedOn") || "Collected on escrow releases"}</span>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 space-y-2 shadow-lg hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-200 ease-out">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono font-extrabold uppercase tracking-[0.08em]">
              <span>{t("superAdmin.registeredFacilities") || "Registered Facilities"}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Building2 className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <strong className="text-2xl font-black font-mono text-white block tracking-tight">
              {facilityStats.total} Accredited {facilityStats.total === 1 ? "Facility" : "Facilities"}
            </strong>
            <span className="text-[11px] text-slate-400 font-semibold">
              {facilityStats.hospitals} {facilityStats.hospitals === 1 ? "Hospital" : "Hospitals"} &bull; {facilityStats.pharmacies} Dispensaries / Pharmacies
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900 border border-slate-800/90 space-y-2 shadow-lg hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-200 ease-out">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono font-extrabold uppercase tracking-[0.08em]">
              <span>{t("superAdmin.dispensedPrescriptions") || "Dispensed Prescriptions"}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <FileCheck className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <strong className="text-2xl font-black font-mono text-white block tracking-tight">
              {Number(metrics.total_prescriptions_dispensed || 0).toLocaleString()} Rx
            </strong>
            <span className="text-[11px] text-emerald-400 font-bold">{t("superAdmin.hmacVerified") || "100% HMAC-SHA256 Verified"}</span>
          </div>
        </div>
      )}

      {/* Pending Facility Verification Queue */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">
              {t("superAdmin.pendingVerificationQueue") || "Pending Facility License Verification Queue"} ({pendingTenants.length})
            </h2>
          </div>
          <Link href="/super-admin/facilities">
            <span className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
              {t("superAdmin.viewAllFacilities") || "View All"} {t("navigation.facilities") || "Facilities"} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        <div>
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              {t("common.loading")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800 tracking-wider">
                  <tr>
                    <th className="py-4 px-5 font-extrabold">{t("common.facility") || "Facility"} Name</th>
                    <th className="py-4 px-5 font-extrabold">{t("superAdmin.facilityType") || "Type"}</th>
                    <th className="py-4 px-5 font-extrabold">{t("superAdmin.mohLicense") || "MOH / Council License"}</th>
                    <th className="py-4 px-5 font-extrabold">{t("superAdmin.address") || "Address"}</th>
                    <th className="py-4 px-5 font-extrabold">{t("common.date") || "Date"}</th>
                    <th className="py-4 px-5 font-extrabold text-right">{t("common.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {pendingTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-base mb-2">
                            🛡️
                          </div>
                          <p className="text-sm font-semibold text-slate-300">All Facility Licenses Verified</p>
                          <p className="text-xs text-slate-600 mt-0.5">No pending onboarding applications require review.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingTenants.map((fac) => (
                      <tr key={fac.id} className="group hover:bg-slate-800/40 transition-colors duration-150">
                        <td className="py-4 px-5 font-bold text-white border-l-2 border-transparent group-hover:border-purple-500/50">{fac.name}</td>
                        <td className="py-4 px-5">
                          <Badge variant="teal" className="text-[10px]">
                            {fac.tenant_type}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 font-mono text-purple-300 font-bold">{fac.license_number || "MOH-PENDING"}</td>
                        <td className="py-4 px-5 text-slate-400">{fac.address || "—"}</td>
                        <td className="py-4 px-5 text-slate-500">{new Date(fac.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleVerify(fac, true)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-[11px] py-1.5 px-3 font-extrabold rounded-lg transition-all duration-150"
                            >
                              {t("common.confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerify(fac, false)}
                              className="border-rose-800 text-rose-400 hover:bg-rose-950/50 text-[11px] py-1.5 px-3 rounded-lg transition-all duration-150"
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dual Mission Modules: Escrow Payout Engine & System Telemetry */}
      {metrics && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: Escrow Payout Engine */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                  {t("superAdmin.automatedSettlementEngine") || "AUTOMATED SETTLEMENT ENGINE"}
                </span>
                <h3 className="font-bold text-white text-base">
                  {t("superAdmin.centralEscrowSweeps") || "Central Escrow & Paystack/FedaPay MoMo Sweeps"}
                </h3>
              </div>
              <Badge variant="teal" className="text-[10px]">
                {t("superAdmin.readyForSweep") || "READY FOR SWEEP"}
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{t("superAdmin.pendingEscrowSweep") || "Pending Escrow Sweep Balance:"}</span>
                <strong className="font-mono text-white text-sm">
                  GHS {Number(metrics.escrow_in_transit || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("superAdmin.availablePayoutPool") || "Available Payout Pool:"}</span>
                <strong className="font-mono text-purple-300">
                  GHS {Number(metrics.available_payout_pool || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("superAdmin.payoutChannels") || "Payout Channels:"}</span>
                <span className="text-slate-300 font-semibold">{t("superAdmin.payoutChannelList") || "Paystack (GHS) • FedaPay (XOF)"}</span>
              </div>
            </div>

            <Link href="/super-admin/settlements" className="block pt-2">
              <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" /> {t("superAdmin.openPayoutConsole") || "Open Payout Settlement Console"}
              </Button>
            </Link>
          </div>

          {/* Module 2: System Telemetry */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {t("superAdmin.infrastructureMetrics") || "INFRASTRUCTURE METRICS"}
                </span>
                <h3 className="font-bold text-white text-base">
                  {t("superAdmin.realtimeHealthTelemetry") || "Real-Time Health & Database Telemetry"}
                </h3>
              </div>
              <Badge variant="success" className="text-[10px]">
                {metrics.system_telemetry?.uptime_percent || 0}% {t("superAdmin.uptime") || "UPTIME"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Database className="h-3.5 w-3.5 text-purple-400" />
                  <span>{t("superAdmin.postgisLatency") || "PostGIS Spatial Query"}</span>
                </div>
                <strong className="text-base font-mono text-white block">
                  {metrics.system_telemetry?.db_postgis_latency_ms || 0} ms
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{t("superAdmin.redisHitRatio") || "Redis Lock Hit Ratio"}</span>
                </div>
                <strong className="text-base font-mono text-white block">
                  {metrics.system_telemetry?.redis_hit_ratio_percent || 0} %
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t("superAdmin.sseTriageStreams") || "SSE Triage Streams"}</span>
                </div>
                <strong className="text-base font-mono text-white block">
                  {metrics.system_telemetry?.active_sse_triage_connections || 0} {t("superAdmin.activeConnections") || "Active"}
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                  <span>{t("superAdmin.dailyApiRequests") || "Daily API Requests"}</span>
                </div>
                <strong className="text-base font-mono text-emerald-400 block">
                  {Number(metrics.system_telemetry?.daily_api_requests || 0).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
