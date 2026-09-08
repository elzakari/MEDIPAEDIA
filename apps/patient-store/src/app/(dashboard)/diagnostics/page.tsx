"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Microscope,
  Activity,
  Loader2,
  AlertCircle,
  ExternalLink,
  Printer,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";
import type { PatientLabOrderItem, LabOrderObservationItem, LabOrderStatus } from "@medipaedia/api-client";

function statusBadgeVariant(s: LabOrderStatus | string): "teal" | "success" | "warning" | "danger" | "outline" | "cyan" {
  const up = String(s).toUpperCase();
  if (up === "ORDERED") return "warning";
  if (up === "SAMPLE_COLLECTED" || up === "SAMPLE RECEIVED") return "cyan";
  if (up === "ANALYZING" || up === "PROCESSING") return "teal";
  if (up === "COMPLETED" || up === "FINAL" || up === "REPORTED") return "success";
  if (up === "PARTIALLY_COMPLETED" || up === "PARTIAL") return "cyan";
  if (up === "CANCELLED") return "danger";
  return "outline";
}

function statusDisplay(s: LabOrderStatus | string): string {
  const up = String(s).toUpperCase();
  if (up === "ORDERED") return "ORDERED";
  if (up === "SAMPLE_COLLECTED") return "SAMPLE COLLECTED";
  if (up === "ANALYZING") return "ANALYZING";
  if (up === "COMPLETED" || up === "FINAL") return "FINAL";
  if (up === "PARTIALLY_COMPLETED") return "PARTIAL";
  if (up === "CANCELLED") return "CANCELLED";
  return String(s);
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDateOnly(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function observationsOf(r: PatientLabOrderItem): LabOrderObservationItem[] {
  if (Array.isArray(r.observations) && r.observations.length > 0) return r.observations;
  if (Array.isArray(r.results) && r.results.length > 0) return r.results;
  return [];
}

function hasAbnormal(r: PatientLabOrderItem): boolean {
  if (r.has_abnormal_flag === true) return true;
  const obs = observationsOf(r);
  return obs.some((o) => o.is_abnormal === true || (o.flag && o.flag !== "NORMAL"));
}

function normalizeCategory(cat?: string): string {
  const c = String(cat || "").toUpperCase();
  if (!c) return "LABORATORY";
  if (c.includes("IMAG") || c.includes("RAD") || c.includes("XRAY") || c.includes("SCAN") || c.includes("ULTRA") || c.includes("MRI") || c.includes("CT")) {
    return "IMAGING";
  }
  if (c.includes("LAB") || c.includes("PATHO") || c.includes("BLOOD") || c.includes("TEST")) {
    return "LABORATORY";
  }
  if (c === "LABORATORY" || c === "IMAGING" || c === "OTHER") return c;
  return c;
}

function flagBadgeVariant(f?: string): "teal" | "warning" | "danger" | "outline" {
  if (!f) return "outline";
  const up = f.toUpperCase();
  if (up === "NORMAL") return "teal";
  if (up === "HIGH" || up === "LOW" || up === "ABNORMAL" || up === "CRITICAL" || up === "POSITIVE") return "danger";
  if (up === "BORDERLINE") return "warning";
  return "outline";
}

export default function PatientDiagnosticsPage() {
  const apiClient = createApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<PatientLabOrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<PatientLabOrderItem | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getPatientLabOrders();
      setReports(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load diagnostic reports");
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesCategory = categoryFilter === "ALL" || normalizeCategory(r.category) === categoryFilter;
      const needle = search.toLowerCase();
      const hay = [
        r.test_name,
        r.investigation_code,
        r.order_id,
        r.id,
        r.facility_name,
        r.tenant_code,
        r.ordering_physician,
        r.ordering_doctor_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !needle || hay.includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [reports, categoryFilter, search]);

  const facilityOf = (r: PatientLabOrderItem): string => r.facility_name || r.tenant_code || "Medical Facility";
  const doctorOf = (r: PatientLabOrderItem): string => r.ordering_doctor_name || r.ordering_physician || "—";
  const orderedAt = (r: PatientLabOrderItem): string => formatDateOnly(r.ordered_at || r.ordered_date);
  const completedAt = (r: PatientLabOrderItem): string => formatDateTime(r.completed_at);
  const reportUrlOf = (r: PatientLabOrderItem): string | null => r.report_url || r.download_url || null;

  const handleDownload = (r: PatientLabOrderItem) => {
    const url = reportUrlOf(r);
    if (url) {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        alert(`Downloading PDF report for ${r.investigation_code || r.id}…`);
      }
    } else {
      alert(`Report PDF not yet available for ${r.investigation_code || r.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-700" /> Diagnostic Results & Lab Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Validated pathology reports, blood tests, and radiology imaging reports directly from your care team
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test name, report ID, or facility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "LABORATORY", "IMAGING"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                categoryFilter === cat
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 border border-slate-200 bg-white animate-pulse space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-4.5 w-56 bg-slate-200 rounded mt-1" />
                </div>
                <div className="h-5 w-28 bg-slate-200 rounded-full" />
              </div>
              <div className="h-9 w-full bg-slate-100 rounded" />
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="h-2.5 w-4/5 bg-slate-200 rounded" />
                <div className="h-2.5 w-4/5 bg-slate-200 rounded" />
                <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
              </div>
              <div className="h-9 w-full bg-slate-100 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-extrabold text-rose-900">Unable to load your diagnostic reports</h3>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
                <Button onClick={loadReports} variant="primary" size="sm" className="mt-3 font-bold gap-2">
                  <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center py-8 max-w-md mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
                <Microscope className="h-7 w-7 text-teal-700" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">No diagnostic results yet</h3>
              <p className="text-sm text-slate-500 mt-1.5">
                After your next lab test or imaging investigation, your results will appear here with downloadable official PDF reports and detailed analyte references.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const abnormal = hasAbnormal(report);
            return (
              <Card
                key={report.id}
                className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-teal-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-teal-800 uppercase block">
                      {report.investigation_code || report.order_id || report.id}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight mt-0.5">
                      {report.test_name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={statusBadgeVariant(report.status)} className="text-[10px] font-bold">
                      {statusDisplay(report.status)}
                    </Badge>
                    {abnormal && (
                      <Badge variant="warning" className="text-[9px] font-bold">
                        ⚠ ABNORMAL
                      </Badge>
                    )}
                  </div>
                </div>

                {observationsOf(report).length > 0 ? (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {observationsOf(report).slice(0, 3).map((o) => (
                      <span key={o.id || o.parameter_name} className="inline-block mr-2">
                        <strong className="text-slate-900">{o.parameter_name}:</strong>{" "}
                        {o.result_value ?? "—"}
                        {o.unit ? ` ${o.unit}` : ""}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Results pending — analysis in progress or no structured panel available.
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    Facility: <strong className="text-slate-800">{facilityOf(report)}</strong>
                  </div>
                  <div>
                    Ordered by: <strong className="text-slate-800">{doctorOf(report)}</strong>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    Ordered: {orderedAt(report)}
                    {report.completed_at ? ` • Final: ${completedAt(report)}` : ""}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                    className="flex-1 font-bold text-xs"
                  >
                    View Full Panel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report)}
                    disabled={!reportUrlOf(report)}
                    className={`font-bold text-xs border-slate-300 gap-1 ${
                      !reportUrlOf(report) ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Report Details Modal */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          title={`Diagnostic Investigation Panel — ${selectedReport.test_name}`}
          description={`Report: ${selectedReport.investigation_code || selectedReport.order_id || selectedReport.id} • ${facilityOf(selectedReport)}`}
        >
          <div className="py-4 space-y-4 text-xs">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant(selectedReport.status)} className="text-[10px] font-bold">
                STATUS: {statusDisplay(selectedReport.status)}
              </Badge>
              {hasAbnormal(selectedReport) && (
                <Badge variant="warning" className="text-[10px] font-bold">
                  ⚠ ABNORMAL FLAGS PRESENT
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-bold">
                {normalizeCategory(selectedReport.category)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-slate-500">Ordered by</div>
                <strong className="text-slate-900">{doctorOf(selectedReport)}</strong>
              </div>
              <div>
                <div className="text-slate-500">Facility</div>
                <strong className="text-slate-900">{facilityOf(selectedReport)}</strong>
              </div>
              <div>
                <div className="text-slate-500">Ordered</div>
                <strong className="text-slate-900">{orderedAt(selectedReport)}</strong>
              </div>
              <div>
                <div className="text-slate-500">Finalized</div>
                <strong className="text-slate-900">
                  {selectedReport.completed_at ? completedAt(selectedReport) : "—"}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <strong className="text-slate-900 font-bold block">Individual Analyte Results:</strong>
              {observationsOf(selectedReport).length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-500 text-[11px]">
                  No structured analyte panel yet. Please check back later or download the PDF report.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {observationsOf(selectedReport).map((p: LabOrderObservationItem, idx: number) => (
                    <div key={p.id || `${p.parameter_name}-${idx}`} className="p-2.5 bg-white flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <strong className="text-slate-900 block text-xs">{p.parameter_name}</strong>
                        <span className="text-[10px] text-slate-400">
                          Ref: {p.reference_range || "—"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {p.result_value ?? "—"}
                          {p.unit ? ` ${p.unit}` : ""}
                        </span>
                        <Badge variant={flagBadgeVariant(p.flag)} className="text-[9px] mt-1">
                          {p.flag || (p.is_abnormal ? "ABNORMAL" : "NORMAL")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => handleDownload(selectedReport)}
                disabled={!reportUrlOf(selectedReport)}
                className={`flex-1 font-bold gap-1.5 ${
                  !reportUrlOf(selectedReport) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <ExternalLink className="h-4 w-4" /> Download Official PDF
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedReport(null)}
                className="flex-1 font-bold"
              >
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
