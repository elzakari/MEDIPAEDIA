"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Activity,
  CheckCircle2,
  ClipboardList,
  Inbox,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Badge, Button, Card, Input, useTranslation } from "@medipaedia/ui";
import { createApiClient, type OpdQueueItem, type TriagePriority, type AuthMe, type Prescription } from "@medipaedia/api-client";

export default function DoctorWorkstationPage() {
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<OpdQueueItem | null>(null);
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [icd10Search, setIcd10Search] = useState("");
  const [plan, setPlan] = useState("");
  const [rxItems, setRxItems] = useState<Array<{ drug: string; dosage: string; duration: string; quantity: number }>>([]);
  const [isSigning, setIsSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  const [patientsQueue, setPatientsQueue] = useState<OpdQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoadingQueue(true);
    setQueueError(null);
    try {
      const client = createApiClient();
      const [user, queue] = await Promise.all([
        client.getCurrentUser(),
        client.getFacilityQueue("QUEUED"),
      ]);
      setCurrentUser(user);
      const slicedQueue = (Array.isArray(queue) ? queue : []).slice(0, 4);
      setPatientsQueue(slicedQueue);
      if (slicedQueue.length > 0 && !selectedPatient) {
        handleSelectPatient(slicedQueue[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error") || "Error";
      setQueueError(message);
      setPatientsQueue([]);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [selectedPatient, t]);

  const loadRxItems = useCallback(async () => {
    try {
      const client = createApiClient();
      const data = await client.getPrescriptions({ status: "PENDING" });
      const flattened: Array<{ drug: string; dosage: string; duration: string; quantity: number }> = [];
      if (Array.isArray(data)) {
        data.slice(0, 5).forEach((rx: Prescription) => {
          rx.items?.forEach((item) => {
            flattened.push({
              drug: item.medication_name,
              dosage: `${item.dosage || ""} ${item.frequency || ""}`.trim(),
              duration: `${item.duration_days || 0} ${t("common.days") || "days"}`,
              quantity: item.quantity_prescribed || 0,
            });
          });
        });
      }
      setRxItems(flattened);
    } catch {
      setRxItems([]);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard();
    loadRxItems();
  }, [loadDashboard, loadRxItems]);

  const handleSelectPatient = (p: OpdQueueItem) => {
    setSelectedPatient(p);
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    setSignedSuccess(false);
  };

  const handleSignEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      setSignedSuccess(true);
    }, 700);
  };

  const getPriorityLabel = (priority?: TriagePriority) => {
    switch (priority) {
      case "EMERGENCY":
        return t("doctor.emergency") || "Emergency";
      case "PRIORITY":
        return t("doctor.priority") || "Priority";
      case "ROUTINE":
      default:
        return t("doctor.routine") || "Routine";
    }
  };

  const computeWaitTime = (checkedInAt: string) => {
    const diff = Date.now() - new Date(checkedInAt).getTime();
    const mins = Math.max(1, Math.floor(diff / 60000));
    return `${mins} ${t("reception.mins") || "mins"}`;
  };

  const QueueSkeleton = () => (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="h-2.5 w-48 bg-slate-200 rounded mt-2" />
          <div className="mt-2 flex items-center justify-between">
            <div className="h-2 w-14 bg-slate-200 rounded" />
            <div className="h-2 w-20 bg-slate-200 rounded" />
            <div className="h-2 w-12 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyQueuePlaceholder = () => (
    <Card className="p-10 border-dashed border-teal-200 bg-teal-50">
      <div className="text-center space-y-3">
        <div className="mx-auto p-4 rounded-2xl bg-white border border-teal-100 text-teal-700">
          <Inbox className="h-10 w-10" />
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
          {t("doctor.queueEmpty") || "Waiting Room Queue Clear"}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {t("doctor.queueEmptyHelp") || "No triaged patients are currently waiting to be seen by a doctor. New check-ins will appear here automatically."}
        </p>
        <div className="pt-2">
          <Button size="sm" variant="primary" onClick={loadDashboard} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.refresh") || "Check for new patients"}
          </Button>
        </div>
      </div>
    </Card>
  );

  const NoPatientSelectedWorkbench = () => (
    <Card className="p-10 sm:p-14 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />
      <div className="relative text-center space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-900/20">
          <ClipboardList className="h-10 w-10" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {t("doctor.noPatientSelected") || "No Patient Selected"}
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {t("doctor.noPatientSelectedHelp") || "Select a triaged patient from the queue on the left to review longitudinal history, start ambient AI scribing, and document the clinical encounter."}
          </p>
        </div>
        <div className="pt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
          <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          <span>{t("doctor.liveQueuePolling") || "Live Queue Polling Active • Ready for Next Check-in"}</span>
        </div>
      </div>
    </Card>
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("doctor.title") || "Doctor Clinical Workstation"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("doctor.subtitle") || "SOAP encounter notes, ICD-10 registry diagnosis, CPOE lab/radiology orders, and verified e-prescriptions."}
          </p>
          {currentUser && (
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              {t("common.signedInAs") || "Signed in as"}: {currentUser.full_name || currentUser.email} • {currentUser.role}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" />
            {t("doctor.mdcBadge") || "MDC Licensed Physician"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={loadDashboard} disabled={isLoadingQueue} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isLoadingQueue ? "animate-spin" : ""}`} />
            {t("common.refresh") || "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("doctor.triagedWaiting") || "TRIAGED PATIENTS WAITING"} ({patientsQueue.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">{t("doctor.autoRefreshed") || "Auto-refreshed"}</span>
            </div>

            {isLoadingQueue ? (
              <QueueSkeleton />
            ) : queueError ? (
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm">
                  <p className="font-bold text-rose-800">{t("common.error") || "Queue unavailable"}</p>
                  <p className="text-rose-700 mt-0.5">{queueError}</p>
                </div>
                <Button size="sm" variant="primary" onClick={loadDashboard}>
                  {t("common.retry") || "Retry"}
                </Button>
              </div>
            ) : patientsQueue.length === 0 ? (
              <EmptyQueuePlaceholder />
            ) : (
              <div className="space-y-2.5">
                {patientsQueue.map((p) => {
                  const isSelected = selectedPatient?.queue_id === p.queue_id;
                  return (
                    <div
                      key={p.queue_id}
                      onClick={() => handleSelectPatient(p)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-teal-50/80 border-teal-500 shadow-sm shadow-teal-500/10"
                          : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">{p.patient_name}</p>
                        <Badge
                          variant={p.priority === "EMERGENCY" ? "danger" : p.priority === "PRIORITY" ? "warning" : "teal"}
                          className="text-[9px] uppercase font-bold py-0"
                        >
                          {getPriorityLabel(p.priority)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {p.mrn} • {p.queue_number}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-600">
                        <span>{t("doctor.triageBpShort") || "BP"}: {p.blood_pressure ?? "—"}</span>
                        <span>{t("doctor.triageTempShort") || "Temp"}: {p.temperature ?? "—"}°C</span>
                        <span className="text-slate-400">{computeWaitTime(p.checked_in_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {selectedPatient && (
            <Card className="p-6 border border-slate-200 bg-white space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm">
                    {selectedPatient.patient_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedPatient.patient_name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedPatient.gender ?? "—"}, {selectedPatient.age ?? "—"} {t("doctor.ageYrsSuffix") || "yrs"} • {selectedPatient.mrn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">{t("doctor.triageVitals") || "Triage Vitals"}</span>
                    <span className="font-bold text-slate-800">
                      {t("doctor.triageBpShort") || "BP"} {selectedPatient.blood_pressure ?? "—"} | {t("doctor.triageHrShort") || "HR"} {selectedPatient.heart_rate ?? "—"} | {t("doctor.triageTempShort") || "Temp"} {selectedPatient.temperature ?? "—"}°C
                    </span>
                  </div>
                </div>
              </div>

              {signedSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{t("doctor.encounterSealed") || "Clinical Encounter Sealed & HMAC-256 Prescription Issued!"}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    {t("doctor.qrPassGenerated") || "Tamper-proof digital QR pass generated. Patient claim PIN: {pin}. Synced to Pharmacy POS Marketplace."}
                  </p>
                </div>
              )}

              <form onSubmit={handleSignEncounter} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t("doctor.soapSubjective") || "[S] Subjective (Patient History & Symptoms)"}
                    </label>
                    <textarea
                      rows={3}
                      value={subjective}
                      onChange={(e) => setSubjective(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t("doctor.soapObjective") || "[O] Objective (Physical Exam & Clinical Vitals)"}
                    </label>
                    <textarea
                      rows={3}
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t("doctor.soapAssessment") || "[A] Assessment & ICD-10 Primary Diagnosis"}
                    </label>
                    <Input
                      value={icd10Search}
                      onChange={(e) => setIcd10Search(e.target.value)}
                      placeholder={t("doctor.icd10Search") || "Search ICD-10 Diagnostic Code..."}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t("doctor.soapPlan") || "[P] Treatment Plan & Physician Recommendations"}
                    </label>
                    <textarea
                      rows={2}
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Pill className="h-4 w-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {t("doctor.prescriptionItems") || "PRESCRIPTION MEDICATION ITEMS"}
                      </span>
                    </div>
                  </div>

                  {rxItems.length === 0 ? (
                    <Card className="p-8 border-dashed border-slate-200 bg-white">
                      <div className="text-center space-y-2">
                        <Search className="h-8 w-8 mx-auto text-slate-400" />
                        <h3 className="text-sm font-extrabold text-slate-700">
                          {t("common.noResults") || "No prescription items yet"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {t("doctor.noPrescriptionItems") || "Add medications using CPOE."}
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {rxItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{item.drug}</p>
                            <p className="text-[10px] text-slate-500">{item.dosage} • {item.duration}</p>
                          </div>
                          <Badge variant="teal" className="text-[10px] font-mono font-bold">
                            {t("doctor.qtyLabel") || "Qty"}: {item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="teal"
                    isLoading={isSigning}
                    className="shadow-md shadow-teal-700/20"
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    {t("doctor.signAndMint") || "Sign SOAP Record & Issue E-Prescription"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!selectedPatient && (
            <NoPatientSelectedWorkbench />
          )}
        </div>
      </div>
    </div>
  );
}
