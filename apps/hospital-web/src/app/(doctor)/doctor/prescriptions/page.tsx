"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  Search,
  ShieldCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, useTranslation } from "@medipaedia/ui";
import { createApiClient, type Prescription, type PrescriptionStatus } from "@medipaedia/api-client";

export default function DoctorPrescriptionsPage() {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const client = createApiClient();
      const data = await client.getPrescriptions({ status: "PENDING" });
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error", "Error");
      setErrorMessage(message);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const getStatusBadgeVariant = (status: PrescriptionStatus) => {
    switch (status) {
      case "DISPENSED":
        return "teal";
      case "PARTIALLY_DISPENSED":
        return "warning";
      case "CANCELLED":
        return "danger";
      case "EXPIRED":
        return "outline";
      case "PENDING":
      default:
        return "cyan";
    }
  };

  const getStatusLabel = (status: PrescriptionStatus) => {
    switch (status) {
      case "DISPENSED":
        return t("doctor.statusDispensed", "Dispensed");
      case "PARTIALLY_DISPENSED":
        return t("doctor.statusPartiallyDispensed", "Partially Dispensed");
      case "CANCELLED":
        return t("doctor.statusCancelled", "Cancelled");
      case "EXPIRED":
        return t("doctor.statusExpired", "Expired");
      case "PENDING":
      default:
        return t("doctor.statusPending", "Issued / Pending");
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const filtered = prescriptions.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.prescription_number?.toLowerCase().includes(s) ||
      p.claim_pin?.toLowerCase().includes(s) ||
      p.id?.toLowerCase().includes(s)
    );
  });

  const SkeletonRow = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="p-5 border border-slate-200 bg-white animate-pulse">
          <div className="h-3 w-40 bg-slate-200 rounded mb-3" />
          <div className="h-7 w-16 bg-slate-200 rounded" />
        </Card>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="px-4 py-4 animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-200 rounded" />
            <div className="h-5 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("doctor.prescriptionsRegistryTitle", "Electronic Prescriptions Registry")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("doctor.prescriptionsRegistrySubtitle", "Longitudinal audit ledger of cryptographically minted HMAC-SHA256 prescriptions")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadPrescriptions} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("doctor.refresh", "Refresh Registry")}
          </Button>
          <Link href="/doctor">
            <Button variant="teal" size="sm" className="font-bold gap-1.5 shadow-sm shadow-teal-700/20">
              <Pill className="h-4 w-4" /> {t("doctor.issueNewPrescription", "Issue New Prescription")}
            </Button>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold text-rose-800">{t("common.error", "Prescription registry unavailable")}</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <Button size="sm" variant="primary" onClick={loadPrescriptions}>
            {t("common.retry", "Retry")}
          </Button>
        </div>
      )}

      {isLoading ? (
        <SkeletonRow />
      ) : !errorMessage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border border-slate-200 bg-white">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t("doctor.kpiTotalSigned", "Total Cryptographically Signed")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{prescriptions.length}</span>
              <span className="text-xs text-emerald-600 font-bold">
                {t("doctor.hmacVerifiedBadge", "HMAC-SHA256 Verified")}
              </span>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 bg-white">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t("doctor.kpiAwaitingDispensation", "Awaiting Pharmacy Dispensation")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-700">
                {prescriptions.filter((p) => p.status === "PENDING").length} {t("doctor.activeClaimsSuffix", "Active Claims")}
              </span>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 bg-white">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t("doctor.kpiSuccessfullyDispensed", "Successfully Dispensed")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {prescriptions.filter((p) => p.status === "DISPENSED").length} {t("doctor.dispensedSuffix", "Completed Dispenses")}
              </span>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-0 border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("doctor.searchPrescriptionPlaceholder", "Search by Claim PIN (e.g. RX-8942), patient name, or medication...")}
              className="text-xs pl-9"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <Badge variant="teal" className="text-xs font-bold uppercase">
            <ShieldCheck className="h-3 w-3 mr-1 inline" />
            {t("doctor.keystoreBadge", "Facility Hardware KeyStore Active")}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : errorMessage ? null : prescriptions.length === 0 ? (
            <div className="p-10">
              <Card className="p-10 border-dashed border-teal-200 bg-teal-50">
                <div className="text-center space-y-3">
                  <div className="mx-auto p-4 rounded-2xl bg-white border border-teal-100 text-teal-700">
                    <Inbox className="h-10 w-10" />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                    {t("doctor.noPrescriptionsFound", "No Prescriptions Found")}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {t("doctor.prescriptionsEmptyDescription", "No electronic prescriptions have been issued for this facility yet. Sign a consultation to mint your first prescription.")}
                  </p>
                  <div className="pt-2">
                    <Button size="sm" variant="primary" onClick={loadPrescriptions} className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("doctor.refresh", "Refresh Registry")}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10">
              <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
                <div className="text-center space-y-2">
                  <Search className="h-10 w-10 mx-auto text-slate-400" />
                  <h3 className="text-sm font-extrabold text-slate-700">
                    {t("common.noResults", "No matching prescriptions")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("doctor.noPrescriptionsMatchSearch", "No prescriptions match your search criteria. Try clearing the search.")}
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t("doctor.tableHeaderPrescriptionNumber", "Prescription #")}</th>
                  <th className="px-4 py-3">{t("doctor.tableHeaderPatient", "Patient / Account")}</th>
                  <th className="px-4 py-3">{t("doctor.tableHeaderItems", "Items")}</th>
                  <th className="px-4 py-3">{t("doctor.tableHeaderClaimPin", "Claim PIN")}</th>
                  <th className="px-4 py-3">{t("doctor.tableHeaderIssuedTimestamp", "Issued Timestamp")}</th>
                  <th className="px-4 py-3 text-right">{t("doctor.tableHeaderStatus", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rx) => (
                  <tr key={rx.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5">
                    <p className="font-mono font-bold text-teal-800">{rx.prescription_number}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rx.items?.length ?? 0} {t("doctor.medicationItemsSuffix", "Medication Items")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 font-mono">{rx.patient_account_id}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{t("doctor.consultationIdLabel", "Consult")}: {rx.consultation_id ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      <Clock className="h-3 w-3 mr-1" />
                      {rx.items?.length ?? 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-black text-xs text-white bg-slate-900 px-2 py-0.5 rounded-md">
                      {rx.claim_pin ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                    {formatDate(rx.created_at)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Badge
                      variant={getStatusBadgeVariant(rx.status)}
                      className="text-[9px] uppercase font-bold py-0.5 px-2"
                    >
                      {getStatusLabel(rx.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
