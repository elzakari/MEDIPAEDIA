"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  QrCode as QrIcon,
  Search,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Filter,
  Loader2,
  Plus,
  Inbox,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  PrescriptionStatusBadge,
  QRCode,
  Modal,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient, Prescription } from "@medipaedia/api-client";

export default function PrescriptionsRegistryPage() {
  const { t } = useTranslation();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [printRx, setPrintRx] = useState<Prescription | null>(null);

  const apiClient = createApiClient();

  const loadPrescriptions = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.getPrescriptions();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : (t("common.error") || "Error");
      console.warn("Could not load prescriptions:", message);
      setErrorMessage(message);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredList = prescriptions.filter((rx) => {
    const pin = rx.claim_pin || rx.access_code || "";
    const matchesSearch =
      rx.prescription_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {(t("navigation.prescriptions") || "Hospital E-Prescription Registry")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {(t("doctor.prescriptionsRegistrySubtitle") || "Every digital prescription is cryptographically signed with HMAC-SHA256 and accessible via QR & 6-digit access code.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/doctor/consultations/new">
            <Button variant="primary" size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4" /> {(t("doctor.issueNewPrescription") || "New Prescription")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder={(t("doctor.searchPrescriptionPlaceholder") || "Search by Prescription Number or Claim PIN (e.g. 9K4L2P)...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "PENDING", "DISPENSED", "CANCELLED"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "primary" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="text-xs"
            >
              {st === "ALL" ? (t("common.all") || "All") : (t(`prescriptions.status.${st}`) || st)}
            </Button>
          ))}
        </div>
      </div>

      {/* Prescription Cards Container */}
      {isLoading ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-slate-200 rounded" />
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-slate-200 rounded" />
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="h-24 w-full bg-slate-100 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-10 w-10 text-rose-600 shrink-0 mx-auto sm:mx-0" />
            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-bold text-rose-900 text-base mb-1">{(t("prescriptions.errors.loadTitle") || "Could not load prescriptions registry")}</h4>
              <p className="text-xs text-rose-700 max-w-md">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={loadPrescriptions} className="border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {(t("common.retry") || "Retry")}
            </Button>
          </div>
        </div>
      ) : filteredList.length === 0 ? (
        (() => {
          const isTrueEmpty = prescriptions.length === 0;
          return (
            <Card className={`border-2 border-dashed ${isTrueEmpty ? "border-teal-300 bg-teal-50/60" : "border-slate-300 bg-slate-50"}`}>
              <CardContent className="p-16 text-center space-y-3">
                {isTrueEmpty ? (
                  <Inbox className="h-12 w-12 text-teal-500 mx-auto" />
                ) : (
                  <Search className="h-12 w-12 text-slate-400 mx-auto" />
                )}
                <h4 className="font-extrabold text-slate-900 text-base">
                  {isTrueEmpty
                    ? (t("doctor.noPrescriptionsFound") || "No Prescriptions Found")
                    : (t("common.noResults") || "No matching prescriptions")}
                </h4>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  {isTrueEmpty
                    ? (t("doctor.prescriptionsEmptyDescription") || "No electronic prescriptions have been issued yet. Click below to create one in the Doctor Workstation.")
                    : (t("common.adjustSearch") || "Try adjusting your search terms or status filter.")}
                </p>
                {isTrueEmpty ? (
                  <Link href="/doctor/consultations/new">
                    <Button variant="primary" size="sm" className="mt-2 text-xs bg-teal-600 hover:bg-teal-700">
                      {(t("doctor.goToWorkstation") || "Go to Doctor Workstation")}
                    </Button>
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          );
        })()
      ) : (
        <div className="space-y-6">
          {filteredList.map((rx) => (
            <Card key={rx.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{rx.prescription_number}</span>
                        <PrescriptionStatusBadge status={rx.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(rx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-mono font-bold text-teal-800">
                      CLAIM PIN: {rx.claim_pin}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrintRx(rx)}
                      className="gap-1.5 text-xs"
                    >
                      <Printer className="h-3.5 w-3.5" /> {(t("prescriptions.actions.printSheet") || "Printable Sheet")}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Prescription Details & Medications */}
                  <div className="lg:col-span-2 space-y-4">
                    {rx.notes && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        <strong>Clinical Notes / Diagnosis:</strong> {rx.notes}
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Prescribed Medications ({rx.items?.length || 0})
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {(rx.items || []).map((item) => (
                          <div key={item.id} className="p-3 bg-white flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">{item.medication_name}</p>
                              <p className="text-xs text-slate-500">{item.dosage} · {item.frequency} x {item.duration_days} days ({item.instructions || "Standard dose"})</p>
                            </div>
                            <Badge variant="secondary">Qty: {item.quantity_prescribed}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cryptographic Hash View */}
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-teal-400">
                          <ShieldCheck className="h-3.5 w-3.5" /> HMAC-SHA256 Verification Signature
                        </span>
                        <button
                          onClick={() => copyToClipboard(rx.hmac_signature || rx.verification_hash || "")}
                          className="hover:text-white flex items-center gap-1"
                        >
                          {copiedToken === (rx.hmac_signature || rx.verification_hash) ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedToken === (rx.hmac_signature || rx.verification_hash) ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="font-mono text-[10px] break-all text-slate-400">
                        {rx.hmac_signature || rx.verification_hash || "HMAC-PENDING"}
                      </p>
                    </div>
                  </div>

                  {/* QR Code Presentation */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <QRCode
                      value={`https://medipaedia.health/verify/rx?code=${rx.claim_pin || rx.access_code}&hash=${(rx.hmac_signature || rx.verification_hash || "").slice(0, 16)}`}
                      size={150}
                      title={rx.prescription_number}
                    />
                    <p className="text-[11px] text-slate-500 text-center mt-3 max-w-[200px]">
                      Scan at partner pharmacy to authenticate claim & dispense
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Printable Sheet Modal */}
      {printRx && (
        <Modal
          isOpen={!!printRx}
          onClose={() => setPrintRx(null)}
          title={(t("prescriptions.printModal.title") || "Print Prescription Form")}
          description={(t("prescriptions.printModal.desc") || "Standard clinical e-prescription documentation")}
          className="max-w-2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="p-6 bg-white rounded-xl border-2 border-slate-800 text-slate-900 space-y-4">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900">Ridge Regional Hospital, Accra</h3>
                  <p className="text-xs text-slate-600">Prescribing Physician: Attending Physician (GMC Staff)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold block">{printRx.prescription_number}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(printRx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg">
                <p><strong>Clinical Notes:</strong> {printRx.notes || "Standard Outpatient Prescription"}</p>
                <p><strong>Status:</strong> {printRx.status}</p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase border-b pb-1">Prescribed Regimen</div>
                {(printRx.items || []).map((it, i) => (
                  <div key={i} className="text-xs flex justify-between py-1 border-b border-slate-100">
                    <span>{i + 1}. {it.medication_name} ({it.dosage} · {it.frequency} x {it.duration_days} days)</span>
                    <Badge variant="secondary">Qty: {it.quantity_prescribed}</Badge>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 text-white rounded-xl">
                <div>
                  <div className="text-xs font-bold text-teal-400">CLAIM PIN: {printRx.claim_pin || printRx.access_code}</div>
                  <div className="text-[10px] text-slate-400 font-mono break-all">{(printRx.hmac_signature || printRx.verification_hash || "").slice(0, 32)}...</div>
                </div>
                <div className="bg-white p-1 rounded">
                  <QRCode value={`https://medipaedia.health/verify/rx?code=${printRx.claim_pin || printRx.access_code}`} size={70} />
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => window.print()} className="w-full gap-2 bg-teal-600 hover:bg-teal-700">
              <Printer className="h-4 w-4" /> {(t("prescriptions.actions.sendToPrinter") || "Send to Printer")}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
