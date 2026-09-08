"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Search,
  Sparkles,
  Flame,
  Loader2,
  ShoppingBag,
  Send,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";
import type {
  PatientPrescriptionSummary,
  PrescriptionStatus,
  PrescriptionItemDetail,
  PillBoxCompartmentItem,
  PillBoxDailyScheduleResponse,
} from "@medipaedia/api-client";
import { QRCodeSVG } from "qrcode.react";

type AdherenceItem = PillBoxCompartmentItem & { displayTime: string; displayGroup: string };

function flattenSchedule(schedule: PillBoxDailyScheduleResponse | null): AdherenceItem[] {
  if (!schedule) return [];
  const mapLabel = (t: string): { displayTime: string; displayGroup: string } => {
    if (t === "MORNING") return { displayTime: "Morning", displayGroup: "08:00 AM" };
    if (t === "AFTERNOON") return { displayTime: "Afternoon", displayGroup: "02:00 PM" };
    if (t === "EVENING") return { displayTime: "Evening", displayGroup: "07:00 PM" };
    if (t === "NIGHT") return { displayTime: "Night", displayGroup: "10:00 PM" };
    return { displayTime: String(t), displayGroup: String(t) };
  };
  const out: AdherenceItem[] = [];
  const sections: Array<[string, PillBoxCompartmentItem[]]> = [
    ["MORNING", schedule.morning_doses || []],
    ["AFTERNOON", schedule.afternoon_doses || []],
    ["EVENING", schedule.evening_doses || []],
    ["NIGHT", schedule.night_doses || []],
  ];
  for (const [key, list] of sections) {
    const labels = mapLabel(key);
    for (const d of list) {
      out.push({
        ...d,
        displayTime: d.scheduled_time ? `${labels.displayTime} (${d.scheduled_time})` : labels.displayTime,
        displayGroup: labels.displayGroup,
      });
    }
  }
  return out;
}

function rxBadgeVariant(s: PrescriptionStatus | string): "teal" | "warning" | "success" | "danger" | "outline" | "cyan" {
  switch (s) {
    case "PENDING":
    case "PENDING_DISPENSE":
      return "warning";
    case "PARTIALLY_DISPENSED":
      return "cyan";
    case "DISPENSED":
    case "COMPLETED":
    case "FULFILLED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "EXPIRED":
      return "outline";
    default:
      return "outline";
  }
}

function rxDisplayStatus(s: PrescriptionStatus | string): string {
  switch (s) {
    case "PENDING":
    case "PENDING_DISPENSE":
      return "PENDING DISPENSE";
    case "PARTIALLY_DISPENSED":
      return "PARTIALLY DISPENSED";
    case "DISPENSED":
    case "COMPLETED":
    case "FULFILLED":
      return "DISPENSED";
    case "CANCELLED":
      return "CANCELLED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return String(s);
  }
}

function formatPrescriptionDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function PatientPrescriptionsAndAdherencePage() {
  const apiClient = createApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRx, setSelectedRx] = useState<PatientPrescriptionSummary | null>(null);
  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionSummary[]>([]);
  const [adherenceItems, setAdherenceItems] = useState<AdherenceItem[]>([]);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [compliancePct, setCompliancePct] = useState<number>(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [pillResult, rxResult] = await Promise.allSettled([
        (typeof (apiClient as any).getPillBoxSchedule === "function"
          ? (apiClient as any).getPillBoxSchedule()
          : Promise.resolve(null)),
        apiClient.listPatientPrescriptions
          ? apiClient.listPatientPrescriptions()
          : Promise.resolve([]),
      ]);

      if (rxResult.status === "fulfilled") {
        setPrescriptions(Array.isArray(rxResult.value) ? rxResult.value : []);
      } else {
        setPrescriptions([]);
      }

      if (pillResult.status === "fulfilled" && pillResult.value) {
        const s = pillResult.value as PillBoxDailyScheduleResponse;
        setStreakDays(s.streak_days || 0);
        setCompliancePct(s.compliance_percentage ?? 0);
        setAdherenceItems(flattenSchedule(s));
      } else {
        setStreakDays(0);
        setCompliancePct(0);
        setAdherenceItems([]);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load prescriptions");
      setPrescriptions([]);
      setAdherenceItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  const handleToggleAdherence = async (item: AdherenceItem) => {
    const wasTaken = item.status === "TAKEN";
    const nextStatus = wasTaken ? "PENDING" : "TAKEN";
    setAdherenceItems((prev) =>
      prev.map((d) =>
        d.compartment_id === item.compartment_id ? { ...d, status: nextStatus } : d
      )
    );
    try {
      setTogglingId(item.compartment_id);
      if (typeof (apiClient as any).logDoseTaken === "function") {
        await (apiClient as any).logDoseTaken(item.compartment_id, nextStatus);
      } else if (typeof (apiClient as any).logDoseAdherence === "function") {
        await (apiClient as any).logDoseAdherence({ compartment_id: item.compartment_id, status: nextStatus });
      }
    } catch {
      setAdherenceItems((prev) =>
        prev.map((d) => (d.compartment_id === item.compartment_id ? item : d))
      );
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const facilityOf = (rx: PatientPrescriptionSummary): string =>
    rx.facility_name || rx.hospital_name || "Medical Facility";
  const doctorLabelOf = (rx: PatientPrescriptionSummary): string => rx.doctor_name || "—";
  const doctorPinOf = (rx: PatientPrescriptionSummary): string => rx.doctor_license || "—";
  const claimPinOf = (rx: PatientPrescriptionSummary): string => rx.claim_pin || rx.access_code || "—";
  const qrPayloadOf = (rx: PatientPrescriptionSummary): string =>
    JSON.stringify({
      rx_id: rx.id,
      rx_no: rx.prescription_number || rx.id,
      claim_pin: rx.claim_pin || rx.access_code || "",
    });

  const dispensible = (rx: PatientPrescriptionSummary): boolean => {
    const s = String(rx.status).toUpperCase();
    return s === "PENDING" || s === "PENDING_DISPENSE" || s === "PARTIALLY_DISPENSED";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6 text-teal-700" /> Prescriptions & Medication Adherence Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Digital prescription claim vault and daily pill reminders
          </p>
        </div>

        <Link href="/marketplace">
          <Button variant="primary" size="md" className="font-bold gap-2 shadow-md shadow-teal-700/20">
            <Search className="h-4 w-4" /> Find Meds in Nearby Pharmacies
          </Button>
        </Link>
      </div>

      {/* 1. DAILY ADHERENCE TRACKER */}
      <Card className="p-5 border-2 border-emerald-400 bg-emerald-50/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
          <div>
            <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" /> Today's Medication Adherence Schedule
            </h3>
            <p className="text-xs text-emerald-800">Check off doses as you take them to build your health streak</p>
          </div>
          <Badge variant="teal" className="text-xs font-bold gap-1 bg-emerald-600 text-white">
            <Flame className="h-3 w-3 fill-amber-300 text-amber-300" /> {streakDays}-Day Streak
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-slate-200 bg-white/80 animate-pulse space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
                    <div className="h-3 w-2/3 bg-slate-200 rounded" />
                  </div>
                  <div className="h-6 w-6 rounded-full bg-slate-200" />
                </div>
                <div className="h-2.5 w-32 bg-slate-200 rounded mt-1" />
              </div>
            ))}
          </div>
        ) : adherenceItems.length === 0 ? (
          <div className="py-6 text-center max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-emerald-700" />
            </div>
            <h3 className="font-extrabold text-sm text-emerald-950">No medication schedule set up yet</h3>
            <p className="text-xs text-emerald-800 mt-1">
              Add prescriptions to begin daily tracking and build your adherence streak.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adherenceItems.map((item) => {
              const taken = item.status === "TAKEN";
              const toggling = togglingId === item.compartment_id;
              return (
                <div
                  key={item.compartment_id}
                  onClick={() => handleToggleAdherence(item)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    taken
                      ? "bg-white border-emerald-300 shadow-sm"
                      : "bg-white/80 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <strong className="text-xs font-extrabold text-slate-900 block leading-tight truncate">
                        {item.medication_name}
                        {item.brand_name ? (
                          <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                            {item.brand_name}
                          </span>
                        ) : null}
                      </strong>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {item.dosage} • {item.instructions}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={toggling}
                      className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        taken
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-300 text-transparent"
                      }`}
                    >
                      {toggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-400">
                    <span>{item.displayTime}</span>
                    <span className="text-emerald-700 font-bold">
                      {taken ? "✓ Dose Taken" : "○ Pending Dose"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. PRESCRIPTIONS VAULT */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">
          Official Electronic Prescriptions ({prescriptions.length})
        </h3>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Card key={i} className="p-5 border border-slate-200 bg-white animate-pulse space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-72 bg-slate-200 rounded" />
                  </div>
                  <div className="h-10 w-32 bg-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-14 w-full bg-slate-100 rounded-xl" />
                  <div className="h-14 w-full bg-slate-100 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-extrabold text-rose-900">Unable to load your prescriptions</h3>
                  <p className="text-sm text-rose-700 mt-1">{error}</p>
                  <Button onClick={loadAll} variant="primary" size="sm" className="mt-3 font-bold gap-2">
                    <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : prescriptions.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center py-8 max-w-md mx-auto">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
                  <Pill className="h-7 w-7 text-teal-700" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">No prescriptions yet</h3>
                <p className="text-sm text-slate-500 mt-1.5">
                  After your next consultation, your doctor will issue digital prescriptions here. You can dispense them at any partnered pharmacy with your secure claim PIN.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => (
              <Card
                key={rx.id}
                className="p-5 border border-slate-200 bg-white shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-teal-800">
                        {rx.prescription_number || rx.id}
                      </span>
                      <Badge variant={rxBadgeVariant(rx.status)} className="text-[10px] font-bold">
                        {rxDisplayStatus(rx.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Prescribed by <strong>{doctorLabelOf(rx)}</strong> ({doctorPinOf(rx)})
                      <span className="mx-1.5 opacity-60">•</span>
                      {facilityOf(rx)}
                      <span className="mx-1.5 opacity-60">•</span>
                      {formatPrescriptionDate(rx.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center px-3">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">
                        6-DIGIT CLAIM PIN
                      </span>
                      <strong className="text-sm font-black text-slate-900 font-mono tracking-widest">
                        {claimPinOf(rx)}
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setSelectedRx(rx)}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <QrCode className="h-4 w-4" /> Claim QR
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {rx.items.map((m: PrescriptionItemDetail, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <strong className="text-slate-900 font-extrabold">{m.medication_name}</strong>
                        <div className="text-slate-600 text-[11px] mt-0.5 space-y-0.5">
                          <div>
                            <span className="font-semibold text-slate-700">Dosage:</span> {m.dosage || "—"}
                            <span className="mx-1.5 opacity-60">•</span>
                            <span className="font-semibold text-slate-700">Frequency:</span> {m.frequency || "—"}
                            <span className="mx-1.5 opacity-60">•</span>
                            <span className="font-semibold text-slate-700">Duration:</span>{" "}
                            {m.duration_days ? `${m.duration_days}d` : "—"}
                          </div>
                          {m.instructions ? <div>{m.instructions}</div> : null}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        Qty: {m.quantity_prescribed}
                        {m.quantity_remaining != null && m.quantity_remaining !== m.quantity_prescribed
                          ? ` / ${m.quantity_remaining} left`
                          : ""}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {dispensible(rx) && (
                    <Link
                      href={`/checkout?prescriptionId=${encodeURIComponent(rx.id)}`}
                      className="inline-flex"
                    >
                      <Button
                        size="sm"
                        variant="primary"
                        className="font-bold text-xs gap-1.5"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> Order Meds / Dispense
                      </Button>
                    </Link>
                  )}
                  <Link
                    href={`/checkout?prescriptionId=${encodeURIComponent(rx.id)}&mode=send`}
                    className="inline-flex"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold text-xs gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Send to Pharmacy
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedRx && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRx(null)}
          title={`Pharmacy Claim Pass — ${selectedRx.prescription_number || selectedRx.id}`}
          description="Show this QR code or 6-digit PIN to the pharmacist to dispense your medications."
        >
          <div className="py-4 space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="bg-white rounded-2xl p-3 mx-auto flex items-center justify-center shadow-lg">
                <QRCodeSVG value={qrPayloadOf(selectedRx)} size={160} level="M" includeMargin={false} />
              </div>
              <div className="text-center">
                <span className="text-[10px] text-teal-300 font-bold uppercase block">
                  6-DIGIT VERIFICATION PIN
                </span>
                <strong className="text-2xl font-black text-white font-mono tracking-widest">
                  {claimPinOf(selectedRx)}
                </strong>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Doctor: {doctorLabelOf(selectedRx)}
                <span className="mx-1.5 opacity-60">•</span>
                {facilityOf(selectedRx)}
              </p>
              <p className="text-[10px] text-slate-500 text-center font-mono break-all">
                {selectedRx.prescription_number || selectedRx.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {dispensible(selectedRx) && (
                <Link
                  href={`/checkout?prescriptionId=${encodeURIComponent(selectedRx.id)}`}
                  className="inline-flex"
                >
                  <Button variant="outline" size="md" className="w-full font-bold gap-1.5">
                    <ShoppingBag className="h-4 w-4" /> Order Meds
                  </Button>
                </Link>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedRx(null)}
                className="w-full font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
