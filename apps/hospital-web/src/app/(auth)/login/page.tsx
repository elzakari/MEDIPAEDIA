"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardenedLoginForm } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";
import { getRoleDefaultPath } from "@/context/AuthContext";

function HospitalLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") ?? null;

  useEffect(() => {
    if (searchParams?.get("logout") === "true") {
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          sessionStorage.clear();
        } catch {}
      }
    }
  }, [searchParams]);

  const handleLogin = async (credentials: {
    identifier: string;
    password: string;
    facilitySlug?: string;
  }) => {
    const apiClient = createApiClient();
    const rawIdentifier = credentials.identifier.trim();
    const looksLikeEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(rawIdentifier);
    const tokenPair = await apiClient.loginStaff({
      identifier: rawIdentifier,
      email: looksLikeEmail ? rawIdentifier : undefined,
      password: credentials.password.trim(),
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("access_token", tokenPair.access_token);
        localStorage.setItem("refresh_token", tokenPair.refresh_token);
        if (tokenPair.tenant_id) localStorage.setItem("tenant_id", tokenPair.tenant_id);
      } catch {}
    }
    document.cookie = `access_token=${tokenPair.access_token}; path=/; max-age=${tokenPair.expires_in}; SameSite=Lax`;
    document.cookie = `refresh_token=${tokenPair.refresh_token}; path=/; max-age=${tokenPair.expires_in}; SameSite=Lax`;
    if (tokenPair.tenant_id) {
      document.cookie = `tenant_id=${tokenPair.tenant_id}; path=/; max-age=${tokenPair.expires_in}; SameSite=Lax`;
    }

    const redirectPath = returnUrl || tokenPair.default_redirect_path || getRoleDefaultPath(tokenPair.role);
    router.push(redirectPath);
  };

  return (
    <HardenedLoginForm
      portalType="clinical"
      accentColor="teal"
      onLogin={handleLogin}
      onForgotPassword={() => router.push("/forgot-password")}
    />
  );
}

export default function HospitalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-xs font-bold text-slate-400 animate-pulse">
          Loading Medipaedia Clinical Gateway...
        </div>
      }
    >
      <HospitalLoginContent />
    </Suspense>
  );
}
