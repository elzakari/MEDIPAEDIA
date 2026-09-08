"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Header, HeaderNavLink } from "@medipaedia/ui";
import {
  useAuth,
  normalizeUserRoles,
  humanizeRoleLabel,
  userHasAnyRole as _userHasAnyRole,
} from "@/context/AuthContext";

export interface HospitalHeaderProps {
  subBrand?: any;
  appName?: string;
  appSubtitle?: string;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  tenantName?: string;
  tenantType?: "HOSPITAL" | "CLINIC" | "PHARMACY" | "PLATFORM";
  adminDeskHref?: string;
  superAdminHref?: string;
  navLinks?: HeaderNavLink[];
  roleAwareTopNav?: boolean;
  onNotificationClick?: () => void;
  notificationCount?: number;
  branchLabel?: string;
}

type TopNavRole =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "HOSPITAL_ADMIN"
  | "RECORD_CLERK"
  | "RECORDS_CLERK"
  | "NURSE"
  | "DOCTOR"
  | "PHARMACIST"
  | "PHARMACY_ADMIN"
  | "HOSPITAL_FINANCE"
  | "PHARMACY_FINANCE"
  | "SUPERINTENDENT_PHARMACIST"
  | "PATIENT";

interface TopNavLink extends HeaderNavLink {
  roles: TopNavRole[];
}

const DEFAULT_TOP_NAV: TopNavLink[] = [
  {
    label: "Reception",
    href: "/reception",
    roles: ["RECORD_CLERK", "RECORDS_CLERK", "HOSPITAL_ADMIN", "TENANT_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Nurse Triage",
    href: "/triage",
    roles: ["NURSE", "HOSPITAL_ADMIN", "TENANT_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Doctor Workstation",
    href: "/doctor/consultations/new",
    roles: ["DOCTOR", "HOSPITAL_ADMIN", "TENANT_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "E-Prescriptions",
    href: "/doctor/prescriptions",
    roles: ["DOCTOR", "PHARMACIST", "PHARMACY_ADMIN", "HOSPITAL_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Patient Directory",
    href: "/patients",
    roles: [
      "RECORD_CLERK",
      "RECORDS_CLERK",
      "NURSE",
      "DOCTOR",
      "HOSPITAL_ADMIN",
      "PHARMACY_ADMIN",
      "TENANT_ADMIN",
      "SUPER_ADMIN",
    ],
  },
];

export function HospitalHeader({
  subBrand = "clinical",
  appName = "Clinical EHR",
  appSubtitle = "Hospital & EHR Operations",
  userName,
  userRole,
  userInitials,
  tenantName,
  tenantType,
  adminDeskHref = "/hospital-admin",
  superAdminHref = "/super-admin",
  navLinks,
  roleAwareTopNav = true,
  onNotificationClick,
  notificationCount,
  branchLabel,
}: HospitalHeaderProps) {
  const { user, tenant } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>("");
  const [planCode, setPlanCode] = useState<string>("PLAN-GROWTH");
  const [planName, setPlanName] = useState<string>("Regional Growth Plan");

  const effectiveTenantName = tenantName || tenant?.name || "Healthcare Facility";
  const effectiveTenantType = tenantType || tenant?.tenant_type || "HOSPITAL";
  const effectiveUserName = userName || user?.full_name || "Facility Administrator";
  const scalarRoleFallback = userRole || user?.role || "HOSPITAL_ADMIN";

  const normalizedRoles = useMemo(
    () => normalizeUserRoles(user?.role ?? scalarRoleFallback, user?.roles ?? []),
    [user?.role, user?.roles, scalarRoleFallback]
  );
  const effectiveUserRole = useMemo(() => {
    const labels = normalizedRoles.map(humanizeRoleLabel);
    if (labels.length <= 1) return labels[0] || "Hospital Admin";
    return labels.join(" • ");
  }, [normalizedRoles]);

  const visibleTopLinks = roleAwareTopNav
    ? DEFAULT_TOP_NAV.filter((item) => {
        const itemRoleSet = new Set(item.roles.map((r) => r.toUpperCase()));
        if (normalizedRoles.includes("SUPER_ADMIN")) return true;
        return normalizedRoles.some((r) => itemRoleSet.has(r));
      }).map(({ roles: _roles, ...rest }) => rest)
    : undefined;

  const finalNavLinks = navLinks ?? visibleTopLinks;

  useEffect(() => {
    if (tenant?.subscription_plan_code) {
      setPlanCode(tenant.subscription_plan_code);
      setPlanName(tenant.subscription_plan_code.replace("PLAN-", "") + " Plan");
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    fetch("http://localhost:8000/api/v1/branches", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
          const savedBranch = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
          if (savedBranch && data.some((b: any) => b.id === savedBranch)) {
            setCurrentBranchId(savedBranch);
          } else {
            const main = data.find((b: any) => b.is_main_hub) || data[0];
            setCurrentBranchId(main.id);
          }
        } else {
          const fallback = [
            {
              id: "b-main-hub",
              name: `${effectiveTenantName} - Main Hub`,
              code: "MAIN-01",
              branch_type: "MAIN_HUB",
              is_main_hub: true,
            },
          ];
          setBranches(fallback);
          setCurrentBranchId("b-main-hub");
        }
      })
      .catch(() => {
        const fallback = [
          {
            id: "b-main-hub",
            name: `${effectiveTenantName} - Main Hub`,
            code: "MAIN-01",
            branch_type: "MAIN_HUB",
            is_main_hub: true,
          },
        ];
        setBranches(fallback);
        setCurrentBranchId("b-main-hub");
      });
  }, [tenant, effectiveTenantName]);

  const handleSelectBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_branch_id", branchId);
      document.cookie = `active_branch_id=${branchId}; path=/; max-age=2592000; SameSite=Lax`;
    }
  };

  return (
    <Header
      subBrand="clinical"
      appName={appName}
      appSubtitle={appSubtitle}
      tenantName={effectiveTenantName}
      tenantType={effectiveTenantType}
      userName={effectiveUserName}
      userRole={effectiveUserRole}
      userInitials={userInitials}
      adminDeskHref={adminDeskHref}
      superAdminHref={superAdminHref}
      navLinks={finalNavLinks}
      branches={branches}
      currentBranchId={currentBranchId}
      planCode={planCode}
      planName={planName}
      defaultTenantName={effectiveTenantName}
      onSelectBranch={handleSelectBranch}
      onNotificationClick={onNotificationClick}
      notificationCount={notificationCount}
      branchLabel={branchLabel}
    />
  );
}

