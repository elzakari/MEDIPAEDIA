"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Bed,
  DollarSign,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  FileText,
  UserPlus,
  Stethoscope,
  Scissors,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medipaedia/ui";
import { useAuth } from "@/context/AuthContext";

export default function HospitalAdminCommandCenterPage() {
  const { tenant } = useAuth();
  const facilityName = tenant?.name || "Healthcare Facility";
  const currency = tenant?.currency || "GHS";

  const kpis = [
    {
      label: "Today's Patient Footfall",
      value: "0 Patients",
      detail: "OPD + Emergency Admissions",
      icon: Users,
      color: "text-teal-700",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
    {
      label: "Inpatient Bed Occupancy",
      value: "0.0%",
      detail: "0 / 0 Total Beds Occupied",
      icon: Bed,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      label: "Active On-Duty Staff",
      value: "0 Clinicians",
      detail: "0 Doctors, 0 Nurses, 0 Cashiers",
      icon: Stethoscope,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      label: "Today's Billed Revenue",
      value: `${currency} 0.00`,
      detail: "Cash + MoMo + NHIS Receivable",
      icon: DollarSign,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
  ];

  const pipelineStages = [
    { stage: "Reception & Check-in", count: 0, dwellTime: "—", color: "bg-blue-500", text: "text-blue-700" },
    { stage: "Nurse Triage & PoC", count: 0, dwellTime: "—", color: "bg-teal-500", text: "text-teal-700" },
    { stage: "Doctor Consultation", count: 0, dwellTime: "—", color: "bg-indigo-500", text: "text-indigo-700" },
    { stage: "Diagnostics & Pharmacy", count: 0, dwellTime: "—", color: "bg-amber-500", text: "text-amber-700" },
    { stage: "Discharged / Inpatient Bed", count: 0, dwellTime: "Pending Encounters", color: "bg-emerald-500", text: "text-emerald-700" },
  ];

  const wardsSummary: { name: string; beds: string; pct: number; status: string }[] = [];

  const theatresSummary: { name: string; type: string; status: string; procedure: string | null; surgeon: string | null; nextTime: string }[] = [];

  const activeCensus = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-700" /> Hospital Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {facilityName} Facility Governance, Real-Time Throughput Pipeline & Workforce Readiness
          </p>
        </div>


        <div className="flex items-center gap-2">
          <Link href="/hospital-admin/staff">
            <Button variant="primary" size="sm" className="font-bold gap-1.5 shadow-md shadow-teal-700/20">
              <UserPlus className="h-4 w-4" /> Provision Practitioner
            </Button>
          </Link>
          <Link href="/hospital-admin/roster">
            <Button variant="outline" size="sm" className="font-bold gap-1.5 border-slate-300">
              <Calendar className="h-4 w-4" /> Shift Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational KPI Grid — Horizontal snap carousel on < md, grid on md+ */}
      <div className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0 md:gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className={`min-w-[75vw] sm:min-w-[280px] md:min-w-0 snap-start p-4 border bg-white shadow-sm ${kpi.borderColor}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{kpi.detail}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Live Patient Flow Pipeline */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" /> Live Hospital Patient Flow Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Real-time patient census tracked through clinical encounter stages
            </p>
          </div>
          <Badge variant="teal" className="text-xs font-bold font-mono">
            Active Census: {activeCensus} in Facility
          </Badge>
        </div>

        <div className="overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory">
          <div className="flex min-w-[720px] gap-3 md:flex-nowrap">
            {pipelineStages.map((stage, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative md:flex-1 md:min-w-0 min-w-[160px] max-w-[180px] md:max-w-none snap-start shrink-0 md:shrink"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="truncate">{stage.stage}</span>
                  <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {stage.count}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {stage.dwellTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Capacity & Theatres 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ward Bed Capacities (Col span 6) */}
        <Card className="lg:col-span-6 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Bed className="h-4 w-4 text-teal-700" /> Clinical Wards & Bed Census
              </h3>
              <p className="text-xs text-slate-500">Live bed utilization across inpatient units</p>
            </div>
            <Link href="/hospital-admin/departments">
              <Button variant="outline" size="sm" className="font-bold text-xs border-slate-300">
                Manage Beds
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {wardsSummary.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-sm font-bold text-slate-700">No wards configured yet</p>
                <p className="text-xs text-slate-500 mt-1">Define clinical departments and bed capacity in the facility setup workflow.</p>
              </div>
            ) : (
              wardsSummary.map((w, idx) => (
                <div key={idx} className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{w.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{w.beds}</span>
                      <Badge variant={w.pct > 80 ? "danger" : "teal"} className="text-[10px]">
                        {w.pct}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${w.pct > 80 ? "bg-rose-500" : "bg-teal-600"}`}
                      style={{ width: `${w.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Operating Theatres Status (Col span 6) */}
        <Card className="lg:col-span-6 p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-teal-700" /> Operating Theatres Telemetry
              </h3>
              <p className="text-xs text-slate-500">Surgical suite readiness & procedure tracking</p>
            </div>
            <Badge variant="teal" className="text-xs font-bold font-mono">
              {theatresSummary.length} Suites
            </Badge>
          </div>

          <div className="space-y-3">
            {theatresSummary.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-sm font-bold text-slate-700">No operating theatres configured</p>
                <p className="text-xs text-slate-500 mt-1">Surgical suites and statuses will appear once configured.</p>
              </div>
            ) : (
              theatresSummary.map((th, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-extrabold">{th.name}</strong>
                    <Badge
                      variant={
                        th.status === "AVAILABLE"
                          ? "teal"
                          : th.status === "IN_USE"
                          ? "danger"
                          : "warning"
                      }
                      className="text-[10px] font-bold"
                    >
                      {th.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Type: {th.type} • Surgeon: <strong>{th.surgeon}</strong>
                  </div>
                  {th.procedure && (
                    <div className="text-[11px] text-teal-900 font-semibold">
                      Procedure: {th.procedure}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    Next Available: {th.nextTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
