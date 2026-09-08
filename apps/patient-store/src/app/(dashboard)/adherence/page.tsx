"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from "@medipaedia/ui";
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Calendar,
  RotateCw,
  Video,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createApiClient } from "@medipaedia/api-client";
import type {
  PillBoxCompartmentItem,
  PillBoxDailyScheduleResponse,
  BookTelehealthSessionResponse,
} from "@medipaedia/api-client";
import Link from "next/link";

export default function PatientAdherencePillBoxPage() {
  const apiClient = createApiClient();
  const [schedule, setSchedule] = useState<PillBoxDailyScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingDoseId, setLoggingDoseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Telehealth Booking Modal
  const [telehealthModalOpen, setTelehealthModalOpen] = useState(false);
  const [isBookingTelehealth, setIsBookingTelehealth] = useState(false);
  const [bookedSession, setBookedSession] = useState<BookTelehealthSessionResponse | null>(null);
  const [telehealthSpecialty, setTelehealthSpecialty] = useState("General Medicine / Family Physician");
  const [telehealthTime, setTelehealthTime] = useState("Today, 16:00 GMT");
  const [telehealthReason, setTelehealthReason] = useState("Medication review & refill consultation");

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getPillBoxSchedule();
      setSchedule(res);
    } catch (err: any) {
      // Fallback state if API in mock mode
      setSchedule({
        current_date: "Friday, 21 August 2026",
        streak_days: 6,
        compliance_percentage: 80,
        morning_doses: [
          {
            compartment_id: "dose-m-1",
            medication_name: "Amlodipine Besylate 10mg",
            brand_name: "Norvasc",
            dosage: "1 Tablet",
            instructions: "Take with water before breakfast",
            time_of_day: "MORNING",
            scheduled_time: "08:00 AM",
            status: "TAKEN",
            taken_at: "08:15 AM",
            can_refill: false,
            refill_remaining_days: 18,
          },
          {
            compartment_id: "dose-m-2",
            medication_name: "Coartem 80/480mg (Day 3)",
            brand_name: "Coartem Dispersible Forte",
            dosage: "1 Tablet",
            instructions: "Take with a fatty meal or milk",
            time_of_day: "MORNING",
            scheduled_time: "08:30 AM",
            status: "TAKEN",
            taken_at: "08:40 AM",
            can_refill: false,
            refill_remaining_days: 0,
          },
        ],
        afternoon_doses: [
          {
            compartment_id: "dose-a-1",
            medication_name: "Paracetamol 500mg Caplets",
            brand_name: "Panadol Extra",
            dosage: "2 Tablets",
            instructions: "Take after lunch for mild fever",
            time_of_day: "AFTERNOON",
            scheduled_time: "01:00 PM",
            status: "TAKEN",
            taken_at: "01:15 PM",
            can_refill: true,
            refill_remaining_days: 3,
            pharmacy_pickup_partner: "Ernest Chemists (Osu Branch)",
          },
        ],
        evening_doses: [
          {
            compartment_id: "dose-e-1",
            medication_name: "Metformin HCl 500mg Extended Release",
            brand_name: "Glucophage XR",
            dosage: "1 Tablet",
            instructions: "Take with dinner",
            time_of_day: "EVENING",
            scheduled_time: "07:00 PM",
            status: "PENDING",
            taken_at: null,
            can_refill: false,
            refill_remaining_days: 24,
          },
        ],
        night_doses: [
          {
            compartment_id: "dose-n-1",
            medication_name: "Atorvastatin Calcium 20mg",
            brand_name: "Lipitor",
            dosage: "1 Tablet",
            instructions: "Take at bedtime",
            time_of_day: "NIGHT",
            scheduled_time: "10:00 PM",
            status: "PENDING",
            taken_at: null,
            can_refill: true,
            refill_remaining_days: 4,
            pharmacy_pickup_partner: "Ridge Regional Pharmacy Hub",
          },
        ],
        total_doses_today: 5,
        doses_completed_today: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleTakeDose = async (compartmentId: string, medicationName: string) => {
    setLoggingDoseId(compartmentId);
    try {
      const res = await apiClient.logDoseAdherence({
        compartment_id: compartmentId,
        status: "TAKEN",
      });

      setStatusMessage({
        type: "success",
        text: `Dose recorded! ${medicationName} marked as taken. Streak updated!`,
      });

      // Update local state
      if (schedule) {
        const updateList = (list: PillBoxCompartmentItem[]) =>
          list.map((it) =>
            it.compartment_id === compartmentId
              ? { ...it, status: "TAKEN", taken_at: "Just Now" }
              : it
          );

        setSchedule({
          ...schedule,
          streak_days: res.streak_days,
          compliance_percentage: res.compliance_percentage,
          doses_completed_today: schedule.doses_completed_today + 1,
          morning_doses: updateList(schedule.morning_doses),
          afternoon_doses: updateList(schedule.afternoon_doses),
          evening_doses: updateList(schedule.evening_doses),
          night_doses: updateList(schedule.night_doses),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to log dose.",
      });
    } finally {
      setLoggingDoseId(null);
    }
  };

  const handleBookTelehealth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBookingTelehealth(true);
    try {
      const res = await apiClient.bookTelehealthSession({
        doctor_name: "Attending Physician",
        specialty: telehealthSpecialty,
        scheduled_start: telehealthTime,
        reason_for_visit: telehealthReason,
      });
      setBookedSession(res);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to book telehealth session.",
      });
    } finally {
      setIsBookingTelehealth(false);
    }
  };

  const renderCompartmentSection = (
    title: string,
    timeSubtitle: string,
    icon: React.ReactNode,
    colorClass: string,
    doses: PillBoxCompartmentItem[]
  ) => {
    return (
      <div className="space-y-3">
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${colorClass}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white shadow-sm">{icon}</div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeSubtitle}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/80 text-[10px] font-bold">
            {doses.filter((d) => d.status === "TAKEN").length} / {doses.length} Completed
          </Badge>
        </div>

        {doses.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No scheduled medications for this compartment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doses.map((dose) => {
              const isTaken = dose.status === "TAKEN";
              return (
                <Card
                  key={dose.compartment_id}
                  className={`border transition-all duration-200 shadow-sm relative overflow-hidden ${
                    isTaken
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-md"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-sm font-extrabold text-slate-900">
                            {dose.medication_name}
                          </strong>
                          {dose.brand_name && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({dose.brand_name})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-teal-800 font-bold mt-0.5">{dose.dosage}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{dose.instructions}</p>
                      </div>

                      <Badge
                        variant={isTaken ? "teal" : "warning"}
                        className="text-[9px] font-extrabold tracking-wider uppercase shrink-0"
                      >
                        {isTaken ? "TAKEN" : "PENDING"}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {isTaken ? `Taken at ${dose.taken_at}` : `Scheduled: ${dose.scheduled_time}`}
                      </span>

                      <div className="flex items-center gap-2">
                        {dose.can_refill && (
                          <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition"
                          >
                            <ShoppingBag className="h-3 w-3" /> 1-Click Refill
                          </Link>
                        )}

                        {!isTaken ? (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={loggingDoseId === dose.compartment_id}
                            onClick={() => handleTakeDose(dose.compartment_id, dose.medication_name)}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] gap-1 px-3 py-1"
                          >
                            {loggingDoseId === dose.compartment_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Take Dose
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Logged
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/80 border border-teal-600 text-teal-200 text-xs font-semibold mb-2">
            <Pill className="h-3.5 w-3.5" /> Interactive Patient Adherence Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Daily Smart Pill Box
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-xl">
            {schedule?.current_date || "Today's Schedule"} — Structured 4-phase dosage compartments, adherence telemetry, and 1-click pharmacy refill triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTelehealthModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-1.5 shadow-sm"
          >
            <Video className="h-4 w-4 text-cyan-300" /> 1-Click Telehealth
          </Button>

          <Link href="/marketplace">
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm"
            >
              <ShoppingBag className="h-4 w-4" /> Refill All Medications
            </Button>
          </Link>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            {statusMessage.text}
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Adherence Score & Streak Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Active Adherence Streak
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {schedule?.streak_days || 6}
                </span>
                <span className="text-xs font-bold text-amber-700">Days Active</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Take all doses today to unlock Day 7 reward badge!
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Flame className="h-7 w-7" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Today's Adherence Rate
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-teal-900 font-mono">
                  {schedule?.compliance_percentage || 80}%
                </span>
                <span className="text-xs font-bold text-teal-700">Compliance</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {schedule?.doses_completed_today || 4} of {schedule?.total_doses_today || 5} doses taken today
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Smart Refill Assistant
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-indigo-900 font-mono">2</span>
                <span className="text-xs font-bold text-indigo-700">Meds Needing Refill</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Paracetamol &amp; Atorvastatin running low (&lt;5 days remaining)
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 4-PHASE COMPARTMENT GRID */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
          <p className="text-xs font-bold">Synchronizing prescription pill box...</p>
        </div>
      ) : schedule ? (
        <div className="space-y-6">
          {/* Phase 1: Morning */}
          {renderCompartmentSection(
            "Phase 1: Morning Compartment",
            "07:00 AM – 10:00 AM (Breakfast Doses)",
            <Sunrise className="h-5 w-5 text-amber-600" />,
            "bg-amber-50/70 border-amber-200",
            schedule.morning_doses
          )}

          {/* Phase 2: Afternoon */}
          {renderCompartmentSection(
            "Phase 2: Afternoon Compartment",
            "12:00 PM – 03:00 PM (Lunch Doses)",
            <Sun className="h-5 w-5 text-yellow-600" />,
            "bg-yellow-50/70 border-yellow-200",
            schedule.afternoon_doses
          )}

          {/* Phase 3: Evening */}
          {renderCompartmentSection(
            "Phase 3: Evening Compartment",
            "06:00 PM – 08:30 PM (Dinner Doses)",
            <Sunset className="h-5 w-5 text-orange-600" />,
            "bg-orange-50/70 border-orange-200",
            schedule.evening_doses
          )}

          {/* Phase 4: Night */}
          {renderCompartmentSection(
            "Phase 4: Night Compartment",
            "09:30 PM – 11:30 PM (Bedtime Doses)",
            <Moon className="h-5 w-5 text-indigo-600" />,
            "bg-indigo-50/70 border-indigo-200",
            schedule.night_doses
          )}
        </div>
      ) : null}

      {/* 1-Click Telehealth Modal */}
      {telehealthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    1-Click Telehealth Video Consultation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Encrypted WebRTC Virtual Consultation with Licensed Physician
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTelehealthModalOpen(false);
                  setBookedSession(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {bookedSession ? (
              <div className="space-y-4 py-2 text-center">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-extrabold text-emerald-900">
                    Telehealth Room Confirmed!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Your appointment with <strong>{bookedSession.doctor_name}</strong> is scheduled for{" "}
                    <strong>{bookedSession.scheduled_start}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1 font-mono">
                  <p className="text-slate-500">Room Pass Code: <strong className="text-slate-800">{bookedSession.room_token}</strong></p>
                  <p className="text-slate-500">Direct Room URL: <span className="text-teal-700 truncate block">{bookedSession.join_url}</span></p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTelehealthModalOpen(false);
                      setBookedSession(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => window.open(bookedSession.join_url, "_blank")}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold gap-2"
                  >
                    <Video className="h-4 w-4" /> Enter Waiting Room
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookTelehealth} className="space-y-3 text-xs">
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                  <p className="text-teal-900 font-semibold">
                    Covered under Ghana Health Service / NHIS Telehealth Tier-1 Benefit.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clinical Specialty</label>
                  <select
                    value={telehealthSpecialty}
                    onChange={(e) => setTelehealthSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="General Medicine / Family Physician">General Medicine / Family Physician (Attending Team)</option>
                    <option value="Cardiology & Hypertension">Cardiology &amp; Hypertension (Cardiology Team)</option>
                    <option value="Endocrinology / Diabetes">Endocrinology / Diabetes (Endocrinology Team)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Time Slot</label>
                  <input
                    type="text"
                    value={telehealthTime}
                    onChange={(e) => setTelehealthTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Virtual Visit</label>
                  <textarea
                    rows={2}
                    value={telehealthReason}
                    onChange={(e) => setTelehealthReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setTelehealthModalOpen(false)}
                    disabled={isBookingTelehealth}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isBookingTelehealth}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold gap-1.5"
                  >
                    {isBookingTelehealth ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Pass...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Confirm &amp; Generate Room Pass
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
