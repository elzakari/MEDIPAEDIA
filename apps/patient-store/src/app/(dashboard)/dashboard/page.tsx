"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Pill,
  Wallet,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Phone,
  User,
  CheckCircle2,
  Share2,
  Loader2,
  AlertCircle,
  Flame,
  Download,
  ThermometerSun,
  Droplets,
  Scale,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";
import type {
  PatientAppointmentItemV2,
  PatientPrescriptionSummary,
  PatientLabOrderItem,
  PillBoxDailyScheduleResponse,
  LatestPatientVitals,
  HospitalPatientCard,
} from "@medipaedia/api-client";
import { QRCodeSVG } from "qrcode.react";

type VitalsHistoryRow = {
  id: string;
  date: string;
  bp: string;
  sugar: string;
  temp: string;
  pulse: string;
  source: string;
};

function formatBpFromClient(v: LatestPatientVitals | null): string {
  if (!v) return "—";
  const s = v.systolic_bp;
  const d = v.diastolic_bp;
  if (s == null && d == null) return "—";
  return `${s ?? "—"}/${d ?? "—"}`;
}

function formatDateTimeHuman(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((that.getTime() - today.getTime()) / 86400000);
    const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Tomorrow, ${timeStr}`;
    if (diffDays === -1) return `Yesterday, ${timeStr}`;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatOnlyDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function isDispensibleRx(s: string): boolean {
  const up = String(s).toUpperCase();
  return up === "PENDING" || up === "PENDING_DISPENSE" || up === "PARTIALLY_DISPENSED";
}

function bpVerdict(systolic?: number | null, diastolic?: number | null): { label: string; variant: string } {
  if (systolic == null || diastolic == null) return { label: "No recent reading", variant: "text-slate-500" };
  const s = Number(systolic);
  const d = Number(diastolic);
  if (s < 90 || d < 60) return { label: "Hypotensive (Low)", variant: "text-cyan-700" };
  if (s < 120 && d < 80) return { label: "Optimal Normotensive", variant: "text-teal-700" };
  if (s < 130 && d < 85) return { label: "Normal", variant: "text-teal-700" };
  if (s < 140 || d < 90) return { label: "High Normal", variant: "text-amber-700" };
  if (s < 160 || d < 100) return { label: "Stage 1 Hypertension", variant: "text-amber-800" };
  return { label: "Stage 2 Hypertension", variant: "text-rose-700" };
}

function sugarVerdict(mgdl?: number | null): { label: string; variant: string } {
  if (mgdl == null) return { label: "No recent reading", variant: "text-slate-500" };
  const v = Number(mgdl);
  if (v < 70) return { label: "Hypoglycemic (Low)", variant: "text-cyan-700" };
  if (v < 100) return { label: "Normal Glycemic Range", variant: "text-teal-700" };
  if (v < 126) return { label: "Impaired Fasting", variant: "text-amber-700" };
  return { label: "Diabetic Range", variant: "text-rose-700" };
}

function tempVerdict(c?: number | null): { label: string; variant: string } {
  if (c == null) return { label: "No recent reading", variant: "text-slate-500" };
  const v = Number(c);
  if (v < 36.1) return { label: "Hypothermia", variant: "text-cyan-700" };
  if (v < 37.2) return { label: "Afebrile / Normal", variant: "text-teal-700" };
  if (v < 38.0) return { label: "Low-Grade Pyrexia", variant: "text-amber-700" };
  if (v < 39.0) return { label: "Mild Pyrexia", variant: "text-amber-800" };
  return { label: "High Fever", variant: "text-rose-700" };
}

function pulseVerdict(bpm?: number | null): { label: string; variant: string } {
  if (bpm == null) return { label: "No recent reading", variant: "text-slate-500" };
  const v = Number(bpm);
  if (v < 60) return { label: "Bradycardic", variant: "text-cyan-700" };
  if (v < 100) return { label: "Normal Sinus Rhythm", variant: "text-teal-700" };
  if (v < 110) return { label: "Mild Tachycardia", variant: "text-amber-700" };
  return { label: "Tachycardic", variant: "text-rose-700" };
}

export default function PatientDashboardPage() {
  const apiClient = createApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iceModalOpen, setIceModalOpen] = useState(false);
  const [logVitalsModalOpen, setLogVitalsModalOpen] = useState(false);
  const [vitalsSaved, setVitalsSaved] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  // Identity
  const [displayName, setDisplayName] = useState("—");
  const [ghanaCard, setGhanaCard] = useState("—");
  const [mrn, setMrn] = useState("—");
  const [nhis, setNhis] = useState("—");
  const [bloodGroup, setBloodGroup] = useState("—");
  const [genotype, setGenotype] = useState("—");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [iceContactName, setIceContactName] = useState("—");
  const [iceContactPhone, setIceContactPhone] = useState("—");
  const [verificationBadge, setVerificationBadge] = useState("Identity Verified");

  // Action cards data
  const [pillBox, setPillBox] = useState<{
    streak: number;
    dosesCompleted: number;
    dosesTotal: number;
    compliance: number;
    nextDoseText: string;
  } | null>(null);
  const [activeRx, setActiveRx] = useState<{
    id: string;
    code: string;
    doctor: string;
    summary: string;
  } | null>(null);
  const [pendingLab, setPendingLab] = useState<{
    countNewReports: number;
    summary: string;
    source: string;
  } | null>(null);
  const [nextApt, setNextApt] = useState<{
    id: string;
    slotText: string;
    facility: string;
    queue: string;
  } | null>(null);

  // Vitals
  const [latestVitals, setLatestVitals] = useState<LatestPatientVitals | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsHistoryRow[]>([]);

  // Log Vitals form
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const has = (name: string) =>
        typeof (apiClient as any)[name] === "function";

      const results = await Promise.allSettled([
        has("getCurrentUser") ? (apiClient as any).getCurrentUser() : Promise.resolve(null),
        has("getPatientHospitalCards") ? apiClient.getPatientHospitalCards() : Promise.resolve([]),
        has("getPillBoxSchedule") ? (apiClient as any).getPillBoxSchedule() : Promise.resolve(null),
        has("listPatientPrescriptions") ? apiClient.listPatientPrescriptions() : Promise.resolve([]),
        has("getPatientLabOrders") ? apiClient.getPatientLabOrders() : Promise.resolve([]),
        has("getPatientAppointments") ? (apiClient as any).getPatientAppointments() : Promise.resolve([]),
        has("getLatestPatientVitals") ? apiClient.getLatestPatientVitals() : Promise.resolve(null),
        has("getPatientVitalsHistory") ? (apiClient as any).getPatientVitalsHistory() : Promise.resolve(null),
      ]);

      const [userR, cardsR, pillR, rxR, labR, aptR, vitalsR, historyR] = results;

      // User identity
      if (userR.status === "fulfilled" && userR.value) {
        const u: any = userR.value;
        const profile: any = u?.patient_profile || u?.patient || {};
        const first = u?.first_name || u?.firstName || profile?.first_name || "";
        const last = u?.last_name || u?.lastName || profile?.last_name || "";
        const full = u?.full_name || u?.fullName || u?.name || profile?.full_name || "";
        setDisplayName(full || [first, last].filter(Boolean).join(" ") || "—");
        setGhanaCard(profile?.national_id || u?.national_id || profile?.ghana_card || u?.government_id || "—");
        setNhis(profile?.insurance_number || profile?.nhis_number || u?.insurance_id || "—");
        setBloodGroup(profile?.blood_group || profile?.bloodType || "—");
        setGenotype(profile?.genotype || "—");
        setAllergies(Array.isArray(profile?.allergies) ? profile.allergies.filter(Boolean) : []);
        const ice: any = profile?.emergency_contact || profile?.ice_contact || {};
        const iceName = ice?.name || ice?.contact_name || ice?.full_name || "—";
        const icePhone = ice?.phone || ice?.phone_number || ice?.mobile || "—";
        setIceContactName(iceName);
        setIceContactPhone(icePhone);
        if (u?.is_verified || u?.identity_verified || profile?.is_verified) {
          setVerificationBadge("Ghana Card Verified");
        }
      }

      // Primary card MRN
      if (cardsR.status === "fulfilled") {
        const cards: HospitalPatientCard[] = Array.isArray(cardsR.value) ? cardsR.value : [];
        const active = cards.find((c) => c.is_active) || cards[0];
        if (active) {
          if (active.mrn) setMrn(active.mrn);
        }
      }

      // PillBox
      if (pillR.status === "fulfilled" && pillR.value) {
        const s = pillR.value as PillBoxDailyScheduleResponse;
        const all = [
          ...(s.morning_doses || []),
          ...(s.afternoon_doses || []),
          ...(s.evening_doses || []),
          ...(s.night_doses || []),
        ];
        const takenCount = all.filter((d) => String(d.status).toUpperCase() === "TAKEN").length;
        const pendingText = all.find((d) => String(d.status).toUpperCase() !== "TAKEN");
        setPillBox({
          streak: s.streak_days || 0,
          dosesCompleted: takenCount,
          dosesTotal: all.length || 0,
          compliance: s.compliance_percentage ?? (all.length ? Math.round((takenCount / all.length) * 100) : 0),
          nextDoseText: pendingText ? `${pendingText.time_of_day?.charAt(0) || ""}${pendingText.time_of_day?.slice(1).toLowerCase() || ""} Dose Pending` : "All doses completed today",
        });
      } else {
        setPillBox(null);
      }

      // Active prescription
      if (rxR.status === "fulfilled") {
        const list: PatientPrescriptionSummary[] = Array.isArray(rxR.value) ? rxR.value : [];
        const firstActive = list.find((r) => isDispensibleRx(r.status)) || list[0];
        if (firstActive) {
          const items = (firstActive.items || []).slice(0, 2).map((i) => i.medication_name).join(" + ");
          setActiveRx({
            id: firstActive.id,
            code: firstActive.prescription_number || firstActive.id,
            doctor: firstActive.doctor_name || "—",
            summary: items || `${firstActive.items?.length || 0} medication(s)`,
          });
        } else {
          setActiveRx(null);
        }
      } else {
        setActiveRx(null);
      }

      // Pending / completed diagnostics summary
      if (labR.status === "fulfilled") {
        const labs: PatientLabOrderItem[] = Array.isArray(labR.value) ? labR.value : [];
        const completed = labs.filter((l) =>
          ["COMPLETED", "FINAL", "REPORTED", "PARTIALLY_COMPLETED"].includes(String(l.status).toUpperCase())
        );
        const abnormal = completed.filter((l) => l.has_abnormal_flag === true);
        const mostRecent = completed[0];
        setPendingLab({
          countNewReports: completed.length,
          summary: labs.length === 0 ? "No results yet" : abnormal.length
            ? `${abnormal.length} abnormal markers`
            : `${labs.length} investigation(s)`,
          source: mostRecent ? mostRecent.facility_name || mostRecent.tenant_code || "Care Team" : "Care Team",
        });
      } else {
        setPendingLab(null);
      }

      // Next appointment
      if (aptR.status === "fulfilled") {
        const apts: PatientAppointmentItemV2[] = Array.isArray(aptR.value) ? aptR.value : [];
        const nowMs = Date.now();
        const upcoming = apts
          .filter((a) => {
            const ts = a.scheduled_at || a.scheduled_time || a.appointment_date;
            if (!ts) return false;
            const ms = new Date(ts).getTime();
            return Number.isFinite(ms) && ms >= nowMs - 3600_000;
          })
          .sort((a, b) => {
            const ta = new Date(a.scheduled_at || a.scheduled_time || a.appointment_date || "").getTime();
            const tb = new Date(b.scheduled_at || b.scheduled_time || b.appointment_date || "").getTime();
            return ta - tb;
          });
        const next = upcoming[0];
        if (next) {
          setNextApt({
            id: next.id || next.appointment_id || "apt",
            slotText: formatDateTimeHuman(next.scheduled_at || next.scheduled_time || next.appointment_date),
            facility: next.facility_name || next.tenant_code || next.facility?.name || next.facility?.tenant_code || "Medical Facility",
            queue: next.queue_ticket || next.queue_pass || (next.queue_number != null ? `Q-${String(next.queue_number).padStart(3, "0")}` : "Q-TBD"),
          });
        } else {
          setNextApt(null);
        }
      } else {
        setNextApt(null);
      }

      // Latest vitals
      if (vitalsR.status === "fulfilled" && vitalsR.value) {
        setLatestVitals(vitalsR.value);
      } else {
        setLatestVitals(null);
      }

      // Vitals history (best-effort mapping)
      const rows: VitalsHistoryRow[] = [];
      if (latestVitals && (latestVitals.recorded_at || latestVitals.source || latestVitals.source_facility_name)) {
        rows.push({
          id: "latest",
          date: formatDateTimeHuman(latestVitals.recorded_at) || "Most Recent",
          bp: `${formatBpFromClient(latestVitals)}${latestVitals.systolic_bp != null ? " mmHg" : ""}`,
          sugar: latestVitals.blood_glucose_mg_dl != null ? `${latestVitals.blood_glucose_mg_dl} mg/dL` : "—",
          temp: latestVitals.temperature_c != null ? `${latestVitals.temperature_c} °C` : "—",
          pulse: latestVitals.pulse_bpm != null ? `${latestVitals.pulse_bpm} bpm` : latestVitals.heart_rate_bpm != null ? `${latestVitals.heart_rate_bpm} bpm` : "—",
          source: latestVitals.source_facility_name || latestVitals.source || "Care Team Sync",
        });
      }
      if (historyR.status === "fulfilled" && historyR.value) {
        const raw: any = historyR.value;
        const arr: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        for (const r of arr.slice(0, 9)) {
          const record_at: string = r.recorded_at || r.timestamp || r.date || r.created_at || "";
          rows.push({
            id: r.id || `row-${rows.length}-${Math.random().toString(36).slice(2, 7)}`,
            date: formatDateTimeHuman(record_at) || formatOnlyDate(record_at),
            bp:
              r.systolic_bp != null && r.diastolic_bp != null
                ? `${r.systolic_bp}/${r.diastolic_bp} mmHg`
                : r.blood_pressure || "—",
            sugar: r.blood_glucose_mg_dl != null ? `${r.blood_glucose_mg_dl} mg/dL` : r.glucose || "—",
            temp: r.temperature_c != null ? `${r.temperature_c} °C` : r.temperature || "—",
            pulse:
              r.pulse_bpm != null
                ? `${r.pulse_bpm} bpm`
                : r.heart_rate_bpm != null
                ? `${r.heart_rate_bpm} bpm`
                : r.pulse || "—",
            source: r.source_facility_name || r.source || (r.weight_kg ? "Home Self-Log" : "Care Team"),
          });
        }
      }
      setVitalsHistory(rows);
    } catch (e: any) {
      setError(e?.message || "Unable to load dashboard summary");
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingVitals(true);
      const payload: any = {};
      if (systolic) payload.systolic_bp = Number(systolic);
      if (diastolic) payload.diastolic_bp = Number(diastolic);
      if (bloodSugar) payload.blood_glucose_mg_dl = Number(bloodSugar);
      if (temperature) payload.temperature_c = Number(temperature);
      if (heartRate) {
        payload.heart_rate_bpm = Number(heartRate);
        payload.pulse_bpm = Number(heartRate);
      }
      if (weightKg) payload.weight_kg = Number(weightKg);

      if (typeof (apiClient as any).recordVitals === "function") {
        await (apiClient as any).recordVitals(payload);
      } else if (typeof (apiClient as any).logPatientVitals === "function") {
        await (apiClient as any).logPatientVitals(payload);
      }

      setVitalsSaved(true);
      setTimeout(() => {
        setVitalsSaved(false);
        setLogVitalsModalOpen(false);
        setSystolic("");
        setDiastolic("");
        setBloodSugar("");
        setTemperature("");
        setHeartRate("");
        setWeightKg("");
      }, 1200);
      await loadDashboard();
    } catch (err: any) {
      alert(err?.message || "Unable to save vitals");
    } finally {
      setIsSavingVitals(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const pulseNumber = latestVitals
    ? latestVitals.pulse_bpm ?? latestVitals.heart_rate_bpm ?? null
    : null;
  const bpV = bpVerdict(latestVitals?.systolic_bp, latestVitals?.diastolic_bp);
  const sugV = sugarVerdict(latestVitals?.blood_glucose_mg_dl);
  const tmpV = tempVerdict(latestVitals?.temperature_c);
  const pulV = pulseVerdict(pulseNumber);
  const bmiValue = latestVitals?.bmi;

  const allergyText = allergies.length
    ? allergies.join(", ")
    : "No known allergies reported";

  return (
    <div className="space-y-6">
      {error && !isLoading && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-extrabold text-rose-900">Dashboard load warning</h3>
                  <Button onClick={loadDashboard} variant="primary" size="sm" className="font-bold gap-1">
                    <Loader2 className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Retry
                  </Button>
                </div>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. ICE PASSPORT BANNER */}
      <Card className="p-6 border-2 border-teal-500 bg-gradient-to-br from-teal-900 to-slate-900 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isLoading ? (
                  <span className="inline-block h-7 w-52 bg-white/10 animate-pulse rounded" />
                ) : (
                  displayName
                )}
              </h1>
              <Badge variant="teal" className="text-xs font-bold bg-teal-500/20 text-teal-300 border-teal-400/40">
                {verificationBadge}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-mono flex flex-wrap gap-x-2">
              {isLoading ? (
                <>
                  <span className="inline-block h-3.5 w-28 bg-white/10 animate-pulse rounded" />
                  <span className="inline-block h-3.5 w-28 bg-white/10 animate-pulse rounded" />
                  <span className="inline-block h-3.5 w-28 bg-white/10 animate-pulse rounded" />
                </>
              ) : (
                <>
                  <span>Ghana Card: {ghanaCard}</span>
                  <span className="opacity-50">•</span>
                  <span>MRN: {mrn}</span>
                  <span className="opacity-50">•</span>
                  <span>NHIS: {nhis}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIceModalOpen(true)}
              variant="primary"
              size="md"
              className="font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20"
            >
              <QrCode className="h-4 w-4" /> Emergency ICE Passport
            </Button>
          </div>
        </div>

        {/* Lifesaving Biomarker Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 border-t border-slate-700/60 text-xs">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm space-y-0.5">
            <span className="text-[10px] text-teal-300 font-bold uppercase block">Blood Group</span>
            <span className="text-lg font-black text-white font-mono">
              {isLoading ? (
                <span className="inline-block h-5 w-20 bg-white/10 animate-pulse rounded mt-0.5" />
              ) : (
                bloodGroup
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm space-y-0.5">
            <span className="text-[10px] text-teal-300 font-bold uppercase block">Genotype</span>
            <span className="text-lg font-black text-white font-mono">
              {isLoading ? (
                <span className="inline-block h-5 w-20 bg-white/10 animate-pulse rounded mt-0.5" />
              ) : (
                genotype
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 space-y-0.5">
            <span className="text-[10px] text-rose-300 font-bold uppercase block">Verified Allergies</span>
            <span className="text-xs font-bold text-rose-200 block truncate">
              {isLoading ? (
                <span className="inline-block h-4 w-full bg-white/10 animate-pulse rounded mt-0.5" />
              ) : (
                allergyText
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm space-y-0.5">
            <span className="text-[10px] text-teal-300 font-bold uppercase block">Emergency ICE Contact</span>
            <span className="text-xs font-bold text-white block">
              {isLoading ? (
                <span className="inline-block h-4 w-full bg-white/10 animate-pulse rounded mt-0.5" />
              ) : (
                <>
                  {iceContactName}
                  {iceContactPhone && iceContactPhone !== "—" ? ` (${iceContactPhone})` : ""}
                </>
              )}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. ACTION RIBBON */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border border-slate-200 bg-white animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-32 bg-slate-200 rounded" />
                <div className="h-5 w-24 bg-slate-200 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-200 rounded" />
              <div className="h-8 w-full bg-slate-100 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Smart Pill Box Adherence */}
          <Card className="p-4 border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/50 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-teal-700" /> Smart Pill Box
              </span>
              <Badge variant="teal" className="text-[10px] font-bold">
                <Flame className="h-3 w-3 inline mr-1 fill-amber-300 text-amber-300" /> {pillBox?.streak ?? 0}-DAY STREAK
              </Badge>
            </div>
            <div>
              <strong className="text-sm font-extrabold text-slate-900 block">
                {pillBox
                  ? `${pillBox.dosesCompleted} / ${pillBox.dosesTotal} Doses Completed`
                  : "No doses scheduled yet"}
              </strong>
              <p className="text-xs text-slate-600 mt-0.5">
                {pillBox
                  ? `${pillBox.compliance}% Adherence • ${pillBox.nextDoseText}`
                  : "Add prescriptions to begin pill tracking"}
              </p>
            </div>
            <Link href="/adherence">
              <Button variant="primary" size="sm" className="w-full font-bold text-xs bg-teal-700 hover:bg-teal-800 gap-1">
                Open Daily Pill Box <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </Card>

          {/* Outstanding e-Prescription */}
          <Card className="p-4 border border-amber-200 bg-amber-50/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-amber-700" /> Active e-Prescription
              </span>
              <Badge variant="warning" className="text-[10px] font-bold">
                {activeRx ? "READY TO DISPENSE" : "NONE PENDING"}
              </Badge>
            </div>
            <div>
              <strong className="text-sm font-extrabold text-slate-900 block">
                {activeRx ? activeRx.summary : "No pending prescriptions"}
              </strong>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {activeRx ? `Rx #${activeRx.code} • ${activeRx.doctor}` : "Visit your clinician for new prescriptions"}
              </p>
            </div>
            <Link href={activeRx ? `/checkout?prescriptionId=${encodeURIComponent(activeRx.id)}` : "/marketplace"}>
              <Button variant="outline" size="sm" className="w-full font-bold text-xs border-amber-300 gap-1">
                {activeRx ? "Dispense / Order Meds" : "Browse Pharmacy"} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </Card>

          {/* Pending Diagnostics */}
          <Card className="p-4 border border-cyan-200 bg-cyan-50/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-cyan-700" /> Diagnostics
              </span>
              <Badge variant="teal" className="text-[10px] font-bold">
                {(pendingLab?.countNewReports ?? 0) > 0 ? `${pendingLab?.countNewReports} REPORT(S)` : "NONE"}
              </Badge>
            </div>
            <div>
              <strong className="text-sm font-extrabold text-slate-900 block">
                {pendingLab ? pendingLab.summary : "No investigations ordered"}
              </strong>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {pendingLab ? `${pendingLab.source} • Latest available` : "Results appear after lab tests"}
              </p>
            </div>
            <Link href="/diagnostics">
              <Button variant="outline" size="sm" className="w-full font-bold text-xs border-cyan-300 gap-1">
                View Lab Reports &amp; PDF
              </Button>
            </Link>
          </Card>

          {/* Upcoming Hospital Appointment */}
          <Card className="p-4 border border-indigo-200 bg-indigo-50/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-700" /> OPD Consultation
              </span>
              <Badge variant="outline" className="text-[10px] font-bold font-mono">
                {nextApt ? `PASS: ${nextApt.queue}` : "NONE BOOKED"}
              </Badge>
            </div>
            <div>
              <strong className="text-sm font-extrabold text-slate-900 block">
                {nextApt ? nextApt.slotText : "No upcoming appointments"}
              </strong>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {nextApt ? `${nextApt.facility} • Booked slot` : "Book a consultation to schedule"}
              </p>
            </div>
            <Link href="/appointments">
              <Button variant="outline" size="sm" className="w-full font-bold text-xs border-indigo-300 gap-1">
                Manage Queue &amp; Check-In
              </Button>
            </Link>
          </Card>
        </div>
      )}

      {/* 3. VITALS RADAR & LOGGING */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" /> Personal Health Vitals Radar
            </h3>
            <p className="text-xs text-slate-500">
              Longitudinal tracking of blood pressure, glucose, temperature, and resting pulse
            </p>
          </div>

          <Button
            onClick={() => setLogVitalsModalOpen(true)}
            variant="outline"
            size="sm"
            className="font-bold text-xs gap-1 border-slate-300"
          >
            <Plus className="h-3.5 w-3.5" /> Log Today's Vitals
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 animate-pulse">
                <div className="h-2.5 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-24 bg-slate-200 rounded font-mono" />
                <div className="h-2.5 w-40 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Blood Pressure</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {formatBpFromClient(latestVitals)}
              </div>
              <span className={`text-[11px] font-medium ${bpV.variant}`}>{bpV.label}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Fasting Blood Glucose</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {latestVitals?.blood_glucose_mg_dl != null ? `${latestVitals.blood_glucose_mg_dl} mg/dL` : "—"}
              </div>
              <span className={`text-[11px] font-medium ${sugV.variant}`}>{sugV.label}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <ThermometerSun className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Body Temperature</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {latestVitals?.temperature_c != null ? `${latestVitals.temperature_c} °C` : "—"}
              </div>
              <span className={`text-[11px] font-medium ${tmpV.variant}`}>{tmpV.label}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {bmiValue != null ? "Resting Pulse / BMI" : "Resting Pulse"}
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {pulseNumber != null ? `${pulseNumber} bpm` : "—"}
              </div>
              <span className={`text-[11px] font-medium ${pulV.variant} block`}>{pulV.label}</span>
              {bmiValue != null ? (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  BMI: <span className="font-bold text-slate-800">{Number(bmiValue).toFixed(1)}</span>
                  {latestVitals?.weight_kg != null ? (
                    <>
                      {" "}• Weight: <span className="font-bold">{latestVitals.weight_kg} kg</span>
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Vitals history mini-table */}
        {!isLoading && vitalsHistory.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-slate-800">Recent Vitals Log</h4>
              {latestVitals?.recorded_at && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Last sync: {formatDateTimeHuman(latestVitals.recorded_at)}
                </span>
              )}
            </div>
            <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-slate-600 uppercase font-bold">
                    <th className="p-2.5 font-semibold">Date / Time</th>
                    <th className="p-2.5 font-semibold">BP</th>
                    <th className="p-2.5 font-semibold">Glucose</th>
                    <th className="p-2.5 font-semibold">Temp</th>
                    <th className="p-2.5 font-semibold">Pulse</th>
                    <th className="p-2.5 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitalsHistory.map((r) => (
                    <tr key={r.id} className="text-slate-700">
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">{r.date}</td>
                      <td className="p-2.5 font-mono">{r.bp}</td>
                      <td className="p-2.5 font-mono">{r.sugar}</td>
                      <td className="p-2.5 font-mono">{r.temp}</td>
                      <td className="p-2.5 font-mono">{r.pulse}</td>
                      <td className="p-2.5 text-slate-600">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && vitalsHistory.length === 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="py-4 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-600">
                No vitals recorded yet. Log your first reading above.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ICE MODAL */}
      {iceModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIceModalOpen(false)}
          title="Emergency In-Case-of-Emergency (ICE) Passport"
          description="Lifesaving medical identity and first responder emergency data."
        >
          <div className="py-4 space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 text-center">
              <div className="bg-white rounded-2xl p-3 mx-auto inline-flex items-center justify-center shadow-md">
                <QRCodeSVG
                  value={JSON.stringify({
                    type: "ICE",
                    name: displayName,
                    blood_group: bloodGroup,
                    genotype: genotype,
                    allergies,
                    ice: { name: iceContactName, phone: iceContactPhone },
                  })}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div>
                <strong className="text-base font-black text-white block">{displayName}</strong>
                <span className="text-xs text-slate-400 font-mono">
                  {ghanaCard !== "—" ? `Ghana Card: ${ghanaCard}` : "National ID verified"}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800">
                <Badge variant="teal" className="text-xs font-bold">
                  Blood: {bloodGroup}
                </Badge>
                <Badge variant="teal" className="text-xs font-bold">
                  Genotype: {genotype}
                </Badge>
                {allergies.length > 0 ? (
                  <Badge variant="danger" className="text-xs font-bold">
                    Allergy: {allergies[0]}
                    {allergies.length > 1 ? ` +${allergies.length - 1}` : ""}
                  </Badge>
                ) : null}
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                <div>
                  ICE Contact: <span className="font-semibold text-slate-300">{iceContactName}</span>
                </div>
                {iceContactPhone !== "—" && (
                  <div>
                    Phone: <span className="font-semibold text-slate-300 font-mono">{iceContactPhone}</span>
                  </div>
                )}
                {mrn !== "—" && (
                  <div>
                    MRN: <span className="font-semibold text-slate-300 font-mono">{mrn}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                First responders can scan this QR code with any smartphone camera to access verified emergency contacts and allergies without phone unlock.
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => alert("Emergency ICE URL copied to clipboard!")}
              className="w-full font-bold gap-2"
            >
              <Share2 className="h-4 w-4" /> Share Emergency Passport Link
            </Button>
          </div>
        </Modal>
      )}

      {/* LOG VITALS MODAL */}
      {logVitalsModalOpen && (
        <Modal
          isOpen={logVitalsModalOpen}
          onClose={() => setLogVitalsModalOpen(false)}
          title="Log Today's Health Vitals"
          description="Record blood pressure, fasting glucose, and temperature in your PHR."
        >
          <form onSubmit={handleSaveVitals} className="py-4 space-y-3 text-xs">
            {vitalsSaved ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Vitals Saved to Personal Health Record!</h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="e.g. 120"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="e.g. 80"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Blood Glucose (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={bloodSugar}
                      onChange={(e) => setBloodSugar(e.target.value)}
                      placeholder="e.g. 95"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g. 36.6"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Heart Rate / Pulse (bpm)</label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="e.g. 76"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      <Scale className="h-3 w-3 inline mr-1" /> Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2 gap-2"
                  disabled={isSavingVitals}
                >
                  {isSavingVitals ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {isSavingVitals ? "Saving to PHR…" : "Save Vitals Entry"}
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
