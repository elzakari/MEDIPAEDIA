"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Pill,
  Package,
  HeartHandshake,
  Activity,
  FlaskConical,
  CalendarCheck,
  CreditCard,
  Users2,
  Wallet,
  ShoppingBag,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  Header,
  ClinicalSidebar,
  MobileBottomNav,
  MobileBottomNavTab,
  MobileBottomNavLinkProps,
  HeaderContextualTab,
  MobileShell,
} from "@medipaedia/ui";

const NextLinkRenderer: React.FC<MobileBottomNavLinkProps> = ({
  href,
  className,
  onClick,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  title,
  children,
}) => (
  <Link
    href={href}
    onClick={onClick}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    title={title}
    className={className}
  >
    {children}
  </Link>
);

const PATIENT_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "overview",
    label: "Health Overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/dashboard",
    matchPrefixes: ["/dashboard"],
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: <Calendar className="h-5 w-5" />,
    href: "/appointments",
    matchPrefixes: ["/appointments"],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: <Pill className="h-5 w-5" />,
    href: "/prescriptions",
    matchPrefixes: ["/prescriptions"],
  },
  {
    id: "orders",
    label: "Orders / Meds",
    icon: <Package className="h-5 w-5" />,
    href: "/orders",
    matchPrefixes: ["/orders", "/marketplace", "/checkout"],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "overview",
      label: "Health Overview",
      href: "/dashboard",
      matchPrefixes: ["/dashboard"],
    },
    {
      id: "adherence",
      label: "Smart Pill Box",
      href: "/adherence",
      matchPrefixes: ["/adherence"],
    },
    {
      id: "prescriptions",
      label: "Prescriptions",
      href: "/prescriptions",
      matchPrefixes: ["/prescriptions"],
    },
    {
      id: "diagnostics",
      label: "Diagnostics & Labs",
      href: "/diagnostics",
      matchPrefixes: ["/diagnostics"],
    },
    {
      id: "appointments",
      label: "Appointments",
      href: "/appointments",
      matchPrefixes: ["/appointments"],
    },
    {
      id: "cards",
      label: "Hospital Cards",
      href: "/cards",
      matchPrefixes: ["/cards"],
    },
    {
      id: "family",
      label: "Family Care",
      href: "/family",
      matchPrefixes: ["/family"],
    },
    {
      id: "wallet",
      label: "Wallet & Insurance",
      href: "/wallet",
      matchPrefixes: ["/wallet"],
    },
    {
      id: "marketplace",
      label: "Find Meds",
      href: "/marketplace",
      matchPrefixes: ["/marketplace", "/checkout"],
    },
  ];

  const patientHero = {
    eyebrow: "Today, 06 Sep 2026",
    title: "Your health score is trending up",
    subtitle: "Great adherence streak this week. 3 medications to take before bedtime.",
    metric: "88",
    metricSuffix: "/100",
    metricDelta: "+4 this wk",
    metricDeltaPositive: true,
    primaryAction: { label: "Book Consult", href: "/appointments/new", variant: "primary" as const },
    secondaryAction: { label: "View Report", href: "/dashboard/reports", variant: "secondary" as const },
    totalPages: 3,
    activePage: 0,
  };

  const filterTabs = contextualTabs.map((t) => ({
    id: t.id,
    label: t.label,
    href: t.href,
    matchPrefixes: t.matchPrefixes,
    exact: t.exact,
  }));

  const quickInsightsCards = [
    {
      id: "next-appt",
      title: "Next Appointment",
      subtitle: "Dr. Asante, OPD • Fri 10:00",
      metricLabel: "Hours",
      metric: "48",
      icon: <CalendarCheck className="w-4 h-4" />,
      tone: "teal" as const,
      href: "/appointments",
    },
    {
      id: "meds-due",
      title: "Meds Due Today",
      subtitle: "Amlodipine • Metformin",
      metricLabel: "Pills",
      metric: "6",
      icon: <Pill className="w-4 h-4" />,
      tone: "sky" as const,
      href: "/adherence",
    },
    {
      id: "labs-pending",
      title: "Lab Results",
      subtitle: "FBC & Lipid Panel",
      metricLabel: "Pending",
      metric: "2",
      icon: <FlaskConical className="w-4 h-4" />,
      tone: "amber" as const,
      href: "/diagnostics",
    },
    {
      id: "wallet-balance",
      title: "Health Wallet",
      subtitle: "NHIS • Active",
      metricLabel: "GHS",
      metric: "320",
      icon: <Wallet className="w-4 h-4" />,
      tone: "rose" as const,
      href: "/wallet",
    },
  ];

  const careTimelineCards = [
    {
      id: "rx-1",
      title: "Rx #R-48211 Dispensed",
      subtitle: "Kumasi City Pharmacy • 2d ago",
      metric: "✓",
      icon: <Package className="w-4 h-4" />,
      tone: "teal" as const,
      href: "/prescriptions",
    },
    {
      id: "visit-1",
      title: "OPD Follow-up Visit",
      subtitle: "Nakwillies Main • Last Tue",
      metric: "1h",
      icon: <HeartHandshake className="w-4 h-4" />,
      tone: "neutral" as const,
      href: "/cards",
    },
    {
      id: "order-1",
      title: "Marketplace Order #M-338",
      subtitle: "Dispatched • ETA Tomorrow",
      metric: "🚚",
      icon: <ShoppingBag className="w-4 h-4" />,
      tone: "amber" as const,
      href: "/orders",
    },
    {
      id: "vitals-1",
      title: "At-home Vitals Logged",
      subtitle: "BP 122/82 • HR 74",
      metricLabel: "Today",
      metric: "Good",
      icon: <Activity className="w-4 h-4" />,
      tone: "sky" as const,
      href: "/dashboard/vitals",
    },
  ];

  const cardRails = [
    {
      id: "quick-insights",
      sectionTitle: "Quick Insights",
      sectionIcon: <Clock className="w-4 h-4" />,
      viewAllLabel: "Dashboard",
      viewAllHref: "/dashboard",
      cards: quickInsightsCards,
    },
    {
      id: "care-timeline",
      sectionTitle: "Recent Care Timeline",
      sectionIcon: <ChevronRight className="w-4 h-4" />,
      viewAllLabel: "All Activity",
      viewAllHref: "/dashboard/activity",
      cards: careTimelineCards,
    },
  ];

  const filterSection = {
    title: "Health Sections",
    filterLabel: "All Sections",
    tabs: filterTabs,
  };

  return (
    <>
      {/* Desktop branch */}
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <aside className="shrink-0 h-full z-40">
          <ClinicalSidebar
          subBrand="care"
          role="PATIENT"
          userName={undefined}
          userRole="PATIENT"
          userInitials={undefined}
          userProfile={undefined}
          tenantName="Ghana National Health Grid"
          branchLabel={undefined}
          adminDeskHref="/hospital-admin"
          superAdminHref="/super-admin"
          onLogout={undefined}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          pathname={pathname}
        />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="care"
            appName="Care"
            pageTitle={undefined}
            appSubtitle="Personal Health Record, Emergency ICE Passport & Health Wallet"
            tenantName="Ghana National Health Grid"
            userName={undefined}
            userRole="PATIENT"
            userInitials={undefined}
            userProfile={undefined}
            contextualTabs={contextualTabs}
            primaryCta={undefined}
            adminDeskHref="/hospital-admin"
            superAdminHref="/super-admin"
            onLogout={undefined}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={PATIENT_MOBILE_TABS}
          pathname={pathname}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        />
      </div>

      {/* Mobile branch: MobileShell owns full screen on < md */}
      <div className="md:hidden min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
        <MobileShell
          facilityName="Ghana National Health Grid"
          roleBranchLabel="Patient • Active Member"
          userName={undefined}
          userInitials={undefined}
          userAvatarUrl={undefined}
          heroBanner={patientHero}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={PATIENT_MOBILE_TABS}
          onMenuClick={() => {}}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}