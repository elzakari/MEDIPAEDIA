"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  User,
  Heart,
  Share2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function SuperintendentPharmacovigilancePage() {
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileSuccess, setFileSuccess] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState("PAT-GHA-71298412-1");
  const [age, setAge] = useState(34);
  const [gender, setGender] = useState("Male");
  const [drug, setDrug] = useState("Ciprofloxacin 500mg Tablets");
  const [brand, setBrand] = useState("Ciprobid (Zydus)");
  const [batchNo, setBatchNo] = useState("LOT-CIP-2026-04");
  const [reaction, setReaction] = useState("Maculopapular cutaneous rash with bilateral Achilles tendon tenderness");
  const [severity, setSeverity] = useState("MODERATE");
  const [outcome, setOutcome] = useState("RECOVERING");

  const [reports, setReports] = useState([
    {
      id: "ADR-2026-001",
      patientId: "PAT-GHA-71298412-1",
      age: 34,
      gender: "Male",
      drug: "Ciprofloxacin 500mg Tablets",
      brand: "Ciprobid (Zydus)",
      batchNo: "LOT-CIP-2026-04",
      reaction: "Maculopapular cutaneous rash with bilateral Achilles tendon tenderness",
      severity: "MODERATE",
      onsetDate: "15 Aug 2026",
      outcome: "RECOVERING",
      reportedBy: "Pharm. Kojo Asante",
      fdaSynced: true,
      createdAt: "16 Aug 2026, 11:20 AM",
    },
  ]);

  const handleFileReport = (e: React.FormEvent) => {
    e.preventDefault();
    const newR = {
      id: `ADR-2026-00${reports.length + 1}`,
      patientId,
      age,
      gender,
      drug,
      brand,
      batchNo,
      reaction,
      severity,
      onsetDate: "18 Aug 2026",
      outcome,
      reportedBy: "Pharm. Kojo Asante (Superintendent)",
      fdaSynced: true,
      createdAt: "Just now",
    };
    setReports([newR, ...reports]);
    setFileSuccess(true);
    setTimeout(() => {
      setFileSuccess(false);
      setFileModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-700" /> Pharmacovigilance & Adverse Drug Reaction (ADR) Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Statutory adverse event reporting synchronized directly with Ghana FDA Yellow Form national surveillance
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => alert("Exporting official FDA Yellow Form XML/PDF payload for National Safety Centre...")}
            variant="outline"
            size="md"
            className="font-bold gap-2 border-slate-300"
          >
            <Download className="h-4 w-4" /> Export FDA Yellow Forms
          </Button>

          <Button
            onClick={() => setFileModalOpen(true)}
            variant="primary"
            size="md"
            className="font-bold gap-2 bg-indigo-700 hover:bg-indigo-800 text-white shadow-md shadow-indigo-700/20"
          >
            <Plus className="h-4 w-4" /> File New ADR Incident
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="space-y-4">
        {reports.map((rep) => (
          <Card
            key={rep.id}
            className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-indigo-400 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-indigo-900">{rep.id}</span>
                  <Badge
                    variant={rep.severity === "MODERATE" ? "warning" : "danger"}
                    className="text-[10px] font-bold"
                  >
                    {rep.severity}
                  </Badge>
                  <Badge variant="teal" className="text-[10px] font-bold">
                    ✓ GHANA FDA SYNCED
                  </Badge>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Suspected: {rep.drug} ({rep.brand})
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Batch: <strong>{rep.batchNo}</strong> • Patient: {rep.patientId} ({rep.age}y, {rep.gender}) • Filed: {rep.createdAt}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Outcome</span>
                <strong className="text-sm font-bold text-slate-900">{rep.outcome}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <strong className="text-slate-900 font-bold block">Adverse Reaction Description:</strong>
              <p className="text-slate-700">{rep.reaction}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* File ADR Modal */}
      {fileModalOpen && (
        <Modal
          isOpen={fileModalOpen}
          onClose={() => setFileModalOpen(false)}
          title="File Adverse Drug Reaction (FDA Yellow Form)"
          description="Transmits clinical reaction report to Ghana FDA Centre for Pharmacovigilance."
        >
          <form onSubmit={handleFileReport} className="py-4 space-y-3 text-xs">
            {fileSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">ADR Report Transmitted to FDA Ghana!</h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Patient Identifier</label>
                    <input
                      type="text"
                      required
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Suspected Drug</label>
                    <input
                      type="text"
                      required
                      value={drug}
                      onChange={(e) => setDrug(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Batch Lot Number</label>
                    <input
                      type="text"
                      required
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Adverse Reaction Description</label>
                  <textarea
                    rows={3}
                    required
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="MILD">Mild (Self-limiting)</option>
                      <option value="MODERATE">Moderate (Medical attention required)</option>
                      <option value="SEVERE_LIFE_THREATENING">Severe (Hospitalization / Life-threatening)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Patient Outcome</label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="RECOVERED">Recovered Completely</option>
                      <option value="RECOVERING">Recovering / Improving</option>
                      <option value="PERSISTING">Condition Persisting</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-indigo-700/20 bg-indigo-700 hover:bg-indigo-800 text-white mt-2"
                >
                  Submit Official Yellow Form to FDA Ghana
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
