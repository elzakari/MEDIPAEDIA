"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  ClipboardCheck,
  ShieldAlert,
  DollarSign,
  Truck,
  Pill,
  Receipt,
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

const DISPENSARY_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "pos",
    label: "Dispensary POS",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/pos",
    matchPrefixes: ["/pos"],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
    href: "/dispensary/inventory",
    matchPrefixes: ["/dispensary/inventory"],
  },
  {
    id: "scripts",
    label: "Script Verify",
    icon: <ClipboardCheck className="h-5 w-5" />,
    href: "/dispensary/scripts",
    matchPrefixes: ["/dispensary/scripts"],
  },
  {
    id: "finances",
    label: "Finances",
    icon: <DollarSign className="h-5 w-5" />,
    href: "/pharmacy-finance",
    matchPrefixes: ["/pharmacy-finance"],
  },
];

export default function DispensaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "pos",
      label: "Dispensary POS",
      href: "/pos",
      matchPrefixes: ["/pos"],
    },
    {
      id: "inventory",
      label: "Inventory",
      href: "/dispensary/inventory",
      matchPrefixes: ["/dispensary/inventory"],
    },
    {
      id: "scripts",
      label: "Script Verify",
      href: "/dispensary/scripts",
      matchPrefixes: ["/dispensary/scripts"],
    },
    {
      id: "controlled",
      label: "Controlled Drugs",
      href: "/dispensary/controlled",
      matchPrefixes: ["/dispensary/controlled"],
    },
    {
      id: "finances",
      label: "Finances",
      href: "/pharmacy-finance",
      matchPrefixes: ["/pharmacy-finance"],
    },
    {
      id: "fulfillment",
      label: "Fulfillment",
      href: "/dispensary/fulfillment",
      matchPrefixes: ["/dispensary/fulfillment"],
    },
  ];

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Dispensary Today",
    title: "Today's Dispensing Activity",
    subtitle: "6 Pending • 3 Insurance Claims",
    metric: "142",
    metricSuffix: "Prescriptions Dispensed Today",
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
      sectionIcon: <Pill className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "scripts-filled",
          title: "Scripts Filled",
          subtitle: "Today",
          metric: "142",
          metricLabel: "Count",
          icon: <Pill className="w-4 h-4" />,
          tone: "teal",
          href: "/dispensary/scripts",
        },
        {
          id: "pos-sales",
          title: "POS Sales",
          subtitle: "Today's revenue",
          metric: "GHS 8,240",
          metricLabel: "Total",
          icon: <ShoppingCart className="w-4 h-4" />,
          tone: "sky",
          href: "/pos",
        },
        {
          id: "scripts-verified",
          title: "Scripts Verified",
          subtitle: "Pharmacist check",
          metric: "128",
          metricLabel: "Checked",
          icon: <ClipboardCheck className="w-4 h-4" />,
          tone: "amber",
          href: "/dispensary/scripts",
        },
        {
          id: "controlled-drugs",
          title: "Controlled Drugs",
          subtitle: "Schedule II-V",
          metric: "7",
          metricLabel: "Dispensed",
          icon: <ShieldAlert className="w-4 h-4" />,
          tone: "rose",
          href: "/dispensary/controlled",
        },
      ],
    },
    {
      id: "recent-activity",
      sectionTitle: "Recent Activity",
      sectionIcon: <Receipt className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "new-script",
          title: "New Script",
          subtitle: "Script #8821",
          metric: "Now",
          metricLabel: "Time",
          icon: <Receipt className="w-4 h-4" />,
          tone: "neutral",
          href: "/dispensary/scripts",
        },
        {
          id: "stock-received",
          title: "Stock Received",
          subtitle: "Wholesale delivery",
          metric: "24",
          metricLabel: "Items",
          icon: <Package className="w-4 h-4" />,
          tone: "teal",
          href: "/dispensary/inventory",
        },
        {
          id: "verification",
          title: "Verification",
          subtitle: "Patient Osei, K.",
          metric: "Passed",
          metricLabel: "Check",
          icon: <ClipboardCheck className="w-4 h-4" />,
          tone: "sky",
          href: "/dispensary/scripts",
        },
        {
          id: "counselling",
          title: "Counselling",
          subtitle: "Patient Appointment",
          metric: "15:00",
          metricLabel: "Time",
          icon: <Calendar className="w-4 h-4" />,
          tone: "amber",
          href: "/dispensary/fulfillment",
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
          role="PHARMACIST"
          userName="Pharm. Kojo Asante"
          userRole="PHARMACIST"
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
            appName="Dispensary"
            pageTitle={undefined}
            appSubtitle="Prescription Dispensing, POS & Patient Counselling"
            tenantName={undefined}
            userName="Pharm. Kojo Asante"
            userRole="PHARMACIST"
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
          tabs={DISPENSARY_MOBILE_TABS}
          pathname={pathname}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        />
      </div>
      <div className="md:hidden min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
        <MobileShell
          facilityName="Nakwillies Pharmacy Group"
          roleBranchLabel="PHARMACIST • Branch-01"
          userName="Pharm. Kojo Asante"
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={DISPENSARY_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
