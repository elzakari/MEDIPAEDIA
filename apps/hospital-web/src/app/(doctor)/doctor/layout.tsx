"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, Activity, Users, Pill, Users2, ClipboardList, Calendar, AlertTriangle, TrendingUp, HeartHandshake, ChevronDown, ChevronRight, LayoutDashboard } from "lucide-react";
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

const DOCTOR_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "consultations",
    label: "Consultations",
    icon: <Stethoscope className="h-5 w-5" />,
    href: "/doctor",
    matchPrefixes: ["/doctor", "/consultations"],
  },
  {
    id: "queue",
    label: "Waiting Queue",
    icon: <Activity className="h-5 w-5" />,
    href: "/doctor/queue",
    matchPrefixes: ["/doctor/queue"],
  },
  {
    id: "soap",
    label: "SOAP Encounter",
    icon: <Users className="h-5 w-5" />,
    href: "/consultations/new",
    matchPrefixes: ["/consultations/new"],
  },
  {
    id: "rx",
    label: "E-Prescriptions",
    icon: <Pill className="h-5 w-5" />,
    href: "/doctor/prescriptions",
    matchPrefixes: ["/doctor/prescriptions", "/prescriptions"],
  },
];

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, tenant } = useAuth();
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "consultations",
      label: t("navigation.consultations"),
      icon: <Stethoscope className="h-3.5 w-3.5" />,
      href: "/doctor",
      matchPrefixes: ["/doctor"],
      exact: true,
    },
    {
      id: "queue",
      label: t("navigation.queue"),
      icon: <Activity className="h-3.5 w-3.5" />,
      href: "/doctor/queue",
      matchPrefixes: ["/doctor/queue"],
    },
    {
      id: "soap",
      label: t("navigation.soap"),
      icon: <Users className="h-3.5 w-3.5" />,
      href: "/doctor/consultations/new",
      matchPrefixes: ["/doctor/consultations/new", "/consultations/new"],
    },
    {
      id: "prescriptions",
      label: t("navigation.prescriptions"),
      icon: <Pill className="h-3.5 w-3.5" />,
      href: "/doctor/prescriptions",
      matchPrefixes: ["/doctor/prescriptions"],
    },
  ];

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Doctor"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Today's Outpatient",
    title: "18 Patients in Consult Queue",
    subtitle: "12 Awaiting Review — keep pace",
    metric: "18",
    metricSuffix: "waiting",
    metricDelta: "+3 since 9AM",
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
    { id: "in-queue", title: "In Consult Queue", subtitle: "Waiting to be seen", metric: "18", metricLabel: "QUEUE", icon: <Users2 className="w-4 h-4" />, tone: "teal" },
    { id: "review", title: "Awaiting Review", subtitle: "Completed encounters", metric: "12", metricLabel: "REVIEW", icon: <ClipboardList className="w-4 h-4" />, tone: "sky" },
    { id: "seen", title: "Seen Today", subtitle: "Completed today", metric: "26", metricLabel: "DONE", icon: <Stethoscope className="w-4 h-4" />, tone: "amber" },
    { id: "alerts", title: "Flagged Cases", subtitle: "Abnormal vitals", metric: "2", metricLabel: "FLAG", icon: <AlertTriangle className="w-4 h-4" />, tone: "rose" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "Patient #1088 Checked In", subtitle: "Chief complaint: Headache", metric: "5m ago", icon: <Users className="w-4 h-4" />, tone: "neutral", href: "/doctor/queue" },
    { id: "a2", title: "Rx Sent to Pharmacy", subtitle: "Amoxicillin 500mg x 7d", metric: "12m ago", icon: <Pill className="w-4 h-4" />, tone: "teal", href: "/doctor/prescriptions" },
    { id: "a3", title: "Lab Results Ready", subtitle: "Patient #1042 • FBC", metric: "28m ago", icon: <ClipboardList className="w-4 h-4" />, tone: "sky", href: "/patients/1042" },
    { id: "a4", title: "Referral Created", subtitle: "Cardiology • Dr. Osei", metric: "1h ago", icon: <HeartHandshake className="w-4 h-4" />, tone: "amber", href: "/doctor" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "Open Workstation", viewAllHref: "/doctor", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "Activity Log", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <aside className="shrink-0 h-full z-40">
          <ClinicalSidebar
          subBrand="clinical"
          role={user?.role || "DOCTOR"}
          tenantName={tenant?.name || (user as any)?.tenant_name || (user as any)?.tenant?.name}
          userName={user?.full_name}
          userRole={user?.role || "DOCTOR"}
        />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="clinical"
            appName={t("navigation.doctorWorkstation")}
            appSubtitle={t("doctor.subtitle")}
            tenantName={tenant?.name || (user as any)?.tenant_name || (user as any)?.tenant?.name || undefined}
            userName={user?.full_name || undefined}
            userRole={user?.role || "DOCTOR"}
            contextualTabs={contextualTabs}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={DOCTOR_MOBILE_TABS}
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
          mobileBottomNavTabs={DOCTOR_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
