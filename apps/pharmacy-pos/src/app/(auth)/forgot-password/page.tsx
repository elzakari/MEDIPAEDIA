"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";

function PharmacyForgotPasswordContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const apiClient = createApiClient();

  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await apiClient.forgotPassword({ identifier: trimmed });
    } catch {
      // Anti-enumeration: never surface lookup errors; always show confirmation UI.
    } finally {
      setConfirmed(true);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t("forgotPassword.pharmacyTitle") ||
                    "Reset Pharmacy Staff Password"}
                </CardTitle>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {t("forgotPassword.pharmacySubtitle") ||
                    "Medipaedia Rx Gateway · Secure recovery"}
                </p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          {!confirmed ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/10 bg-emerald-50/60 dark:bg-emerald-500/5 p-3 flex items-start gap-3">
                <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[12px] leading-5 text-emerald-800 dark:text-emerald-200/90">
                  {t("forgotPassword.pharmacyHint") ||
                    "Enter the registered pharmacy email, Pharmacy Council PIN, or superintendent license ID used to sign into dispensary."}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="identifier"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  {t("forgotPassword.pharmacyIdentifierLabel") ||
                    "Staff Email / Council PIN"}
                </label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="staff.email@pharmacy.gh / Pharmacy Council ID"
                  className="h-11 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 text-slate-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 px-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  {t("common.back") || "Back to Sign In"}
                </Button>
                <Button
                  type="submit"
                  variant="teal"
                  disabled={submitting || !identifier.trim()}
                  className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/15"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("forgotPassword.sending") || "Sending link..."}
                    </>
                  ) : (
                    t("forgotPassword.submit") || "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/15 bg-emerald-50/80 dark:bg-emerald-500/5 p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow shadow-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-100">
                    {t("forgotPassword.confirmationTitle") ||
                      "Check your inbox."}
                  </h3>
                  <p className="text-[12px] leading-5 text-emerald-700/90 dark:text-emerald-200/85">
                    {t("forgotPassword.confirmationBody") ||
                      "If a matching pharmacy account exists, a password reset link has been dispatched. The link expires in 15 minutes."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                <p className="text-[11px] leading-5 text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {t("forgotPassword.tipTitle") || "Didn't receive anything?"}
                  </span>{" "}
                  {t("forgotPassword.pharmacyTipBody") ||
                    "Verify your Spam folder, or contact the superintendent pharmacist to confirm the registered email / pharmacy council PIN on file."}
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:underline underline-offset-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("common.backToSignIn") || "Back to Sign In"}
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-500">
        {t("auth.pharmacySecurityFooter") ||
          "Protected end-to-end. Reset tokens are SHA-256 hashed and one-time-use only; all existing Rx sessions are revoked after successful reset."}
      </div>
    </div>
  );
}

export default function PharmacyForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-xs font-bold text-slate-400 animate-pulse">
          Loading pharmacy password recovery...
        </div>
      }
    >
      <PharmacyForgotPasswordContent />
    </Suspense>
  );
}
