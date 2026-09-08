"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  Coins,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Printer,
  Clock,
  User,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal, useTranslation } from "@medipaedia/ui";
import { createApiClient, CashierShiftResponse, CashierShiftAuditItem, CloseShiftResponse } from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";

function formatCurrency(amount: number, currency: string = "GHS"): string {
  if (amount == null || isNaN(amount)) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function discrepancyVariant(discrepancyType: string): "teal" | "warning" | "danger" {
  if (discrepancyType === "BALANCED") return "teal";
  if (discrepancyType === "OVERAGE") return "warning";
  return "danger";
}

function formatDiscrepancy(amount: number, type: string, currency: string = "GHS"): string {
  if (type === "BALANCED") return `${currency} 0.00`;
  if (amount === 0) return `${currency} 0.00`;
  const sign = amount > 0 ? "+" : "-";
  return `${sign}${currency} ${Math.abs(amount).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriod(opened: string, closed?: string): string {
  try {
    const fmt = (s: string) => {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    return closed ? `${fmt(opened)} - ${fmt(closed)}` : fmt(opened);
  } catch {
    return opened;
  }
}

export default function CashierShiftsPage() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const apiClient = createApiClient();
  const currency = tenant?.currency || "GHS";

  const [activeShift, setActiveShift] = useState<CashierShiftResponse | null>(null);
  const [pastShifts, setPastShifts] = useState<CashierShiftAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [declaredCash, setDeclaredCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [closedCertificate, setClosedCertificate] = useState<CloseShiftResponse | null>(null);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const { active, history } = await apiClient.getCashierShifts();
      setActiveShift(active);
      setPastShifts(history || []);
      if (active && declaredCash === "") {
        setDeclaredCash(Number(active.expected_drawer_cash || 0).toFixed(2));
      }
    } catch (err: any) {
      setActiveShift(null);
      setPastShifts([]);
      setLoadError(err?.message || String(err) || "Unable to load cashier shifts from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const declaredNum = parseFloat(declaredCash) || 0;
  const expectedNum = activeShift?.expected_drawer_cash || 0;
  const discrepancy = declaredNum - expectedNum;

  const handleConfirmCloseShift = async () => {
    if (!activeShift) return;
    try {
      setIsSubmittingClose(true);
      const response = await apiClient.closeCashierShift(
        {
          declared_cash_count: declaredNum,
          closing_notes: closingNotes || undefined,
        },
        activeShift.workstation_id || undefined
      );
      setClosedCertificate(response);
      setTimeout(() => loadShifts(), 1200);
    } catch (err: any) {
      alert(err?.message || String(err) || "Failed to close shift. Please retry.");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleOpenNewShiftPlaceholder = () => {
    alert("Open Shift action routes to the Cashier POS workstation initiator.");
  };

  const renderActiveShift = () => {
    if (isLoading) {
      return (
        <Card className="p-6 border border-slate-200 bg-white shadow-md space-y-4">
          <div className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        </Card>
      );
    }
    if (loadError) {
      return (
        <Card className="p-6 border border-rose-200 bg-rose-50/80">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-rose-900 text-sm">Failed to load active drawer</h4>
              <p className="text-xs text-rose-700 font-mono break-words">{loadError}</p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={loadShifts} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </Card>
      );
    }
    if (!activeShift) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl mx-auto mb-4 text-teal-700">
            💵
          </div>
          <h3 className="text-xl font-bold text-slate-800">Cashier Drawer Closed</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
            You do not have an active till shift open. Start a new shift to set your opening cash float and begin settling patient folios.
          </p>
          <button
            type="button"
            onClick={handleOpenNewShiftPlaceholder}
            className="mt-6 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs tracking-wide shadow-md transition-all"
          >
            + Open Drawer &amp; Set Cash Float
          </button>
        </div>
      );
    }
    return (
      <Card className="p-6 border-2 border-teal-500 bg-white shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-extrabold">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">{activeShift.cashier_name || "Unattended Workstation"}</h3>
                <Badge variant="teal" className="text-xs font-bold">SHIFT ACTIVE</Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {activeShift.workstation_id || "(none)"} • Shift ID: {activeShift.shift_id} • Opened: {formatPeriod(activeShift.opened_at)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Shift Transactions</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {activeShift.transaction_count || 0} Folios Settled
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
            <span className="text-xs font-bold text-teal-800 block">Expected Physical Drawer Cash</span>
            <div className="text-2xl font-black text-teal-950 font-mono mt-1">
              {formatCurrency(activeShift.expected_drawer_cash || 0, currency)}
            </div>
            <p className="text-[11px] text-teal-700 mt-1">
              Float ({formatCurrency(activeShift.opening_float || 0, currency)}) + Cash ({formatCurrency(activeShift.total_cash_collected || 0, currency)})
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-xs font-bold text-amber-800 block">Mobile Money Collections</span>
            <div className="text-2xl font-black text-amber-950 font-mono mt-1">
              {formatCurrency(activeShift.total_momo_collected || 0, currency)}
            </div>
            <p className="text-[11px] text-amber-700 mt-1">MTN & Telecel direct API pushes</p>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
            <span className="text-xs font-bold text-indigo-800 block">Debit / Credit Card POS</span>
            <div className="text-2xl font-black text-indigo-950 font-mono mt-1">
              {formatCurrency(activeShift.total_card_collected || 0, currency)}
            </div>
            <p className="text-[11px] text-indigo-700 mt-1">Visa & Mastercard transactions</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 block">Total Gross Collections</span>
            <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
              {formatCurrency(activeShift.total_collections || 0, currency)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">All payment channels combined</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderPastShifts = () => {
    if (isLoading) {
      return (
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="h-8 bg-slate-100 animate-pulse rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </Card>
      );
    }
    if (!pastShifts || pastShifts.length === 0) {
      return (
        <Card className="p-6 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-700" /> Historical Closed Shifts & Audit Certificates
              </h3>
              <p className="text-xs text-slate-500">Audited drawer close events with declared vs expected cash reconciliation</p>
            </div>
          </div>
          <div className="py-10 text-center">
            <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40 max-w-md mx-auto">
              <Clock className="h-10 w-10 mx-auto text-slate-400 mb-4" />
              <h4 className="font-black text-slate-700 text-sm mb-1">No completed shifts yet</h4>
              <p className="text-xs text-slate-500">
                Close an active drawer to generate a reconciliation certificate and audit entry in this ledger.
              </p>
            </Card>
          </div>
        </Card>
      );
    }
    return (
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-700" /> Historical Closed Shifts & Audit Certificates
            </h3>
            <p className="text-xs text-slate-500">Audited drawer close events with declared vs expected cash reconciliation</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Shift ID</th>
                <th className="p-2.5">Cashier</th>
                <th className="p-2.5">Workstation</th>
                <th className="p-2.5">Period</th>
                <th className="p-2.5">Opening Float</th>
                <th className="p-2.5">Total Revenue</th>
                <th className="p-2.5">Discrepancy</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastShifts.map((s) => (
                <tr key={s.shift_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-2.5 font-mono font-bold text-teal-800">{s.shift_id}</td>
                  <td className="p-2.5 font-medium text-slate-900">{s.cashier_name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{s.cashier_email || "(none)"}</td>
                  <td className="p-2.5 text-slate-500">{formatPeriod(s.opened_at, s.closed_at)}</td>
                  <td className="p-2.5 font-mono">{formatCurrency(s.opening_float || 0, currency)}</td>
                  <td className="p-2.5 font-mono font-bold text-slate-900">{formatCurrency(s.total_revenue || 0, currency)}</td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {formatDiscrepancy(s.discrepancy_amount || 0, s.discrepancy_type || "BALANCED", currency)}
                  </td>
                  <td className="p-2.5">
                    <Badge variant={discrepancyVariant(s.discrepancy_type || "BALANCED")} className="text-[10px] font-bold">
                      {s.discrepancy_type || "BALANCED"}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => alert(`Printing Audit Certificate for ${s.shift_id}...`)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-700" /> Cashier Drawer & Shift Balancing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time physical drawer tracking, cash float accountability, and end-of-shift reconciliation
          </p>
        </div>
        <Button
          onClick={() => setCloseShiftModal(true)}
          disabled={!activeShift}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileCheck className="h-4 w-4" /> Close Shift & Balance Drawer
        </Button>
      </div>

      {renderActiveShift()}
      {renderPastShifts()}

      {closeShiftModal && !closedCertificate && activeShift && (
        <Modal
          isOpen={closeShiftModal}
          onClose={() => setCloseShiftModal(false)}
          title="Close Cashier Shift & Drawer Balance"
          description="Count physical currency in till and record declared cash to reconcile shift."
        >
          <div className="py-4 space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase block">
                  SYSTEM EXPECTED DRAWER CASH
                </span>
                <div className="text-2xl font-black text-teal-950 font-mono">
                  {formatCurrency(activeShift.expected_drawer_cash || 0, currency)}
                </div>
              </div>
              <Badge variant="teal" className="text-xs font-bold">{activeShift.workstation_id || "(none)"}</Badge>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Physical Cash Counted (Declared Cash in {currency})
              </label>
              <input
                type="number"
                step="0.50"
                value={declaredCash}
                onChange={(e) => setDeclaredCash(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div
              className={`p-3 rounded-xl border font-bold flex items-center justify-between ${
                discrepancy === 0
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : discrepancy > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              }`}
            >
              <span>Reconciliation Result:</span>
              <span className="font-mono text-sm">
                {discrepancy === 0
                  ? `PERFECTLY BALANCED (${formatCurrency(0, currency)})`
                  : discrepancy > 0
                  ? `OVERAGE (+${formatCurrency(Math.abs(discrepancy), currency)})`
                  : `SHORTAGE (-${formatCurrency(Math.abs(discrepancy), currency)})`}
              </span>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Closing Notes / Reason for Discrepancy</label>
              <textarea
                rows={2}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none"
                placeholder="Any observations about the drawer state or reconciliation..."
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleConfirmCloseShift}
              isLoading={isSubmittingClose}
              className="w-full font-bold shadow-md shadow-teal-700/20 py-3"
            >
              Sign & Certify Shift Closure
            </Button>
          </div>
        </Modal>
      )}

      {closedCertificate && (
        <Modal
          isOpen={true}
          onClose={() => {
            setClosedCertificate(null);
            setCloseShiftModal(false);
          }}
          title="Shift Closure Certified"
          description="Drawer balance recorded and audit certificate generated."
        >
          <div className="py-4 space-y-4 text-xs text-center">
            <div className="h-14 w-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] text-left space-y-1">
              <div className="text-center font-bold text-slate-200">
                ========================================<br />
                   SHIFT CLOSURE CERTIFICATE<br />
                ========================================
              </div>
              <div>Shift ID:       {closedCertificate.shift_id}</div>
              <div>Cashier:        {closedCertificate.cashier_name}</div>
              <div>Period:         {formatPeriod(closedCertificate.opened_at)} - {formatPeriod(closedCertificate.closed_at)}</div>
              <div>----------------------------------------</div>
              <div>Opening Float:  {formatCurrency(closedCertificate.opening_float || 0, currency)}</div>
              <div>Expected Cash:  {formatCurrency(closedCertificate.expected_cash || 0, currency)}</div>
              <div>Declared Cash:  {formatCurrency(closedCertificate.declared_cash || 0, currency)}</div>
              <div className="text-slate-100 font-bold">
                Discrepancy:    {formatDiscrepancy(closedCertificate.discrepancy || 0, closedCertificate.status || "BALANCED", currency)} ({closedCertificate.status || "BALANCED"})
              </div>
              <div>MoMo Collected: {formatCurrency(closedCertificate.total_momo || 0, currency)}</div>
              <div>Card Collected: {formatCurrency(closedCertificate.total_card || 0, currency)}</div>
              <div>Total Revenue:  {formatCurrency(closedCertificate.total_revenue || 0, currency)}</div>
              <div>Transactions:   {closedCertificate.transactions_processed || 0}</div>
              <div>----------------------------------------</div>
              <div className="text-center text-slate-400 text-[10px]">
                Audited & Digitally Sealed by Medipaedia Financial Core
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setClosedCertificate(null);
                setCloseShiftModal(false);
              }}
              className="w-full font-bold"
            >
              Done & Return to Shifts
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
