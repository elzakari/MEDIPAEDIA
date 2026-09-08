"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  ShiftRosterItem,
  ShiftRosterType,
} from "@medipaedia/api-client";

export default function HospitalShiftRosterPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const { t } = useTranslation();

  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const [staffName, setStaffName] = useState<string>("");
  const [shiftType, setShiftType] = useState<ShiftRosterType>("MORNING");
  const [shiftDept, setShiftDept] = useState<string>("");
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [roster, setRoster] = useState<ShiftRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getShiftRoster();
      setRoster(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (t("common.loadError") || "Unable to load data. Please check your connection and retry.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSuccess(true);
    setTimeout(() => {
      setAssignSuccess(false);
      setAssignModalOpen(false);
    }, 1200);
  };

  const filteredRoster = roster.filter(
    (r) => selectedDept === "ALL" || r.department.includes(selectedDept)
  );

  const formatShiftTime = (start: string, end: string) => {
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-80 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-16 w-full bg-slate-200 rounded animate-pulse" />
        <Card className="p-5 border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="h-10 bg-slate-100">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <th key={i} className="p-2.5">
                      <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((row) => (
                  <tr key={row} className="h-12 border-b border-slate-100">
                    {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                      <td key={col} className="p-2.5">
                        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 border border-rose-200 bg-rose-50/30">
        <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              {(t("common.error") || "Error")}
            </h3>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
          <Button variant="danger" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {(t("common.retry") || "Retry")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-teal-700" />
            {(t("hospitalAdmin.roster.title") || "Clinical Shift Scheduling & Rostering")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {(t("hospitalAdmin.roster.subtitle") || "Workforce coverage management across Outpatient, Inpatient Wards, ICU, and Surgical Suites")}
          </p>
        </div>

        <Button
          onClick={() => setAssignModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" />
          {(t("hospitalAdmin.roster.assignShift") || "Assign New Shift")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <strong className="text-xs font-extrabold text-slate-900 font-mono px-2">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </strong>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {["ALL", "OPD", "Emergency", "Ward", "ICU", "Theatre"].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedDept === d
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        {filteredRoster.length === 0 && roster.length > 0 && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              <Search className="h-10 w-10 mx-auto text-slate-400" />
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  {t("common.noResults") || "No matching roster entries"}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("common.adjustSearch") || "Try clearing your department filter."}
                </p>
              </div>
            </div>
          </div>
        )}

        {roster.length === 0 && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700">
                <Inbox className="h-10 w-10" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  {t("superAdmin.noRoster") || "No roster shifts scheduled"}
                </h3>
                <p className="text-sm text-slate-500">
                  {(t("superAdmin.noRosterHelp") || "Configure clinical and administrative staff roster templates for the next pay period.") || "Configure clinical and administrative staff roster templates for the next pay period."}
                </p>
              </div>
            </div>
          </div>
        )}

        {filteredRoster.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thName") || "Practitioner Name") || "Practitioner Name"}</th>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thRole") || "Role") || "Role"}</th>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thDept") || "Clinical Department") || "Clinical Department"}</th>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thShift") || "Shift Window") || "Shift Window"}</th>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thHours") || "Hours") || "Hours"}</th>
                  <th className="p-2.5">{(t("hospitalAdmin.roster.thStatus") || "Status") || "Status"}</th>
                  <th className="p-2.5 text-right">{(t("hospitalAdmin.roster.thAction") || "Action") || "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((entry) => (
                  <tr key={entry.roster_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-2.5 font-extrabold text-slate-900">{entry.staff_name}</td>
                    <td className="p-2.5">
                      <Badge variant={entry.role === "DOCTOR" ? "teal" : "warning"} className="text-[10px] font-bold">
                        {entry.role}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-slate-700 font-medium">{entry.department}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          entry.shift_type === "MORNING"
                            ? "bg-amber-100 text-amber-800"
                            : entry.shift_type === "AFTERNOON"
                            ? "bg-blue-100 text-blue-800"
                            : entry.shift_type === "NIGHT"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {entry.shift_type}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">
                      {formatShiftTime(entry.start_time, entry.end_time)}
                    </td>
                    <td className="p-2.5">
                      <Badge
                        variant={entry.status === "CHECKED_IN" ? "teal" : "outline"}
                        className="text-[10px] font-bold"
                      >
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => alert((t("hospitalAdmin.roster.swapAlert", { name: entry.staff_name }) || "Shift swap workflow for {name}...") || `Shift swap workflow for ${entry.staff_name}...`)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                      >
                        {(t("hospitalAdmin.roster.swapShift") || "Swap Shift") || "Swap Shift"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {assignModalOpen && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={(t("hospitalAdmin.roster.modalTitle") || "Schedule Clinical Staff Shift")}
          description={(t("hospitalAdmin.roster.modalDesc") || "Assign practitioner to designated shift window and ward service.")}
        >
          <form onSubmit={handleAssignShift} className="py-4 space-y-3 text-xs">
            {assignSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">
                  {(t("hospitalAdmin.roster.scheduledSuccess") || "Shift Scheduled Successfully!")}
                </h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {(t("hospitalAdmin.roster.selectPractitioner") || "Select Practitioner")}
                  </label>
                  <select
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    required
                  >
                    <option value="">{(t("common.select") || "Select")}...</option>
                    <option value="Attending Physician">{(t("hospitalAdmin.roster.staffDoctor1") || "Attending Physician (Medical Doctor)")}</option>
                    <option value="Resident Physician">{(t("hospitalAdmin.roster.staffDoctor2") || "Resident Physician (Medical Doctor)")}</option>
                    <option value="Charge Nurse">{(t("hospitalAdmin.roster.staffNurse1") || "Charge Nurse (Registered Nurse)")}</option>
                    <option value="Hospital Cashier">{(t("hospitalAdmin.roster.staffCashier") || "Hospital Cashier (Cashier Desk)")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {(t("hospitalAdmin.roster.shiftType") || "Shift Type")}
                    </label>
                    <select
                      value={shiftType}
                      onChange={(e) => setShiftType(e.target.value as ShiftRosterType)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="MORNING">{(t("hospitalAdmin.roster.shiftMorning") || "Morning (08:00 - 16:00)")}</option>
                      <option value="AFTERNOON">{(t("hospitalAdmin.roster.shiftAfternoon") || "Afternoon (14:00 - 22:00)")}</option>
                      <option value="NIGHT">{(t("hospitalAdmin.roster.shiftNight") || "Night (20:00 - 08:00)")}</option>
                      <option value="ON_CALL">{(t("hospitalAdmin.roster.shiftOnCall") || "24-Hour On-Call")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {(t("hospitalAdmin.roster.dateLabel") || "Date")}
                    </label>
                    <input
                      type="date"
                      value={shiftDate}
                      onChange={(e) => setShiftDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {(t("hospitalAdmin.roster.deptLabel") || "Department")}
                  </label>
                  <select
                    value={shiftDept}
                    onChange={(e) => setShiftDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    required
                  >
                    <option value="">{(t("common.select") || "Select")}...</option>
                    <option value="Outpatient Clinic (OPD)">{(t("hospitalAdmin.roster.deptOpd") || "Outpatient Clinic (OPD)")}</option>
                    <option value="Triage & Emergency">{(t("hospitalAdmin.roster.deptTriage") || "Triage & Emergency")}</option>
                    <option value="Male Medical Ward">{(t("hospitalAdmin.roster.deptMaleWard") || "Male Medical Ward")}</option>
                    <option value="Female Medical Ward">{(t("hospitalAdmin.roster.deptFemaleWard") || "Female Medical Ward")}</option>
                    <option value="Intensive Care Unit (ICU)">{(t("hospitalAdmin.roster.deptIcu") || "Intensive Care Unit (ICU)")}</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  {(t("hospitalAdmin.roster.confirmAllocation") || "Confirm Shift Allocation")}
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
