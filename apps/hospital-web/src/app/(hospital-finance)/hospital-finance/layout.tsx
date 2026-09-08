"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, FolderClock, ShieldCheck, Layers, DollarSign, FileText, Receipt, AlertTriangle, TrendingUp, ClipboardList, ChevronDown, ChevronRight, Users, Activity, Pill } from "lucide-react";
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

const FINANCE_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "overview",
    label: "Financial Overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/hospital-finance",
    matchPrefixes: ["/hospital-finance"],
  },
  {
    id: "cashier",
    label: "Cashier POS",
    icon: <CreditCard className="h-5 w-5" />,
    href: "/hospital-finance/cashier",
    matchPrefixes: ["/hospital-finance/cashier"],
  },
  {
    id: "shifts",
    label: "Drawer & Shifts",
    icon: <FolderClock className="h-5 w-5" />,
    href: "/hospital-finance/shifts",
    matchPrefixes: ["/hospital-finance/shifts"],
  },
  {
    id: "claims",
    label: "Insurance NHIS",
    icon: <ShieldCheck className="h-5 w-5" />,
    href: "/hospital-finance/claims",
    matchPrefixes: ["/hospital-finance/claims"],
  },
];

export default function HospitalFinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, tenant } = useAuth();
  const pathname = usePathname();

  const facilityBadge = tenant?.name || (user as any)?.tenant_name || undefined;
  const profileName = user?.full_name || "Cashier / Finance";

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "overview",
      label: t("finance.overview") || "Financial Overview",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      href: "/hospital-finance",
      matchPrefixes: ["/hospital-finance"],
      exact: true,
    },
    {
      id: "cashier",
      label: t("finance.cashier") || "Cashier POS",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      href: "/hospital-finance/cashier",
      matchPrefixes: ["/hospital-finance/cashier"],
    },
    {
      id: "shifts",
      label: t("finance.drawerShifts") || "Drawer & Shifts",
      icon: <FolderClock className="h-3.5 w-3.5" />,
      href: "/hospital-finance/shifts",
      matchPrefixes: ["/hospital-finance/shifts"],
    },
    {
      id: "claims",
      label: t("finance.claims") || "Insurance & NHIS",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      href: "/hospital-finance/claims",
      matchPrefixes: ["/hospital-finance/claims"],
    },
    {
      id: "feeSchedule",
      label: t("finance.feeSchedule") || "Fee Schedule",
      icon: <Layers className="h-3.5 w-3.5" />,
      href: "/hospital-finance/fee-schedule",
      matchPrefixes: ["/hospital-finance/fee-schedule"],
    },
  ];

  const facilityName = tenant?.name || "Nakwillies Main Hub";
  const roleBranchLabel = `${user?.role || "Finance"} • ${(user as any)?.branch_short_code || (user as any)?.department || "Acc-01"}`;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Revenue Cycle Today",
    title: "GHS 42,850 Today's Billed",
    subtitle: "76% Collected • 18 Invoices Pending",
    metric: "42,850",
    metricSuffix: "GHS",
    metricDelta: "76% collected",
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
    { id: "billed", title: "Today Billed", subtitle: "Total invoiced", metric: "42,850", metricLabel: "GHS", icon: <DollarSign className="w-4 h-4" />, tone: "teal" },
    { id: "collected", title: "Collected Today", subtitle: "76% of billed", metric: "32,566", metricLabel: "GHS", icon: <Receipt className="w-4 h-4" />, tone: "sky" },
    { id: "pending", title: "Pending Invoices", subtitle: "Awaiting payment", metric: "18", metricLabel: "INV", icon: <FileText className="w-4 h-4" />, tone: "amber" },
    { id: "claims", title: "Claims Submitted", subtitle: "NHIS / Insurance", metric: "7", metricLabel: "CLAIMS", icon: <ShieldCheck className="w-4 h-4" />, tone: "rose" },
  ];

  const recentActivityCards: MobileShellCardRailCard[] = [
    { id: "a1", title: "Invoice #8821 Paid", subtitle: "GHS 2,450 • Cash", metric: "6m ago", icon: <Receipt className="w-4 h-4" />, tone: "teal", href: "/hospital-finance/cashier" },
    { id: "a2", title: "Shift Opened Drawer 2", subtitle: "GHS 500 float • Morning", metric: "2h ago", icon: <FolderClock className="w-4 h-4" />, tone: "neutral", href: "/hospital-finance/shifts" },
    { id: "a3", title: "NHIS Claim Batch", subtitle: "12 items • GHS 18,200", metric: "3h ago", icon: <ShieldCheck className="w-4 h-4" />, tone: "sky", href: "/hospital-finance/claims" },
    { id: "a4", title: "Fee Schedule Updated", subtitle: "Consultation fees", metric: "5h ago", icon: <Layers className="w-4 h-4" />, tone: "amber", href: "/hospital-finance/fee-schedule" },
  ];

  const cardRails: MobileShellCardRail[] = [
    { id: "quick-stats", sectionTitle: "Quick Stats", sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />, viewAllLabel: "RCM Dashboard", viewAllHref: "/hospital-finance", cards: quickStatsCards },
    { id: "recent-activity", sectionTitle: "Recent Activity", sectionIcon: <Activity className="w-3.5 h-3.5" />, viewAllLabel: "Ledger", cards: recentActivityCards },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sticky full-height sidebar container */}
        <aside className="shrink-0 h-screen sticky top-0 z-40 bg-slate-950 border-r border-slate-800">
          <ClinicalSidebar
            subBrand="clinical"
            role="HOSPITAL_FINANCE"
            tenantName={facilityBadge}
            userName={profileName}
            userRole="HOSPITAL_FINANCE"
            pathname={pathname}
            LinkRenderer={NextLinkRenderer}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            subBrand="clinical"
            appName={t("finance.revenueCycle") || "Hospital Revenue Cycle"}
            appSubtitle={t("finance.rcmSubtitle") || "Cashier Desk, Auto-Aggregated Billing & Insurance Claims"}
            tenantName={facilityBadge}
            userName={profileName}
            userRole="HOSPITAL_FINANCE"
            contextualTabs={contextualTabs}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav
          tabs={FINANCE_MOBILE_TABS}
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
          mobileBottomNavTabs={FINANCE_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
        >
          {children}
        </MobileShell>
      </div>
    </>
  );
}
