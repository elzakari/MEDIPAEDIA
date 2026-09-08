"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  CheckCircle2,
  Lock,
  Plus,
  FileCheck,
  Building2,
  Pill,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";

interface ControlledDrugEntry {
  id: string;
  drugName: string;
  schedule: "SCHEDULE_II" | "SCHEDULE_IV";
  batchNumber: string;
  quantityOnHand: number;
  lastPrescriber: string;
  lastPatient: string;
  dispensedAt: string;
  fdaRegistrationNumber: string;
}

export default function SuperintendentControlledDrugsPage() {
  const [search, setSearch] = useState("");
  const [logAuditOpen, setLogAuditOpen] = useState(false);

  const [controlledDrugs, setControlledDrugs] = useState<ControlledDrugEntry[]>([
    {
      id: "cd-1",
      drugName: "Morphine Sulfate 10mg/mL Injection",
      schedule: "SCHEDULE_II",
      batchNumber: "MPH-2026-081",
      quantityOnHand: 14,
      lastPrescriber: "Resident Physician (MDC/GMC-RESIDENT)",
      lastPatient: "Active Inpatient 1 (GHA-PATIENT-ID-1)",
      dispensedAt: "18 Aug 2026",
      fdaRegistrationNumber: "FDA/SD.24-0912",
    },
    {
      id: "cd-2",
      drugName: "Diazepam 5mg Tablets",
      schedule: "SCHEDULE_IV",
      batchNumber: "DZP-2026-114",
      quantityOnHand: 48,
      lastPrescriber: "Attending Physician (MDC/GMC-STAFF)",
      lastPatient: "Active Outpatient 1 (GHA-PATIENT-ID-2)",
      dispensedAt: "17 Aug 2026",
      fdaRegistrationNumber: "FDA/SD.22-4410",
    },
    {
      id: "cd-3",
      drugName: "Tramadol Hydrochloride 50mg Capsules",
      schedule: "SCHEDULE_IV",
      batchNumber: "TRM-2026-301",
      quantityOnHand: 80,
      lastPrescriber: "Attending Physician (MDC/GMC-STAFF)",
      lastPatient: "Active Inpatient 2 (GHA-PATIENT-ID-3)",
      dispensedAt: "15 Aug 2026",
      fdaRegistrationNumber: "FDA/SD.25-1029",
    },
  ]);

  const filtered = controlledDrugs.filter(
    (d) =>
      d.drugName.toLowerCase().includes(search.toLowerCase()) ||
      d.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.lastPrescriber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dangerous & Controlled Substances Register (FDA Ghana)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Statutory narcotics & psychotropic stock register under Superintendent Pharmacist custody
          </p>
        </div>
        <Badge variant="teal" className="text-xs bg-amber-100 text-amber-900 border-amber-300">
          <Lock className="h-3.5 w-3.5 mr-1" />
          Superintendent Access Only
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Controlled Stock Lines
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{controlledDrugs.length} Products</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Schedule II Narcotics
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">14 Units in Vault</span>
            <span className="text-xs text-rose-600 font-bold">(Strict Physical Key)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            FDA Audit Compliance Status
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">100% Reconciled</span>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search controlled substance, batch, or doctor..."
              className="text-xs pl-9"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <span className="text-xs text-slate-500 font-medium">FDA Ghana Act 851 Part 6 Compliant</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Substance Name & FDA Reg</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Batch #</th>
                <th className="px-4 py-3">Vault Units</th>
                <th className="px-4 py-3">Last Prescriber & Patient</th>
                <th className="px-4 py-3 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((drug) => (
                <tr key={drug.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{drug.drugName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{drug.fdaRegistrationNumber}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant={drug.schedule === "SCHEDULE_II" ? "danger" : "warning"}
                      className="text-[9px] uppercase font-bold py-0"
                    >
                      {drug.schedule.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700">
                    {drug.batchNumber}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-black text-slate-900 text-sm">
                    {drug.quantityOnHand} Units
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{drug.lastPrescriber}</p>
                    <p className="text-[10px] text-slate-400">{drug.lastPatient} • {drug.dispensedAt}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Logged
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
