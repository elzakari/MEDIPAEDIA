"use client";

import React from "react";
import { LayoutDashboard, Users, Activity, Pill, Menu } from "lucide-react";

export interface MobileBottomNavTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  matchPrefixes?: string[];
  exact?: boolean;
  badge?: string | number;
}

export interface MobileBottomNavLinkProps {
  href: string;
  className?: string;
  tab?: MobileBottomNavTab;
  item?: unknown;
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

export interface MobileBottomNavProps {
  tabs?: MobileBottomNavTab[];
  onMenuClick?: () => void;
  activeTint?: string;
  safeAreaBottomPx?: number;
  pathname?: string | null;
  onNavigate?: (href: string, tab: MobileBottomNavTab) => void;
  LinkRenderer?: React.ComponentType<any>;
}

const DEFAULT_TABS: MobileBottomNavTab[] = [
  {
    id: "dashboard",
    label: "Command Center",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/hospital-admin",
    matchPrefixes: ["/hospital-admin"],
  },
  {
    id: "patients",
    label: "Patient Intake",
    icon: <Users className="h-5 w-5" />,
    href: "/reception",
    matchPrefixes: ["/reception", "/patients", "/registry"],
  },
  {
    id: "queue",
    label: "Live Queue / Triage",
    icon: <Activity className="h-5 w-5" />,
    href: "/triage",
    matchPrefixes: ["/triage", "/opd", "/doctor-workspace", "/appointments"],
  },
  {
    id: "pharmacy",
    label: "Meds / POS",
    icon: <Pill className="h-5 w-5" />,
    href: "/pharmacy",
    matchPrefixes: ["/pharmacy", "/dispensary", "/pos", "/rx"],
  },
];

const isTabActive = (tab: MobileBottomNavTab, pathname: string | null | undefined): boolean => {
  const href = tab.href || "";
  const prefixes: string[] = tab.matchPrefixes && tab.matchPrefixes.length > 0
    ? tab.matchPrefixes
    : [href];
  if (!pathname) return false;
  const normalized = pathname.replace(/\/$/, "") || "/";
  return prefixes.some(p => {
    const np = (p || "").replace(/\/$/, "") || "/";
    if (tab.exact || np === "/") return normalized === np;
    return normalized === np || normalized.startsWith(`${np}/`);
  });
};

const DefaultAnchor: React.FC<MobileBottomNavLinkProps> = ({
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

export function MobileBottomNav({
  tabs,
  onMenuClick,
  activeTint = "text-teal-700",
  safeAreaBottomPx,
  pathname,
  onNavigate,
  LinkRenderer,
}: MobileBottomNavProps) {
  const finalTabs: MobileBottomNavTab[] = (tabs && tabs.length > 0 ? tabs : DEFAULT_TABS).slice(0, 4);
  const Link: React.ComponentType<any> = (LinkRenderer as any) || DefaultAnchor;

  const [mounted, setMounted] = React.useState<boolean>(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const safePad: string = typeof safeAreaBottomPx === "number"
    ? `calc(env(safe-area-inset-bottom, 0px) + ${safeAreaBottomPx}px)`
    : `max(env(safe-area-inset-bottom, 0px), 8px)`;

  return (
    <nav
      role="navigation"
      aria-label="Primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 h-16 pb-safe flex items-center justify-around px-2"
      style={{ paddingBottom: safePad }}
    >
      {finalTabs.map((tab) => {
        const active = mounted && isTabActive(tab, pathname);
        return (
          <Link
            key={tab.id}
            href={tab.href || "#"}
            tab={tab}
            active={active}
            aria-current={active ? "page" : undefined}
            aria-label={tab.label}
            onClick={() => onNavigate?.(tab.href || "#", tab)}
            className="flex flex-col items-center justify-center flex-1 py-1 relative max-w-[72px] min-w-0 h-full"
          >
            <div className="flex flex-col items-center justify-center w-full h-full">
              <span className={active ? "text-teal-700 dark:text-teal-400" : "text-slate-400"}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium tracking-tight mt-1 truncate max-w-full px-1 ${active ? "font-bold text-teal-700 dark:text-teal-400" : "text-slate-500"}`}>
                {tab.label}
              </span>
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5 ${active ? "opacity-100" : "opacity-0"}`}
              />
            </div>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Menu"
        className="flex flex-col items-center justify-center flex-1 py-1 relative max-w-[72px] min-w-0 h-full"
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <span className="text-slate-400">
            <Menu className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium tracking-tight mt-1 text-slate-500">
            Menu
          </span>
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-transparent mt-0.5 opacity-0" />
        </div>
      </button>
    </nav>
  );
}

export { DEFAULT_TABS as DEFAULT_HOSPITAL_MOBILE_TABS };
