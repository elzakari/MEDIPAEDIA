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
} from "lucide-react";
import { Badge, Button, Input, Modal, Toast, ToastProps } from "@medipaedia/ui";
import { useAuth } from "@/context/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

interface ServiceTariff {
  id: string;
  service_code: string;
  name: string;
  category: "REGISTRATION" | "CONSULTATION" | "LABORATORY" | "WARD_STAY" | "PROCEDURE" | string;
  department: string;
  base_price: number;
  currency: string;
  nhis_covered: boolean;
  nhis_tariff_amount: number;
  patient_copay: number;
  is_emergency_waiver_eligible: boolean;
  is_active: boolean;
}

interface FacilityGateway {
  facility_id: string | null;
  facility_name: string | null;
  gateway_mode: "PLATFORM_ESCROW" | "DIRECT_SUBACCOUNT";
  primary_gateway: "PAYSTACK" | "FEDAPAY" | string | null;
  subaccount_code: string | null;
  payout_network: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  payout_bank_code: string | null;
  enable_ussd_push: boolean;
  allow_split_tender: boolean;
  fee_bearer: "PATIENT" | "HOSPITAL";
  max_cashier_drawer_limit: number;
  auto_payout_schedule: "DAILY" | "WEEKLY" | "MANUAL";
  is_verified: boolean;
  last_tested_at: string | null;
}

interface CorporateDebtor {
  id: string;
  account_name: string;
  account_code: string;
  account_type: "PRIVATE_INSURANCE_HMO" | "CORPORATE_EMPLOYER" | "EMBASSY_NGO";
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  payment_terms_days: number;
  discount_pct: number;
  status: "ACTIVE" | "ON_HOLD" | "SUSPENDED";
  last_invoice_date: string;
}

interface CashierShiftAudit {
  shift_id: string;
  cashier_name: string;
  cashier_email: string;
  opened_at: string;
  closed_at: string;
  opening_float: number;
  system_cash_expected: number;
  cashier_declared_cash: number;
  discrepancy_amount: number;
  discrepancy_type: "BALANCED" | "OVERAGE" | "SHORTAGE";
  momo_collected: number;
  insurance_billed: number;
  total_revenue: number;
  supervisor_signed_off: boolean;
  supervisor_name: string;
  supervisor_notes: string;
}

// ============================================================================
// INITIAL DATA (Empty defaults — newly onboarded facilities start clean)
// ============================================================================

const INITIAL_SERVICES: ServiceTariff[] = [];

const INITIAL_GATEWAY: FacilityGateway = {
  facility_id: null,
  facility_name: null,
  gateway_mode: "PLATFORM_ESCROW",
  primary_gateway: null,
  subaccount_code: null,
  payout_network: null,
  payout_account_number: null,
  payout_account_name: null,
  payout_bank_code: null,
  enable_ussd_push: false,
  allow_split_tender: false,
  fee_bearer: "HOSPITAL",
  max_cashier_drawer_limit: 0.0,
  auto_payout_schedule: "MANUAL",
  is_verified: false,
  last_tested_at: null,
};

const INITIAL_DEBTORS: CorporateDebtor[] = [];

const INITIAL_SHIFTS: CashierShiftAudit[] = [];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HospitalBillingSettingsPage() {
  const { tenant } = useAuth();
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [activeTab, setActiveTab] = useState<"TARIFFS" | "GATEWAYS" | "DEBTORS" | "TILLS">("TARIFFS");
  const [services, setServices] = useState<ServiceTariff[]>(INITIAL_SERVICES);
  const [gatewayConfig, setGatewayConfig] = useState<FacilityGateway>(INITIAL_GATEWAY);
  const [debtors, setDebtors] = useState<CorporateDebtor[]>(INITIAL_DEBTORS);
  const [shifts, setShifts] = useState<CashierShiftAudit[]>(INITIAL_SHIFTS);

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<ServiceTariff>>({
    name: "",
    service_code: "",
    category: "CONSULTATION",
    department: "General OPD",
    base_price: 60.0,
    currency: "GHS",
    nhis_covered: true,
    nhis_tariff_amount: 50.0,
    patient_copay: 10.0,
    is_emergency_waiver_eligible: false,
    is_active: true,
  });

  // Bulk Price Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState("5.0");

  // Payout Test State
  const [isTestingPayout, setIsTestingPayout] = useState(false);

  // Corporate Modal State
  const [isDebtorModalOpen, setIsDebtorModalOpen] = useState(false);
  const [debtorForm, setDebtorForm] = useState<Partial<CorporateDebtor>>({
    account_name: "",
    account_code: "",
    account_type: "PRIVATE_INSURANCE_HMO",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    credit_limit: 50000.0,
    payment_terms_days: 30,
    discount_pct: 0.0,
    status: "ACTIVE",
  });

  // Handlers
  const handleOpenNewService = () => {
    setEditingServiceId(null);
    setServiceForm({
      name: "",
      service_code: `SRV-LAB-${Date.now().toString().slice(-4)}`,
      category: "LABORATORY",
      department: "Clinical Laboratory",
      base_price: 50.0,
      currency: "GHS",
      nhis_covered: true,
      nhis_tariff_amount: 40.0,
      patient_copay: 10.0,
      is_emergency_waiver_eligible: false,
      is_active: true,
    });
    setIsServiceModalOpen(true);
  };

  const handleEditService = (s: ServiceTariff) => {
    setEditingServiceId(s.id);
    setServiceForm(s);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name || !serviceForm.service_code) {
      alert("Please provide service name and code.");
      return;
    }
    const base = Number(serviceForm.base_price) || 0;
    const nhis = serviceForm.nhis_covered ? Number(serviceForm.nhis_tariff_amount) || 0 : 0;
    const copay = Math.max(0, base - nhis);

    if (editingServiceId) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingServiceId
            ? ({ ...s, ...serviceForm, base_price: base, nhis_tariff_amount: nhis, patient_copay: copay } as ServiceTariff)
            : s
        )
      );
      showToast(`Tariff '${serviceForm.name}' updated.`);
    } else {
      const newSrv: ServiceTariff = {
        ...serviceForm,
        id: `srv-${Date.now()}`,
        base_price: base,
        nhis_tariff_amount: nhis,
        patient_copay: copay,
        is_active: true,
      } as ServiceTariff;
      setServices((prev) => [newSrv, ...prev]);
      showToast(`New service tariff '${newSrv.name}' added!`);
    }
    setIsServiceModalOpen(false);
  };

  const handleBulkAdjustment = () => {
    const pct = parseFloat(bulkPercent) || 0;
    const factor = 1 + pct / 100;
    setServices((prev) =>
      prev.map((s) => {
        if (categoryFilter === "ALL" || s.category === categoryFilter) {
          const newBase = Math.round(s.base_price * factor);
          const copay = s.nhis_covered ? Math.max(0, newBase - s.nhis_tariff_amount) : newBase;
          return { ...s, base_price: newBase, patient_copay: copay };
        }
        return s;
      })
    );
    showToast(`Applied ${pct > 0 ? "+" : ""}${pct}% price adjustment across catalog.`);
    setIsBulkModalOpen(false);
  };

  const handleTestPayoutPing = () => {
    setIsTestingPayout(true);
    setTimeout(() => {
      setIsTestingPayout(false);
      const latency = Math.floor(Math.random() * 30 + 40);
      setGatewayConfig((prev) => ({
        ...prev,
        is_verified: true,
        last_tested_at: "Just now",
      }));
      showToast(`Payout connection verified! Ping latency: ${latency}ms.`);
    }, 1000);
  };

  const handleSaveDebtor = () => {
    if (!debtorForm.account_name || !debtorForm.account_code) {
      alert("Please provide account name and code.");
      return;
    }
    const newDebtor: CorporateDebtor = {
      ...debtorForm,
      id: `corp-${Date.now()}`,
      current_balance: 0.0,
      available_credit: Number(debtorForm.credit_limit) || 50000.0,
      last_invoice_date: "None",
      status: "ACTIVE",
    } as CorporateDebtor;
    setDebtors((prev) => [newDebtor, ...prev]);
    showToast(`Corporate Debtor account '${newDebtor.account_name}' created.`);
    setIsDebtorModalOpen(false);
  };

  const filteredServices = services.filter((s) =>
    categoryFilter === "ALL" ? true : s.category === categoryFilter
  );

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
              Hospital Billing, Tariffs &amp; Cashier Till Suite
            </h1>
            <Badge variant="teal" className="bg-teal-950 text-teal-300 border-teal-800 text-xs">
              MOH &amp; NHIS Accredited
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Configure clinical service tariff schedules, payment gateway payout destinations, corporate HMO accounts, and cashier till float policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenNewService}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-teal-900/30 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Service Tariff
          </Button>
        </div>
      </div>

      {/* 4-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("TARIFFS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "TARIFFS"
              ? "bg-teal-950 text-teal-300 border border-teal-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Layers className="h-4 w-4 text-teal-400" />
          <span>Service Tariff Master</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-900/60 font-mono">
            {services.length}
          </span>
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
          <span>Corporate &amp; Insurance Debtors</span>
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
          <span>Cashier Till &amp; Float Policies</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SERVICE TARIFF MASTER */}
      {/* ===================================================================== */}
      {activeTab === "TARIFFS" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Category Filter & Bulk Price Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "REGISTRATION", "CONSULTATION", "LABORATORY", "WARD_STAY", "PROCEDURE"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    categoryFilter === cat
                      ? "bg-teal-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat.replace("_", " ")}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
            >
              <Percent className="h-3.5 w-3.5 text-teal-400" /> Bulk Price Adjustment
            </Button>
          </div>

          {/* Tariffs Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Service &amp; Code</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Base Price</th>
                    <th className="py-3.5 px-4">NHIS Coverage</th>
                    <th className="py-3.5 px-4">Patient Co-Pay</th>
                    <th className="py-3.5 px-4">Emergency Waiver</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 px-8">
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-300 mb-2">
                            No service tariffs configured yet
                          </p>
                          <p className="text-xs text-slate-500 max-w-xl mx-auto">
                            Define clinical service pricing (registrations, consultations, lab panels,
                            ward stays, and surgical procedures) with statutory NHIS tariff splits before
                            going live with patient billing.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-white text-sm">{s.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{s.service_code} &bull; {s.category}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{s.department}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {s.currency} {s.base_price.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          {s.nhis_covered ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-bold">
                              <CheckCircle2 className="h-3 w-3" /> {s.currency} {s.nhis_tariff_amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">Not Covered</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                          {s.currency} {s.patient_copay.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          {s.is_emergency_waiver_eligible ? (
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-900">
                              Auto-Waiver
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleEditService(s)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 ml-auto"
                          >
                            <Edit className="h-3.5 w-3.5 text-teal-400" /> Edit Tariff
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PATIENT PAYMENT GATEWAYS & MOMO PAYOUTS */}
      {/* ===================================================================== */}
      {activeTab === "GATEWAYS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gateway Configuration Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-teal-400" />
                  <h3 className="font-black text-white text-base">Facility Gateway Routing</h3>
                </div>
                <Badge variant="teal" className="text-[10px] font-mono">
                  {gatewayConfig.primary_gateway ? `${gatewayConfig.primary_gateway} LIVE` : "NOT YET CONFIGURED"}
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
                    <option value="DIRECT_SUBACCOUNT">Direct Bank/MoMo Subaccount (Paystack Split Code)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Transaction Fee Bearer</label>
                  <select
                    value={gatewayConfig.fee_bearer}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, fee_bearer: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="HOSPITAL">Hospital Absorbs Fee (No surcharge to patients)</option>
                    <option value="PATIENT">Patient Pays Fee (Surcharged at Checkout)</option>
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
                    <span className="font-bold text-white">Enable Instant USSD Push Prompts to Patient Phones</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.allow_split_tender}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, allow_split_tender: e.target.checked })}
                      className="accent-teal-500 rounded"
                    />
                    <span>Allow Cashier Split Tender (Partial Cash + Partial MoMo)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* MoMo / Bank Payout Account Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-teal-400" />
                    <h3 className="font-black text-white text-base">Facility Settlement Payout Destination</h3>
                  </div>
                  {gatewayConfig.is_verified ? (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> UNVERIFIED
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs mt-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Settlement Telco / Bank</label>
                    <select
                      value={gatewayConfig.payout_network || "MTN_MOMO"}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_network: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                    >
                      <option value="MTN_MOMO">MTN Mobile Money (Ghana GHS)</option>
                      <option value="TELECEL_CASH">Telecel Cash (Ghana GHS)</option>
                      <option value="TMONEY_TOGO">T-Money (Togo XOF)</option>
                      <option value="MTN_BENIN">MTN MoMo (Bénin XOF)</option>
                      <option value="BANK_TRANSFER">Commercial Bank Direct Wire (GCB / Ecobank)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Account / MoMo Number</label>
                      <input
                        type="text"
                        value={gatewayConfig.payout_account_number || ""}
                        onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_account_number: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Account Holder Name</label>
                      <input
                        type="text"
                        value={gatewayConfig.payout_account_name || ""}
                        onChange={(e) => setGatewayConfig({ ...gatewayConfig, payout_account_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Last verified: {gatewayConfig.last_tested_at || "Never"}
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
      {/* TAB 3: CORPORATE & INSURANCE DEBTORS */}
      {/* ===================================================================== */}
      {activeTab === "DEBTORS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white">Private HMO &amp; Corporate Credit Lines</h3>
              <p className="text-xs text-slate-400">
                Track credit limits, outstanding invoice balances, and net payment terms.
              </p>
            </div>
            <Button
              onClick={() => setIsDebtorModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Corporate Account
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {debtors.length === 0 ? (
              <div className="col-span-3 p-12 rounded-3xl bg-slate-900/90 border border-slate-800">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-300 mb-2">
                    No corporate debtors or HMO accounts configured
                  </p>
                  <p className="text-xs text-slate-500 max-w-xl mx-auto">
                    Add private insurance HMOs, corporate employer medical schemes, and embassy/NGO
                    credit-line accounts to track third-party receivables and payment terms.
                  </p>
                </div>
              </div>
            ) :
              debtors.map((d) => (
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
                  <h4 className="font-bold text-white text-base">{d.account_name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{d.contact_person} &bull; {d.contact_phone}</p>

                  <div className="my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credit Limit:</span>
                      <strong className="text-white">GHS {d.credit_limit.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Billed Balance:</span>
                      <strong className="text-amber-400">GHS {d.current_balance.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available:</span>
                      <strong className="text-emerald-400">GHS {d.available_credit.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">Terms: Net {d.payment_terms_days}d</span>
                  <button
                    onClick={() => showToast(`Statement of Account generated for '${d.account_name}'.`)}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Statement
                  </button>
                </div>
              </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CASHIER TILL & FLOAT POLICIES */}
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
                  When physical cash exceeds this threshold, the cashier POS displays a mandatory vault drop alert.
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
                <span className="text-[10px] text-slate-400">Triggers supervisor vault drop sign-off</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Standard Shift Float</span>
                <p className="text-xl font-black text-teal-300">GHS 300.00</p>
                <span className="text-[10px] text-slate-400">Issued at shift handover</span>
              </div>
            </div>
          </div>

          {/* Cashier Shift Audit Log Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Cashier Shift Reconciliation Audit Trail</h3>
              <span className="text-xs text-slate-400 font-mono">{shifts.length} Shift Logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Shift ID &amp; Cashier</th>
                    <th className="py-3 px-4">Float &amp; Expected</th>
                    <th className="py-3 px-4">Declared Cash</th>
                    <th className="py-3 px-4">Discrepancy</th>
                    <th className="py-3 px-4">MoMo Revenue</th>
                    <th className="py-3 px-4">Total Revenue</th>
                    <th className="py-3 px-4">Supervisor Sign-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 px-8">
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-300 mb-2">
                            No cashier shift reconciliation logs yet
                          </p>
                          <p className="text-xs text-slate-500 max-w-xl mx-auto">
                            Shift audit trails (opening float, declared cash, drawer variance,
                            and supervisor sign-off) will appear here once cashiers begin
                            processing patient payments and closing till sessions.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shf) => (
                      <tr key={shf.shift_id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-white">{shf.cashier_name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{shf.shift_id} &bull; {shf.closed_at}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <p className="text-white">GHS {shf.system_cash_expected.toFixed(2)}</p>
                          <span className="text-[10px] text-slate-500">Float: GHS {shf.opening_float.toFixed(2)}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          GHS {shf.cashier_declared_cash.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          {shf.discrepancy_type === "BALANCED" ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                              0.00 Balanced
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                              +{shf.discrepancy_amount.toFixed(2)} Overage
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-teal-300 font-bold">
                          GHS {shf.momo_collected.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-white">
                          GHS {shf.total_revenue.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Signed Off
                          </span>
                          <p className="text-[10px] text-slate-500">{shf.supervisor_name}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT SERVICE TARIFF */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingServiceId ? "Edit Clinical Service Tariff" : "Add New Clinical Service Tariff"}
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Service Name</label>
              <input
                type="text"
                value={serviceForm.name || ""}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="e.g. Ultrasound Scan (Pelvic / Abdomen)"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Service Code</label>
              <input
                type="text"
                value={serviceForm.service_code || ""}
                onChange={(e) => setServiceForm({ ...serviceForm, service_code: e.target.value })}
                placeholder="e.g. SRV-RAD-US01"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Category</label>
              <select
                value={serviceForm.category || "CONSULTATION"}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
              >
                <option value="REGISTRATION">Registration</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="LABORATORY">Laboratory</option>
                <option value="WARD_STAY">Ward Stay</option>
                <option value="PROCEDURE">Procedure / Surgery</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Department</label>
              <input
                type="text"
                value={serviceForm.department || ""}
                onChange={(e) => setServiceForm({ ...serviceForm, department: e.target.value })}
                placeholder="e.g. Radiology / OPD"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Base Price (GHS)</label>
              <input
                type="number"
                value={serviceForm.base_price || 0}
                onChange={(e) => setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">NHIS Tariff (GHS)</label>
              <input
                type="number"
                value={serviceForm.nhis_tariff_amount || 0}
                onChange={(e) => setServiceForm({ ...serviceForm, nhis_tariff_amount: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Patient Co-Pay</label>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 font-mono font-bold">
                GHS {Math.max(0, (serviceForm.base_price || 0) - (serviceForm.nhis_tariff_amount || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={serviceForm.nhis_covered || false}
                onChange={(e) => setServiceForm({ ...serviceForm, nhis_covered: e.target.checked })}
                className="accent-teal-500 rounded"
              />
              <span className="font-bold text-white">NHIS Accredited / Claim Reimbursable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={serviceForm.is_emergency_waiver_eligible || false}
                onChange={(e) => setServiceForm({ ...serviceForm, is_emergency_waiver_eligible: e.target.checked })}
                className="accent-teal-500 rounded"
              />
              <span>Eligible for Emergency Trauma Auto-Waiver</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSaveService}
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Save Tariff Schedule
            </Button>
            <Button
              onClick={() => setIsServiceModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: BULK PRICE ADJUSTMENT */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Tariff Margin Adjustment"
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <p className="text-slate-400">
            Apply a uniform percentage adjustment across <strong>{categoryFilter === "ALL" ? "All Services" : categoryFilter}</strong>.
          </p>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Percentage Adjustment (%)</label>
            <input
              type="number"
              step="0.5"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              placeholder="e.g. 5.0 for +5% inflation revision"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base"
            />
          </div>

          <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800 text-[11px] text-teal-300">
            Co-pay balances for NHIS covered services will automatically re-calculate based on statutory tariff ceilings.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleBulkAdjustment}
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Apply Adjustment
            </Button>
            <Button
              onClick={() => setIsBulkModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: ADD CORPORATE ACCOUNT */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isDebtorModalOpen}
        onClose={() => setIsDebtorModalOpen(false)}
        title="Create Corporate Debtor / HMO Credit Line"
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Organization Name</label>
              <input
                type="text"
                value={debtorForm.account_name || ""}
                onChange={(e) => setDebtorForm({ ...debtorForm, account_name: e.target.value })}
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
                placeholder="Claims Manager Name"
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
              Save Corporate Account
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
    </div>
  );
}
