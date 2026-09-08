"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  FileText,
  Activity,
  CreditCard,
  PlusCircle,
  Stethoscope,
  QrCode,
  ArrowRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  Inbox,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  StatCard,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient, type OpdQueueItem } from "@medipaedia/api-client";
import { useAuth, normalizeUserRoles, userHasAnyRole } from "@/context/AuthContext";

function ClinicalDashboardContent() {
  const { t } = useTranslation();
  const { tenant, user } = useAuth();
  const facilityName = tenant?.name || (user as any)?.tenant_name || "Healthcare Facility";
  const userRoles = normalizeUserRoles(user?.role || "", (user as any)?.roles || []);
  const hasClinicalHat = userHasAnyRole(user, "HOSPITAL_ADMIN", "DOCTOR", "SUPER_ADMIN", "NURSE", "HOSPITAL_FINANCE", "RECORD_CLERK", "TENANT_ADMIN");
  const hasPharmacyHat = userRoles.some((r) =>
    ["PHARMACY_ADMIN", "PHARMACIST", "SUPERINTENDENT_PHARMACIST", "PHARMACY_FINANCE"].includes(r)
  );
  const purePharmacyAccount = hasPharmacyHat && !hasClinicalHat;

  const [opdQueue, setOpdQueue] = useState<OpdQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueHttpStatus, setQueueHttpStatus] = useState<number | null>(null);

  const [stats, setStats] = useState({
    waiting: 0,
    completedToday: 0,
    prescriptions: 0,
    opdRevenueGhs: 0,
  });

  const loadClinicalOverview = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    setQueueHttpStatus(null);
    try {
      const client = createApiClient();
      const queue = await client.getTriageQueue();
      const arr = Array.isArray(queue) ? queue : (queue as any)?.data ? ((queue as any).data as OpdQueueItem[]) : [];
      setOpdQueue(arr);
      setStats((s) => ({ ...s, waiting: arr.length }));
    } catch (err: any) {
      setOpdQueue([]);
      setQueueHttpStatus(typeof err?.status === "number" ? err.status : typeof err?.response?.status === "number" ? err.response.status : null);
      setQueueError(err?.message || (t("common.error") || "Queue unavailable"));
    } finally {
      setLoadingQueue(false);
    }
  }, [t]);
  useEffect(() => { loadClinicalOverview(); }, [loadClinicalOverview]);

  const triageCount = opdQueue.length;
  const routineCount = opdQueue.filter((p) => !p.triage_priority || p.triage_priority === "ROUTINE").length;
  const urgentCount = triageCount - routineCount;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("clinical.dashboardTitle") || "Clinical Operations & OPD Triage"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {facilityName} · {t("clinical.opdBlock") || "Outpatient Department"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/patients">
            <Button variant="outline" className="gap-2">
              <QrCode className="h-4 w-4 text-teal-600" />
              {t("navigation.registerScanPatient") || "Register / Scan Patient"}
            </Button>
          </Link>
          <Link href="/doctor/consultations/new">
            <Button variant="primary" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              {t("doctor.newConsultation") || "New Consultation"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t("clinical.activeWaitingQueue") || "Active Waiting Queue"}
          value={`${stats.waiting} ${t("patients.plural") || "Patients"}`}
          description={t("clinical.avgWait16") || "Avg wait time synced live"}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: urgentCount > 0 ? `${urgentCount} priority` : (t("clinical.stable") || "All stable"), isPositive: urgentCount === 0 }}
        />
        <StatCard
          title={t("clinical.completedToday") || "Completed Today"}
          value={`${stats.completedToday} ${t("clinical.consults") || "Consults"}`}
          description={t("clinical.target50") || "Triage throughput auto-synced"}
          icon={<Stethoscope className="h-5 w-5" />}
          trend={{ value: t("clinical.syncedRealtime") || "Live EMR sync", isPositive: true }}
        />
        <StatCard
          title={t("clinical.eprescriptionsIssued") || "E-Prescriptions Issued"}
          value={`${stats.prescriptions} Rx`}
          description={t("clinical.hmacSigned") || "100% HMAC-signed"}
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: t("clinical.electronicOnly") || "Electronic only", isPositive: true }}
        />
        <StatCard
          title={t("finance.opdRegistrationFees") || "OPD Registration Fees"}
          value={`GHS ${stats.opdRevenueGhs.toLocaleString("en-GH")}`}
          description={t("finance.receiptedAtPos") || "Receipted at Cashier POS"}
          icon={<CreditCard className="h-5 w-5" />}
          trend={{ value: t("finance.syncedXero") || "Auto-synced to ledger", isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>{t("clinical.liveOpdQueue") || "Live OPD Patient Queue"}</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  {t("clinical.queueVitalsSynced") || "Vitals synchronized from triage nurse station"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="teal" className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                  {t("clinical.liveSync") || "Live Sync"}
                </Badge>
                <Button size="sm" variant="ghost" className="gap-1 text-xs text-slate-500 hover:text-slate-700" onClick={loadClinicalOverview}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingQueue ? "animate-spin" : ""}`} />
                  {t("common.refresh") || "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {loadingQueue ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  {t("clinical.loadingQueue") || "Loading outpatient queue…"}
                </div>
              ) : queueError ? (
                (queueHttpStatus === 403 || queueError.toLowerCase().includes("forbidden") || purePharmacyAccount) ? (
                  <div className="p-6 mx-5 my-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="font-bold text-amber-900 text-sm">
                        {userRoles.includes("PHARMACY_ADMIN")
                          ? "Your account is currently active as Pharmacy Admin."
                          : userRoles.includes("PHARMACIST")
                          ? "Your account is currently active as a Pharmacist."
                          : "Clinical OPD queue is not available for pharmacy-only accounts."}
                      </p>
                      <p className="text-amber-800/90 text-xs leading-relaxed">
                        Launch Pharmacy Desk (Port 3001) or switch to a Clinician account.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={`${process.env.NEXT_PUBLIC_PHARMACY_POS_URL || "http://localhost:3001"}/pharmacy-admin`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="primary" className="gap-1.5">
                            Launch Pharmacy Desk
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={loadClinicalOverview}>
                          {t("common.retry") || "Retry"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 mx-5 my-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-rose-600 shrink-0 rotate-45" />
                    <div className="flex-1">
                      <p className="font-bold text-rose-800">{t("clinical.queueUnavailable") || "Triage queue unavailable"}</p>
                      <p className="mt-0.5 text-rose-700/80">{queueError}</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-100 shrink-0" onClick={loadClinicalOverview}>
                      {t("common.retry") || "Retry"}
                    </Button>
                  </div>
                )
              ) : opdQueue.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400 px-6">
                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100">
                    <Inbox className="h-7 w-7 text-teal-600" />
                  </div>
                  <p className="font-bold text-slate-600 pt-1">
                    {t("clinical.noPatientsWaiting") || "No OPD patients waiting."}
                  </p>
                  <p className="text-slate-400 max-w-xs">
                    {t("clinical.checkReception") || "Check Reception OPD for new patient registrations or try a different date."}
                  </p>
                </div>
              ) : (
                opdQueue.map((patient) => {
                  const priority = (patient.triage_priority || "ROUTINE").toUpperCase();
                  const variant: "danger" | "warning" | "success" =
                    priority.startsWith("STAT") || priority === "CRITICAL" || priority === "URGENT"
                      ? "danger"
                      : priority === "PRIORITY" || priority === "SEMI"
                      ? "warning"
                      : "success";
                  const bp = patient.blood_pressure || (patient as any).bp || "";
                  const temp = typeof patient.temperature === "number" ? `${patient.temperature} \u00B0C` : ((patient as any).temp || "");
                  return (
                    <div
                      key={(patient as any).queue_id || (patient as any).id || String(patient.patient_id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="font-semibold text-slate-900 text-base">
                            {patient.patient_name || (patient as any).name || (t("patient.generic") || "Patient")}
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">
                            {patient.mrn || (patient as any).patient_mrn || (t("common.pending") || "—")}
                          </span>
                          <Badge variant={variant}>{priority}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {typeof (patient as any).age !== "undefined" ? (
                            <span>
                              {(patient as any).age} yrs &middot; {(patient as any).gender || (t("patient.unspecified") || "—")}
                            </span>
                          ) : null}
                          {patient.ghana_card_number || (patient as any).ghanaCard ? (
                            <>
                              <span>&middot;</span>
                              <span className="font-mono">{patient.ghana_card_number || (patient as any).ghanaCard}</span>
                            </>
                          ) : null}
                          {patient.checked_in_at ? (
                            <>
                              <span>&middot;</span>
                              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {new Date(patient.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </>
                          ) : null}
                        </div>

                        {bp || temp ? (
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {bp ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                                {t("nurse.bloodPressure") || "BP"}: <strong>{bp}</strong>
                              </span>
                            ) : null}
                            {temp ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                                {t("nurse.temperature") || "Temp"}: <strong>{temp}</strong>
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link
                          href={`/doctor/consultations/new?patientId=${encodeURIComponent(String(patient.patient_id || (patient as any).id || ""))}&name=${encodeURIComponent(String(patient.patient_name || (patient as any).name || ""))}&mrn=${encodeURIComponent(String(patient.mrn || (patient as any).patient_mrn || ""))}&card=${encodeURIComponent(String(patient.ghana_card_number || (patient as any).ghanaCard || ""))}&queueId=${encodeURIComponent(String((patient as any).queue_id || (patient as any).id || ""))}`}
                        >
                          <Button size="sm" variant="primary" className="gap-1.5">
                            {t("doctor.callPatient") || "Call Patient"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                {t("doctor.rxSecurityEngine") || "Prescription Security Engine"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3">
              <p>
                {t("doctor.rxHmacDescription") ||
                  "All e-prescriptions generated in Medipaedia Clinical are cryptographically signed using"} <strong>HMAC-SHA256</strong>.
              </p>
              <div className="p-3 bg-slate-900 text-teal-300 rounded-lg font-mono text-[11px] break-all">
                HMAC: {t("common.verifiedAwait") || "...awaiting signed prescription"}
              </div>
              <p className="text-slate-500">
                {t("doctor.rxPharmacyScanQr") || "Partner pharmacies scan the QR code to instantly verify authenticity and prevent counterfeit dispensing."}
              </p>
              <Link href="/doctor/prescriptions">
                <Button variant="teal" size="sm" className="w-full mt-2">
                  {t("doctor.viewIssuedPrescriptions") || "View Issued Prescriptions"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("navigation.moduleDirectory") || "Hospital Module Directory"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/patients"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-teal-100 text-teal-700">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t("navigation.patientCardsQr") || "Patient Cards & QR"}</p>
                    <p className="text-xs text-slate-500">{t("navigation.nationalIdIntegration") || "National ID integration"}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition" />
              </Link>

              <Link
                href="/doctor/consultations/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-cyan-100 text-cyan-700">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t("navigation.doctorWorkstation") || "Doctor Workstation"}</p>
                    <p className="text-xs text-slate-500">{t("navigation.soapIcd10Rx") || "SOAP, ICD-10 & Rx Mint"}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ClinicalDashboard() {
  return (
    <Suspense fallback={<div className="p-10 text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading clinical dashboard…</div>}>
      <ClinicalDashboardContent />
    </Suspense>
  );
}
