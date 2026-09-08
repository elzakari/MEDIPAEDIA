"use client";

import React, { useState } from "react";
import {
  Wallet,
  CreditCard,
  Plus,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  DollarSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function PatientWalletAndInsurancePage() {
  const [balance, setBalance] = useState(450.0);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Top-up state
  const [topupAmount, setTopupAmount] = useState("100.00");
  const [phone, setPhone] = useState("0244123456");
  const [network, setNetwork] = useState("MTN");

  const [transactions, setTransactions] = useState([
    {
      id: "tx-101",
      type: "TOPUP",
      title: "MTN Mobile Money Top-Up",
      amount: "+ GHS 200.00",
      date: "18 Aug 2026, 16:30",
      status: "COMPLETED",
      isCredit: true,
    },
    {
      id: "tx-102",
      type: "HOSPITAL_PAYMENT",
      title: "Ridge Hospital Out-of-Pocket Co-Pay Settle",
      amount: "- GHS 135.00",
      date: "19 Aug 2026, 11:00",
      status: "COMPLETED",
      isCredit: false,
    },
    {
      id: "tx-103",
      type: "PHARMACY_ESCROW",
      title: "Osu Chemist Prescription Escrow Hold",
      amount: "- GHS 65.00",
      date: "15 Aug 2026, 14:15",
      status: "COMPLETED",
      isCredit: false,
    },
  ]);

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const addAmt = parseFloat(topupAmount) || 0;
      setBalance(balance + addAmt);
      const newTx = {
        id: `tx-10${transactions.length + 1}`,
        type: "TOPUP",
        title: `${network} Mobile Money Top-Up`,
        amount: `+ GHS ${addAmt.toFixed(2)}`,
        date: "Just now",
        status: "COMPLETED",
        isCredit: true,
      };
      setTransactions([newTx, ...transactions]);
      setTopupSuccess(true);
      setTimeout(() => {
        setTopupSuccess(false);
        setTopupModalOpen(false);
      }, 1200);
    }, 750);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-700" /> Health Wallet & Insurance Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pre-fund hospital co-pays, pharmacy escrows, and manage National Health Insurance (NHIS) policies
          </p>
        </div>

        <Button
          onClick={() => setTopupModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Top Up Wallet via MoMo
        </Button>
      </div>

      {/* Wallet Balance & Insurance 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Health Wallet Card (Col span 5) */}
        <div className="md:col-span-5 space-y-4">
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white shadow-xl space-y-5 border border-teal-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-teal-300 tracking-wider">
                MEDIPAEDIA HEALTH WALLET
              </span>
              <Badge variant="teal" className="text-[10px] font-bold bg-white/20 text-white border-none">
                GHS ACCOUNT
              </Badge>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Available Balance</span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-0.5">
                GHS {balance.toFixed(2)}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">TIED TO GHANA CARD</span>
                <strong className="text-white font-mono">GHA-71298412-1</strong>
              </div>
              <Button
                size="sm"
                onClick={() => setTopupModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs gap-1 shadow-md"
              >
                <Smartphone className="h-3.5 w-3.5" /> Instant MoMo Topup
              </Button>
            </div>
          </Card>
        </div>

        {/* Insurance Cards Manager (Col span 7) */}
        <div className="md:col-span-7 space-y-4">
          <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" /> Linked Health Insurance Policies
            </h3>

            <div className="space-y-3">
              {/* NHIS Card */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-extrabold">National Health Insurance (NHIS)</strong>
                    <Badge variant="teal" className="text-[9px] font-bold">ACTIVE & VALID</Badge>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">
                    Policy: <strong>GHA-NHIS-8821940</strong> • Exp: Dec 2026
                  </p>
                </div>
                <span className="text-[11px] text-teal-800 font-bold">100% G-DRG Covered</span>
              </div>

              {/* Private Insurance Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-extrabold">Nationwide Medical Insurance</strong>
                    <Badge variant="outline" className="text-[9px] font-bold">PRIVATE COPAY</Badge>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">
                    Member: <strong>NMI-GOLD-2026-99</strong> • Exp: Aug 2027
                  </p>
                </div>
                <span className="text-[11px] text-indigo-800 font-bold">GHS 50,000 Annual Limit</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Health Wallet Transactions */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-teal-700" /> Wallet Payment & Escrow History
        </h3>

        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    tx.isCredit
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tx.isCredit ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <strong className="text-slate-900 font-bold block">{tx.title}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{tx.date}</span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`font-mono font-black text-sm block ${
                    tx.isCredit ? "text-emerald-700" : "text-slate-900"
                  }`}
                >
                  {tx.amount}
                </span>
                <Badge variant="teal" className="text-[9px]">
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top-up Modal */}
      {topupModalOpen && (
        <Modal
          isOpen={topupModalOpen}
          onClose={() => setTopupModalOpen(false)}
          title="Top Up Health Wallet"
          description="Send direct Mobile Money USSD prompt via Paystack integration."
        >
          <form onSubmit={handleTopupSubmit} className="py-4 space-y-3 text-xs">
            {topupSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Wallet Top-Up Completed!</h3>
                <p className="text-xs text-emerald-800">Funds immediately available for hospital co-pays.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Top-Up Amount (GHS)</label>
                  <input
                    type="number"
                    step="10.00"
                    min="10"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Network</label>
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="MTN">MTN MoMo</option>
                      <option value="TELECEL">Telecel Cash</option>
                      <option value="AT">AT Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">MoMo Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isProcessing}
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  Pay GHS {parseFloat(topupAmount || "0").toFixed(2)} via Paystack
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
