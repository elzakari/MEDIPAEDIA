"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, Layers, Pill, CreditCard, FolderClock, BedDouble, Thermometer, AlertTriangle, TrendingUp, ClipboardList, Users2, ChevronDown, ChevronRight } from "lucide-react";
import { Header, ClinicalSidebar, MobileBottomNav, useTranslation, HeaderContextualTab, MobileBottomNavTab, MobileBottomNavLinkProps, MobileShell, MobileShellHeroBanner, MobileShellFilterSection, MobileShellCardRail, MobileShellCardRailCard } from "@medipaedia/ui";
import { useAuth } from "@/context/AuthContext";

const NextLinkRenderer: React.FC<MobileBottomNavLinkProps> = ({
  href,
  className,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  onClick,
  children,
}) => (
  <Link
    href={href}
    onClick={onClick}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    className={className}
  >
    {children}
  </Link>
);

const NURSE_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "station",
    label: "Station Overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/nurse",
    matchPrefixes: ["/nurse"],
  },
  {
    id: "triage",
    label: "Triage & ESI",
    icon: <Activity className="h-5 w-5" />,
    href: "/nurse/triage",
    matchPrefixes: ["/nurse/triage", "/triage"],
  },
  {
    id: "wards",
    label: "Inpatient Wards",
    icon: <Layers className="h-5 w-5" />,
    href: "/nurse/wards",
    matchPrefixes: ["/nurse/wards"],
  },
  {
    id: "emar",
    label: "eMAR Workstation",
    icon: <Pill className="h-5 w-5" />,
    href: "/nurse/emar",
    matchPrefixes: ["/nurse/emar"],
  },
];

export default function NurseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, tenant } = useAuth();
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "station",
      label: t("nurse.stationOverview") || "Station Overview",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      href: "/nurse",
      matchPrefixes: ["/nurse"],
      exact: true,
    },
    {
      id: "triage",
      label: t("nurse.triageBoard") || "Triage & ESI Board",
      icon: <Activity className="h-3.5 w-3.5" />,
      href: "/nurse/triage",
      matchPrefixes: ["/nurse/triage"],
    },
    {
      id: "emar",
      label: t("nurse.eMARWorkstation") || "eMAR Workstation",
      icon: <Pill className="h-3.5 w-3.5" />,
      href: "/nurse/emar",
      matchPrefixes: ["/nurse/emar"],
    },
    {
      id: "wards",
      label: t("nurse.inpatientWards") || "Inpatient Wards",
      icon: <Layers className="h-3.5 w-3.5" />,
      href: "/nurse/wards",
      matchPrefixes: ["/nurse/wards"],
    },
    {
      id: "fluidBalance",
      label: t("nurse.fluidBalance") || "Fluid Balance",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      href: "/nurse/fluid-balance",
      matchPrefixes: ["/nurse/fluid-balance"],
    },
    {
      id: "handover",
      label: t("nurse.sbarHandover") || "SBAR Handover",
      icon: <FolderClock className="h-3.5 w-3.5" />,
      href: "/nurse/handover",
      matchPrefixes: ["/nurse/handover"],
    },
  ];

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Nurse"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Active Nurse Station",
    title: "32 Active Admissions",
    subtitle: "8 Vitals Due — 1 HR Alert pending",
    metric: "32",
    metricSuffix: "beds",
    metricDelta: "8 vitals due",
    metricDeltaPositive: false,
  };

  const filterSection: MobileShellFilterSection = {
    title: "Navigation Tabs",
    filterLabel: "All Sections",
    tabs: contextualTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      href: tab.href,
      exact: tab.exact,
      matchPrefixes: tab.matchPrefixes,
    })),
  };

  const quickStatsCards: MobileShellCardRailCard[] = [
    { id: "admissions", title: "Active Admissions", subtitle: "Inpatient census", metric: "32", metricLabel: "ACTIVE", icon: <BedDouble className="w-4 h-4" />, tone: "teal" },
    { id: "vitals-due", title: "Vitals Due Soon", subtitle: "Next 60 minutes", metric: "8", metricLabel: "DUE", icon: <Thermometer className="w-4 h-4" />, tone: "amber" },
    { id: "alerts", title: "HR Alert Escalate", subtitle: "Escalate to MO", metric: "1", metricLabel: "ALERT", icon: <AlertTriangle className="w-4 h-4" />, tone: "rose" },
    { id: "emar-due", title: "eMAR Doses Due", subtitle: "This shift", metric: "14", metricLabel: "MEDS", icon: <Pill className="w-4 h-4" />, tone: "sky" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "Vitals Recorded Ward 3", subtitle: "Bed 5 • Temp 38.2°C", metric: "4m ago", icon: <Thermometer className="w-4 h-4" />, tone: "amber", href: "/nurse/wards" },
    { id: "a2", title: "SBAR Handover Complete", subtitle: "Morning Shift • Ward 2", metric: "22m ago", icon: <FolderClock className="w-4 h-4" />, tone: "neutral", href: "/nurse/handover" },
    { id: "a3", title: "eMAR Administration", subtitle: "IV Amoxicillin • Bed 7", metric: "35m ago", icon: <Pill className="w-4 h-4" />, tone: "teal", href: "/nurse/emar" },
    { id: "a4", title: "ESI Triage Level 2", subtitle: "Chest pain • Red Zone", metric: "48m ago", icon: <Activity className="w-4 h-4" />, tone: "rose", href: "/nurse/triage" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "Station Overview", viewAllHref: "/nurse", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "Activity Log", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <aside className="shrink-0 h-full z-40">
          <ClinicalSidebar
          subBrand="clinical"
          role={user?.role || "NURSE"}
          tenantName={tenant?.name}
          userName={user?.full_name}
          userRole={user?.role || "NURSE"}
        />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="clinical"
            appName={t("nurse.station") || "Nurse Station"}
            appSubtitle={t("nurse.stationSubtitle") || "Triage, eMAR, Fluid Balance & Shift Handover"}
            tenantName={tenant?.name || undefined}
            userName={user?.full_name || undefined}
            userRole={user?.role || "NURSE"}
            contextualTabs={contextualTabs}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={NURSE_MOBILE_TABS}
          pathname={pathname}
          LinkRenderer={NextLinkRenderer}
        />
      </div>
      <div className="md:hidden absolute inset-0 z-40 bg-slate-50">
        <MobileShell
          facilityName={facilityName}
          roleBranchLabel={roleBranchLabel}
          userName={user?.full_name}
          userInitials={undefined}
          userAvatarUrl={(user as any)?.avatar_url}
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={NURSE_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
