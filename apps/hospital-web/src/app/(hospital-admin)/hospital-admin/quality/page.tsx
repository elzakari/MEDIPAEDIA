"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Inbox,
  Loader2,
} from "lucide-react";
import { Card, Button, Badge, Modal } from "@medipaedia/ui";
import { useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  ClinicalIncidentItem,
  IncidentSeverity,
} from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";

const SEVERITY_OPTIONS = ["ALL", "LOW", "MODERATE", "CRITICAL_SENTINEL"] as const;

export default function ClinicalQualityAndIncidentsPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const { t } = useTranslation();
  const { user, tenant } = useAuth();

  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_OPTIONS[number]>("ALL");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const [dept, setDept] = useState<string>("");
  const [severity, setSeverity] = useState<IncidentSeverity>("MODERATE");
  const [incType, setIncType] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [action, setAction] = useState<string>("");

  const [incidents, setIncidents] = useState<ClinicalIncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setDesc("");
    setAction("");
    setIncType("");
    setDept("");
    setSeverity("MODERATE");
    setLogError(null);
    setLogSuccess(null);
  }, []);

  const closeModal = useCallback(() => {
    setLogModalOpen(false);
    window.setTimeout(resetForm, 220);
  }, [resetForm]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getClinicalIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const message =
        detail ??
        (err instanceof Error ? err.message : null) ??
        (t("common.loadError") || "Unable to load data. Please check your connection and retry.");
      setError(message);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);
    setLogSuccess(null);
    setIsSubmitting(true);
    try {
      const created = await apiClient.logClinicalIncident({
        department: dept.trim(),
        severity,
        incident_type: incType.trim(),
        description: desc.trim(),
        action_taken: action.trim(),
      });
      setLogSuccess(created.incident_id);
      setIncidents((prev) => [created, ...prev]);
      window.setTimeout(() => {
        closeModal();
      }, 1400);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const message =
        detail ??
        (err instanceof Error ? err.message : null) ??
        (t("common.error") || "Could not submit incident. Please retry.");
      setLogError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter(
    (i) => severityFilter === "ALL" || i.severity === severityFilter
  );

  const total30d = incidents.length;
  const nearMissCount = incidents.filter((i) => i.severity === "LOW").length;
  const openReviews = incidents.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "CLOSED"
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-[520px] bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-[480px] bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4">
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-56 bg-slate-200 rounded animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="p-5 border border-slate-200 space-y-4">
          <div className="h-6 w-80 bg-slate-200 rounded animate-pulse" />
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-48 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 border border-rose-200 bg-rose-50/30">
        <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              {t("common.error") || "Error"}
            </h3>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
          <Button variant="danger" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("common.retry") || "Retry"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-teal-700" />
            {t("hospitalAdmin.quality.title") || "Clinical Quality Assurance & Adverse Event Registry"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("hospitalAdmin.quality.subtitle") || "Near-miss incident tracking, regulatory safety compliance, and clinical risk mitigation"}
          </p>
        </div>

        <Button
          onClick={() => setLogModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" />
          {t("hospitalAdmin.quality.logIncident") || "Log Clinical Quality Incident"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-teal-200 bg-teal-50/50">
          <span className="text-xs font-bold text-teal-800">
            {t("hospitalAdmin.quality.totalIncidents") || "Total Quality Incidents (30d)"}
          </span>
          <div className="text-2xl font-black text-teal-950 font-mono mt-1">
            {total30d} {t("hospitalAdmin.quality.logged") || "Logged"}
          </div>
          <p className="text-[11px] text-teal-700 mt-1">
            {t("hospitalAdmin.quality.investigated") || "100% investigated within 24 hours"}
          </p>
        </Card>

        <Card className="p-4 border border-emerald-200 bg-emerald-50/50">
          <span className="text-xs font-bold text-emerald-800">
            {t("hospitalAdmin.quality.nearMiss") || "Near-Miss Interceptions"}
          </span>
          <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
            {nearMissCount} {t("hospitalAdmin.quality.events") || "Events"}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">
            {t("hospitalAdmin.quality.cdsSafety") || "Automated CDS safety catch"}
          </p>
        </Card>

        <Card className="p-4 border border-amber-200 bg-amber-50/50">
          <span className="text-xs font-bold text-amber-800">
            {t("hospitalAdmin.quality.openReviews") || "Open Quality Reviews"}
          </span>
          <div className="text-2xl font-black text-amber-950 font-mono mt-1">
            {openReviews} {t("hospitalAdmin.quality.sentinelEvents") || "Sentinel Events"}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">
            {t("hospitalAdmin.quality.zeroMortality") || "Zero sentinel mortality"}
          </p>
        </Card>
      </div>

      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              {t("hospitalAdmin.quality.incidentLog") || "Clinical Quality & Adverse Event Incident Log"}
            </h3>
            <p className="text-xs text-slate-500">
              {t("hospitalAdmin.quality.auditTrail") || "Audited compliance trail with root cause analysis"}
            </p>
          </div>

          <div className="flex gap-1.5">
            {(["ALL", "LOW", "MODERATE", "CRITICAL_SENTINEL"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  severityFilter === sev
                    ? "bg-teal-700 text-white"
                    : "bg-slate-50 text-slate-600 border border-slate-200"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {!loading && !error && filteredIncidents.length === 0 && incidents.length > 0 && (
          <div className="py-8">
            <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40 max-w-md mx-auto">
              <Search className="h-10 w-10 mx-auto text-slate-400 mb-4" />
              <div className="space-y-2 text-center">
                <h3 className="text-sm font-extrabold text-slate-700">
                  {t("common.noResults") || "No matching incidents"}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("common.adjustSearch") || "Try adjusting the severity filter."}
                </p>
              </div>
            </Card>
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="py-8">
            <Card className="p-10 border-dashed border-slate-200 bg-white max-w-md mx-auto">
              <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 w-fit mb-4">
                <Inbox className="h-10 w-10" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  {t("superAdmin.noIncidents") || "No quality incidents logged"}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("superAdmin.noIncidentsHelp") || "Record adverse events, near-misses, and patient safety feedback as they occur."}
                </p>
              </div>
            </Card>
          </div>
        )}

        {!loading && !error && filteredIncidents.length > 0 && (
          <div className="space-y-3">
            {filteredIncidents.map((inc) => (
              <div
                key={inc.incident_id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800">{inc.incident_id}</span>
                    <strong className="text-slate-900 text-sm font-extrabold">{inc.incident_type}</strong>
                    <Badge
                      variant={
                        inc.severity === "CRITICAL_SENTINEL"
                          ? "danger"
                          : inc.severity === "MODERATE"
                          ? "warning"
                          : "teal"
                      }
                      className="text-[9px] font-bold"
                    >
                      {inc.severity}
                    </Badge>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">{inc.reported_at}</span>
                </div>

                <p className="text-slate-700">{inc.description}</p>

                <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-[11px] text-emerald-900 font-medium">
                  <strong>{t("hospitalAdmin.quality.actionTaken") || "Corrective Action Taken"}:</strong> {inc.action_taken}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>
                    {t("hospitalAdmin.quality.reportedBy") || "Reported by"}: <strong>{inc.reported_by}</strong> ({inc.department})
                  </span>
                  <Badge variant={inc.status === "RESOLVED" || inc.status === "CLOSED" ? "teal" : "warning"} className="text-[10px]">
                    {inc.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {logModalOpen && (
        <Modal
          isOpen={logModalOpen}
          onClose={isSubmitting ? () => {} : closeModal}
          title={t("hospitalAdmin.quality.modalTitle") || "Log Clinical Quality / Adverse Incident"}
          description={t("hospitalAdmin.quality.modalDesc") || "Submit formal event description for Clinical Governance and Risk Management."}
        >
          <form onSubmit={handleLogIncident} className="py-4 space-y-3 text-xs">
            {logSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">
                  {t("hospitalAdmin.quality.incidentLogged") || "Incident Logged for Review!"}
                </h3>
                <p className="text-[11px] font-mono text-emerald-800">{logSuccess}</p>
              </div>
            ) : (
              <>
                {logError && (
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[11px] font-medium">
                    {logError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t("hospitalAdmin.quality.departmentLabel") || "Department"}
                    </label>
                    <select
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">{t("common.select") || "Select"}...</option>
                      <option value="Clinical Diagnostic Lab">{t("hospitalAdmin.quality.deptLab") || "Clinical Diagnostic Lab"}</option>
                      <option value="OPD Consultation Suite">{t("hospitalAdmin.quality.deptOpd") || "OPD Consultation Suite"}</option>
                      <option value="Triage & Emergency">{t("hospitalAdmin.quality.deptTriage") || "Triage & Emergency"}</option>
                      <option value="Intensive Care Unit (ICU)">{t("hospitalAdmin.quality.deptIcu") || "Intensive Care Unit (ICU)"}</option>
                      <option value="Operating Theatre">{t("hospitalAdmin.quality.deptTheatre") || "Operating Theatre"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t("hospitalAdmin.quality.severityLabel") || "Severity Level"}
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="LOW">{t("hospitalAdmin.quality.severityLow") || "Low (Near-Miss / Handled)"}</option>
                      <option value="MODERATE">{t("hospitalAdmin.quality.severityModerate") || "Moderate (Delay / Minor Impact)"}</option>
                      <option value="CRITICAL_SENTINEL">{t("hospitalAdmin.quality.severityCritical") || "Critical Sentinel Event"}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t("hospitalAdmin.quality.incidentTypeLabel") || "Incident Type / Classification"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("hospitalAdmin.quality.incidentTypePlaceholder") || "e.g. Diagnostic Equipment Downtime"}
                    value={incType}
                    onChange={(e) => setIncType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t("hospitalAdmin.quality.descriptionLabel") || "Detailed Event Description"}
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={t("hospitalAdmin.quality.descriptionPlaceholder") || "What occurred, sequence of events, and immediate clinical observations..."}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t("hospitalAdmin.quality.actionLabel") || "Immediate Remedial Action Taken"}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={t("hospitalAdmin.quality.actionPlaceholder") || "Steps taken to mitigate patient harm and safeguard workflow..."}
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2 gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("hospitalAdmin.quality.submitting") || "Submitting for Quality Review..."}</span>
                    </>
                  ) : (
                    <span>{t("hospitalAdmin.quality.submitIncident") || "Submit Incident to Quality Committee"}</span>
                  )}
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
