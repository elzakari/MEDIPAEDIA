"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  FileCheck,
  DollarSign,
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

const PHARMACY_FINANCE_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "ledger",
    label: "Escrow Ledger",
    icon: <Wallet className="h-5 w-5" />,
    href: "/pharmacy-finance",
    matchPrefixes: ["/pharmacy-finance"],
    exact: true,
  },
  {
    id: "payouts",
    label: "Payouts",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    href: "/pharmacy-finance/payouts",
    matchPrefixes: ["/pharmacy-finance/payouts"],
  },
  {
    id: "reconciliation",
    label: "Reconciliation",
    icon: <FileCheck className="h-5 w-5" />,
    href: "/pharmacy-finance/reconciliation",
    matchPrefixes: ["/pharmacy-finance/reconciliation"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <Receipt className="h-5 w-5" />,
    href: "/pharmacy-finance/reports",
    matchPrefixes: ["/pharmacy-finance/reports"],
  },
];

export default function PharmacyFinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "ledger",
      label: "Escrow Ledger",
      href: "/pharmacy-finance",
      matchPrefixes: ["/pharmacy-finance"],
      exact: true,
    },
    {
      id: "payouts",
      label: "Payouts",
      href: "/pharmacy-finance/payouts",
      matchPrefixes: ["/pharmacy-finance/payouts"],
    },
    {
      id: "reconciliation",
      label: "Reconciliation",
      href: "/pharmacy-finance/reconciliation",
      matchPrefixes: ["/pharmacy-finance/reconciliation"],
    },
    {
      id: "settlements",
      label: "Settlements",
      href: "/pharmacy-finance/settlements",
      matchPrefixes: ["/pharmacy-finance/settlements"],
    },
    {
      id: "claims",
      label: "Insurance Claims",
      href: "/pharmacy-finance/claims",
      matchPrefixes: ["/pharmacy-finance/claims"],
    },
    {
      id: "reports",
      label: "Financial Reports",
      href: "/pharmacy-finance/reports",
      matchPrefixes: ["/pharmacy-finance/reports"],
    },
  ];

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Finance Today",
    title: "Today's Collections Overview",
    subtitle: "76% DSO • 3 Unreconciled Transactions",
    metric: "GHS 42,850",
    metricSuffix: "Collected Today",
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
      sectionIcon: <Wallet className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "escrow-balance",
          title: "Escrow Balance",
          subtitle: "All ledgers",
          metric: "GHS 128,420",
          metricLabel: "Total",
          icon: <Wallet className="w-4 h-4" />,
          tone: "teal",
          href: "/pharmacy-finance",
        },
        {
          id: "payouts-week",
          title: "Payouts This Week",
          subtitle: "Processed OK",
          metric: "12",
          metricLabel: "Sent",
          icon: <ArrowLeftRight className="w-4 h-4" />,
          tone: "sky",
          href: "/pharmacy-finance/payouts",
        },
        {
          id: "recon-rate",
          title: "Reconciliation",
          subtitle: "Match rate today",
          metric: "97%",
          metricLabel: "Matched",
          icon: <FileCheck className="w-4 h-4" />,
          tone: "amber",
          href: "/pharmacy-finance/reconciliation",
        },
        {
          id: "insurance-claims",
          title: "Insurance Claims",
          subtitle: "Pending payment",
          metric: "GHS 8,320",
          metricLabel: "Value",
          icon: <DollarSign className="w-4 h-4" />,
          tone: "rose",
          href: "/pharmacy-finance/claims",
        },
      ],
    },
    {
      id: "recent-activity",
      sectionTitle: "Recent Activity",
      sectionIcon: <Receipt className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "new-collection",
          title: "New Collection",
          subtitle: "INV-4425",
          metric: "GHS 2,450",
          metricLabel: "Amount",
          icon: <Receipt className="w-4 h-4" />,
          tone: "neutral",
          href: "/pharmacy-finance",
        },
        {
          id: "reconciled",
          title: "Reconciled",
          subtitle: "Bank Deposit #881",
          metric: "OK",
          metricLabel: "Status",
          icon: <FileCheck className="w-4 h-4" />,
          tone: "teal",
          href: "/pharmacy-finance/reconciliation",
        },
        {
          id: "payout-sent",
          title: "Payout Sent",
          subtitle: "Supplier Credit",
          metric: "GHS 5,800",
          metricLabel: "Amount",
          icon: <ArrowLeftRight className="w-4 h-4" />,
          tone: "sky",
          href: "/pharmacy-finance/payouts",
        },
        {
          id: "claim-due",
          title: "Claim Due",
          subtitle: "NHIS Submission",
          metric: "15:00",
          metricLabel: "Time",
          icon: <Calendar className="w-4 h-4" />,
          tone: "amber",
          href: "/pharmacy-finance/claims",
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
          role="PHARMACY_FINANCE"
          userName="Abena Osei (Finance Lead)"
          userRole="PHARMACY_FINANCE"
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
            appName="Pharmacy Finance"
            pageTitle={undefined}
            appSubtitle="Escrow Ledger, Payouts, Claims & Financial Reconciliation"
            tenantName={undefined}
            userName="Abena Osei (Finance Lead)"
            userRole="PHARMACY_FINANCE"
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
          tabs={PHARMACY_FINANCE_MOBILE_TABS}
          pathname={pathname}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        />
      </div>
      <div className="md:hidden min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
        <MobileShell
          facilityName="Nakwillies Pharmacy Group"
          roleBranchLabel="PHARMACY_FINANCE • Branch-01"
          userName="Abena Osei (Finance Lead)"
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={PHARMACY_FINANCE_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
