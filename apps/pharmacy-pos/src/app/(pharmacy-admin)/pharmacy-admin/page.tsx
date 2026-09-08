"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Truck,
  ArrowLeftRight,
  ClipboardCheck,
  PlusCircle,
  Package,
  Boxes,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  Building2,
  Layers,
  ChevronRight,
  AlertCircle,
  Percent,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@medipaedia/ui";
import {
  createApiClient,
  PharmacyAdminOverviewMetrics,
  ReorderSuggestionItem,
  PurchaseOrder,
  StockTransfer,
} from "@medipaedia/api-client";

export default function PharmacyAdminOverviewPage() {
  const apiClient = createApiClient();

  const [metrics, setMetrics] = useState<PharmacyAdminOverviewMetrics | null>(null);
  const [reorders, setReorders] = useState<ReorderSuggestionItem[]>([]);
  const [recentPOs, setRecentPOs] = useState<PurchaseOrder[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        apiClient.getPharmacyAdminOverview(),
        apiClient.getReorderSuggestions(),
        apiClient.getPurchaseOrders(),
        apiClient.getStockTransfers(),
      ]);

      const defaultMetrics: PharmacyAdminOverviewMetrics = {
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
        stock_valuation: 0.0,
        retail_value: 0.0,
        gross_margin_pct: 0.0,
        stockout_count: 0,
        low_stock_count: 0,
        pending_po_count: 0,
        in_transit_ibt_count: 0,
      };

      if (overviewRes.status === "fulfilled" && overviewRes.value) {
        setMetrics({ ...defaultMetrics, ...(overviewRes.value as any) });
      } else {
        setMetrics(defaultMetrics);
      }

      if (reorderRes.status === "fulfilled" && reorderRes.value) {
        setReorders(reorderRes.value.items || []);
      }
      if (poRes.status === "fulfilled" && poRes.value) {
        setRecentPOs(poRes.value || []);
      }
      if (transferRes.status === "fulfilled" && transferRes.value) {
        setTransfers(transferRes.value || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const criticalItems = reorders.filter((r) => r.stockout_risk_level === "CRITICAL");

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Pharmacy Governance & Procurement Desk
                </h1>
                <p className="text-xs text-slate-500">
                  {metrics?.facility_name || resolveAuthTenant() || ""} · Executive Stock Ledger & Dynamic Margins
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              className="text-xs text-slate-600 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Link href="/pharmacy-admin/procurement?tab=po&new=true">
              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                <PlusCircle className="h-4 w-4" /> New Purchase Order
              </Button>
            </Link>
            <Link href="/pharmacy-admin/procurement?tab=grn">
              <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
                <Truck className="h-4 w-4 text-teal-600" /> Receive GRN
              </Button>
            </Link>
            <Link href="/pharmacy-admin/audits">
              <Button size="sm" variant="outline" className="gap-1.5 text-slate-700 font-semibold text-xs">
                <ClipboardCheck className="h-4 w-4 text-blue-600" /> Stock Audit
              </Button>
            </Link>
          </div>
        </div>

        {/* Executive Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Inventory Valuation */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-teal-800 text-[11px] font-bold uppercase tracking-wider">
              <span>STOCK VALUATION</span>
              <Boxes className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono">
                GHS {(metrics?.stock_valuation ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-teal-700 font-medium">
                Retail Value: <strong>GHS {(metrics?.retail_value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: 30-Day Gross Margin */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              <span>30-DAY GROSS MARGIN</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                {(metrics?.gross_margin_pct ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                Target Margin: <strong>&ge; 25.0% POM / 40.0% OTC</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Stockouts & Reorders */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold uppercase tracking-wider">
              <span>ACTIVE STOCKOUTS</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-950 font-mono">
                {metrics?.stockout_count ?? 0} Critical
              </div>
              <div className="text-[11px] text-rose-700 font-medium">
                Low Stock Items: <strong>{metrics?.low_stock_count ?? 0} below safety</strong>
              </div>
            </div>
          </div>

          {/* Card 4: In-Transit IBT & Pending POs */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider">
              <span>PROCUREMENT PIPELINE</span>
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
                {metrics?.pending_po_count ?? 0} Pending POs
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                Branch IBT in Transit: <strong>{metrics?.in_transit_ibt_count ?? 0} Shipments</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Stockout Emergency Warning & Reorder Suggestions */}
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
                      <div className="py-8 text-center text-slate-400 text-xs">All stock levels optimal. No reorders suggested.</div>
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
                <div className="py-8 text-center text-slate-400 text-xs">No recent purchase orders logged.</div>
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
                <div className="py-8 text-center text-slate-400 text-xs">No active stock transfers in transit.</div>
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
    </div>
  );
}
