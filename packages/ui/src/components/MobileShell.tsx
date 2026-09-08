"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Pill,
  Menu,
  Bell,
  Search,
  QrCode,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { MobileBottomNav, MobileBottomNavTab } from "./MobileBottomNav";

export interface MobileShellHeroAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export interface MobileShellHeroBanner {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  metric?: string;
  metricSuffix?: string;
  metricDelta?: string;
  metricDeltaPositive?: boolean;
  primaryAction?: MobileShellHeroAction;
  secondaryAction?: MobileShellHeroAction;
  totalPages?: number;
  activePage?: number;
}

export interface MobileShellSubTab {
  id: string;
  label: string;
  href?: string;
  exact?: boolean;
  matchPrefixes?: string[];
  onClick?: () => void;
  badge?: number | string;
}

export interface MobileShellFilterSection {
  title: string;
  filterLabel?: string;
  filterOptions?: { label: string; value: string }[];
  onFilterChange?: (value: string) => void;
  selectedFilter?: string;
  tabs: MobileShellSubTab[];
}

export interface MobileShellCardRailCard {
  id: string;
  title: string;
  subtitle?: string;
  metric?: string;
  metricLabel?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "teal" | "rose" | "amber" | "sky";
  href?: string;
  onClick?: () => void;
}

export interface MobileShellCardRail {
  id: string;
  sectionTitle: string;
  sectionIcon?: React.ReactNode;
  viewAllLabel?: string;
  viewAllHref?: string;
  onViewAll?: () => void;
  cards: MobileShellCardRailCard[];
}

export interface MobileShellProps {
  facilityName: string;
  roleBranchLabel: string;
  userName?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onQrScanClick?: () => void;
  heroBanner?: MobileShellHeroBanner;
  filterSection?: MobileShellFilterSection;
  cardRails?: MobileShellCardRail[];
  mobileBottomNavTabs?: MobileBottomNavTab[];
  onMenuClick?: () => void;
  onNavigate?: (href: string, item: any) => void;
  LinkRenderer?: React.ComponentType<any>;
  children?: React.ReactNode;
}

const isTabActive = (
  tab: MobileShellSubTab,
  pathname: string | null | undefined,
): boolean => {
  const href = tab.href || "";
  const prefixes = tab.matchPrefixes && tab.matchPrefixes.length > 0 ? tab.matchPrefixes : [href];
  if (!pathname) return false;
  const normalized = String(pathname).replace(/\/$/, "") || "/";
  return prefixes.some((pRaw) => {
    const p = String(pRaw || "").replace(/\/$/, "") || "/";
    if (tab.exact || p === "/") return normalized === p;
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

const resolveInitials = (userName?: string, userInitials?: string): string => {
  if (userInitials && String(userInitials).trim()) {
    return String(userInitials).trim().slice(0, 2).toUpperCase();
  }
  const src = userName || "U";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || "U";
};

const toneBg: Record<NonNullable<MobileShellCardRailCard["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-600",
  teal: "bg-teal-100 text-teal-700",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  sky: "bg-sky-100 text-sky-700",
};

const DefaultAnchor = ({
  href,
  onClick,
  className,
  children,
  "aria-label": ariaLabel,
  target,
  rel,
}: any) => (
  <a href={href} onClick={onClick} className={className} aria-label={ariaLabel} target={target} rel={rel}>
    {children}
  </a>
);

export function MobileShell({
  facilityName,
  roleBranchLabel,
  userName,
  userInitials,
  userAvatarUrl,
  notificationCount,
  onNotificationClick,
  onAvatarClick,
  searchPlaceholder = "Search patients, medicines, records…",
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onQrScanClick,
  heroBanner,
  filterSection,
  cardRails,
  mobileBottomNavTabs,
  onMenuClick,
  onNavigate,
  LinkRenderer,
  children,
}: MobileShellProps) {
  const Link: React.ComponentType<any> = (LinkRenderer as any) || DefaultAnchor;
  const initials = resolveInitials(userName, userInitials);
  const pathname = useClientPathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const safeAreaBottom: React.CSSProperties = {
    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
  };

  return (
    <div className="md:hidden flex flex-col min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* 1. Top Identity Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3 px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onAvatarClick}
            className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 overflow-hidden"
            aria-label="Account"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </button>

          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
              {facilityName}
            </span>
            <span className="text-[10px] text-slate-500 truncate">{roleBranchLabel}</span>
          </div>

          <button
            type="button"
            onClick={onNotificationClick}
            className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {typeof notificationCount === "number" && notificationCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* 2. Search & QR Scanner Bar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <form
            className="h-10 flex-1 rounded-xl bg-slate-100 dark:bg-slate-900 border-none px-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 flex items-center gap-2 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.(searchValue || "");
              setSearchOpen(false);
            }}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              value={searchValue ?? ""}
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-slate-400 min-w-0"
              aria-label="Search"
            />
            {searchOpen && searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="shrink-0 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </form>

          <button
            type="button"
            onClick={onQrScanClick}
            className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-teal-700 dark:text-teal-400 border border-slate-200/50 dark:border-slate-800"
            aria-label="QR scanner"
          >
            <QrCode className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* 3. Hero Metric / Priority Banner */}
      <div className="px-4 pt-4">
        {heroBanner ? (
          <div
            className="relative rounded-2xl p-4 bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white shadow-md overflow-hidden min-h-[120px] flex flex-col justify-between"
            aria-label="Priority banner"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-teal-400/10 blur-2xl"
            />
            <div className="relative z-10 space-y-1.5">
              {heroBanner.eyebrow ? (
                <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200/90">
                  {heroBanner.eyebrow}
                </div>
              ) : null}
              <div className="text-sm font-bold leading-tight">{heroBanner.title}</div>
              {heroBanner.subtitle ? (
                <div className="text-[11px] text-white/75 leading-snug">{heroBanner.subtitle}</div>
              ) : null}
              {heroBanner.metric ? (
                <div className="flex items-end gap-2 pt-1">
                  <div className="text-2xl font-black tracking-tight leading-none">
                    {heroBanner.metric}
                    {heroBanner.metricSuffix ? (
                      <span className="text-xs font-bold text-teal-300 ml-1">{heroBanner.metricSuffix}</span>
                    ) : null}
                  </div>
                  {heroBanner.metricDelta ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        heroBanner.metricDeltaPositive
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-rose-400/15 text-rose-300"
                      }`}
                    >
                      {heroBanner.metricDelta}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="relative z-10 flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                {heroBanner.primaryAction ? (
                  <Link
                    href={heroBanner.primaryAction.href || "#"}
                    onClick={heroBanner.primaryAction.onClick}
                    className="inline-flex items-center h-7 px-3 rounded-full bg-white text-teal-900 text-[10px] font-black shadow shrink-0"
                  >
                    {heroBanner.primaryAction.label}
                  </Link>
                ) : null}
                {heroBanner.secondaryAction ? (
                  <Link
                    href={heroBanner.secondaryAction.href || "#"}
                    onClick={heroBanner.secondaryAction.onClick}
                    className="inline-flex items-center h-7 px-3 rounded-full border border-white/25 text-white/90 text-[10px] font-semibold shrink-0 hover:bg-white/10"
                  >
                    {heroBanner.secondaryAction.label}
                  </Link>
                ) : null}
              </div>
              {heroBanner.totalPages && heroBanner.totalPages > 1 ? (
                <div className="flex items-center gap-1 self-end shrink-0">
                  {Array.from({ length: heroBanner.totalPages }).map((_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === (heroBanner.activePage ?? 0)
                          ? "w-5 bg-white"
                          : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* 4. Contextual Filter & Sub-Tab Pill Strip */}
      {filterSection ? (
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between gap-2 pb-2.5">
            <h2 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {filterSection.title}
            </h2>
            {filterSection.filterOptions && filterSection.filterOptions.length > 0 ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800"
                  aria-haspopup="listbox"
                  aria-expanded={filterOpen}
                >
                  <span>{filterSection.selectedFilter ? filterSection.filterOptions.find((o) => o.value === filterSection.selectedFilter)?.label : filterSection.filterLabel || "Filter"}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {filterOpen ? (
                  <div
                    role="listbox"
                    className="absolute right-0 mt-1.5 min-w-[140px] z-30 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg py-1 text-[11px]"
                  >
                    {filterSection.filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          filterSection.onFilterChange?.(opt.value);
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 ${
                          opt.value === filterSection.selectedFilter
                            ? "bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
            {filterSection.tabs.map((tab) => {
              const active = isTabActive(tab, pathname);
              const shared =
                "px-4 py-2 rounded-xl text-xs shrink-0 snap-start font-medium";
              const cls = active
                ? `${shared} bg-teal-700 text-white font-bold shadow-sm`
                : `${shared} bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200`;
              const content = (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && String(tab.badge).trim() !== "" ? (
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[9px] font-black ${
                        active ? "bg-white/20 text-white" : "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </span>
              );
              if (tab.onClick) {
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cls}
                    onClick={tab.onClick}
                    aria-current={active ? "page" : undefined}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link
                  key={tab.id}
                  href={tab.href || "#"}
                  onClick={() => onNavigate?.(tab.href || "#", tab)}
                  className={cls}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 5. Horizontal Card Carousel Rails */}
      {cardRails && cardRails.length > 0 ? (
        <div className="flex flex-col gap-5 pt-5">
          {cardRails.map((rail) => (
            <section key={rail.id} className="flex flex-col">
              <div className="px-4 flex items-center justify-between pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {rail.sectionIcon ? (
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      {rail.sectionIcon}
                    </div>
                  ) : null}
                  <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                    {rail.sectionTitle}
                  </h3>
                </div>
                {rail.viewAllLabel || rail.onViewAll || rail.viewAllHref ? (
                  <Link
                    href={rail.viewAllHref || "#"}
                    onClick={rail.onViewAll}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 shrink-0"
                  >
                    <span>{rail.viewAllLabel || "View All"}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : null}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4">
                {rail.cards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.href || "#"}
                    onClick={card.onClick}
                    className="min-w-[150px] max-w-[170px] shrink-0 snap-start rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm flex flex-col gap-2 hover:border-teal-300 dark:hover:border-teal-700/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          toneBg[card.tone || "neutral"]
                        }`}
                      >
                        {card.icon ?? <Pill className="w-4 h-4" />}
                      </div>
                      {card.metricLabel ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          {card.metricLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                        {card.title}
                      </div>
                      {card.subtitle ? (
                        <div className="text-[10px] text-slate-500 line-clamp-1">{card.subtitle}</div>
                      ) : null}
                    </div>
                    {card.metric ? (
                      <div className="pt-1 text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">
                        {card.metric}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* Page / Injected content (legacy page content continues below rails) */}
      {children ? (
        <div className="px-4 pt-5 pb-[104px] flex flex-col gap-5" style={safeAreaBottom} aria-label="Page content">
          {children}
        </div>
      ) : (
        <div className="pb-[104px]" aria-hidden="true" style={safeAreaBottom} />
      )}

      {/* 6. Fixed Mobile Bottom Navigation Bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-16 pb-safe flex items-center justify-around px-2"
        style={safeAreaBottom}
      >
        <MobileBottomNav
          tabs={mobileBottomNavTabs}
          onMenuClick={onMenuClick}
          onNavigate={onNavigate}
          LinkRenderer={LinkRenderer}
          safeAreaBottomPx={0}
        />
      </div>
    </div>
  );
}

export const DEFAULT_MOBILE_SHELL_TABS: MobileBottomNavTab[] = [
  { id: "command", label: "Dashboard", href: "/hospital-admin", icon: <LayoutDashboard className="w-[22px] h-[22px]" strokeWidth={2} />, matchPrefixes: ["/hospital-admin", "/"] },
  { id: "patients", label: "Patients", href: "/patients", icon: <Users className="w-[22px] h-[22px]" strokeWidth={2} />, matchPrefixes: ["/patients", "/reception"] },
  { id: "queue", label: "Queue", href: "/triage", icon: <Activity className="w-[22px] h-[22px]" strokeWidth={2} />, matchPrefixes: ["/triage", "/doctor/queue"] },
  { id: "pharmacy", label: "Pharmacy", href: "/pharmacy-admin", icon: <Pill className="w-[22px] h-[22px]" strokeWidth={2} />, matchPrefixes: ["/pharmacy-admin", "/pos", "/dispensary", "/doctor/prescriptions"] },
  { id: "menu", label: "More", href: "#menu", icon: <Menu className="w-[22px] h-[22px]" strokeWidth={2} />, matchPrefixes: [] },
];
