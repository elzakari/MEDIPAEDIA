"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  Clock,
  PlusCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
} from "@medipaedia/ui";
import { createApiClient, ClinicDepartment, QueueDispatchResult, ReceptionTriagePriority } from "@medipaedia/api-client";

export default function ReceptionAppointmentsPage() {
  const apiClient = createApiClient();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const arrivedCount = useMemo<number>(() => {
    return appointments.filter((a: any) =>
      (a?.status || "") === "CHECKED_IN" || (a?.status || "") === "IN_CONSULTATION"
    ).length;
  }, [appointments]);

  const pendingCount = useMemo<number>(() => {
    return appointments.filter((a: any) => (a?.status || "") === "SCHEDULED").length;
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAppointments({ date: selectedDate });
      setAppointments(Array.isArray(res) ? res : ((res as any)?.data || []));
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handleCheckInAppointment = async (aptId: string) => {
    const apt = appointments.find((a: any) => a?.appointment_id === aptId);
    if (!apt) return;

    setStatusMessage(null);

    try {
      const departmentCode: ClinicDepartment =
        (apt.department as ClinicDepartment) || "GENERAL_OPD";

      const res: QueueDispatchResult = await apiClient.dispatchQueueTicket({
        destination_clinic: departmentCode,
        priority: "ROUTINE" as ReceptionTriagePriority,
        consulting_room_target: apt.doctor_name
          ? `Consulting — ${apt.doctor_name}`
          : undefined,
      });

      setAppointments((prev) =>
        prev.map((a: any) =>
          a.appointment_id === aptId
            ? { ...a, status: "CHECKED_IN", queue_number: res.queue_number }
            : a
        )
      );

      setStatusMessage({
        type: "success",
        text: apt.patient_name ? apt.patient_name + " checked in" : "Patient checked in" + " • Ticket " + res.queue_number,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || String(err) || "Could not check in appointment",
      });
    }
  };

  const filtered = appointments.filter((a: any) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      String(a?.patient_name || "").toLowerCase().includes(q) ||
      String(a?.booking_reference || a?.appointment_id || "").toLowerCase().includes(q) ||
      String(a?.doctor_name || "").toLowerCase().includes(q) ||
      String(a?.department || "").toLowerCase().includes(q)
    );
  });
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <CalendarCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pre-Booked Clinic Appointments
              </h1>
              <p className="text-xs text-slate-500">
                Scheduled outpatient visits, specialty clinic consultations, and fast-track arrival desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              className="gap-1 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-teal-600" /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="gap-1 text-xs font-bold bg-teal-600 hover:bg-teal-700"
            >
              <PlusCircle className="h-3.5 w-3.5" /> New Booking
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Bookings
            </span>
            <strong className="text-xl font-bold text-slate-800">
              {appointments.length || 0}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              Arrived / Checked In
            </span>
            <strong className="text-xl font-bold text-emerald-900">
              {arrivedCount || 0}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">
              Pending Arrivals
            </span>
            <strong className="text-xl font-bold text-amber-900">
              {pendingCount || 0}
            </strong>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scheduled appointments by patient name, booking reference, or doctor..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Status Flash */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Appointments Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Time Slot</th>
                  <th className="py-3.5 px-4">Specialty Clinic</th>
                  <th className="py-3.5 px-4">Attending Doctor</th>
                  <th className="py-3.5 px-4">Patient / Booking</th>
                  <th className="py-3.5 px-4">Status / Ticket</th>
                  <th className="py-3.5 px-4 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold">
                        <Clock className="h-4 w-4 animate-spin text-teal-600" />
                        Loading scheduled appointments...
                      </div>
                    </td>
                  </tr>
                ) : !loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl mb-3">
                          📅
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No Appointments Scheduled</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          No patient bookings found for this selected date. Click "New Booking" or select another calendar date.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item: any) => (
                    <tr key={String(item?.appointment_id || item?.booking_reference || Math.random())} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item?.scheduled_time || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {item?.department || "Unassigned"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {item?.doctor_name || "TBD"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {item?.patient_name || "Patient Walk-In"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item?.booking_reference || item?.appointment_id || ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item?.status === "CHECKED_IN" || item?.status === "IN_CONSULTATION" ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="teal" className="text-[10px]">Checked In</Badge>
                            {item?.queue_number && (
                              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">
                                {item.queue_number}
                              </span>
                            )}
                          </div>
                        ) : item?.status === "COMPLETED" ? (
                          <Badge variant="outline" className="text-[10px]">Completed</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">Scheduled</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item?.status === "SCHEDULED" ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCheckInAppointment(String(item.appointment_id))}
                            className="gap-1 bg-teal-600 hover:bg-teal-700 text-xs font-bold"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Check In
                          </Button>
                        ) : item?.status === "COMPLETED" ? (
                          <span className="text-slate-500 font-bold text-xs flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /> Visit Complete
                          </span>
                        ) : (
                          <span className="text-slate-700 font-bold text-xs flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> In Queue
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
