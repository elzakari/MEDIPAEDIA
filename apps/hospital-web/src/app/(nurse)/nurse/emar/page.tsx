"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Filter,
  Pill,
  Search,
  Shield,
  ShieldCheck,
  User,
  XCircle,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";

interface ScheduledMedication {
  id: string;
  prescriptionId: string;
  patientId: string;
  patientName: string;
  bedNumber: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  scheduledTime: string;
  slot: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "STAT";
  status: "PENDING" | "GIVEN" | "HELD" | "REFUSED";
  allergies: string[];
  specialInstructions: string;
  administeredAt?: string;
  administeredBy?: string;
  notes?: string;
}

export default function NurseEMARWorkstationPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [administerModalOpen, setAdministerModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<ScheduledMedication | null>(null);

  // 5-Rights Checklist State
  const [rightPatient, setRightPatient] = useState(false);
  const [rightDrug, setRightDrug] = useState(false);
  const [rightDose, setRightDose] = useState(false);
  const [rightRoute, setRightRoute] = useState(false);
  const [rightTime, setRightTime] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"GIVEN" | "HELD" | "REFUSED">("GIVEN");
  const [reasonIfNotGiven, setReasonIfNotGiven] = useState("");
  const [nurseSignature, setNurseSignature] = useState("Grace Ofori, RN (NMC/PIN/49102-GH)");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [meds, setMeds] = useState<ScheduledMedication[]>([]);

  const openAdministerModal = (med: ScheduledMedication) => {
    setSelectedMed(med);
    setRightPatient(false);
    setRightDrug(false);
    setRightDose(false);
    setRightRoute(false);
    setRightTime(false);
    setAdminStatus("GIVEN");
    setReasonIfNotGiven("");
    setSaveSuccess(false);
    setAdministerModalOpen(true);
  };

  const handleAdministerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setMeds(
        meds.map((m) =>
          m.id === selectedMed.id
            ? {
                ...m,
                status: adminStatus,
                administeredAt: "Just now",
                administeredBy: nurseSignature,
                notes: adminStatus !== "GIVEN" ? reasonIfNotGiven : undefined,
              }
            : m
        )
      );
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setAdministerModalOpen(false);
      }, 1200);
    }, 600);
  };

  const allFiveRightsChecked = rightPatient && rightDrug && rightDose && rightRoute && rightTime;

  const filteredMeds = meds.filter((m) => {
    const matchesSearch =
      m.patientName.toLowerCase().includes(search.toLowerCase()) ||
      m.medicationName.toLowerCase().includes(search.toLowerCase()) ||
      m.bedNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = meds.filter((m) => m.status === "PENDING").length;
  const givenCount = meds.filter((m) => m.status === "GIVEN").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            eMAR Medication Administration Workstation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time scheduled dose timeline with 5-Rights electronic verification and nurse signature ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-xs px-3 py-1 font-bold">
            {pendingCount} Doses Pending
          </Badge>
          <Badge variant="teal" className="text-xs px-3 py-1 font-bold">
            {givenCount} Doses Administered
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, bed number, or medication name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "PENDING", "GIVEN", "HELD", "REFUSED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Medication Timeline Cards */}
      <div className="space-y-3">
        {filteredMeds.map((med) => (
          <Card key={med.id} className="p-4 sm:p-5 border border-slate-200 bg-white hover:border-slate-300 transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {med.bedNumber}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">{med.patientName}</h3>
                  <Badge
                    variant={
                      med.status === "GIVEN"
                        ? "teal"
                        : med.status === "PENDING"
                        ? "warning"
                        : "danger"
                    }
                    className="text-[10px] font-bold uppercase"
                  >
                    {med.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">Prescription: {med.prescriptionId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-teal-600 shrink-0" />
                  <span className="text-sm font-bold text-teal-900">{med.medicationName}</span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div>Dose: <strong>{med.dosage}</strong></div>
                  <div>Route: <strong>{med.route}</strong></div>
                  <div>Freq: <strong>{med.frequency}</strong></div>
                  <div className="flex items-center gap-1 text-amber-700 font-semibold">
                    <Clock className="h-3.5 w-3.5" /> Scheduled: {med.scheduledTime}
                  </div>
                </div>

                {med.allergies.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Allergies: {med.allergies.join(", ")}</span>
                  </div>
                )}

                {med.specialInstructions && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong>Instructions:</strong> {med.specialInstructions}
                  </p>
                )}

                {med.administeredAt && (
                  <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                    ✓ Administered at {med.administeredAt} by {med.administeredBy}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                {med.status === "PENDING" ? (
                  <Button
                    onClick={() => openAdministerModal(med)}
                    variant="primary"
                    size="sm"
                    className="font-bold gap-1.5 shadow-sm shadow-teal-700/20"
                  >
                    <FileCheck className="h-4 w-4" /> Administer Dose
                  </Button>
                ) : (
                  <Button
                    onClick={() => openAdministerModal(med)}
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold"
                  >
                    Modify / Log Note
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 5-Rights Dose Administration Modal */}
      {administerModalOpen && selectedMed && (
        <Modal
          isOpen={administerModalOpen}
          onClose={() => setAdministerModalOpen(false)}
          title={`eMAR Dose Verification: ${selectedMed.patientName}`}
          description={`Bed ${selectedMed.bedNumber} • ${selectedMed.medicationName}`}
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Dose Successfully Logged in eMAR!</h3>
              <p className="text-xs text-slate-500 font-mono">
                Status: {adminStatus} • Signed by {nurseSignature}
              </p>
            </div>
          ) : (
            <form onSubmit={handleAdministerSubmit} className="space-y-4 py-2 text-xs">
              {/* Medication Card Details */}
              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                <div className="font-bold text-teal-900 text-sm">{selectedMed.medicationName}</div>
                <div className="text-xs text-teal-800">
                  Dose: <strong>{selectedMed.dosage}</strong> | Route: <strong>{selectedMed.route}</strong> | Time: <strong>{selectedMed.scheduledTime}</strong>
                </div>
              </div>

              {/* Statutory 5-Rights Safety Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs tracking-wider uppercase">
                  Statutory 5-Rights Safety Checklist
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rightPatient}
                      onChange={(e) => setRightPatient(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>1. Right Patient ({selectedMed.patientName} • {selectedMed.bedNumber})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rightDrug}
                      onChange={(e) => setRightDrug(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>2. Right Drug ({selectedMed.medicationName})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rightDose}
                      onChange={(e) => setRightDose(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>3. Right Dose ({selectedMed.dosage})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rightRoute}
                      onChange={(e) => setRightRoute(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>4. Right Route ({selectedMed.route})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rightTime}
                      onChange={(e) => setRightTime(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>5. Right Time ({selectedMed.scheduledTime})</span>
                  </label>
                </div>
              </div>

              {/* Status Picker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administration Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminStatus("GIVEN")}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      adminStatus === "GIVEN"
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Dose Given
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatus("HELD")}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      adminStatus === "HELD"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Dose Held
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatus("REFUSED")}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      adminStatus === "REFUSED"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Patient Refused
                  </button>
                </div>
              </div>

              {adminStatus !== "GIVEN" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reason for Holding / Patient Refusal
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patient asleep, BP below threshold (SBP < 95), nausea"
                    value={reasonIfNotGiven}
                    onChange={(e) => setReasonIfNotGiven(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              )}

              {/* Nurse Digital Signature */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nurse Digital Signature & License PIN</label>
                <input
                  type="text"
                  value={nurseSignature}
                  onChange={(e) => setNurseSignature(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={adminStatus === "GIVEN" && !allFiveRightsChecked}
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                {adminStatus === "GIVEN" && !allFiveRightsChecked
                  ? "Check all 5-Rights above to Sign"
                  : `Sign & Record Dose as ${adminStatus}`}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
