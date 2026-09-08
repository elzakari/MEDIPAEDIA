"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Receipt,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  ShieldCheck,
  Printer,
  DollarSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";

interface BillingItem {
  id: string;
  name: string;
  amount: number;
}

export default function HospitalBillingCashierPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFound, setPatientFound] = useState(false);
  const [paymentChannel, setPaymentChannel] = useState<"MOMO" | "CASH" | "GHIPSS_POS">("MOMO");
  const [momoNumber, setMomoNumber] = useState("0244123456");
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState("");

  const [items, setItems] = useState<BillingItem[]>([
    { id: "1", name: "OPD Digital Folder Issuance Tariff", amount: 30.0 },
    { id: "2", name: "Specialist Physician Consultation", amount: 50.0 },
  ]);

  const totalAmount = items.reduce((acc, i) => acc + i.amount, 0);

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCollecting(true);
    setTimeout(() => {
      setIsCollecting(false);
      setLastReceiptNumber(`RCP-20260819-${Math.floor(1000 + Math.random() * 9000)}`);
      setCollectionSuccess(true);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Hospital Cashier Desk & Fee Collections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Collect OPD folder fees, specialist tariffs, and generate verified receipts with Zero-PHI access
          </p>
        </div>
        <Badge variant="teal" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
          Zero-PHI Protected
        </Badge>
      </div>

      {collectionSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Payment Collected & Receipt Issued!</span>
            </div>
            <span className="font-mono font-bold text-xs bg-emerald-200/80 px-2.5 py-1 rounded-lg">
              {lastReceiptNumber}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700">
            GHS {totalAmount.toFixed(2)} received via {paymentChannel}. Patient folder RRH-OPD-92140 cleared for doctor triage.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1 bg-white border-emerald-300 text-emerald-800"
            >
              <Printer className="h-3.5 w-3.5" /> Print Thermal Receipt
            </Button>
            <Button
              onClick={() => setCollectionSuccess(false)}
              variant="teal"
              size="sm"
              className="text-xs font-bold"
            >
              Next Billing Customer →
            </Button>
          </div>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Patient Lookup & Items */}
        <div className="md:col-span-7 space-y-4">
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Search className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Patient Account Lookup
              </h3>
            </div>

            <div className="flex gap-2">
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Enter Ghana Card PIN (e.g. GHA-71298412-1)"
                className="text-xs"
              />
              <Button variant="teal" size="sm" className="font-bold shrink-0">
                Verify Card
              </Button>
            </div>

            {patientFound && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">Patient Record Retrieved</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Folder: Active OPD Tariff Queue
                  </p>
                </div>
                <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
                  Folder Active
                </Badge>
              </div>
            )}
          </Card>

          {/* Tariffs List */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Billable Tariffs
              </h3>
              <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
                Hospital Rates 2026
              </Badge>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-800">{item.name}</span>
                  <span className="font-mono font-bold text-slate-900">GHS {item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Payable:</span>
              <span className="text-lg font-black text-slate-900">GHS {totalAmount.toFixed(2)}</span>
            </div>
          </Card>
        </div>

        {/* Right: Payment Channels */}
        <div className="md:col-span-5 space-y-4">
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Payment Channel
              </h3>
            </div>

            <form onSubmit={handleCollect} className="space-y-4 text-xs">
              <div className="space-y-2">
                {[
                  { id: "MOMO", label: "MTN / Telecel Mobile Money (GhIPSS)", icon: <Smartphone className="h-4 w-4" /> },
                  { id: "GHIPSS_POS", label: "GhIPSS Debit / Visa Card", icon: <CreditCard className="h-4 w-4" /> },
                  { id: "CASH", label: "Cash Over Counter", icon: <Receipt className="h-4 w-4" /> },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setPaymentChannel(ch.id as any)}
                    className={`w-full p-3 rounded-xl border flex items-center gap-2.5 font-bold transition text-left ${
                      paymentChannel === ch.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-emerald-700">{ch.icon}</span>
                    <span className="text-xs">{ch.label}</span>
                  </button>
                ))}
              </div>

              {paymentChannel === "MOMO" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Money Wallet Number
                  </label>
                  <Input
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="024XXXXXXX"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="teal"
                size="lg"
                isLoading={isCollecting}
                className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Collect GHS {totalAmount.toFixed(2)} & Issue Receipt
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
