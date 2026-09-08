"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Building2,
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Plus,
  CheckCircle2,
  Phone,
  Zap,
  Globe,
  Check,
  Shield,
  Layers,
  ArrowUpRight,
  Search,
  Sparkles,
  Receipt,
  Sliders,
  Settings,
  ShieldCheck,
  Server,
  Activity,
  Calendar,
  X,
  Edit,
  Copy,
  Trash2,
  Key,
  Radio,
  FileText,
  SlidersHorizontal,
  Wallet,
  TrendingUp,
  Percent,
  Download,
  AlertCircle,
  ArrowDownLeft,
} from "lucide-react";
import { Badge, Button, Input, Modal } from "@medipaedia/ui";

// ============================================================================
// TYPES
// ============================================================================

interface PricingRules {
  pom_markup_pct: number;
  otc_markup_pct: number;
  surgicals_markup_pct: number;
  supplements_markup_pct: number;
  controlled_markup_pct: number;
  vat_tax_rate_pct: number;
  enable_vat_on_receipts: boolean;
  max_cashier_discount_pct: number;
  enable_prescriber_loyalty_split: boolean;
  rounding_mode: string;
  currency: string;
}

interface PharmacyGateway {
  facility_id: string;
  facility_name: string;
  gateway_mode: "PLATFORM_ESCROW" | "DIRECT_SUBACCOUNT";
  primary_gateway: "PAYSTACK" | "FEDAPAY";
  subaccount_code: string;
  payout_network: string;
  payout_account_number: string;
  payout_account_name: string;
  payout_bank_code: string;
  enable_ussd_push: boolean;
  allow_split_tender: boolean;
  fee_bearer: "MERCHANT" | "PATIENT";
  auto_payout_schedule: "DAILY_AUTOMATED_SWEEP" | "WEEKLY" | "MANUAL";
  max_cashier_drawer_limit: number;
  escrow_available_balance: number;
  escrow_pending_balance: number;
  currency: string;
  is_verified: boolean;
  last_payout_at: string;
}

interface CorporateDebtor {
  id: string;
  company_name: string;
  account_code: string;
  account_type: "PRIVATE_HMO" | "CORPORATE_EMPLOYER" | "EMBASSY_NGO";
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  current_outstanding_debt: number;
  available_credit: number;
  payment_terms_days: number;
  discount_pct: number;
  status: "ACTIVE" | "ON_HOLD" | "SUSPENDED";
  last_payment_date?: string;
  last_statement_generated_at?: string;
}

interface ShiftAudit {
  shift_id: string;
  cashier_name: string;
  cashier_email: string;
  terminal_id: string;
  opened_at: string;
  closed_at: string;
  opening_float: number;
  system_expected_cash: number;
  cashier_declared_cash: number;
  cash_discrepancy_amount: number;
  discrepancy_status: "BALANCED" | "OVERAGE" | "SHORTAGE";
  momo_collected_amount: number;
  insurance_co_pay_billed: number;
  total_shift_sales: number;
  supervisor_signed_off: boolean;
  supervisor_name: string;
  notes: string;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_PRICING: PricingRules = {
  pom_markup_pct: 25.0,
  otc_markup_pct: 35.0,
  surgicals_markup_pct: 40.0,
  supplements_markup_pct: 30.0,
  controlled_markup_pct: 20.0,
  vat_tax_rate_pct: 15.0,
  enable_vat_on_receipts: true,
  max_cashier_discount_pct: 10.0,
  enable_prescriber_loyalty_split: false,
  rounding_mode: "NEAREST_10_PESEWAS",
  currency: "GHS",
};

const INITIAL_GATEWAY: PharmacyGateway = {
  facility_id: "pharm-osu-01",
  facility_name: "",
  gateway_mode: "PLATFORM_ESCROW",
  primary_gateway: "PAYSTACK",
  subaccount_code: "ACCT_sub_osu99120",
  payout_network: "MTN_MOMO",
  payout_account_number: "0244556677",
  payout_account_name: "",
  payout_bank_code: "GH_GCB_01",
  enable_ussd_push: true,
  allow_split_tender: true,
  fee_bearer: "MERCHANT",
  auto_payout_schedule: "DAILY_AUTOMATED_SWEEP",
  max_cashier_drawer_limit: 5000.0,
  escrow_available_balance: 18450.0,
  escrow_pending_balance: 3200.0,
  currency: "GHS",
  is_verified: true,
  last_payout_at: "21 Aug 2026, 06:00 UTC",
};

const INITIAL_DEBTORS: CorporateDebtor[] = [
  {
    id: "debtor-001",
    company_name: "Acacia Health Insurance Ltd",
    account_code: "HMO-ACACIA-PH",
    account_type: "PRIVATE_HMO",
    contact_person: "Kwame Mensah (Pharmacy Claims Desk)",
    contact_email: "pharmacy.claims@acacia.com.gh",
    contact_phone: "+233 30 277 8899",
    credit_limit: 80000.0,
    current_outstanding_debt: 24150.0,
    available_credit: 55850.0,
    payment_terms_days: 30,
    discount_pct: 5.0,
    status: "ACTIVE",
    last_payment_date: "12 Aug 2026",
    last_statement_generated_at: "15 Aug 2026",
  },
  {
    id: "debtor-002",
    company_name: "Enterprise Life & Health Assurance",
    account_code: "HMO-ENTERPRISE-PH",
    account_type: "PRIVATE_HMO",
    contact_person: "Abena Poku",
    contact_email: "rx.claims@enterprisegroup.com.gh",
    contact_phone: "+233 30 266 4422",
    credit_limit: 120000.0,
    current_outstanding_debt: 48900.0,
    available_credit: 71100.0,
    payment_terms_days: 45,
    discount_pct: 7.5,
    status: "ACTIVE",
    last_payment_date: "05 Aug 2026",
    last_statement_generated_at: "01 Aug 2026",
  },
  {
    id: "debtor-003",
    company_name: "Tullow Oil Ghana Staff Medical Scheme",
    account_code: "CORP-TULLOW-01",
    account_type: "CORPORATE_EMPLOYER",
    contact_person: "Staff Wellness Coordinator",
    contact_email: "ghana.wellness@tullowoil.com",
    contact_phone: "+233 24 990 1122",
    credit_limit: 60000.0,
    current_outstanding_debt: 8350.0,
    available_credit: 51650.0,
    payment_terms_days: 30,
    discount_pct: 0.0,
    status: "ACTIVE",
    last_payment_date: "18 Aug 2026",
    last_statement_generated_at: "10 Aug 2026",
  },
];

const INITIAL_SHIFTS: ShiftAudit[] = [
  {
    shift_id: "SHF-PHARM-20260821-MORN",
    cashier_name: "",
    cashier_email: "",
    terminal_id: "POS-DISP-01",
    opened_at: "21 Aug 2026, 08:00 GMT",
    closed_at: "21 Aug 2026, 16:00 GMT",
    opening_float: 250.0,
    system_expected_cash: 3840.0,
    cashier_declared_cash: 3840.0,
    cash_discrepancy_amount: 0.0,
    discrepancy_status: "BALANCED",
    momo_collected_amount: 11200.0,
    insurance_co_pay_billed: 5400.0,
    total_shift_sales: 20440.0,
    supervisor_signed_off: true,
    supervisor_name: "Dr. Esi Boateng, PharmD",
    notes: "Till balanced with zero variance. Vault safe drop completed.",
  },
  {
    shift_id: "SHF-PHARM-20260820-EVNG",
    cashier_name: "",
    cashier_email: "",
    terminal_id: "POS-DISP-02",
    opened_at: "20 Aug 2026, 16:00 GMT",
    closed_at: "20 Aug 2026, 22:00 GMT",
    opening_float: 200.0,
    system_expected_cash: 2150.0,
    cashier_declared_cash: 2155.0,
    cash_discrepancy_amount: 5.0,
    discrepancy_status: "OVERAGE",
    momo_collected_amount: 7300.0,
    insurance_co_pay_billed: 2800.0,
    total_shift_sales: 12255.0,
    supervisor_signed_off: true,
    supervisor_name: "Dr. Esi Boateng, PharmD",
    notes: "Minor +GHS 5.00 overage credited to miscellaneous cashier variance.",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PharmacyBillingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"PRICING" | "GATEWAYS" | "DEBTORS" | "TILLS">("PRICING");
  const [pricingRules, setPricingRules] = useState<PricingRules>(INITIAL_PRICING);
  const [gatewayConfig, setGatewayConfig] = useState<PharmacyGateway>(INITIAL_GATEWAY);
  const [debtors, setDebtors] = useState<CorporateDebtor[]>(INITIAL_DEBTORS);
  const [shifts, setShifts] = useState<ShiftAudit[]>(INITIAL_SHIFTS);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Payout Test & Instant Payout State
  const [isTestingPayout, setIsTestingPayout] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("5000.00");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Batch Pricing Modal State
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  // Corporate Debtor Modals
  const [isDebtorModalOpen, setIsDebtorModalOpen] = useState(false);
  const [debtorForm, setDebtorForm] = useState<Partial<CorporateDebtor>>({
    company_name: "",
    account_code: "",
    account_type: "PRIVATE_HMO",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    credit_limit: 50000.0,
    payment_terms_days: 30,
    discount_pct: 0.0,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("5000.00");

  // Handlers
  const handleSavePricing = () => {
    showToast("Pharmacy pricing rules and markup margins updated successfully!");
  };

  const handleApplyBatchPricing = () => {
    setIsApplyingBatch(true);
    setTimeout(() => {
      setIsApplyingBatch(false);
      showToast("Dynamic markups applied across 142 active batch inventory lines!");
    }, 1200);
  };

  const handleTestPayoutPing = () => {
    setIsTestingPayout(true);
    setTimeout(() => {
      setIsTestingPayout(false);
      const latency = Math.floor(Math.random() * 30 + 40);
      setGatewayConfig((prev) => ({
        ...prev,
        is_verified: true,
        last_payout_at: "Just now",
      }));
      showToast(`Settlement ping verified with ${gatewayConfig.payout_network}! Latency: ${latency}ms.`);
    }, 1000);
  };

  const handleExecuteInstantPayout = () => {
    const amt = parseFloat(payoutAmount) || 0;
    if (amt <= 0 || amt > gatewayConfig.escrow_available_balance) {
      alert("Invalid payout amount.");
      return;
    }

    setIsProcessingPayout(true);
    setTimeout(() => {
      setIsProcessingPayout(false);
      setGatewayConfig((prev) => ({
        ...prev,
        escrow_available_balance: prev.escrow_available_balance - amt,
        last_payout_at: "Just now",
      }));
      showToast(`Instant MoMo Payout of GHS ${amt.toLocaleString()} dispatched to ${gatewayConfig.payout_account_number}!`);
      setIsPayoutModalOpen(false);
    }, 1500);
  };

  const handleSaveDebtor = () => {
    if (!debtorForm.company_name || !debtorForm.account_code) {
      alert("Please enter company name and account code.");
      return;
    }
    const newDebtor: CorporateDebtor = {
      ...debtorForm,
      id: `debtor-${Date.now()}`,
      current_outstanding_debt: 0.0,
      available_credit: Number(debtorForm.credit_limit) || 50000.0,
      status: "ACTIVE",
      last_payment_date: "None",
    } as CorporateDebtor;
    setDebtors((prev) => [newDebtor, ...prev]);
    showToast(`Corporate HMO account '${newDebtor.company_name}' registered.`);
    setIsDebtorModalOpen(false);
  };

  const handleRecordPayment = () => {
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0 || !selectedDebtorId) return;

    setDebtors((prev) =>
      prev.map((d) => {
        if (d.id === selectedDebtorId) {
          const newDebt = Math.max(0, d.current_outstanding_debt - amt);
          const newAvail = Math.max(0, d.credit_limit - newDebt);
          return {
            ...d,
            current_outstanding_debt: newDebt,
            available_credit: newAvail,
            last_payment_date: "Just now",
          };
        }
        return d;
      })
    );
    showToast(`Payment of GHS ${amt.toLocaleString()} credited to debtor ledger.`);
    setIsPaymentModalOpen(false);
  };

  return (
    <div className="space-y-8 text-slate-100 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-teal-950 border border-teal-800 text-teal-200 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Zap className="h-5 w-5 text-teal-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Pharmacy Commercial &amp; Settlement Suite
            </h1>
            <Badge variant="teal" className="bg-teal-950 text-teal-300 border-teal-800 text-xs">
              Pharmacy Council Accredited
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Configure dynamic category profit margins, MoMo settlement sweeps, corporate HMO credit accounts, and till float limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsPayoutModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-900/30 flex items-center gap-2"
          >
            <ArrowUpRight className="h-4 w-4" /> Request MoMo Payout
          </Button>
        </div>
      </div>

      {/* Escrow Pool Quick Banner */}
      <div className="p-4 rounded-3xl bg-linear-to-r from-teal-950/80 via-slate-900 to-slate-900 border border-teal-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider font-bold">
              Available Payout Escrow Pool
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                GHS {gatewayConfig.escrow_available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400">
                (+GHS {gatewayConfig.escrow_pending_balance.toLocaleString()} pending clearance)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase">Payout Rails:</span>
            <p className="font-bold text-teal-300">{gatewayConfig.payout_network} &bull; {gatewayConfig.payout_account_number}</p>
          </div>
          <Button
            onClick={handleTestPayoutPing}
            isLoading={isTestingPayout}
            variant="outline"
            className="border-teal-700 text-teal-300 hover:bg-teal-950 text-xs py-2"
          >
            Ping Destination
          </Button>
        </div>
      </div>

      {/* 4-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("PRICING")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "PRICING"
              ? "bg-teal-950 text-teal-300 border border-teal-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Percent className="h-4 w-4 text-teal-400" />
          <span>Dynamic Markups &amp; Pricing Rules</span>
        </button>

        <button
          onClick={() => setActiveTab("GATEWAYS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "GATEWAYS"
              ? "bg-teal-950 text-teal-300 border border-teal-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <CreditCard className="h-4 w-4 text-teal-400" />
          <span>Payment Gateways &amp; MoMo Payouts</span>
        </button>

        <button
          onClick={() => setActiveTab("DEBTORS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "DEBTORS"
              ? "bg-teal-950 text-teal-300 border border-teal-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4 text-teal-400" />
          <span>Corporate Debtors &amp; Insurance Co-Pay</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-900/60 font-mono">
            {debtors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("TILLS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "TILLS"
              ? "bg-teal-950 text-teal-300 border border-teal-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Receipt className="h-4 w-4 text-teal-400" />
          <span>Till Float &amp; Safe Drop Policy</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DYNAMIC MARKUPS & PRICING RULES */}
      {/* ===================================================================== */}
      {activeTab === "PRICING" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Markup Sliders */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-teal-400" />
                  <h3 className="font-black text-white text-base">Category Profit Margins</h3>
                </div>
                <Badge variant="teal" className="text-[10px]">Active Auto-Markup</Badge>
              </div>

              <div className="space-y-4 text-xs">
                {/* POM */}
                <div>
                  <div className="flex justify-between mb-1.5 font-bold">
                    <span className="text-slate-300">Prescription Only Medicines (POM)</span>
                    <span className="text-teal-400 font-mono font-black">{pricingRules.pom_markup_pct}% Markup</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={pricingRules.pom_markup_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, pom_markup_pct: parseFloat(e.target.value) })}
                    className="w-full accent-teal-500 bg-slate-800 rounded-lg h-2"
                  />
                  <span className="text-[10px] text-slate-500">Retail Price = Cost &times; {(1 + pricingRules.pom_markup_pct / 100).toFixed(2)}</span>
                </div>

                {/* OTC */}
                <div>
                  <div className="flex justify-between mb-1.5 font-bold">
                    <span className="text-slate-300">Over-the-Counter Drugs (OTC)</span>
                    <span className="text-teal-400 font-mono font-black">{pricingRules.otc_markup_pct}% Markup</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={pricingRules.otc_markup_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, otc_markup_pct: parseFloat(e.target.value) })}
                    className="w-full accent-teal-500 bg-slate-800 rounded-lg h-2"
                  />
                </div>

                {/* Surgicals */}
                <div>
                  <div className="flex justify-between mb-1.5 font-bold">
                    <span className="text-slate-300">Surgical Consumables &amp; Devices</span>
                    <span className="text-teal-400 font-mono font-black">{pricingRules.surgicals_markup_pct}% Markup</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={pricingRules.surgicals_markup_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, surgicals_markup_pct: parseFloat(e.target.value) })}
                    className="w-full accent-teal-500 bg-slate-800 rounded-lg h-2"
                  />
                </div>

                {/* Supplements */}
                <div>
                  <div className="flex justify-between mb-1.5 font-bold">
                    <span className="text-slate-300">Vitamins &amp; Dietary Supplements</span>
                    <span className="text-teal-400 font-mono font-black">{pricingRules.supplements_markup_pct}% Markup</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={pricingRules.supplements_markup_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, supplements_markup_pct: parseFloat(e.target.value) })}
                    className="w-full accent-teal-500 bg-slate-800 rounded-lg h-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <Button
                  onClick={handleApplyBatchPricing}
                  isLoading={isApplyingBatch}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Recalculate Active Batch Prices
                </Button>
                <Button onClick={handleSavePricing} variant="outline" className="text-xs border-slate-700">
                  Save Margins
                </Button>
              </div>
            </div>

            {/* Tax, VAT & Cashier Discount Policies */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-teal-400" />
                  <h3 className="font-black text-white text-base">Tax, VAT &amp; Discount Controls</h3>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Statutory VAT / NHIL / GETFund Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingRules.vat_tax_rate_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, vat_tax_rate_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Maximum Cashier Discretionary Discount (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={pricingRules.max_cashier_discount_pct}
                    onChange={(e) => setPricingRules({ ...pricingRules, max_cashier_discount_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Discounts above this limit require Superintendent PIN override</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Price Rounding Mode</label>
                  <select
                    value={pricingRules.rounding_mode}
                    onChange={(e) => setPricingRules({ ...pricingRules, rounding_mode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  >
                    <option value="NEAREST_10_PESEWAS">Round to nearest 0.10 GHS (Recommended for Cashier Speed)</option>
                    <option value="EXACT">Exact 2-Decimal Precision (No rounding)</option>
                    <option value="ROUND_UP">Ceiling Round-Up to 0.50 GHS</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingRules.enable_vat_on_receipts}
                      onChange={(e) => setPricingRules({ ...pricingRules, enable_vat_on_receipts: e.target.checked })}
                      className="accent-teal-500 rounded"
                    />
                    <span className="font-bold text-white">Itemize VAT / GRA Tax breakdown on 80mm Thermal Receipts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingRules.enable_prescriber_loyalty_split}
                      onChange={(e) => setPricingRules({ ...pricingRules, enable_prescriber_loyalty_split: e.target.checked })}
                      className="accent-teal-500 rounded"
                    />
                    <span>Track Prescriber Physician Attribution for Institutional Rebates</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PAYMENT GATEWAYS & MOMO PAYOUTS */}
      {/* ===================================================================== */}
      {activeTab === "GATEWAYS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gateway Configuration Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-teal-400" />
                  <h3 className="font-black text-white text-base">Pharmacy Gateway &amp; USSD Controls</h3>
                </div>
                <Badge variant="teal" className="text-[10px] font-mono">
                  {gatewayConfig.primary_gateway} LIVE
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Payment Gateway Mode</label>
                  <select
                    value={gatewayConfig.gateway_mode}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, gateway_mode: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="PLATFORM_ESCROW">Platform Central Escrow (Instant Net Settlements)</option>
                    <option value="DIRECT_SUBACCOUNT">Direct Subaccount Split (Paystack Direct)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Transaction Fee Bearer</label>
                  <select
                    value={gatewayConfig.fee_bearer}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, fee_bearer: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="MERCHANT">Pharmacy Absorbs Fee (No surcharge on prescription checkout)</option>
                    <option value="PATIENT">Patient Pays Fee (Surcharged at POS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Settlement Sweep Frequency</label>
                  <select
                    value={gatewayConfig.auto_payout_schedule}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, auto_payout_schedule: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="DAILY_AUTOMATED_SWEEP">Daily Automated Sweep (06:00 UTC to verified MoMo)</option>
                    <option value="WEEKLY">Weekly Batch Sweep (Mondays)</option>
                    <option value="MANUAL">Manual Trigger Only</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.enable_ussd_push}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, enable_ussd_push: e.target.checked })}
                      className="accent-teal-500 rounded"
                    />
                    <span className="font-bold text-white">Enable Instant USSD Push Prompts to Customer Phones</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Merchant Settlement Payout Form */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-teal-400" />
                    <h3 className="font-black text-white text-base">Verified Merchant Payout Destination</h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> VERIFIED
                  </span>
                </div>

                <div className="space-y-3 text-xs mt-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Payout Telco / Bank</label>
                    <select
                      value={gatewayConfig.payout_network}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_network: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                    >
                      <option value="MTN_MOMO">MTN Mobile Money (Ghana GHS)</option>
                      <option value="TELECEL_CASH">Telecel Cash (Ghana GHS)</option>
                      <option value="TMONEY_TOGO">T-Money (Togo XOF)</option>
                      <option value="MOOV_TOGO">Moov Money (Togo XOF)</option>
                      <option value="MTN_BENIN">MTN MoMo (Bénin XOF)</option>
                      <option value="BANK_TRANSFER">Commercial Bank Direct Wire (GCB / Ecobank)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Account / MoMo Number</label>
                      <input
                        type="text"
                        value={gatewayConfig.payout_account_number}
                        onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_account_number: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Account Holder Name</label>
                      <input
                        type="text"
                        value={gatewayConfig.payout_account_name}
                        onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_account_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Last payout: {gatewayConfig.last_payout_at}
                </span>
                <Button
                  onClick={handleTestPayoutPing}
                  isLoading={isTestingPayout}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 px-4 rounded-xl"
                >
                  Test Payout Ping
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CORPORATE DEBTORS & INSURANCE CO-PAY */}
      {/* ===================================================================== */}
      {activeTab === "DEBTORS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white">Private HMO &amp; Corporate Credit Lines</h3>
              <p className="text-xs text-slate-400">
                Track credit limits, outstanding Rx billing balances, and process debt repayments.
              </p>
            </div>
            <Button
              onClick={() => setIsDebtorModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Corporate Client
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {debtors.map((d) => (
              <div
                key={d.id}
                className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-teal-400">{d.account_code}</span>
                    <Badge variant="teal" className="text-[10px]">
                      {d.status}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-white text-base">{d.company_name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{d.contact_person} &bull; {d.contact_phone}</p>

                  <div className="my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credit Limit:</span>
                      <strong className="text-white">GHS {d.credit_limit.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Billed Balance:</span>
                      <strong className="text-amber-400">GHS {d.current_outstanding_debt.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available:</span>
                      <strong className="text-emerald-400">GHS {d.available_credit.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedDebtorId(d.id);
                      setIsPaymentModalOpen(true);
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" /> Repayment
                  </button>
                  <button
                    onClick={() => showToast(`Statement of Account generated for '${d.company_name}'.`)}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Statement
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: TILL FLOAT & SAFE DROP POLICY */}
      {/* ===================================================================== */}
      {activeTab === "TILLS" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Safe Drop Rule Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-400" />
                  <span>Cash Drawer Limit &amp; Mandatory Safe Drop Policy</span>
                </h3>
                <p className="text-xs text-slate-400">
                  When physical cash exceeds this threshold, the dispensary POS prompts the cashier for a mandatory safe vault drop.
                </p>
              </div>
              <Badge variant="teal" className="text-xs font-mono font-bold">
                Threshold: GHS {gatewayConfig.max_cashier_drawer_limit.toLocaleString()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Drawer Cash Limit</span>
                <p className="text-xl font-black text-white">GHS 5,000.00</p>
                <span className="text-[10px] text-slate-400">Triggers Superintendent vault transfer alert</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Standard Shift Float</span>
                <p className="text-xl font-black text-teal-300">GHS 250.00</p>
                <span className="text-[10px] text-slate-400">Issued at dispensary shift start</span>
              </div>
            </div>
          </div>

          {/* Cashier Shift Audit Log Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Dispensary POS Shift Reconciliation Logs</h3>
              <span className="text-xs text-slate-400 font-mono">{shifts.length} Shift Logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Shift &amp; Cashier</th>
                    <th className="py-3 px-4">Expected Cash</th>
                    <th className="py-3 px-4">Declared Cash</th>
                    <th className="py-3 px-4">Discrepancy</th>
                    <th className="py-3 px-4">MoMo Collections</th>
                    <th className="py-3 px-4">Total Sales</th>
                    <th className="py-3 px-4">Sign-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {shifts.map((shf) => (
                    <tr key={shf.shift_id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white">{shf.cashier_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{shf.terminal_id} &bull; {shf.closed_at}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <p className="text-white">GHS {shf.system_expected_cash.toFixed(2)}</p>
                        <span className="text-[10px] text-slate-500">Float: GHS {shf.opening_float.toFixed(2)}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        GHS {shf.cashier_declared_cash.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        {shf.discrepancy_status === "BALANCED" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                            0.00 Balanced
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                            +{shf.cash_discrepancy_amount.toFixed(2)} Overage
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-teal-300 font-bold">
                        GHS {shf.momo_collected_amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-white">
                        GHS {shf.total_shift_sales.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Signed Off
                        </span>
                        <p className="text-[10px] text-slate-500">{shf.supervisor_name}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: REQUEST INSTANT PAYOUT */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Request Instant MoMo Payout"
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Available Payout Pool</span>
            <p className="text-xl font-black text-white font-mono">
              GHS {gatewayConfig.escrow_available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-teal-400">Destination: {gatewayConfig.payout_network} ({gatewayConfig.payout_account_number})</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Payout Amount (GHS)</label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="e.g. 5000.00"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleExecuteInstantPayout}
              isLoading={isProcessingPayout}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Confirm Instant Sweep
            </Button>
            <Button
              onClick={() => setIsPayoutModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: ADD CORPORATE CLIENT */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isDebtorModalOpen}
        onClose={() => setIsDebtorModalOpen(false)}
        title="Register Corporate Client / HMO Insurer"
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Company Name</label>
              <input
                type="text"
                value={debtorForm.company_name || ""}
                onChange={(e) => setDebtorForm({ ...debtorForm, company_name: e.target.value })}
                placeholder="e.g. Glico Healthcare Ltd"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Account Code</label>
              <input
                type="text"
                value={debtorForm.account_code || ""}
                onChange={(e) => setDebtorForm({ ...debtorForm, account_code: e.target.value })}
                placeholder="e.g. HMO-GLICO-01"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Credit Limit (GHS)</label>
              <input
                type="number"
                value={debtorForm.credit_limit || 0}
                onChange={(e) => setDebtorForm({ ...debtorForm, credit_limit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Payment Terms (Days)</label>
              <input
                type="number"
                value={debtorForm.payment_terms_days || 30}
                onChange={(e) => setDebtorForm({ ...debtorForm, payment_terms_days: parseInt(e.target.value, 10) || 30 })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Contact Person</label>
              <input
                type="text"
                value={debtorForm.contact_person || ""}
                onChange={(e) => setDebtorForm({ ...debtorForm, contact_person: e.target.value })}
                placeholder="Claims Desk Lead"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Contact Email</label>
              <input
                type="email"
                value={debtorForm.contact_email || ""}
                onChange={(e) => setDebtorForm({ ...debtorForm, contact_email: e.target.value })}
                placeholder="claims@insurer.com"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSaveDebtor}
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Register Corporate Account
            </Button>
            <Button
              onClick={() => setIsDebtorModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: RECORD DEBT REPAYMENT */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Debtor Debt Repayment"
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Repayment Amount (GHS)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="e.g. 5000.00"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleRecordPayment}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Credit Account Ledger
            </Button>
            <Button
              onClick={() => setIsPaymentModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
