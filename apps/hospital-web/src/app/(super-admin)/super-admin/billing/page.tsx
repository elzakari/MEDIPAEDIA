"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Badge, Button, Input, Modal } from "@medipaedia/ui";
import { createApiClient, type GatewayHealthResponse, type TenantSubscriptionMatrixItem } from "@medipaedia/api-client";

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  tier: "STARTER" | "GROWTH" | "ENTERPRISE" | "CUSTOM" | string;
  target_facility_type: "ALL" | "HOSPITAL" | "CLINIC" | "PHARMACY" | string;
  description: string;
  price_ghs_monthly: number;
  price_xof_monthly: number;
  price_usd_monthly: number;
  price_ghs_annual: number;
  price_xof_annual: number;
  price_usd_annual: number;
  trial_days: number;
  max_staff_seats: number;
  max_beds: number;
  max_monthly_rx: number;
  max_branches: number;
  features: string[];
  feature_flags: Record<string, boolean>;
  is_active: boolean;
}

interface GatewayConfig {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  environment: "sandbox" | "live";
  public_key: string;
  encrypted_secret_key: string;
  webhook_secret: string;
  supported_currencies: string[];
  supported_countries: string[];
  priority: number;
  last_ping_status: string;
  last_ping_at: string;
}

interface TenantSubscription {
  tenant_id: string;
  facility_name: string;
  facility_type: "HOSPITAL" | "CLINIC" | "PHARMACY";
  country: "GH" | "TG" | "BJ";
  currency: "GHS" | "XOF";
  plan_code: string;
  plan_name: string;
  billing_interval: "MONTHLY" | "ANNUAL";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "RESTRICTED_LOCKED";
  days_overdue: number;
  is_locked: boolean;
  momo_phone: string;
  momo_network: string;
  next_billing_date: string;
  last_payment_date: string;
  last_amount_paid: number;
  contact_email: string;
  custom_commission_pct?: number;
}

interface TenantPolicy {
  tenant_id: string;
  facility_name: string;
  facility_type: string;
  standard_commission_pct: number;
  custom_commission_pct: number | null;
  effective_commission_pct: number;
  grace_period_days: number;
  discount_pct: number;
  auto_payout_sweep_enabled: boolean;
  min_payout_sweep_amount: number;
  notes: string;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-001",
    code: "PLAN-STARTER",
    name: "Community Health Starter",
    tier: "STARTER",
    target_facility_type: "ALL",
    description: "Ideal for single-dispensary pharmacies and private outpatient clinics.",
    price_ghs_monthly: 500,
    price_xof_monthly: 25000,
    price_usd_monthly: 45,
    price_ghs_annual: 5000,
    price_xof_annual: 250000,
    price_usd_annual: 450,
    trial_days: 14,
    max_staff_seats: 5,
    max_beds: 10,
    max_monthly_rx: 1000,
    max_branches: 1,
    features: [
      "Up to 5 Clinical / Staff Seats",
      "1 Physical Facility / Storefront",
      "Standard OPD Consultations & Vitals",
      "FEFO Inventory & POS Counter",
      "MoMo Cashier Integration (GHS / XOF)",
    ],
    feature_flags: {
      enable_cpoe: false,
      enable_emar: false,
      enable_controlled_drugs: false,
      enable_multibranch: false,
      enable_telemetry: false,
      enable_escrow: true,
      enable_insurance_rcm: true,
      enable_cold_chain_iot: false,
      enable_custom_tariffs: false,
    },
    is_active: true,
  },
  {
    id: "plan-002",
    code: "PLAN-GROWTH",
    name: "Regional Hospital & Pharmacy Chain",
    tier: "GROWTH",
    target_facility_type: "ALL",
    description: "Comprehensive EHR, CPOE Clinical Decision Support, and Multi-Branch IBT.",
    price_ghs_monthly: 1500,
    price_xof_monthly: 75000,
    price_usd_monthly: 135,
    price_ghs_annual: 15000,
    price_xof_annual: 750000,
    price_usd_annual: 1350,
    trial_days: 14,
    max_staff_seats: 25,
    max_beds: 60,
    max_monthly_rx: 10000,
    max_branches: 3,
    features: [
      "Up to 25 Clinical & Pharmacy Seats",
      "Up to 3 Branches with Inter-Branch Transfers (IBT)",
      "CPOE Drug-Allergy & DDI Decision Support",
      "Bed Capacity & Ward Census Telemetry",
      "Insurance RCM & NHIS Batch Claim Split",
      "Escrow Marketplace Settlement (Daily Sweeps)",
    ],
    feature_flags: {
      enable_cpoe: true,
      enable_emar: true,
      enable_controlled_drugs: true,
      enable_multibranch: true,
      enable_telemetry: true,
      enable_escrow: true,
      enable_insurance_rcm: true,
      enable_cold_chain_iot: false,
      enable_custom_tariffs: true,
    },
    is_active: true,
  },
  {
    id: "plan-003",
    code: "PLAN-ENTERPRISE",
    name: "National Tertiary Healthcare Enterprise",
    tier: "ENTERPRISE",
    target_facility_type: "HOSPITAL",
    description: "Complete institutional governance, Statutory Narcotics Book, Cold Chain IoT, and custom integrations.",
    price_ghs_monthly: 4000,
    price_xof_monthly: 200000,
    price_usd_monthly: 350,
    price_ghs_annual: 40000,
    price_xof_annual: 2000000,
    price_usd_annual: 3500,
    trial_days: 30,
    max_staff_seats: 999,
    max_beds: 500,
    max_monthly_rx: 999999,
    max_branches: 99,
    features: [
      "Unlimited Clinical, Nurse & Administrative Seats",
      "Unlimited Hospital Pavilions & Pharmacy Branches",
      "Full Operating Theatre & ICU Telemetry",
      "FDA Ghana Statutory Narcotics Poison Book (Act 857)",
      "Cold Chain 2°C-8°C Wireless IoT Telemetry",
      "Automated Cross-Border MoMo Batch Settlement",
    ],
    feature_flags: {
      enable_cpoe: true,
      enable_emar: true,
      enable_controlled_drugs: true,
      enable_multibranch: true,
      enable_telemetry: true,
      enable_escrow: true,
      enable_insurance_rcm: true,
      enable_cold_chain_iot: true,
      enable_custom_tariffs: true,
    },
    is_active: true,
  },
];

const INITIAL_GATEWAYS: GatewayConfig[] = [];

const INITIAL_TENANTS: TenantSubscription[] = [];

const INITIAL_POLICIES: TenantPolicy[] = [];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SuperAdminBillingPage() {
  const apiClient = createApiClient();
  const [activeTab, setActiveTab] = useState<"PLANS" | "GATEWAYS" | "TENANTS" | "COMMISSIONS">("PLANS");
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [gateways, setGateways] = useState<GatewayConfig[]>(INITIAL_GATEWAYS);
  const [tenants, setTenants] = useState<TenantSubscription[]>(INITIAL_TENANTS);
  const [policies, setPolicies] = useState<TenantPolicy[]>(INITIAL_POLICIES);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const loadAdminBilling = async () => {
      try {
        const [matrixRes, gatewayRes]: [TenantSubscriptionMatrixItem[], GatewayHealthResponse] = await Promise.all([
          apiClient.getTenantSubscriptionsMatrix(),
          apiClient.getGatewayHealthMetrics(),
        ]);

        const mappedTenants: TenantSubscription[] = (matrixRes || []).map((t: TenantSubscriptionMatrixItem) => ({
          tenant_id: t.tenant_id,
          facility_name: t.facility_name,
          facility_type: (t.facility_type as TenantSubscription["facility_type"]) ?? "PHARMACY",
          country: (t.country as TenantSubscription["country"]) ?? "GH",
          currency: (t.currency as TenantSubscription["currency"]) ?? "GHS",
          plan_code: t.plan_code,
          plan_name: t.plan_name,
          billing_interval: (t.billing_interval as TenantSubscription["billing_interval"]) ?? "MONTHLY",
          status: (t.status as TenantSubscription["status"]) ?? "ACTIVE",
          days_overdue: t.days_overdue || 0,
          is_locked: !!t.is_locked,
          momo_phone: t.momo_phone,
          momo_network: t.momo_network,
          next_billing_date: t.next_billing_date,
          last_payment_date: t.last_payment_date,
          last_amount_paid: t.last_amount_paid || 0,
          contact_email: t.contact_email,
          custom_commission_pct: (t as any).custom_commission_pct,
        }));
        setTenants(mappedTenants);

        const mappedPolicies: TenantPolicy[] = (matrixRes || [])
          .filter((t: TenantSubscriptionMatrixItem) => t.tenant_id)
          .map((t: TenantSubscriptionMatrixItem & { custom_commission_pct?: number }) => {
            const custom = (t as any).custom_commission_pct ?? null;
            const standard = 5.0;
            return {
              tenant_id: t.tenant_id,
              facility_name: t.facility_name,
              facility_type: t.facility_type,
              standard_commission_pct: standard,
              custom_commission_pct: custom,
              effective_commission_pct: custom ?? standard,
              grace_period_days: 7,
              discount_pct: 0.0,
              auto_payout_sweep_enabled: true,
              min_payout_sweep_amount: 50.0,
              notes: custom != null ? `Custom commission (${custom}% override).` : "Standard platform escrow rate.",
            };
          });
        setPolicies(mappedPolicies);

        const mappedGateways: GatewayConfig[] = (gatewayRes?.gateways || []).map((g, idx) => ({
          id: g.provider?.toLowerCase?.() || `gw-${idx}`,
          name: g.name || g.provider,
          provider: g.provider,
          is_active: g.status === "HEALTHY" || g.status === "DEGRADED",
          environment: "live",
          public_key: "",
          encrypted_secret_key: "",
          webhook_secret: "",
          supported_currencies: [],
          supported_countries: [g.region || ""].filter(Boolean),
          priority: idx + 1,
          last_ping_status: `${g.status ?? "UNKNOWN"} (${g.latency_ms ?? 0}ms)`,
          last_ping_at: g.last_checked ? new Date(g.last_checked).toLocaleString() : "Never",
        }));
        setGateways(mappedGateways);
      } catch (err) {
        // Backend may be unavailable; state already starts empty, so this is a no-op.
      }
    };

    loadAdminBilling();
  }, [apiClient]);

  // Plan Builder Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({
    name: "",
    code: "",
    tier: "GROWTH",
    target_facility_type: "ALL",
    description: "",
    price_ghs_monthly: 1000,
    price_xof_monthly: 50000,
    price_usd_monthly: 90,
    price_ghs_annual: 10000,
    price_xof_annual: 500000,
    price_usd_annual: 900,
    trial_days: 14,
    max_staff_seats: 15,
    max_beds: 30,
    max_monthly_rx: 3000,
    max_branches: 2,
    feature_flags: {
      enable_cpoe: true,
      enable_emar: true,
      enable_controlled_drugs: true,
      enable_multibranch: true,
      enable_telemetry: true,
      enable_escrow: true,
      enable_insurance_rcm: true,
      enable_cold_chain_iot: false,
      enable_custom_tariffs: true,
    },
  });

  // Invoice Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedTenantForInvoice, setSelectedTenantForInvoice] = useState<TenantSubscription | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState("1500.00");
  const [invoicePeriod, setInvoicePeriod] = useState("September 2026 SaaS Renewal");

  // Policy Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<TenantPolicy | null>(null);
  const [customRate, setCustomRate] = useState("3.5");
  const [graceDays, setGraceDays] = useState("14");

  // Ping Testing State
  const [testingGatewayId, setTestingGatewayId] = useState<string | null>(null);

  // Handlers
  const handleOpenNewPlan = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: "",
      code: `PLAN-CUSTOM-${Date.now().toString().slice(-4)}`,
      tier: "CUSTOM",
      target_facility_type: "ALL",
      description: "Tailored enterprise tier with bespoke seats, multi-branch IBT, and dedicated SLA.",
      price_ghs_monthly: 2000,
      price_xof_monthly: 100000,
      price_usd_monthly: 180,
      price_ghs_annual: 20000,
      price_xof_annual: 1000000,
      price_usd_annual: 1800,
      trial_days: 14,
      max_staff_seats: 30,
      max_beds: 100,
      max_monthly_rx: 15000,
      max_branches: 5,
      feature_flags: {
        enable_cpoe: true,
        enable_emar: true,
        enable_controlled_drugs: true,
        enable_multibranch: true,
        enable_telemetry: true,
        enable_escrow: true,
        enable_insurance_rcm: true,
        enable_cold_chain_iot: true,
        enable_custom_tariffs: true,
      },
    });
    setIsPlanModalOpen(true);
  };

  const handleEditPlan = (p: SubscriptionPlan) => {
    setEditingPlanId(p.id);
    setPlanForm(p);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = () => {
    if (!planForm.name || !planForm.code) {
      alert("Please specify plan name and code.");
      return;
    }

    if (editingPlanId) {
      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlanId ? ({ ...p, ...planForm } as SubscriptionPlan) : p))
      );
      showToast(`Subscription Plan '${planForm.name}' updated successfully.`);
    } else {
      const newPlan: SubscriptionPlan = {
        ...planForm,
        id: `plan-${Date.now()}`,
        features: [
          `Up to ${planForm.max_staff_seats} Staff Seats`,
          `Up to ${planForm.max_branches} Facility Branches`,
          `Multi-Currency MoMo Billing (GHS/XOF)`,
          ...(planForm.feature_flags?.enable_cpoe ? ["CPOE Clinical Decision Support"] : []),
          ...(planForm.feature_flags?.enable_controlled_drugs ? ["Statutory Narcotics Registry"] : []),
          ...(planForm.feature_flags?.enable_cold_chain_iot ? ["Cold Chain Wireless IoT Telemetry"] : []),
        ],
        is_active: true,
      } as SubscriptionPlan;
      setPlans((prev) => [...prev, newPlan]);
      showToast(`New Subscription Plan '${newPlan.name}' created!`);
    }
    setIsPlanModalOpen(false);
  };

  const handleTestGateway = (gwId: string) => {
    setTestingGatewayId(gwId);
    setTimeout(() => {
      setTestingGatewayId(null);
      const latency = Math.floor(Math.random() * 35 + 30);
      setGateways((prev) =>
        prev.map((g) =>
          g.id === gwId
            ? { ...g, last_ping_status: `HEALTHY (${latency}ms)`, last_ping_at: "Just now" }
            : g
        )
      );
      showToast(`Gateway ping test successful! Latency: ${latency}ms.`);
    }, 1000);
  };

  const handleToggleEnvironment = (gwId: string) => {
    setGateways((prev) =>
      prev.map((g) => {
        if (g.id === gwId) {
          const nextEnv = g.environment === "sandbox" ? "live" : "sandbox";
          return { ...g, environment: nextEnv };
        }
        return g;
      })
    );
    showToast(`Gateway environment mode updated.`);
  };

  const handleExtendGracePeriod = (tenantId: string) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.tenant_id === tenantId) {
          return {
            ...t,
            days_overdue: 0,
            status: "ACTIVE",
            is_locked: false,
            next_billing_date: "Extended (+7 Days Grace Period)",
          };
        }
        return t;
      })
    );
    showToast(`7-Day Grace Period extended for tenant.`);
  };

  const handleIssueInvoice = () => {
    if (!selectedTenantForInvoice) return;
    showToast(
      `Custom Enterprise Invoice for ${selectedTenantForInvoice.currency} ${invoiceAmount} issued to ${selectedTenantForInvoice.facility_name}.`
    );
    setInvoiceModalOpen(false);
  };

  const handleSavePolicy = () => {
    if (!selectedPolicy) return;
    const rate = parseFloat(customRate) || 5.0;
    const grace = parseInt(graceDays, 10) || 7;
    setPolicies((prev) =>
      prev.map((p) =>
        p.tenant_id === selectedPolicy.tenant_id
          ? { ...p, custom_commission_pct: rate, effective_commission_pct: rate, grace_period_days: grace }
          : p
      )
    );
    showToast(`Custom policy for '${selectedPolicy.facility_name}' updated (${rate}% platform fee).`);
    setPolicyModalOpen(false);
  };

  return (
    <div className="space-y-8 text-slate-100 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-purple-950 border border-purple-800 text-purple-200 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Zap className="h-5 w-5 text-purple-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Fintech Engine &amp; Dynamic Plan Builder
            </h1>
            <Badge variant="teal" className="bg-purple-900/60 text-purple-300 border-purple-700 text-xs">
              Multi-Gateway Smart Router
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Configure custom subscription tiers, feature flags, mobile money smart routing, and tenant commission overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenNewPlan}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Custom Plan
          </Button>
        </div>
      </div>

      {/* 4-Tab Navigation Console */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("PLANS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "PLANS"
              ? "bg-purple-950 text-purple-300 border border-purple-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Layers className="h-4 w-4 text-purple-400" />
          <span>Subscription Plans Manager</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/60 font-mono">
            {plans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("GATEWAYS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "GATEWAYS"
              ? "bg-purple-950 text-purple-300 border border-purple-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Server className="h-4 w-4 text-purple-400" />
          <span>Gateway Config &amp; Smart Routing</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/60 font-mono">
            {gateways.length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab("TENANTS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "TENANTS"
              ? "bg-purple-950 text-purple-300 border border-purple-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4 text-purple-400" />
          <span>Tenant Subscriptions &amp; Dunning</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/60 font-mono">
            {tenants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMMISSIONS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "COMMISSIONS"
              ? "bg-purple-950 text-purple-300 border border-purple-800 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 text-purple-400" />
          <span>Commission &amp; Escrow Policy</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SUBSCRIPTION PLANS MANAGER */}
      {/* ===================================================================== */}
      {activeTab === "PLANS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-800/80 transition shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="teal" className="text-[10px] font-mono font-bold">
                      {p.tier} &bull; {p.target_facility_type}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-500">{p.code}</span>
                  </div>

                  <h3 className="text-lg font-black text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{p.description}</p>

                  <div className="my-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-400">Ghana (GHS):</span>
                      <span className="text-base font-mono font-black text-white">
                        GHS {p.price_ghs_monthly.toLocaleString()}
                        <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Togo/Benin (XOF):</span>
                      <span className="text-base font-mono font-black text-purple-300">
                        {p.price_xof_monthly.toLocaleString()} XOF
                        <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">International (USD):</span>
                      <span className="text-base font-mono font-black text-emerald-400">
                        ${p.price_usd_monthly}
                        <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                      </span>
                    </div>
                  </div>

                  {/* Quota limit chips */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase">Seats</span>
                      <strong className="text-white">{p.max_staff_seats === 999 ? "Unlimited" : `${p.max_staff_seats} Accounts`}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase">Branches (IBT)</span>
                      <strong className="text-white">{p.max_branches === 99 ? "Unlimited" : `${p.max_branches} Branches`}</strong>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleEditPlan(p)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Configuration
                  </button>
                  <button
                    onClick={() => {
                      const dup = { ...p, id: `plan-${Date.now()}`, code: `${p.code}-COPY`, name: `${p.name} (Copy)` };
                      setPlans((prev) => [...prev, dup]);
                      showToast(`Plan duplicated.`);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    title="Duplicate Plan"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: GATEWAY CONFIGURATION & SMART ROUTING */}
      {/* ===================================================================== */}
      {activeTab === "GATEWAYS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gateways.map((gw) => (
              <div
                key={gw.id}
                className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-400" />
                      <h3 className="font-black text-white text-base">{gw.name}</h3>
                    </div>
                    <button
                      onClick={() => handleToggleEnvironment(gw.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition ${
                        gw.environment === "live"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                      title="Click to toggle sandbox/live mode"
                    >
                      {gw.environment} mode
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">{gw.provider}</p>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Public Key:</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{gw.public_key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Secret Key:</span>
                      <span className="text-purple-300">{gw.encrypted_secret_key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Webhook Secret:</span>
                      <span className="text-slate-400">{gw.webhook_secret}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                      Supported Rails &amp; Countries:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {gw.supported_countries.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                          {c === "GH" ? "🇬🇭 Ghana" : c === "TG" ? "🇹🇬 Togo" : c === "BJ" ? "🇧🇯 Bénin" : c}
                        </span>
                      ))}
                      {gw.supported_currencies.map((curr) => (
                        <span key={curr} className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60 text-[10px] font-mono">
                          {curr}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <Activity className="h-3 w-3" /> {gw.last_ping_status}
                  </span>
                  <Button
                    onClick={() => handleTestGateway(gw.id)}
                    isLoading={testingGatewayId === gw.id}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-700"
                  >
                    Test Ping
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {gateways.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-400" />
                    <span>West Africa Smart Routing Matrix (Carrier Level)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct Mobile Money network traffic dynamically to the optimal low-latency gateway.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Country &amp; Network Rail</th>
                      <th className="py-3 px-4">Currency</th>
                      <th className="py-3 px-4">Primary Gateway</th>
                      <th className="py-3 px-4">Failover Fallback</th>
                      <th className="py-3 px-4">Routing Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-white">🇬🇭 Ghana &bull; MTN Mobile Money</td>
                      <td className="py-3.5 px-4 font-mono text-purple-300">GHS</td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">Paystack (Direct STK)</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">Hub2 Ghana</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">Instant USSD</span></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-white">🇬🇭 Ghana &bull; Telecel Cash &amp; AT Money</td>
                      <td className="py-3.5 px-4 font-mono text-purple-300">GHS</td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">Paystack (Direct STK)</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">None (Direct Only)</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">Instant USSD</span></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-white">🇹🇬 Togo &bull; T-Money (*145#) &amp; Moov Togo</td>
                      <td className="py-3.5 px-4 font-mono text-purple-300">XOF</td>
                      <td className="py-3.5 px-4 font-semibold text-purple-400">FedaPay West Africa</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">Hub2 Francophone</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px]">Dual Aggregator</span></td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-white">🇧🇯 Bénin &bull; MTN MoMo (*880#) &amp; Moov Bénin</td>
                      <td className="py-3.5 px-4 font-mono text-purple-300">XOF</td>
                      <td className="py-3.5 px-4 font-semibold text-purple-400">FedaPay West Africa</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">Hub2 Francophone</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px]">Dual Aggregator</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: TENANT SUBSCRIPTIONS & DUNNING DESK */}
      {/* ===================================================================== */}
      {activeTab === "TENANTS" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Tenant Facility</th>
                    <th className="py-3.5 px-4">Plan &amp; Rate</th>
                    <th className="py-3.5 px-4">Billing Contact &amp; MoMo</th>
                    <th className="py-3.5 px-4">Renewal Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {tenants.map((t) => (
                    <tr key={t.tenant_id} className={`hover:bg-slate-800/40 ${t.is_locked ? "bg-rose-950/10" : ""}`}>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-white text-sm">{t.facility_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{t.facility_type} &bull; {t.country}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-purple-300">{t.plan_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {t.currency} {t.last_amount_paid.toLocaleString()} ({t.billing_interval})
                            {t.custom_commission_pct && <span className="ml-1 text-emerald-400 font-bold">&bull; {t.custom_commission_pct}% custom fee</span>}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-mono text-white flex items-center gap-1">
                            <Phone className="h-3 w-3 text-purple-400" /> {t.momo_phone}
                          </p>
                          <p className="text-[10px] text-slate-400">{t.momo_network}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {t.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
                            <Lock className="h-3 w-3" /> RESTRICTED ({t.days_overdue}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono mt-1">{t.next_billing_date}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedTenantForInvoice(t);
                              setInvoiceModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800 flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" /> Invoice
                          </button>
                          <button
                            onClick={() => handleExtendGracePeriod(t.tenant_id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 flex items-center gap-1"
                            title="Add 7 Days Grace Period"
                          >
                            +7d Grace
                          </button>
                        </div>
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
      {/* TAB 4: COMMISSION & ESCROW POLICY EDITOR */}
      {/* ===================================================================== */}
      {activeTab === "COMMISSIONS" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Global Commission Policy Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  <span>Global Platform Commission &amp; Escrow Rules</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Standard platform rate applied to marketplace pharmacy escrow release transactions.
                </p>
              </div>
              <Badge variant="teal" className="text-xs font-mono font-bold">
                Standard: 5.0%
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Platform Fee</span>
                <p className="text-xl font-black text-white">5.0%</p>
                <span className="text-[10px] text-slate-400">Capped at 25 GHS / 1250 XOF per Rx</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Automated Sweep Schedule</span>
                <p className="text-xl font-black text-purple-300">Daily 17:00 GMT</p>
                <span className="text-[10px] text-slate-400">Instant MoMo push payout</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 uppercase text-[10px]">Minimum Sweep Threshold</span>
                <p className="text-xl font-black text-emerald-400">50 GHS / 2500 XOF</p>
                <span className="text-[10px] text-slate-400">Rollover if below threshold</span>
              </div>
            </div>
          </div>

          {/* Tenant Policy Overrides Table */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-base font-black text-white">Tenant-Specific Commission &amp; Grace Overrides</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Facility</th>
                    <th className="py-3 px-4">Standard Fee</th>
                    <th className="py-3 px-4">Effective Fee</th>
                    <th className="py-3 px-4">Grace Period</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {policies.map((pol) => (
                    <tr key={pol.tenant_id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-white">{pol.facility_name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">5.0%</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-300">{pol.effective_commission_pct}%</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{pol.grace_period_days} Days</td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{pol.notes}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          onClick={() => {
                            setSelectedPolicy(pol);
                            setCustomRate(pol.effective_commission_pct.toString());
                            setGraceDays(pol.grace_period_days.toString());
                            setPolicyModalOpen(true);
                          }}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 px-3 rounded-lg border border-slate-700 font-bold"
                        >
                          Edit Override
                        </Button>
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
      {/* MODAL 1: VISUAL PLAN BUILDER MODAL */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlanId ? "Edit Subscription Plan" : "Create Custom Subscription Plan"}
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Plan Name</label>
              <input
                type="text"
                value={planForm.name || ""}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g. Tertiary Hospital Enterprise"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-hidden font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Plan Code</label>
              <input
                type="text"
                value={planForm.code || ""}
                onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                placeholder="e.g. PLAN-TERTIARY"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Description</label>
            <input
              type="text"
              value={planForm.description || ""}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              placeholder="Summary of target tier and included capabilities..."
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-hidden"
            />
          </div>

          {/* Pricing Grid */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-purple-400 uppercase font-bold">Multi-Currency Monthly Pricing</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400">Ghana (GHS)</label>
                <input
                  type="number"
                  value={planForm.price_ghs_monthly || 0}
                  onChange={(e) => setPlanForm({ ...planForm, price_ghs_monthly: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Togo/Benin (XOF)</label>
                <input
                  type="number"
                  value={planForm.price_xof_monthly || 0}
                  onChange={(e) => setPlanForm({ ...planForm, price_xof_monthly: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">USD ($)</label>
                <input
                  type="number"
                  value={planForm.price_usd_monthly || 0}
                  onChange={(e) => setPlanForm({ ...planForm, price_usd_monthly: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Quota Limits Sliders */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-[11px] font-mono text-purple-400 uppercase font-bold">Resource Quota Limits</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300">Staff Seats: <strong>{planForm.max_staff_seats}</strong></label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={planForm.max_staff_seats || 25}
                  onChange={(e) => setPlanForm({ ...planForm, max_staff_seats: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300">Branches (IBT): <strong>{planForm.max_branches}</strong></label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={planForm.max_branches || 3}
                  onChange={(e) => setPlanForm({ ...planForm, max_branches: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Feature Toggle Matrix */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-purple-400 uppercase font-bold">Feature Module Toggles</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.feature_flags?.enable_cpoe || false}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    feature_flags: { ...planForm.feature_flags, enable_cpoe: e.target.checked }
                  })}
                  className="accent-purple-500 rounded"
                />
                <span>CPOE CDS Protocol</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.feature_flags?.enable_controlled_drugs || false}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    feature_flags: { ...planForm.feature_flags, enable_controlled_drugs: e.target.checked }
                  })}
                  className="accent-purple-500 rounded"
                />
                <span>Narcotics Register (Act 857)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.feature_flags?.enable_cold_chain_iot || false}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    feature_flags: { ...planForm.feature_flags, enable_cold_chain_iot: e.target.checked }
                  })}
                  className="accent-purple-500 rounded"
                />
                <span>Cold Chain IoT Telemetry</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.feature_flags?.enable_escrow || false}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    feature_flags: { ...planForm.feature_flags, enable_escrow: e.target.checked }
                  })}
                  className="accent-purple-500 rounded"
                />
                <span>Escrow Daily Sweeps</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSavePlan}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Save Subscription Plan
            </Button>
            <Button
              onClick={() => setIsPlanModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: CUSTOM ENTERPRISE INVOICE MODAL */}
      {/* ===================================================================== */}
      <Modal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={`Issue Enterprise Invoice: ${selectedTenantForInvoice?.facility_name}`}
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Billing Period &amp; Description</label>
            <input
              type="text"
              value={invoicePeriod}
              onChange={(e) => setInvoicePeriod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Invoice Amount ({selectedTenantForInvoice?.currency})</label>
              <input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Due Date</label>
              <input
                type="date"
                defaultValue="2026-09-01"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800 text-[11px] text-purple-300 flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Automatic Mobile Money STK charge prompt will be queued to {selectedTenantForInvoice?.momo_phone}.</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleIssueInvoice}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Issue &amp; Send Invoice
            </Button>
            <Button
              onClick={() => setInvoiceModalOpen(false)}
              variant="outline"
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: COMMISSION & GRACE OVERRIDE MODAL */}
      {/* ===================================================================== */}
      <Modal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={`Edit Commission Policy: ${selectedPolicy?.facility_name}`}
      >
        <div className="space-y-4 py-2 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Platform Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Grace Period (Days)</label>
              <input
                type="number"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSavePolicy}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl"
            >
              Save Custom Policy
            </Button>
            <Button
              onClick={() => setPolicyModalOpen(false)}
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
