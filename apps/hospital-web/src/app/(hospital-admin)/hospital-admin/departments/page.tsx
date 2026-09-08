"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bed,
  Scissors,
  Edit2,
  Users,
  Inbox,
  RefreshCw,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Toast, ToastProps } from "@medipaedia/ui";
import { useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  DepartmentCapacityItem,
  OperatingTheatreItem,
} from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";

export default function HospitalDepartmentsAndBedsPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const { t } = useTranslation();
  const { tenant } = useAuth();

  const [activeTab, setActiveTab] = useState<"WARDS" | "THEATRES">("WARDS");
  const [editBedModal, setEditBedModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentCapacityItem | null>(null);
  const [newBedCount, setNewBedCount] = useState(12);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [updateBedsLoading, setUpdateBedsLoading] = useState(false);

  const [departments, setDepartments] = useState<DepartmentCapacityItem[]>([]);
  const [theatres, setTheatres] = useState<OperatingTheatreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptsData, theatresData] = await Promise.all([
        apiClient.getFacilityDepartments(),
        apiClient.getOperatingTheatres(),
      ]);
      setDepartments(deptsData);
      setTheatres(theatresData);
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

  const handleUpdateBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setUpdateBedsLoading(true);
    try {
      const updated = await apiClient.updateDepartmentBeds(selectedDept.department_id, {
        total_beds: newBedCount,
        head_of_department: selectedDept.head_of_department,
      });
      setDepartments((prev) =>
        prev.map((d) => (d.department_id === selectedDept.department_id ? { ...d, ...updated, total_beds: newBedCount } : d))
      );
      setEditBedModal(false);
      setToast({
        type: "success",
        title: t("hospitalAdmin.departments.bedUpdatedTitle") || "Ward Bed Capacity Updated",
        message: (t("hospitalAdmin.departments.bedUpdatedMessage", {
          name: selectedDept.name,
          count: newBedCount,
        }) || "{name} reconfigured to {count} physical beds.") || `${selectedDept.name} reconfigured to ${newBedCount} physical beds.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("common.loadError") || "Failed to update ward capacity.";
      setToast({
        type: "error",
        title: t("common.error") || "Error",
        message,
      });
    } finally {
      setUpdateBedsLoading(false);
    }
  };

  const totalCapacity = departments.reduce((acc, d) => acc + d.total_beds, 0);
  const totalOccupied = departments.reduce((acc, d) => acc + d.occupied_beds, 0);
  const totalAvailable = departments.reduce((acc, d) => acc + d.available_beds, 0);
  const overallOccupancy = totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-72 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border border-slate-200">
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-36 bg-slate-200 rounded animate-pulse" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="p-5 border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-200 rounded animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
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

  const renderWardsEmpty = () => (
    <Card className="p-8 border border-dashed border-slate-300 text-center bg-slate-50/50">
      <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
        <div className="h-14 w-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
          <Inbox className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            {(t("superAdmin.noDepartments") || "No departments configured")}
          </h3>
          <p className="text-sm text-slate-500">
            {(t("superAdmin.noDepartmentsHelp") || "Create departments (OPD, ER, Paediatrics, etc.) to route queue and triage traffic.")}
          </p>
        </div>
      </div>
    </Card>
  );

  const renderTheatresEmpty = () => (
    <Card className="p-8 border border-dashed border-slate-300 text-center bg-slate-50/50">
      <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
        <div className="h-14 w-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
          <Inbox className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            {(t("hospitalAdmin.departments.noTheatres") || "No operating theatres configured")}
          </h3>
          <p className="text-sm text-slate-500">
            {(t("hospitalAdmin.departments.noTheatresHelp") || "Add surgical suites and operating theatres to manage procedures and scheduling.")}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          actionUrl={toast.actionUrl}
          actionLabel={toast.actionLabel}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-600" />
            {(t("hospitalAdmin.departments.title") || "Wards & Surgical Theatres")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {tenant?.name || (t("hospitalAdmin.departments.defaultFacility") || "Healthcare Facility")}
            {" • "}
            {(t("hospitalAdmin.departments.subtitle") || "Real-time bed occupancy, emergency reserve, and OT scheduling.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "WARDS" ? "teal" : "outline"}
            onClick={() => setActiveTab("WARDS")}
          >
            <Bed className="h-4 w-4 mr-1.5" />
            {(t("hospitalAdmin.departments.wardsTab") || "Inpatient Wards")} ({departments.length})
          </Button>
          <Button
            variant={activeTab === "THEATRES" ? "teal" : "outline"}
            onClick={() => setActiveTab("THEATRES")}
          >
            <Scissors className="h-4 w-4 mr-1.5" />
            {(t("hospitalAdmin.departments.theatresTab") || "Operating Theatres")} ({theatres.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border border-slate-200 bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {(t("hospitalAdmin.departments.totalCapacity") || "Total Bed Capacity")}
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalCapacity}</p>
          <p className="text-[11px] text-slate-400">
            {(t("hospitalAdmin.departments.physicalBeds") || "Physical Inpatient Beds")}
          </p>
        </Card>
        <Card className="p-4 border border-slate-200 bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {(t("hospitalAdmin.departments.occupiedBeds") || "Occupied Beds")}
          </span>
          <p className="text-xl sm:text-2xl font-black text-teal-600 mt-1">{totalOccupied}</p>
          <p className="text-[11px] text-slate-400">
            {(t("hospitalAdmin.departments.admittedPatients") || "Admitted Patients")}
          </p>
        </Card>
        <Card className="p-4 border border-slate-200 bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {(t("hospitalAdmin.departments.availableBeds") || "Available Beds")}
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{totalAvailable}</p>
          <p className="text-[11px] text-slate-400">
            {(t("hospitalAdmin.departments.intakeReady") || "Immediate Intake Ready")}
          </p>
        </Card>
        <Card className="p-4 border border-slate-200 bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {(t("hospitalAdmin.departments.avgOccupancy") || "Average Occupancy")}
          </span>
          <p className="text-xl sm:text-2xl font-black text-purple-600 mt-1">{overallOccupancy}%</p>
          <p className="text-[11px] text-slate-400">
            {(t("hospitalAdmin.departments.acrossWards", { count: departments.length }) || "Across {count} Clinical Wards")}
          </p>
        </Card>
      </div>

      {activeTab === "WARDS" ? (
        departments.length === 0 ? renderWardsEmpty() : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <Card key={dept.department_id} className="p-5 border border-slate-200 bg-white space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{dept.head_of_department}</p>
                  </div>
                  <Badge
                    variant={dept.occupancy_rate > 80 ? "warning" : "teal"}
                    className="text-[10px] font-bold"
                  >
                    {dept.occupancy_rate}% {(t("hospitalAdmin.departments.occupied") || "Occupied")}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dept.occupancy_rate > 80 ? "bg-amber-500" : "bg-teal-600"
                      }`}
                      style={{ width: `${Math.min(100, dept.occupancy_rate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{dept.occupied_beds} {(t("hospitalAdmin.departments.admitted") || "Admitted")}</span>
                    <span className="font-semibold text-slate-700">
                      {dept.available_beds} {(t("hospitalAdmin.departments.of") || "of")} {dept.total_beds} {(t("hospitalAdmin.departments.available") || "Available")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="h-4 w-4 text-teal-600" />
                    <span>{dept.active_nurses_on_shift} {(t("hospitalAdmin.departments.dutyNurses") || "Duty Nurses")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedDept(dept);
                      setNewBedCount(dept.total_beds);
                      setEditBedModal(true);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {(t("hospitalAdmin.departments.editCapacity") || "Edit Capacity")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        theatres.length === 0 ? renderTheatresEmpty() : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theatres.map((th) => (
              <Card key={th.theatre_id} className="p-5 border border-slate-200 bg-white space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{th.theatre_name}</h3>
                    <p className="text-xs text-teal-600 font-semibold mt-0.5">{th.lead_surgeon}</p>
                  </div>
                  <Badge
                    variant={th.status === "IN_USE" ? "warning" : "success"}
                    className="text-[10px] font-bold"
                  >
                    {th.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                  <p className="text-slate-500">
                    {(t("hospitalAdmin.departments.currentCase") || "Current Case")}: <strong className="text-slate-800">{th.current_procedure || (t("hospitalAdmin.departments.noneScheduled") || "None Scheduled")}</strong>
                  </p>
                  <p className="text-slate-500">
                    {(t("hospitalAdmin.departments.nextCase") || "Next Scheduled Case")}: <strong className="text-teal-700">{th.next_available_time}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button size="sm" variant="outline" className="text-xs">
                    {(t("hospitalAdmin.departments.viewOtLog") || "View OT Log")}
                  </Button>
                  <Button size="sm" variant="teal" className="text-xs">
                    {(t("hospitalAdmin.departments.scheduleProcedure") || "Schedule Procedure")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal
        isOpen={editBedModal}
        onClose={() => setEditBedModal(false)}
        title={(t("hospitalAdmin.departments.reconfigureTitle", { name: selectedDept?.name || (t("hospitalAdmin.departments.ward") || "Ward") }) || "Reconfigure {name} Capacity")}
      >
        <form onSubmit={handleUpdateBeds} className="space-y-4">
          <p className="text-xs text-slate-500">
            {(t("hospitalAdmin.departments.reconfigureDesc") || "Adjust the physical bed count for this ward to ensure accurate census and emergency dispatch allocations.")}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {(t("hospitalAdmin.departments.physicalBedCount") || "Physical Bed Count")} *
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              required
              value={newBedCount}
              onChange={(e) => setNewBedCount(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditBedModal(false)} disabled={updateBedsLoading}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button type="submit" variant="teal" isLoading={updateBedsLoading}>
              {t("hospitalAdmin.departments.saveBedCapacity") || "Save Bed Capacity"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
