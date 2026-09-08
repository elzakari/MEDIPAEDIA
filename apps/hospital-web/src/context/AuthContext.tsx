"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const AUTH_ME_UNAUTH_SENTINEL = "__medipaedia_auth_me_unauth_fired";
let authMeUnauthFired = false;

type AnyWindowRecord = Record<string, unknown>;

const readSentinel = (): boolean => {
  if (typeof window === "undefined") return authMeUnauthFired;
  const fromGlobal = Boolean(
    (window as unknown as AnyWindowRecord)[AUTH_ME_UNAUTH_SENTINEL]
  );
  return authMeUnauthFired || fromGlobal;
};

const writeSentinel = (value: boolean): void => {
  authMeUnauthFired = value;
  if (typeof window !== "undefined") {
    (window as unknown as AnyWindowRecord)[AUTH_ME_UNAUTH_SENTINEL] = value;
  }
};

export interface TenantData {
  id: string;
  name: string;
  slug?: string;
  tenant_type: "HOSPITAL" | "CLINIC" | "PHARMACY" | "PLATFORM";
  country?: string;
  currency?: string;
  subscription_plan_code?: string;
  subscription_status?: string;
  license_number?: string;
  phone?: string;
  email?: string;
  city?: string;
}

export interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  roles?: string[];
  primary_role?: string;
  tenant_id?: string | null;
  phone?: string | null;
  license_number?: string | null;
}

export const normalizeUserRoles = (role?: string | null, roles?: string[] | null): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw) return;
    const r = String(raw).trim().toUpperCase().replace(/RECORDS_CLERK/g, "RECORD_CLERK");
    if (!r || seen.has(r)) return;
    seen.add(r);
    result.push(r);
  };
  if (Array.isArray(roles)) roles.forEach(push);
  if (!result.length) push(role);
  return result;
};

export const userHasAnyRole = (user: UserData | null | undefined, ...expected: string[]): boolean => {
  if (!user) return false;
  const userRoles = normalizeUserRoles(user.role, user.roles);
  if (userRoles.includes("SUPER_ADMIN")) return true;
  const expectedSet = new Set(expected.map((r) => r.toUpperCase().replace(/RECORDS_CLERK/g, "RECORD_CLERK")));
  return userRoles.some((r) => expectedSet.has(r));
};

export const displayUserRoles = (user: UserData | null | undefined): string[] => {
  if (!user) return [];
  return normalizeUserRoles(user.role, user.roles).map(humanizeRoleLabel);
};

export const humanizeRoleLabel = (r: string): string => {
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
  return map[r.toUpperCase()] ?? r.replace(/_/g, " ");
};

export interface AuthContextType {
  user: UserData | null;
  tenant: TenantData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithToken: (token: string, refreshToken?: string, user?: UserData, tenant?: TenantData) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  getRoleDefaultPath: (role?: string) => string;
  userHasRole: (...roles: string[]) => boolean;
}

export function getRoleDefaultPath(role?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "HOSPITAL_ADMIN":
    case "TENANT_ADMIN":
      return "/hospital-admin";
    case "PHARMACY_ADMIN":
      return "/pharmacy-admin";
    case "DOCTOR":
      return "/doctor/queue";
    case "NURSE":
      return "/nurse";
    case "HOSPITAL_FINANCE":
    case "CASHIER":
      return "/hospital-finance";
    case "RECORD_CLERK":
    case "RECORDS_CLERK":
      return "/reception";
    case "SUPERINTENDENT_PHARMACIST":
    case "SUPERINTENDENT":
      return "/superintendent";
    case "PHARMACIST":
      return "/dispensary";
    case "PHARMACY_FINANCE":
      return "/pharmacy-finance";
    case "PATIENT":
      return "/dashboard";
    default:
      return "/doctor";
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const purgeLegacyMockStorage = () => {
    if (typeof window === "undefined") return;
    const legacyKeys = [
      "mock_hospital_data",
      "active_facility_demo",
      "mock_patients",
      "demo_active_tenant",
      "medipaedia_mock_queue",
      "medipaedia_mock_patients",
      "medipaedia_mock_staff",
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("medipaedia_mock_") || k.startsWith("mock_"))) {
        localStorage.removeItem(k);
      }
    }
  };

  const purgeAllAuthStorage = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("medipaedia_auth_token");
    localStorage.removeItem("medipaedia_tenant_id");
    localStorage.removeItem("active_facility_name");
    localStorage.removeItem("active_branch_id");
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "refresh_token=; path=/; max-age=0";
    document.cookie = "medipaedia_auth_token=; path=/; max-age=0";
    document.cookie = "medipaedia_tenant_id=; path=/; max-age=0";
    document.cookie = "active_branch_id=; path=/; max-age=0";
  };

  const performLogout = () => {
    setUser(null);
    setTenant(null);
    setToken(null);
    purgeLegacyMockStorage();
    purgeAllAuthStorage();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/onboard") &&
      !window.location.pathname.startsWith("/_next")
    ) {
      const loc = window.location;
      const next = encodeURIComponent(loc.pathname + loc.search);
      loc.href = next ? `/login?logout=true&next=${next}` : "/login?logout=true";
    }
  };

  const refreshAuth = async () => {
    purgeLegacyMockStorage();

    if (
      typeof window !== "undefined" &&
      (pathname?.startsWith("/login") ||
        pathname?.startsWith("/onboard") ||
        pathname?.startsWith("/_next"))
    ) {
      setIsLoading(false);
      return;
    }

    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || localStorage.getItem("medipaedia_auth_token")
        : null;

    if (!storedToken) {
      setUser(null);
      setTenant(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/me", {
        credentials: "omit",
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        writeSentinel(false);
        const data = await res.json();
        const userData: UserData = {
          id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          roles: Array.isArray(data.roles) ? data.roles : undefined,
          primary_role: data.primary_role ?? undefined,
          tenant_id: data.tenant_id,
          phone: data.phone,
        };
        setUser(userData);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(userData));
        }

        if (data.active_tenant) {
          const tenantData: TenantData = {
            id: data.active_tenant.id,
            name: data.active_tenant.name,
            slug: data.active_tenant.slug,
            tenant_type: data.active_tenant.tenant_type,
            country: data.active_tenant.country,
            currency: data.active_tenant.currency || "GHS",
            subscription_plan_code: data.active_tenant.subscription_plan_code,
            subscription_status: data.active_tenant.subscription_status,
            license_number: data.active_tenant.license_number,
            phone: data.active_tenant.phone,
            email: data.active_tenant.email,
            city: data.active_tenant.city,
          };
          setTenant(tenantData);
          if (typeof window !== "undefined") {
            localStorage.setItem("tenant", JSON.stringify(tenantData));
            localStorage.setItem("medipaedia_tenant_id", tenantData.id);
            localStorage.setItem("active_facility_name", tenantData.name);
          }
        }
      } else if (res.status === 401) {
        purgeLegacyMockStorage();
        purgeAllAuthStorage();
        if (!readSentinel()) {
          writeSentinel(true);
          performLogout();
        }
      } else {
        if (typeof window !== "undefined") {
          const cachedUser = localStorage.getItem("user");
          const cachedTenant = localStorage.getItem("tenant");
          if (cachedUser) try { setUser(JSON.parse(cachedUser)); } catch {}
          if (cachedTenant) try { setTenant(JSON.parse(cachedTenant)); } catch {}
        }
      }
    } catch {
      if (typeof window !== "undefined") {
        const cachedUser = localStorage.getItem("user");
        const cachedTenant = localStorage.getItem("tenant");
        if (cachedUser) try { setUser(JSON.parse(cachedUser)); } catch {}
        if (cachedTenant) try { setTenant(JSON.parse(cachedTenant)); } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const loginWithToken = (
    newToken: string,
    refreshToken?: string,
    newUserData?: UserData,
    newTenantData?: TenantData
  ) => {
    purgeLegacyMockStorage();
    writeSentinel(false);
    setToken(newToken);
    if (newUserData) setUser(newUserData);
    if (newTenantData) setTenant(newTenantData);

    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", newToken);
      localStorage.setItem("medipaedia_auth_token", newToken);
      document.cookie = `access_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `medipaedia_auth_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;

      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
        document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
      }

      if (newUserData) {
        localStorage.setItem("user", JSON.stringify(newUserData));
      }

      if (newTenantData) {
        localStorage.setItem("tenant", JSON.stringify(newTenantData));
        localStorage.setItem("medipaedia_tenant_id", newTenantData.id);
        localStorage.setItem("active_facility_name", newTenantData.name);
        document.cookie = `medipaedia_tenant_id=${newTenantData.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `active_facility_name=${encodeURIComponent(newTenantData.name)}; path=/; max-age=86400; SameSite=Lax`;
      }
    }
  };

  const logout = () => {
    performLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        loginWithToken,
        logout,
        refreshAuth,
        getRoleDefaultPath,
        userHasRole: (...roles: string[]) => userHasAnyRole(user, ...roles),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
