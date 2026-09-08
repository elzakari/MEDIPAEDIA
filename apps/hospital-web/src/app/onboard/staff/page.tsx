"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  FileBadge,
  Sparkles,
  Loader2,
  Stethoscope,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";
import { createApiClient, StaffVerificationResponse } from "@medipaedia/api-client";

function StaffOnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") || "";
  const apiClient = createApiClient();

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<StaffVerificationResponse | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("2027-12-31");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token specified. Please check your invitation email.");
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.verifyStaffInvitation(token);
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
      alert("Passwords do not match!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.completeStaffOnboarding({
        token,
        password,
        phone_number: phoneNumber || undefined,
        license_number: licenseNumber || undefined,
        license_expiry: licenseExpiry || undefined,
      });

      document.cookie = `access_token=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", res.access_token);
        localStorage.setItem("user", JSON.stringify({
          id: res.user_id,
          email: res.email,
          full_name: res.full_name,
          role: res.role,
          tenant_id: res.tenant_id,
        }));
      }

      setSuccessData(res);
      setTimeout(() => {
        router.push(res.default_redirect_path || "/doctor");
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to complete staff onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
        <Loader2 className="h-10 w-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Validating Staff Invitation Link...</p>
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
          <h2 className="text-xl font-extrabold text-white">Account Activated!</h2>
          <p className="text-xs text-slate-300">{successData.message}</p>
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-teal-300">
            Redirecting to your clinical workstation...
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Clinical Staff Invitation
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome, {invitation?.first_name} {invitation?.last_name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            You have been invited to join <strong className="text-slate-200">{invitation?.facility_name}</strong>.
          </p>
        </div>

        <Card className="p-4 border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Email Address</span>
              <span className="font-mono font-bold text-slate-200">{invitation?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="text-[10px] font-bold">
                {invitation?.role}
              </Badge>
              {invitation?.branch_name && (
                <Badge variant="cyan" className="text-[10px] font-bold">
                  {invitation.branch_name}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 border-slate-800 bg-slate-900/90 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Create Secure Password *
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number (WhatsApp Active)
              </label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +233 20 123 4567"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MDC / NMC / Pharmacy PIN
                </label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MDC/RN/9182"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  License Expiry Date
                </label>
                <Input
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="teal"
              isLoading={submitting}
              className="w-full py-3 text-sm font-bold shadow-lg shadow-teal-500/20 mt-4"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Activate Account & Enter Workstation
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function StaffOnboardPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading Staff Gateway...</div>}>
      <StaffOnboardContent />
    </Suspense>
  );
}
