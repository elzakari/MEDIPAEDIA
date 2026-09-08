"use client";

import React, { useState } from "react";
import {
  DollarSign,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";

interface EscrowEntry {
  id: string;
  orderNumber: string;
  patientName: string;
  drug: string;
  totalGross: number;
  platformFee: number;
  netPayout: number;
  status: "RELEASED" | "HELD_IN_ESCROW" | "REFUNDED";
  verifiedAt: string;
}

export default function PharmacyEscrowLedgerPage() {
  const [search, setSearch] = useState("");

  const [escrows, setEscrows] = useState<EscrowEntry[]>([
    {
      id: "e-1",
      orderNumber: "ORD-20260819-9140",
      patientName: "Active Patient",
      drug: "Coartem 80/480mg (6 Tabs)",
      totalGross: 45.0,
      platformFee: 2.25,
      netPayout: 42.75,
      status: "RELEASED",
      verifiedAt: "10:35 AM Today",
    },
    {
      id: "e-2",
      orderNumber: "ORD-20260819-8921",
      patientName: "Abena Osei",
      drug: "Salbutamol Inhaler 100mcg",
      totalGross: 65.0,
      platformFee: 3.25,
      netPayout: 61.75,
      status: "RELEASED",
      verifiedAt: "09:50 AM Today",
    },
    {
      id: "e-3",
      orderNumber: "ORD-20260819-7412",
      patientName: "Kofi Boakye",
      drug: "Amlodipine 10mg (28 Tabs)",
      totalGross: 55.0,
      platformFee: 2.75,
      netPayout: 52.25,
      status: "HELD_IN_ESCROW",
      verifiedAt: "Awaiting QR Pickup",
    },
  ]);

  const filtered = escrows.filter(
    (e) =>
      e.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.drug.toLowerCase().includes(search.toLowerCase())
  );

  const totalGrossVolume = escrows.reduce((acc, e) => acc + e.totalGross, 0);
  const totalNetPayout = escrows.reduce((acc, e) => acc + e.netPayout, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Paystack Escrow Ledger & Claim Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time tracking of patient escrow locks, 95% net pharmacy releases, and 5% platform commissions
          </p>
        </div>
        <Badge variant="teal" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
          Paystack HMAC-SHA512 Verified
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Escrow Volume Processed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              GHS {totalGrossVolume.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">Gross Sales</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Net Pharmacy Payouts Released
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              GHS {totalNetPayout.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-bold">(95% Clean Net)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Currently Held in Escrow
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              GHS {escrows.filter((e) => e.status === "HELD_IN_ESCROW").reduce((acc, e) => acc + e.netPayout, 0).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">1 Order Pending Pickup</span>
          </div>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order #, patient, or medicine..."
              className="text-xs pl-9"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <span className="text-xs text-slate-500 font-medium">Automatic 24-Hour Settlement Cycle</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Order Ref #</th>
                <th className="px-4 py-3">Patient & Medicine</th>
                <th className="px-4 py-3">Gross Total</th>
                <th className="px-4 py-3">Commission (5%)</th>
                <th className="px-4 py-3 font-bold text-slate-900">Net Payout (95%)</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                    {e.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{e.patientName}</p>
                    <p className="text-[10px] text-slate-500">{e.drug}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    GHS {e.totalGross.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    -GHS {e.platformFee.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono font-black text-emerald-700 text-sm">
                    GHS {e.netPayout.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={e.status === "RELEASED" ? "teal" : "warning"}
                      className="text-[9px] uppercase font-bold py-0.5 px-2"
                    >
                      {e.status}
                    </Badge>
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
