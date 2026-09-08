"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bed,
  CheckCircle2,
  Clock,
  Droplet,
  Plus,
  Search,
  ShieldAlert,
  Wind,
  Activity,
  AlertTriangle,
  Zap,
  AlertCircle,
  Inbox,
  RefreshCw,
  Hand,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal, useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  type WardBedGridResponse,
  type WardInfo,
  type InpatientBedItem,
  type AssignBedPayload,
  type SBARHandoverItem,
  type StatNursingOrder,
  type ExecuteStatNursingOrderInput,
  type FacilityBedItem,
  type AcknowledgeHandoverPayload,
} from "@medipaedia/api-client";

function mapBedItemToUi(b: InpatientBedItem) {
  return {
    id: b.bed_id,
    number: b.bed_number,
    isOccupied: b.is_occupied,
    patientName: b.patient_name,
    patientId: b.patient_id,
    gender: b.gender,
    age: b.age,
    ghanaCard: b.ghana_card,
    diagnosis: b.diagnosis,
    allergies: b.allergies,
    oxygenRate: b.oxygen_flow_rate,
    ivFluids: b.current_iv_fluids,
    admittedAt: b.admitted_at,
    durationDays: b.admission_duration_days,
    attendingPhysician: b.attending_physician,
    wardId: b.ward_id,
    wardName: b.ward_name,
  };
}

type UiBed = ReturnType<typeof mapBedItemToUi>;

export default function NurseInpatientWardsPage() {
  const { t } = useTranslation();

  const [activeWardId, setActiveWardId] = useState<string>("");
  const [selectedBed, setSelectedBed] = useState<UiBed | null>(null);
  const [patientSummaryModalOpen, setPatientSummaryModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<SBARHandoverItem | null>(null);
  const [ackHandoverName, setAckHandoverName] = useState("");
  const [ackHandoverPin, setAckHandoverPin] = useState("");
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsError, setWardsError] = useState<string | null>(null);
  const [wardGrid, setWardGrid] = useState<WardBedGridResponse | null>(null);

  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState<string | null>(null);
  const [statOrders, setStatOrders] = useState<StatNursingOrder[]>([]);
  const [executingOrderId, setExecutingOrderId] = useState<string | null>(null);

  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [handovers, setHandovers] = useState<SBARHandoverItem[]>([]);

  const [assignPatientName, setAssignPatientName] = useState("");
  const [assignGhanaCard, setAssignGhanaCard] = useState("");
  const [assignAge, setAssignAge] = useState("45");
  const [assignGender, setAssignGender] = useState("Male");
  const [assignDiagnosis, setAssignDiagnosis] = useState("");
  const [assignAllergies, setAssignAllergies] = useState("None known");
  const [assignO2, setAssignO2] = useState("Room Air");
  const [assignIV, setAssignIV] = useState("Normal Saline 0.9% @ 80mL/hr");
  const [assignDoctor, setAssignDoctor] = useState("");
  const [targetBedId, setTargetBedId] = useState<string>("");
  const [targetWardId, setTargetWardId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const wards: WardInfo[] = wardGrid?.wards ?? [];

  const setFirstWardActive = useCallback((list: WardInfo[]) => {
    if (list.length > 0 && !activeWardId) {
      setActiveWardId(list[0].ward_id);
    } else if (list.length > 0 && activeWardId && !list.some((w) => w.ward_id === activeWardId)) {
      setActiveWardId(list[0].ward_id);
    }
  }, [activeWardId]);

  const loadWards = useCallback(async () => {
    setWardsLoading(true);
    setWardsError(null);
    let gridData: WardBedGridResponse | null = null;
    try {
      const client = createApiClient();
      try {
        const flatBeds: FacilityBedItem[] = await client.getFacilityBeds();
        if (Array.isArray(flatBeds) && flatBeds.length > 0) {
          const byWard = new Map<string, WardInfo>();
          flatBeds.forEach((b) => {
            const wid = b.ward_id || `w-${b.ward_name || "default"}`;
            const wname = b.ward_name || "Unassigned";
            let ward = byWard.get(wid);
            if (!ward) {
              ward = { ward_id: wid, ward_name: wname, total_beds: 0, occupied_beds: 0, beds: [] as any };
              byWard.set(wid, ward);
            }
            const bed: InpatientBedItem = {
              bed_id: b.bed_id,
              bed_number: b.bed_number,
              ward_id: b.ward_id || wid,
              ward_name: b.ward_name || wname,
              is_occupied: b.is_occupied,
              patient_id: b.patient_id,
              patient_name: b.patient_name,
              gender: b.gender,
              age: b.age,
              ghana_card: b.ghana_card,
              diagnosis: b.diagnosis,
              allergies: b.allergies,
              oxygen_flow_rate: b.oxygen_flow_rate,
              current_iv_fluids: b.current_iv_fluids,
              attending_physician: b.attending_physician,
              admitted_at: b.admitted_at,
            };
            ward.beds.push(bed as any);
            ward.total_beds = ward.total_beds + 1;
            if (b.is_occupied) ward.occupied_beds = ward.occupied_beds + 1;
          });
          const wards = Array.from(byWard.values());
          const totalBeds = wards.reduce((s, w) => s + w.total_beds, 0);
          const occ = wards.reduce((s, w) => s + w.occupied_beds, 0);
          gridData = { total_facility_beds: totalBeds, occupied_beds: occ, vacant_beds: Math.max(0, totalBeds - occ), wards } as any;
        }
      } catch (_secondary) {
        gridData = null;
      }
      if (!gridData) {
        const fb = await client.getWardBedMap();
        gridData = fb && typeof fb === "object" ? fb : null;
      }
      setWardGrid(gridData);
      setFirstWardActive(gridData?.wards ?? []);
    } catch (err: any) {
      setWardsError(err?.message || (t("nurse.wardsLoadFailed") || "Failed to load ward bed map"));
      setWardGrid(null);
    } finally {
      setWardsLoading(false);
    }
  }, [t, setFirstWardActive]);

  const loadStatOrders = useCallback(async () => {
    setStatLoading(true);
    setStatError(null);
    try {
      const client = createApiClient();
      const data = await client.getStatNursingOrders("PENDING");
      setStatOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setStatError(err?.message || (t("nurse.statLoadFailed") || "Failed to load STAT orders"));
      setStatOrders([]);
    } finally {
      setStatLoading(false);
    }
  }, [t]);

  const loadHandovers = useCallback(async () => {
    setHandoverLoading(true);
    setHandoverError(null);
    try {
      const client = createApiClient();
      const activeWard = wards.find((w) => w.ward_id === activeWardId);
      const data = await client.getSBARHandovers(activeWard?.ward_name);
      setHandovers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setHandoverError(err?.message || (t("nurse.handoverLoadFailed") || "Failed to load SBAR handovers"));
      setHandovers([]);
    } finally {
      setHandoverLoading(false);
    }
  }, [t, wards, activeWardId]);

  useEffect(() => {
    loadWards();
    loadStatOrders();
  }, [loadWards, loadStatOrders]);

  useEffect(() => {
    if (activeWardId) {
      loadHandovers();
    }
  }, [activeWardId, loadHandovers]);

  const handleExecuteStatOrder = async (orderId: string) => {
    setExecutingOrderId(orderId);
    try {
      const client = createApiClient();
      const input: ExecuteStatNursingOrderInput = {
        execution_notes: (t("nurse.statExecutedByWard") || "Administered STAT by Ward Duty Nurse"),
      };
      await client.executeStatNursingOrder(orderId, input);
      setStatOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "EXECUTED" as any,
                executed_at: (t("common.justNow") || "Just now"),
                executed_by_nurse_name: (t("nurse.wardNurse") || "Ward Nurse"),
              }
            : o
        )
      );
    } catch (err: any) {
      setStatError(err?.message || (t("nurse.statExecFailed") || "Failed to execute STAT order"));
    } finally {
      setExecutingOrderId(null);
    }
  };

  const activeWard = wards.find((w) => w.ward_id === activeWardId) || null;
  const activeUiBeds: UiBed[] = useMemo(
    () => (activeWard?.beds || []).map(mapBedItemToUi),
    [activeWard]
  );

  const filteredBeds = useMemo(() => {
    if (!searchQuery.trim()) return activeUiBeds;
    const q = searchQuery.trim().toLowerCase();
    return activeUiBeds.filter(
      (b) =>
        b.number.toLowerCase().includes(q) ||
        (b.patientName || "").toLowerCase().includes(q) ||
        (b.ghanaCard || "").toLowerCase().includes(q) ||
        (b.diagnosis || "").toLowerCase().includes(q)
    );
  }, [activeUiBeds, searchQuery]);

  const handleBedClick = (bed: UiBed) => {
    if (bed.isOccupied) {
      setSelectedBed(bed);
      setPatientSummaryModalOpen(true);
    } else {
      setTargetBedId(bed.id);
      setTargetWardId(bed.wardId || activeWardId);
      setSaveSuccess(false);
      setAssignModalOpen(true);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const client = createApiClient();
      const payload: AssignBedPayload = {
        patient_id: `p-${Date.now().toString().slice(-6)}`,
        patient_name: assignPatientName,
        gender: assignGender,
        age: parseInt(assignAge) || 40,
        ghana_card: assignGhanaCard,
        ward_id: targetWardId || activeWardId,
        bed_id: targetBedId,
        diagnosis: assignDiagnosis,
        allergies: assignAllergies ? [assignAllergies] : undefined,
        oxygen_flow_rate: assignO2 || undefined,
        current_iv_fluids: assignIV || undefined,
        attending_physician: assignDoctor,
      };
      await client.assignWardBed(payload);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setAssignModalOpen(false);
        setAssignPatientName("");
        setAssignGhanaCard("");
        setAssignDiagnosis("");
        loadWards();
      }, 1200);
    } catch (err: any) {
      setWardsError(err?.message || (t("nurse.assignFailed") || "Failed to assign bed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHandover = (h: SBARHandoverItem) => {
    setSelectedHandover(h);
    setAckHandoverName("");
    setAckHandoverPin("");
    setHandoverModalOpen(true);
  };

  const handleAcknowledgeHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandover) return;
    setIsSubmittingHandover(true);
    try {
      const client = createApiClient();
      const payload: AcknowledgeHandoverPayload = {
        incoming_nurse_name: ackHandoverName,
        incoming_nurse_pin: ackHandoverPin,
      };
      await client.acknowledgeHandover(selectedHandover.handover_id, payload);
      setHandovers((prev) =>
        prev.map((h) =>
          h.handover_id === selectedHandover.handover_id
            ? {
                ...h,
                is_acknowledged: true,
                incoming_nurse_name: ackHandoverName,
                incoming_nurse_pin: ackHandoverPin,
                acknowledged_at: (t("common.justNow") || "Just now"),
              }
            : h
        )
      );
      setTimeout(() => setHandoverModalOpen(false), 800);
    } catch (err: any) {
      setHandoverError(err?.message || (t("nurse.handoverAckFailed") || "Failed to acknowledge handover"));
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const totalFacilityBeds = wardGrid?.total_facility_beds ?? 0;
  const totalOccupied = wardGrid?.occupied_beds ?? 0;
  const occupancyRate = wardGrid?.occupancy_rate_percent ?? 0;

  const unacknowledgedHandovers = handovers.filter((h) => !h.is_acknowledged);

  const statPending = statOrders.filter((o) => o.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {(t("nurse.wardsTitle") || "Inpatient Wards & Bed Census")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {(t("nurse.wardsSubtitle") || "Male, female, pediatric, and ICU telemetry bed allocation")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
            <Bed className="h-5 w-5 text-teal-600" />
            <div className="text-xs">
              <span className="font-semibold text-slate-500 block">
                {(t("nurse.facilityCensus") || "Facility Census")}:
              </span>
              <span className="font-extrabold text-slate-900">
                {totalOccupied} / {totalFacilityBeds} {(t("nurse.bedsLabel") || "Beds")} ({occupancyRate}% {(t("nurse.occupiedLabel") || "Occupied")})
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadWards(); loadStatOrders(); loadHandovers(); }}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            {(t("common.refresh") || "Refresh")}
          </Button>
        </div>
      </div>

      {statPending.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-rose-500/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-rose-400" />
                <span>{(t("nurse.statRunnerTitle") || "Doctor STAT Order Live Runner (Ward Desk)")}</span>
                <Badge variant="danger" className="text-[9px] animate-pulse">
                  {(t("nurse.actionRequired") || "ACTION REQUIRED")}
                </Badge>
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {statPending.length} {(t("nurse.pendingOrders") || "Pending Order(s)")}
            </span>
          </div>

          {statError && (
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[11px] flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {statError}
              <Button
                size="sm"
                variant="outline"
                onClick={loadStatOrders}
                className="ml-auto text-[10px] border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
              >
                {(t("common.retry") || "Retry")}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {statPending.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-black text-[10px] uppercase tracking-wider border border-rose-500/40">
                      {order.urgency}
                    </span>
                    <strong className="text-white font-bold">{order.patient_name}</strong>
                    <span className="text-slate-400 font-mono text-[11px]">({order.mrn})</span>
                    <span className="text-slate-400 text-[10px]">
                      • {(t("nurse.issuedAt") || "Issued")} {order.issued_at}
                    </span>
                  </div>
                  <p className="text-rose-200 font-mono font-medium">{order.instruction}</p>
                  <p className="text-slate-400 text-[10px]">
                    {(t("nurse.orderingPhysician") || "Ordering Physician")}: {order.doctor_name}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleExecuteStatOrder(order.id)}
                  isLoading={executingOrderId === order.id}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold shrink-0 gap-1.5 shadow-sm text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {(t("nurse.markAdministered") || "Mark as Administered")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!statLoading && statPending.length === 0 && (
        <div className="py-3 px-4 bg-slate-900 text-slate-400 text-xs rounded-xl flex items-center justify-between">
          <span>{(t("nurse.statEmpty") || "No active STAT emergency orders")}</span>
          <span className="text-emerald-400 text-[10px] font-bold">0 Pending</span>
        </div>
      )}

      {statLoading && statPending.length === 0 && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-900 animate-pulse h-20" />
          ))}
        </div>
      )}

      {unacknowledgedHandovers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Hand className="h-4 w-4 text-amber-700" />
              <h3 className="font-extrabold text-sm text-amber-900">
                {(t("nurse.pendingHandovers") || "Pending SBAR Shift Handovers")}
              </h3>
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800">
                {unacknowledgedHandovers.length} {(t("nurse.unacknowledged") || "Unacknowledged")}
              </Badge>
            </div>
          </div>

          {handoverError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {handoverError}
              <Button
                size="sm"
                variant="outline"
                onClick={loadHandovers}
                className="ml-auto text-[10px]"
              >
                {(t("common.retry") || "Retry")}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unacknowledgedHandovers.map((h) => (
              <Card
                key={h.handover_id}
                onClick={() => handleOpenHandover(h)}
                className="cursor-pointer hover:shadow-md transition-shadow p-3 border border-amber-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Badge variant="outline" className="text-[9px]">{h.shift}</Badge>
                    <span className="font-semibold text-slate-700">{h.ward_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{h.created_at}</span>
                </div>
                <div className="text-xs space-y-1">
                  {h.patient_name && (
                    <div className="font-bold text-slate-900">{h.patient_name}</div>
                  )}
                  <p className="text-slate-700 line-clamp-2">
                    <strong className="text-amber-800">{(t("nurse.sbarS") || "S")}:</strong> {h.situation}
                  </p>
                  <p className="text-slate-600 line-clamp-1 text-[11px]">
                    <strong>{(t("nurse.sbarR") || "R")}:</strong> {h.recommendation}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-100 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {(t("nurse.clickToReview") || "Click to review & acknowledge →")}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!handoverLoading && wards.length > 0 && unacknowledgedHandovers.length === 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Hand className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-medium text-slate-600">
              {(t("nurse.pendingHandoversEmpty") || "No pending handover acknowledgments.")}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
            ✓ All Acknowledged
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {wards.map((w) => (
            <button
              key={w.ward_id}
              onClick={() => setActiveWardId(w.ward_id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeWardId === w.ward_id
                  ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{w.ward_name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeWardId === w.ward_id ? "bg-teal-800 text-teal-100" : "bg-slate-100 text-slate-600"
                }`}
              >
                {w.occupied_beds} / {w.total_beds}
              </span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={(t("nurse.searchBeds") || "Search beds, patients, diagnosis…")}
            className="pl-9"
          />
        </div>
      </div>

      {wardsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-white animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded bg-slate-200" />
                <div className="h-5 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
              <div className="h-12 rounded bg-slate-50" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!wardsLoading && wardsError && (
        <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-rose-900">
                {(t("nurse.wardsLoadErrorTitle") || "Could not load ward census")}
              </h3>
              <p className="text-xs text-rose-700 mt-1">{wardsError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadWards}
              className="border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {(t("common.retry") || "Retry")}
            </Button>
          </div>
        </div>
      )}

      {!wardsLoading && !wardsError && wards.length === 0 && (
        <Card className="border-2 border-dashed border-teal-300 bg-teal-50/60">
          <CardContent className="p-10 text-center space-y-3">
            <Inbox className="h-12 w-12 text-teal-500 mx-auto" />
            <h3 className="font-extrabold text-slate-900">
              {(t("nurse.bedManagement") || "Bed Management")} — {(t("nurse.noWards") || "No wards configured")}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {(t("nurse.wardsEmptyCopy") || "The facility has no active wards or bed inventory yet. Configure wards in the facility admin console, then tap Refresh to pull the live census.")}
            </p>
            <Button variant="primary" size="sm" onClick={loadWards}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {(t("common.refresh") || "Refresh")}
            </Button>
          </CardContent>
        </Card>
      )}

      {!wardsLoading && !wardsError && wards.length > 0 && filteredBeds.length === 0 && activeUiBeds.length > 0 && (
        <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-10 text-center space-y-3">
            <Search className="h-12 w-12 text-slate-400 mx-auto" />
            <h3 className="font-extrabold text-slate-900">
              {(t("common.noResults") || "No matching beds")}
            </h3>
            <p className="text-sm text-slate-600">
              {(t("common.adjustSearch") || "Try adjusting your search terms or filters.")}
            </p>
          </CardContent>
        </Card>
      )}

      {!wardsLoading && !wardsError && filteredBeds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBeds.map((bed) => (
            <Card
              key={bed.id}
              onClick={() => handleBedClick(bed)}
              className={`p-4 border-2 cursor-pointer transition-all hover:scale-[1.01] ${
                bed.isOccupied
                  ? "border-teal-500 bg-white shadow-sm"
                  : "border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  {bed.number}
                </span>
                <Badge variant={bed.isOccupied ? "teal" : "outline"} className="text-[10px] font-bold">
                  {bed.isOccupied
                    ? (t("nurse.bedOccupied") || "OCCUPIED")
                    : (t("nurse.bedVacant") || "VACANT • CLICK TO ASSIGN")}
                </Badge>
              </div>

              {bed.isOccupied ? (
                <div className="space-y-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{bed.patientName}</h4>
                    <p className="text-[11px] text-slate-500">
                      {bed.gender}, {bed.age} {(t("nurse.yearsShort") || "yrs")} • {bed.ghanaCard || (t("common.na") || "N/A")}
                    </p>
                  </div>

                  {bed.diagnosis && (
                    <p className="text-xs text-slate-700 font-medium line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {bed.diagnosis}
                    </p>
                  )}

                  <div className="space-y-1 text-xs text-slate-600">
                    {bed.ivFluids && (
                      <div className="flex items-center gap-1.5 text-teal-700">
                        <Droplet className="h-3.5 w-3.5" />
                        <span className="font-medium">{bed.ivFluids}</span>
                      </div>
                    )}
                    {bed.oxygenRate && (
                      <div className="flex items-center gap-1.5 text-cyan-700">
                        <Wind className="h-3.5 w-3.5" />
                        <span className="font-medium">{bed.oxygenRate}</span>
                      </div>
                    )}
                  </div>

                  {bed.allergies && bed.allergies.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-700 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {(t("nurse.allergiesLabel") || "Allergies")}: {bed.allergies.join(", ")}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(t("nurse.dayOfStay") || "Day")} {bed.durationDays ?? 1} {(t("nurse.ofStayShort") || "of Stay")}
                    </span>
                    <span className="text-teal-700 font-semibold">
                      {(t("nurse.viewChart") || "View Chart")} →
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <Plus className="h-6 w-6 mx-auto text-slate-300" />
                  <span className="text-xs font-semibold block">
                    {(t("nurse.openBed") || "Open Bed Available")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(t("nurse.clickAdmit") || "Click to admit or transfer patient")}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {patientSummaryModalOpen && selectedBed && (
        <Modal
          isOpen={patientSummaryModalOpen}
          onClose={() => setPatientSummaryModalOpen(false)}
          title={`${(t("nurse.inpatientChart") || "Inpatient Chart")}: ${selectedBed.patientName}`}
          description={`${selectedBed.wardName || activeWard?.ward_name || ""} • ${selectedBed.number}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                {(t("nurse.ghanaCard") || "Ghana Card")}: <strong>{selectedBed.ghanaCard || (t("common.na") || "N/A")}</strong>
              </div>
              <div>
                {(t("nurse.ageGender") || "Age / Gender")}: <strong>{selectedBed.age} {(t("nurse.yearsShort") || "yrs")}, {selectedBed.gender}</strong>
              </div>
              <div>
                {(t("nurse.admitted") || "Admitted")}: <strong>{selectedBed.admittedAt || (t("common.na") || "N/A")}</strong>
              </div>
              <div>
                {(t("nurse.attending") || "Attending")}: <strong>{selectedBed.attendingPhysician || (t("common.na") || "N/A")}</strong>
              </div>
            </div>

            {selectedBed.diagnosis && (
              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  {(t("nurse.admittingDx") || "Admitting Clinical Diagnosis")}
                </span>
                <p className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-medium">
                  {selectedBed.diagnosis}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-teal-600" />
                  {(t("nurse.activeIv") || "Active IV Infusion")}
                </span>
                <p className="font-bold text-slate-800">
                  {selectedBed.ivFluids || (t("common.na") || "N/A")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-cyan-600" />
                  {(t("nurse.o2Delivery") || "Oxygen Delivery")}
                </span>
                <p className="font-bold text-slate-800">
                  {selectedBed.oxygenRate || (t("common.na") || "N/A")}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                {(t("nurse.highRiskAllergies") || "High-Risk Allergies & Warnings")}
              </span>
              <p className="text-xs font-semibold">
                {selectedBed.allergies?.join(", ") || (t("nurse.noneKnown") || "None known")}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPatientSummaryModalOpen(false)}
                className="flex-1 font-semibold"
              >
                {(t("nurse.closeSummary") || "Close Summary")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPatientSummaryModalOpen(false);
                  window.location.href = "/nurse/emar";
                }}
                className="flex-1 font-bold shadow-sm shadow-teal-700/20"
              >
                {(t("nurse.openEmar") || "Open eMAR Workstation")} →
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {assignModalOpen && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`${(t("nurse.assignBed") || "Assign Inpatient Bed")} (${activeWard?.ward_name || ""})`}
          description={(t("nurse.assignBedDesc") || "Register patient admission to the selected vacant bed.")}
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                {(t("nurse.bedAssignedOk") || "Bed Successfully Assigned!")}
              </h3>
              <p className="text-xs text-slate-500">
                {(t("nurse.patientAdmittedTo") || "Patient")}{" "}
                <strong>{assignPatientName}</strong>{" "}
                {(t("nurse.admittedBedTo") || "admitted to")} <strong>{targetBedId}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAssignSubmit} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("nurse.patientFullName") || "Patient Full Name")}
                  value={assignPatientName}
                  onChange={(e) => setAssignPatientName(e.target.value)}
                  placeholder={(t("nurse.patientNamePh") || "e.g. Yaw Osei")}
                  required
                />
                <Input
                  label={(t("nurse.ghanaCardPin") || "Ghana Card PIN")}
                  value={assignGhanaCard}
                  onChange={(e) => setAssignGhanaCard(e.target.value)}
                  placeholder={(t("nurse.ghanaCardPh") || "GHA-XXXXXXXXX-X")}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("nurse.ageLabel") || "Age")}
                  type="number"
                  value={assignAge}
                  onChange={(e) => setAssignAge(e.target.value)}
                  required
                />
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {(t("nurse.genderLabel") || "Gender")}
                  </label>
                  <select
                    value={assignGender}
                    onChange={(e) => setAssignGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Male">{(t("nurse.genderMale") || "Male")}</option>
                    <option value="Female">{(t("nurse.genderFemale") || "Female")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {(t("nurse.admittingDxLabel") || "Admitting Diagnosis")}
                </label>
                <input
                  type="text"
                  value={assignDiagnosis}
                  onChange={(e) => setAssignDiagnosis(e.target.value)}
                  placeholder={(t("nurse.dxPh") || "e.g. Community Acquired Pneumonia, Severe Dehydration")}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("nurse.o2DeliveryLabel") || "Oxygen Delivery")}
                  value={assignO2}
                  onChange={(e) => setAssignO2(e.target.value)}
                  placeholder={(t("nurse.o2Ph") || "e.g. 2L/min Nasal Cannula or Room Air")}
                />
                <Input
                  label={(t("nurse.ivFluidsLabel") || "Active IV Fluids")}
                  value={assignIV}
                  onChange={(e) => setAssignIV(e.target.value)}
                  placeholder={(t("nurse.ivPh") || "e.g. Ringers Lactate @ 100mL/hr")}
                />
              </div>

              <Input
                label={(t("nurse.attendingPhysician") || "Attending Physician")}
                value={assignDoctor}
                onChange={(e) => setAssignDoctor(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                {(t("nurse.confirmAdmission") || "Confirm Admission & Assign Bed")}
              </Button>
            </form>
          )}
        </Modal>
      )}

      {handoverModalOpen && selectedHandover && (
        <Modal
          isOpen={handoverModalOpen}
          onClose={() => setHandoverModalOpen(false)}
          title={`${(t("nurse.sbarHandover") || "SBAR Handover")} — ${selectedHandover.shift} / ${selectedHandover.ward_name}`}
          description={`${(t("nurse.outgoingNurse") || "Outgoing")}: ${selectedHandover.outgoing_nurse_name} (${selectedHandover.outgoing_nurse_pin})`}
        >
          <div className="space-y-4 py-2 text-xs">
            {selectedHandover.patient_name && (
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">{(t("nurse.patientLabel") || "Patient")}:</span>{" "}
                <strong className="text-slate-900">{selectedHandover.patient_name}</strong>
              </div>
            )}

            {[
              { k: "S", label: (t("nurse.sbarSituation") || "Situation"), v: selectedHandover.situation },
              { k: "B", label: (t("nurse.sbarBackground") || "Background"), v: selectedHandover.background },
              { k: "A", label: (t("nurse.sbarAssessment") || "Assessment"), v: selectedHandover.assessment },
              { k: "R", label: (t("nurse.sbarRecommendation") || "Recommendation"), v: selectedHandover.recommendation },
            ].map((row) => (
              <div key={row.k} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                    {row.k}
                  </span>
                  <span className="font-bold text-slate-700">{row.label}</span>
                </div>
                <p className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {row.v}
                </p>
              </div>
            ))}

            {selectedHandover.is_acknowledged ? (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-teal-800">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                <div>
                  <div className="font-bold">
                    {(t("nurse.handoverAcknowledged") || "Handover acknowledged")}
                  </div>
                  <div className="text-[11px] text-teal-700">
                    {selectedHandover.incoming_nurse_name} ({selectedHandover.incoming_nurse_pin}) •{" "}
                    {selectedHandover.acknowledged_at}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAcknowledgeHandover} className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={(t("nurse.incomingNurseName") || "Incoming Nurse Name")}
                    value={ackHandoverName}
                    onChange={(e) => setAckHandoverName(e.target.value)}
                    required
                  />
                  <Input
                    label={(t("nurse.incomingNursePin") || "Incoming Nurse PIN")}
                    value={ackHandoverPin}
                    onChange={(e) => setAckHandoverPin(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmittingHandover}
                  className="w-full font-bold"
                >
                  <ShieldAlert className="h-4 w-4 mr-1.5" />
                  {(t("nurse.acknowledgeHandover") || "Acknowledge & Accept Handover")}
                </Button>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
