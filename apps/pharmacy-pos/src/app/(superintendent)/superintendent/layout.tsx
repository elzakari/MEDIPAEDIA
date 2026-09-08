"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Thermometer,
  ShieldAlert,
  BookCheck,
  AlertTriangle,
  FlaskConical,
  FileCheck,
  Calendar,
} from "lucide-react";
import {
  Header,
  ClinicalSidebar,
  MobileBottomNav,
  MobileBottomNavTab,
  MobileBottomNavLinkProps,
  HeaderContextualTab,
  MobileShell,
  MobileShellFilterSection,
  MobileShellCardRail,
  MobileShellHeroBanner,
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

const SUPERINTENDENT_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "compliance",
    label: "Compliance",
    icon: <ShieldCheck className="h-5 w-5" />,
    href: "/superintendent",
    matchPrefixes: ["/superintendent"],
    exact: true,
  },
  {
    id: "coldchain",
    label: "Cold Chain",
    icon: <Thermometer className="h-5 w-5" />,
    href: "/superintendent/cold-chain",
    matchPrefixes: ["/superintendent/cold-chain"],
  },
  {
    id: "controlled",
    label: "Controlled Drugs",
    icon: <ShieldAlert className="h-5 w-5" />,
    href: "/superintendent/controlled",
    matchPrefixes: ["/superintendent/controlled", "/superintendent/narcotics"],
  },
  {
    id: "vigilance",
    label: "Pharmacovigilance",
    icon: <AlertTriangle className="h-5 w-5" />,
    href: "/superintendent/pharmacovigilance",
    matchPrefixes: ["/superintendent/pharmacovigilance"],
  },
];

export default function SuperintendentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "compliance",
      label: "Compliance",
      href: "/superintendent",
      matchPrefixes: ["/superintendent"],
      exact: true,
    },
    {
      id: "coldchain",
      label: "Cold Chain",
      href: "/superintendent/cold-chain",
      matchPrefixes: ["/superintendent/cold-chain"],
    },
    {
      id: "controlled",
      label: "Controlled Drugs",
      href: "/superintendent/controlled",
      matchPrefixes: ["/superintendent/controlled"],
    },
    {
      id: "narcotics",
      label: "Narcotics Register",
      href: "/superintendent/narcotics",
      matchPrefixes: ["/superintendent/narcotics"],
    },
    {
      id: "quarantine",
      label: "Quarantine",
      href: "/superintendent/quarantine",
      matchPrefixes: ["/superintendent/quarantine"],
    },
    {
      id: "vigilance",
      label: "Pharmacovigilance",
      href: "/superintendent/pharmacovigilance",
      matchPrefixes: ["/superintendent/pharmacovigilance"],
    },
    {
      id: "compounding",
      label: "Compounding Suite",
      href: "/superintendent/compounding",
      matchPrefixes: ["/superintendent/compounding"],
    },
  ];

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Superintendent Overview",
    title: "Regulatory Compliance Status",
    subtitle: "100% License Compliant • 4 Fridge Temp OK • 2 Narcotics Counts Due",
    metric: "2",
    metricSuffix: "Facilities",
  };

  const filterSection: MobileShellFilterSection = {
    title: "Sections",
    tabs: contextualTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      href: tab.href,
      exact: tab.exact,
      matchPrefixes: tab.matchPrefixes,
    })),
  };

  const cardRails: MobileShellCardRail[] = [
    {
      id: "quick-kpis",
      sectionTitle: "Quick KPIs",
      sectionIcon: <ShieldCheck className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "compliance-score",
          title: "Compliance Score",
          subtitle: "All categories",
          metric: "100%",
          metricLabel: "Score",
          icon: <ShieldAlert className="w-4 h-4" />,
          tone: "teal",
          href: "/superintendent",
        },
        {
          id: "cold-chain-ok",
          title: "Cold Chain OK",
          subtitle: "Monitored units",
          metric: "4/4",
          metricLabel: "Units",
          icon: <Thermometer className="w-4 h-4" />,
          tone: "sky",
          href: "/superintendent/cold-chain",
        },
        {
          id: "license-status",
          title: "License Status",
          subtitle: "All facilities",
          metric: "Valid",
          metricLabel: "Status",
          icon: <BookCheck className="w-4 h-4" />,
          tone: "amber",
          href: "/superintendent",
        },
        {
          id: "narcotics-counts",
          title: "Narcotics Counts",
          subtitle: "Scheduled counts",
          metric: "2",
          metricLabel: "Due",
          icon: <AlertTriangle className="w-4 h-4" />,
          tone: "rose",
          href: "/superintendent/narcotics",
        },
      ],
    },
    {
      id: "recent-activity",
      sectionTitle: "Recent Activity",
      sectionIcon: <FlaskConical className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "audit-passed",
          title: "Audit Passed",
          subtitle: "FDA Inspection",
          metric: "Today",
          metricLabel: "Time",
          icon: <ShieldCheck className="w-4 h-4" />,
          tone: "neutral",
          href: "/superintendent",
        },
        {
          id: "temp-logged",
          title: "Temp Logged",
          subtitle: "Fridge A 2-8°C",
          metric: "08:00",
          metricLabel: "Time",
          icon: <Thermometer className="w-4 h-4" />,
          tone: "teal",
          href: "/superintendent/cold-chain",
        },
        {
          id: "license-renewal",
          title: "License Renewal",
          subtitle: "Facility License",
          metric: "30d",
          metricLabel: "Left",
          icon: <BookCheck className="w-4 h-4" />,
          tone: "sky",
          href: "/superintendent",
        },
        {
          id: "register-entry",
          title: "Register Entry",
          subtitle: "Narcotics Log",
          metric: "OK",
          metricLabel: "Status",
          icon: <FileCheck className="w-4 h-4" />,
          tone: "amber",
          href: "/superintendent/narcotics",
        },
      ],
    },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <aside className="shrink-0 h-full z-40">
          <ClinicalSidebar
          subBrand="rx"
          role="SUPERINTENDENT"
          userName="Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)"
          userRole="SUPERINTENDENT"
          userInitials={undefined}
          userProfile={undefined}
          tenantName={undefined}
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
            subBrand="rx"
            appName="Superintendent Pharmacist"
            pageTitle={undefined}
            appSubtitle="Regulatory Compliance, Controlled Substances & Pharmacovigilance"
            tenantName={undefined}
            userName="Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)"
            userRole="SUPERINTENDENT"
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
          tabs={SUPERINTENDENT_MOBILE_TABS}
          pathname={pathname}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        />
      </div>
      <div className="md:hidden min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
        <MobileShell
          facilityName="Nakwillies Pharmacy Group"
          roleBranchLabel="SUPERINTENDENT • Branch-01"
          userName="Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)"
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={SUPERINTENDENT_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
