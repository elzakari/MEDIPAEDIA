"use client";

import React, { useEffect, useState } from "react";
import { Header, HeaderNavLink } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";

export interface PharmacyHeaderProps {
  currentRole?: string;
  userName?: string;
  tenantName?: string;
  primaryLaunchLabel?: string;
  primaryLaunchHref?: string;
  primaryLaunchIcon?: React.ReactNode;
  overrideNavLinks?: HeaderNavLink[];
}

const normalizeRole = (r: string): string =>
  String(r || "").trim().toUpperCase().replace(/RECORDS_CLERK/g, "RECORD_CLERK");

const normalizeUserRoles = (role?: string | null, roles?: string[] | null): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw) return;
    const r = normalizeRole(raw);
    if (!r || seen.has(r)) return;
    seen.add(r);
    out.push(r);
  };
  if (Array.isArray(roles)) roles.forEach(push);
  if (!out.length) push(role);
  return out;
};

const humanizeRoleLabel = (r: string): string => {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Platform Admin",
    HOSPITAL_ADMIN: "Hospital Admin",
    PHARMACY_ADMIN: "Pharmacy Admin",
    TENANT_ADMIN: "Facility Admin",
    DOCTOR: "Doctor",
    NURSE: "Nurse",
    HOSPITAL_FINANCE: "Hospital Finance",
    PHARMACY_FINANCE: "Pharmacy Finance",
    RECORD_CLERK: "Record Clerk",
    RECORDS_CLERK: "Record Clerk",
    PHARMACIST: "Pharmacist",
    SUPERINTENDENT_PHARMACIST: "Superintendent Pharmacist",
    PATIENT: "Patient",
  };
  return map[normalizeRole(r)] ?? String(r).replace(/_/g, " ");
};

const displayUserRoles = (role?: string | null, roles?: string[] | null): string => {
  const list = normalizeUserRoles(role, roles);
  return list.map(humanizeRoleLabel).join(" • ");
};

const hasAnyRole = (normalized: string[], ...expected: string[]): boolean => {
  const e = new Set(expected.map(normalizeRole));
  if (normalized.includes("SUPER_ADMIN")) return true;
  return normalized.some((r) => e.has(r));
};

const pickPrimaryPharmacyRole = (roles: string[]): string => {
  const order = [
    "SUPER_ADMIN",
    "PHARMACY_ADMIN",
    "TENANT_ADMIN",
    "SUPERINTENDENT_PHARMACIST",
    "PHARMACY_FINANCE",
    "PHARMACIST",
  ];
  for (const o of order) if (roles.includes(o)) return o;
  return roles[0] || "PHARMACIST";
};

export function parseJwtRole(): { role: string; roles?: string[]; sub: string } | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (!match) return null;
  try {
    const parts = match[1].split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(payloadBase64);
      return JSON.parse(decoded);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function PharmacyHeader({
  currentRole,
  userName,
  tenantName,
  primaryLaunchLabel,
  primaryLaunchHref,
  primaryLaunchIcon,
  overrideNavLinks,
}: PharmacyHeaderProps) {
  const [resolvedRoles, setResolvedRoles] = useState<string[]>(normalizeUserRoles(currentRole || "PHARMACIST", []));
  const [resolvedUserName, setResolvedUserName] = useState<string>(userName || '');
  const [resolvedTenantName, setResolvedTenantName] = useState<string>(tenantName || '');

  const activeRole = pickPrimaryPharmacyRole(resolvedRoles);

  const isUUIDish = (val: string | null | undefined): boolean => {
    if (!val) return false;
    const v = val.trim();
    if (/^[0-9a-f-]{36}$/i.test(v)) return true;
    if (v.includes("-") && /^[0-9a-f]{8,}-[0-9a-f]{4,}-/i.test(v)) return true;
    return false;
  };

  const fetchAuthMe = async (token: string): Promise<{
    full_name?: string;
    name?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    roles?: string[];
    primary_role?: string;
    tenant_name?: string;
    facility_name?: string;
    tenant?: { name?: string };
  } | null> => {
    try {
      const baseUrl = (createApiClient() as any).baseUrl || "http://localhost:8000/api/v1";
      const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
      const meUrl = cleanBase.endsWith("/api/v1")
        ? `${cleanBase}/auth/me`
        : `${cleanBase}/api/v1/auth/me`;
      const res = await fetch(meUrl, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return null;
      const body = await res.json();
      return (body?.data ?? body) || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      let detectedTenant = tenantName || "";
      let detectedUser = userName || "";
      let detectedScalarRole = currentRole || "";
      let detectedRolesArr: string[] = [];
      let userObjFromStorage: any = null;

      const storedFacility = localStorage.getItem("active_facility_name");
      const storedTenant = localStorage.getItem("tenant");
      const storedUser = localStorage.getItem("user");
      const tokenFromStorage = localStorage.getItem("access_token") || localStorage.getItem("auth_token");

      if (!detectedTenant && storedFacility) {
        detectedTenant = storedFacility;
      }

      if (storedTenant) {
        try {
          const t = JSON.parse(storedTenant);
          if (!detectedTenant) {
            detectedTenant = t.name || t.facility_name || t.company_name || t.display_name || "";
          }
        } catch {}
      }

      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          userObjFromStorage = u;
          if (!detectedUser) {
            detectedUser = u.full_name || u.name || u.username || "";
          }
          if (!detectedUser && (u.first_name || u.last_name)) {
            detectedUser = `${u.first_name || ""} ${u.last_name || ""}`.trim();
          }
          if (!detectedScalarRole && u.role) detectedScalarRole = u.role;
          if (Array.isArray(u.roles) && u.roles.length) detectedRolesArr = [...u.roles];
          if (u.primary_role && !detectedScalarRole) detectedScalarRole = u.primary_role;
          if (!detectedTenant && (u.tenant_name || u.facility_name)) {
            detectedTenant = u.tenant_name || u.facility_name;
          }
          if (!detectedTenant && u.tenant?.name) detectedTenant = u.tenant.name;
        } catch {}
      }

      let jwtPayload: any = null;
      if (!detectedTenant || !detectedUser || !detectedScalarRole || detectedRolesArr.length === 0) {
        try {
          const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
          if (match) {
            const parts = match[1].split(".");
            if (parts.length === 3) {
              const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              jwtPayload = JSON.parse(decodeURIComponent(escape(window.atob(payloadBase64))));
              if (!detectedTenant) {
                detectedTenant = jwtPayload.tenant_name || jwtPayload.facility_name || jwtPayload.tenant?.name || jwtPayload.company_name || "";
              }
              if (!detectedUser) {
                detectedUser = jwtPayload.full_name || jwtPayload.name || jwtPayload.username || "";
                if (!detectedUser && (jwtPayload.first_name || jwtPayload.last_name)) {
                  detectedUser = `${jwtPayload.first_name || ""} ${jwtPayload.last_name || ""}`.trim();
                }
              }
              if (!detectedScalarRole && jwtPayload.role) detectedScalarRole = jwtPayload.role;
              if (jwtPayload.primary_role && !detectedScalarRole) detectedScalarRole = jwtPayload.primary_role;
              if (Array.isArray(jwtPayload.roles) && jwtPayload.roles.length && detectedRolesArr.length === 0) {
                detectedRolesArr = [...jwtPayload.roles];
              }
            }
          }
        } catch {}
      }

      const userCandidate = userObjFromStorage || jwtPayload || null;
      if (isUUIDish(detectedUser)) {
        if (userCandidate && (userCandidate.first_name || userCandidate.last_name)) {
          const combined = `${userCandidate.first_name || ""} ${userCandidate.last_name || ""}`.trim();
          if (combined && !isUUIDish(combined)) detectedUser = combined;
        }
      }

      if (!detectedUser || isUUIDish(detectedUser) || !detectedTenant || !detectedScalarRole || detectedRolesArr.length === 0) {
        const bearer = tokenFromStorage || (() => {
          const m = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
          return m ? m[1] : "";
        })();
        if (bearer) {
          const me = await fetchAuthMe(bearer);
          if (me) {
            if (!detectedUser || isUUIDish(detectedUser)) {
              const meFull = me.full_name || me.name || me.username || "";
              if (meFull && !isUUIDish(meFull)) detectedUser = meFull;
              if ((!detectedUser || isUUIDish(detectedUser)) && (me.first_name || me.last_name)) {
                const combined = `${me.first_name || ""} ${me.last_name || ""}`.trim();
                if (combined && !isUUIDish(combined)) detectedUser = combined;
              }
            }
            if (!detectedTenant) {
              detectedTenant = me.tenant_name || me.facility_name || me.tenant?.name || "";
            }
            if (!detectedScalarRole && me.role) detectedScalarRole = me.role;
            if (me.primary_role && !detectedScalarRole) detectedScalarRole = me.primary_role;
            if (Array.isArray(me.roles) && me.roles.length && detectedRolesArr.length === 0) {
              detectedRolesArr = [...me.roles];
            }
          }
        }
      }

      const storedTenantObj = (() => { try { return storedTenant ? JSON.parse(storedTenant) : null; } catch { return null; } })();
      const facilityFinal = storedFacility
        || storedTenantObj?.name
        || storedTenantObj?.facility_name
        || storedTenantObj?.company_name
        || jwtPayload?.tenant_name
        || jwtPayload?.facility_name
        || jwtPayload?.tenant?.name
        || detectedTenant
        || "Nakwillies Drugs - Main Hub";
      const tenantDisplay = !detectedTenant || detectedTenant === "Dispensary" || detectedTenant === "Nakwillies Pharmacy" ? facilityFinal : detectedTenant;

      const finalRoles = normalizeUserRoles(detectedScalarRole, detectedRolesArr);

      if (cancelled) return;
      setResolvedTenantName(tenantDisplay);
      if (detectedUser) setResolvedUserName(detectedUser);
      setResolvedRoles(finalRoles);
    })();

    return () => { cancelled = true; };
  }, [tenantName, userName, currentRole]);

  const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const safeDisplayName = (!resolvedUserName || isUUID(resolvedUserName)) ? "" : resolvedUserName;
  const finalTenant = (!resolvedTenantName || resolvedTenantName === "Dispensary" || resolvedTenantName === "Nakwillies Pharmacy")
    ? "Nakwillies Drugs - Main Hub"
    : resolvedTenantName;

  const roleBadgeText = displayUserRoles(activeRole, resolvedRoles);

  let appName = "Rx Dispensary & POS";
  let appSubtitle = "Clinical Decision Support, FEFO Dispensation & Escrow Fulfillment";
  let roleNavLinks: HeaderNavLink[] = [];

  if (hasAnyRole(resolvedRoles, "PHARMACY_ADMIN", "SUPER_ADMIN", "TENANT_ADMIN")) {
    appName = "Pharmacy Governance";
    appSubtitle = "Procurement, Multi-Branch IBT & Stock Audits";
    roleNavLinks = [
      { href: "/pharmacy-admin", label: "Executive Dashboard" },
      { href: "/pharmacy-admin/billing-settings", label: "Commercial & Settlements" },
      { href: "/pharmacy-admin/procurement", label: "Procurement & POs" },
      { href: "/pharmacy-admin/transfers", label: "Branch Transfers" },
      { href: "/pharmacy-admin/audits", label: "Audits" },
      { href: "/pharmacy-admin/pricing", label: "Pricing" },
      { href: "/pharmacy-admin/staff", label: "Staff & Licensing" },
      { href: "/pharmacy-admin/store-settings", label: "Store Settings" },
    ];
  } else if (hasAnyRole(resolvedRoles, "SUPERINTENDENT_PHARMACIST")) {
    appName = "Superintendent Desk";
    appSubtitle = "FDA Ghana Statutory Narcotics, Batch Quarantine & Cold Chain Telemetry";
    roleNavLinks = [
      { href: "/superintendent", label: "Superintendent Desk" },
      { href: "/superintendent/narcotics", label: "Dangerous Drug Book" },
      { href: "/superintendent/quarantine", label: "Batch Quarantine" },
      { href: "/superintendent/cold-chain", label: "Cold Chain Logs" },
      { href: "/superintendent/pharmacovigilance", label: "ADR Pharmacovigilance" },
    ];
  } else if (hasAnyRole(resolvedRoles, "PHARMACY_FINANCE")) {
    appName = "Dispensary Finance";
    appSubtitle = "Paystack Escrow Releases & MoMo Settlements";
    roleNavLinks = [
      { href: "/pharmacy-finance", label: "Finance Overview" },
      { href: "/pharmacy-finance/escrow-ledger", label: "Escrow Ledger" },
      { href: "/pharmacy-finance#sales", label: "Daily Sales Tally" },
      { href: "/pharmacy-finance/payouts", label: "MoMo Settlements" },
    ];
  } else {
    appName = "Rx Dispensary & POS";
    appSubtitle = "Clinical Decision Support, FEFO Dispensation & Escrow Fulfillment";
    roleNavLinks = [
      { href: "/dispensary/pos", label: "Dispensary POS" },
      { href: "/dispensary/verify", label: "Verify Rx Claim" },
      { href: "/dispensary/inventory", label: "FEFO Inventory" },
      { href: "/dispensary/fulfillment", label: "Fulfillment Queue" },
    ];
  }

  const finalNavLinks: HeaderNavLink[] = overrideNavLinks && overrideNavLinks.length > 0
    ? overrideNavLinks
    : roleNavLinks;

  const [branches, setBranches] = useState<any[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>("");
  const [planCode, setPlanCode] = useState<string>("PLAN-GROWTH");
  const [planName, setPlanName] = useState<string>("Regional Growth Plan");

  useEffect(() => {
    const apiClient = createApiClient();
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    const fallbackBranches = [
      { id: "b-pharm-01", name: finalTenant, code: "MAIN-01", branch_type: "MAIN_HUB", is_main_hub: true },
    ];

    const applyBranchData = (data: any) => {
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
        setBranches(fallbackBranches);
        setCurrentBranchId("b-pharm-01");
      }
    };

    const buildFallbackUrl = (endpoint: string): string => {
      const baseUrl: string = (apiClient as any).baseUrl || "http://localhost:8000/api/v1";
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      if (cleanBase.endsWith("/api/v1") && cleanEndpoint.startsWith("/api/v1")) {
        return `${cleanBase}${cleanEndpoint.replace(/^\/api\/v1/, "")}`;
      }
      return `${cleanBase}${cleanEndpoint}`;
    };

    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    if (typeof (apiClient as any).getFacilityBranches === 'function') {
      (apiClient as any).getFacilityBranches()
        .then(applyBranchData)
        .catch(() => {
          setBranches(fallbackBranches);
          setCurrentBranchId("b-pharm-01");
        });
    } else {
      fetch(buildFallbackUrl("/api/v1/branches"), { headers: authHeaders })
        .then((res) => res.json())
        .then(applyBranchData)
        .catch(() => {
          setBranches(fallbackBranches);
          setCurrentBranchId("b-pharm-01");
        });
    }

    if (typeof (apiClient as any).getTenantEntitlements === 'function') {
      (apiClient as any).getTenantEntitlements()
        .then((data: any) => {
          if (data.plan_code) setPlanCode(data.plan_code);
          if (data.plan_name) setPlanName(data.plan_name);
        })
        .catch(() => {});
    } else {
      fetch(buildFallbackUrl("/api/v1/branches/entitlements"), { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          if (data.plan_code) setPlanCode(data.plan_code);
          if (data.plan_name) setPlanName(data.plan_name);
        })
        .catch(() => {});
    }
  }, [resolvedTenantName]);

  const handleSelectBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_branch_id", branchId);
      document.cookie = `active_branch_id=${branchId}; path=/; max-age=2592000; SameSite=Lax`;
    }
  };

  const resolveBranchCode = (b: any): string => {
    if (b?.code && String(b.code).toUpperCase() !== "MAIN") return b.code;
    return "MAIN-01";
  };

  return (
    <Header
      subBrand="rx"
      appName={appName}
      appSubtitle={appSubtitle}
      tenantName={finalTenant}
      tenantType="PHARMACY"
      userName={safeDisplayName}
      userRole={roleBadgeText}
      userProfile={{
        userId: "usr-current",
        fullName: safeDisplayName,
        email: safeDisplayName ? safeDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") + "@medipaedia.health" : "admin@medipaedia.health",
        role: roleBadgeText,
        tenantName: finalTenant,
      }}
      adminDeskHref={hasAnyRole(resolvedRoles, "PHARMACY_ADMIN", "SUPER_ADMIN") ? "/pharmacy-admin" : undefined}
      navLinks={finalNavLinks}
      primaryLaunchLabel={primaryLaunchLabel}
      primaryLaunchHref={primaryLaunchHref}
      primaryLaunchIcon={primaryLaunchIcon}
      branches={branches.map(b => ({
        ...b,
        name: b.is_main_hub || b.id === "b-pharm-01" ? finalTenant : (b.name || finalTenant),
        code: resolveBranchCode(b),
      }))}
      defaultTenantName={finalTenant}
      currentBranchId={currentBranchId}
      planCode={planCode}
      planName={planName}
      onSelectBranch={handleSelectBranch}
    />
  );
}
