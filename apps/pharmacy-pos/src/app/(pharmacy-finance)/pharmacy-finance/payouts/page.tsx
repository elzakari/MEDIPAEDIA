"use client";

import React, { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Calendar,
  Building2,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";

interface PayoutRecord {
  id: string;
  payoutRef: string;
  provider: "MTN MoMo" | "Telecel Cash" | "Stanbic Bank Account";
  accountNumber: string;
  recipientName: string;
  amount: number;
  initiatedAt: string;
  completedAt: string;
  status: "SETTLED" | "PROCESSING";
}

export default function PharmacyPayoutsPage() {
  const [triggeringSweep, setTriggeringSweep] = useState(false);
  const [sweepSuccess, setSweepSuccess] = useState(false);

  const [payouts, setPayouts] = useState<PayoutRecord[]>([
    {
      id: "po-1",
      payoutRef: "SWEEP-20260819-01",
      provider: "MTN MoMo",
      accountNumber: "024 ••• ••77",
      recipientName: "Osu Community Pharmacy Ltd",
      amount: 104.5,
      initiatedAt: "Today, 11:00 AM",
      completedAt: "Today, 11:01 AM",
      status: "SETTLED",
    },
    {
      id: "po-2",
      payoutRef: "SWEEP-20260818-01",
      provider: "MTN MoMo",
      accountNumber: "024 ••• ••77",
      recipientName: "Osu Community Pharmacy Ltd",
      amount: 480.0,
      initiatedAt: "18 Aug, 05:30 PM",
      completedAt: "18 Aug, 05:31 PM",
      status: "SETTLED",
    },
    {
      id: "po-3",
      payoutRef: "SWEEP-20260817-01",
      provider: "Stanbic Bank Account",
      accountNumber: "90400019284",
      recipientName: "Osu Community Pharmacy Ltd",
      amount: 1250.0,
      initiatedAt: "17 Aug, 06:00 PM",
      completedAt: "17 Aug, 06:05 PM",
      status: "SETTLED",
    },
  ]);

  const handleTriggerSweep = () => {
    setTriggeringSweep(true);
    setTimeout(() => {
      setTriggeringSweep(false);
      setSweepSuccess(true);
      setTimeout(() => setSweepSuccess(false), 4000);
    }, 800);
  };

  const totalSettled = payouts.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Mobile Money Payout Settlements & Sweeps
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Automated Paystack disbursement batches to designated corporate MoMo and bank accounts
          </p>
        </div>
        <Button
          onClick={handleTriggerSweep}
          variant="primary"
          size="sm"
          isLoading={triggeringSweep}
          className="font-bold gap-1.5 shadow-sm shadow-emerald-700/20"
        >
          <ArrowUpRight className="h-4 w-4" /> Trigger Immediate Payout Sweep
        </Button>
      </div>

      {sweepSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Paystack settlement sweep initiated. Funds queued for transfer to MTN MoMo account.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Disbursed Volume
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              GHS {totalSettled.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-bold">100% Reconciled</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Active MoMo Settlement Wallet
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">MTN MoMo (024 ••• ••77)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Average Settlement Speed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">&lt; 60 Seconds</span>
          </div>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Disbursement Settlement History
            </h3>
          </div>
          <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
            PAYSTACK AUTOMATED
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Batch Reference #</th>
                <th className="px-4 py-3">Destination Channel</th>
                <th className="px-4 py-3">Recipient Corporate Account</th>
                <th className="px-4 py-3">Completed At</th>
                <th className="px-4 py-3 text-right font-bold text-slate-900">Disbursed Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-800">
                    {po.payoutRef}
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2 text-slate-700 font-medium">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                    {po.provider}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{po.recipientName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{po.accountNumber}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono">
                    {po.completedAt}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                    GHS {po.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> {po.status}
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
