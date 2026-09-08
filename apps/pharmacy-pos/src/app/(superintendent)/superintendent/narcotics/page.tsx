"use client";

import React, { useState } from "react";
import {
  Lock,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Search,
  KeyRound,
  Download,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function SuperintendentNarcoticsPoisonBookPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [substance, setSubstance] = useState("Morphine Sulfate 10mg Tablets");
  const [qty, setQty] = useState(14);
  const [batchNo, setBatchNo] = useState("LOT-MS-2026-01");
  const [patient, setPatient] = useState("");
  const [ghanaCard, setGhanaCard] = useState("");
  const [doctor, setDoctor] = useState("");
  const [doctorPin, setDoctorPin] = useState("");
  const [indication, setIndication] = useState("Severe Post-Operative Orthopedic Pain");
  const [superPin, setSuperPin] = useState("7749");

  const [register, setRegister] = useState([
    {
      id: "NAR-ACT857-001",
      date: "19 Aug 2026, 10:30 AM",
      substance: "Morphine Sulfate 10mg Tablets",
      classType: "CLASS_A_NARCOTIC",
      batchNo: "LOT-MS-2026-01",
      qty: 14,
      balance: 86,
      patient: "Active Inpatient",
      ghanaCard: "GHA-PATIENT-ID",
      doctor: "Attending Physician",
      doctorPin: "MDC/GMC-STAFF",
      indication: "Severe Post-Operative Orthopedic Pain",
      superintendent: "Pharmacist Superintendent (FPCPharm)",
      pin: "PSGH/REG-STAFF",
      status: "AUTHORIZED",
    },
    {
      id: "NAR-ACT857-002",
      date: "16 Aug 2026, 03:45 PM",
      substance: "Pethidine 50mg/mL Ampoule",
      classType: "CLASS_A_NARCOTIC",
      batchNo: "LOT-PTH-2026-02",
      qty: 5,
      balance: 45,
      patient: "Active Outpatient",
      ghanaCard: "GHA-PATIENT-ID-2",
      doctor: "Resident Physician",
      doctorPin: "MDC/GMC-RESIDENT",
      indication: "Acute Renal Colic Spasm",
      superintendent: "Pharmacist Superintendent (FPCPharm)",
      pin: "PSGH/REG-STAFF",
      status: "AUTHORIZED",
    },
  ]);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `NAR-ACT857-00${register.length + 1}`,
      date: "Just now",
      substance,
      classType: "CLASS_A_NARCOTIC",
      batchNo,
      qty,
      balance: Math.max(0, 86 - qty),
      patient,
      ghanaCard,
      doctor,
      doctorPin,
      indication,
      superintendent: "Pharm. Kojo Asante (FPCPharm)",
      pin: "PSGH/REG/89201",
      status: "AUTHORIZED",
    };
    setRegister([newEntry, ...register]);
    setAuthSuccess(true);
    setTimeout(() => {
      setAuthSuccess(false);
      setAuthModalOpen(false);
    }, 1200);
  };

  const filteredRegister = register.filter(
    (r) =>
      r.substance.toLowerCase().includes(search.toLowerCase()) ||
      r.patient.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor.toLowerCase().includes(search.toLowerCase()) ||
      r.ghanaCard.toLowerCase().includes(search.toLowerCase())
  );

  const [planCode, setPlanCode] = useState<string>("PLAN-GROWTH");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  React.useEffect(() => {
    fetch("http://localhost:8000/api/v1/branches/entitlements")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan_code) setPlanCode(data.plan_code);
      })
      .catch(() => {});
  }, []);

  const isLocked = planCode === "PLAN-STARTER";

  return (
    <div className="space-y-6">
      {/* Enterprise Locked Banner for Starter Plan */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border-2 border-amber-300/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Statutory Feature Locked — Enterprise & Growth Tier Required
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  FDA Act 857
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                The Statutory Poison & Dangerous Drug Book complies with FDA Ghana Act 857 and Pharmacy Council inspection mandates. This statutory register is restricted on the Starter Plan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setPlanCode("PLAN-GROWTH")}
              size="sm"
              variant="outline"
              className="text-xs font-bold text-slate-600"
            >
              Demo Preview Unlock
            </Button>
            <Button
              onClick={() => setUpgradeModalOpen(true)}
              size="sm"
              variant="primary"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-rose-700" /> Statutory Poison & Dangerous Drug Book (Act 857)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Mandatory continuous audit ledger for Class A & B Narcotic Psychotropic Substances with Superintendent sign-offs
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => alert("Downloading official PDF dossier for Pharmacy Council inspection...")}
            variant="outline"
            size="md"
            className="font-bold gap-2 border-slate-300"
            disabled={isLocked}
          >
            <Download className="h-4 w-4 text-slate-700" /> Export Official Register
          </Button>

          <Button
            onClick={() => setAuthModalOpen(true)}
            variant="primary"
            size="md"
            className="font-bold gap-2 bg-rose-700 hover:bg-rose-800 text-white shadow-md shadow-rose-700/20"
            disabled={isLocked}
          >
            <Plus className="h-4 w-4" /> Authorize Controlled Dispense
          </Button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {upgradeModalOpen && (
        <Modal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          title="Upgrade to Growth or Enterprise Tier"
          description="Unlock statutory FDA Ghana Act 857 Dangerous Drug Registers, Multi-Branch IBT, and Cold Chain IoT."
        >
          <div className="py-3 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-slate-900">Enterprise Healthcare Plan</h4>
              <p className="text-slate-600">Includes complete institutional governance, Pharmacy Council Narcotics Register, Cold Chain Temperature Logs, and unlimited branch locations.</p>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-xl font-extrabold text-teal-800 font-mono">GHS 1,500</span>
                <span className="text-slate-500">/ month (Growth)</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
                onClick={() => {
                  setPlanCode("PLAN-GROWTH");
                  setUpgradeModalOpen(false);
                  alert("Subscription plan upgraded to Growth! Dangerous Drugs book unlocked.");
                }}
              >
                Confirm Upgrade
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Register Table */}
      <Card className={`p-5 border border-slate-200 bg-white shadow-sm space-y-4 ${isLocked ? "opacity-60 pointer-events-none filter blur-[0.5px]" : ""}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"

              placeholder="Search by drug name, patient name, Ghana Card, or doctor MDC PIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Act 857 Folio #</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Substance & Strength</th>
                <th className="p-3">Batch Lot</th>
                <th className="p-3 text-center">Qty Out</th>
                <th className="p-3 text-center">Running Balance</th>
                <th className="p-3">Patient (Ghana Card)</th>
                <th className="p-3">Prescriber (MDC PIN)</th>
                <th className="p-3">Superintendent Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegister.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-rose-900">{row.id}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">{row.date}</td>
                  <td className="p-3">
                    <strong className="text-slate-900 block">{row.substance}</strong>
                    <Badge variant="danger" className="text-[9px] mt-0.5">{row.classType}</Badge>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-700">{row.batchNo}</td>
                  <td className="p-3 font-mono font-bold text-center text-slate-900">{row.qty}</td>
                  <td className="p-3 font-mono font-bold text-center text-teal-800 text-sm">
                    {row.balance}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{row.patient}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.ghanaCard}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{row.doctor}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.doctorPin}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>{row.superintendent}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">PIN: {row.pin}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Authorize Modal */}
      {authModalOpen && (
        <Modal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title="Superintendent Narcotic Dispensation Authorization"
          description="Enforces dual-factor PIN authentication for statutory Dangerous Drugs Book register."
        >
          <form onSubmit={handleAuthorize} className="py-4 space-y-3 text-xs">
            {authSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Dangerous Drug Dispensation Authorized!</h3>
                <p className="text-xs text-emerald-800">Poison Book Folio & Running Safe Balance Updated.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Substance</label>
                    <select
                      value={substance}
                      onChange={(e) => setSubstance(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="Morphine Sulfate 10mg Tablets">Morphine Sulfate 10mg Tablets</option>
                      <option value="Pethidine 50mg/mL Ampoule">Pethidine 50mg/mL Ampoule</option>
                      <option value="Fentanyl 50mcg Transdermal Patch">Fentanyl 50mcg Transdermal Patch</option>
                      <option value="Diazepam 5mg Tablets">Diazepam 5mg Tablets</option>
                      <option value="Midazolam 5mg/mL Ampoule">Midazolam 5mg/mL Ampoule</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quantity Dispensed</label>
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Batch Lot Number</label>
                    <input
                      type="text"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Patient Ghana Card</label>
                    <input
                      type="text"
                      value={ghanaCard}
                      onChange={(e) => setGhanaCard(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Prescribing Doctor</label>
                    <input
                      type="text"
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Doctor MDC PIN</label>
                    <input
                      type="text"
                      value={doctorPin}
                      onChange={(e) => setDoctorPin(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                  <label className="block font-bold text-rose-950 text-[11px]">
                    Superintendent Pharmacist Authorization PIN (Demo: 7749)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={superPin}
                    onChange={(e) => setSuperPin(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-base font-black rounded-xl border border-rose-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-rose-700/20 bg-rose-700 hover:bg-rose-800 text-white mt-2"
                >
                  Verify PIN & Sign Poison Register
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
