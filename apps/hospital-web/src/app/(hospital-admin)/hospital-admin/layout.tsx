"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Pill,
  CreditCard,
  FolderClock,
  Layers,
  ShieldCheck,
  ClipboardCheck,
  Building2,
  BedDouble,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Users2,
  Calendar,
} from "lucide-react";
import {
  Header,
  ClinicalSidebar,
  MobileBottomNav,
  MobileBottomNavTab,
  MobileBottomNavLinkProps,
  HeaderContextualTab,
  HeaderPrimaryCta,
  MobileShell,
  MobileShellHeroBanner,
  MobileShellFilterSection,
  MobileShellCardRail,
  MobileShellCardRailCard,
} from "@medipaedia/ui";
import { useAuth } from "@/context/AuthContext";

const HOSPITAL_ADMIN_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/hospital-admin",
    matchPrefixes: ["/hospital-admin"],
  },
  {
    id: "patients",
    label: "Registry",
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
    id: "pharmacy",
    label: "Dispensary",
    icon: <Pill className="h-5 w-5" />,
    href: "/pharmacy",
    matchPrefixes: ["/pharmacy", "/dispensary", "/prescriptions"],
  },
];

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

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { user, tenant } = useAuth();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "command",
      label: "Command Center",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      href: "/hospital-admin",
      matchPrefixes: ["/hospital-admin"],
      exact: true,
    },
    {
      id: "billing",
      label: "Billing & Gateways",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      href: "/hospital-admin/billing-settings",
      matchPrefixes: ["/hospital-admin/billing-settings"],
    },
    {
      id: "staff",
      label: "Staff Workforce",
      icon: <Users className="h-3.5 w-3.5" />,
      href: "/hospital-admin/staff",
      matchPrefixes: ["/hospital-admin/staff"],
    },
    {
      id: "roster",
      label: "Shift Roster",
      icon: <FolderClock className="h-3.5 w-3.5" />,
      href: "/hospital-admin/roster",
      matchPrefixes: ["/hospital-admin/roster"],
    },
    {
      id: "wards",
      label: "Wards & Theatres",
      icon: <Building2 className="h-3.5 w-3.5" />,
      href: "/hospital-admin/departments",
      matchPrefixes: ["/hospital-admin/departments"],
    },
    {
      id: "tariffs",
      label: "Tariff Master",
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      href: "/hospital-admin/tariffs",
      matchPrefixes: ["/hospital-admin/tariffs"],
    },
    {
      id: "quality",
      label: "Quality & Risk",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      href: "/hospital-admin/quality",
      matchPrefixes: ["/hospital-admin/quality"],
    },
  ];

  const isCommandCenter = pathname === "/hospital-admin";
  const primaryCta: HeaderPrimaryCta | undefined = isCommandCenter
    ? {
        label: "Launch Admin",
        href: "/hospital-admin",
        icon: <Layers className="h-3.5 w-3.5" />,
      }
    : undefined;

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Hospital Admin"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Hospital Governance",
    title: "165 Bed Census 12 Wards",
    subtitle: "1.5% Readmit 30 Day • Quality OK",
    metric: "165",
    metricSuffix: "beds",
    metricDelta: "1.5% readmit",
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
    { id: "census", title: "Bed Census", subtitle: "Total occupied", metric: "165", metricLabel: "BEDS", icon: <BedDouble className="w-4 h-4" />, tone: "teal" },
    { id: "wards", title: "Wards Active", subtitle: "12 of 12 online", metric: "12", metricLabel: "WARDS", icon: <Building2 className="w-4 h-4" />, tone: "sky" },
    { id: "readmit", title: "30-Day Readmit", subtitle: "Quality indicator", metric: "1.5%", metricLabel: "READMIT", icon: <ShieldCheck className="w-4 h-4" />, tone: "amber" },
    { id: "staff", title: "On-Duty Staff", subtitle: "Currently clocked in", metric: "84", metricLabel: "STAFF", icon: <Users2 className="w-4 h-4" />, tone: "rose" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "New Ward Opened", subtitle: "Ward 13 • Paediatrics", metric: "1h ago", icon: <Building2 className="w-4 h-4" />, tone: "teal", href: "/hospital-admin/departments" },
    { id: "a2", title: "Staff Roster Published", subtitle: "Next week • All shifts", metric: "2h ago", icon: <FolderClock className="w-4 h-4" />, tone: "neutral", href: "/hospital-admin/roster" },
    { id: "a3", title: "Tariff Sync Complete", subtitle: "NHIS Schedule 2026", metric: "3h ago", icon: <ClipboardCheck className="w-4 h-4" />, tone: "sky", href: "/hospital-admin/tariffs" },
    { id: "a4", title: "Risk Report Filed", subtitle: "Fall incident • Ward 5", metric: "6h ago", icon: <AlertTriangle className="w-4 h-4" />, tone: "amber", href: "/hospital-admin/quality" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "Command Center", viewAllHref: "/hospital-admin", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "Audit Trail", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sticky full-height sidebar container */}
        <aside className="shrink-0 h-screen sticky top-0 z-40 bg-slate-950 border-r border-slate-800">
          <ClinicalSidebar
            subBrand="clinical"
            role="HOSPITAL_ADMIN"
            userRole={user?.role || "HOSPITAL_ADMIN"}
            userName={user?.full_name || (user as any)?.name || "Dr. Administrator"}
            userInitials={
              user?.full_name
                ? user.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "DA"
            }
            tenantName={facilityName}
            branchLabel={(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}
            pathname={pathname}
            LinkRenderer={NextLinkRenderer}
          />
        </aside>

        {/* Main scrollable body */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header
            subBrand="clinical"
            appName="Hospital Governance"
            appSubtitle="Workforce Scheduling, Bed Capacity & Tariff Configuration"
            userRole={user?.role || "HOSPITAL_ADMIN"}
            userName={user?.full_name || (user as any)?.name || "Dr. Administrator"}
            tenantName={facilityName}
            contextualTabs={[]}
            primaryCta={primaryCta}
            onMobileDrawerOpen={() => setMobileDrawerOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <div className="md:hidden min-h-screen w-full bg-slate-50 dark:bg-slate-950 relative">
        <MobileShell
          facilityName={facilityName}
          roleBranchLabel={roleBranchLabel}
          userName={user?.full_name}
          userInitials={undefined}
          userAvatarUrl={(user as any)?.avatar_url}
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={HOSPITAL_ADMIN_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => setMobileDrawerOpen(true)}
        >
          {children}
        </MobileShell>
        <MobileBottomNav
          tabs={HOSPITAL_ADMIN_MOBILE_TABS}
          pathname={pathname}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => setMobileDrawerOpen(true)}
        />
      </div>
    </>
  );
}
