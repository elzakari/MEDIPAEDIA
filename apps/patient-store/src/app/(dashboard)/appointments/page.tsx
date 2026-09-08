"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Building2,
  User,
  CheckCircle2,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import {
  createApiClient,
  type PatientAppointmentItemV2,
  type CreatePatientAppointmentRequest,
  type CreatePatientAppointmentResponse,
  type Tenant,
} from "@medipaedia/api-client";
import { QRCodeSVG } from "qrcode.react";

type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PENDING";

interface ViewAppointment {
  id: string;
  facility: string;
  department: string;
  doctor: string;
  time: string;
  scheduledIso: string;
  status: AppointmentStatus | string;
  queuePass: string;
  preCheckin: boolean;
  checkinQrPayload: string;
  raw: PatientAppointmentItemV2;
}

function statusBadgeVariant(
  s: AppointmentStatus | string
): "teal" | "outline" | "success" | "danger" | "warning" {
  switch (s) {
    case "CONFIRMED":
      return "teal";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "outline";
  }
}

function formatScheduledTime(input?: string, fallback?: string): string {
  const raw = input || fallback || "";
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const fmt = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return fmt.format(d);
    }
  } catch {
    // fall through to string passthrough
  }
  return String(raw);
}

function deriveViewApt(apt: PatientAppointmentItemV2): ViewAppointment {
  const id = apt.id || apt.appointment_id || `apt-${Math.random().toString(36).slice(2, 10)}`;
  const facility =
    apt.facility_name || apt.tenant_code || apt.facility?.name || apt.facility?.tenant_code || "Medical Facility";
  const department = apt.department_name || apt.department || apt.service_name || "General Outpatient (OPD)";
  const doctorPart = apt.doctor_name
    ? apt.doctor_name
    : apt.doctor
    ? `Dr. ${[apt.doctor.first_name, apt.doctor.last_name, apt.doctor.full_name].filter(Boolean).join(" ")}`.trim()
    : "";
  const doctor = doctorPart || "—";
  const scheduledIso = apt.scheduled_at || apt.scheduled_time || apt.appointment_date || "";
  const time = formatScheduledTime(apt.scheduled_at, apt.scheduled_time || apt.appointment_date);
  const status = (apt.status || "PENDING") as AppointmentStatus | string;
  const queueRaw = apt.queue_ticket || apt.queue_pass;
  const queuePass = queueRaw
    ? queueRaw
    : apt.queue_number != null && apt.queue_number !== ""
    ? `Q-${String(apt.queue_number).padStart(3, "0")}`
    : "Pending Check-in";
  const preCheckin =
    !!apt.is_prechecked_in ||
    !!apt.pre_checkin_completed ||
    (apt.checkin_completed_at ? true : false);
  const checkinQrPayload = JSON.stringify({
    opd: apt.card_number ?? "",
    apt_id: apt.id ?? apt.appointment_id ?? id,
  });

  return {
    id,
    facility,
    department,
    doctor,
    time,
    scheduledIso,
    status,
    queuePass,
    preCheckin,
    checkinQrPayload,
    raw: apt,
  };
}

const DEPARTMENT_OPTIONS = [
  "General Outpatient (OPD)",
  "Internal Medicine / Cardiology",
  "Pediatrics & Child Health",
  "Obstetrics & Gynecology",
  "Orthopedics & Trauma",
  "Ophthalmology Clinic",
];

const TIME_SLOT_OPTIONS: { label: string; iso: string }[] = [
  (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return { label: "Tomorrow, 09:00 AM", iso: d.toISOString() };
  })(),
  (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 30, 0, 0);
    return { label: "Tomorrow, 11:30 AM", iso: d.toISOString() };
  })(),
  (() => {
    const d = new Date();
    const offsetToFriday = ((5 - d.getDay()) % 7 + 7) % 7 || 7;
    d.setDate(d.getDate() + offsetToFriday);
    d.setHours(10, 0, 0, 0);
    return { label: "Friday, 10:00 AM", iso: d.toISOString() };
  })(),
  (() => {
    const d = new Date();
    const offsetToMonday = ((1 - d.getDay()) % 7 + 7) % 7 || 7;
    d.setDate(d.getDate() + offsetToMonday);
    d.setHours(8, 30, 0, 0);
    return { label: "Monday, 08:30 AM", iso: d.toISOString() };
  })(),
];

export default function PatientAppointmentsPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedPass, setSelectedPass] = useState<ViewAppointment | null>(null);

  const [appointments, setAppointments] = useState<ViewAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [facilityId, setFacilityId] = useState<string>("");
  const [facilityLabel, setFacilityLabel] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [doctorLabel, setDoctorLabel] = useState<string>("");
  const [timeSlotLabel, setTimeSlotLabel] = useState<string>(TIME_SLOT_OPTIONS[0]?.label || "");
  const [reason, setReason] = useState<string>("");

  const [facilityOptions, setFacilityOptions] = useState<Tenant[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilityLoadError, setFacilityLoadError] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    setIsLoadingFacilities(true);
    setFacilityLoadError(null);
    try {
      const client = createApiClient();
      const rows = await client.getTenants?.("HOSPITAL");
      if (Array.isArray(rows) && rows.length > 0) {
        setFacilityOptions(rows);
      } else {
        setFacilityOptions([]);
      }
    } catch (err: any) {
      setFacilityLoadError(err?.message || "Unable to load facility list.");
      setFacilityOptions([]);
    } finally {
      setIsLoadingFacilities(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createApiClient();
      const list = await client.getPatientAppointments();
      const mapped = list.map(deriveViewApt);
      mapped.sort((a, b) => {
        const ad = a.scheduledIso ? new Date(a.scheduledIso).getTime() : 0;
        const bd = b.scheduledIso ? new Date(b.scheduledIso).getTime() : 0;
        if (ad === 0 && bd === 0) return 0;
        if (ad === 0) return 1;
        if (bd === 0) return -1;
        return ad - bd;
      });
      setAppointments(mapped);
    } catch (err: any) {
      const detail =
        err?.message ||
        (typeof err === "string" ? err : undefined) ||
        "We couldn't load your appointments. Please try again.";
      setError(detail);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (bookModalOpen) {
      setBookError(null);
      setBookSuccess(false);
      setDepartment(DEPARTMENT_OPTIONS[0] || "General Outpatient (OPD)");
      setTimeSlotLabel(TIME_SLOT_OPTIONS[0]?.label || "");
      setDoctorLabel("");
      setReason("");
      if (facilityOptions.length === 0 && !isLoadingFacilities) {
        loadFacilities();
      }
    }
  }, [bookModalOpen, facilityOptions.length, isLoadingFacilities, loadFacilities]);

  const handleBookAppointment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsBooking(true);
      setBookError(null);
      setBookSuccess(false);

      const chosenFacility =
        facilityOptions.find((f) => f.id === facilityId) ||
        (facilityId && facilityLabel
          ? ({ id: facilityId, name: facilityLabel } as Tenant)
          : undefined);

      if (!chosenFacility) {
        setBookError("Please select a healthcare facility before booking.");
        setIsBooking(false);
        return;
      }

      const slot =
        TIME_SLOT_OPTIONS.find((s) => s.label === timeSlotLabel) || TIME_SLOT_OPTIONS[0];

      if (!slot) {
        setBookError("Please choose a valid appointment slot.");
        setIsBooking(false);
        return;
      }

      const doctor_name = doctorLabel.trim() ? doctorLabel.trim() : undefined;

      try {
        const payload: CreatePatientAppointmentRequest = {
          facility_id: chosenFacility.id,
          department: department || DEPARTMENT_OPTIONS[0] || "General Outpatient (OPD)",
          scheduled_time: slot.iso,
          reason: reason.trim() || undefined,
        };

        const client = createApiClient();
        const result: CreatePatientAppointmentResponse =
          await client.createPatientAppointment(payload);

        if (result && result.appointment_id) {
          setBookSuccess(true);
          await loadAppointments();
          window.setTimeout(() => {
            setBookSuccess(false);
            setBookModalOpen(false);
            setIsBooking(false);
          }, 1500);
        } else {
          throw new Error(result?.message || "Appointment booking returned no confirmation.");
        }
      } catch (err: any) {
        const detail =
          err?.message ||
          (typeof err === "string" ? err : undefined) ||
          "Unable to confirm booking. Please try again or contact the hospital directly.";
        setBookError(detail);
        setIsBooking(false);
        return;
      } finally {
        if (!bookSuccess) setIsBooking(false);
      }
      void doctor_name;
    },
    [
      facilityId,
      facilityLabel,
      department,
      doctorLabel,
      timeSlotLabel,
      reason,
      loadAppointments,
      bookSuccess,
      facilityOptions,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-teal-700" /> Hospital Appointments &amp;
            Express Queue Passes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Schedule specialist consultations, pre-check in online, and access live OPD queue
            tickets
          </p>
        </div>

        <Button
          onClick={() => {
            setBookError(null);
            setBookSuccess(false);
            setBookModalOpen(true);
          }}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Book New Consultation
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-rose-900">We couldn&apos;t load your appointments</p>
            <p className="text-rose-700 text-xs">{error}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={loadAppointments}
              className="bg-rose-600 hover:bg-rose-700 gap-1.5 text-xs"
            >
              <Loader2 className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Card
              key={i}
              className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 animate-pulse"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-10 bg-slate-200 rounded w-full" />
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && !error && appointments.length === 0 ? (
        <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/50 shadow-sm">
          <CardContent className="py-10 sm:py-14">
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-700 flex items-center justify-center">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  No Scheduled Consultations
                </h2>
                <p className="text-sm text-slate-500">
                  You have no upcoming hospital appointments or active queue passes.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setBookError(null);
                    setBookSuccess(false);
                    setBookModalOpen(true);
                  }}
                  className="font-bold gap-2 shadow-md shadow-teal-700/20"
                >
                  <Plus className="h-4 w-4" /> Book New Consultation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card
              key={apt.id}
              className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-teal-400 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <h3 className="font-extrabold text-base text-slate-900">{apt.facility}</h3>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(apt.status)}
                      className="text-[10px] font-bold"
                    >
                      {apt.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">{apt.department}</span>
                    <span className="mx-1.5 opacity-60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Specialist: <strong className="text-slate-800">{apt.doctor}</strong>
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center px-4">
                    <span className="text-[9px] text-teal-800 font-bold uppercase block">
                      QUEUE PASS #
                    </span>
                    <strong className="text-lg font-black text-teal-950 font-mono">
                      {apt.queuePass}
                    </strong>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setSelectedPass(apt)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <QrCode className="h-4 w-4" /> Express Check-In QR
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-700" />
                  <span>
                    Scheduled Time:{" "}
                    <strong className="text-slate-900">{apt.time}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={apt.preCheckin ? "teal" : "outline"}
                    className="text-[10px] font-bold"
                  >
                    {apt.preCheckin ? (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Online Pre-Check-in Complete
                      </span>
                    ) : (
                      "○ Pre-Check-in Pending"
                    )}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] font-bold gap-1"
                    onClick={() => setSelectedPass(apt)}
                  >
                    View Pass
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {selectedPass ? (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPass(null)}
          title={`Hospital Express Queue Pass — ${selectedPass.queuePass}`}
          description={`Facility: ${selectedPass.facility} • Department: ${selectedPass.department}`}
        >
          <div className="py-4 space-y-4 text-xs text-center">
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="h-44 w-44 bg-white rounded-2xl p-2 mx-auto flex items-center justify-center shadow-lg">
                <QRCodeSVG
                  value={selectedPass.checkinQrPayload}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div>
                <span className="text-[10px] text-teal-300 font-bold uppercase block">
                  PRIORITY OPD TICKET
                </span>
                <strong className="text-3xl font-black text-white font-mono tracking-wider">
                  {selectedPass.queuePass}
                </strong>
              </div>
              <p className="text-[11px] text-slate-400">
                Scheduled for <strong>{selectedPass.time}</strong> • Dr:{" "}
                <strong>{selectedPass.doctor}</strong>
              </p>
              {selectedPass.preCheckin ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pre-Check-in Verified
                </div>
              ) : null}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setSelectedPass(null)}
              className="w-full font-bold"
            >
              Done &amp; Return to Appointments
            </Button>
          </div>
        </Modal>
      ) : null}

      {bookModalOpen ? (
        <Modal
          isOpen={bookModalOpen}
          onClose={() => {
            setBookModalOpen(false);
            setBookError(null);
            setBookSuccess(false);
          }}
          title="Book Specialist Consultation"
          description="Select facility, clinical specialty, and preferred appointment time."
        >
          <form onSubmit={handleBookAppointment} className="py-4 space-y-3 text-xs">
            {bookError ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 flex items-start gap-2 text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[11px]">We couldn&apos;t confirm this booking</p>
                  <p className="text-rose-700 text-[11px]">{bookError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookError(null)}
                  className="rounded-md p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {bookSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Appointment Confirmed!</h3>
                <p className="text-xs text-emerald-800">Priority Queue Ticket Generated.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Select Facility</label>
                  {isLoadingFacilities ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading facilities…
                    </div>
                  ) : (
                    <>
                      <select
                        value={facilityId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const chosen =
                            facilityOptions.find((f) => f.id === id) || undefined;
                          setFacilityId(id);
                          setFacilityLabel(chosen?.name || "");
                        }}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                      >
                        <option value="" disabled>
                          Select facility...
                        </option>
                        {facilityOptions.length === 0 ? (
                          <option value="" disabled>
                            No facilities available to list
                          </option>
                        ) : (
                          facilityOptions.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                              {f.slug ? ` · ${f.slug}` : ""}
                            </option>
                          ))
                        )}
                      </select>
                      {facilityLoadError ? (
                        <p className="mt-1 text-[10px] text-rose-600">{facilityLoadError}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-slate-500">
                        Selected ID:{" "}
                        <span className="font-mono">{facilityId || "—"}</span>
                        {facilityLabel ? (
                          <>
                            {" "}
                            /{" "}
                            <span className="font-semibold text-slate-700">{facilityLabel}</span>
                          </>
                        ) : null}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Clinical Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Doctor / Specialist
                  </label>
                  <input
                    type="text"
                    value={doctorLabel}
                    onChange={(e) => setDoctorLabel(e.target.value)}
                    placeholder="Leave blank for first available clinician"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Preferred Slot</label>
                  <select
                    value={timeSlotLabel}
                    onChange={(e) => setTimeSlotLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  >
                    {TIME_SLOT_OPTIONS.map((s) => (
                      <option key={s.label} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Reason for Visit <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Brief symptoms, follow-up, or referral notes…"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2 gap-2"
                  disabled={isBooking}
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming Booking…
                    </>
                  ) : (
                    <>Confirm Booking &amp; Issue Queue Ticket</>
                  )}
                </Button>
              </>
            )}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

