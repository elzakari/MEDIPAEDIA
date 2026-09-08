"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  Search,
  ArrowRight,
  Clock,
  AlertCircle,
  AlertTriangle,
  Stethoscope,
  Heart,
  Thermometer,
  Zap,
  Volume2,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, useTranslation } from "@medipaedia/ui";
import { createApiClient, type OpdQueueItem, type TriagePriority } from "@medipaedia/api-client";
import { useAuth, normalizeUserRoles, userHasAnyRole } from "@/context/AuthContext";

const computeWaitingMinutes = (checkedInAt: string): number => {
  const then = new Date(checkedInAt).getTime();
  if (isNaN(then)) return 0;
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / 60000));
};

const formatCheckedIn = (checkedInAt: string): string => {
  const d = new Date(checkedInAt);
  if (isNaN(d.getTime())) return checkedInAt || "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getPriorityBadgeVariant = (priority: TriagePriority) => {
  if (priority === "EMERGENCY") return "danger";
  if (priority === "PRIORITY") return "warning";
  return "teal";
};

export default function DoctorWaitingQueuePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [callingPatientId, setCallingPatientId] = useState<string | null>(null);
  const [queue, setQueue] = useState<OpdQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  const userRoles = normalizeUserRoles(user?.role || "", (user as any)?.roles || []);
  const hasClinicalHat = userHasAnyRole(user, "HOSPITAL_ADMIN", "DOCTOR", "SUPER_ADMIN", "NURSE", "HOSPITAL_FINANCE", "RECORD_CLERK", "TENANT_ADMIN");
  const hasPharmacyHat = userRoles.some(r => ["PHARMACY_ADMIN","PHARMACIST","SUPERINTENDENT_PHARMACIST","PHARMACY_FINANCE"].includes(r));
  const purePharmacyAccount = hasPharmacyHat && !hasClinicalHat;

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHttpStatus(null);
    try {
      const client = createApiClient();
      const data = await client.getFacilityQueue("QUEUED");
      setQueue(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setHttpStatus(typeof err?.status === "number" ? err.status : typeof err?.response?.status === "number" ? err.response.status : null);
      setError(err?.message || "Failed to load triage queue. Please try again.");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleCallPatient = (patient: OpdQueueItem) => {
    setCallingPatientId(patient.queue_id);
    setTimeout(() => {
      router.push(`/doctor/consultations/${patient.queue_id}?card=${encodeURIComponent(patient.hospital_card_id || "")}`);
    }, 600);
  };

  const filteredQueue = queue.filter((p) => {
    const hay = [
      p.patient_name,
      p.queue_number,
      p.ghana_card_number,
      p.mrn,
      p.hospital_card_id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = hay.includes(search.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || p.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const emergencyCount = queue.filter((p) => p.priority === "EMERGENCY").length;
  const priorityCount = queue.filter((p) => p.priority === "PRIORITY").length;
  const routineCount = queue.filter((p) => p.priority === "ROUTINE").length;
  const esi1Patient = queue.find((p) => p.priority === "EMERGENCY");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-700" /> {t("doctor.queue") || "Live OPD Triage Waiting Queue"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("navigation.nurseStation") || "Real-time triage acuity stream with rapid clinical encounter calling"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger" className="text-xs font-bold px-3 py-1">
            {emergencyCount} {t("doctor.emergency") || "Emergency (ESI 1/2)"}
          </Badge>
          <Badge variant="warning" className="text-xs font-bold px-3 py-1">
            {priorityCount} {t("doctor.priority") || "Priority"}
          </Badge>
          <Badge variant="teal" className="text-xs font-bold px-3 py-1">
            {routineCount} {t("doctor.routine") || "Routine"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={loadQueue} disabled={loading} className="gap-1.5 ml-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh") || "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        (httpStatus === 403 || error.toLowerCase().includes("forbidden") || purePharmacyAccount) ? (
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-bold text-amber-900 text-sm">
                {userRoles.includes("PHARMACY_ADMIN")
                  ? "Your account is currently active as Pharmacy Admin."
                  : userRoles.includes("PHARMACIST")
                  ? "Your account is currently active as a Pharmacist."
                  : "Clinical doctor queue is not available for pharmacy-only accounts."}
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
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={loadQueue}>
                  {t("common.retry") || "Retry"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold text-rose-800">{t("common.error") || "Queue unavailable"}</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="primary" onClick={loadQueue}>{t("common.retry") || "Retry"}</Button>
          </div>
        )
      )}

      {!loading && !error && esi1Patient && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-wide">
                {t("nurse.esi1Resuscitation") || "CRITICAL RESUSCITATION CALL (ESI LEVEL 1)"}
              </h4>
              <p className="text-xs text-rose-100">
                {esi1Patient.patient_name} ({esi1Patient.queue_number}) —
                {esi1Patient.age ? ` ${esi1Patient.age} yrs` : ""}
                {esi1Patient.gender ? ` • ${esi1Patient.gender}` : ""} requires immediate physician intervention.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleCallPatient(esi1Patient)}
            variant="danger"
            size="sm"
            className="font-bold bg-white text-rose-700 hover:bg-rose-50 shadow-md"
          >
            {t("doctor.soapPlan") || "Enter Resuscitation Room"} →
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("common.search") || "Search patient name, queue ticket, identifier, or MRN..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "EMERGENCY", "PRIORITY", "ROUTINE"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                filterPriority === p
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p === "ALL" ? t("common.all") || "ALL" : p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 animate-pulse">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {!loading && !error && filteredQueue.length === 0 && queue.length > 0 && (
          <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
            <div className="text-center space-y-2">
              <Search className="h-10 w-10 mx-auto text-slate-400" />
              <h3 className="text-sm font-extrabold text-slate-700">
                {t("common.noResults") || "No matching patients"}
              </h3>
              <p className="text-xs text-slate-500">
                {t("common.adjustSearch") || "Try clearing your search or priority filter."}
              </p>
            </div>
          </Card>
        )}

        {!loading && !error && queue.length === 0 && (
          <Card className="p-10 border-dashed border-slate-200 bg-white">
            <div className="text-center space-y-3">
              <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700">
                <Inbox className="h-10 w-10" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                {t("doctor.queueEmpty") || "Waiting Room Queue Clear"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t("doctor.queueEmptyHelp") ||
                  "No triaged patients are currently waiting to be seen by a doctor. New check-ins will appear here automatically. Click Refresh to poll for new arrivals."}
              </p>
              <div className="pt-2">
                <Button size="sm" variant="primary" onClick={loadQueue} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("common.refresh") || "Check for new patients"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {filteredQueue.map((patient) => {
          const waitMin = computeWaitingMinutes(patient.checked_in_at);
          const checkedInStr = formatCheckedIn(patient.checked_in_at);
          const variant = getPriorityBadgeVariant(patient.priority);
          const bp = patient.blood_pressure;
          const hr = patient.heart_rate;
          const temp = patient.temperature;
          const spo2 = patient.spo2;

          return (
            <Card
              key={patient.queue_id}
              className={`p-4 sm:p-5 border transition-all bg-white hover:border-teal-500 hover:shadow-md ${
                patient.priority === "EMERGENCY"
                  ? "border-rose-400 bg-rose-50/20"
                  : patient.priority === "PRIORITY"
                  ? "border-amber-300 bg-amber-50/10"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200">
                      {patient.queue_number}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{patient.patient_name}</h3>
                    <span className="text-xs text-slate-500">
                      ({patient.gender || "—"}
                      {patient.age ? `, ${patient.age} yrs` : ""})
                    </span>
                    <Badge variant={variant} className="text-[10px] uppercase font-bold">
                      {patient.priority} • {patient.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {t("common.waiting") || "Waiting"} {waitMin} {t("common.mins") || "mins"}
                      <span className="text-slate-300 mx-1">·</span>
                      {t("common.checkedIn") || "Checked in"} {checkedInStr}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    {patient.mrn && (
                      <span className="font-mono text-slate-500">
                        MRN: <strong className="text-slate-700">{patient.mrn}</strong>
                      </span>
                    )}
                    {patient.ghana_card_number && (
                      <span className="font-mono text-slate-500">
                        ID: <strong className="text-slate-700">{patient.ghana_card_number}</strong>
                      </span>
                    )}
                    {patient.hospital_card_id && (
                      <span className="font-mono text-slate-500">
                        Card: <strong className="text-slate-700">{patient.hospital_card_id}</strong>
                      </span>
                    )}
                  </div>

                  {patient.has_vitals && (bp || hr || temp || spo2) ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700">
                      {bp && (
                        <div className="flex items-center gap-1 text-teal-800">
                          <Activity className="h-3.5 w-3.5" /> BP: <strong>{bp}</strong>
                        </div>
                      )}
                      {hr && (
                        <div className="flex items-center gap-1 text-slate-800">
                          <Heart className="h-3.5 w-3.5 text-rose-500" /> HR: <strong>{hr}</strong>
                        </div>
                      )}
                      {temp && (
                        <div className="flex items-center gap-1 text-amber-800">
                          <Thermometer className="h-3.5 w-3.5 text-amber-600" /> Temp: <strong>{temp}°C</strong>
                        </div>
                      )}
                      {spo2 && <div>SpO2: <strong>{spo2}%</strong></div>}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("nurse.vitalsIntake") || "No triage vitals recorded yet — capture on arrival."}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex sm:flex-col justify-end">
                  <Button
                    onClick={() => handleCallPatient(patient)}
                    variant="primary"
                    size="md"
                    isLoading={callingPatientId === patient.queue_id}
                    className="font-bold gap-2 shadow-md shadow-teal-700/20"
                  >
                    <Volume2 className="h-4 w-4" />
                    {t("doctor.callIntoRoom") || "Call into Consultation Room"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
