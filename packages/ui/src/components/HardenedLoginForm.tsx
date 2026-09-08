"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  HelpCircle,
  KeyRound,
  Languages,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldCheck as ShieldCheckIcon,
  Stethoscope,
  Pill,
  Phone,
  User,
  UserCheck,
  Zap,
  X,
  Copy,
  Building2,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { MedipaediaIconMark } from "./logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "../i18n";
import { createApiClient, type CompanyInvitationResponse } from "@medipaedia/api-client";

export type PortalType = "clinical" | "rx" | "patient" | "super-admin";
export type AccentColor = "teal" | "emerald" | "cyan" | "purple";

export interface HardenedLoginFormProps {
  portalType: PortalType;
  title?: string;
  subtitle?: string;
  accentColor?: AccentColor;
  defaultFacilitySlug?: string;
  facilitySlugFixed?: boolean;
  hideFacilityInput?: boolean;
  onLogin: (credentials: {
    identifier: string;
    password: string;
    facilitySlug?: string;
  }) => Promise<void>;
  onRegister?: (data: {
    fullName: string;
    phone: string;
    password: string;
    ghanaCardId?: string;
    dob?: string;
    gender?: string;
  }) => Promise<void>;
  onForgotPassword?: () => void;
}

const extractErrorKey = (raw: unknown): { key: string | null; vars?: Record<string, string>; rawMessage?: string } | null => {
  if (!raw) return null;
  const msg = typeof raw === "string" ? raw : (raw as any)?.message || (raw as any)?.detail || String(raw);
  if (!msg) return null;
  if (/^Invalid credentials\.? Please verify your email and password\.?\s*$/i.test(msg)) {
    return { key: "common.invalidCredentials", rawMessage: msg };
  }
  if (/inactive/i.test(msg)) return { key: "common.accountLocked", rawMessage: msg };
  const m = /not authorized for facility '([^']+)'/i.exec(msg);
  if (m) return { key: "common.facilityUnauthorized", vars: { facility: m[1] }, rawMessage: msg };
  return { key: null, rawMessage: msg };
};

export function HardenedLoginForm({
  portalType,
  title,
  subtitle,
  accentColor = "teal",
  defaultFacilitySlug,
  facilitySlugFixed = false,
  hideFacilityInput = true,
  onLogin,
  onRegister,
  onForgotPassword,
}: HardenedLoginFormProps) {
  const { t, locale, setLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Patient Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regGhanaCard, setRegGhanaCard] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regPassword, setRegPassword] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [facilitySlug, setFacilitySlug] = useState(
    defaultFacilitySlug ||
      (portalType === "rx"
        ? ""
        : portalType === "clinical"
        ? ""
        : "")
  );

  const passwordMinLen = 8;
  const pw = password || "";
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const strengthPieces = [hasUpper, hasLower, hasDigit, hasSpecial, pw.length >= passwordMinLen];
  const strengthScore = strengthPieces.filter(Boolean).length;

  const strengthPct = Math.round((strengthScore / 5) * 100);
  const strengthColor =
    !pw.length
      ? "bg-slate-200"
      : strengthScore <= 2
      ? "bg-rose-500"
      : strengthScore === 3
      ? "bg-amber-500"
      : strengthScore === 4
      ? "bg-teal-500"
      : "bg-emerald-600";
  const strengthLabel =
    !pw.length
      ? "Enter password…"
      : strengthScore <= 2
      ? "Weak — add upper, digits symbol"
      : strengthScore === 3
      ? "Fair — add symbol or digits"
      : strengthScore === 4
      ? "Strong"
      : "Ghana MoH Compliant";

  // Portal metadata defaults
  const getPortalDefaults = () => {
    switch (portalType) {
      case "clinical":
        return {
          title: title || "Medipaedia Clinical",
          subtitle: subtitle || "Hospital, Clinic & Medical Staff Gateway",
          icon: <Stethoscope className="h-4 w-4 text-teal-600" />,
          accent: "teal",
          tenantLabel: "Hospital / Clinic Facility Slug",
          identifierLabel: "Staff Email, License PIN, or MDC ID",
          identifierPlaceholder: "doctor.afia@ridgehospital.health",
          complianceBadge: "Ministry of Health (MOH) & MDC Accredited",
        };
      case "rx":
        return {
          title: title || "Medipaedia Rx",
          subtitle: subtitle || "Pharmacy POS & Dispensing Counter Gateway",
          icon: <Pill className="h-4 w-4 text-emerald-600" />,
          accent: "emerald",
          tenantLabel: "Community Pharmacy Facility Slug",
          identifierLabel: "Pharmacist Email or Pharmacy Council PIN",
          identifierPlaceholder: "pharm.kojo@osupharmacy.health",
          complianceBadge: "Pharmacy Council Ghana & FDA Registered",
        };
      case "patient":
        return {
          title: title || "Medipaedia Care",
          subtitle: subtitle || "Ghana National Health Pass & Universal Patient Portal",
          icon: <UserCheck className="h-4 w-4 text-cyan-600" />,
          accent: "cyan",
          tenantLabel: "Primary Hospital Card (Optional)",
          identifierLabel: "Ghana Card ID, Mobile Phone, or Email",
          identifierPlaceholder: "GHA-71298412-1 or 0244123456",
          complianceBadge: "Ghana Data Protection Act 2012 (Act 843)",
        };
      case "super-admin":
        return {
          title: title || "Medipaedia Governance",
          subtitle: subtitle || "Platform Super Administrator Mission Control",
          icon: <ShieldAlert className="h-4 w-4 text-purple-600" />,
          accent: "purple",
          tenantLabel: "Platform Scope (Global)",
          identifierLabel: "Super Admin Root Email",
          identifierPlaceholder: "admin@medipaedia.health",
          complianceBadge: "Zero-PHI Cryptographic Platform Governance",
        };
    }
  };

  const portalConfig = getPortalDefaults();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please enter both your identifier and password.");
      return;
    }

    if (failedAttempts >= 5) {
      setErrorMessage("Too many failed attempts. Please wait 60 seconds or contact Facility Helpdesk.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onLogin({
        identifier: identifier.trim(),
        password: password.trim(),
        facilitySlug: facilitySlug.trim() || undefined,
      });
    } catch (err: any) {
      setFailedAttempts((n) => n + 1);
      const mapped = extractErrorKey(err);
      const serverDetail = mapped?.rawMessage;
      if (mapped?.key === null && serverDetail) {
        setErrorMessage(serverDetail);
      } else if (mapped && mapped.key) {
        const translated = t(mapped.key, mapped.vars);
        setErrorMessage(translated && translated !== mapped.key ? translated : serverDetail || "Authentication failed. Please verify your credentials and facility assignment.");
      } else {
        setErrorMessage(serverDetail || err?.message || "Authentication failed. Please verify your credentials and facility assignment.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setErrorMessage("Please fill in all mandatory registration fields.");
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (onRegister) {
        await onRegister({
          fullName: regFullName.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          ghanaCardId: regGhanaCard.trim() || undefined,
          dob: regDob || undefined,
          gender: regGender,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Patient registration failed. Please review your details.");
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== Facility Invite Request Modal =====================
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCompanyName, setInviteCompanyName] = useState("");
  const [inviteAdminEmail, setInviteAdminEmail] = useState("");
  const [inviteAdminPhone, setInviteAdminPhone] = useState("");
  const [inviteTenantType, setInviteTenantType] = useState<"HOSPITAL" | "CLINIC" | "PHARMACY">("HOSPITAL");
  const [inviteCity, setInviteCity] = useState("Accra");
  const [inviteCountry, setInviteCountry] = useState("Ghana");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteIsSubmitting, setInviteIsSubmitting] = useState(false);
  const [inviteSubmitError, setInviteSubmitError] = useState<string | null>(null);
  const [inviteSubmitResult, setInviteSubmitResult] = useState<CompanyInvitationResponse | null>(null);
  const [inviteSubmitThrottled, setInviteSubmitThrottled] = useState(false);
  const [emailValidationState, setEmailValidationState] = useState<
    "idle" | "checking" | "valid" | "invalid" | "duplicate"
  >("idle");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteAbortRef = useRef<AbortController | null>(null);

  const openInviteModal = () => {
    setShowInviteModal(true);
    setInviteSubmitError(null);
    setInviteSubmitResult(null);
    setEmailValidationState("idle");
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (inviteAbortRef.current) inviteAbortRef.current.abort();
  };

  const isEmailFormatValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleInviteEmailBlur = () => {
    const email = inviteAdminEmail.trim();
    if (!email) {
      setEmailValidationState("idle");
      return;
    }
    if (!isEmailFormatValid(email)) {
      setEmailValidationState("invalid");
      return;
    }
    // Lightweight client-side format-valid state (server dedupes on submit)
    setEmailValidationState("valid");
  };

  const resetInviteForm = () => {
    setInviteCompanyName("");
    setInviteAdminEmail("");
    setInviteAdminPhone("");
    setInviteTenantType("HOSPITAL");
    setInviteCity("Accra");
    setInviteCountry("Ghana");
    setInviteNote("");
    setInviteSubmitError(null);
    setInviteSubmitResult(null);
    setEmailValidationState("idle");
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteIsSubmitting || inviteSubmitThrottled) return;

    const companyName = inviteCompanyName.trim();
    const adminEmail = inviteAdminEmail.trim();
    const adminPhone = inviteAdminPhone.trim();

    if (!companyName || companyName.length < 2) {
      setInviteSubmitError("Please enter a valid Facility / Company name (at least 2 characters).");
      return;
    }
    if (!isEmailFormatValid(adminEmail)) {
      setInviteSubmitError("Please enter a valid Admin Email address.");
      setEmailValidationState("invalid");
      return;
    }
    if (!adminPhone || adminPhone.length < 9) {
      setInviteSubmitError("Please enter a valid Admin Phone number (9+ digits).");
      return;
    }

    setInviteSubmitError(null);
    setInviteIsSubmitting(true);
    // 700ms double-click throttle to prevent accidental duplicate submissions (performance + UX)
    setInviteSubmitThrottled(true);
    setTimeout(() => setInviteSubmitThrottled(false), 700);

    try {
      if (inviteAbortRef.current) inviteAbortRef.current.abort();
      inviteAbortRef.current = new AbortController();
      const apiClient = createApiClient();
      const result = await apiClient.requestFacilityInvite({
        company_name: companyName,
        admin_email: adminEmail,
        admin_phone: adminPhone,
        tenant_type: inviteTenantType,
        city: inviteCity || "Accra",
        country: inviteCountry || "Ghana",
        currency: inviteCountry === "Ghana" ? "GHS" : undefined,
        note: inviteNote.trim() || undefined,
      });
      setInviteSubmitResult(result);
    } catch (err: any) {
      const detail =
        typeof err?.detail === "string"
          ? err.detail
          : typeof err?.message === "string"
          ? err.message
          : /already registered|already exists|duplicate|pending/i.test(String(err?.message || err?.detail || ""))
          ? "An invitation for this email already exists. Please contact support or check your inbox."
          : "Unable to submit your facility invite request. Please try again in a moment.";
      setInviteSubmitError(detail);
    } finally {
      setInviteIsSubmitting(false);
    }
  };

  const handleCopyOnboardingUrl = () => {
    if (!inviteSubmitResult?.onboarding_url) return;
    try {
      navigator.clipboard.writeText(inviteSubmitResult.onboarding_url);
    } catch {
      /* clipboard unavailable — non-fatal */
    }
  };

  const getAccentStyles = () => {
    switch (accentColor) {
      case "emerald":
        return {
          tabActive: "bg-white text-emerald-700 border-b-2 border-emerald-600",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20",
          ring: "focus:ring-emerald-500",
          borderHover: "hover:border-emerald-300",
          iconBg: "bg-emerald-50 text-emerald-700",
        };
      case "cyan":
        return {
          tabActive: "bg-white text-cyan-700 border-b-2 border-cyan-600",
          button: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-700/20",
          ring: "focus:ring-cyan-500",
          borderHover: "hover:border-cyan-300",
          iconBg: "bg-cyan-50 text-cyan-700",
        };
      case "purple":
        return {
          tabActive: "bg-white text-purple-700 border-b-2 border-purple-600",
          button: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-700/20",
          ring: "focus:ring-purple-500",
          borderHover: "hover:border-purple-300",
          iconBg: "bg-purple-50 text-purple-700",
        };
      case "teal":
      default:
        return {
          tabActive: "bg-white text-teal-700 border-b-2 border-teal-600",
          button: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20",
          ring: "focus:ring-teal-500",
          borderHover: "hover:border-teal-300",
          iconBg: "bg-teal-50 text-teal-700",
        };
    }
  };

  const accentStyles = getAccentStyles();

  return (
    <div className="relative">
      <div className="absolute -top-3 right-4 z-20">
        <LanguageSwitcher theme="light" size="sm" />
      </div>
      <Card className="w-full max-w-md border border-slate-200/90 shadow-2xl bg-white rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Patient Dual Tabs if portalType is patient */}
        {portalType === "patient" && (
          <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
              }}
              className={`flex-1 py-3.5 text-center transition ${
                activeTab === "login"
                  ? accentStyles.tabActive + " shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Universal Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMessage(null);
              }}
              className={`flex-1 py-3.5 text-center transition ${
                activeTab === "register"
                  ? accentStyles.tabActive + " shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register Ghana Pass
            </button>
          </div>
        )}

        {/* Card Header with Brand and Badges */}
        <CardHeader className="space-y-3 text-center pb-6 pt-9 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white">
          <div className="mx-auto flex justify-center">
            <div className="relative">
              <MedipaediaIconMark size="lg" imageVariant="mark" />
              <div className="absolute -bottom-1 -right-2 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center">
                <ShieldCheckIcon className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.18em] bg-white border-slate-200 text-slate-500 px-2.5 py-0.5">
                {t("common.zeroPhiActive") || "Zero-PHI Isolation Active"}
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                {portalConfig.title}
              </CardTitle>
            </div>
            <p className="text-xs font-medium text-slate-500 max-w-[340px] mx-auto leading-relaxed">
              {portalConfig.subtitle}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6 px-6 sm:px-8 space-y-5">
          {/* Error Notification Banner */}
          {errorMessage && (
            <div role="alert" className="group p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in slide-in-from-top-2 fade-in duration-300 shadow-rose-200/50 shadow-sm">
              <div className="mt-0.5 rounded-full bg-rose-100 p-0.5 flex items-center justify-center">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-black uppercase tracking-wide text-[10px] text-rose-700/90">Authentication Error</p>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Super Admin global banner toggle + scope */}
              {portalType === "clinical" && (
                <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/80 via-fuchsia-50/40 to-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-purple-600 shadow-md shadow-purple-200 flex-shrink-0">
                        <ShieldAlert className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-700 leading-none">
                          {t("common.superAdmin") || "Platform Super Admin"}
                        </p>
                        <p className="text-[10px] text-purple-600/80 leading-tight mt-1 truncate">
                          {t("common.platformScope") || "Global Governance Scope"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-purple-100/80 text-purple-700 border border-purple-200">
                      Tier 0
                    </span>
                  </div>
                </div>
              )}

              {/* Facility Slug Selector — HIDDEN by default. Tenant resolved server-side via user.tenant_id.
                   Only renders if consumer explicitly sets hideFacilityInput=false AND it's a multi-tenant portal. */}
              {!hideFacilityInput &&
                portalType !== "super-admin" &&
                portalType !== "patient" &&
                !facilitySlugFixed && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-extrabold text-slate-700">
                        {portalConfig.tenantLabel}
                      </label>
                      {facilitySlug && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified Tenant
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        value={facilitySlug}
                        onChange={(e) => setFacilitySlug(e.target.value)}
                        placeholder="e.g. ridge-regional-hospital"
                        className="font-mono text-xs text-slate-800 pl-9"
                      />
                    </div>
                  </div>
                )}

              {/* Identifier Input */}
              <div>
                <label
                  htmlFor="staff-identifier"
                  className="block text-xs font-extrabold text-slate-800 mb-1.5"
                >
                  {portalConfig.identifierLabel}
                </label>
                <div className="relative group">
                  <Input
                    id="staff-identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={portalConfig.identifierPlaceholder}
                    className={`text-xs text-slate-900 pl-9 py-2.5 rounded-2xl border-slate-300/90 transition-all duration-200 ease-out focus:shadow-lg focus:shadow-teal-500/15 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/80 hover:border-slate-400/80 ${accentStyles.ring || "focus:ring-teal-500"}`}
                    required
                    autoFocus
                    autoComplete="username webauthn"
                    aria-describedby="identifier-help"
                  />
                  <div className="absolute left-3 top-3 pointer-events-none rounded-full bg-slate-100 p-0.5 -m-0.5 group-focus-within:bg-teal-50 transition-colors duration-200">
                    <User className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-teal-600 transition-colors duration-200" />
                  </div>
                </div>
                <p id="identifier-help" className="sr-only">
                  Enter your registered staff email, medical license PIN, or MDC practitioner ID.
                </p>
              </div>

              {/* Password Input with Show/Hide Toggle + Strength Meter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="staff-password"
                    className="block text-xs font-extrabold text-slate-800"
                  >
                    Password
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Zap className="h-3 w-3" aria-hidden />
                    Ghana Standard 8+ Chars
                  </span>
                </div>
                <div className="relative group">
                  <Input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`text-xs text-slate-900 pl-9 pr-10 py-2.5 rounded-2xl border-slate-300/90 transition-all duration-200 ease-out focus:shadow-lg focus:shadow-teal-500/15 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/80 hover:border-slate-400/80 ${accentStyles.ring || "focus:ring-teal-500"} ${
                      failedAttempts >= 3 ? "ring-2 ring-rose-400/70 border-rose-300 focus:shadow-rose-500/20" : ""
                    }`}
                    required
                    autoComplete="current-password webauthn"
                    aria-describedby="password-strength pw-help"
                  />
                  <div className="absolute left-3 top-3 pointer-events-none rounded-full bg-slate-100 p-0.5 -m-0.5 group-focus-within:bg-teal-50 transition-colors duration-200">
                    <KeyRound className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-teal-600 transition-colors duration-200" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 focus:outline-none rounded-md p-1 hover:bg-slate-100 transition-colors duration-150"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Meter */}
                <div className="mt-2 space-y-1.5" role="group" aria-label="Password strength">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden>
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300 ease-out`}
                      style={{ width: `${strengthPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold" id="password-strength">
                    <span className={strengthScore <= 2 ? "text-rose-600" : strengthScore <= 3 ? "text-amber-700" : "text-emerald-700"}>
                      {strengthLabel}
                    </span>
                    <span className="text-slate-400" id="pw-help">
                      {failedAttempts > 0
                        ? `Failed attempts: ${failedAttempts}/5`
                        : `A-Z · a-z · 0-9 · symbol · ≥${passwordMinLen}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Help links (harmonized styling) */}
              <div className="flex items-center justify-between gap-3 -mt-1">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onForgotPassword) onForgotPassword();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-teal-700 transition-colors duration-150 group"
                >
                  <HelpCircle className="h-3 w-3 text-slate-400 group-hover:text-teal-500 transition-colors duration-150" />
                  <span className="group-hover:underline decoration-1 underline-offset-2">
                    {t("common.forgotPassword") || "Forgot password or unlock account?"}
                  </span>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 transition-colors duration-150 group"
                >
                  <Mail className="h-3 w-3 text-teal-500" />
                  <span className="group-hover:underline decoration-1 underline-offset-2">
                    {t("common.helpdesk") || "Helpdesk"}
                  </span>
                </a>
              </div>

              {/* Submit Button + WebAuthn / Anti-Brute Badge */}
              <div className="space-y-2.5">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading || !identifier.trim() || !password.trim() || failedAttempts >= 5}
                  className={`w-full gap-2 mt-1 font-bold shadow-lg transition-all hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${accentStyles.button}`}
                >
                  {isLoading
                    ? "Authenticating…"
                    : failedAttempts >= 5
                    ? "Temporarily Locked · Wait 60s"
                    : `${t("common.signIn") || "Sign In"} to ${portalConfig.title}`}
                  {!isLoading && failedAttempts < 5 && <ArrowRight className="h-4 w-4" />}
                </Button>

                {/* WebAuthn / Session Hardening Badge */}
                <div className="flex items-center justify-center gap-3 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-md px-2 py-0.5 border border-slate-200">
                    <Fingerprint className="h-3 w-3 text-teal-500" aria-hidden />
                    WebAuthn Ready
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-md px-2 py-0.5 border border-slate-200">
                    <BadgeCheck className="h-3 w-3 text-emerald-500" aria-hidden />
                    Signed Session Cookie
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-md px-2 py-0.5 border border-slate-200">
                    <Languages className="h-3 w-3 text-indigo-500" aria-hidden />
                    i18n EN/FR
                  </span>
                </div>
              </div>

              {/* Request Facility Invite (available for clinical/rx portals) */}
              {portalType !== "patient" && portalType !== "super-admin" && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    <Shield className="h-3 w-3" />
                    {t("common.needAccount") || "Need a staff account?"}
                  </span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openInviteModal();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-black text-teal-700 hover:text-teal-800 hover:underline transition"
                  >
                    {t("common.requestInvite") || "Request Facility Invite"}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              )}
            </form>
          ) : (
          /* PATIENT REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                <Input
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Staff Member Full Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (MoMo)</label>
                <Input
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="024 412 3456"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghana Card (National ID)</label>
                <Input
                  value={regGhanaCard}
                  onChange={(e) => setRegGhanaCard(e.target.value)}
                  placeholder="GHA-71298412-1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <Input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create Password</label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="8+ characters"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className={`w-full gap-2 mt-3 font-bold shadow-md transition ${accentStyles.button}`}
            >
              Create Ghana Health Pass <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Security & Regulatory Compliance Footer */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5 text-teal-600" />
            <span>256-Bit TLS Multi-Tenant Encrypted Session</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {portalConfig.complianceBadge}
          </p>
        </div>
      </CardContent>
    </Card>

    {/* ================= Request Facility Invite Modal ================= */}
    {showInviteModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeInviteModal();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 via-white to-white flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-200">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h2
                  id="invite-modal-title"
                  className="text-lg font-black text-slate-900 tracking-tight"
                >
                  {t("common.requestInvite") || "Request Facility Invite"}
                </h2>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-sm">
                Hospital, clinic, or pharmacy administrators — submit your onboarding
                request and receive an instant 72-hour magic link for facility provisioning.
              </p>
            </div>
            <button
              type="button"
              onClick={closeInviteModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              aria-label="Close dialog"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Error Banner */}
            {inviteSubmitError && !inviteSubmitResult && (
              <div role="alert" className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in slide-in-from-top-2 fade-in duration-300">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{inviteSubmitError}</span>
              </div>
            )}

            {/* Success State */}
            {inviteSubmitResult ? (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in duration-300">
                  <div className="mt-0.5 shrink-0 rounded-full bg-emerald-100 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <h3 className="font-black text-sm text-emerald-900">
                      Invitation Created Successfully
                    </h3>
                    <p className="text-[11px] font-medium text-emerald-800/90 leading-relaxed">
                      A signed 72-hour onboarding magic link has been reserved for{" "}
                      <strong className="break-all">{inviteSubmitResult.admin_email}</strong> at{" "}
                      <strong>{inviteSubmitResult.company_name}</strong>.
                    </p>
                    <div className="mt-2 p-3 rounded-xl bg-white border border-emerald-200 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Onboarding Magic Link (Copy & Share)
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[11px] font-mono text-emerald-900 bg-emerald-50 rounded-lg px-2 py-1.5 border border-emerald-200/60 truncate break-all">
                          {inviteSubmitResult.onboarding_url}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyOnboardingUrl}
                          className="shrink-0 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                          title="Copy magic link to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resetInviteForm();
                    }}
                    className="text-[11px]"
                  >
                    Submit Another Facility
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={closeInviteModal}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-[11px]"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Invite Form */
              <form onSubmit={handleInviteSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Company Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Facility / Company Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <Input
                        value={inviteCompanyName}
                        onChange={(e) => setInviteCompanyName(e.target.value)}
                        placeholder="e.g. Ridge Regional Hospital, Accra"
                        className="text-xs pl-9 pr-3 text-slate-900 transition focus:shadow-md focus:shadow-teal-500/10"
                        required
                        maxLength={255}
                      />
                      <div className="absolute left-3 top-2.5 pointer-events-none rounded-full bg-slate-100 p-0.5 -m-0.5 group-focus-within:bg-teal-50 transition">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-teal-600 transition" />
                      </div>
                    </div>
                  </div>

                  {/* Admin Email */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Administrator Email <span className="text-rose-500">*</span>
                      </label>
                      {emailValidationState === "valid" && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Format OK
                        </span>
                      )}
                      {emailValidationState === "invalid" && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-rose-600" /> Invalid Email
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <Input
                        type="email"
                        value={inviteAdminEmail}
                        onChange={(e) => {
                          setInviteAdminEmail(e.target.value);
                          if (emailValidationState !== "idle") setEmailValidationState("idle");
                        }}
                        onBlur={handleInviteEmailBlur}
                        placeholder="admin@yourhospital.gov.gh"
                        className={`text-xs pl-9 pr-3 text-slate-900 transition focus:shadow-md focus:shadow-teal-500/10 ${
                          emailValidationState === "invalid" ? "ring-2 ring-rose-300 border-rose-300" : ""
                        }`}
                        required
                      />
                      <div className="absolute left-3 top-2.5 pointer-events-none rounded-full bg-slate-100 p-0.5 -m-0.5 group-focus-within:bg-teal-50 transition">
                        <Mail className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-teal-600 transition" />
                      </div>
                    </div>
                  </div>

                  {/* Admin Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admin Phone / MoMo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <Input
                        value={inviteAdminPhone}
                        onChange={(e) => setInviteAdminPhone(e.target.value)}
                        placeholder="+233 24 412 3456"
                        className="text-xs pl-9 pr-3 text-slate-900 transition focus:shadow-md focus:shadow-teal-500/10"
                        required
                        maxLength={30}
                      />
                      <div className="absolute left-3 top-2.5 pointer-events-none rounded-full bg-slate-100 p-0.5 -m-0.5 group-focus-within:bg-teal-50 transition">
                        <Phone className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-teal-600 transition" />
                      </div>
                    </div>
                  </div>

                  {/* Facility Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Facility Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={inviteTenantType}
                      onChange={(e) =>
                        setInviteTenantType(
                          e.target.value as "HOSPITAL" | "CLINIC" | "PHARMACY"
                        )
                      }
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none bg-no-repeat bg-right-[0.6rem] bg-center-y"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd' /%3E%3C/svg%3E\")", backgroundSize: "14px 14px" }}
                    >
                      <option value="HOSPITAL">Hospital (Inpatient)</option>
                      <option value="CLINIC">Clinic / Polyclinic (OPD)</option>
                      <option value="PHARMACY">Community Pharmacy / Dispensary</option>
                    </select>
                  </div>

                  {/* City & Country */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                    <Input
                      value={inviteCity}
                      onChange={(e) => setInviteCity(e.target.value)}
                      placeholder="Accra"
                      className="text-xs text-slate-900"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                    <Input
                      value={inviteCountry}
                      onChange={(e) => setInviteCountry(e.target.value)}
                      placeholder="Ghana"
                      className="text-xs text-slate-900"
                      maxLength={100}
                    />
                  </div>

                  {/* Optional Note */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Additional Note <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      value={inviteNote}
                      onChange={(e) => setInviteNote(e.target.value)}
                      placeholder="Brief note about your facility size, licenses, departments, or expected go-live timeline…"
                      rows={2}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-medium text-slate-400 max-w-[200px] leading-snug">
                    Magic links expire in 72 hours. One pending invite per admin email.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={closeInviteModal}
                      className="text-[11px]"
                      disabled={inviteIsSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      isLoading={inviteIsSubmitting}
                      disabled={inviteIsSubmitting || inviteSubmitThrottled}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] shadow-md shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {inviteIsSubmitting
                        ? "Submitting…"
                        : inviteSubmitThrottled
                        ? "Sending…"
                        : "Submit Invite Request"}
                      {!inviteIsSubmitting && !inviteSubmitThrottled && (
                        <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
