"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, FolderArchive, CalendarCheck, Tv, Users, Activity, Pill, LayoutDashboard, ClipboardList, Calendar, AlertTriangle, TrendingUp, Users2, ChevronDown, ChevronRight, HeartHandshake, Building2 } from "lucide-react";
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

const RECEPTION_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "intake",
    label: "Patient Intake",
    icon: <Users className="h-5 w-5" />,
    href: "/reception",
    matchPrefixes: ["/reception", "/patients", "/registry", "/outpatient"],
  },
  {
    id: "queue",
    label: "Queue",
    icon: <Activity className="h-5 w-5" />,
    href: "/appointments",
    matchPrefixes: ["/appointments", "/triage", "/opd", "/doctor-workspace"],
  },
  {
    id: "meds",
    label: "Meds / POS",
    icon: <Pill className="h-5 w-5" />,
    href: "/pharmacy",
    matchPrefixes: ["/pharmacy", "/dispensary", "/prescriptions"],
  },
  {
    id: "admin",
    label: "Command Center",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/hospital-admin",
    matchPrefixes: ["/hospital-admin"],
  },
];

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, tenant } = useAuth();

  const facilityBadge = tenant?.name || (user as any)?.tenant_name || undefined;
  const profileName = user?.full_name || "Records Officer";

  const isTvDisplay = pathname === "/reception/tv-display";

  if (isTvDisplay) {
    return <>{children}</>;
  }

  const tabs = [
    {
      href: "/reception",
      label: t("reception.intakeDesk") || "Master Intake Desk",
      icon: UserCheck,
      exact: true,
    },
    {
      href: "/reception/folders",
      label: t("reception.physicalFolderLedger") || "Physical Folder Ledger",
      icon: FolderArchive,
    },
    {
      href: "/reception/appointments",
      label: t("reception.preBookedAppointments") || "Pre-Booked Appointments",
      icon: CalendarCheck,
    },
    {
      href: "/reception/tv-display",
      label: t("reception.waitingRoomTV") || "Waiting Room TV Display",
      icon: Tv,
      target: "_blank",
    },
  ];

  const contextualTabs: HeaderContextualTab[] = tabs.map((tab) => ({
    id: tab.href,
    label: tab.label,
    icon: <tab.icon className="h-3.5 w-3.5" />,
    href: tab.href,
    target: tab.target,
    rel: tab.target === "_blank" ? "noopener" : undefined,
    matchPrefixes: tab.exact ? [tab.href] : [tab.href],
    exact: tab.exact,
  }));

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Staff"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Reception Desk Today",
    title: "45 Check-Ins Today",
    subtitle: "12 Walk-In • 22 VIP expedited",
    metric: "45",
    metricSuffix: "check-ins",
    metricDelta: "+12 walk-in",
    metricDeltaPositive: true,
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
    { id: "checkins", title: "Today's Check-Ins", subtitle: "Total registered", metric: "45", metricLabel: "TODAY", icon: <UserCheck className="w-4 h-4" />, tone: "teal" },
    { id: "walkin", title: "Walk-In Patients", subtitle: "No appointment", metric: "12", metricLabel: "WALK-IN", icon: <Users className="w-4 h-4" />, tone: "sky" },
    { id: "vip", title: "VIP Expedited", subtitle: "Priority channel", metric: "22", metricLabel: "VIP", icon: <Users2 className="w-4 h-4" />, tone: "amber" },
    { id: "pending", title: "Pending Check-Ins", subtitle: "In waiting area", metric: "8", metricLabel: "WAIT", icon: <ClipboardList className="w-4 h-4" />, tone: "rose" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "Patient #1092 Registered", subtitle: "Outpatient • Dr. Bonsu", metric: "3m ago", icon: <UserCheck className="w-4 h-4" />, tone: "neutral", href: "/reception" },
    { id: "a2", title: "Folder #8842 Pulled", subtitle: "Ward 2 • Dr. Mensah", metric: "18m ago", icon: <FolderArchive className="w-4 h-4" />, tone: "teal", href: "/reception/folders" },
    { id: "a3", title: "Appointment Confirmed", subtitle: "Tomorrow 10:00 • Cardio", metric: "32m ago", icon: <CalendarCheck className="w-4 h-4" />, tone: "sky", href: "/reception/appointments" },
    { id: "a4", title: "VIP Check-In Complete", subtitle: "Patient #1045 • Suite B", metric: "55m ago", icon: <Users2 className="w-4 h-4" />, tone: "amber", href: "/reception" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "Intake Desk", viewAllHref: "/reception", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "See All", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sticky full-height sidebar container */}
        <aside className="shrink-0 h-screen sticky top-0 z-40 bg-slate-950 border-r border-slate-800">
          <ClinicalSidebar
            subBrand="clinical"
            role={user?.role || "RECEPTION"}
            tenantName={facilityBadge}
            userName={profileName}
            userRole={user?.role || "RECORD_CLERK"}
            pathname={pathname}
            LinkRenderer={NextLinkRenderer}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="clinical"
            appName={t("reception.records") || "Hospital Records"}
            appSubtitle={t("reception.pmiIntakeSubtitle") || "Patient Master Index & Intake Desk"}
            tenantName={facilityBadge}
            userName={profileName}
            userRole={user?.role || "RECORD_CLERK"}
            contextualTabs={contextualTabs}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={RECEPTION_MOBILE_TABS}
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
          mobileBottomNavTabs={RECEPTION_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
