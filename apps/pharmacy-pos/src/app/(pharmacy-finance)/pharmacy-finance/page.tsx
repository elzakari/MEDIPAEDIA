"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
  Globe,
  KeyRound,
  Check,
} from "lucide-react";
import { Badge, Button, Card, Input, Modal } from "@medipaedia/ui";

const PHARMACY_CURRENCIES = [
  { country: "GH", name: "Ghana (GHS)", flag: "🇬🇭", currency: "GHS", gateway: "Paystack", defaultNet: "MTN MoMo" },
  { country: "TG", name: "Togo (XOF)", flag: "🇹🇬", currency: "XOF", gateway: "FedaPay", defaultNet: "T-Money" },
  { country: "BJ", name: "Bénin (XOF)", flag: "🇧🇯", currency: "XOF", gateway: "FedaPay", defaultNet: "MTN MoMo Bénin" },
];

export default function PharmacyFinancePage() {
  const [selectedCurrency, setSelectedCurrency] = useState("GHS");
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepSuccess, setSweepSuccess] = useState<string | null>(null);
  const [availableBalanceGHS, setAvailableBalanceGHS] = useState(4850.5);
  const [availableBalanceXOF, setAvailableBalanceXOF] = useState(242500);
  const [pendingEscrowGHS, setPendingEscrowGHS] = useState(1240.0);
  const [pendingEscrowXOF, setPendingEscrowXOF] = useState(62000);

  // Escrow Release with OTP Modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [handoverOtp, setHandoverOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  // Merchant MoMo Payout Settings
  const [momoNumber, setMomoNumber] = useState("+233 24 412 3456");
  const [momoProvider, setMomoProvider] = useState("MTN Mobile Money");
  const [autoDailySweep, setAutoDailySweep] = useState(true);

  const transactions = [
    {
      id: "tx-1",
      ref: "PAY-GH-994102",
      orderNumber: "MED-ORD-2026-99120",
      gross: 65.0,
      fee: 3.25,
      net: 61.75,
      currency: "GHS",
      type: "ESCROW_UNLOCKED",
      channel: "MTN MoMo (Paystack)",
      timestamp: "10:14 AM Today",
      status: "SETTLED_AVAILABLE",
    },
    {
      id: "tx-2",
      ref: "FEDA-XOF-TG-881920",
      orderNumber: "MED-ORD-2026-99121",
      gross: 6000.0,
      fee: 300.0,
      net: 5700.0,
      currency: "XOF",
      type: "ESCROW_UNLOCKED",
      channel: "T-Money (FedaPay)",
      timestamp: "09:30 AM Today",
      status: "SETTLED_AVAILABLE",
    },
    {
      id: "tx-3",
      ref: "SWEEP-PAY-20260820",
      orderNumber: "BATCH-SWEEP-0820",
      gross: 3850.0,
      fee: 0.0,
      net: 3850.0,
      currency: "GHS",
      type: "MOMO_PAYOUT_TRANSFER",
      channel: "Disbursed to +233 24 412 3456",
      timestamp: "Yesterday 05:00 PM",
      status: "DISBURSED",
    },
  ];

  const handleManualSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      const isGHS = selectedCurrency === "GHS";
      const amt = isGHS ? availableBalanceGHS : availableBalanceXOF;
      setSweepSuccess(
        `Instant MoMo Sweep of ${selectedCurrency} ${amt.toLocaleString()} disbursed to ${momoNumber} (${momoProvider}) via ${isGHS ? "Paystack" : "FedaPay"}. Ref: SWEEP-${Date.now().toString().slice(-6)}`
      );
      if (isGHS) setAvailableBalanceGHS(0.0);
      else setAvailableBalanceXOF(0.0);
      setTimeout(() => setSweepSuccess(null), 6000);
    }, 1200);
  };

  const handleVerifyOtpAndReleaseEscrow = () => {
    setOtpVerifying(true);
    setTimeout(() => {
      setOtpVerifying(false);
      if (["491028", "772019", "123456", "99120"].includes(handoverOtp.trim())) {
        const netCredit = 61.75;
        setAvailableBalanceGHS((prev) => prev + netCredit);
        setPendingEscrowGHS((prev) => Math.max(0, prev - 65.0));
        setOtpSuccessMsg(`OTP Verified! GHS ${netCredit.toFixed(2)} moved from Escrow to Available Balance.`);
        setTimeout(() => {
          setOtpSuccessMsg(null);
          setOtpModalOpen(false);
          setHandoverOtp("");
        }, 2000);
      } else {
        alert("Invalid 6-digit OTP pass. Please verify the code displayed on the patient's phone.");
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header & Multi-Country Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-700" />
            <span>Pharmacy Finance &amp; Escrow Settlement Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Multi-Country Mobile Money Sweeps (Ghana GHS via Paystack &bull; Togo/Benin XOF via FedaPay) &amp; OTP Escrow Releases
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedCurrency("GHS")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedCurrency === "GHS" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600"
              }`}
            >
              🇬🇭 Ghana GHS
            </button>
            <button
              onClick={() => setSelectedCurrency("XOF")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedCurrency === "XOF" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600"
              }`}
            >
              🇹🇬 🇧🇯 Togo/Bénin XOF
            </button>
          </div>

          <Badge variant="teal" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
            <Lock className="h-3 w-3 mr-1" />
            Zero-PHI Protected
          </Badge>
        </div>
      </div>

      {/* Financial Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Available for Payout ({selectedCurrency})
            </span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {selectedCurrency} {selectedCurrency === "GHS" ? availableBalanceGHS.toLocaleString(undefined, { minimumFractionDigits: 2 }) : availableBalanceXOF.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">
            {autoDailySweep ? "Automated daily sweep at 05:00 PM GMT" : "Manual on-demand sweeps enabled"}
          </p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Held in Escrow ({selectedCurrency})
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {selectedCurrency} {selectedCurrency === "GHS" ? pendingEscrowGHS.toLocaleString(undefined, { minimumFractionDigits: 2 }) : pendingEscrowXOF.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">
            Released instantly upon counter prescription OTP verification
          </p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Total Disbursed This Month
            </span>
            <ArrowUpRight className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900 font-mono">
            {selectedCurrency === "GHS" ? "GHS 38,050.50" : "1,902,500 XOF"}
          </div>
          <p className="text-[11px] text-slate-500">
            0% transfer fee via Paystack &amp; FedaPay Instant MoMo
          </p>
        </Card>
      </div>

      {sweepSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{sweepSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left = Payout Account & OTP Release, Right = Settlements Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account & Instant Payout */}
        <div className="space-y-4 lg:col-span-1">
          {/* Verified Payout Wallet Card */}
          <Card className="p-6 border border-slate-200 bg-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Verified MoMo Merchant Account</h3>
              </div>
              <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
                KYC VERIFIED
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Operator Network</span>
                <span className="font-bold text-slate-800">{momoProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant MoMo Number</span>
                <span className="font-mono font-bold text-slate-800">{momoNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Facility</span>
                <span className="font-bold text-slate-800">Osu Community Pharmacy Ltd</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Primary Currency</span>
                <span className="font-mono font-bold text-teal-700">{selectedCurrency}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={handleManualSweep}
                variant="teal"
                className="w-full font-bold text-xs py-2.5 flex items-center justify-center gap-1.5"
                isLoading={isSweeping}
                disabled={selectedCurrency === "GHS" ? availableBalanceGHS <= 0 : availableBalanceXOF <= 0}
              >
                <Zap className="h-4 w-4" />
                <span>Instant MoMo Sweep ({selectedCurrency})</span>
              </Button>

              <Button
                onClick={() => setOtpModalOpen(true)}
                variant="outline"
                className="w-full font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"
              >
                <KeyRound className="h-4 w-4 text-teal-600" />
                <span>Release Escrow with Handover OTP</span>
              </Button>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <span>Automated 05:00 PM Daily Sweep</span>
                <input
                  type="checkbox"
                  checked={autoDailySweep}
                  onChange={(e) => setAutoDailySweep(e.target.checked)}
                  className="rounded-sm accent-teal-600"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Settlements Ledger */}
        <Card className="p-0 border border-slate-200 bg-white lg:col-span-2 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Multi-Country Settlements &amp; Escrow Ledger
              </h3>
              <p className="text-[11px] text-slate-400">
                Paystack &amp; FedaPay Cryptographically Verified Webhooks
              </p>
            </div>
            <Badge variant="teal" className="text-[10px] font-mono">
              Active Escrow Protocol
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Transaction &amp; Order</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Channel &amp; Country</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Fee (5%)</th>
                  <th className="px-4 py-3 text-right">Net Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono font-bold text-slate-900">{tx.ref}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{tx.orderNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={tx.type === "MOMO_PAYOUT_TRANSFER" ? "teal" : "cyan"}
                        className="text-[9px] uppercase font-bold py-0"
                      >
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-800 font-medium">{tx.channel}</p>
                        <p className="text-[10px] text-slate-400">{tx.timestamp}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {tx.currency} {tx.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">
                      {tx.currency} {tx.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                      {tx.currency} {tx.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Escrow Release Handover OTP Modal */}
      <Modal
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        title="Verify Prescription Handover OTP Pass"
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-600">
            Ask the patient or courier for the 6-digit confirmation OTP generated on their Medipaedia order pass.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              6-Digit Handover OTP (Try demo code: <strong className="text-teal-700 font-mono">491028</strong>)
            </label>
            <input
              type="text"
              maxLength={6}
              value={handoverOtp}
              onChange={(e) => setHandoverOtp(e.target.value)}
              placeholder="e.g. 491028"
              className="w-full text-center tracking-widest text-xl font-mono font-black p-3 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {otpSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{otpSuccessMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="teal"
              className="flex-1 font-bold text-xs"
              onClick={handleVerifyOtpAndReleaseEscrow}
              isLoading={otpVerifying}
              disabled={handoverOtp.length < 6}
            >
              Verify OTP &amp; Unlock Escrow Funds
            </Button>
            <Button
              variant="outline"
              className="text-xs"
              onClick={() => setOtpModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
