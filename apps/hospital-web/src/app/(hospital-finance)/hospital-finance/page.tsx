"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  FileCheck,
  ArrowUpRight,
  ShieldCheck,
  PieChart,
  BarChart3,
  Calendar,
  Wallet,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Clock,
  Layers,
  Inbox,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medipaedia/ui";
import { useAuth } from "@/context/AuthContext";
import {
  createApiClient,
  HospitalRevenueAnalyticsResponse,
  DepartmentRevenueItem,
  PaymentChannelBreakdown,
  CashierShiftAuditItem,
} from "@medipaedia/api-client";

const CHANNEL_COLORS = [
  "bg-amber-400",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-blue-500",
  "bg-rose-500",
  "bg-slate-500",
  "bg-teal-500",
];

const DEPARTMENT_COLORS = [
  "bg-teal-600",
  "bg-indigo-600",
  "bg-amber-600",
  "bg-slate-600",
  "bg-blue-600",
  "bg-cyan-600",
];

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
];

function formatCurrency(amount: number, currency: string): string {
  const n = isFinite(amount) ? amount : 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(amount: number, currency: string): string {
  const n = isFinite(amount) ? amount : 0;
  if (n >= 1000) {
    return `${currency} ${(n / 1000).toFixed(1)}k`;
  }
  return formatCurrency(n, currency);
}

export default function HospitalFinanceOverviewPage() {
  const { user, tenant } = useAuth();
  const apiClient = createApiClient();
  const currency = tenant?.currency || "GHS";

  const [selectedPeriod, setSelectedPeriod] = useState("THIS_MONTH");

  const [summary, setSummary] = useState<HospitalRevenueAnalyticsResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [recentTx, setRecentTx] = useState<CashierShiftAuditItem[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);

  const loadSummary = async () => {
    try {
      setIsLoadingSummary(true);
      setSummaryError(null);
      const data = await apiClient.getHospitalFinancialSummary(selectedPeriod);
      setSummary(data || null);
    } catch (err: any) {
      setSummaryError(err?.message || String(err) || "Unable to load financial summary from the server.");
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadRecentTx = async () => {
    try {
      setIsLoadingTx(true);
      const data = await apiClient.getCashierShiftsAudit();
      setRecentTx((data || []).slice(0, 8));
    } catch {
      setRecentTx([]);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedPeriod]);

  useEffect(() => {
    loadRecentTx();
  }, []);

  const grossRevenue = summary?.total_gross_revenue ?? 0;
  const cashMomo = summary?.total_out_of_pocket_cash ?? 0;
  const nhisClaims = summary?.total_nhis_claims_receivable ?? 0;
  const deptBreakdown: DepartmentRevenueItem[] = summary?.department_breakdown ?? [];
  const channelBreakdown: PaymentChannelBreakdown[] = summary?.channel_breakdown ?? [];

  const collectionEfficiency = (() => {
    if (!summary || grossRevenue <= 0) return "\u2014";
    const pct = (cashMomo / grossRevenue) * 100;
    return `${pct.toFixed(1)}%`;
  })();

  const kpis = [
    {
      label: "Gross Billed Revenue",
      value: formatCurrency(grossRevenue, currency),
      change: summary?.period ? `Period: ${summary.period}` : "No recorded billing activity yet",
      icon: DollarSign,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      label: "Direct Out-of-Pocket Cash / MoMo",
      value: formatCurrency(cashMomo, currency),
      change: grossRevenue > 0 ? `${((cashMomo / grossRevenue) * 100).toFixed(1)}% of gross revenue` : "Open Cashier POS to record payments",
      icon: Wallet,
      color: "text-teal-700",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
    {
      label: "NHIS & Private Claims Receivable",
      value: formatCurrency(nhisClaims, currency),
      change: grossRevenue > 0 ? `${((nhisClaims / grossRevenue) * 100).toFixed(1)}% pending adjudication` : "No insurance claims batched yet",
      icon: ShieldCheck,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      label: "Cashier Collection Efficiency",
      value: collectionEfficiency,
      change: grossRevenue > 0 ? `Gross ${formatCompactCurrency(grossRevenue, currency)} billed` : "No till discrepancy recorded",
      icon: TrendingUp,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  const renderKpis = () => {
    if (isLoadingSummary) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 border border-slate-200 bg-white shadow-sm animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-7 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-2.5 bg-slate-200 rounded w-3/4" />
            </Card>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className={`p-4 border bg-white shadow-sm ${kpi.borderColor}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{kpi.change}</p>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderDepartmentCard = () => {
    if (isLoadingSummary) {
      return (
        <Card className="lg:col-span-7 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-slate-200 animate-pulse rounded" />
              <div className="h-2.5 bg-slate-100 animate-pulse rounded-full" />
            </div>
          ))}
        </Card>
      );
    }

    if (summaryError) {
      return (
        <Card className="lg:col-span-7 p-6 border border-rose-200 bg-rose-50/60 space-y-3 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <h4 className="font-bold text-rose-900 text-sm">Unable to load departmental breakdown</h4>
          <p className="text-xs text-rose-700 font-mono break-words">{summaryError}</p>
          <Button size="sm" variant="primary" onClick={loadSummary} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-bold mx-auto">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      );
    }

    if (deptBreakdown.length === 0) {
      return (
        <Card className="lg:col-span-7 p-6 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-700" /> Departmental Revenue Allocation
              </h3>
              <p className="text-xs text-slate-500">Gross billing distribution across clinical service units</p>
            </div>
            <Badge variant="teal" className="text-xs font-bold font-mono">
              Total: {formatCompactCurrency(grossRevenue, currency)}
            </Badge>
          </div>
          <div className="p-8 text-center space-y-3 mt-4">
            <div className="mx-auto p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 w-fit">
              <BarChart3 className="h-10 w-10" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-bold text-slate-800 text-sm">No departmental billings recorded for this billing cycle.</h4>
              <p className="text-xs text-slate-500">Post patient encounters at the cashier POS to begin accumulating service unit ledgers.</p>
            </div>
          </div>
        </Card>
      );
    }

    const grandTotal = deptBreakdown.reduce((acc, d) => acc + (d.gross_revenue || 0), 0);

    return (
      <Card className="lg:col-span-7 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-700" /> Departmental Revenue Allocation
            </h3>
            <p className="text-xs text-slate-500">Gross billing distribution across clinical service units</p>
          </div>
          <Badge variant="teal" className="text-xs font-bold font-mono">
            Total: {formatCompactCurrency(grandTotal || grossRevenue, currency)}
          </Badge>
        </div>

        <div className="space-y-3.5">
          {deptBreakdown.map((dept, idx) => {
            const colorClass = DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length];
            const pct = dept.percentage ?? ((grandTotal > 0 ? (dept.gross_revenue / grandTotal) * 100 : 0));
            return (
              <div key={dept.department + idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{dept.department} ({dept.patient_count ?? 0} patients)</span>
                  <div className="text-right font-mono">
                    <strong className="text-slate-900">{formatCurrency(dept.gross_revenue || 0, currency)}</strong>
                    <span className="text-slate-400 text-[11px] ml-1.5">({pct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderChannelsCard = () => {
    if (isLoadingSummary) {
      return (
        <Card className="lg:col-span-5 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
          ))}
          <div className="h-16 bg-teal-50 animate-pulse rounded-xl" />
        </Card>
      );
    }

    if (channelBreakdown.length === 0) {
      return (
        <Card className="lg:col-span-5 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-teal-700" /> Collection Channels
              </h3>
              <p className="text-xs text-slate-500">Mobile Money vs Physical Cash vs NHIS</p>
            </div>
          </div>
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 w-fit">
              <Wallet className="h-10 w-10" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-bold text-slate-800 text-sm">No payments recorded. Open Cashier POS to process initial check-in or consultation fees.</h4>
              <p className="text-xs text-slate-500">Payments flow here after thermal printing and till settlement.</p>
            </div>
            <Link href="/hospital-finance/cashier" className="inline-flex mt-2">
              <Button variant="primary" size="sm" className="font-bold gap-1.5 shadow-md shadow-teal-700/20">
                <CreditCard className="h-4 w-4" /> Open Cashier Terminal
              </Button>
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-teal-950 block">Current Cashier Till</span>
              <span className="text-[11px] text-teal-700">No active shift — open drawer from Shifts page</span>
            </div>
            <Link href="/hospital-finance/shifts">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                Open Drawer →
              </Button>
            </Link>
          </div>
        </Card>
      );
    }

    return (
      <Card className="lg:col-span-5 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-teal-700" /> Collection Channels
            </h3>
            <p className="text-xs text-slate-500">Mobile Money vs Physical Cash vs NHIS</p>
          </div>
        </div>

        <div className="space-y-3">
          {channelBreakdown.map((item, idx) => {
            const colorClass = CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
            return (
              <div key={item.channel + idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`h-3 w-3 rounded-full ${colorClass}`} />
                  <div>
                    <span className="font-bold text-slate-900 block">{item.channel}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.percentage >= 50 ? "Dominant Channel" : item.percentage >= 20 ? "Major Channel" : "Niche Channel"}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <strong className="text-slate-900 block">{formatCurrency(item.amount || 0, currency)}</strong>
                  <span className="text-[10px] text-slate-500">{(item.percentage || 0).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-teal-950 block">Live Cashier Drawer Status</span>
            <span className="text-[11px] text-teal-700">
              {user?.full_name ? `Cashier: ${user.full_name}` : "Cashier not signed in"} • Currency: {currency}
            </span>
          </div>
          <Link href="/hospital-finance/shifts">
            <Button variant="primary" size="sm" className="font-bold text-xs">
              Balance Drawer →
            </Button>
          </Link>
        </div>
      </Card>
    );
  };

  const renderRecentTransactions = () => {
    if (isLoadingTx) {
      return (
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Loading shift audit ledger...
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      );
    }

    if (recentTx.length === 0) {
      return (
        <div className="p-8 text-center space-y-3">
          <Card className="p-8 border-dashed border-slate-200 bg-white max-w-sm mx-auto">
            <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 w-fit mb-4">
              <Inbox className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">No cashier receipts generated yet</h4>
              <p className="text-xs text-slate-500">Process patient payments at the OPD cashier terminal to begin producing the shift audit stream.</p>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-2.5">Shift / Receipt #</th>
              <th className="p-2.5">Cashier</th>
              <th className="p-2.5">Period</th>
              <th className="p-2.5">Gross Revenue ({currency})</th>
              <th className="p-2.5">Discrepancy</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentTx.map((tx) => {
              const dType = tx.discrepancy_type || "BALANCED";
              const isBalanced = dType === "NONE" || dType === "BALANCED";
              return (
                <tr key={tx.shift_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-2.5 font-mono font-bold text-teal-800">{tx.shift_id}</td>
                  <td className="p-2.5 font-medium text-slate-900">
                    <div>{tx.cashier_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tx.cashier_email}</div>
                  </td>
                  <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                    {tx.opened_at?.slice(0, 16) || "—"} → {tx.closed_at?.slice(0, 16) || "OPEN"}
                  </td>
                  <td className="p-2.5 font-mono font-extrabold text-slate-900">
                    {formatCurrency(tx.total_revenue || 0, currency)}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-700">
                    {tx.discrepancy_amount === 0
                      ? `${currency} 0.00`
                      : `${tx.discrepancy_amount > 0 ? "+" : ""}${formatCurrency(tx.discrepancy_amount, currency)}`}
                  </td>
                  <td className="p-2.5">
                    <Badge
                      variant={isBalanced ? "teal" : dType === "OVER" || dType === "OVERAGE" ? "warning" : "danger"}
                      className="text-[10px] font-bold"
                    >
                      {dType}
                    </Badge>
                    {tx.supervisor_signed_off && (
                      <Badge variant="outline" className="text-[10px] ml-1">SIGNED-OFF</Badge>
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    <Link href="/hospital-finance/shifts">
                      <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold">
                        View Shift
                      </button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-teal-700" /> Hospital Revenue Cycle Management (RCM)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time executive ledger, departmental billing reconciliation, and NHIS electronic claim tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedPeriod === opt.value
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Link href="/hospital-finance/cashier">
            <Button variant="primary" size="sm" className="font-bold gap-1.5 shadow-md shadow-teal-700/20">
              <CreditCard className="h-4 w-4" /> Open Cashier POS
            </Button>
          </Link>
          <Link href="/hospital-finance/shifts">
            <Button variant="outline" size="sm" className="font-bold gap-1.5 border-slate-300">
              <Wallet className="h-4 w-4" /> Cashier Shifts
            </Button>
          </Link>
        </div>
      </div>

      {renderKpis()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {renderDepartmentCard()}
        {renderChannelsCard()}
      </div>

      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-teal-700" /> Cashier Shift Audit &amp; Receipts Ledger
            </h3>
            <p className="text-xs text-slate-500">Post-settlement shift records with till-discrepancy sign-off status</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadRecentTx}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-teal-600 ${isLoadingTx ? "animate-spin" : ""}`} />
            </button>
            <Link href="/hospital-finance/cashier">
              <Button variant="outline" size="sm" className="font-bold text-xs border-slate-300">
                Go to Cashier Terminal
              </Button>
            </Link>
          </div>
        </div>

        {renderRecentTransactions()}
      </Card>
    </div>
  );
}
