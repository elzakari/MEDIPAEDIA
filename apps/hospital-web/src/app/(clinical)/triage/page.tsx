"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Thermometer,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  AlertCircle,
  Inbox,
  Search,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient, type OpdQueueItem, type VitalsInput } from "@medipaedia/api-client";

export default function NurseTriagePage() {
  const { t } = useTranslation();
  const [selectedPatient, setSelectedPatient] = useState<OpdQueueItem | null>(null);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [triageSaved, setTriageSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [triageQueue, setTriageQueue] = useState<OpdQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [vitalsForm, setVitalsForm] = useState({
    temperature: "37.5",
    systolic: "120",
    diastolic: "80",
    heartRate: "76",
    respRate: "16",
    spo2: "98.0",
    weight: "70.0",
    height: "175",
  });

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const client = createApiClient();
      const data = await client.getTriageQueue();
      setTriageQueue(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage(err?.message || (t("clinical.triage.queueLoadFailed") || "Could not load triage queue"));
      setTriageQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return triageQueue;
    const q = searchQuery.trim().toLowerCase();
    return triageQueue.filter(
      (item) =>
        (item.queue_number || "").toLowerCase().includes(q) ||
        (item.patient_name || "").toLowerCase().includes(q) ||
        (item.mrn || "").toLowerCase().includes(q) ||
        (item.ghana_card_number || "").toLowerCase().includes(q)
    );
  }, [triageQueue, searchQuery]);

  const openVitalsModal = (patient: OpdQueueItem) => {
    setSelectedPatient(patient);
    const systolic = patient.blood_pressure ? parseInt(patient.blood_pressure.split("/")[0] || "120") : 120;
    const diastolic = patient.blood_pressure ? parseInt(patient.blood_pressure.split("/")[1] || "80") : 80;
    setVitalsForm({
      temperature: patient.temperature?.toString() || "37.0",
      systolic: systolic.toString(),
      diastolic: diastolic.toString(),
      heartRate: patient.heart_rate?.toString() || "76",
      respRate: "16",
      spo2: patient.spo2?.toString() || "98.0",
      weight: "70.0",
      height: "175",
    });
    setVitalsModalOpen(true);
    setTriageSaved(false);
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const client = createApiClient();
      const payload: VitalsInput = {
        hospital_card_id: selectedPatient.hospital_card_id,
        queue_id: selectedPatient.id,
        patient_account_id: (selectedPatient as any).patient_id,
        temperature_c: parseFloat(vitalsForm.temperature),
        systolic_bp: parseInt(vitalsForm.systolic),
        diastolic_bp: parseInt(vitalsForm.diastolic),
        pulse_bpm: parseInt(vitalsForm.heartRate),
        respiratory_rate_bpm: parseInt(vitalsForm.respRate),
        spo2_percent: parseFloat(vitalsForm.spo2),
        weight_kg: parseFloat(vitalsForm.weight) || undefined,
        height_cm: parseFloat(vitalsForm.height) || undefined,
      };
      await client.recordVitals(payload);

      setTriageSaved(true);
      setTimeout(() => {
        setVitalsModalOpen(false);
        loadQueue();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || (t("clinical.triage.vitalsSaveFailed") || "Failed to record patient vitals."));
    } finally {
      setIsSaving(false);
    }
  };

  const heightM = parseFloat(vitalsForm.height) / 100 || 0;
  const weightKg = parseFloat(vitalsForm.weight) || 0;
  const computedBmi = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : "0.0";

  const isFever = parseFloat(vitalsForm.temperature) >= 38.0;
  const isHypertensive =
    parseInt(vitalsForm.systolic) >= 140 || parseInt(vitalsForm.diastolic) >= 90;
  const isHypoxic = parseFloat(vitalsForm.spo2) < 95.0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {(t("clinical.triage.title") || "Nurse OPD Triage Station & Vitals Capture")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {(t("clinical.triage.subtitle") || "Rapid patient assessment, biometric vitals stream, and critical anomaly detection.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/reception">
            <Button variant="outline" size="sm">
              {(t("clinical.triage.receptionCheckIn") || "Reception Check-In")}
            </Button>
          </Link>
          <Link href="/doctor/consultations/new">
            <Button variant="primary" size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700">
              {(t("clinical.triage.doctorConsultation") || "Doctor Consultation")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={(t("clinical.triage.searchPlaceholder") || "Search queue by ticket, patient name, MRN, or Ghana Card…")}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
        />
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                {(t("clinical.triage.boardTitle") || "Live OPD Triage Waiting Board")}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {(t("clinical.triage.boardSubtitle") || "Click \"Capture Vitals\" to record patient triage parameters")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadQueue}
                className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition"
                title={(t("clinical.triage.refresh") || "Refresh Queue")}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <Badge variant="teal" className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                {(t("clinical.triage.liveStream") || "Live Stream")}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl animate-pulse bg-slate-100 space-y-3">
                  <div className="flex gap-3 items-center">
                    <div className="h-8 w-16 rounded bg-slate-200" />
                    <div className="h-5 w-48 rounded bg-slate-200" />
                    <div className="h-4 w-24 rounded bg-slate-100 ml-auto" />
                  </div>
                  <div className="h-4 w-64 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : errorMessage && triageQueue.length === 0 ? (
            <div className="p-10">
              <div className="max-w-lg mx-auto p-6 rounded-2xl border-2 border-rose-200 bg-rose-50 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-8 w-8 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-rose-900 text-sm mb-1">
                      {(t("clinical.triage.queueErrorTitle") || "Could not load triage queue")}
                    </h4>
                    <p className="text-xs text-rose-700 break-words">{errorMessage}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadQueue}
                    className="border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    {(t("common.retry") || "Retry")}
                  </Button>
                </div>
              </div>
            </div>
          ) : !isLoading && triageQueue.length > 0 && filteredQueue.length === 0 ? (
            <div className="p-12">
              <Card className="max-w-md mx-auto border-2 border-dashed border-slate-300 bg-slate-50">
                <CardContent className="p-8 text-center space-y-3">
                  <Search className="h-12 w-12 text-slate-400 mx-auto" />
                  <h4 className="font-extrabold text-slate-900">
                    {(t("common.noResults") || "No matching patients")}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {(t("common.adjustSearch") || "Try adjusting your search terms or filters.")}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : !isLoading && triageQueue.length === 0 ? (
            <div className="p-12">
              <Card className="max-w-md mx-auto border-2 border-dashed border-teal-300 bg-teal-50/60">
                <CardContent className="p-8 text-center space-y-3">
                  <Inbox className="h-12 w-12 text-teal-500 mx-auto" />
                  <h4 className="font-extrabold text-slate-900">
                    {(t("clinical.triage.queueEmptyTitle") || "No Patients Currently in Triage Queue")}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {(t("clinical.triage.queueEmptyCopy") || "All checked-in patients have been triaged or there are no new arrivals at OPD reception.")}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link href="/reception">
                      <Button variant="primary" size="sm" className="text-xs bg-teal-600 hover:bg-teal-700">
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        {(t("clinical.triage.checkInNew") || "Check-In New Patient")}
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={loadQueue} className="text-xs">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {(t("common.refresh") || "Refresh")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-black text-teal-800 text-lg">
                        {item.queue_number}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {item.patient_name}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        {(t("clinical.triage.mrn") || "MRN")}: {item.mrn}
                      </span>
                      <Badge
                        variant={
                          (item.triage_priority || item.priority) === "EMERGENCY"
                            ? "danger"
                            : (item.triage_priority || item.priority) === "PRIORITY"
                            ? "warning"
                            : "teal"
                        }
                        className="text-[10px]"
                      >
                        {(t(`clinical.triage.priority.${item.triage_priority || item.priority || "ROUTINE"}`) || (item.triage_priority || item.priority || "ROUTINE"))}
                      </Badge>
                      <Badge
                        variant={
                          item.status === "COMPLETED"
                            ? "success"
                            : item.status === "TRIAGE"
                            ? "cyan"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {(t(`clinical.triage.status.${item.status || "QUEUED"}`) || (item.status || "QUEUED"))}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {item.ghana_card_number && <span>{item.ghana_card_number}</span>}
                      {item.ghana_card_number && <span>•</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {(t("clinical.triage.arrived") || "Arrived")}:{" "}
                        {item.checked_in_at
                          ? new Date(item.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : (t("common.na") || "N/A")}
                      </span>
                      {(item.blood_pressure || item.temperature || item.spo2) && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-teal-700 font-medium">
                            <Thermometer className="h-3.5 w-3.5" />
                            {[
                              item.blood_pressure && `${(t("clinical.triage.bpShort") || "BP")} ${item.blood_pressure}`,
                              item.temperature && `${(t("clinical.triage.tempShort") || "T")} ${item.temperature}°C`,
                              item.spo2 && `${(t("clinical.triage.spo2Short") || "SpO2")} ${item.spo2}%`,
                              item.heart_rate && `${(t("clinical.triage.hrShort") || "HR")} ${item.heart_rate}`,
                            ].filter(Boolean).join(" · ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end lg:self-center">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openVitalsModal(item)}
                      className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {(t("clinical.triage.captureVitals") || "Capture Vitals")}
                    </Button>

                    <Link
                      href={`/consultations/new?queueId=${item.id}&cardId=${item.hospital_card_id}&name=${encodeURIComponent(item.patient_name)}&mrn=${item.mrn}`}
                    >
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        {(t("clinical.triage.openWorkstation") || "Open Workstation")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <Modal
          isOpen={vitalsModalOpen}
          onClose={() => setVitalsModalOpen(false)}
          title={`${(t("clinical.triage.modalTitle") || "Record Vitals")}: ${selectedPatient.patient_name}`}
          description={`${(t("clinical.triage.mrn") || "MRN")}: ${selectedPatient.mrn} · ${(t("clinical.triage.queueTicket") || "Queue Ticket")}: ${selectedPatient.queue_number}`}
        >
          {triageSaved ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">
                {(t("clinical.triage.vitalsSavedTitle") || "Vitals Recorded & Synchronized")}
              </h3>
              <p className="text-xs text-slate-500">
                {(t("clinical.triage.vitalsSavedCopy") || "Patient is now marked ready for physician consultation.")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveVitals} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("clinical.triage.fields.temperature") || "Temperature (°C)")}
                  value={vitalsForm.temperature}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                  placeholder="37.0"
                  error={isFever ? (t("clinical.triage.alerts.fever") || "Elevated Temperature (Fever Alert)") : undefined}
                  required
                />
                <Input
                  label={(t("clinical.triage.fields.heartRate") || "Heart Rate (bpm)")}
                  value={vitalsForm.heartRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
                  placeholder="75"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("clinical.triage.fields.systolic") || "Systolic BP (mmHg)")}
                  value={vitalsForm.systolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, systolic: e.target.value })}
                  placeholder="120"
                  error={isHypertensive ? (t("clinical.triage.alerts.hypertension") || "High Blood Pressure Alert") : undefined}
                  required
                />
                <Input
                  label={(t("clinical.triage.fields.diastolic") || "Diastolic BP (mmHg)")}
                  value={vitalsForm.diastolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic: e.target.value })}
                  placeholder="80"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={(t("clinical.triage.fields.spo2") || "Oxygen Saturation SpO2 (%)")}
                  value={vitalsForm.spo2}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                  placeholder="98.0"
                  error={isHypoxic ? (t("clinical.triage.alerts.hypoxia") || "Low Oxygen Saturation (Hypoxia)") : undefined}
                  required
                />
                <Input
                  label={(t("clinical.triage.fields.respRate") || "Respiratory Rate (/min)")}
                  value={vitalsForm.respRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, respRate: e.target.value })}
                  placeholder="16"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label={(t("clinical.triage.fields.weight") || "Weight (kg)")}
                  value={vitalsForm.weight}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                  placeholder="70.0"
                />
                <Input
                  label={(t("clinical.triage.fields.height") || "Height (cm)")}
                  value={vitalsForm.height}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })}
                  placeholder="175"
                />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    {(t("clinical.triage.fields.bmi") || "BMI (Auto)")}
                  </label>
                  <div className="h-10 px-3 flex items-center bg-slate-100 rounded-lg font-mono font-bold text-slate-800 text-sm">
                    {computedBmi} kg/m²
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSaving}
                  className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
                >
                  {(t("clinical.triage.saveAndDispatch") || "Save Vitals & Dispatch to Doctor")}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
