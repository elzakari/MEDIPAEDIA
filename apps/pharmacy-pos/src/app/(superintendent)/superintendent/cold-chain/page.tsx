"use client";

import React, { useState } from "react";
import {
  ThermometerSnowflake,
  Plus,
  CheckCircle2,
  AlertTriangle,
  History,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function SuperintendentColdChainPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Log Form
  const [unitName, setUnitName] = useState("Main Vaccine & Biologics Refrigerator #1");
  const [shift, setShift] = useState("MORNING");
  const [currentTemp, setCurrentTemp] = useState("4.2");
  const [minTemp, setMinTemp] = useState("3.8");
  const [maxTemp, setMaxTemp] = useState("5.1");
  const [correctiveAction, setCorrectiveAction] = useState("");

  const [logs, setLogs] = useState([
    {
      id: "CCL-2026-092",
      unit: "Main Vaccine & Biologics Refrigerator #1",
      date: "19 Aug 2026, 08:00 AM",
      shift: "MORNING",
      temp: 4.2,
      min: 3.8,
      max: 5.1,
      status: "NORMAL",
      loggedBy: "Pharm. Kojo Asante",
    },
    {
      id: "CCL-2026-091",
      unit: "Main Vaccine & Biologics Refrigerator #1",
      date: "18 Aug 2026, 05:00 PM",
      shift: "EVENING",
      temp: 4.5,
      min: 3.9,
      max: 5.4,
      status: "NORMAL",
      loggedBy: "Pharm. Kojo Asante",
    },
    {
      id: "CCL-2026-090",
      unit: "Insulin & Cold Storage Unit #2",
      date: "18 Aug 2026, 08:15 AM",
      shift: "MORNING",
      temp: 8.4,
      min: 4.0,
      max: 8.6,
      status: "WARNING_HIGH",
      loggedBy: "Pharm. Kojo Asante",
      action: "Compressor door seal wiped and adjusted. Retested at 4.8°C within 1 hour.",
    },
  ]);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tempVal = parseFloat(currentTemp) || 4.0;
    const newLog = {
      id: `CCL-2026-0${logs.length + 1}`,
      unit: unitName,
      date: "Just now",
      shift,
      temp: tempVal,
      min: parseFloat(minTemp) || 3.5,
      max: parseFloat(maxTemp) || 5.0,
      status: tempVal < 2.0 ? "WARNING_LOW" : tempVal > 8.0 ? "WARNING_HIGH" : "NORMAL",
      loggedBy: "Pharm. Kojo Asante (Superintendent)",
      action: correctiveAction,
    };
    setLogs([newLog, ...logs]);
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
            <ThermometerSnowflake className="h-6 w-6 text-teal-700" /> Cold Chain & Biologics Storage Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Mandatory continuous 2°C - 8°C refrigerator logs for vaccines, insulins, and immunoglobulins
          </p>
        </div>

        <Button
          onClick={() => setLogModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Log Shift Temperature
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Target Safe Zone</span>
          <div className="text-2xl font-black text-slate-900 font-mono">2.0°C – 8.0°C</div>
          <span className="text-xs text-teal-700 font-bold">Standard Biologicals Range</span>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-teal-800 uppercase">Current Unit #1 Reading</span>
          <div className="text-2xl font-black text-teal-950 font-mono">4.2 °C</div>
          <span className="text-xs text-teal-800 font-bold">Optimal Calibration</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Excursion Audit Compliance</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">98.5% In Range</div>
          <span className="text-xs text-emerald-700 font-bold">30-Day Mean</span>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-teal-700" /> Temperature Log Sheet
          </span>
          <Badge variant="teal" className="text-[10px] font-mono">TWICE DAILY LOGGED</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Storage Unit</th>
                <th className="p-3">Timestamp & Shift</th>
                <th className="p-3 text-center">Reading</th>
                <th className="p-3 text-center">24h Min / Max</th>
                <th className="p-3 text-center">Excursion Status</th>
                <th className="p-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900">{row.id}</td>
                  <td className="p-3 font-medium text-slate-800">{row.unit}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">
                    {row.date} • <span className="font-bold text-slate-700">{row.shift}</span>
                  </td>
                  <td className="p-3 font-mono font-black text-center text-sm text-teal-900">
                    {row.temp.toFixed(1)} °C
                  </td>
                  <td className="p-3 font-mono text-center text-slate-600 text-[11px]">
                    {row.min.toFixed(1)}° / {row.max.toFixed(1)}°
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={row.status === "NORMAL" ? "teal" : "warning"}
                      className="text-[9px]"
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600 text-[11px]">{row.loggedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Modal */}
      {logModalOpen && (
        <Modal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          title="Record Daily Fridge Temperature"
          description="Log thermometer readings to verify cold chain integrity."
        >
          <form onSubmit={handleLogSubmit} className="py-4 space-y-3 text-xs">
            {logSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Temperature Reading Recorded!</h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Cold Storage Unit</label>
                  <select
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="Main Vaccine & Biologics Refrigerator #1">Main Vaccine & Biologics Refrigerator #1</option>
                    <option value="Insulin & Cold Storage Unit #2">Insulin & Cold Storage Unit #2</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Shift</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="MORNING">Morning (08:00 AM)</option>
                      <option value="EVENING">Evening (05:00 PM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Current Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentTemp}
                      onChange={(e) => setCurrentTemp(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">24h Min Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={minTemp}
                      onChange={(e) => setMinTemp(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">24h Max Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  Save Log Entry
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
