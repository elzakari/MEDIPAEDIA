"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Search,
  KeyRound,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function ControlledDrugsRegisterPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Form state
  const [drugName, setDrugName] = useState("Morphine Sulfate 10mg Tablets");
  const [qty, setQty] = useState(14);
  const [batchNo, setBatchNo] = useState("LOT-MS-2026-01");
  const [patientName, setPatientName] = useState("");
  const [patientCard, setPatientCard] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorPin, setDoctorPin] = useState("");
  const [indication, setIndication] = useState("Severe Post-Surgical Pain Management");
  const [superPin, setSuperPin] = useState("7749");

  const [register, setRegister] = useState([
    {
      id: "DDB-2026-001",
      date: "19 Aug 2026, 10:30 AM",
      drugName: "Morphine Sulfate 10mg Tablets",
      classType: "CLASS_A_POM",
      qty: 14,
      batchNo: "LOT-MS-2026-01",
      balance: 86,
      patient: "Active Inpatient",
      ghanaCard: "GHA-PATIENT-ID",
      doctor: "Attending Physician",
      doctorPin: "MDC/GMC-STAFF",
      superintendent: "Pharmacist on Duty (PSGH/REG)",
      status: "AUDITED_FDA_GH",
    },
    {
      id: "DDB-2026-002",
      date: "16 Aug 2026, 03:45 PM",
      drugName: "Diazepam 5mg Tablets",
      classType: "CLASS_B_POM",
      qty: 10,
      batchNo: "LOT-DZ-2026-04",
      balance: 140,
      patient: "Active Outpatient",
      ghanaCard: "GHA-PATIENT-ID-2",
      doctor: "Resident Physician",
      doctorPin: "MDC/GMC-RESIDENT",
      superintendent: "Pharmacist on Duty (PSGH/REG)",
      status: "AUDITED_FDA_GH",
    },
  ]);

  const handleLogControlledDrug = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `DDB-2026-00${register.length + 1}`,
      date: "Just now",
      drugName,
      classType: "CLASS_A_POM",
      qty,
      batchNo,
      balance: Math.max(0, 100 - qty),
      patient: patientName,
      ghanaCard: patientCard,
      doctor: doctorName,
      doctorPin,
      superintendent: "Pharm. Kojo Asante (PSGH/REG/89201)",
      status: "AUDITED_FDA_GH",
    };
    setRegister([newEntry, ...register]);
    setLogSuccess(true);
    setTimeout(() => {
      setLogSuccess(false);
      setLogModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-700" /> Controlled Substances Registry (Dangerous Drug Book)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Official statutory register for Class A & B Narcotic Psychotropic Substances (FDA Ghana & Pharmacy Council)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => alert("Exporting official Dangerous Drug Book (DDB) for Pharmacy Council audit...")}
            variant="outline"
            size="md"
            className="font-bold gap-2 border-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Export DDB Audit Log
          </Button>

          <Button
            onClick={() => setLogModalOpen(true)}
            variant="primary"
            size="md"
            className="font-bold gap-2 bg-rose-700 hover:bg-rose-800 text-white shadow-md shadow-rose-700/20"
          >
            <Plus className="h-4 w-4" /> Log Controlled Dispensation
          </Button>
        </div>
      </div>

      {/* Registry Table */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-700" /> Statutory Safe Register ({register.length} Entries)
          </span>
          <Badge variant="danger" className="text-[10px] font-bold font-mono">
            STRICT POISONS REGISTER
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">DDB Entry #</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Drug & Strength</th>
                <th className="p-3">Batch #</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-center">Safe Balance</th>
                <th className="p-3">Patient (Ghana Card)</th>
                <th className="p-3">Doctor (MDC PIN)</th>
                <th className="p-3">Superintendent Sign-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {register.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-rose-900">{row.id}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">{row.date}</td>
                  <td className="p-3">
                    <strong className="text-slate-900 block">{row.drugName}</strong>
                    <Badge variant="danger" className="text-[9px] mt-0.5">{row.classType}</Badge>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-700">{row.batchNo}</td>
                  <td className="p-3 font-mono font-bold text-center text-slate-900">{row.qty}</td>
                  <td className="p-3 font-mono font-bold text-center text-teal-800">{row.balance}</td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{row.patient}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.ghanaCard}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{row.doctor}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.doctorPin}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-700 text-[11px] block">{row.superintendent}</span>
                    <Badge variant="teal" className="text-[9px]">✓ VERIFIED</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Controlled Drug Modal */}
      {logModalOpen && (
        <Modal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          title="Log Controlled Dangerous Substance Dispensation"
          description="Requires Superintendent Pharmacist sign-off PIN for statutory Class A / POM record."
        >
          <form onSubmit={handleLogControlledDrug} className="py-4 space-y-3 text-xs">
            {logSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Controlled Drug Dispensation Logged!</h3>
                <p className="text-xs text-emerald-800">Dangerous Drug Book (DDB) Ledger Updated.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Controlled Substance</label>
                    <select
                      value={drugName}
                      onChange={(e) => setDrugName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="Morphine Sulfate 10mg Tablets">Morphine Sulfate 10mg Tablets</option>
                      <option value="Pethidine 50mg/mL Ampoule">Pethidine 50mg/mL Ampoule</option>
                      <option value="Fentanyl 50mcg Patch">Fentanyl 50mcg Patch</option>
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
                    <label className="block font-bold text-slate-800 mb-1">Batch Number</label>
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
                      value={patientCard}
                      onChange={(e) => setPatientCard(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Prescribing Doctor</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
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

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Clinical Indication</label>
                  <input
                    type="text"
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <label className="block font-bold text-amber-950 text-[11px]">
                    Superintendent Pharmacist Sign-Off PIN (Demo: 7749)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={superPin}
                    onChange={(e) => setSuperPin(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-base font-black rounded-xl border border-amber-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-rose-700/20 bg-rose-700 hover:bg-rose-800 text-white mt-2"
                >
                  Authorize & Sign Statutory Safe Entry
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
