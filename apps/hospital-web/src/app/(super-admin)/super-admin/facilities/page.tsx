"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  DollarSign,
  Copy,
  Check,
  Sparkles,
  Clock,
  Settings2,
  Users2,
  UserPlus,
  KeyRound,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Mail,
  Activity,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
  Toast,
  ToastProps,
  NotificationModal,
} from "@medipaedia/ui";
import {
  createApiClient,
  type Tenant,
  type PendingFacilityItem,
  type CompanyInvitationResponse,
  type TenantStaffItem,
  type UpdateFacilityPayload,
  type CreateTenantStaffPayload,
  type GenerateResetLinkResult,
  type FacilityRoleLiteral,
} from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

export default function SuperAdminFacilitiesPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [tenantType, setTenantType] = useState<"HOSPITAL" | "CLINIC" | "PHARMACY">("HOSPITAL");
  const [country, setCountry] = useState("Ghana");
  const [currency, setCurrency] = useState("GHS");
  const [assignedPlanCode, setAssignedPlanCode] = useState("PLAN-GROWTH");
  const [successModalData, setSuccessModalData] = useState<CompanyInvitationResponse | null>(null);

  const [invitations, setInvitations] = useState<CompanyInvitationResponse[]>([]);
  const [facilities, setFacilities] = useState<Tenant[]>([]);
  const [pendingFacilities, setPendingFacilities] = useState<PendingFacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==== Manage Drawer State ====
  const [manageDrawerOpen, setManageDrawerOpen] = useState(false);
  const [managedFacility, setManagedFacility] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "staff" | "security">("profile");
  const [facilityForm, setFacilityForm] = useState<{
    name: string;
    tier: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    country: string;
    currency: string;
    status: "ACTIVE" | "RESTRICTED";
  }>({
    name: "",
    tier: "PROFESSIONAL",
    country: "Ghana",
    currency: "GHS",
    status: "ACTIVE",
  });
  const [savingFacility, setSavingFacility] = useState(false);

  // Staff roster state (shared Tab B & C)
  const [staff, setStaff] = useState<TenantStaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  // Add New Staff form
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffLicense, setNewStaffLicense] = useState("");
  const [newStaffRoles, setNewStaffRoles] = useState<FacilityRoleLiteral[]>([]);
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Reset link per user (Tab C)
  const [resetLinks, setResetLinks] = useState<Record<string, GenerateResetLinkResult>>({});
  const [generatingReset, setGeneratingReset] = useState<Record<string, boolean>>({});
  // Override password per user (Tab C)
  const [overrideOpen, setOverrideOpen] = useState<Record<string, boolean>>({});
  const [overridePw, setOverridePw] = useState<Record<string, string>>({});
  const [overridePw2, setOverridePw2] = useState<Record<string, string>>({});
  const [overrideSubmitting, setOverrideSubmitting] = useState<Record<string, boolean>>({});
  const [overrideShowPw, setOverrideShowPw] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenants, pending, invs] = await Promise.all([
        apiClient.getTenants(),
        apiClient.getPendingTenants(),
        apiClient.getCompanyInvitations(),
      ]);
      setFacilities(tenants as any[]);
      setPendingFacilities(pending as any[]);
      setInvitations(invs);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.createCompanyInvitation({
        company_name: companyName,
        admin_email: adminEmail,
        tenant_type: tenantType,
        country,
        currency,
        assigned_plan_code: assignedPlanCode,
      });

      setInviteModalOpen(false);
      setSuccessModalData(res);
      setToast({
        type: "success",
        title: t("common.invitationGenerated"),
        message: `${t("common.magicLinkIssued")} ${res.company_name}.`,
        actionUrl: res.onboarding_url,
        actionLabel: t("common.copyLink"),
      });

      setCompanyName("");
      setAdminEmail("");
      loadData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        t("common.invitationError");
      setToast({
        type: "error",
        title: t("common.invitationFailed"),
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (id: string, name: string, currentlyLocked: boolean) => {
    const lock = !currentlyLocked;
    try {
      await apiClient.toggleTenantLockout(id, lock);
      setFacilities(
        facilities.map((f: any) =>
          f.id === id ? { ...f, is_locked: lock, is_active: !lock, status: lock ? "RESTRICTED" : "ACTIVE" } : f
        )
      );
      setToast({
        type: currentlyLocked ? "success" : "warning",
        title: currentlyLocked ? t("common.accountRestored") || "Account Restored" : t("common.accountRestricted") || "Account Restricted",
        message: `${name} ${currentlyLocked ? t("common.restoredMsg") || "access has been restored." : t("common.restrictedMsg") || "has been locked out."}`,
      });
    } catch (err: any) {
      setError(err?.message || t("common.loadError") || "Failed to update facility lock status.");
    }
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await apiClient.verifyTenantLicense({ tenant_id: id, approve: true });
      setPendingFacilities((prev) => prev.filter((p: any) => (p.tenant_id || p.id) !== id));
      setFacilities((prev) =>
        prev.map((f: any) =>
          (f.id || f.tenant_id) === id ? { ...f, status: "ACTIVE", is_verified: true, is_active: true } : f
        )
      );
      setToast({
        type: "success",
        title: t("superAdmin.facilityApproved") || "Facility Approved",
        message: `${name} ${t("superAdmin.licenseVerified") || "license verified successfully."}`,
      });
      loadData();
    } catch (err: any) {
      setError(err?.message || t("common.loadError") || "Failed to verify facility license.");
    }
  };

  // ============================================================
  // Manage Drawer Helpers
  // ============================================================

  const TIER_TO_PLAN: Record<string, string> = {
    STARTER: "PLAN-STARTER",
    PROFESSIONAL: "PLAN-GROWTH",
    ENTERPRISE: "PLAN-ENTERPRISE",
  };
  const PLAN_TO_TIER: Record<string, "STARTER" | "PROFESSIONAL" | "ENTERPRISE"> = {
    "PLAN-STARTER": "STARTER",
    "PLAN-GROWTH": "PROFESSIONAL",
    "PLAN-ENTERPRISE": "ENTERPRISE",
  };

  const ROLE_PALETTE_HOSPITAL: FacilityRoleLiteral[] = [
    "HOSPITAL_ADMIN",
    "DOCTOR",
    "NURSE",
    "RECORD_CLERK",
    "ACCOUNTANT",
  ];
  const ROLE_PALETTE_PHARMACY: FacilityRoleLiteral[] = [
    "PHARMACY_ADMIN",
    "ACCOUNTANT",
  ];

  const staffRolePalette = ((): FacilityRoleLiteral[] => {
    const t = managedFacility?.tenant_type;
    if (t === "PHARMACY") return ROLE_PALETTE_PHARMACY;
    return ROLE_PALETTE_HOSPITAL;
  })();

  const ROLE_BADGE_COLOR: Record<string, "teal" | "emerald" | "cyan" | "info" | "secondary" | "warning"> = {
    HOSPITAL_ADMIN: "teal",
    PHARMACY_ADMIN: "emerald",
    DOCTOR: "cyan",
    NURSE: "info",
    RECORD_CLERK: "secondary",
    ACCOUNTANT: "warning",
  };

  const openManageDrawer = (fac: Tenant) => {
    setManagedFacility(fac);
    setActiveTab("profile");
    setResetLinks({});
    setOverrideOpen({});
    setOverridePw({});
    setOverridePw2({});
    setOverrideShowPw({});
    setGeneratingReset({});
    const rawTier = (PLAN_TO_TIER[fac.subscription_plan_code || "PLAN-GROWTH"] || "PROFESSIONAL") as any;
    setFacilityForm({
      name: fac.name || "",
      tier: rawTier,
      country: fac.country || "Ghana",
      currency: fac.currency || "GHS",
      status: fac.is_active && !fac.is_locked ? "ACTIVE" : "RESTRICTED",
    });
    setStaff([]);
    setAddStaffOpen(false);
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffLicense("");
    setNewStaffRoles([]);
    setManageDrawerOpen(true);
  };

  const closeManageDrawer = () => {
    setManageDrawerOpen(false);
  };

  const loadFacilityUsers = async (force = false) => {
    if (!managedFacility) return;
    if (staff.length > 0 && !force) return;
    setStaffLoading(true);
    try {
      const result = await apiClient.listFacilityUsers(managedFacility.id);
      setStaff(result);
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Failed to load staff",
        message: err?.response?.data?.detail || err?.message || "Please retry.",
      });
    } finally {
      setStaffLoading(false);
    }
  };

  // Load staff when switching to staff/security tabs
  useEffect(() => {
    if (!manageDrawerOpen || !managedFacility) return;
    if (activeTab === "staff" || activeTab === "security") {
      loadFacilityUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, manageDrawerOpen, managedFacility?.id]);

  const handleSaveFacility = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!managedFacility) return;
    setSavingFacility(true);
    try {
      const payload: UpdateFacilityPayload = {
        name: facilityForm.name,
        tier: facilityForm.tier,
        country: facilityForm.country,
        currency: facilityForm.currency,
        status: facilityForm.status,
      };
      const res = await apiClient.patchFacility(managedFacility.id, payload);
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === managedFacility.id
            ? {
                ...f,
                name: res.name,
                country: res.country,
                currency: res.currency,
                subscription_plan_code: res.subscription_plan_code,
                status: res.status,
                is_active: res.is_active,
                is_locked: res.status === "RESTRICTED",
              }
            : f
        )
      );
      // Also refresh managedFacility object so header reflects
      setManagedFacility((prev) =>
        prev && prev.id === managedFacility.id
          ? {
              ...prev,
              name: res.name,
              country: res.country,
              currency: res.currency,
              subscription_plan_code: res.subscription_plan_code,
              status: res.status,
              is_active: res.is_active,
              is_locked: res.status === "RESTRICTED",
            }
          : prev
      );
      setToast({
        type: "success",
        title: "Facility saved",
        message: res.message || "Profile changes have been persisted.",
      });
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Save failed",
        message: err?.response?.data?.detail || err?.message || "Unable to save facility profile.",
      });
    } finally {
      setSavingFacility(false);
    }
  };

  const handleRestrictFacility = async () => {
    if (!managedFacility) return;
    const ok = window.confirm(
      `Restrict access to "${managedFacility.name}"? Staff will be unable to use the platform until you restore the account.`
    );
    if (!ok) return;
    setSavingFacility(true);
    try {
      const res = await apiClient.patchFacility(managedFacility.id, { status: "RESTRICTED" });
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === managedFacility.id
            ? {
                ...f,
                status: res.status,
                is_active: res.is_active,
                is_locked: true,
              }
            : f
        )
      );
      setFacilityForm((f) => ({ ...f, status: "RESTRICTED" }));
      setToast({
        type: "warning",
        title: "Facility restricted",
        message: res.message || "Access restricted until re-enabled.",
      });
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Restrict failed",
        message: err?.response?.data?.detail || err?.message || "Action was not applied.",
      });
    } finally {
      setSavingFacility(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedFacility) return;
    if (newStaffRoles.length === 0) {
      setToast({
        type: "error",
        title: "Roles required",
        message: "Please select at least one role for the new staff member.",
      });
      return;
    }
    setSubmittingStaff(true);
    try {
      const payload: CreateTenantStaffPayload = {
        full_name: newStaffName,
        email: newStaffEmail,
        license_number: newStaffLicense || undefined,
        roles: newStaffRoles,
      };
      const created = await apiClient.createFacilityUser(managedFacility.id, payload);
      setStaff((prev) => [...prev, created]);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffLicense("");
      setNewStaffRoles([]);
      setAddStaffOpen(false);
      setToast({
        type: "success",
        title: "Staff added",
        message: `${created.full_name} (${created.email}) added. Use "Generate Reset Link" to send them a one-time password link.`,
      });
    } catch (err: any) {
      const detail =
        err?.response?.status === 409
          ? err?.response?.data?.detail || "A staff member with this email already exists under this facility."
          : err?.response?.data?.detail || err?.message || "Could not add staff.";
      setToast({
        type: "error",
        title: "Failed to add staff",
        message: detail,
      });
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleGenerateResetLink = async (user: TenantStaffItem) => {
    if (!managedFacility) return;
    setGeneratingReset((g) => ({ ...g, [user.id]: true }));
    try {
      const result = await apiClient.generateFacilityUserResetLink(managedFacility.id, user.id);
      setResetLinks((rl) => ({ ...rl, [user.id]: result }));
      // Dispatch-specific toast (union of backend new email_* flags).
      const dispatch = result.email_dispatch_status;
      if (dispatch === "sent") {
        setToast({
          type: "success",
          title: "Reset link dispatched via email",
          message: `Reset link dispatched via email to ${user.email}. Message valid for ${result.validity_hours} hours — link also available below for manual copy.`,
        });
      } else if (dispatch === "preview") {
        setToast({
          type: "warning",
          title: "Reset link issued — no SMTP profile configured",
          message: `Reset link generated for ${user.email} — email body logged to backend console. Configure the Email & SMTP Gateway to deliver live messages. Link available below for manual copy.`,
        });
      } else if (dispatch === "error") {
        setToast({
          type: "error",
          title: "Reset link issued — email dispatch failed",
          message:
            result.email_error ||
            `Reset link for ${user.email} could not be delivered via email. The link itself is still valid — share it below through a secure channel.`,
        });
      } else {
        // Fallback for backward compatibility (no email_* fields returned).
        setToast({
          type: "success",
          title: "Reset link generated",
          message: `One-time link for ${user.email} — valid for ${result.validity_hours} hours.`,
        });
      }
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Could not generate reset link",
        message: err?.response?.data?.detail || err?.message || "Retry in a moment.",
      });
    } finally {
      setGeneratingReset((g) => ({ ...g, [user.id]: false }));
    }
  };

  const handleCopyResetLink = async (user: TenantStaffItem) => {
    const link = resetLinks[user.id]?.reset_link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setToast({
        type: "info",
        title: "Reset link copied",
        message: "Paste this into a secure channel and share with the staff member.",
      });
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Clipboard blocked",
        message: "Please allow clipboard access or copy manually.",
      });
    }
  };

  const isPasswordStrong = (pw: string) => {
    const checks = {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      digit: /\d/.test(pw),
      symbol: /[!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?`~]/.test(pw),
    };
    return checks;
  };

  const submitOverridePassword = async (user: TenantStaffItem) => {
    if (!managedFacility) return;
    const pw = overridePw[user.id] || "";
    const pw2 = overridePw2[user.id] || "";
    if (pw.length < 8) {
      setToast({ type: "error", title: "Weak password", message: "Minimum 8 characters required." });
      return;
    }
    const strong = isPasswordStrong(pw);
    if (!Object.values(strong).every(Boolean)) {
      setToast({
        type: "error",
        title: "Password too weak",
        message: "Please satisfy all four password rules.",
      });
      return;
    }
    if (pw !== pw2) {
      setToast({ type: "error", title: "Mismatch", message: "Passwords do not match." });
      return;
    }
    setOverrideSubmitting((s) => ({ ...s, [user.id]: true }));
    try {
      await apiClient.overrideFacilityUserPassword(managedFacility.id, user.id, { new_password: pw });
      setOverridePw((p) => ({ ...p, [user.id]: "" }));
      setOverridePw2((p) => ({ ...p, [user.id]: "" }));
      setOverrideOpen((o) => ({ ...o, [user.id]: false }));
      setToast({
        type: "success",
        title: "Temporary password applied",
        message: `${user.email}'s sessions have been revoked. Share the new password through a secure channel.`,
      });
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Override failed",
        message: err?.response?.data?.detail || err?.message || "Password was not changed.",
      });
    } finally {
      setOverrideSubmitting((s) => ({ ...s, [user.id]: false }));
    }
  };

  const toggleStaffRole = (r: FacilityRoleLiteral) => {
    setNewStaffRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const filteredFacilities = facilities.filter((f: any) => {
    const matchesType = filterType === "ALL" || f.tenant_type === filterType || f.type === filterType;
    const fName = f.name || f.company_name || f.legal_name || "";
    const fLicense = f.license_number || f.license || "";
    const fCountry = f.country || "";
    const matchesSearch =
      fName.toLowerCase().includes(search.toLowerCase()) ||
      fLicense.toLowerCase().includes(search.toLowerCase()) ||
      fCountry.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
      <div className="h-16 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
        ))}
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="border-rose-200 bg-rose-50/50">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{t("common.error")}</h3>
          <p className="text-sm text-slate-600 mt-1">{error}</p>
        </div>
        <Button variant="teal" onClick={loadData}>
          <Sparkles className="h-4 w-4 mr-1.5" /> {t("common.retry")}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          actionUrl={toast.actionUrl}
          actionLabel={toast.actionLabel}
          onClose={() => setToast(null)}
        />
      )}

      {successModalData && (
        <NotificationModal
          isOpen={!!successModalData}
          onClose={() => setSuccessModalData(null)}
          type="success"
          title={t("superAdmin.facilityInvitationGenerated")}
          subtitle={`${t("superAdmin.secure72hLink")} ${successModalData.company_name}`}
          copyableUrl={successModalData.onboarding_url}
          primaryActionLabel={t("common.done")}
          details={
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("superAdmin.officialAdminEmail")}:</span>
                <span className="font-semibold text-slate-800">{successModalData.admin_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("superAdmin.assignedPlanTier")}:</span>
                <Badge variant="teal" className="text-[10px] font-bold py-0">
                  {successModalData.assigned_plan_code}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("superAdmin.countryAndCurrency")}:</span>
                <span className="font-semibold text-slate-800">
                  {successModalData.country} ({successModalData.currency})
                </span>
              </div>
            </div>
          }
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            {t("superAdmin.healthcareFacilitiesAndTenants")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("superAdmin.facilitiesSubtitle")}
          </p>
        </div>
        <Button
          variant="teal"
          onClick={() => setInviteModalOpen(true)}
          className="shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("superAdmin.inviteNewFacility")}
        </Button>
      </div>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : (
        <>
          {pendingFacilities.length > 0 && (
            <Card className="p-4 border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  {t("superAdmin.pendingVerificationQueue")} ({pendingFacilities.length})
                </h3>
              </div>
              <div className="divide-y divide-amber-100">
                {pendingFacilities.map((pf: any) => (
                  <div key={pf.tenant_id || pf.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{pf.company_name || pf.name || pf.legal_name}</span>
                      <Badge variant="warning" className="text-[9px] uppercase font-bold ml-2 py-0">
                        {pf.tenant_type || "PENDING"}
                      </Badge>
                      {pf.country && (
                        <span className="text-[10px] text-slate-500 ml-2 font-mono">
                          {pf.country} • {pf.license_number || pf.license || t("superAdmin.awaitingDocs")}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="teal"
                      onClick={() => handleApprove(pf.tenant_id || pf.id, pf.company_name || pf.name || "")}
                      className="text-xs py-1 h-auto"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {t("superAdmin.approveVerify")}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {invitations.length > 0 && (
            <Card className="p-4 border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-600" />
                  {t("superAdmin.activeOnboardingInvitations")} ({invitations.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">{t("superAdmin.72hSecurityWindow")}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {invitations.map((inv: any) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{inv.company_name}</span>
                      <span className="text-slate-400 font-mono ml-2">({inv.admin_email})</span>
                      <Badge variant={inv.tenant_type === "HOSPITAL" ? "teal" : "cyan"} className="text-[9px] uppercase font-bold ml-2 py-0">
                        {inv.tenant_type}
                      </Badge>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">
                        {t("common.plan")}: {inv.assigned_plan_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.onboarding_url);
                          setToast({
                            type: "info",
                            title: t("common.linkCopied"),
                            message: `${t("common.magicLinkCopied")} ${inv.company_name}.`,
                          });
                        }}
                        className="text-teal-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="h-3 w-3" /> {t("common.copyLink")}
                      </button>
                      <Badge variant={inv.status === "PENDING" ? "warning" : "success"} className="text-[9px] font-bold">
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {invitations.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500">No active onboarding invitations.</div>
          )}

          <Card className="p-4 border border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("superAdmin.searchFacilityPlaceholder")}
                  className="pl-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {["ALL", "HOSPITAL", "CLINIC", "PHARMACY"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setFilterType(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      filterType === tf
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {!loading && !error && filteredFacilities.length === 0 && facilities.length > 0 && (
            <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
              <div className="text-center space-y-2">
                <Search className="h-10 w-10 mx-auto text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-700">
                  {t("common.noResults") || "No matching facilities"}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("common.adjustSearch") || "Try clearing your search or type filter."}
                </p>
              </div>
            </Card>
          )}

          {!loading && !error && facilities.length === 0 && (
            <Card className="border border-slate-200 bg-white">
              <div className="p-12 text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Search className="h-8 w-8 text-slate-500" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm pt-2">{t("superAdmin.noFacilities")}</h4>
                <p className="text-xs text-slate-500">{t("superAdmin.noFacilitiesHelp")}</p>
              </div>
            </Card>
          )}

          {filteredFacilities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFacilities.map((fac: any) => {
                const facName = fac.name || fac.company_name || fac.legal_name || "Unnamed Facility";
                const facType = fac.tenant_type || fac.type || "FACILITY";
                const facPlan = fac.subscription_plan_code || fac.plan || "PLAN-STARTER";
                const facCountry = fac.country || "Ghana";
                const facCurrency = fac.currency || "GHS";
                const facStatus = fac.status || (fac.is_locked ? "RESTRICTED" : "ACTIVE");
                const facLicense = fac.license_number || fac.license || "";
                const facBranches = fac.branches_count || fac.branches || 1;
                const facBeds = fac.bed_count || fac.beds || 0;
                const facMonthlyBilling = fac.monthly_revenue || fac.monthlyBilling || 0;
                const facIsLocked = !!fac.is_locked;
                const isPending = facStatus === "PENDING_VERIFICATION" || facStatus === "PENDING";
                return (
                  <Card key={fac.id || fac.tenant_id} className="p-5 border border-slate-200 bg-white space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge
                          variant={facType === "HOSPITAL" ? "teal" : facType === "PHARMACY" ? "cyan" : "secondary"}
                          className="text-[10px] uppercase font-bold mb-1.5"
                        >
                          {facType}
                        </Badge>
                        <h3 className="text-sm font-bold text-slate-900">{facName}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{facLicense || t("superAdmin.noLicense")}</p>
                      </div>
                      <Badge
                        variant={
                          facStatus === "ACTIVE"
                            ? "success"
                            : facStatus === "RESTRICTED" || facStatus === "LOCKED"
                            ? "danger"
                            : "warning"
                        }
                        className="text-[10px] font-bold"
                      >
                        {(facStatus || "").replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("superAdmin.countryAndPlan")}</span>
                        <span className="font-semibold text-slate-800">
                          {facCountry} • {facPlan.replace("PLAN-", "")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">{t("superAdmin.monthlyBilling")}</span>
                        <span className="font-semibold text-slate-800">
                          {facCurrency} {(facMonthlyBilling || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="teal"
                            onClick={() => handleApprove(fac.id || fac.tenant_id, facName)}
                            className="text-xs py-1 h-auto"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {t("common.approve")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={facIsLocked ? "teal" : "outline"}
                          onClick={() => handleToggleLock(fac.id || fac.tenant_id, facName, facIsLocked)}
                          className="text-xs py-1 h-auto"
                        >
                          {facIsLocked ? (
                            <>
                              <Unlock className="h-3 w-3 mr-1" /> {t("common.restore")}
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1 text-slate-500" /> {t("common.restrict")}
                            </>
                          )}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openManageDrawer(fac)}
                        className="text-xs py-1 h-auto text-teal-600 hover:text-teal-800"
                      >
                        {t("common.manage")}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================================================
          Manage Facility Drawer (wide modal)
          ========================================================= */}
      {managedFacility && (
        <Modal
          isOpen={manageDrawerOpen}
          onClose={closeManageDrawer}
          title={`Manage ${managedFacility.name || "Facility"}`}
          className="!max-w-4xl !w-full !max-h-[92vh] overflow-hidden flex flex-col"
        >
          {/* Drawer identity bar (tenant type / status / id) */}
          <div className="flex flex-wrap items-center gap-2 -mx-6 px-6 pb-3 -mt-2 border-b border-slate-100">
            <Badge
              variant={
                managedFacility.tenant_type === "HOSPITAL"
                  ? "teal"
                  : managedFacility.tenant_type === "PHARMACY"
                  ? "cyan"
                  : "secondary"
              }
              className="text-[9px] uppercase font-bold py-0"
            >
              {managedFacility.tenant_type || "FACILITY"}
            </Badge>
            <Badge
              variant={
                (managedFacility.status || managedFacility.is_active) === "ACTIVE"
                  ? "success"
                  : "danger"
              }
              className="text-[9px] font-bold py-0"
            >
              {((managedFacility.status && managedFacility.status !== "PENDING_VERIFICATION" && managedFacility.status !== "PENDING")
                ? managedFacility.status
                : managedFacility.is_active && !managedFacility.is_locked
                ? "ACTIVE"
                : "RESTRICTED")?.toString().replace("_", " ")}
            </Badge>
            <button
              onClick={() => {
                navigator.clipboard.writeText(managedFacility.id);
                setToast({ type: "info", title: "Copied", message: "Facility ID copied to clipboard." });
              }}
              className="text-[10px] text-slate-500 font-mono hover:text-teal-700 transition flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              ID: {managedFacility.id.slice(0, 8)}…
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 -mx-6 px-6 bg-white gap-5">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === "profile"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Settings2 className="h-4 w-4" /> Facility Profile &amp; Plan
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === "staff"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users2 className="h-4 w-4" /> Staff &amp; Role Assignments
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === "security"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Lock className="h-4 w-4" /> Security &amp; Password Restore
            </button>
          </div>

          {/* Modal scrollable body */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6 pt-5 pb-3 space-y-5 min-h-[55vh]">
            {/* ===================== TAB A: FACILITY PROFILE ===================== */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveFacility} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Facility Name</label>
                    <Input
                      value={facilityForm.name}
                      onChange={(e) => setFacilityForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tier (Plan)</label>
                    <select
                      value={facilityForm.tier}
                      onChange={(e) =>
                        setFacilityForm((f) => ({ ...f, tier: e.target.value as any }))
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white h-[38px]"
                    >
                      <option value="STARTER">Starter (PLAN-STARTER)</option>
                      <option value="PROFESSIONAL">Professional (PLAN-GROWTH)</option>
                      <option value="ENTERPRISE">Enterprise (PLAN-ENTERPRISE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                    <Input
                      value={facilityForm.country}
                      onChange={(e) => setFacilityForm((f) => ({ ...f, country: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                    <select
                      value={facilityForm.currency}
                      onChange={(e) =>
                        setFacilityForm((f) => ({ ...f, currency: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white h-[38px]"
                    >
                      <option value="GHS">GHS (Ghana Cedi)</option>
                      <option value="XOF">XOF (CFA Franc)</option>
                      <option value="USD">USD (US Dollar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={facilityForm.status}
                      onChange={(e) =>
                        setFacilityForm((f) => ({ ...f, status: e.target.value as any }))
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white h-[38px]"
                    >
                      <option value="ACTIVE">ACTIVE — Full Platform Access</option>
                      <option value="RESTRICTED">RESTRICTED — Locked / Deactivated</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRestrictFacility}
                    isLoading={savingFacility}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" /> Restrict / Deactivate Facility
                  </Button>
                  <div className="flex gap-2 justify-end w-full sm:w-auto">
                    <Button type="button" variant="ghost" size="sm" onClick={closeManageDrawer}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" variant="teal" isLoading={savingFacility} size="sm">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* ===================== TAB B: STAFF & ROLES ===================== */}
            {activeTab === "staff" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{staff.length}</span> staff member{staff.length === 1 ? "" : "s"} currently assigned to this facility.
                  </div>
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={() => setAddStaffOpen((o) => !o)}
                  >
                    {addStaffOpen ? (
                      <><X className="h-3.5 w-3.5 mr-1.5" /> Cancel</>
                    ) : (
                      <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add New Staff Member</>
                    )}
                  </Button>
                </div>

                {addStaffOpen && (
                  <Card className="p-4 border-teal-100 bg-teal-50/30 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserPlus className="h-4 w-4 text-teal-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Add Staff Member
                      </h4>
                    </div>
                    <form onSubmit={handleCreateStaff} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                          <Input
                            required
                            value={newStaffName}
                            onChange={(e) => setNewStaffName(e.target.value)}
                            placeholder="Dr. / Nurse / Clerk full name"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Email *</label>
                          <Input
                            required
                            type="email"
                            value={newStaffEmail}
                            onChange={(e) => setNewStaffEmail(e.target.value)}
                            placeholder="staff@facility.com"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            License / Council ID (optional)
                          </label>
                          <Input
                            value={newStaffLicense}
                            onChange={(e) => setNewStaffLicense(e.target.value)}
                            placeholder="MDCN / GDC / Pharmacy Council No."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-2">
                          Roles * (at least one)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {staffRolePalette.map((r) => {
                            const active = newStaffRoles.includes(r);
                            return (
                              <button
                                type="button"
                                key={r}
                                onClick={() => toggleStaffRole(r)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                                  active
                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-300 hover:border-teal-300 hover:text-teal-700"
                                }`}
                              >
                                {r.replace(/_/g, " ")}
                              </button>
                            );
                          })}
                        </div>
                        {newStaffRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {newStaffRoles.map((r) => (
                              <Badge
                                key={r}
                                variant={(ROLE_BADGE_COLOR[r] || "secondary") as any}
                                className="text-[9px] font-bold py-0"
                              >
                                {r.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button type="submit" variant="teal" isLoading={submittingStaff} size="sm">
                          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Staff Account
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {staffLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 rounded-xl animate-pulse bg-slate-100" />
                    ))}
                  </div>
                )}

                {!staffLoading && staff.length === 0 && (
                  <Card className="p-6 border-dashed border-slate-200 bg-slate-50/50 text-center">
                    <Users2 className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No staff members yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click <span className="font-semibold">"Add New Staff Member"</span> above to create the first account.
                    </p>
                  </Card>
                )}

                {!staffLoading && staff.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold text-left">
                          <th className="px-3 py-2.5">Staff Name</th>
                          <th className="px-3 py-2.5">Email</th>
                          <th className="px-3 py-2.5">Roles</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {staff.map((u) => (
                          <tr key={u.id}>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{u.full_name}</div>
                              {u.license_number && (
                                <div className="text-[10px] text-slate-400 font-mono">{u.license_number}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 font-mono">{u.email}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {(u.roles || []).map((r) => (
                                  <Badge
                                    key={r}
                                    variant={(ROLE_BADGE_COLOR[r] || "secondary") as any}
                                    className="text-[9px] font-bold py-0"
                                  >
                                    {r.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                                {(!u.roles || u.roles.length === 0) && u.primary_role && (
                                  <Badge variant="secondary" className="text-[9px] font-bold py-0">
                                    {u.primary_role.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant={u.is_active ? "success" : "danger"}
                                className="text-[9px] font-bold py-0"
                              >
                                {u.is_active ? "ACTIVE" : "RESTRICTED"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateResetLink(u)}
                                isLoading={!!generatingReset[u.id]}
                                className="text-[10px] py-1 h-auto text-teal-700"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" /> Reset Link
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOverrideOpen((o) => ({ ...o, [u.id]: !o[u.id] }));
                                  setOverridePw((p) => ({ ...p, [u.id]: "" }));
                                  setOverridePw2((p) => ({ ...p, [u.id]: "" }));
                                }}
                                className="text-[10px] py-1 h-auto"
                              >
                                <KeyRound className="h-3 w-3 mr-1" /> Temp Password
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===================== TAB C: SECURITY & PASSWORD RESTORE ===================== */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Use these per-staff actions to recover access. Reset links are one-time use (SHA-256 hashed server-side, default 24-hour window).
                  Temporary passwords immediately revoke all existing sessions.
                </p>

                {staffLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 rounded-xl animate-pulse bg-slate-100" />
                    ))}
                  </div>
                )}

                {!staffLoading && staff.length === 0 && (
                  <Card className="p-6 border-dashed border-slate-200 bg-slate-50/50 text-center">
                    <Lock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No staff accounts to secure</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Staff members must exist on the roster before issuing resets. Switch to the "Staff &amp; Role Assignments" tab to add staff.
                    </p>
                  </Card>
                )}

                {!staffLoading &&
                  staff.map((u) => {
                    const rl = resetLinks[u.id];
                    const overrideOpenU = !!overrideOpen[u.id];
                    const pwStrength = isPasswordStrong(overridePw[u.id] || "");
                    const allStrong = Object.values(pwStrength).every(Boolean);
                    const pwMatch =
                      !!overridePw[u.id] && overridePw[u.id] === overridePw2[u.id];
                    const canSubmitOverride =
                      allStrong &&
                      pwMatch &&
                      (overridePw[u.id] || "").length >= 8;
                    return (
                      <Card
                        key={u.id}
                        className="p-4 border border-slate-200 bg-white space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">
                                {u.full_name}
                              </span>
                              <Badge
                                variant={u.is_active ? "success" : "danger"}
                                className="text-[9px] font-bold py-0"
                              >
                                {u.is_active ? "ACTIVE" : "RESTRICTED"}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {u.email}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(u.roles || []).slice(0, 3).map((r) => (
                                <Badge
                                  key={r}
                                  variant={(ROLE_BADGE_COLOR[r] || "secondary") as any}
                                  className="text-[9px] font-bold py-0"
                                >
                                  {r.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="teal"
                              onClick={() => handleGenerateResetLink(u)}
                              isLoading={!!generatingReset[u.id]}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Generate One-Time Reset Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setOverrideOpen((o) => ({ ...o, [u.id]: !o[u.id] }));
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                              Instant Temporary Password
                            </Button>
                          </div>
                        </div>

                        {rl && (
                          <div className="rounded-xl p-3 border border-emerald-200 bg-emerald-50/40 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                  Reset Link Issued
                                </span>
                                {rl.email_dispatch_status === "sent" && (
                                  <Badge variant="success" className="text-[9px] font-bold py-0 inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Emailed to {u.email}
                                  </Badge>
                                )}
                                {rl.email_dispatch_status === "preview" && (
                                  <Badge variant="warning" className="text-[9px] font-bold py-0 inline-flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    Console preview — SMTP not configured
                                  </Badge>
                                )}
                                {rl.email_dispatch_status === "error" && (
                                  <Badge variant="danger" className="text-[9px] font-bold py-0 inline-flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Email failed — copy and share manually
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="success" className="text-[9px] font-bold py-0 inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Valid for {rl.validity_hours} hour{rl.validity_hours === 1 ? "" : "s"}
                              </Badge>
                            </div>
                            {rl.email_error && rl.email_dispatch_status === "error" && (
                              <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                                <AlertCircle className="h-3 w-3 inline mr-1.5 align-sub" /> SMTP error:
                                <code className="ml-1.5 font-mono text-[10.5px]">{rl.email_error}</code>
                              </p>
                            )}
                            <div className="flex gap-2 items-stretch">
                              <Input
                                value={rl.reset_link}
                                readOnly
                                className="flex-1 font-mono text-[11px] bg-white pr-2 pl-2"
                              />
                              <Button
                                size="sm"
                                variant="teal"
                                onClick={() => handleCopyResetLink(u)}
                                className="whitespace-nowrap"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy Reset Link
                              </Button>
                            </div>
                          </div>
                        )}

                        {overrideOpenU && (
                          <div className="rounded-xl p-3 border border-amber-200 bg-amber-50/40 space-y-3">
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-4 w-4 text-amber-600" />
                              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                Assign Temporary Password
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  New temporary password
                                </label>
                                <div className="relative">
                                  <Input
                                    type={overrideShowPw[u.id] ? "text" : "password"}
                                    value={overridePw[u.id] || ""}
                                    onChange={(e) =>
                                      setOverridePw((p) => ({ ...p, [u.id]: e.target.value }))
                                    }
                                    className="pr-9"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOverrideShowPw((s) => ({ ...s, [u.id]: !s[u.id] }))
                                    }
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                                    tabIndex={-1}
                                  >
                                    {overrideShowPw[u.id] ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Confirm temporary password
                                </label>
                                <Input
                                  type="password"
                                  value={overridePw2[u.id] || ""}
                                  onChange={(e) =>
                                    setOverridePw2((p) => ({ ...p, [u.id]: e.target.value }))
                                  }
                                />
                              </div>
                            </div>

                            {/* Live strength indicator */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { k: "length", label: "8+ characters" },
                                { k: "upper", label: "Uppercase letter" },
                                { k: "digit", label: "Number (0-9)" },
                                { k: "symbol", label: "Special symbol" },
                              ].map((r) => {
                                const ok = (pwStrength as any)[r.k];
                                return (
                                  <div
                                    key={r.k}
                                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
                                      ok
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-slate-50 border-slate-200 text-slate-500"
                                    }`}
                                  >
                                    {ok ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <AlertCircle className="h-3 w-3 text-slate-400" />
                                    )}
                                    {r.label}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <div className="text-[10px] text-slate-500 font-medium">
                                {allStrong && pwMatch ? (
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Password is valid &amp; confirmed.
                                  </span>
                                ) : !pwMatch && (overridePw[u.id] || "").length > 0 ? (
                                  <span className="text-amber-700 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Passwords do not match.
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Meet all four rules + confirm password.
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setOverrideOpen((o) => ({ ...o, [u.id]: false }))}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  isLoading={!!overrideSubmitting[u.id]}
                                  disabled={!canSubmitOverride}
                                  onClick={() => submitOverridePassword(u)}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Apply &amp; Revoke Sessions
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={t("superAdmin.inviteNewFacilityModalTitle")}
      >
        <form onSubmit={handleCreateInvitation} className="space-y-4">
          <p className="text-xs text-slate-500">
            {t("superAdmin.inviteModalSubtitle")}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t("superAdmin.facilityCompanyName")} *
            </label>
            <Input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("superAdmin.facilityNamePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t("superAdmin.facilityAdminEmail")} *
            </label>
            <Input
              required
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={t("superAdmin.adminEmailPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("superAdmin.facilityType")} *
              </label>
              <select
                value={tenantType}
                onChange={(e) => setTenantType(e.target.value as "HOSPITAL" | "CLINIC" | "PHARMACY")}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white"
              >
                <option value="HOSPITAL">{t("superAdmin.facilityTypeHospital")}</option>
                <option value="CLINIC">{t("superAdmin.facilityTypeClinic")}</option>
                <option value="PHARMACY">{t("superAdmin.facilityTypePharmacy")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("superAdmin.assignedSubscriptionPlan")} *
              </label>
              <select
                value={assignedPlanCode}
                onChange={(e) => setAssignedPlanCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white"
              >
                <option value="PLAN-STARTER">{t("superAdmin.planStarter")}</option>
                <option value="PLAN-GROWTH">{t("superAdmin.planGrowth")}</option>
                <option value="PLAN-ENTERPRISE">{t("superAdmin.planEnterprise")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("common.country")} *
              </label>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value === "Ghana") setCurrency("GHS");
                  else setCurrency("XOF");
                }}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white"
              >
                <option value="Ghana">{t("countries.ghana")}</option>
                <option value="Togo">{t("countries.togo")}</option>
                <option value="Benin">{t("countries.benin")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("common.billingCurrency")} *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white"
              >
                <option value="GHS">{t("currencies.ghs")}</option>
                <option value="XOF">{t("currencies.xof")}</option>
                <option value="USD">{t("currencies.usd")}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="teal" isLoading={isSubmitting}>
              <Sparkles className="h-4 w-4 mr-1.5" /> {t("superAdmin.generate72hMagicLink")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
