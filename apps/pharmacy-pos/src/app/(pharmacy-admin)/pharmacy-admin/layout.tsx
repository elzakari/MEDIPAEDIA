"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  Receipt,
  Truck,
  ClipboardCheck,
  Layers,
  AlertTriangle,
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

const PHARMACY_ADMIN_MOBILE_TABS: MobileBottomNavTab[] = [
  {
    id: "executive",
    label: "Executive Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/pharmacy-admin",
    matchPrefixes: ["/pharmacy-admin"],
    exact: true,
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: <Package className="h-5 w-5" />,
    href: "/pharmacy-admin/procurement",
    matchPrefixes: ["/pharmacy-admin/procurement", "/pharmacy-admin/branches", "/pharmacy-admin/audits"],
  },
  {
    id: "pos",
    label: "Dispensary / POS",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/pos",
    matchPrefixes: ["/pos", "/dispensary"],
  },
  {
    id: "finances",
    label: "Finances",
    icon: <DollarSign className="h-5 w-5" />,
    href: "/pharmacy-finance",
    matchPrefixes: ["/pharmacy-finance"],
  },
];

export default function PharmacyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user: any = null;
  const tenant: any = null;
  const userNameResolved = user?.full_name || user?.email || "Pharmacist Admin";
  const tenantNameResolved = tenant?.name || "Healthcare Facility";
  const branchShortCode =
    (user as any)?.branch_short_code || (tenant as any)?.code || "Main-01";
  const userProfileWired: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
    tenantName?: string;
    avatarUrl?: string;
  } = {
    userId: (user as any)?.id || (user as any)?.userId || "anon",
    fullName: userNameResolved,
    email: user?.email || "",
    role: user?.role || "PHARMACY ADMIN",
    tenantName: tenantNameResolved,
    avatarUrl: (user as any)?.avatar_url || undefined,
  };
  const isHome = pathname === "/pharmacy-admin";

  const contextualTabs: HeaderContextualTab[] = [
    {
      id: "executive",
      label: "Executive Dashboard",
      href: "/pharmacy-admin",
      matchPrefixes: ["/pharmacy-admin"],
      exact: true,
    },
    {
      id: "procurement",
      label: "Procurement & POs",
      href: "/pharmacy-admin/procurement",
      matchPrefixes: ["/pharmacy-admin/procurement"],
    },
    {
      id: "branches",
      label: "Multi-Branch & IBT",
      href: "/pharmacy-admin/branches",
      matchPrefixes: ["/pharmacy-admin/branches"],
    },
    {
      id: "audits",
      label: "Cycle Count Audits",
      href: "/pharmacy-admin/audits",
      matchPrefixes: ["/pharmacy-admin/audits"],
    },
    {
      id: "pricing",
      label: "Pricing & Margins",
      href: "/pharmacy-admin/pricing",
      matchPrefixes: ["/pharmacy-admin/pricing"],
    },
    {
      id: "staff",
      label: "Staff & Licensing",
      href: "/pharmacy-admin/staff",
      matchPrefixes: ["/pharmacy-admin/staff"],
    },
    {
      id: "settings",
      label: "Store & Hardware",
      href: "/pharmacy-admin/settings",
      matchPrefixes: ["/pharmacy-admin/settings"],
    },
  ];

  const primaryCta: HeaderPrimaryCta | undefined = isHome
    ? {
        label: "Launch POS Register",
        href: "/pos",
        icon: <ShoppingCart className="h-3.5 w-3.5" />,
      }
    : undefined;

  const heroBanner: MobileShellHeroBanner = {
    eyebrow: "Pharmacy Admin Overview",
    title: "This Week at a Glance",
    subtitle: "68% Gross Margin • 18 Active POs • 6 Stock Alerts",
    metric: "GHS 128,430",
    metricSuffix: "Weekly Revenue",
    primaryAction: {
      label: "Launch POS Register",
      href: "/pos",
      variant: "primary",
    },
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
      sectionIcon: <LayoutDashboard className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "inventory-value",
          title: "Inventory Value",
          subtitle: "All branches",
          metric: "GHS 542,180",
          metricLabel: "Total",
          icon: <Package className="w-4 h-4" />,
          tone: "teal",
          href: "/pharmacy-admin/procurement",
        },
        {
          id: "pos-transactions",
          title: "POS Transactions",
          subtitle: "This week",
          metric: "2,847",
          metricLabel: "Count",
          icon: <ShoppingCart className="w-4 h-4" />,
          tone: "sky",
          href: "/pos",
        },
        {
          id: "avg-transaction",
          title: "Avg Transaction",
          subtitle: "Ticket size",
          metric: "GHS 45.08",
          metricLabel: "Avg",
          icon: <DollarSign className="w-4 h-4" />,
          tone: "amber",
          href: "/pharmacy-finance",
        },
        {
          id: "stock-alerts",
          title: "Stock Alerts",
          subtitle: "Action required",
          metric: "6",
          metricLabel: "Critical",
          icon: <AlertTriangle className="w-4 h-4" />,
          tone: "rose",
          href: "/pharmacy-admin/procurement",
        },
      ],
    },
    {
      id: "recent-activity",
      sectionTitle: "Recent Activity",
      sectionIcon: <Receipt className="w-3.5 h-3.5" />,
      cards: [
        {
          id: "po-received",
          title: "New PO Received",
          subtitle: "PO-2024-0871",
          metric: "Now",
          metricLabel: "Time",
          icon: <Truck className="w-4 h-4" />,
          tone: "neutral",
          href: "/pharmacy-admin/procurement",
        },
        {
          id: "audit-completed",
          title: "Audit Completed",
          subtitle: "Cycle Count A-12",
          metric: "99.2%",
          metricLabel: "Accuracy",
          icon: <ClipboardCheck className="w-4 h-4" />,
          tone: "teal",
          href: "/pharmacy-admin/audits",
        },
        {
          id: "invoice-paid",
          title: "Invoice Paid",
          subtitle: "INV-4421",
          metric: "GHS 12,850",
          metricLabel: "Amount",
          icon: <Receipt className="w-4 h-4" />,
          tone: "sky",
          href: "/pharmacy-finance",
        },
        {
          id: "ibt-shipped",
          title: "IBT Shipped",
          subtitle: "Branch-02 → Branch-01",
          metric: "48 SKUs",
          metricLabel: "Items",
          icon: <Layers className="w-4 h-4" />,
          tone: "amber",
          href: "/pharmacy-admin/branches",
        },
      ],
    },
  ];

  return (
    <>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <aside className="shrink-0 h-full z-40 hidden md:block">
          <ClinicalSidebar
            subBrand="rx"
            role="PHARMACY_ADMIN"
            userName={userNameResolved}
            userRole={user?.role || "PHARMACY_ADMIN"}
            userInitials={userProfileWired.fullName}
            userProfile={userProfileWired}
            tenantName={tenantNameResolved}
            branchLabel={branchShortCode}
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
            appName="Pharmacy Admin"
            pageTitle={undefined}
            appSubtitle="Multi-Branch Pharmacy Operations, Procurement & Governance"
            tenantName={tenantNameResolved}
            userName={userNameResolved}
            userRole={user?.role || "PHARMACY ADMIN"}
            userInitials={userProfileWired.fullName}
            userProfile={userProfileWired}
            contextualTabs={[]}
            primaryCta={primaryCta}
            adminDeskHref="/hospital-admin"
            superAdminHref="/super-admin"
            onLogout={undefined}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            {children}
          </main>
        </div>
      </div>
      <div className="md:hidden min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 relative">
        <MobileShell
          facilityName={tenantNameResolved}
          roleBranchLabel={`${user?.role || "PHARMACY ADMIN"} • ${branchShortCode}`}
          userName={userNameResolved}
          userInitials={userProfileWired.fullName}
          userAvatarUrl={userProfileWired.avatarUrl}
          heroBanner={heroBanner}
          filterSection={filterSection}
          cardRails={cardRails}
          mobileBottomNavTabs={PHARMACY_ADMIN_MOBILE_TABS}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        >
          {children}
        </MobileShell>
        <MobileBottomNav
          tabs={PHARMACY_ADMIN_MOBILE_TABS}
          pathname={pathname}
          onNavigate={undefined}
          LinkRenderer={NextLinkRenderer}
          onMenuClick={() => {}}
        />
      </div>
    </>
  );
}
