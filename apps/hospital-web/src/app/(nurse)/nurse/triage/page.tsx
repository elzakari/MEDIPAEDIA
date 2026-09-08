"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Heart,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Thermometer,
  Zap,
  Clock,
  User,
  Droplet,
  Sparkles,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal, useTranslation } from "@medipaedia/ui";
import { createApiClient, type OpdQueueItem, type StatNursingOrder, type VitalsInput, type TriageEncounterPayload, type TriageEncounter } from "@medipaedia/api-client";

function computeMews(
  sbp: number,
  hr: number,
  rr: number,
  temp: number,
  spo2: number
): { score: number; severity: "NORMAL" | "WARNING" | "CRITICAL" } {
  let score = 0;
  if (rr <= 8) score += 2;
  else if (rr >= 15 && rr <= 20) score += 1;
  else if (rr >= 21 && rr <= 29) score += 2;
  else if (rr >= 30) score += 3;
  if (hr <= 40) score += 2;
  else if (hr >= 41 && hr <= 50) score += 1;
  else if (hr >= 101 && hr <= 110) score += 1;
  else if (hr >= 111 && hr <= 129) score += 2;
  else if (hr >= 130) score += 3;
  if (sbp <= 70) score += 3;
  else if (sbp >= 71 && sbp <= 80) score += 2;
  else if (sbp >= 81 && sbp <= 100) score += 1;
  else if (sbp >= 200) score += 2;
  if (temp < 35.0) score += 2;
  else if (temp >= 38.5) score += 2;
  if (spo2 < 92) score += 3;
  else if (spo2 >= 92 && spo2 <= 93) score += 2;
  else if (spo2 >= 94 && spo2 <= 95) score += 1;

  const severity = score >= 5 ? "CRITICAL" : score >= 3 ? "WARNING" : "NORMAL";
  return { score, severity };
}

function computeESI(
  avpu: string,
  sp: number,
  t: number,
  rbs: number,
  painScore: number,
  hr: number,
  sbp: number
): { level: 1 | 2 | 3 | 4 | 5; cat: "RED" | "ORANGE" | "YELLOW" | "GREEN"; label: string } {
  if (avpu === "UNRESPONSIVE" || avpu === "PAIN" || sp < 85 || sbp < 70 || hr > 150) {
    return { level: 1, cat: "RED", label: "Level 1: Resuscitation (Immediate Life Threat)" };
  }
  if (painScore >= 8 || sp < 92 || t >= 39.5 || rbs < 3.5 || rbs > 20.0 || avpu === "VOICE") {
    return { level: 2, cat: "ORANGE", label: "Level 2: Emergent (High Risk / Severe Pain / Hypoxia)" };
  }
  if (painScore >= 5 || hr > 100 || hr < 55 || t >= 38.0 || sbp >= 140 || sbp <= 95) {
    return { level: 3, cat: "YELLOW", label: "Level 3: Urgent (Multiple Clinical Resources Needed)" };
  }
  if (painScore > 0 || t > 37.3) {
    return { level: 4, cat: "GREEN", label: "Level 4: Less Urgent (Single Diagnostic Resource)" };
  }
  return { level: 5, cat: "GREEN", label: "Level 5: Non-Urgent (Routine Clinic Visit)" };
}

function getPatientESI(p: OpdQueueItem): { level: 1 | 2 | 3 | 4 | 5; cat: "RED" | "ORANGE" | "YELLOW" | "GREEN" } {
  if (p.priority === "EMERGENCY") return { level: 1, cat: "RED" };
  const temp = parseFloat(String(p.temperature ?? "0"));
  const hr = parseInt(String(p.heart_rate ?? "0"));
  const sbp = parseInt((p.blood_pressure || "0/0").split("/")[0]) || 0;
  const spo2 = parseInt(String(p.spo2 ?? "0"));
  if (spo2 < 92 || temp >= 39.5 || sbp < 90 || hr > 130) return { level: 2, cat: "ORANGE" };
  if (temp >= 38.0 || hr > 100 || sbp >= 140 || sbp <= 95) return { level: 3, cat: "YELLOW" };
  if (temp > 37.3) return { level: 4, cat: "GREEN" };
  return { level: 5, cat: "GREEN" };
}

function getPatientMews(p: OpdQueueItem): { score: number; severity: "NORMAL" | "WARNING" | "CRITICAL" } {
  const sbp = parseInt((p.blood_pressure || "0/0").split("/")[0]) || 120;
  const hr = parseInt(String(p.heart_rate ?? "75"));
  const rr = parseInt((p as any).respiratory_rate || "16");
  const temp = parseFloat(String(p.temperature ?? "37.0"));
  const spo2 = parseInt(String(p.spo2 ?? "98"));
  return computeMews(sbp, hr, rr, temp, spo2);
}

const computeWaitingMinutes = (checkedInAt: string): number => {
  const then = new Date(checkedInAt).getTime();
  if (isNaN(then)) return 0;
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / 60000));
};

export default function NurseTriageBoardPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<OpdQueueItem | null>(null);

  const [patients, setPatients] = useState<OpdQueueItem[]>([]);
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  const [statOrders, setStatOrders] = useState<StatNursingOrder[]>([]);
  const [loadingStatOrders, setLoadingStatOrders] = useState(false);
  const [statOrderError, setStatOrderError] = useState<string | null>(null);
  const [executingOrderId, setExecutingOrderId] = useState<string | null>(null);

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [ghanaCard, setGhanaCard] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [systolic, setSystolic] = useState("128");
  const [diastolic, setDiastolic] = useState("84");
  const [heartRate, setHeartRate] = useState("88");
  const [respRate, setRespRate] = useState("18");
  const [temp, setTemp] = useState("38.6");
  const [spo2, setSpo2] = useState("98");
  const [weight, setWeight] = useState("72");
  const [height, setHeight] = useState("178");
  const [bloodGlucose, setBloodGlucose] = useState("5.8");
  const [painScore, setPainScore] = useState<number>(6);
  const [avpu, setAvpu] = useState<"ALERT" | "VOICE" | "PAIN" | "UNRESPONSIVE">("ALERT");
  const [urineDipstick, setUrineDipstick] = useState("Protein: Trace, Glucose: Neg, Ketones: Neg");
  const [nurseNotes, setNurseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTriage = useCallback(async () => {
    setLoadingTriage(true);
    setTriageError(null);
    try {
      const client = createApiClient();
      const pend = await client.getPendingTriageIntakes();
      const penData = (Array.isArray(pend) ? pend : []).map((x: any) => ({
        id: x.queue_id,
        queue_id: x.queue_id,
        queue_number: x.queue_number,
        patient_id: x.patient_id,
        hospital_card_id: x.hospital_card_id,
        patient_name: x.patient_name,
        age: typeof x.age === "number" ? x.age : undefined,
        gender: x.gender,
        mrn: x.mrn,
        priority: x.triage_priority || (x.has_vitals ? "ROUTINE" : "URGENT"),
        triage_priority: x.triage_priority,
        status: (x.has_vitals ? "TRIAGED" : "WAITING") as any,
        checked_in_at: x.checked_in_at,
        ghana_card_number: x.ghana_card_number,
        temperature: typeof x.temperature === "number" ? x.temperature : undefined,
        blood_pressure: x.blood_pressure,
        heart_rate: typeof x.heart_rate === "number" ? x.heart_rate : undefined,
        spo2: typeof x.spo2 === "number" ? x.spo2 : undefined,
        has_vitals: Boolean(x.has_vitals),
      }));
      setPatients(penData);
    } catch (err: any) {
      setTriageError(null);
      setPatients([]);
    } finally {
      setLoadingTriage(false);
    }
  }, [t]);

  const loadStatOrders = useCallback(async () => {
    setLoadingStatOrders(true);
    setStatOrderError(null);
    try {
      const client = createApiClient();
      const data = await client.getStatNursingOrders("PENDING");
      setStatOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setStatOrderError(err?.message || (t("nurse.statOrderLoadFailed") || "Could not fetch STAT nursing orders."));
      setStatOrders([]);
    } finally {
      setLoadingStatOrders(false);
    }
  }, [t]);

  useEffect(() => {
    loadTriage();
    loadStatOrders();
  }, [loadTriage, loadStatOrders]);

  const handleExecuteStatOrder = async (orderId: string) => {
    setExecutingOrderId(orderId);
    try {
      const client = createApiClient();
      await client.executeStatNursingOrder(orderId, {
        execution_notes: "Administered STAT by Triage Duty Nurse",
      });
      setStatOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "EXECUTED", executed_at: "Just now", executed_by_nurse_name: (t("nurse.triageNurse") || "Triage Nurse") || "Triage Nurse" }
            : o
        )
      );
    } catch (err: any) {
      setStatOrderError(err?.message || (t("nurse.statOrderExecFailed") || "Failed to execute STAT order."));
    } finally {
      setExecutingOrderId(null);
    }
  };

  const openRecordModalForPatient = (p?: OpdQueueItem) => {
    if (p) {
      setSelectedPatientForVitals(p);
      setPatientName(p.patient_name);
      setGhanaCard(p.ghana_card_number || "");
      setSystolic((p.blood_pressure || "0/0").split("/")[0] || "120");
      setDiastolic((p.blood_pressure || "0/0").split("/")[1] || "80");
      setHeartRate(String(p.heart_rate ?? "75"));
      setTemp(String(p.temperature ?? "37.0"));
      setSpo2(String(p.spo2 ?? "98"));
    } else {
      setSelectedPatientForVitals(null);
      setPatientName("");
      setGhanaCard("");
    }
    setSaveSuccess(false);
    setRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const client = createApiClient();
      const s = parseInt(systolic) || 0;
      const d = parseInt(diastolic) || 0;
      const hr = parseInt(heartRate) || 0;
      const rr = parseInt(respRate) || 0;
      const tv = parseFloat(temp) || 37;
      const sp = parseInt(spo2) || 98;
      const bg = parseFloat(bloodGlucose) || 5;
      const w = parseFloat(weight) || NaN;
      const h = parseFloat(height) || NaN;
      const esi = computeESI(avpu, sp, tv, bg, painScore, hr, s);
      const mews = computeMews(s, hr, rr, tv, sp);
      const encounterPayload: TriageEncounterPayload = {
        queue_id: selectedPatientForVitals?.queue_id || "",
        patient_id: selectedPatientForVitals?.patient_id || "",
        hospital_card_id: selectedPatientForVitals?.hospital_card_id || ghanaCard || "",
        patient_name: selectedPatientForVitals?.patient_name || patientName,
        age: parseInt(age || "0") || undefined,
        gender,
        ghana_card_number: ghanaCard || (selectedPatientForVitals?.ghana_card_number ?? undefined),
        chief_complaint: chiefComplaint,
        systolic_bp: s,
        diastolic_bp: d,
        heart_rate_bpm: hr,
        respiratory_rate_bpm: rr,
        temperature_c: tv,
        oxygen_saturation_percent: sp,
        blood_glucose_mmol_l: bg,
        weight_kg: isNaN(w) ? undefined : w,
        height_cm: isNaN(h) ? undefined : h,
        pain_score: painScore,
        avpu,
        urine_dipstick: urineDipstick,
        mews_score: mews.score,
        esi_level: esi.level,
        triage_category: esi.cat,
        nurse_notes: nurseNotes,
      };
      const [, result] = await Promise.all([
        (async () => {
          try {
            const vitalsPayload: VitalsInput = {
              patient_account_id: encounterPayload.hospital_card_id || ghanaCard || "",
              hospital_card_id: encounterPayload.hospital_card_id || "",
              queue_id: encounterPayload.queue_id || "",
              consultation_id: (selectedPatientForVitals as any)?.consultation_id || undefined,
              temperature_c: tv,
              systolic_bp: s,
              diastolic_bp: d,
              pulse_bpm: hr,
              respiratory_rate_bpm: rr,
              spo2_percent: sp,
              weight_kg: encounterPayload.weight_kg,
              height_cm: encounterPayload.height_cm,
            };
            await client.recordVitals(vitalsPayload);
          } catch (_e) { /* vitals are sidecar; primary is triage encounter */ }
        })(),
        client.createTriageEncounter(encounterPayload) as Promise<TriageEncounter>,
      ]);
      const _ = result;
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setRecordModalOpen(false);
        loadTriage();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setTriageError(err?.message || (t("nurse.vitalsSaveFailed") || "Failed to record vitals. Please try again."));
    }
  };

  const computeLiveESI = () => {
    const s = parseInt(systolic) || 120;
    const hr = parseInt(heartRate) || 75;
    const sp = parseInt(spo2) || 98;
    const tVal = parseFloat(temp) || 37.0;
    const rbs = parseFloat(bloodGlucose) || 5.0;
    return computeESI(avpu, sp, tVal, rbs, painScore, hr, s);
  };

  const liveESI = computeLiveESI();

  const filterBySearch = (list: OpdQueueItem[]) =>
    list.filter(
      (p) =>
        (p.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.ghana_card_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.mrn || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.queue_number || "").toLowerCase().includes(search.toLowerCase())
    );

  const categorized = patients.reduce(
    (acc, p) => {
      const esi = getPatientESI(p);
      acc[esi.cat].push(p);
      return acc;
    },
    { RED: [] as OpdQueueItem[], ORANGE: [] as OpdQueueItem[], YELLOW: [] as OpdQueueItem[], GREEN: [] as OpdQueueItem[] }
  );

  const redPatients = filterBySearch(categorized.RED);
  const orangePatients = filterBySearch(categorized.ORANGE);
  const yellowPatients = filterBySearch(categorized.YELLOW);
  const greenPatients = filterBySearch(categorized.GREEN);
  const searchApplied = search.trim().length > 0;
  const anyFilteredEmpty = searchApplied && redPatients.length + orangePatients.length + yellowPatients.length + greenPatients.length === 0 && patients.length > 0;
  const trueEmpty = patients.length === 0 && !loadingTriage && !triageError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {(t("nurse.triage.title") || "Emergency Triage Intake (ESI 1-5)")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {(t("nurse.triage.subtitle") || "Vital signs acquisition, MEWS calculation, and queue routing")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => openRecordModalForPatient()}
            variant="primary"
            size="sm"
            className="font-bold gap-1.5 shadow-sm shadow-teal-700/20"
          >
            <Plus className="h-4 w-4" /> {(t("nurse.triage.recordVitals") || "Record Extended Vitals & Triage")}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadTriage} disabled={loadingTriage} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loadingTriage ? "animate-spin" : ""}`} />
            {(t("common.refresh") || "Refresh")}
          </Button>
        </div>
      </div>

      {triageError && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold text-rose-800">{(t("common.error") || "Queue unavailable")}</p>
            <p className="text-rose-700 mt-0.5">{triageError}</p>
          </div>
          <Button size="sm" variant="primary" onClick={loadTriage}>{(t("common.retry") || "Retry")}</Button>
        </div>
      )}

      {statOrders.some((o) => o.status === "PENDING") && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-rose-500/50 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-rose-400" />
                <span>{(t("nurse.statOrderRunner") || "Doctor STAT Order Live Runner")}</span>
                <Badge variant="danger" className="text-[9px] animate-pulse">{(t("nurse.actionRequired") || "ACTION REQUIRED")}</Badge>
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {statOrders.filter((o) => o.status === "PENDING").length} {(t("nurse.pendingTasks") || "Pending Task(s)")}
            </span>
          </div>

          <div className="space-y-2">
            {statOrders
              .filter((o) => o.status === "PENDING")
              .map((order) => (
                <div
                  key={order.id}
                  className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-black text-[10px] uppercase tracking-wider border border-rose-500/40">
                        {order.urgency}
                      </span>
                      <strong className="text-white font-bold">{order.patient_name}</strong>
                      <span className="text-slate-400 font-mono text-[11px]">({order.mrn})</span>
                      <span className="text-slate-400 text-[10px]">• {(t("nurse.issued") || "Issued")} {order.issued_at}</span>
                    </div>
                    <p className="text-rose-200 font-mono font-medium">{order.instruction}</p>
                    <p className="text-slate-400 text-[10px]">{(t("nurse.orderingPhysician") || "Ordering Physician")}: {order.doctor_name}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleExecuteStatOrder(order.id)}
                    isLoading={executingOrderId === order.id}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold shrink-0 gap-1.5 shadow-sm text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {(t("nurse.markAdministered") || "Mark as Administered")}
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {!loadingStatOrders && !statOrders.some((o) => o.status === "PENDING") && (
        <div className="py-3 px-4 bg-slate-900 text-slate-400 text-xs rounded-xl flex items-center justify-between">
          <span>{(t("nurse.statEmptyTriage") || "No active STAT emergency orders")}</span>
          <span className="text-emerald-400 text-[10px] font-bold">0 Pending</span>
        </div>
      )}

      {!loadingTriage && !triageError && redPatients.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-wide">
                {(t("nurse.esi1Resuscitation") || "CRITICAL ESI LEVEL 1 ALERT — RESUSCITATION BAY ACTIVE")}
              </h4>
              <p className="text-xs text-rose-100">
                {redPatients[0].patient_name} ({redPatients[0].ghana_card_number || redPatients[0].mrn}) {(t("nurse.requiresImmediatePhysician") || "requires immediate physician intubation/resuscitation team.")}
              </p>
            </div>
          </div>
          <Badge variant="danger" className="text-xs bg-white text-rose-700 font-bold">
            {(t("nurse.immediateAction") || "IMMEDIATE ACTION")}
          </Badge>
        </div>
      )}

      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={(t("nurse.triage.searchPlaceholder") || "Search patient name, Ghana Card, MRN, or queue ticket...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border border-rose-200 bg-rose-50/50">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            {(t("nurse.esiLevel1") || "Level 1: Resuscitation (Red)")}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{redPatients.length}</span>
            <span className="text-[10px] text-rose-700 font-semibold">{(t("nurse.target0min") || "< 0 min Target")}</span>
          </div>
        </Card>

        <Card className="p-4 border border-amber-200 bg-amber-50/50">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            {(t("nurse.esiLevel2") || "Level 2: Emergent (Orange)")}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{orangePatients.length}</span>
            <span className="text-[10px] text-amber-700 font-semibold">{(t("nurse.target10min") || "< 10 min Target")}</span>
          </div>
        </Card>

        <Card className="p-4 border border-yellow-200 bg-yellow-50/50">
          <span className="text-[11px] font-bold text-yellow-700 uppercase tracking-wider block">
            {(t("nurse.esiLevel3") || "Level 3: Urgent (Yellow)")}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-yellow-900">{yellowPatients.length}</span>
            <span className="text-[10px] text-yellow-700 font-semibold">{(t("nurse.target30min") || "< 30 min Target")}</span>
          </div>
        </Card>

        <Card className="p-4 border border-emerald-200 bg-emerald-50/50">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            {(t("nurse.esiLevel45") || "Level 4/5: Non-Urgent (Green)")}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-900">{greenPatients.length}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">{(t("nurse.target60min") || "< 60 min Target")}</span>
          </div>
        </Card>
      </div>

      {loadingTriage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((ci) => (
            <div key={ci} className="space-y-3">
              <div className="h-9 bg-slate-200 rounded-xl animate-pulse" />
              {[0, 1].map((ri) => (
                <div key={ri} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loadingTriage && !triageError && anyFilteredEmpty && (
        <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
          <div className="text-center space-y-2">
            <Search className="h-10 w-10 mx-auto text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-700">
              {(t("common.noResults") || "No matching patients")}
            </h3>
            <p className="text-xs text-slate-500">
              {(t("common.adjustSearch") || "Try clearing your search or priority filter.")}
            </p>
          </div>
        </Card>
      )}

      {!loadingTriage && !triageError && trueEmpty && (
        <Card className="p-10 border-dashed border-slate-200 bg-white">
          <div className="text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700">
              <Inbox className="h-10 w-10" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              {(t("nurse.triageEmpty") || "Triage Station Clear")}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {(t("nurse.triageEmptyHelp") || "No patients are currently awaiting triage acuity assessment. New check-ins will appear here automatically. Click Refresh to poll for new arrivals.")}
            </p>
            <div className="pt-2">
              <Button size="sm" variant="primary" onClick={loadTriage} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {(t("nurse.checkForNew") || "Check for new triage arrivals")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!loadingTriage && !triageError && !trueEmpty && !anyFilteredEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-rose-700 text-white font-bold text-xs flex items-center justify-between">
              <span>{(t("nurse.resuscitationL1") || "RESUSCITATION (LEVEL 1)")}</span>
              <span className="bg-rose-900/80 px-2 py-0.5 rounded-full text-[10px]">{redPatients.length}</span>
            </div>
            <div className="space-y-2.5">
              {redPatients.map((p) => {
                const mews = getPatientMews(p);
                const waitMin = computeWaitingMinutes(p.checked_in_at);
                return (
                  <Card key={p.queue_id} className="p-4 border-2 border-rose-500 bg-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{p.patient_name}</h4>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 font-black text-[9px]">
                          MEWS {mews.score}
                        </span>
                        <Badge variant="danger" className="text-[9px] uppercase font-bold py-0">
                          ESI {getPatientESI(p).level}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-rose-700 font-medium line-clamp-2">
                      {(p as any).chief_complaint || `${(t("nurse.waiting") || "Waiting")} ${waitMin} ${(t("common.mins") || "mins")}`}
                    </p>
                    <div className="p-2 rounded-lg bg-rose-50 text-[10px] font-mono text-rose-900 space-y-0.5">
                      <div>BP: <strong>{p.blood_pressure || (t("nurse.notRecorded") || "N/R")}</strong> | HR: <strong>{p.heart_rate || (t("nurse.notRecorded") || "N/R")}</strong></div>
                      <div>SpO2: <strong>{p.spo2 ? `${p.spo2}%` : (t("nurse.notRecorded") || "N/R")}</strong> | Temp: <strong>{p.temperature ? `${p.temperature}°C` : (t("nurse.notRecorded") || "N/R")}</strong></div>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => openRecordModalForPatient(p)} className="w-full text-[11px] font-bold gap-1 bg-rose-700 hover:bg-rose-800">
                      <Activity className="h-3.5 w-3.5" /> {(t("nurse.captureVitals") || "Capture Vitals")}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-between">
              <span>{(t("nurse.emergentL2") || "EMERGENT (LEVEL 2)")}</span>
              <span className="bg-amber-800/80 px-2 py-0.5 rounded-full text-[10px]">{orangePatients.length}</span>
            </div>
            <div className="space-y-2.5">
              {orangePatients.map((p) => {
                const mews = getPatientMews(p);
                return (
                  <Card key={p.queue_id} className="p-4 border-2 border-amber-400 bg-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{p.patient_name}</h4>
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          mews.score >= 5 ? "bg-rose-100 text-rose-900 font-black" : "bg-amber-100 text-amber-900"
                        }`}>
                          MEWS {mews.score}
                        </span>
                        <Badge variant="warning" className="text-[9px] uppercase font-bold py-0">
                          ESI {getPatientESI(p).level}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium line-clamp-2">
                      {(p as any).chief_complaint || p.mrn || ""}
                    </p>
                    <div className="p-2 rounded-lg bg-amber-50 text-[10px] font-mono text-amber-900 space-y-0.5">
                      <div>BP: <strong>{p.blood_pressure || (t("nurse.notRecorded") || "N/R")}</strong> | HR: <strong>{p.heart_rate || (t("nurse.notRecorded") || "N/R")}</strong></div>
                      <div>SpO2: <strong>{p.spo2 ? `${p.spo2}%` : (t("nurse.notRecorded") || "N/R")}</strong> | {(t("nurse.painAbbr") || "Pain")}: {p.priority === "PRIORITY" ? "8/10" : "—"}</div>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => openRecordModalForPatient(p)} className="w-full text-[11px] font-bold gap-1 bg-amber-600 hover:bg-amber-700">
                      <Activity className="h-3.5 w-3.5" /> {(t("nurse.captureVitals") || "Capture Vitals")}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-yellow-600 text-white font-bold text-xs flex items-center justify-between">
              <span>{(t("nurse.urgentL3") || "URGENT (LEVEL 3)")}</span>
              <span className="bg-yellow-800/80 px-2 py-0.5 rounded-full text-[10px]">{yellowPatients.length}</span>
            </div>
            <div className="space-y-2.5">
              {yellowPatients.map((p) => {
                const mews = getPatientMews(p);
                return (
                  <Card key={p.queue_id} className="p-4 border border-yellow-300 bg-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{p.patient_name}</h4>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-medium text-[9px]">
                          MEWS {mews.score}
                        </span>
                        <Badge variant="teal" className="text-[9px] uppercase font-bold py-0 bg-yellow-100 text-yellow-800">
                          ESI {getPatientESI(p).level}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {(p as any).chief_complaint || p.gender || ""}
                    </p>
                    <div className="p-2 rounded-lg bg-yellow-50/60 text-[10px] font-mono text-slate-800 space-y-0.5">
                      <div>BP: {p.blood_pressure || (t("nurse.notRecorded") || "N/R")} | HR: {p.heart_rate || (t("nurse.notRecorded") || "N/R")}</div>
                      <div>Temp: {p.temperature ? `${p.temperature}°C` : (t("nurse.notRecorded") || "N/R")} | SpO2: {p.spo2 ? `${p.spo2}%` : (t("nurse.notRecorded") || "N/R")}</div>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => openRecordModalForPatient(p)} className="w-full text-[11px] font-bold gap-1">
                      <Activity className="h-3.5 w-3.5" /> {(t("nurse.captureVitals") || "Capture Vitals")}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between">
              <span>{(t("nurse.lessNonUrgentL45") || "LESS / NON-URGENT (4 & 5)")}</span>
              <span className="bg-emerald-800/80 px-2 py-0.5 rounded-full text-[10px]">{greenPatients.length}</span>
            </div>
            <div className="space-y-2.5">
              {greenPatients.map((p) => {
                const mews = getPatientMews(p);
                return (
                  <Card key={p.queue_id} className="p-4 border border-slate-200 bg-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{p.patient_name}</h4>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-medium text-[9px]">
                          MEWS {mews.score}
                        </span>
                        <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
                          ESI {getPatientESI(p).level}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {(p as any).chief_complaint || p.queue_number || ""}
                    </p>
                    <div className="p-2 rounded-lg bg-slate-50 text-[10px] font-mono text-slate-600">
                      BP: {p.blood_pressure || (t("nurse.notRecorded") || "N/R")} | Temp: {p.temperature ? `${p.temperature}°C` : (t("nurse.notRecorded") || "N/R")} | SpO2: {p.spo2 ? `${p.spo2}%` : (t("nurse.notRecorded") || "N/R")}
                    </div>
                    <Button size="sm" variant="primary" onClick={() => openRecordModalForPatient(p)} className="w-full text-[11px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <Activity className="h-3.5 w-3.5" /> {(t("nurse.captureVitals") || "Capture Vitals")}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {recordModalOpen && (
        <Modal
          isOpen={recordModalOpen}
          onClose={() => setRecordModalOpen(false)}
          title={(t("nurse.triage.modalTitle") || "Clinical Triage & Extended Vital Signs")}
          description={(t("nurse.triage.modalDesc") || "Record complete vitals, Point-of-Care blood glucose, pain intensity, and AVPU consciousness scale.")}
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">{(t("nurse.triage.saved") || "Vitals & ESI Triaged!")}</h3>
              <p className="text-xs text-slate-500">
                {(t("nurse.triage.savedTo") || "Patient assigned to")} <strong>{liveESI.label}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRecordSubmit} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={(t("nurse.triage.patientName") || "Patient Full Name")}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.ghanaCard") || "Ghana Card PIN")}
                  value={ghanaCard}
                  onChange={(e) => setGhanaCard(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{(t("nurse.triage.chiefComplaint") || "Chief Complaint")}</label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <Input
                  label={(t("nurse.triage.systolic") || "Systolic BP")}
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.diastolic") || "Diastolic BP")}
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.heartRate") || "Heart Rate")}
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.respRate") || "Resp Rate")}
                  type="number"
                  value={respRate}
                  onChange={(e) => setRespRate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <Input
                  label={(t("nurse.triage.temp") || "Temp (°C)")}
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.spo2") || "SpO2 (%)")}
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  required
                />
                <Input
                  label={(t("nurse.triage.bloodSugar") || "Blood Sugar (mmol/L)")}
                  type="number"
                  step="0.1"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(e.target.value)}
                />
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{(t("nurse.triage.avpu") || "AVPU Scale")}</label>
                  <select
                    value={avpu}
                    onChange={(e) => setAvpu(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALERT">{(t("nurse.triage.avpuAlert") || "A - Alert")}</option>
                    <option value="VOICE">{(t("nurse.triage.avpuVoice") || "V - Responds to Voice")}</option>
                    <option value="PAIN">{(t("nurse.triage.avpuPain") || "P - Responds to Pain")}</option>
                    <option value="UNRESPONSIVE">{(t("nurse.triage.avpuUnresponsive") || "U - Unresponsive")}</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{(t("nurse.triage.painScore") || "Wong-Baker Pain Intensity Score")}:</span>
                  <span className="font-bold font-mono text-sm text-rose-600">{painScore} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScore}
                  onChange={(e) => setPainScore(parseInt(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                  <span>{(t("nurse.triage.pain0") || "0 - No Pain")}</span>
                  <span>{(t("nurse.triage.pain5") || "5 - Moderate")}</span>
                  <span>{(t("nurse.triage.pain10") || "10 - Worst Possible")}</span>
                </div>
              </div>

              {(() => {
                const liveMews = computeMews(
                  parseFloat(systolic) || 120,
                  parseFloat(heartRate) || 72,
                  parseFloat(respRate) || 16,
                  parseFloat(temp) || 37.0,
                  parseFloat(spo2) || 98
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between ${
                        liveESI.cat === "RED"
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : liveESI.cat === "ORANGE"
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : liveESI.cat === "YELLOW"
                          ? "bg-yellow-50 border-yellow-300 text-yellow-900"
                          : "bg-emerald-50 border-emerald-300 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>{(t("nurse.triage.esiAcuity") || "ESI Acuity")}: {liveESI.label}</span>
                      </div>
                      <Badge variant="teal" className="text-[10px] font-bold">
                        ESI {liveESI.level}
                      </Badge>
                    </div>

                    <div
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between ${
                        liveMews.severity === "CRITICAL"
                          ? "bg-rose-50 border-rose-300 text-rose-900 animate-pulse"
                          : liveMews.severity === "WARNING"
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-emerald-50 border-emerald-300 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-4 w-4 text-rose-600" />
                        <span>{(t("nurse.triage.mewsScore") || "MEWS Score")}: {liveMews.score}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                        liveMews.severity === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : liveMews.severity === "WARNING"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}>
                        {liveMews.severity}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
              >
                {(t("nurse.triage.pushToQueue") || "Confirm Triage & Push to Doctor Queue")}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
