"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Droplet,
  Filter,
  Plus,
  Scale,
  Search,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";

interface FluidEntry {
  id: string;
  timestamp: string;
  intakeType?: string;
  intakeVolumeMl: number;
  intakeSolutionName?: string;
  outputType?: string;
  outputVolumeMl: number;
  nurseName: string;
  notes?: string;
}

export default function NurseFluidBalancePage() {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"INTAKE" | "OUTPUT">("INTAKE");

  // Form State
  const [intakeType, setIntakeType] = useState<string>("IV_CRYSTALLOID");
  const [intakeVolume, setIntakeVolume] = useState("500");
  const [intakeSolution, setIntakeSolution] = useState("Ringers Lactate 500mL");
  const [outputType, setOutputType] = useState<string>("URINE");
  const [outputVolume, setOutputVolume] = useState("350");
  const [nurseNotes, setNurseNotes] = useState("");
  const [nurseName, setNurseName] = useState("Grace Ofori, RN (NMC/PIN/49102-GH)");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [entries, setEntries] = useState<FluidEntry[]>([]);

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const isIntake = entryMode === "INTAKE";
      const newEntry: FluidEntry = {
        id: `fl-${Date.now().toString().slice(-4)}`,
        timestamp: "Just now",
        intakeType: isIntake ? intakeType : undefined,
        intakeVolumeMl: isIntake ? parseFloat(intakeVolume) || 0 : 0,
        intakeSolutionName: isIntake ? intakeSolution : undefined,
        outputType: !isIntake ? outputType : undefined,
        outputVolumeMl: !isIntake ? parseFloat(outputVolume) || 0 : 0,
        nurseName,
        notes: nurseNotes,
      };

      setEntries([newEntry, ...entries]);
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setRecordModalOpen(false);
        setNurseNotes("");
      }, 1200);
    }, 600);
  };

  const totalIntake = entries.reduce((sum, e) => sum + e.intakeVolumeMl, 0);
  const totalOutput = entries.reduce((sum, e) => sum + e.outputVolumeMl, 0);
  const netBalance = Math.round(totalIntake - totalOutput);
  const isPositive = netBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            24-Hour Inpatient Fluid Balance Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time Intake (IV crystalloid/colloid/oral) vs Output (urine/drains) with automated Net Balance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSaveSuccess(false);
              setRecordModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="font-bold gap-1.5 shadow-sm shadow-teal-700/20"
          >
            <Plus className="h-4 w-4" /> Record Intake / Output
          </Button>
        </div>
      </div>

      {/* Patient Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
            <User className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Inpatient Chart
            </span>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="font-extrabold text-sm text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Select an inpatient…</option>
            </select>
          </div>
        </div>
        <Badge variant="teal" className="text-xs font-bold self-start sm:self-center">
          Catheterized • Target &gt; 0.5 mL/kg/hr
        </Badge>
      </div>

      {/* 24-Hour Balance Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Intake */}
        <Card className="p-5 border border-teal-200 bg-teal-50/50 space-y-1">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total 24h Intake</span>
            <ArrowDownRight className="h-5 w-5" />
          </div>
          <div className="text-2xl font-black text-teal-950">+{totalIntake} mL</div>
          <p className="text-[11px] text-teal-700 font-medium">IV Crystalloid + Oral Fluids</p>
        </Card>

        {/* Total Output */}
        <Card className="p-5 border border-amber-200 bg-amber-50/50 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total 24h Output</span>
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div className="text-2xl font-black text-amber-950">-{totalOutput} mL</div>
          <p className="text-[11px] text-amber-700 font-medium">Catheter Urine + Insensible</p>
        </Card>

        {/* Net Fluid Balance */}
        <Card
          className={`p-5 border space-y-1 ${
            isPositive
              ? "border-emerald-300 bg-emerald-50/70"
              : "border-rose-300 bg-rose-50/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Net 24h Fluid Status
            </span>
            <Badge variant={isPositive ? "teal" : "danger"} className="text-[10px] font-bold">
              {isPositive ? "POSITIVE BALANCE" : "NEGATIVE BALANCE"}
            </Badge>
          </div>
          <div className={`text-2xl font-black ${isPositive ? "text-emerald-900" : "text-rose-900"}`}>
            {isPositive ? `+${netBalance}` : `${netBalance}`} mL
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            {isPositive ? "Mild Positive (Expected during rehydration phase)" : "Negative (Review diuretic therapy)"}
          </p>
        </Card>
      </div>

      {/* Fluid Transaction Ledger Table */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900">
            Sequential Fluid Intake & Output Ledger
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">{entries.length} logged entries</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Solution / Source</th>
                  <th className="p-3 text-right">Intake (mL)</th>
                  <th className="p-3 text-right">Output (mL)</th>
                  <th className="p-3">Logged By</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-semibold text-slate-600">{entry.timestamp}</td>
                    <td className="p-3">
                      {entry.intakeVolumeMl > 0 ? (
                        <Badge variant="teal" className="text-[9px] uppercase font-bold">
                          {entry.intakeType}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[9px] uppercase font-bold">
                          {entry.outputType}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {entry.intakeSolutionName || entry.outputType || "—"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-teal-700">
                      {entry.intakeVolumeMl > 0 ? `+${entry.intakeVolumeMl}` : "—"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-700">
                      {entry.outputVolumeMl > 0 ? `-${entry.outputVolumeMl}` : "—"}
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{entry.nurseName}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{entry.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Fluid Modal */}
      {recordModalOpen && (
        <Modal
          isOpen={recordModalOpen}
          onClose={() => setRecordModalOpen(false)}
          title={`Log Fluid Balance: ${selectedPatient}`}
          description="Record clinical fluid intake or output volume."
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Fluid Entry Recorded!</h3>
              <p className="text-xs text-slate-500">
                24-Hour Net Balance updated to <strong>{netBalance} mL</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRecordSubmit} className="space-y-4 py-2 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMode("INTAKE")}
                  className={`py-2.5 rounded-xl font-bold text-xs border ${
                    entryMode === "INTAKE"
                      ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Fluid Intake (IV / Oral)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("OUTPUT")}
                  className={`py-2.5 rounded-xl font-bold text-xs border ${
                    entryMode === "OUTPUT"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Fluid Output (Urine / Drain)
                </button>
              </div>

              {entryMode === "INTAKE" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Intake Category</label>
                      <select
                        value={intakeType}
                        onChange={(e) => setIntakeType(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="IV_CRYSTALLOID">IV Crystalloid (Saline / RL / D5W)</option>
                        <option value="IV_COLLOID">IV Colloid (Voluven / Albumin)</option>
                        <option value="BLOOD_PRODUCT">Blood Product (PRBC / FFP / Platelets)</option>
                        <option value="ORAL">Oral Sips / Water / Juice</option>
                        <option value="ENTERAL">Enteral / NG Tube Feeds</option>
                      </select>
                    </div>
                    <Input
                      label="Volume (mL)"
                      type="number"
                      value={intakeVolume}
                      onChange={(e) => setIntakeVolume(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Solution / Fluid Name"
                    value={intakeSolution}
                    onChange={(e) => setIntakeSolution(e.target.value)}
                    placeholder="e.g. Ringers Lactate 500mL or Water"
                    required
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Output Category</label>
                      <select
                        value={outputType}
                        onChange={(e) => setOutputType(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="URINE">Catheter / Voided Urine</option>
                        <option value="DRAIN">Surgical Wound Drain</option>
                        <option value="VOMIT">Vomitus / Emesis</option>
                        <option value="NG_TUBE">NG Tube Aspirate</option>
                        <option value="STOOL">Stool / Diarrhea</option>
                      </select>
                    </div>
                    <Input
                      label="Volume (mL)"
                      type="number"
                      value={outputVolume}
                      onChange={(e) => setOutputVolume(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Observations</label>
                <input
                  type="text"
                  placeholder="e.g. Clear amber urine, no clots, patient hydrated"
                  value={nurseNotes}
                  onChange={(e) => setNurseNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Input
                label="Nurse Signature & License PIN"
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                Log Fluid Entry & Update Ledger
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
