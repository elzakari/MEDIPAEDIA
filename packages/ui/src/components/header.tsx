"use client";

import React, { useState } from "react";

import { Building2, X, Menu, ChevronRight, Bell, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Badge } from "./badge";
import { MedipaediaLogo, MedipaediaIconMark, SubBrand } from "./logo";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { UserProfileData } from "./UserProfileModal";
import { BranchItem, BranchSwitcher } from "./BranchSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface HeaderNavLink {
  href: string;
  label: string;
}

export interface HeaderContextualTab {
  id: string;
  label: string;
  href?: string;
  matchPrefixes?: string[];
  icon?: React.ReactNode;
  exact?: boolean;
  target?: string;
  onClick?: () => void;
  rel?: string;
}

export interface HeaderBreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderPrimaryCta {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  target?: string;
  rel?: string;
}

export interface HeaderProps {
  appName?: string;
  subBrand?: SubBrand;
  appSubtitle?: string;
  tenantName?: string;
  tenantType?: "HOSPITAL" | "CLINIC" | "PHARMACY" | "PLATFORM";
  userName?: string;
  userRole?: string;
  userInitials?: string;
  navLinks?: HeaderNavLink[];
  userProfile?: UserProfileData;
  adminDeskHref?: string;
  superAdminHref?: string;
  branches?: BranchItem[];
  currentBranchId?: string;
  planCode?: string;
  planName?: string;
  defaultTenantName?: string;
  onSelectBranch?: (branchId: string) => void;
  onAddBranchClick?: () => void;
  onLogout?: () => Promise<void> | void;
  onUpdateProfile?: (data: any) => Promise<void>;
  onChangePassword?: (data: any) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  primaryLaunchLabel?: string;
  primaryLaunchHref?: string;
  primaryLaunchIcon?: React.ReactNode;
  onNotificationClick?: () => void;
  notificationCount?: number;
  branchLabel?: string;
  pageTitle?: string;
  breadcrumb?: HeaderBreadcrumbItem[];
  contextualTabs?: HeaderContextualTab[];
  primaryCta?: HeaderPrimaryCta;
  onMobileDrawerOpen?: () => void;
  /** Render the secondary contextual-tabs row below the main header bar. When false (default), the row is suppressed entirely — useful for layouts where ClinicalSidebar already owns primary navigation. */
  showContextualTabs?: boolean;
}

const isTabActive = (
  tab: HeaderContextualTab,
  pathname: string | null | undefined,
): boolean => {
  const href = tab.href || "";
  const prefixes: string[] = tab.matchPrefixes && tab.matchPrefixes.length > 0 ? tab.matchPrefixes : [href];
  if (!pathname) return false;
  const normalized = String(pathname).replace(/\/$/, "") || "/";
  return prefixes.some((pRaw) => {
    const p = String(pRaw || "").replace(/\/$/, "") || "/";
    if (tab.exact) return normalized === p;
    if (p === "/") return normalized === "/";
    return normalized === p || normalized.startsWith(`${p}/`);
  });
};

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

export function Header({
  appName,
  subBrand = "none",
  appSubtitle,
  tenantName,
  tenantType = "HOSPITAL",
  userName,
  userRole = "DOCTOR",
  userInitials,
  navLinks,
  userProfile,
  adminDeskHref,
  superAdminHref = "/super-admin",
  branches,
  currentBranchId,
  planCode,
  planName,
  defaultTenantName,
  onSelectBranch,
  onAddBranchClick,
  onLogout,
  onUpdateProfile,
  onChangePassword,
  onRevokeAllSessions,
  primaryLaunchLabel,
  primaryLaunchHref,
  primaryLaunchIcon,
  onNotificationClick,
  notificationCount,
  branchLabel,
  pageTitle,
  breadcrumb,
  contextualTabs,
  primaryCta,
  onMobileDrawerOpen,
  showContextualTabs,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const detectedPathname = useClientPathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  let resolvedSubBrand: SubBrand = subBrand;
  if (resolvedSubBrand === "none" && appName) {
    const lower = appName.toLowerCase();
    if (lower.includes("clinical") || lower.includes("hospital")) resolvedSubBrand = "clinical";
    else if (lower.includes("rx") || lower.includes("pos") || lower.includes("pharmacy")) resolvedSubBrand = "rx";
    else if (lower.includes("care") || lower.includes("patient")) resolvedSubBrand = "care";
  }

  // Backward compatibility: convert navLinks -> contextualTabs ONLY when caller hasn't passed contextualTabs at all.
  // If contextualTabs was passed explicitly (even as [] or undefined from a spread), trust caller's suppression and do NOT auto-generate from navLinks.
  const contextualTabsExplicitlySet: boolean = Object.prototype.hasOwnProperty.call(
    Array.from(arguments).length > 0 ? Object(arguments[0] || {}) : {},
    "contextualTabs"
  );
  const convertedFromLegacy: HeaderContextualTab[] | undefined =
    !contextualTabsExplicitlySet && !contextualTabs && navLinks && navLinks.length > 0
      ? navLinks.map((l) => ({
          id: l.href,
          label: l.label,
          href: l.href,
          matchPrefixes: [l.href],
        }))
      : undefined;

  const rawContextualTabs: HeaderContextualTab[] | undefined =
    contextualTabs && contextualTabs.length > 0 ? contextualTabs : convertedFromLegacy;
  // Only render the 2nd nav row (desktop + mobile) when caller opts IN explicitly.
  // Default (undefined) = suppress because sidebar-using layouts already own primary navigation.
  const finalContextualTabs: HeaderContextualTab[] | undefined =
    showContextualTabs === true && rawContextualTabs && rawContextualTabs.length > 0 ? rawContextualTabs : undefined;

  const resolvedUserName = userName || "Clinician";
  const resolvedTenantName = tenantName || "Healthcare Facility";
  const effectiveUser: UserProfileData = userProfile || {
    userId: "usr-current",
    fullName: resolvedUserName,
    email: resolvedUserName.toLowerCase().replace(/[^a-z0-9]/g, ".") + "@medipaedia.health",
    role: userRole,
    tenantName: resolvedTenantName,
  };
  const effectiveTenantName = resolvedTenantName;

  // Prefer explicit primaryCta, otherwise fallback to legacy primaryLaunch* props
  const effectiveCta: HeaderPrimaryCta | undefined = primaryCta
    ? primaryCta
    : primaryLaunchLabel
      ? {
          label: primaryLaunchLabel,
          href: primaryLaunchHref,
          icon: primaryLaunchIcon,
        }
      : undefined;

  const hasCta = Boolean(effectiveCta && (effectiveCta.href || effectiveCta.onClick));

  const computedInitials = (() => {
    if (userInitials && userInitials.trim()) return userInitials.trim().slice(0, 2).toUpperCase();
    const src = effectiveUser.fullName || resolvedUserName || "U";
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  })();

  const roleLabel = (() => {
    const role = effectiveUser.role || userRole || "";
    const words = role.toLowerCase().split(/[\s_\-]+/).filter(Boolean);
    const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return title || "Staff";
  })();

  const currentBranchShortLabel = (() => {
    if (branchLabel) return branchLabel;
    if (branches && branches.length > 0) {
      const curr = branches.find((b) => String(b.id) === String(currentBranchId)) || branches[0];
      if (curr?.code) return curr.code;
      if (curr?.name) {
        const parts = curr.name.split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "M1";
      }
    }
    return "Acc-01";
  })();

  const mobileSubtitleLine = `${roleLabel} • ${currentBranchShortLabel}`;

  const handleLogout = onLogout || (async () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    }
    window.location.href = "/login?logout=true";
  });

  const openMobileDrawer = () => {
    setMobileMenuOpen(true);
    if (typeof onMobileDrawerOpen === "function") onMobileDrawerOpen();
  };

  const resolvedPageTitle = pageTitle || appName || (typeof tenantType === "string" ? `${tenantType} Workstation` : "Workstation");

  const renderCtaButton = (compact = false) => {
    if (!effectiveCta) return null;
    const ctaContent = (
      <>
        {effectiveCta.icon ? <span className="shrink-0">{effectiveCta.icon}</span> : null}
        <span className="truncate">{effectiveCta.label}</span>
      </>
    );
    const baseClass = compact
      ? "inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 shrink-0"
      : "flex items-center justify-center gap-2 w-full h-9 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow shadow-emerald-600/20";
    if (effectiveCta.href) {
      return (
        <a
          href={effectiveCta.href}
          target={effectiveCta.target}
          rel={effectiveCta.rel}
          onClick={effectiveCta.onClick ? (e) => { e.preventDefault(); effectiveCta.onClick?.(); } : undefined}
          className={baseClass}
          title={effectiveCta.label}
        >
          {ctaContent}
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={effectiveCta.onClick}
        className={baseClass}
        title={effectiveCta.label}
      >
        {ctaContent}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* Mobile Top Bar (< md) — hamburger / page title / notifications */}
      <div className="md:hidden flex h-14 max-w-full items-center justify-between px-3 gap-2">
        <button
          type="button"
          aria-label="Open Navigation Menu"
          onClick={openMobileDrawer}
          className="w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 flex flex-col items-center min-w-0 px-2">
          <span
            className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-[220px] leading-tight"
            title={resolvedPageTitle}
          >
            {resolvedPageTitle}
          </span>
          {breadcrumb && breadcrumb.length > 0 ? (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] leading-tight flex items-center gap-1">
              {breadcrumb.map((b, i) => (
                <React.Fragment key={`${b.label}-${i}`}>
                  {i > 0 ? (
                    <ChevronRightIcon className="h-3 w-3 text-slate-400 shrink-0" />
                  ) : null}
                  <span className="truncate">{b.label}</span>
                </React.Fragment>
              ))}
            </span>
          ) : (
            <span
              className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] leading-tight"
              title={effectiveTenantName}
            >
              {effectiveTenantName}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNotificationClick}
          aria-label="Notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
        >
          <Bell className="h-4 w-4" />
          {typeof notificationCount === "number" && notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Shell (md+) — LEFT (hamburger, identity, title) + RIGHT (CTA, separator, language, avatar) */}
      <div className="hidden md:flex flex-col w-full">
        <div className="flex h-16 max-w-full items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 lg:gap-4 w-full">
          {/* LEFT ZONE */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={openMobileDrawer}
              className="md:hidden xl:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              <MedipaediaIconMark size="sm" />
              <div className="flex flex-col min-w-0 max-w-[260px]">
                <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {resolvedPageTitle}
                </span>
                {breadcrumb && breadcrumb.length > 0 ? (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight flex items-center gap-1">
                    {breadcrumb.map((b, i) => (
                      <React.Fragment key={`${b.label}-${i}`}>
                        {i > 0 ? (
                          <ChevronRightIcon className="h-3 w-3 text-slate-400 shrink-0" />
                        ) : null}
                        <span className="truncate">
                          {b.href ? (
                            <a href={b.href} className="hover:text-teal-700 dark:hover:text-teal-400 transition">
                              {b.label}
                            </a>
                          ) : (
                            b.label
                          )}
                        </span>
                      </React.Fragment>
                    ))}
                  </span>
                ) : appSubtitle ? (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {appSubtitle}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* RIGHT ZONE — CTA → Separator → LanguageSwitcher → UserProfileDropdown */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            {hasCta && renderCtaButton(true)}

            {hasCta && (
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" aria-hidden="true" />
            )}

            <LanguageSwitcher />

            <UserProfileDropdown
              user={effectiveUser}
              adminDeskHref={adminDeskHref}
              superAdminHref={superAdminHref}
              onLogout={handleLogout}
              onUpdateProfile={onUpdateProfile as any}
              onChangePassword={onChangePassword as any}
              onRevokeAllSessions={onRevokeAllSessions}
            />
          </div>
        </div>

        {/* CENTER / SECONDARY ROW — Contextual Page Tabs (horizontal scrollable pills) */}
        {finalContextualTabs && finalContextualTabs.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-900 px-4 sm:px-6 lg:px-8">
            <nav
              className="no-scrollbar overflow-x-auto flex gap-2 pb-1 scrollbar-none snap-x snap-mandatory py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              aria-label="Contextual page sections"
            >

              {finalContextualTabs.map((tab) => {
                const active = mounted && isTabActive(tab, detectedPathname);
                const content = (
                  <>
                    {tab.icon ? <span className="shrink-0 -ml-0.5 mr-1">{tab.icon}</span> : null}
                    <span className="truncate whitespace-nowrap">{tab.label}</span>
                  </>
                );
                const classes = `snap-start shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  active
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20"
                    : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-200 dark:hover:border-teal-900"
                }`;
                if (tab.href && !tab.onClick) {
                  return (
                    <a
                      key={tab.id}
                      href={tab.href}
                      target={tab.target}
                      rel={tab.rel}
                      className={classes}
                      aria-current={active ? "page" : undefined}
                      title={tab.label}
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={tab.onClick}
                    className={classes}
                    aria-current={active ? "page" : undefined}
                    title={tab.label}
                  >
                    {content}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Contextual Tabs — Mobile Row (under topbar, only if tabs exist) */}
      {finalContextualTabs && finalContextualTabs.length > 0 && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-900 px-3">
          <nav
            className="no-scrollbar overflow-x-auto flex gap-2 pb-1 scrollbar-none snap-x snap-mandatory py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            aria-label="Contextual page sections"
          >
            {finalContextualTabs.map((tab) => {
              const active = mounted && isTabActive(tab, detectedPathname);
              const content = (
                <>
                  {tab.icon ? <span className="shrink-0 -ml-0.5 mr-1">{tab.icon}</span> : null}
                  <span className="truncate whitespace-nowrap">{tab.label}</span>
                </>
              );
              const classes = `snap-start shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                active
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20"
                  : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-200 dark:hover:border-teal-900"
              }`;
              if (tab.href && !tab.onClick) {
                return (
                  <a
                    key={tab.id}
                    href={tab.href}
                    target={tab.target}
                    rel={tab.rel}
                    className={classes}
                    aria-current={active ? "page" : undefined}
                    title={tab.label}
                  >
                    {content}
                  </a>
                );
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.onClick}
                  className={classes}
                  aria-current={active ? "page" : undefined}
                  title={tab.label}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <MedipaediaLogo
                  href="/"
                  size="sm"
                  variant="icon-only"
                  subBrand={resolvedSubBrand}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {tenantType}
                  </div>
                  <div
                    className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate"
                    title={effectiveTenantName}
                  >
                    {effectiveTenantName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                aria-label="Close Navigation Menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <Building2 className="h-4 w-4 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <div
                    className="font-extrabold text-slate-800 dark:text-slate-100 truncate"
                    title={effectiveTenantName}
                  >
                    {effectiveTenantName}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {appName || "Workstation"}
                    {appSubtitle ? ` · ${appSubtitle}` : ""}
                  </div>
                </div>
                <Badge variant="teal" className="text-[9px] uppercase py-0 px-1.5 ml-auto shrink-0 font-bold">
                  {tenantType}
                </Badge>
              </div>
            </div>

            {/* Contextual Tabs inside mobile drawer (replacing the old primary navLinks drawer section) */}
            {finalContextualTabs && finalContextualTabs.length > 0 && (
              <nav className="flex flex-col gap-1.5 p-4 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">
                  Workspaces
                </div>
                {finalContextualTabs.map((tab) => {
                  const active = mounted && isTabActive(tab, detectedPathname);
                  const content = (
                    <>
                      {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
                      <span className="truncate">{tab.label}</span>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 ml-auto shrink-0" />
                    </>
                  );
                  const classes = `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    active
                      ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900"
                      : "text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 border-transparent hover:border-teal-100 dark:hover:border-teal-900"
                  }`;
                  if (tab.href && !tab.onClick) {
                    return (
                      <a
                        key={tab.id}
                        href={tab.href}
                        target={tab.target}
                        rel={tab.rel}
                        onClick={() => setMobileMenuOpen(false)}
                        className={classes}
                        title={tab.label}
                      >
                        {content}
                      </a>
                    );
                  }
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setMobileMenuOpen(false); tab.onClick?.(); }}
                      className={classes}
                      title={tab.label}
                    >
                      {content}
                    </button>
                  );
                })}
              </nav>
            )}

            {hasCta && (
              <div className="px-4 pt-4 pb-2">
                {renderCtaButton(false)}
              </div>
            )}

            <div className="mt-auto border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              <LanguageSwitcher />
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <UserProfileDropdown
                  user={effectiveUser}
                  adminDeskHref={adminDeskHref}
                  superAdminHref={superAdminHref}
                  onLogout={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  onUpdateProfile={onUpdateProfile as any}
                  onChangePassword={onChangePassword as any}
                  onRevokeAllSessions={onRevokeAllSessions}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
