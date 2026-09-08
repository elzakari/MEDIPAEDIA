"use client";

import React, { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Users,
  Activity,
  Stethoscope,
  Pill,
  CreditCard,
  ShieldCheck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  Settings,
  FolderClock,
  Layers,
} from "lucide-react";
import { MedipaediaLogo, MedipaediaIconMark, SubBrand } from "./logo";
import { Badge } from "./badge";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { UserProfileData } from "./UserProfileModal";

export interface ClinicalSidebarNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  matchPrefixes?: string[];
  badge?: string | number;
  exact?: boolean;
}

export interface ClinicalSidebarLinkProps {
  href: string;
  className?: string;
  item?: ClinicalSidebarNavItem;
  tab?: unknown;
  active?: boolean;
  collapsed?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
  title?: string;
  target?: string;
  rel?: string;
}

export interface ClinicalSidebarProps {
  subBrand?: SubBrand;
  role?: string;
  navItems?: ClinicalSidebarNavItem[];
  tenantName?: string;
  branchLabel?: string;
  tenantId?: string;
  userProfile?: UserProfileData;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  defaultCollapsed?: boolean;
  adminDeskHref?: string;
  superAdminHref?: string;
  onLogout?: () => Promise<void> | void;
  onUpdateProfile?: (data: any) => Promise<void>;
  onChangePassword?: (data: any) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  pathname?: string | null;
  onNavigate?: (href: string, item: ClinicalSidebarNavItem) => void;
  LinkRenderer?: React.ComponentType<any>;
}

type SidebarRole =
  | "RECEPTION"
  | "NURSE"
  | "DOCTOR"
  | "PHARMACIST"
  | "HOSPITAL_FINANCE"
  | "HOSPITAL_ADMIN"
  | "PHARMACY_ADMIN"
  | "SUPERINTENDENT"
  | "PHARMACY_FINANCE"
  | "PATIENT"
  | "DEFAULT";

const resolveRoleKey = (roleRaw: string | undefined): SidebarRole => {
  if (!roleRaw) return "DEFAULT";
  const upper = String(roleRaw).toUpperCase().replace(/[\s\-_]+/g, "_");
  if (upper.includes("RECEPTION") || upper.includes("RECORD") || upper.includes("REGISTRAR")) return "RECEPTION";
  if (upper.includes("NURSE") || upper.includes("TRIAGE")) return "NURSE";
  if (upper.includes("DOCTOR") || upper.includes("PHYSICIAN") || upper.includes("CONSULTANT")) return "DOCTOR";
  if (upper.includes("PHARMACIST") || upper.includes("DISPENS")) return "PHARMACIST";
  if (upper.includes("FINANCE") || upper.includes("CASHIER") || upper.includes("BILLING")) return "HOSPITAL_FINANCE";
  if (upper.includes("HOSPITAL_ADMIN") || upper === "ADMIN" || upper.includes("SCHOOL_ADMIN")) return "HOSPITAL_ADMIN";
  if (upper.includes("PHARMACY_ADMIN")) return "PHARMACY_ADMIN";
  if (upper.includes("SUPERINTENDENT")) return "SUPERINTENDENT";
  if (upper.includes("PHARMACY_FINANCE")) return "PHARMACY_FINANCE";
  if (upper.includes("PATIENT")) return "PATIENT";
  return "DEFAULT";
};

const DEFAULT_NAV: Record<SidebarRole, ClinicalSidebarNavItem[]> = {
  RECEPTION: [
    { id: "intake", label: "Reception & Intake", icon: <Users className="h-5 w-5" />, href: "/reception", matchPrefixes: ["/reception", "/patients", "/registry", "/outpatient"] },
    { id: "folders", label: "Physical Folders", icon: <FolderClock className="h-5 w-5" />, href: "/reception/folders", matchPrefixes: ["/reception/folders"] },
  ],
  NURSE: [
    { id: "station", label: "Station Overview", icon: <LayoutDashboard className="h-5 w-5" />, href: "/nurse", matchPrefixes: ["/nurse"], exact: true },
    { id: "triage", label: "Triage & ESI", icon: <Activity className="h-5 w-5" />, href: "/nurse/triage", matchPrefixes: ["/nurse/triage", "/triage"] },
    { id: "wards", label: "Inpatient Wards", icon: <Layers className="h-5 w-5" />, href: "/nurse/wards", matchPrefixes: ["/nurse/wards"] },
    { id: "emar", label: "eMAR Workstation", icon: <Pill className="h-5 w-5" />, href: "/nurse/emar", matchPrefixes: ["/nurse/emar"] },
    { id: "fluids", label: "Fluid Balance", icon: <CreditCard className="h-5 w-5" />, href: "/nurse/fluid-balance", matchPrefixes: ["/nurse/fluid-balance"] },
    { id: "handover", label: "SBAR Handover", icon: <FolderClock className="h-5 w-5" />, href: "/nurse/handover", matchPrefixes: ["/nurse/handover"] },
  ],
  DOCTOR: [
    { id: "consults", label: "Consultations", icon: <Stethoscope className="h-5 w-5" />, href: "/doctor", matchPrefixes: ["/doctor", "/consultations"], exact: true },
    { id: "queue", label: "Waiting Queue", icon: <Activity className="h-5 w-5" />, href: "/doctor/queue", matchPrefixes: ["/doctor/queue"] },
    { id: "soap", label: "SOAP Encounter", icon: <Users className="h-5 w-5" />, href: "/consultations/new", matchPrefixes: ["/consultations/new"] },
    { id: "rx", label: "E-Prescriptions", icon: <Pill className="h-5 w-5" />, href: "/doctor/prescriptions", matchPrefixes: ["/doctor/prescriptions", "/prescriptions"] },
  ],
  PHARMACIST: [
    { id: "pos", label: "POS Dispensary", icon: <Pill className="h-5 w-5" />, href: "/dispensary/pos", matchPrefixes: ["/dispensary/pos", "/pos", "/rx"] },
    { id: "inventory", label: "Inventory", icon: <Layers className="h-5 w-5" />, href: "/dispensary/inventory", matchPrefixes: ["/dispensary/inventory", "/inventory"] },
    { id: "verify", label: "Script Verify", icon: <ShieldCheck className="h-5 w-5" />, href: "/dispensary/verify", matchPrefixes: ["/dispensary/verify", "/verify"] },
    { id: "controlled", label: "Controlled Drugs", icon: <FolderClock className="h-5 w-5" />, href: "/dispensary/controlled-drugs", matchPrefixes: ["/dispensary/controlled-drugs", "/controlled-drugs"] },
    { id: "finances", label: "Finances", icon: <CreditCard className="h-5 w-5" />, href: "/dispensary/finances", matchPrefixes: ["/dispensary/finances"] },
    { id: "fulfillment", label: "Fulfillment", icon: <Building2 className="h-5 w-5" />, href: "/dispensary/fulfillment", matchPrefixes: ["/dispensary/fulfillment", "/fulfillment"] },
  ],
  HOSPITAL_FINANCE: [
    { id: "overview", label: "Financial Overview", icon: <LayoutDashboard className="h-5 w-5" />, href: "/hospital-finance", matchPrefixes: ["/hospital-finance"], exact: true },
    { id: "cashier", label: "Cashier POS", icon: <CreditCard className="h-5 w-5" />, href: "/hospital-finance/cashier", matchPrefixes: ["/hospital-finance/cashier"] },
    { id: "shifts", label: "Drawer & Shifts", icon: <FolderClock className="h-5 w-5" />, href: "/hospital-finance/shifts", matchPrefixes: ["/hospital-finance/shifts"] },
    { id: "claims", label: "Insurance & NHIS", icon: <ShieldCheck className="h-5 w-5" />, href: "/hospital-finance/claims", matchPrefixes: ["/hospital-finance/claims"] },
    { id: "fees", label: "Fee Schedule", icon: <Layers className="h-5 w-5" />, href: "/hospital-finance/fee-schedule", matchPrefixes: ["/hospital-finance/fee-schedule"] },
  ],
  HOSPITAL_ADMIN: [
    {
      id: "dashboard",
      label: "Command Center",
      icon: <LayoutDashboard className="h-4 w-4" />,
      href: "/hospital-admin",
      matchPrefixes: ["/hospital-admin"],
      exact: true,
    },
    {
      id: "staff",
      label: "Staff Workforce",
      icon: <Users className="h-4 w-4" />,
      href: "/hospital-admin/staff",
      matchPrefixes: ["/hospital-admin/staff"],
    },
    {
      id: "roster",
      label: "Shift Roster",
      icon: <FolderClock className="h-4 w-4" />,
      href: "/hospital-admin/roster",
      matchPrefixes: ["/hospital-admin/roster"],
    },
    {
      id: "wards",
      label: "Wards & Theatres",
      icon: <Building2 className="h-4 w-4" />,
      href: "/hospital-admin/departments",
      matchPrefixes: ["/hospital-admin/departments"],
    },
    {
      id: "billing",
      label: "Billing & Gateways",
      icon: <CreditCard className="h-4 w-4" />,
      href: "/hospital-admin/billing-settings",
      matchPrefixes: ["/hospital-admin/billing-settings"],
    },
    {
      id: "tariffs",
      label: "Tariff Master",
      icon: <ClipboardCheck className="h-4 w-4" />,
      href: "/hospital-admin/tariffs",
      matchPrefixes: ["/hospital-admin/tariffs"],
    },
    {
      id: "quality",
      label: "Quality & Risk",
      icon: <ShieldCheck className="h-4 w-4" />,
      href: "/hospital-admin/quality",
      matchPrefixes: ["/hospital-admin/quality"],
    },
  ],
  PHARMACY_ADMIN: [
    { id: "dashboard", label: "Executive Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, href: "/pharmacy-admin", matchPrefixes: ["/pharmacy-admin"], exact: true },
    { id: "procurement", label: "Procurement & POs", icon: <Layers className="h-5 w-5" />, href: "/pharmacy-admin/procurement", matchPrefixes: ["/pharmacy-admin/procurement"] },
    { id: "transfers", label: "Multi-Branch Transfers", icon: <Building2 className="h-5 w-5" />, href: "/pharmacy-admin/transfers", matchPrefixes: ["/pharmacy-admin/transfers"] },
    { id: "audits", label: "Stock Audits", icon: <FolderClock className="h-5 w-5" />, href: "/pharmacy-admin/audits", matchPrefixes: ["/pharmacy-admin/audits"] },
    { id: "pricing", label: "Pricing & Margins", icon: <CreditCard className="h-5 w-5" />, href: "/pharmacy-admin/pricing", matchPrefixes: ["/pharmacy-admin/pricing"] },
    { id: "staff", label: "Staff & Licensing", icon: <Users className="h-5 w-5" />, href: "/pharmacy-admin/staff", matchPrefixes: ["/pharmacy-admin/staff"] },
    { id: "branches", label: "Branches", icon: <Building2 className="h-5 w-5" />, href: "/pharmacy-admin/branches", matchPrefixes: ["/pharmacy-admin/branches"] },
    { id: "settings", label: "Store & Hardware", icon: <Settings className="h-5 w-5" />, href: "/pharmacy-admin/settings", matchPrefixes: ["/pharmacy-admin/settings"] },
  ],
  SUPERINTENDENT: [
    { id: "compliance", label: "Compliance", icon: <ShieldCheck className="h-5 w-5" />, href: "/superintendent/compliance", matchPrefixes: ["/superintendent/compliance"] },
    { id: "coldchain", label: "Cold Chain", icon: <Activity className="h-5 w-5" />, href: "/superintendent/cold-chain", matchPrefixes: ["/superintendent/cold-chain"] },
    { id: "controlled", label: "Controlled Drugs", icon: <FolderClock className="h-5 w-5" />, href: "/superintendent/controlled-drugs", matchPrefixes: ["/superintendent/controlled-drugs"] },
    { id: "narcotics", label: "Narcotics Register", icon: <Pill className="h-5 w-5" />, href: "/superintendent/narcotics", matchPrefixes: ["/superintendent/narcotics"] },
    { id: "quarantine", label: "Quarantine", icon: <Layers className="h-5 w-5" />, href: "/superintendent/quarantine", matchPrefixes: ["/superintendent/quarantine"] },
    { id: "pv", label: "Pharmacovigilance", icon: <Stethoscope className="h-5 w-5" />, href: "/superintendent/pharmacovigilance", matchPrefixes: ["/superintendent/pharmacovigilance"] },
    { id: "compounding", label: "Compounding Suite", icon: <Building2 className="h-5 w-5" />, href: "/superintendent/compounding", matchPrefixes: ["/superintendent/compounding"] },
  ],
  PHARMACY_FINANCE: [
    { id: "escrow", label: "Escrow Ledger", icon: <CreditCard className="h-5 w-5" />, href: "/pharmacy-finance/escrow-ledger", matchPrefixes: ["/pharmacy-finance/escrow-ledger"] },
    { id: "payouts", label: "Payouts", icon: <Layers className="h-5 w-5" />, href: "/pharmacy-finance/payouts", matchPrefixes: ["/pharmacy-finance/payouts"] },
  ],
  PATIENT: [
    { id: "overview", label: "Health Overview", icon: <LayoutDashboard className="h-5 w-5" />, href: "/dashboard", matchPrefixes: ["/dashboard"] },
    { id: "appointments", label: "Appointments", icon: <Activity className="h-5 w-5" />, href: "/appointments", matchPrefixes: ["/appointments"] },
    { id: "cards", label: "Hospital Cards", icon: <CreditCard className="h-5 w-5" />, href: "/cards", matchPrefixes: ["/cards"] },
    { id: "prescriptions", label: "Prescriptions", icon: <Pill className="h-5 w-5" />, href: "/prescriptions", matchPrefixes: ["/prescriptions"] },
    { id: "diagnostics", label: "Diagnostics & Labs", icon: <FolderClock className="h-5 w-5" />, href: "/diagnostics", matchPrefixes: ["/diagnostics"] },
    { id: "orders", label: "Orders & Meds", icon: <Layers className="h-5 w-5" />, href: "/orders", matchPrefixes: ["/orders", "/marketplace", "/checkout"] },
  ],
  DEFAULT: [
    { id: "dashboard", label: "Command Center", icon: <LayoutDashboard className="h-5 w-5" />, href: "/hospital-admin", matchPrefixes: ["/hospital-admin", "/clinical", "/"] },
    { id: "reception", label: "Reception & Intake", icon: <Users className="h-5 w-5" />, href: "/reception", matchPrefixes: ["/reception", "/patients"] },
    { id: "triage", label: "Triage & Vitals", icon: <Activity className="h-5 w-5" />, href: "/triage", matchPrefixes: ["/triage"] },
    { id: "doctor", label: "Doctor Consultations", icon: <Stethoscope className="h-5 w-5" />, href: "/doctor", matchPrefixes: ["/doctor", "/consultations"] },
    { id: "rx", label: "E-Prescriptions & Pharmacy", icon: <Pill className="h-5 w-5" />, href: "/pharmacy-admin", matchPrefixes: ["/doctor/prescriptions", "/pharmacy-admin", "/pharmacy", "/dispensary"] },
    { id: "finance", label: "Billing & Cashier", icon: <CreditCard className="h-5 w-5" />, href: "/hospital-finance", matchPrefixes: ["/hospital-finance"] },
    { id: "admin", label: "Facility Administration", icon: <ShieldCheck className="h-5 w-5" />, href: "/hospital-admin/staff", matchPrefixes: ["/hospital-admin/governance", "/hospital-admin/billing", "/hospital-admin/billing-settings", "/hospital-admin/staff", "/hospital-admin/roster", "/hospital-admin/shift-roster", "/hospital-admin/departments", "/hospital-admin/wards", "/hospital-admin/tariffs", "/hospital-admin/tariff-master", "/hospital-admin/quality", "/hospital-admin/settings", "/hospital-admin/administration"] },
  ],
};

const isItemActive = (
  item: ClinicalSidebarNavItem,
  pathname: string | null | undefined,
): boolean => {
  const href = item.href || "";
  const prefixes: string[] = item.matchPrefixes && item.matchPrefixes.length > 0 ? item.matchPrefixes : [href];
  if (!pathname) return false;
  const normalized = String(pathname).replace(/\/$/, "") || "/";
  return prefixes.some((pRaw) => {
    const p = String(pRaw || "").replace(/\/$/, "") || "/";
    if (item.exact) return normalized === p;
    if (p === "/") return normalized === "/";
    return normalized === p || normalized.startsWith(`${p}/`);
  });
};

const DefaultAnchor: React.FC<ClinicalSidebarLinkProps> = ({
  href,
  className,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  title,
  target,
  rel,
  onClick,
  children,
}) => (
  <a
    href={href}
    onClick={onClick}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    title={title}
    target={target}
    rel={rel}
    className={className}
  >
    {children}
  </a>
);

const useClientPathname = (): string | null => {
  const [path, setPath] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => setPath(window.location.pathname || "/");
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  return path;
};

export function ClinicalSidebar({
  subBrand = "clinical",
  role,
  navItems,
  tenantName,
  branchLabel,
  userProfile,
  userName,
  userRole,
  userInitials,
  defaultCollapsed = false,
  adminDeskHref = "/hospital-admin",
  superAdminHref = "/super-admin",
  onLogout,
  onUpdateProfile,
  onChangePassword,
  onRevokeAllSessions,
  pathname: pathnameProp,
  onNavigate,
  LinkRenderer,
}: ClinicalSidebarProps) {
  const detectedPathname = useClientPathname();
  const currentPath = pathnameProp !== undefined && pathnameProp !== null ? pathnameProp : detectedPathname;

  const [mounted, setMounted] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);

  useEffect(() => {
    setMounted(true);
    try {
      if (window.localStorage.getItem("medipaedia_sidebar_collapsed") === "true") {
        setIsCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("medipaedia_sidebar_collapsed", isCollapsed ? "true" : "false");
    } catch {
      /* ignore persistence errors */
    }
  }, [mounted, isCollapsed]);

  const roleKey = resolveRoleKey(role ?? userRole);
  const finalNavItems: ClinicalSidebarNavItem[] = navItems && navItems.length > 0 ? navItems : DEFAULT_NAV[roleKey] || DEFAULT_NAV.DEFAULT;
  const Link: React.ComponentType<any> = (LinkRenderer as any) || DefaultAnchor;

  const resolvedTenantName = tenantName || "Healthcare Facility";
  const resolvedBranchLabel = branchLabel || "Main";
  const resolvedUserName = userName || userProfile?.fullName || "Clinician";
  const resolvedUserRoleLabel = userRole || userProfile?.role || "Staff";

  const effectiveUser: UserProfileData = userProfile || {
    userId: "usr-sidebar-current",
    fullName: resolvedUserName,
    email: `${resolvedUserName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@medipaedia.health`,
    role: resolvedUserRoleLabel,
    tenantName: resolvedTenantName,
  };

  const computedInitials = (() => {
    if (userInitials && String(userInitials).trim()) return String(userInitials).trim().slice(0, 2).toUpperCase();
    const src = effectiveUser.fullName || resolvedUserName || "U";
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  })();

  const handleLogout: () => Promise<void> | void = onLogout || (async () => {
    if (typeof document !== "undefined") {
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("refresh_token");
        window.localStorage.removeItem("auth_token");
        window.localStorage.removeItem("user");
        window.sessionStorage.clear();
      } catch {
        /* ignore */
      }
      window.location.href = "/login?logout=true";
    }
  });

  const widthClass = isCollapsed ? "w-16" : "w-60";

  return (
    <aside
      className={`hidden md:flex flex-col h-full min-h-full transition-all duration-300 ease-in-out shrink-0 bg-slate-950 text-slate-200 border-r border-slate-800 select-none ${widthClass}`}
      aria-label="Primary navigation"
    >
      {/* Brand / Header Block */}
      <div className="h-16 shrink-0 flex items-center justify-between border-b border-slate-800/80 px-3.5 bg-slate-950">
        {isCollapsed ? (
          <div className="flex-1 flex justify-center">
            <MedipaediaIconMark size="md" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <MedipaediaIconMark className="shrink-0" size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold tracking-tight text-slate-100 text-sm leading-tight truncate">
                Medipaedia
              </span>
              {subBrand !== "none" && (
                <Badge
                  variant={
                    subBrand === "rx" ? "success" : subBrand === "care" ? "cyan" : "teal"
                  }
                  className="text-[9px] uppercase py-0 px-1.5 font-bold tracking-wider w-fit mt-0.5 shrink-0"
                >
                  {subBrand === "clinical" ? "CLINICAL" : subBrand === "rx" ? "RX POS" : subBrand === "care" ? "CARE" : ""}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Collapse Toggle Button — Always visible, standard flex child pinned to the right */}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition ml-auto shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 scrollbar-none">
        {!isCollapsed && (
          <div className="text-slate-300 font-bold uppercase text-[10px] tracking-wider px-3 mb-2">
            Workspace
          </div>
        )}
        {finalNavItems.map((item) => {
          const active = mounted && isItemActive(item, currentPath);
          const label = item.label;
          return (
            <Link
              key={item.id}
              href={item.href || "#"}
              item={item}
              active={active}
              collapsed={isCollapsed}
              aria-current={active ? "page" : undefined}
              aria-label={isCollapsed ? label : undefined}
              title={isCollapsed ? label : undefined}
              onClick={() => onNavigate?.(item.href || "#", item)}
              className={`${isCollapsed ? "flex items-center justify-center w-full h-10 mx-auto" : "px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs"} ${
                active
                  ? (isCollapsed
                      ? "bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/40 shadow-sm"
                      : "bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40 shadow-sm"
                    )
                  : (isCollapsed
                      ? "text-slate-100 hover:text-white hover:bg-slate-800/80 rounded-xl"
                      : "text-slate-100 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
                    )
              } group shrink-0 transition-colors`}
            >
              <span className={`shrink-0 h-4 w-4 flex items-center justify-center transition-colors ${
                active ? "text-teal-300" : "text-slate-300 group-hover:text-teal-300"
              }`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 min-w-0 truncate text-xs">
                    {label}
                  </span>
                  {typeof item.badge !== "undefined" && item.badge !== null && item.badge !== "" && (
                    <span className="shrink-0 ml-1 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-rose-500/90 text-white text-[10px] font-bold px-1.5">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Dock — anchored */}
      <div className="shrink-0 border-t border-slate-800/80 p-2 space-y-2 bg-slate-950">
        {/* Tenant / Branch Card */}
        <div
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 bg-slate-900/80 border border-slate-800/80 ${
            isCollapsed ? "justify-center px-1 py-2" : "min-w-0"
          }`}
        >
          <Building2
            className="h-4 w-4 text-teal-400 shrink-0"
            aria-hidden="true"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-bold text-slate-100 truncate"
                title={resolvedTenantName}
              >
                {resolvedTenantName}
              </span>
              <span className="text-[10px] text-slate-400 truncate leading-tight">
                Branch · {resolvedBranchLabel}
              </span>
            </div>
          )}
        </div>

        {/* Profile Row */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-1.5">
            <div
              className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-teal-900/60 shrink-0"
              title={resolvedUserName}
            >
              {computedInitials}
            </div>
            <button
              type="button"
              onClick={() => { void handleLogout(); }}
              aria-label="Sign out"
              title="Sign out"
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-center shrink-0 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1.5 py-1 min-w-0">
            <UserProfileDropdown
              user={effectiveUser}
              adminDeskHref={adminDeskHref}
              superAdminHref={superAdminHref}
              onLogout={handleLogout}
              onUpdateProfile={onUpdateProfile as any}
              onChangePassword={onChangePassword as any}
              onRevokeAllSessions={onRevokeAllSessions}
              side="left"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
