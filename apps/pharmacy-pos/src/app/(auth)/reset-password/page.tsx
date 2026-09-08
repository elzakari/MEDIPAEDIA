"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";

type StrengthBullet = {
  label: string;
  pass: (pwd: string) => boolean;
};

const STRENGTH_RULES: StrengthBullet[] = [
  {
    label: "8+ characters",
    pass: (pwd) => pwd.length >= 8,
  },
  {
    label: "Uppercase letter (A-Z)",
    pass: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: "Number (0-9)",
    pass: (pwd) => /\d/.test(pwd),
  },
  {
    label: "Symbol (! @ # $ % etc.)",
    pass: (pwd) =>
      /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?\`~]/.test(pwd),
  },
];

function PharmacyResetPasswordContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const apiClient = createApiClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strength = useMemo(
    () =>
      STRENGTH_RULES.reduce(
        (acc, rule) => ({ ...acc, [rule.label]: rule.pass(password) }),
        {} as Record<string, boolean>,
      ),
    [password],
  );
  const allStrengthPass = STRENGTH_RULES.every((r) => strength[r.label]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    !!(token && token.length >= 16) &&
    allStrengthPass &&
    passwordsMatch &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.resetPassword({ token, new_password: password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch (err: any) {
      const detail =
        (err as any)?.detail ||
        (err as any)?.message ||
        "Reset link is invalid or has expired. Please request a new one.";
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || token.length < 16) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl">
          <CardContent className="p-6 text-center space-y-5">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {t("resetPassword.missingTitle") ||
                  "Reset link is incomplete."}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-5">
                {t("resetPassword.pharmacyMissingBody") ||
                  "This page expects a secure one-time token in the URL. Please return to the link sent by email, or request a new pharmacy password reset."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:underline underline-offset-2"
              >
                {t("resetPassword.newLink") || "Request a new link"}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("common.backToSignIn") || "Back to Sign In"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  {t("resetPassword.pharmacyTitle") ||
                    "Choose a New Dispensary Password"}
                </CardTitle>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {t("resetPassword.pharmacySubtitle") ||
                    "Medipaedia Rx Gateway · One-time secure reset"}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase tracking-[0.18em] bg-white dark:bg-slate-900/80 border-emerald-200 dark:border-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5"
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              {t("resetPassword.secureBadge") || "256-bit reset"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          {success ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 p-5 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-emerald-800 dark:text-emerald-100">
                    {t("resetPassword.successTitle") ||
                      "Dispensary password updated."}
                  </h3>
                  <p className="text-[12px] leading-5 text-emerald-700/90 dark:text-emerald-200/85">
                    {t("resetPassword.pharmacySuccessBody") ||
                      "Sign in below with your new credentials. Any existing POS, finance, or superintendent sessions on other devices have been signed out."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="teal"
                  size="sm"
                  onClick={() => router.push("/login")}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-600/15"
                >
                  {t("resetPassword.pharmacySignInCta") ||
                    "Continue to Dispensary Sign In"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="rounded-xl border border-red-200/70 dark:border-red-500/10 bg-red-50/70 dark:bg-red-500/5 p-3 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[12px] leading-5 text-red-800/95 dark:text-red-200/90">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="new-password"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    {t("resetPassword.newPasswordLabel") || "New Password"}
                  </label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Emerald#2024 · minimum 8 chars"
                      className="h-11 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 text-slate-900 dark:text-white text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                      aria-label="Toggle new password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <ul className="grid grid-cols-1 gap-1.5 pt-2">
                    {STRENGTH_RULES.map((rule) => {
                      const ok = !!strength[rule.label];
                      return (
                        <li
                          key={rule.label}
                          className="flex items-center gap-2 text-[11px] font-semibold"
                        >
                          {ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          )}
                          <span
                            className={
                              ok
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-slate-600 dark:text-slate-400"
                            }
                          >
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    {t("resetPassword.confirmLabel") || "Confirm New Password"}
                  </label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Retype new password"
                      className="h-11 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 text-slate-900 dark:text-white text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p
                    className={`text-[11px] font-semibold leading-5 ${
                      confirmPassword.length === 0
                        ? "text-slate-500 dark:text-slate-500"
                        : passwordsMatch
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {confirmPassword.length === 0
                      ? t("resetPassword.confirmEmptyHint") ||
                        "Re-enter your password exactly as above."
                      : passwordsMatch
                      ? t("resetPassword.confirmMatch") ||
                        "Passwords match."
                      : t("resetPassword.confirmMismatch") ||
                        "Passwords do not match."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("common.backToSignIn") || "Back to Sign In"}
                </Link>
                <Button
                  type="submit"
                  variant="teal"
                  disabled={!canSubmit}
                  className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-600/15"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("resetPassword.submitting") || "Updating password..."}
                    </>
                  ) : (
                    t("resetPassword.submit") || "Update Password"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-500">
        {t("resetPassword.pharmacySecurityFooter") ||
          "After a successful password change, other POS / superintendent sessions are signed out automatically; financial cashier sessions require re-verification at the till."}
      </div>
    </div>
  );
}

export default function PharmacyResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-xs font-bold text-slate-400 animate-pulse">
          Loading secure password reset...
        </div>
      }
    >
      <PharmacyResetPasswordContent />
    </Suspense>
  );
}
