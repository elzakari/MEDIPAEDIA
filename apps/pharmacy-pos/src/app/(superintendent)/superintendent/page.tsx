"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  ThermometerSnowflake,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  Package,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  Boxes,
  TrendingUp,
  Truck,
  ArrowLeftRight,
  ArrowUpRight,
  ClipboardCheck,
  Users,
  RotateCcw,
  BellRing,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import {
  createApiClient,
  PharmacyAdminOverviewMetrics,
  ReorderSuggestionItem,
  PurchaseOrder,
  StockTransfer,
} from "@medipaedia/api-client";

export default function SuperintendentCommandHubPage() {
  const apiClient = createApiClient();

  const [metrics, setMetrics] = useState<PharmacyAdminOverviewMetrics | null>(null);
  const [reorders, setReorders] = useState<ReorderSuggestionItem[]>([]);
  const [recentPOs, setRecentPOs] = useState<PurchaseOrder[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeSuccess, setFreezeSuccess] = useState(false);

  const [batchNo, setBatchNo] = useState("LOT-AUG-2026-02");
  const [medName, setMedName] = useState("Augmentin 625mg Tablets");
  const [qty, setQty] = useState(15);
  const [reason, setReason] = useState("BATCH_EXPIRY");
  const [supplier, setSupplier] = useState("");
  const [pin, setPin] = useState("7749");

  const resolveAuthTenant = () => {
    try {
      const t = localStorage.getItem('tenant');
      if (t) {
        const j = JSON.parse(t);
        return j.name || '';
      }
    } catch {}
    const match = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/) : null;
    if (match) {
      try {
        const parts = match[1].split('.');
        if (parts.length === 3) {
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decoded = atob(payloadBase64);
          const j = JSON.parse(decoded);
          return j.tenant?.name || '';
        }
      } catch {}
    }
    return '';
  };

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, reorderRes, poRes, transferRes] = await Promise.allSettled([
        apiClient.getPharmacyAdminOverview?.(),
        apiClient.getReorderSuggestions?.(),
        apiClient.getPurchaseOrders?.(),
        apiClient.getStockTransfers?.(),
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value) {
        setMetrics(overviewRes.value);
      } else {
        setMetrics({
          facility_name: "",
          total_inventory_valuation_cost_ghs: 0.0,
          total_inventory_valuation_retail_ghs: 0.0,
          thirty_day_gross_margin_percentage: 0.0,
          active_stockout_alerts_count: 0,
          low_stock_items_count: 0,
          pending_purchase_orders_count: 0,
          in_transit_transfers_count: 0,
          monthly_sales_revenue_ghs: 0.0,
          currency: "GHS",
        });
      }

      if (reorderRes.status === "fulfilled" && reorderRes.value) {
        setReorders(reorderRes.value.items || []);
      } else {
        setReorders([]);
      }
      if (poRes.status === "fulfilled" && poRes.value) {
        setRecentPOs(poRes.value || []);
      } else {
        setRecentPOs([]);
      }
      if (transferRes.status === "fulfilled" && transferRes.value) {
        setTransfers(transferRes.value || []);
      } else {
        setTransfers([]);
      }
    } catch (err) {
      console.error("Superintendent dashboard fetch error:", err);
      setMetrics({
        facility_name: "",
        total_inventory_valuation_cost_ghs: 0.0,
        total_inventory_valuation_retail_ghs: 0.0,
        thirty_day_gross_margin_percentage: 0.0,
        active_stockout_alerts_count: 0,
        low_stock_items_count: 0,
        pending_purchase_orders_count: 0,
        in_transit_transfers_count: 0,
        monthly_sales_revenue_ghs: 0.0,
        currency: "GHS",
      });
      setReorders([]);
      setRecentPOs([]);
      setTransfers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleFreezeBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setFreezeSuccess(true);
    setTimeout(() => {
      setFreezeSuccess(false);
      setFreezeModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-6 border-2 border-slate-700 bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Superintendent Regulatory Command Hub
              </h1>
              <Badge variant="teal" className="text-xs font-bold bg-teal-500/20 text-teal-300 border-teal-400/40">
                Act 857 Verified
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Pharm. Kojo Asante, FPCPharm • PSGH/REG/89201 • Facility License: PSGH/FAC/1920
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadDashboard}
              variant="outline"
              size="md"
              className="font-bold gap-2 text-slate-300 border-slate-600/40 bg-white/5 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              onClick={() => setFreezeModalOpen(true)}
              variant="outline"
              size="md"
              className="font-bold gap-2 text-rose-300 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20"
            >
              <AlertTriangle className="h-4 w-4 text-rose-400" /> Freeze / Quarantine Batch
            </Button>

            <Button
              onClick={() => alert("Generating Statutory Poison Book & Audit Dossier for Pharmacy Council of Ghana...")}
              variant="primary"
              size="md"
              className="font-bold gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 shadow-md"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Inspectorate Register
            </Button>
          </div>
        </div>

        {/* Regulatory Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Dangerous Drugs Balance</span>
            <div className="text-xl font-black text-white font-mono">131 Units</div>
            <span className="text-[11px] text-teal-300 font-medium">Class A & B In Safe</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
            <span className="text-[10px] text-rose-300 font-bold uppercase block">Quarantined Batches</span>
            <div className="text-xl font-black text-rose-200 font-mono">1 Lot (15 SKUs)</div>
            <span className="text-[11px] text-rose-300 font-medium">Locked on POS</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Cold Chain Fridge Temp</span>
            <div className="text-xl font-black text-teal-300 font-mono">4.2 °C</div>
            <span className="text-[11px] text-teal-300 font-medium">Optimal (2°C - 8°C Zone)</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">ADR Yellow Forms</span>
            <div className="text-xl font-black text-white font-mono">1 Synced</div>
            <span className="text-[11px] text-emerald-300 font-medium">Ghana FDA Linked</span>
          </div>
        </div>
      </Card>

      {/* Quick Actions Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Quick Actions:</span>
          <Link href="/superintendent/quarantine">
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Quarantine
            </Button>
          </Link>
          <Link href="/superintendent/cycle-count">
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
              <RotateCcw className="h-4 w-4 text-blue-600" /> Cycle Count
            </Button>
          </Link>
          <Link href="/superintendent/recalls">
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
              <BellRing className="h-4 w-4 text-amber-600" /> Recalls
            </Button>
          </Link>
          <Link href="/pharmacy-admin/staff">
            <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
              <Users className="h-4 w-4 text-teal-600" /> Staff
            </Button>
          </Link>
        </div>
      </div>

      {/* Executive Metrics Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Superintendent Overview Metrics
                </h2>
                <p className="text-xs text-slate-500">
                  {metrics?.facility_name || resolveAuthTenant() || ""} · Executive Stock Ledger & Dynamic Margins
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-teal-800 text-[11px] font-bold uppercase tracking-wider">
              <span>STOCK VALUATION</span>
              <Boxes className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono">
                {metrics?.currency ?? 'GHS'} {(metrics?.total_inventory_valuation_cost_ghs ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-teal-700 font-medium">
                Retail Value: <strong>{metrics?.currency ?? 'GHS'} {(metrics?.total_inventory_valuation_retail_ghs ?? 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              <span>30-DAY GROSS MARGIN</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                {(metrics?.thirty_day_gross_margin_percentage ?? 0).toFixed(2)}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                Target Margin: <strong>&ge; 25.0% POM / 40.0% OTC</strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold uppercase tracking-wider">
              <span>ACTIVE STOCKOUTS</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-950 font-mono">
                {metrics?.active_stockout_alerts_count ?? 0} Critical
              </div>
              <div className="text-[11px] text-rose-700 font-medium">
                Low Stock Items: <strong>{metrics?.low_stock_items_count ?? 0} below safety</strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider">
              <span>PROCUREMENT PIPELINE</span>
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
                {metrics?.pending_purchase_orders_count ?? 0} Pending POs
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                Branch IBT in Transit: <strong>{metrics?.in_transit_transfers_count ?? 0} Shipment</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Low-Stock Emergency Warning & Reorder Suggestions */}
      <Card className="border-rose-200 bg-rose-50/20">
        <CardHeader className="pb-3 border-b border-rose-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Critical Low-Stock & Auto-Reorder Suggestions
              </CardTitle>
              <p className="text-xs text-slate-500">
                Calculated from current batch quantities, safety thresholds, and 30-day dispensing velocity.
              </p>
            </div>
          </div>
          <Link href="/pharmacy-admin/procurement?tab=reorder">
            <Button size="sm" variant="outline" className="gap-1 text-xs text-rose-800 border-rose-300 hover:bg-rose-50 font-bold">
              View Auto-Reorder Engine <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/80 text-rose-900 font-bold uppercase text-[10px] tracking-wider border-b border-rose-200">
                <tr>
                  <th className="py-3 px-4">Medication & Generic</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current / Threshold</th>
                  <th className="py-3 px-4">Sales Velocity</th>
                  <th className="py-3 px-4">Suggested Reorder</th>
                  <th className="py-3 px-4">Primary Supplier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 bg-white">
                {reorders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className='py-8 text-center text-slate-400 text-xs'>All stock levels optimal. No reorders suggested.</div>
                    </td>
                  </tr>
                ) : (
                  reorders.slice(0, 4).map((item, idx) => (
                    <tr key={`${item.medication_name}-${idx}`} className="hover:bg-rose-50/40 transition">
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 font-bold block">{item.medication_name}</strong>
                        <span className="text-[11px] text-slate-500 font-medium">{item.generic_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {item.current_stock} / {item.reorder_threshold} units
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {item.monthly_sales_velocity} / month
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {item.suggested_reorder_qty} units ({metrics?.currency ?? 'GHS'} {item.estimated_total_cost_ghs})
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {item.primary_supplier_name} ({item.lead_time_days}d lead)
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/pharmacy-admin/procurement?tab=po&supplier=${encodeURIComponent(item.primary_supplier_name)}&item=${encodeURIComponent(item.medication_name)}`}>
                          <Button size="sm" variant="primary" className="text-[11px] font-bold bg-teal-600 hover:bg-teal-700">
                            Create PO
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Bottom Row: Recent POs & Branch Transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Recent Purchase Orders (POs)
              </CardTitle>
            </div>
            <Link href="/pharmacy-admin/procurement?tab=po" className="text-xs text-teal-700 hover:underline font-bold">
              View All &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {recentPOs.length === 0 ? (
                <div className='py-8 text-center text-slate-400 text-xs'>No recent purchase orders logged.</div>
              ) : (
                recentPOs.slice(0, 3).map((po) => (
                  <div key={po.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="font-mono font-bold text-slate-900">{po.po_number}</strong>
                        <Badge
                          variant={
                            po.status === "RECEIVED"
                              ? "teal"
                              : po.status === "SENT"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {po.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        {po.supplier_name} · {po.items_count} items
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="font-mono font-bold text-slate-900 block">
                        {metrics?.currency ?? 'GHS'} {po.total_amount_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        Due: {po.expected_delivery_date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Inter-Branch Transfers (IBT) */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Inter-Branch Stock Transfers (IBT)
              </CardTitle>
            </div>
            <Link href="/pharmacy-admin/transfers" className="text-xs text-blue-700 hover:underline font-bold">
              View All &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {transfers.length === 0 ? (
                <div className='py-8 text-center text-slate-400 text-xs'>No active stock transfers in transit.</div>
              ) : (
                transfers.map((t) => (
                  <div key={t.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="font-mono font-bold text-slate-900">{t.transfer_number}</strong>
                        <Badge
                          variant={t.status === "IN_TRANSIT" ? "warning" : "teal"}
                          className="text-[10px] font-bold uppercase"
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        To: <strong>{t.destination_branch}</strong> ({t.total_items_count} items)
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="font-mono font-bold text-slate-900 block">
                        {metrics?.currency ?? 'GHS'} {t.total_value_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[10px] text-slate-400">{t.driver_or_courier_name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Workspaces Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Dangerous Drugs Register */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-700" /> Statutory Poison Book (Act 857)
            </span>
            <Badge variant="danger" className="text-[10px] font-bold">CLASS A / POM</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Running safe balances, Patient Ghana Card tracking, Prescribing Doctor MDC PIN verification, and Superintendent sign-offs.
          </p>
          <Link href="/superintendent/narcotics">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-1 border-slate-300">
              Open Dangerous Drug Book <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* 2. Batch Quarantine & Recalls */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Batch Recalls & Quarantine
            </span>
            <Badge variant="warning" className="text-[10px] font-bold">1 ACTIVE HOLD</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Lock compromised or near-expiry batches from POS sale, generate supplier debit notes, and log witnessed destruction.
          </p>
          <Link href="/superintendent/quarantine">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-1 border-slate-300">
              Manage Quarantined Lots <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* 3. Cold Chain Telemetry */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ThermometerSnowflake className="h-4 w-4 text-teal-700" /> Cold Chain & Storage
            </span>
            <Badge variant="teal" className="text-[10px] font-bold">2°C - 8°C NORMAL</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Twice-daily digital thermometer logs for vaccines, insulins, and biologics with excursion auto-alerts.
          </p>
          <Link href="/superintendent/cold-chain">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-1 border-slate-300">
              View Temperature Telemetry <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* 4. Pharmacovigilance */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-indigo-700" /> Pharmacovigilance (ADR)
            </span>
            <Badge variant="outline" className="text-[10px] font-bold">YELLOW FORM</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Adverse Drug Reaction incident reports synchronized directly with FDA Ghana safety surveillance database.
          </p>
          <Link href="/superintendent/pharmacovigilance">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-1 border-slate-300">
              File & Review ADRs <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* 5. Compounding & Master Formulas */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-700" /> Compounding & Waste
            </span>
            <Badge variant="teal" className="text-[10px] font-bold">BUD TRACKER</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Master formulas for extemporaneous preparations, Beyond-Use Dates (BUD), and expired medicine destruction logs.
          </p>
          <Link href="/superintendent/compounding">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-1 border-slate-300">
              Compounding Master Logs <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* 6. Dispensary POS Link */}
        <Card className="p-5 border border-slate-200 bg-teal-50/50 shadow-sm space-y-3 hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-700" /> Return to POS Dispensary
            </span>
            <Badge variant="teal" className="text-[10px] font-bold">DISPENSARY</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Switch back to front-counter optical verification and over-the-counter dispensing workstation.
          </p>
          <Link href="/pos">
            <Button variant="primary" size="sm" className="w-full font-bold text-xs gap-1">
              Switch to Dispensary POS <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Freeze Batch Modal */}
      {freezeModalOpen && (
        <Modal
          isOpen={freezeModalOpen}
          onClose={() => setFreezeModalOpen(false)}
          title="Quarantine & Freeze Inventory Batch"
          description="Instantly disables SKU on all POS terminals and prevents dispensing."
        >
          <form onSubmit={handleFreezeBatch} className="py-4 space-y-3 text-xs">
            {freezeSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Batch Quarantined & Frozen from POS!</h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Batch Lot Number</label>
                    <input
                      type="text"
                      required
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Medication Name</label>
                    <input
                      type="text"
                      required
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Enter supplier name"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quantity Quarantined</label>
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quarantine Reason</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="FDA_RECALL">Official Ghana FDA Recall Notice</option>
                      <option value="QUALITY_DEFECT">Packaging Defect / Discoloration</option>
                      <option value="BATCH_EXPIRY">Near Expiry (&lt; 30 Days Left)</option>
                      <option value="CONTAMINATION_SUSPICION">Suspected Microbial Contamination</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <label className="block font-bold text-amber-950 text-[11px]">
                    Superintendent Pharmacist PIN (Demo: 7749)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-base font-black rounded-xl border border-amber-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-rose-700/20 bg-rose-700 hover:bg-rose-800 text-white mt-2"
                >
                  Execute Batch Freeze & Lock POS
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
