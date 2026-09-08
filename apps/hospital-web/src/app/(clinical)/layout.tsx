"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity, Pill, BedDouble, ClipboardList, Calendar, AlertTriangle, TrendingUp, Stethoscope, HeartHandshake, ChevronDown, ChevronRight } from "lucide-react";
import { Header, ClinicalSidebar, MobileBottomNav, useTranslation, MobileBottomNavTab, MobileBottomNavLinkProps, MobileShell, MobileShellHeroBanner, MobileShellFilterSection, MobileShellCardRail, MobileShellCardRailCard } from "@medipaedia/ui";
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

const CLINICAL_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "dashboard",
    label: "Command Center",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/hospital-admin",
    matchPrefixes: ["/hospital-admin", "/clinical", "/"],
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
    label: "Queue / Triage",
    icon: <Activity className="h-5 w-5" />,
    href: "/triage",
    matchPrefixes: ["/triage", "/opd", "/appointments"],
  },
  {
    id: "pharmacy",
    label: "Meds / POS",
    icon: <Pill className="h-5 w-5" />,
    href: "/pharmacy",
    matchPrefixes: ["/pharmacy", "/dispensary", "/prescriptions"],
  },
];

export default function ClinicalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, tenant } = useAuth();
  const pathname = usePathname();

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Staff"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Live Hospital Census",
    title: "Live Census 165 Beds",
    subtitle: "82% Occupancy across 12 wards",
    metric: "165",
    metricSuffix: "beds",
    metricDelta: "+2 beds",
    metricDeltaPositive: true,
  };

  const clinicalNavTabs = [
    { id: "dashboard", label: "Command Center", href: "/hospital-admin", exact: true },
    { id: "intake", label: "Patient Intake", href: "/reception" },
    { id: "triage", label: "Queue & Triage", href: "/triage" },
    { id: "pharmacy", label: "Pharmacy Dispensary", href: "/pharmacy" },
    { id: "wards", label: "Inpatient Wards", href: "/nurse/wards" },
  ];

  const filterSection: MobileShellFilterSection = {
    title: "Navigation Tabs",
    filterLabel: "All Sections",
    tabs: clinicalNavTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      href: tab.href,
      exact: tab.exact,
    })),
  };

  const quickStatsCards: MobileShellCardRailCard[] = [
    { id: "occupied", title: "Beds Occupied", subtitle: "Current census", metric: "135", metricLabel: "OCCUPIED", icon: <BedDouble className="w-4 h-4" />, tone: "teal" },
    { id: "admissions", title: "New Admissions", subtitle: "Last 24 hours", metric: "24", metricLabel: "24HR", icon: <ClipboardList className="w-4 h-4" />, tone: "sky" },
    { id: "scheduled", title: "Scheduled Surgeries", subtitle: "Today's OR cases", metric: "8", metricLabel: "TODAY", icon: <Calendar className="w-4 h-4" />, tone: "amber" },
    { id: "alerts", title: "Critical Alerts", subtitle: "Requires attention", metric: "3", metricLabel: "ALERTS", icon: <AlertTriangle className="w-4 h-4" />, tone: "rose" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "Patient #1042 Admitted", subtitle: "Dr. Mensah • Ward 3", metric: "2m ago", icon: <Stethoscope className="w-4 h-4" />, tone: "neutral", href: "/patients/1042" },
    { id: "a2", title: "Vitals Updated Ward 5", subtitle: "Nurse Addo • 8 patients", metric: "15m ago", icon: <HeartHandshake className="w-4 h-4" />, tone: "teal", href: "/nurse/wards" },
    { id: "a3", title: "Bed Capacity Trend", subtitle: "+2 since yesterday", metric: "+2", metricLabel: "BEDS", icon: <TrendingUp className="w-4 h-4" />, tone: "sky", href: "/hospital-admin" },
    { id: "a4", title: "Pharmacy Restock", subtitle: "Paracetamol 500mg", metric: "1h ago", icon: <Pill className="w-4 h-4" />, tone: "amber", href: "/pharmacy" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "View Dashboard", viewAllHref: "/hospital-admin", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "See All", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sticky full-height sidebar container */}
        <aside className="shrink-0 h-screen sticky top-0 z-40 bg-slate-950 border-r border-slate-800">
          <ClinicalSidebar
            subBrand="clinical"
            role={user?.role}
            tenantName={tenant?.name}
            userName={user?.full_name}
            userRole={user?.role}
            pathname={pathname}
            LinkRenderer={NextLinkRenderer}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="clinical"
            appName={t("clinical.desk") || "Clinical"}
            appSubtitle={t("clinical.ehrOpsSubtitle") || "Hospital & EHR Operations"}
            tenantName={tenant?.name || undefined}
            userName={user?.full_name || undefined}
            userRole={user?.role || "DOCTOR"}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={CLINICAL_MOBILE_TABS}
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
          mobileBottomNavTabs={CLINICAL_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
