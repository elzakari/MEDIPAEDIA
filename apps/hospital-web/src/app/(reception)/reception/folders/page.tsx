"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderArchive,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Activity,
  Loader2,
  PlusCircle,
  FolderOpen,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileCheck,
  RefreshCw,
  LayoutGrid,
  List,
  Layers,
  MapPin,
  Stethoscope,
  Inbox,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  useTranslation,
} from "@medipaedia/ui";
import {
  createApiClient,
  FolderLedgerItem,
  FolderStatus,
  FolderTransitInput,
  FolderArchiveMapResponse,
} from "@medipaedia/api-client";

export default function PhysicalFolderLedgerPage() {
  const { t } = useTranslation();
  const apiClient = createApiClient();

  const [activeViewTab, setActiveViewTab] = useState<"GRID" | "LEDGER">("GRID");
  const [selectedRack, setSelectedRack] = useState<string>("ALL");
  const [ledgerItems, setLedgerItems] = useState<FolderLedgerItem[]>([]);
  const [archiveMap, setArchiveMap] = useState<FolderArchiveMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState<FolderTransitInput>({
    mrn: "",
    action: "CHECK_OUT",
    destination_department: "Consulting Room 2",
    checked_out_to_doctor: "",
    notes: "Regular OPD Follow-up",
  });

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [ledgerData, mapData] = await Promise.all([
        apiClient.getFolderTransitLedger(
          statusFilter === "ALL" ? undefined : statusFilter
        ),
        apiClient.getFolderArchiveMap(searchQuery || undefined),
      ]);

      setLedgerItems(ledgerData || []);
      setArchiveMap(mapData || null);
    } catch (err: any) {
      setLedgerItems([]);
      setArchiveMap(null);
      setLoadError(err.message || String(err) || t("folders.errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.mrn.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.checkoutPhysicalFolder({
        card_id: checkoutForm.mrn.trim(),
        destination_department: checkoutForm.destination_department || "Consulting Room 2",
        doctor_name: checkoutForm.checked_out_to_doctor || "",
        notes: checkoutForm.notes,
      });

      setStatusMessage({
        type: "success",
        text: t("folders.checkout.success", {
          mrn: checkoutForm.mrn,
          destination: checkoutForm.destination_department || "Consulting Room 2",
        }),
      });
      setIsCheckoutModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || String(err) || t("folders.errors.checkoutFailed"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnFolder = async (mrn: string, rack?: string, shelf?: string) => {
    try {
      await apiClient.returnPhysicalFolder({
        card_id: mrn,
        rack_number: rack || "Rack-A1",
        shelf_row: shelf || "Shelf-01",
      });

      setStatusMessage({
        type: "success",
        text: t("folders.return.success", {
          mrn,
          rack: rack || "Rack-A1",
        }),
      });
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || String(err) || t("folders.errors.returnFailed"),
      });
    }
  };

  const filteredFolders = (archiveMap?.folders || []).filter((f) => {
    if (selectedRack !== "ALL" && f.rack_number !== selectedRack) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.mrn || "").toLowerCase().includes(q) ||
      (f.patient_name || "").toLowerCase().includes(q) ||
      (f.rack_number || "").toLowerCase().includes(q)
    );
  });

  const renderGridContent = () => {
    if (isLoading) {
      return (
        <div className="p-12 space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            {t("folders.grid.loading")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="p-12">
          <div className="max-w-md mx-auto p-6 rounded-2xl border border-rose-200 bg-rose-50/80 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-rose-900 text-sm mb-1">
                {t("folders.errors.failedToLoadTitle")}
              </h4>
              <p className="text-xs text-rose-700 font-mono break-words">{loadError}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={loadData}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("common.retry")}
            </Button>
          </div>
        </div>
      );
    }

    if (filteredFolders.length === 0) {
      const totalFolders = (archiveMap?.folders || []).length;
      const isTrueEmpty = totalFolders === 0;
      return (
        <div className="p-12 text-center">
          <Card className={`max-w-sm mx-auto border-2 border-dashed ${isTrueEmpty ? "border-teal-300 bg-teal-50/60" : "border-slate-300 bg-slate-50"}`}>
            <CardContent className="p-8 space-y-3">
              {isTrueEmpty ? (
                <Inbox className="h-12 w-12 text-teal-500 mx-auto" />
              ) : (
                <Search className="h-12 w-12 text-slate-400 mx-auto" />
              )}
              <h4 className="font-extrabold text-slate-900">
                {isTrueEmpty
                  ? (t("superAdmin.noFolders") || "No physical folders on record")
                  : (t("folders.grid.filteredZero.title") || "No matching folders")}
              </h4>
              <p className="text-sm text-slate-600">
                {isTrueEmpty
                  ? (t("folders.grid.zero.description") || "Seed the facility folder inventory in Admin → Physical Records, then tap Refresh.")
                  : (t("folders.grid.filteredZero.description") || "Try adjusting your rack filter or search terms.")}
              </p>
              {isTrueEmpty && (
                <Button variant="primary" size="sm" onClick={loadData}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  {(t("common.refresh") || "Refresh")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFolders.map((folder) => (
          <Card
            key={folder.card_id}
            className={`border transition shadow-sm hover:shadow-md ${
              folder.status === "IN_ARCHIVE"
                ? "border-emerald-200 bg-white hover:border-emerald-400"
                : folder.status === "WITH_DOCTOR"
                ? "border-indigo-200 bg-indigo-50/20 hover:border-indigo-400"
                : "border-amber-200 bg-amber-50/20 hover:border-amber-400"
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    {folder.mrn}
                  </span>
                  <strong className="text-sm font-extrabold text-slate-900 block">
                    {folder.patient_name}
                  </strong>
                </div>
                <Badge
                  variant={
                    folder.status === "IN_ARCHIVE"
                      ? "teal"
                      : folder.status === "WITH_DOCTOR"
                      ? "secondary"
                      : "warning"
                  }
                  className="text-[9px] font-extrabold uppercase"
                >
                  {(t(`folders.status.${folder.status}`) || folder.status.replace("_", " "))}
                </Badge>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {t("folders.grid.physicalLocation")}
                  </span>
                  <strong className="text-indigo-700 font-bold">
                    {folder.rack_number} · {folder.shelf_row}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {t("folders.grid.fileBoxCode")}
                  </span>
                  <span className="font-mono font-bold text-slate-700">{folder.file_box_code}</span>
                </div>
              </div>

              {folder.status !== "IN_ARCHIVE" && folder.current_holder_name && (
                <div className="p-2 bg-indigo-50 rounded-lg text-xs text-indigo-900 flex items-center gap-1.5 font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{folder.current_holder_name}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {folder.last_moved_at}
                </span>

                {folder.status === "IN_ARCHIVE" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setCheckoutForm({ ...checkoutForm, mrn: folder.mrn });
                      setIsCheckoutModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] gap-1 px-3 py-1"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> {t("folders.grid.actions.checkOut")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReturnFolder(folder.mrn, folder.rack_number, folder.shelf_row)}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold text-[11px] gap-1 px-3 py-1"
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" /> {t("folders.grid.actions.returnToShelf")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderLedgerContent = () => {
    if (isLoading) {
      return (
        <div className="p-12 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold mb-6">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            {t("folders.ledger.loading")}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="p-12">
          <div className="max-w-md mx-auto p-6 rounded-2xl border border-rose-200 bg-rose-50/80 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-rose-900 text-sm mb-1">
                {t("folders.errors.failedToLoadTitle")}
              </h4>
              <p className="text-xs text-rose-700 font-mono break-words">{loadError}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={loadData}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("common.retry")}
            </Button>
          </div>
        </div>
      );
    }

    if (ledgerItems.length === 0) {
      return (
        <div className="p-12 text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">
              {t("folders.ledger.zero.title")}
            </h4>
            <p className="text-xs text-slate-500">
              {t("folders.ledger.zero.description")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{t("folders.ledger.table.patientMrn")}</th>
              <th className="py-3 px-4">{t("folders.ledger.table.rackShelf")}</th>
              <th className="py-3 px-4">{t("folders.ledger.table.status")}</th>
              <th className="py-3 px-4">{t("folders.ledger.table.currentLocation")}</th>
              <th className="py-3 px-4">{t("folders.ledger.table.duration")}</th>
              <th className="py-3 px-4 text-right">{t("folders.ledger.table.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {ledgerItems.map((item) => (
              <tr key={item.transit_id} className="hover:bg-slate-50 transition">
                <td className="py-3.5 px-4">
                  <strong className="text-slate-900 block text-xs">{item.patient_name}</strong>
                  <span className="text-[10px] font-mono text-slate-400">{item.mrn}</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  {item.rack} · {item.shelf}
                </td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant={item.status === "IN_ARCHIVE" ? "teal" : "warning"}
                    className="text-[9px] font-extrabold uppercase"
                  >
                    {(t(`folders.status.${item.status}`) || item.status.replace("_", " "))}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-slate-800">
                  {item.current_location}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500">
                  {item.duration_hours ? `${item.duration_hours}h` : "—"}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {item.status === "CHECKED_OUT" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturnFolder(item.mrn, item.rack, item.shelf)}
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[11px] font-bold"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5" /> {t("folders.ledger.actions.return")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setCheckoutForm({ ...checkoutForm, mrn: item.mrn });
                        setIsCheckoutModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" /> {t("folders.ledger.actions.checkOut")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FolderArchive className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t("folders.title")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {t("folders.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs font-bold gap-1 text-slate-600 border-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("common.refresh")}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCheckoutModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <ArrowUpRight className="h-4 w-4" /> {t("folders.checkOutFolder")}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            {statusMessage.text}
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="font-bold hover:underline"
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-emerald-200 bg-emerald-50/50 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
            {t("folders.metrics.inArchive")}
          </p>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {archiveMap?.in_archive_count || 0}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {t("folders.metrics.secureOnShelves")}
          </p>
        </Card>

        <Card className="p-4 border-indigo-200 bg-indigo-50/50 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
            {t("folders.metrics.withDoctors")}
          </p>
          <p className="text-2xl font-black text-indigo-900 mt-1">
            {archiveMap?.with_doctors_count || 0}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
            {t("folders.metrics.activeConsultations")}
          </p>
        </Card>

        <Card className="p-4 border-amber-200 bg-amber-50/50 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
            {t("folders.metrics.inWards")}
          </p>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {archiveMap?.in_wards_count || 0}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
            {t("folders.metrics.bedsideNursing")}
          </p>
        </Card>

        <Card className="p-4 border-slate-200 bg-slate-50/80 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
            {t("folders.metrics.totalTracked")}
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {archiveMap?.total_folders_tracked || 0}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {t("folders.metrics.ghanaHealthRecords")}
          </p>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveViewTab("GRID")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeViewTab === "GRID"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> {t("folders.views.shelvingGrid")}
            </button>
            <button
              onClick={() => setActiveViewTab("LEDGER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeViewTab === "LEDGER"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" /> {t("folders.views.movementLedger")}
            </button>
          </div>

          {activeViewTab === "GRID" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(archiveMap?.available_racks || ["ALL", "Rack-A1", "Rack-A2", "Rack-B1", "Rack-B2", "Rack-C1"]).map((r, idx) => {
                const rackLabel = idx === 0 ? "ALL" : r;
                return (
                  <button
                    key={rackLabel}
                    onClick={() => setSelectedRack(idx === 0 ? "ALL" : r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      (idx === 0 && selectedRack === "ALL") || (idx !== 0 && selectedRack === r)
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rackLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("folders.search.placeholder")}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {activeViewTab === "GRID" && (
        <div className="space-y-6">
          {renderGridContent()}
        </div>
      )}

      {activeViewTab === "LEDGER" && (
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {renderLedgerContent()}
          </CardContent>
        </Card>
      )}

      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {t("folders.checkoutModal.title")}
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-3.5 text-xs">
              <Input
                label={t("folders.checkoutModal.fields.mrn")}
                value={checkoutForm.mrn}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, mrn: e.target.value })}
                placeholder={(t("folders.checkoutModal.placeholders.mrn") || "e.g. MRN-RDG-2026-99120")}
                required
              />

              <Input
                label={t("folders.checkoutModal.fields.destination")}
                value={checkoutForm.destination_department || ""}
                onChange={(e) =>
                  setCheckoutForm({ ...checkoutForm, destination_department: e.target.value })
                }
                placeholder={(t("folders.checkoutModal.placeholders.destination") || "e.g. Consulting Room 2 / Female Medical Ward")}
                required
              />

              <Input
                label={t("folders.checkoutModal.fields.doctor")}
                value={checkoutForm.checked_out_to_doctor || ""}
                onChange={(e) =>
                  setCheckoutForm({ ...checkoutForm, checked_out_to_doctor: e.target.value })
                }
                placeholder={(t("folders.checkoutModal.placeholders.doctor") || "e.g. Dr. Attending Physician")}
              />

              <Input
                label={t("folders.checkoutModal.fields.notes")}
                value={checkoutForm.notes || ""}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                placeholder={(t("folders.checkoutModal.placeholders.notes") || "e.g. Urgent review, Specialist clinic")}
              />

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                <span className="font-bold block">{t("folders.checkoutModal.policy.title")}:</span>
                <p className="text-[11px]">
                  {t("folders.checkoutModal.policy.body")}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {t("folders.checkoutModal.confirm")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
