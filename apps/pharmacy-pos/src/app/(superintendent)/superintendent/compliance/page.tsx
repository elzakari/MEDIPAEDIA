"use client";

import React, { useEffect, useState } from "react";
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Download,
  Printer,
  Sparkles,
  Zap,
  Lock,
  Copy,
  Check,
  Clock,
  History,
  Layers,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medipaedia/ui";
import {
  createApiClient,
  ComplianceExportBundleResponse,
  AuditPackageHistoryItem,
} from "@medipaedia/api-client";

interface AuditChecklist {
  id: string;
  category: string;
  requirement: string;
  statutoryReference: string;
  status: "PASSED" | "REVIEW_REQUIRED";
  lastVerified: string;
}

export default function SuperintendentCompliancePage() {
  const apiClient = createApiClient();

  const [isExporting, setIsExporting] = useState(false);
  const [exportBundleModalOpen, setExportBundleModalOpen] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<ComplianceExportBundleResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditPackageHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Export Request Form State
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-21");
  const [agency, setAgency] = useState("Pharmacy Council of Ghana & FDA");
  const [includeDangerousDrugs, setIncludeDangerousDrugs] = useState(true);
  const [includeColdChain, setIncludeColdChain] = useState(true);
  const [includeQuarantines, setIncludeQuarantines] = useState(true);
  const [includeAdrs, setIncludeAdrs] = useState(true);

  const [checklist] = useState<AuditChecklist[]>([
    {
      id: "ac-1",
      category: "Premises & Licensing",
      requirement: "Valid Pharmacy Council Facility License Displayed in Dispensary",
      statutoryReference: "Pharmacy Act 857, Section 38",
      status: "PASSED",
      lastVerified: "15 Aug 2026",
    },
    {
      id: "ac-2",
      category: "Practitioner Custody",
      requirement: "Superintendent Pharmacist Presence & Active PIN (PC/GAR/09124-SP)",
      statutoryReference: "Pharmacy Act 857, Section 42",
      status: "PASSED",
      lastVerified: "Today, 08:00 AM",
    },
    {
      id: "ac-3",
      category: "Prescription Integrity",
      requirement: "HMAC-SHA256 Signed Electronic Prescription Verification Prior to Dispense",
      statutoryReference: "MOH Ghana Digital Health Standards",
      status: "PASSED",
      lastVerified: "Continuous Telemetry",
    },
    {
      id: "ac-4",
      category: "Dangerous Substances",
      requirement: "Dangerous Drugs Ledger Logged with Double Pharmacist Counter-Signature",
      statutoryReference: "FDA Ghana Act 851 Part 6",
      status: "PASSED",
      lastVerified: "18 Aug 2026",
    },
    {
      id: "ac-5",
      category: "Cold Chain Storage",
      requirement: "Continuous Refrigerator Temperature Logging (2°C - 8°C)",
      statutoryReference: "GSA Food & Drugs Cold Chain Guideline",
      status: "PASSED",
      lastVerified: "Today, 09:30 AM (4.2°C)",
    },
  ]);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient.getAuditPackagesHistory();
      setAuditHistory(res);
    } catch (err) {
      console.error("Failed to load audit history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerateComplianceBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsExporting(true);
      const bundle = await apiClient.exportRegulatoryComplianceBundle({
        start_date: startDate,
        end_date: endDate,
        inspectorate_agency: agency,
        include_dangerous_drugs: includeDangerousDrugs,
        include_cold_chain: includeColdChain,
        include_quarantine_logs: includeQuarantines,
        include_adr_reports: includeAdrs,
      });

      setGeneratedBundle(bundle);
      setExportBundleModalOpen(true);
      loadHistory();
    } catch (err: any) {
      alert(err.message || "Failed to generate compliance bundle.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const passedCount = checklist.filter((c) => c.status === "PASSED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pharmacy Council &amp; FDA Ghana Statutory Compliance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Superintendent audit checklist, 1-click regulatory inspection bundle &amp; cryptographic audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1 bg-white border-slate-300"
          >
            <Printer className="h-3.5 w-3.5" /> Print Audit Sheet
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Statutory Audit Score
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">100% Passed</span>
            <span className="text-xs text-slate-400">({passedCount}/{checklist.length} Checks)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Pharmacy Council Rating
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">GRADE A (Gold)</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Cold Chain Integrity
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-700">4.2°C (Optimal)</span>
          </div>
        </Card>
      </div>

      {/* 1-Click Regulatory Compliance Package Generator */}
      <Card className="border-teal-300 bg-gradient-to-br from-teal-50/70 via-white to-slate-50 shadow-sm">
        <CardHeader className="pb-3 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-teal-950 flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-600" />
              1-Click Inspectorate Audit Bundle Generator (Ghana FDA &amp; Pharmacy Council)
            </CardTitle>
            <p className="text-xs text-slate-600">
              Aggregates dangerous drug registers, continuous cold-chain telemetry, batch quarantines, and ADR Yellow Forms into a tamper-proof signed package.
            </p>
          </div>
          <Badge variant="teal" className="text-[10px] font-bold uppercase tracking-wider">
            SHA-256 Certified
          </Badge>
        </CardHeader>

        <CardContent className="p-5">
          <form onSubmit={handleGenerateComplianceBundle} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Period Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Period End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Regulatory Inspectorate</label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  <option value="Pharmacy Council of Ghana & FDA">Pharmacy Council of Ghana &amp; FDA</option>
                  <option value="Pharmacy Council of Ghana (GHA-PC-INSP)">Pharmacy Council Inspectorate Only</option>
                  <option value="FDA Ghana Narcotics Directorate">FDA Ghana Narcotics &amp; Cold-Chain Directorate</option>
                  <option value="Greater Accra Regional Health Directorate">Regional Health Directorate</option>
                </select>
              </div>
            </div>

            {/* Scope Checkboxes */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-bold text-slate-700 mb-2">Statutory Sections to Include:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeDangerousDrugs}
                    onChange={(e) => setIncludeDangerousDrugs(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Dangerous Drugs Book</span>
                    <span className="text-[10px] text-slate-500">Act 857 Class A/B Narcotics</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeColdChain}
                    onChange={(e) => setIncludeColdChain(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Cold Chain Telemetry</span>
                    <span className="text-[10px] text-slate-500">2°C-8°C Biologicals Logs</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeQuarantines}
                    onChange={(e) => setIncludeQuarantines(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Quarantines &amp; Recalls</span>
                    <span className="text-[10px] text-slate-500">Locked lot resolutions</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeAdrs}
                    onChange={(e) => setIncludeAdrs(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">ADR Yellow Forms</span>
                    <span className="text-[10px] text-slate-500">Pharmacovigilance logs</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isExporting}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Cryptographic Package...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Generate &amp; Sign Regulatory Audit Package
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statutory Audit Package History Ledger */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-bold text-slate-900">
              Statutory Audit Package History &amp; Cryptographic Signatures
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {auditHistory.length} Certificates Issued
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Certificate Number</th>
                  <th className="py-3 px-4">Audit Period</th>
                  <th className="py-3 px-4">Inspectorate Agency</th>
                  <th className="py-3 px-4">Generated By</th>
                  <th className="py-3 px-4">SHA-256 Digest</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {auditHistory.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {pkg.certificate_number}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {pkg.date_range}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {pkg.agency}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="block font-medium">{pkg.generated_by}</span>
                      <span className="text-[10px] text-slate-400">{pkg.generated_at}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {pkg.sha256_hash.slice(0, 16)}...{pkg.sha256_hash.slice(-8)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Badge variant="teal" className="text-[10px] font-bold uppercase">
                        <Lock className="h-3 w-3 mr-1" /> Certified
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Statutory Verification Checklist
            </h3>
          </div>
          <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
            MOH &amp; PHARMACY COUNCIL CERTIFIED
          </Badge>
        </div>

        <div className="divide-y divide-slate-100">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">{item.statutoryReference}</span>
                </div>
                <p className="text-xs font-bold text-slate-900">{item.requirement}</p>
                <p className="text-[10px] text-slate-500">Last Verified: {item.lastVerified}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fully Compliant
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Generated Compliance Package Modal */}
      {exportBundleModalOpen && generatedBundle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Official Regulatory Compliance Certificate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Certificate ID: <span className="font-mono font-bold text-slate-800">{generatedBundle.certificate_id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExportBundleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Header Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Licensed Facility:</span>
                    <strong className="text-slate-800">{generatedBundle.pharmacy_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Facility License #:</span>
                    <strong className="text-slate-800 font-mono">{generatedBundle.facility_license_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Superintendent Pharmacist:</span>
                    <strong className="text-slate-800">{generatedBundle.superintendent_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Superintendent PIN:</span>
                    <strong className="text-slate-800 font-mono">{generatedBundle.superintendent_pin}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date Range Certified:</span>
                    <strong className="text-slate-800">{generatedBundle.date_range}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Certified Records:</span>
                    <strong className="text-teal-700">{generatedBundle.total_records_certified} Records</strong>
                  </div>
                </div>
              </div>

              {/* Sections Breakdown */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800">Certified Audit Sections:</p>
                <div className="space-y-2">
                  {generatedBundle.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-slate-900">{sec.section}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 ml-6">{sec.summary}</p>
                      </div>
                      <Badge variant="teal" className="text-[10px] font-bold">
                        {sec.record_count} Records
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHA-256 Tamper Proof Hash */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-3 w-3 text-teal-400" /> SHA-256 Cryptographic Tamper-Proof Stamp
                  </span>
                  <button
                    onClick={() => copyToClipboard(generatedBundle.tamper_proof_sha256_hash)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
                  >
                    {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedHash ? "Copied" : "Copy Hash"}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-teal-300 break-all select-all">
                  {generatedBundle.tamper_proof_sha256_hash}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setExportBundleModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={() => window.print()}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
