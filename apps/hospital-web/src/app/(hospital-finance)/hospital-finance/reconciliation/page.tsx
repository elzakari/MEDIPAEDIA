"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Building2,
  CreditCard,
  Printer,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";

interface DailyTransaction {
  id: string;
  receiptNumber: string;
  category: "OPD_CARD" | "CONSULTATION" | "EMERGENCY_FEE" | "LAB_DIAGNOSTICS";
  amount: number;
  paymentMethod: "MTN MoMo" | "Telecel Cash" | "GhIPSS Card" | "Cash";
  cashier: string;
  time: string;
  reconciled: boolean;
}

export default function HospitalRevenueReconciliationPage() {
  const [selectedDate, setSelectedDate] = useState("2026-08-19");

  const [transactions, setTransactions] = useState<DailyTransaction[]>([
    {
      id: "tx-1",
      receiptNumber: "RCP-20260819-4912",
      category: "OPD_CARD",
      amount: 30.0,
      paymentMethod: "MTN MoMo",
      cashier: "Esi Mensah",
      time: "10:14 AM",
      reconciled: true,
    },
    {
      id: "tx-2",
      receiptNumber: "RCP-20260819-4913",
      category: "CONSULTATION",
      amount: 50.0,
      paymentMethod: "MTN MoMo",
      cashier: "Esi Mensah",
      time: "10:20 AM",
      reconciled: true,
    },
    {
      id: "tx-3",
      receiptNumber: "RCP-20260819-4914",
      category: "EMERGENCY_FEE",
      amount: 80.0,
      paymentMethod: "Cash",
      cashier: "Esi Mensah",
      time: "10:28 AM",
      reconciled: true,
    },
    {
      id: "tx-4",
      receiptNumber: "RCP-20260819-4915",
      category: "CONSULTATION",
      amount: 50.0,
      paymentMethod: "GhIPSS Card",
      cashier: "Esi Mensah",
      time: "10:35 AM",
      reconciled: true,
    },
  ]);

  const totalDailyRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);
  const momoRevenue = transactions
    .filter((t) => t.paymentMethod.includes("MoMo"))
    .reduce((acc, t) => acc + t.amount, 0);
  const cashRevenue = transactions
    .filter((t) => t.paymentMethod === "Cash")
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Daily Revenue Ledger & End-of-Day Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit trail of cashier fee collections, electronic receipts, and automated bank deposit splits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1 bg-white border-slate-300"
          >
            <Printer className="h-3.5 w-3.5" /> Print EOD Report
          </Button>
          <Button
            variant="teal"
            size="sm"
            className="text-xs font-bold gap-1 shadow-sm shadow-teal-700/20"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel/CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Revenue Collected Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              GHS {totalDailyRevenue.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-bold">100% Reconciled</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Mobile Money / Digital Cards
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">
              GHS {momoRevenue.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">Direct Bank Deposit</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Physical Cash in Till
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              GHS {cashRevenue.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">Drawer Count</span>
          </div>
        </Card>
      </div>

      {/* Transactions Ledger */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Settlement Batch for {selectedDate}
            </h3>
          </div>
          <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
            AUDITED (ZERO-PHI)
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Receipt Reference</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payment Channel</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-teal-800">
                    {tx.receiptNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {tx.category.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tx.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tx.cashier}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">
                    {tx.time}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    GHS {tx.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Balanced
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
