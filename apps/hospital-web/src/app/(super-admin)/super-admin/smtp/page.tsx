"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Mail,
  Server,
  ShieldCheck,
  Send,
  Save,
  RefreshCw,
  X,
  Globe,
  Clock,
  KeyRound,
  AtSign,
  Lock,
  Cloud,
  Settings,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
  Toast,
  ToastProps,
} from "@medipaedia/ui";
import {
  createApiClient,
  type SmtpConfigResult,
  type SmtpConfigPayload,
  type SmtpProviderLiteral,
  type SmtpEncryptionLiteral,
  type SmtpTestResult,
} from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

type ProviderPreset = {
  id: SmtpProviderLiteral;
  label: string;
  hint: string;
  defaultHost: string;
  defaultPort: number;
  defaultEncryption: SmtpEncryptionLiteral;
  usernameLabel: string;
  passwordLabel: string;
};

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "GMAIL",
    label: "Gmail",
    hint: "Personal Gmail with App Password (2SV required).",
    defaultHost: "smtp.gmail.com",
    defaultPort: 587,
    defaultEncryption: "TLS",
    usernameLabel: "Gmail Address",
    passwordLabel: "App Password",
  },
  {
    id: "GOOGLE_WORKSPACE",
    label: "Google Workspace",
    hint: "Workspace SMTP relay or service account.",
    defaultHost: "smtp-relay.gmail.com",
    defaultPort: 587,
    defaultEncryption: "TLS",
    usernameLabel: "Workspace Identity",
    passwordLabel: "App Password / OAuth Secret",
  },
  {
    id: "AWS_SES",
    label: "AWS SES",
    hint: "Simple Email Service — use SMTP credentials from the SES console.",
    defaultHost: "email-smtp.eu-west-1.amazonaws.com",
    defaultPort: 587,
    defaultEncryption: "TLS",
    usernameLabel: "SES SMTP Username",
    passwordLabel: "SES SMTP Password",
  },
  {
    id: "SENDGRID",
    label: "SendGrid / Twilio",
    hint: "API Key as password, username always `apikey`.",
    defaultHost: "smtp.sendgrid.net",
    defaultPort: 587,
    defaultEncryption: "TLS",
    usernameLabel: "Username (usually `apikey`)",
    passwordLabel: "SendGrid API Key",
  },
  {
    id: "CUSTOM",
    label: "Custom SMTP",
    hint: "Bring your own relay (Postfix, Mailgun, self-hosted, etc.).",
    defaultHost: "smtp.example.com",
    defaultPort: 587,
    defaultEncryption: "TLS",
    usernameLabel: "SMTP Username",
    passwordLabel: "SMTP Password / Secret",
  },
];

const PORT_PRESETS: number[] = [25, 465, 587, 2525, 2526];

export default function SuperAdminSmtpGatewayPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [savedConfig, setSavedConfig] = useState<SmtpConfigResult | null>(null);

  // Form state
  const [provider, setProvider] = useState<SmtpProviderLiteral>("CUSTOM");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [encryption, setEncryption] = useState<SmtpEncryptionLiteral>("TLS");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@medipaedia.com");
  const [fromName, setFromName] = useState("Medipaedia Cloud Health");
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Test-connection prompt modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testSaveFirst, setTestSaveFirst] = useState(true);
  const [lastTestResult, setLastTestResult] = useState<SmtpTestResult | null>(null);

  const activePreset = useMemo(
    () => PROVIDER_PRESETS.find((p) => p.id === provider) || PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1],
    [provider]
  );

  const maskForDisplay = (maskedFromServer?: string | null): string => {
    if (!maskedFromServer) return "***";
    return maskedFromServer;
  };

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await apiClient.getSmtpConfig();
      if (cfg) {
        setSavedConfig(cfg);
        setProvider(cfg.provider || "CUSTOM");
        setSmtpHost(cfg.smtp_host);
        setSmtpPort(cfg.smtp_port);
        setEncryption(cfg.encryption);
        setUsername(cfg.username);
        setFromEmail(cfg.from_email);
        setFromName(cfg.from_name || "");
        // Password field is intentionally empty — server only returns a mask.
        setPassword("");
      } else {
        setSavedConfig(null);
      }
    } catch (err: any) {
      setError(err?.message || t("common.loadError") || "Could not load SMTP configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Auto-fill defaults whenever the user picks a provider preset.
  useEffect(() => {
    setSmtpHost(activePreset.defaultHost);
    setSmtpPort(activePreset.defaultPort);
    setEncryption(activePreset.defaultEncryption);
    if (activePreset.id === "SENDGRID") {
      setUsername((prev) => prev || "apikey");
    }
  }, [provider]);

  const buildPayload = (): SmtpConfigPayload => ({
    provider,
    smtp_host: smtpHost.trim(),
    smtp_port: Number(smtpPort),
    encryption,
    username: username.trim(),
    password_cleartext: password && password.length > 0 ? password : null,
    from_email: fromEmail.trim(),
    from_name: fromName && fromName.trim().length > 0 ? fromName.trim() : null,
  });

  const isFormDirty = useMemo(() => {
    if (!savedConfig) return true;
    return (
      provider !== (savedConfig.provider || "CUSTOM") ||
      smtpHost !== savedConfig.smtp_host ||
      Number(smtpPort) !== Number(savedConfig.smtp_port) ||
      encryption !== savedConfig.encryption ||
      username !== savedConfig.username ||
      (password && password.length > 0) ||
      fromEmail !== savedConfig.from_email ||
      (fromName || "") !== (savedConfig.from_name || "")
    );
  }, [provider, smtpHost, smtpPort, encryption, username, password, fromEmail, fromName, savedConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (!payload.smtp_host) throw new Error("SMTP host cannot be empty.");
      if (!payload.username) throw new Error("SMTP username cannot be empty.");
      if (!payload.from_email || payload.from_email.indexOf("@") < 0)
        throw new Error("Please provide a valid sender email.");
      const cfg = await apiClient.saveSmtpConfig(payload);
      setSavedConfig(cfg);
      setPassword("");
      setToast({
        type: "success",
        title: t("superAdmin.smtpSavedTitle") || "SMTP settings saved",
        message:
          t("superAdmin.smtpSavedMessage") ||
          `Gateway configuration saved for ${cfg.smtp_host}:${cfg.smtp_port} (${cfg.encryption}). Password stored encrypted at rest.`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      const msg = err?.message || t("common.saveError") || "Save failed.";
      setError(msg);
      setToast({
        type: "error",
        title: t("superAdmin.smtpSaveFailedTitle") || "Could not save SMTP settings",
        message: msg,
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  const openTestModal = () => {
    // Default recipient = admin email from user profile if possible; otherwise empty.
    try {
      const raw = window.localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        const email = parsed?.email || parsed?.email_address;
        if (email && typeof email === "string" && email.indexOf("@") >= 0) {
          setTestRecipient(email);
        }
      }
    } catch {}
    setTestModalOpen(true);
  };

  const handleRunTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const recipient = testRecipient.trim();
      if (!recipient || recipient.indexOf("@") < 0) throw new Error("Please provide a valid test recipient email.");
      const payload: any = {
        recipient_email: recipient,
        save_settings_first: testSaveFirst,
      };
      if (testSaveFirst) payload.settings = buildPayload();
      const result = await apiClient.testSmtpConnection(payload);
      setLastTestResult(result);
      if (result.config) {
        setSavedConfig(result.config);
        setPassword("");
      }
      const dispatch = result.dispatch;
      let toastType: ToastProps["type"] = "info";
      let title = "Test dispatched";
      let message = "";
      if (dispatch.status === "sent") {
        toastType = "success";
        title = t("superAdmin.smtpTestOkTitle") || "Email delivered";
        message =
          t("superAdmin.smtpTestOkMessage") ||
          `Test email dispatched successfully to ${recipient} via ${dispatch.via}. Check your inbox (and spam folder). Message-ID: ${dispatch.message_id || "n/a"}`;
      } else if (dispatch.status === "preview") {
        toastType = "warning";
        title = t("superAdmin.smtpTestPreviewTitle") || "No active SMTP profile — console preview logged";
        message =
          t("superAdmin.smtpTestPreviewMessage") ||
          `Email rendered and logged to backend server console (preview mode). Configure and save an active SMTP profile to send live messages.`;
      } else {
        toastType = "error";
        title = t("superAdmin.smtpTestFailTitle") || "SMTP test failed";
        message = dispatch.error || t("common.error") || "Unknown SMTP transport error.";
      }
      setToast({ type: toastType, title, message });
      setTimeout(() => setToast(null), 7000);
      if (dispatch.status === "sent" || dispatch.status === "preview") {
        setTestModalOpen(false);
      }
    } catch (err: any) {
      const msg = err?.message || t("common.error") || "Unknown error.";
      setError(msg);
      setToast({ type: "error", title: "Test failed", message: msg });
      setTimeout(() => setToast(null), 7000);
    } finally {
      setTesting(false);
    }
  };

  const dispatchBadge = (cfg: SmtpConfigResult | null) => {
    if (!cfg)
      return (
        <Badge variant="warning" className="text-[10px] font-bold py-1 px-2">
          No active profile
        </Badge>
      );
    if (cfg.last_tested_ok === true) {
      return (
        <Badge variant="success" className="text-[10px] font-bold py-1 px-2 gap-1 inline-flex items-center">
          <CheckCircle2 className="h-3 w-3" /> Connected & tested
        </Badge>
      );
    }
    if (cfg.last_tested_ok === false) {
      return (
        <Badge variant="danger" className="text-[10px] font-bold py-1 px-2 gap-1 inline-flex items-center">
          <XCircle className="h-3 w-3" /> Last test failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-bold py-1 px-2 gap-1 inline-flex items-center">
        <Clock className="h-3 w-3" /> Saved — test pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-2xl bg-slate-800/70" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-[520px] animate-pulse rounded-2xl bg-slate-800/70" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-slate-800/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(16,185,129,0.22)] border border-emerald-400/30">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-serif leading-tight">
                Email &amp; SMTP Gateway
              </h1>
              <p className="text-xs md:text-sm text-slate-400 leading-tight font-sans mt-0.5">
                Configure the branded transactional relay used for password resets, invitations, and platform notifications.
              </p>
            </div>
            {dispatchBadge(savedConfig)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={loadConfig}
            className="text-xs font-semibold gap-1.5 text-slate-300 hover:text-white border border-slate-700/60"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={openTestModal}
            className="text-xs font-bold gap-1.5 border border-teal-500/50 text-teal-200 hover:text-teal-50"
          >
            <Send className="h-3.5 w-3.5" /> Test Connection…
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !isFormDirty}
            className="text-xs font-bold gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.28)]"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Save SMTP Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl p-4 border border-rose-900/70 bg-rose-950/40 text-rose-200 text-xs font-semibold flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
          <div className="flex-1 min-w-0">{error}</div>
        </div>
      )}

      {/* Provider presets row */}
      <Card className="border-slate-800/80 bg-[#0F172A]/80 backdrop-blur-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-teal-400" />
            <CardTitle className="text-sm font-bold text-white tracking-tight">Provider Presets</CardTitle>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
            Select a preset to auto-fill host / port / encryption — you can still tweak any value.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {PROVIDER_PRESETS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`group text-left rounded-xl p-3 border transition-all duration-200 ${
                    active
                      ? "bg-teal-900/40 border-teal-500/70 shadow-[0_6px_20px_rgba(13,148,136,0.22)] ring-1 ring-teal-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black tracking-tight ${active ? "text-teal-200" : "text-slate-200"}`}>
                      {p.label}
                    </span>
                    {active && (
                      <Badge variant="success" className="text-[9px] font-bold py-0.5 px-1.5">
                        SELECTED
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-1.5 leading-snug min-h-[2rem]">{p.hint}</p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <code className="text-[10px] font-mono text-slate-400 bg-slate-800/70 px-1.5 py-0.5 rounded-md">
                      {p.defaultHost}
                    </code>
                    <code className="text-[10px] font-mono text-slate-400 bg-slate-800/70 px-1.5 py-0.5 rounded-md">
                      {p.defaultEncryption}:{p.defaultPort}
                    </code>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connection settings + Sender identity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-slate-800/80 bg-[#0F172A]/80 backdrop-blur-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-teal-400" />
              <CardTitle className="text-sm font-bold text-white tracking-tight">Relay Connection</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
              Hostname, port, auth credentials and encryption mode. Passwords are Fernet/XOR-encrypted at rest.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-teal-400" /> SMTP Host
              </label>
              <Input
                value={smtpHost}
                onChange={(e: any) => setSmtpHost(e.target.value || "")}
                placeholder={activePreset.defaultHost}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-teal-400" /> Port
                </label>
                <select
                  value={String(smtpPort)}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 outline-none"
                >
                  {PORT_PRESETS.concat([smtpPort].filter((n) => !PORT_PRESETS.includes(n))).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-400" /> Encryption
                </label>
                <div className="flex gap-1.5 p-1 bg-slate-900/70 rounded-xl border border-slate-700/70">
                  {(["TLS", "SSL", "NONE"] as SmtpEncryptionLiteral[]).map((mode) => {
                    const on = encryption === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEncryption(mode)}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                          on
                            ? mode === "NONE"
                              ? "bg-amber-900/60 text-amber-200 ring-1 ring-amber-500/40"
                              : "bg-teal-900/60 text-teal-100 ring-1 ring-teal-500/40"
                            : "text-slate-400 hover:text-slate-100"
                        }`}
                      >
                        {mode === "TLS" ? "TLS (STARTTLS)" : mode === "SSL" ? "SSL" : "No TLS/SSL"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-teal-400" /> {activePreset.usernameLabel}
              </label>
              <Input value={username} onChange={(e: any) => setUsername(e.target.value || "")} placeholder={activePreset.usernameLabel} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-teal-400" /> {activePreset.passwordLabel}
                </label>
                {savedConfig?.password_masked && (
                  <span className="text-[10px] font-mono text-slate-500">
                    currently: <code className="text-slate-400">{maskForDisplay(savedConfig.password_masked)}</code>
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value || "")}
                  placeholder={
                    savedConfig?.password_masked
                      ? "Leave blank to keep stored password; type here to overwrite."
                      : "Paste the secret / app password / API key…"
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-300 transition-colors"
                  tabIndex={-1}
                  aria-label={passwordVisible ? "Hide password" : "Reveal password"}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-[#0F172A]/80 backdrop-blur-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <CardTitle className="text-sm font-bold text-white tracking-tight">Sender Identity &amp; Status</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
              The envelope-sender shown to recipients and the last-known health state of this gateway.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-teal-400" /> Sender Email
              </label>
              <Input
                value={fromEmail}
                onChange={(e: any) => setFromEmail(e.target.value || "")}
                placeholder="noreply@medipaedia.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-teal-400" /> Sender Name
              </label>
              <Input
                value={fromName}
                onChange={(e: any) => setFromName(e.target.value || "")}
                placeholder="Medipaedia Cloud Health"
              />
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500">Gateway Health</span>
                {dispatchBadge(savedConfig)}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                <dt className="text-slate-500 font-mono">Profile</dt>
                <dd className="text-slate-200 font-semibold text-right">
                  {savedConfig ? savedConfig.provider || "CUSTOM" : "—"}
                </dd>
                <dt className="text-slate-500 font-mono">Host</dt>
                <dd className="text-slate-200 font-semibold text-right font-mono truncate">
                  {savedConfig ? `${savedConfig.smtp_host}:${savedConfig.smtp_port}` : "—"}
                </dd>
                <dt className="text-slate-500 font-mono">Encryption</dt>
                <dd className="text-slate-200 font-semibold text-right">{savedConfig?.encryption || "—"}</dd>
                <dt className="text-slate-500 font-mono">Last tested</dt>
                <dd className="text-slate-200 font-semibold text-right">
                  {savedConfig?.last_tested_at ? new Date(savedConfig.last_tested_at).toLocaleString() : "Never"}
                </dd>
                <dt className="text-slate-500 font-mono">Last recipient</dt>
                <dd className="text-slate-200 font-semibold text-right truncate">
                  {savedConfig?.last_tested_recipient || "—"}
                </dd>
                <dt className="text-slate-500 font-mono">Updated</dt>
                <dd className="text-slate-200 font-semibold text-right">
                  {savedConfig?.updated_at ? new Date(savedConfig.updated_at).toLocaleString() : "—"}
                </dd>
              </dl>
              {lastTestResult && (
                <div
                  className={`mt-2 rounded-xl p-3 border text-[11px] ${
                    lastTestResult.dispatch.status === "sent"
                      ? "border-emerald-800/70 bg-emerald-950/40 text-emerald-200"
                      : lastTestResult.dispatch.status === "preview"
                      ? "border-amber-800/60 bg-amber-950/30 text-amber-200"
                      : "border-rose-900/60 bg-rose-950/30 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black mb-1">
                    {lastTestResult.dispatch.status === "sent" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : lastTestResult.dispatch.status === "preview" ? (
                      <Activity className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Last dispatch outcome — {lastTestResult.dispatch.status.toUpperCase()}
                  </div>
                  <div className="font-mono opacity-90 leading-snug">
                    {lastTestResult.dispatch.error ||
                      (lastTestResult.dispatch.preview_text ? "Preview logged to backend console." :
                        `Delivered via ${lastTestResult.dispatch.via}; message-id: ${lastTestResult.dispatch.message_id || "n/a"}`)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            actionUrl={toast.actionUrl}
            actionLabel={toast.actionLabel}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Test connection modal (custom prompt — NotificationModal is for copyable success flows). */}
      {testModalOpen && (
        <Modal
          isOpen={testModalOpen}
          onClose={() => !testing && setTestModalOpen(false)}
          title="Send test email"
          className="!max-w-xl !w-full"
        >
          <p className="text-[12px] text-slate-500 -mt-2 mb-4 leading-snug">
            Send a branded connectivity email through the configured relay to verify credentials, sender SPF/DKIM, and inbox delivery.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-teal-400" /> Recipient email address
              </label>
              <Input
                value={testRecipient}
                onChange={(e: any) => setTestRecipient(e.target.value || "")}
                placeholder="you@yourdomain.com"
                autoFocus
              />
            </div>
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:bg-slate-800/70 transition-colors">
              <input
                type="checkbox"
                className="mt-1 h-3.5 w-3.5 accent-teal-500"
                checked={testSaveFirst}
                onChange={(e) => setTestSaveFirst(e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200">Save current form values before testing</p>
                <p className="text-[11px] text-slate-500 leading-snug">
                  If enabled, the current form will be persisted as the active profile before the test email is sent.
                  Disable this to do a dry-run against the already-saved profile (or preview mode).
                </p>
              </div>
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => !testing && setTestModalOpen(false)} disabled={testing}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRunTest} disabled={testing} className="font-bold text-xs gap-1.5">
                {testing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Send Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
