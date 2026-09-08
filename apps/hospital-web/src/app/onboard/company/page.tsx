"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  MapPin,
  FileBadge,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Toast, ToastProps } from "@medipaedia/ui";
import { createApiClient, CompanyVerificationResponse } from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";


function CompanyOnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [toast, setToast] = useState<ToastProps | null>(null);
  const token = searchParams?.get("token") || "";
  const apiClient = createApiClient();

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<CompanyVerificationResponse | null>(null);

  // Form inputs
  const [adminFullName, setAdminFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [digitalAddress, setDigitalAddress] = useState("");
  const [city, setCity] = useState("Accra");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in link. Please verify your magic link.");
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.verifyCompanyInvitation(token);
        setInvitation(res);
      } catch (err: any) {
        setError(err.message || "Invitation link is invalid or has expired.");
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({
        type: "error",
        title: "Validation Error",
        message: "Passwords do not match. Please re-enter matching passwords.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.completeCompanyOnboarding({
        token,
        admin_full_name: adminFullName,
        password,
        phone_number: phoneNumber,
        registration_number: registrationNumber || undefined,
        physical_address: physicalAddress || undefined,
        digital_address: digitalAddress || undefined,
        city: city || "Accra",
      });

      // Clear stale mock demo keys
      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_hospital_data");
        localStorage.removeItem("active_facility_demo");
      }

      // Sync Auth State
      loginWithToken(
        res.access_token,
        res.refresh_token,
        {
          id: res.user_id,
          email: res.user_email,
          full_name: adminFullName || res.user_email.split("@")[0],
          role: res.user_role,
          tenant_id: res.tenant_id,
          phone: phoneNumber,
        },
        {
          id: res.tenant_id,
          name: res.tenant_name,
          slug: res.tenant_slug,
          tenant_type: res.tenant_type as any,
          country: invitation?.country || "Ghana",
          currency: invitation?.currency || "GHS",
          subscription_plan_code: invitation?.assigned_plan_code,
          subscription_status: "ACTIVE",
          license_number: registrationNumber || undefined,
          phone: phoneNumber,
          email: res.user_email,
          city: city || "Accra",
        }
      );

      setSuccessData(res);
      setTimeout(() => {
        router.push(res.default_redirect_path || "/hospital-admin");
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to complete facility onboarding.";
      setToast({
        type: "error",
        title: "Onboarding Error",
        message: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
        <Loader2 className="h-10 w-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Validating Medipaedia Facility Invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <Card className="max-w-md w-full p-6 border-red-500/30 bg-slate-900 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invitation Invalid or Expired</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <Button variant="teal" onClick={() => router.push("/login")} className="w-full">
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <Card className="max-w-md w-full p-8 border-teal-500/30 bg-slate-900 text-center space-y-4 animate-in fade-in">
          <div className="h-16 w-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">{successData.tenant_name} Provisioned!</h2>
          <p className="text-xs text-slate-300">{successData.message}</p>
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-teal-300">
            Redirecting to Admin Portal...
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-2xl space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Invitation-Only Facility Provisioning
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Complete Setup for {invitation?.company_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Set up your administrative credentials and facility compliance registry codes.
          </p>
        </div>

        {/* Pre-populated Badge Card */}
        <Card className="p-4 border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Authorized Facility Email</span>
              <span className="font-mono font-bold text-slate-200">{invitation?.admin_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="text-[10px] font-bold">
                {invitation?.tenant_type}
              </Badge>
              <Badge variant="cyan" className="text-[10px] font-mono font-bold">
                {invitation?.assigned_plan_code}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {invitation?.country} ({invitation?.currency})
              </Badge>
            </div>
          </div>
        </Card>

        {/* Setup Form */}
        <Card className="p-6 sm:p-8 border-slate-800 bg-slate-900/90 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                1. Root Administrator Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Administrator Full Name *
                  </label>
                  <Input
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="e.g. Dr. Hospital Administrator"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number (WhatsApp Active) *
                  </label>
                  <Input
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +233 24 123 4567"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Master Admin Password *
                  </label>
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <Input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                2. Regulatory & Facility Location
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    HeFRA / MDC / Pharmacy Council Reg PIN
                  </label>
                  <Input
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. HeFRA/GAR/HOS/2026/042"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    GhanaPost Digital Address
                  </label>
                  <Input
                    value={digitalAddress}
                    onChange={(e) => setDigitalAddress(e.target.value)}
                    placeholder="e.g. GA-102-4921"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Physical Street Address
                  </label>
                  <Input
                    value={physicalAddress}
                    onChange={(e) => setPhysicalAddress(e.target.value)}
                    placeholder="e.g. Castle Road, Ridge, Accra"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    City / Town
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Accra"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="teal"
              isLoading={submitting}
              className="w-full py-3 text-sm font-bold shadow-lg shadow-teal-500/20 mt-4"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Activate Facility & Launch Portal
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function CompanyOnboardPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading Invitation Gateway...</div>}>
      <CompanyOnboardContent />
    </Suspense>
  );
}
