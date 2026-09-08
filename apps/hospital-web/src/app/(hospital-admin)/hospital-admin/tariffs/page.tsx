"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  Search,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Save,
  Plus,
  Filter,
  Inbox,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  useTranslation,
  Toast,
  ToastProps,
} from "@medipaedia/ui";
import {
  createApiClient,
  NHISGDRGTariffItem,
  HospitalTariffConfig,
  UpdateHospitalTariffRequest,
} from "@medipaedia/api-client";

const NHIS_CATEGORIES = [
  "ALL",
  "CONSULTATION",
  "LABORATORY",
  "RADIOLOGY",
  "SURGERY",
  "DELIVERY",
  "WARD_ACCOMMODATION",
] as const;

type NhisCategory = (typeof NHIS_CATEGORIES)[number];

export default function HospitalTariffMasterPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const { t } = useTranslation();

  const [opdFee, setOpdFee] = useState<string>("");
  const [genConsultFee, setGenConsultFee] = useState<string>("");
  const [specConsultFee, setSpecConsultFee] = useState<string>("");
  const [emergFee, setEmergFee] = useState<string>("");
  const [wardNightFee, setWardNightFee] = useState<string>("");
  const [icuNightFee, setIcuNightFee] = useState<string>("");
  const [malariaRdtFee, setMalariaRdtFee] = useState<string>("");
  const [fbcLabFee, setFbcLabFee] = useState<string>("");
  const [nhisConsultTariff, setNhisConsultTariff] = useState<string>("");
  const [nhisMalariaTariff, setNhisMalariaTariff] = useState<string>("");
  const [nhisFbcTariff, setNhisFbcTariff] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const [tariffs, setTariffs] = useState<NHISGDRGTariffItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<NhisCategory>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateConfig = (cfg: HospitalTariffConfig) => {
    setOpdFee(String(cfg.opd_registration_fee_ghs || 0));
    setGenConsultFee(String(cfg.general_consultation_fee_ghs || 0));
    setSpecConsultFee(String(cfg.specialist_consultation_fee_ghs || 0));
    setEmergFee(String(cfg.emergency_triage_fee_ghs || 0));
    setWardNightFee(String(cfg.general_ward_night_ghs || 0));
    setIcuNightFee(String(cfg.icu_bed_night_ghs || 0));
    setMalariaRdtFee(String(cfg.malaria_rdt_fee_ghs || 0));
    setFbcLabFee(String(cfg.fbc_lab_fee_ghs || 0));
    setNhisConsultTariff(String(cfg.nhis_consultation_gdrg_tariff || 0));
    setNhisMalariaTariff(String(cfg.nhis_malaria_gdrg_tariff || 0));
    setNhisFbcTariff(String(cfg.nhis_fbc_gdrg_tariff || 0));
    setLastUpdated(cfg.last_updated || null);
    setUpdatedBy(cfg.updated_by || null);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, list] = await Promise.all([
        apiClient.getHospitalTariffs(),
        apiClient.getNHISGDRGTariffs({
          search: searchTerm || undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        }),
      ]);
      hydrateConfig(cfg);
      setTariffs(list);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        (err as { message?: string }).message ||
        (t("common.loadError") || "Failed to load tariff data.");
      setError(msg);
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient, t, searchTerm, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveTariffs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const payload: UpdateHospitalTariffRequest = {
        opd_registration_fee_ghs: Number(opdFee) || 0,
        general_consultation_fee_ghs: Number(genConsultFee) || 0,
        specialist_consultation_fee_ghs: Number(specConsultFee) || 0,
        emergency_triage_fee_ghs: Number(emergFee) || 0,
        general_ward_night_ghs: Number(wardNightFee) || 0,
        icu_bed_night_ghs: Number(icuNightFee) || 0,
      };
      const updated = await apiClient.updateHospitalTariffs(payload);
      hydrateConfig(updated);
      setSavedSuccess(true);
      setToast({
        type: "success",
        title: (t("hospitalAdmin.tariffs.saveSuccessTitle") || "Tariffs Updated"),
        message: (t("hospitalAdmin.tariffs.saveSuccessMsg") || "Tariff configuration published facility-wide!"),
      });
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        (err as { message?: string }).message ||
        (t("hospitalAdmin.tariffs.saveError") || "Failed to save tariff configuration.");
      setToast({
        type: "error",
        title: (t("hospitalAdmin.tariffs.saveErrorTitle") || "Save Error"),
        message: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-96 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-[28rem] bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        <Card className="p-5 border border-slate-200 space-y-4">
          <div className="h-5 w-80 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-44 bg-slate-200 rounded animate-pulse" />
                <div className="h-9 w-full bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-2 w-40 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 space-y-4">
          <div className="h-5 w-80 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded-xl animate-pulse" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50">
                <tr>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="p-2.5">
                      <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: 7 }).map((_, colIdx) => (
                      <td key={colIdx} className="p-2.5">
                        <div
                          className={`h-3 bg-slate-200 rounded animate-pulse ${
                            colIdx === 0
                              ? "w-20"
                              : colIdx === 1
                              ? "w-44"
                              : colIdx === 6
                              ? "w-24 ml-auto"
                              : "w-20"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {(t("common.error") || "Error")}
                </h2>
                <p className="text-sm text-slate-600 max-w-md">{error}</p>
              </div>
              <Button variant="primary" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {(t("common.retry") || "Retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          actionUrl={toast.actionUrl}
          actionLabel={toast.actionLabel}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-700" />
            {(t("hospitalAdmin.tariffs.pageTitle") || "Facility Tariff Master & Pricing Schedules")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {(t("hospitalAdmin.tariffs.pageSubtitle") || "Configure hospital private out-of-pocket charges and National Health Insurance (NHIS) G-DRG mapping")}
          </p>
        </div>

        {savedSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {(t("hospitalAdmin.tariffs.savedBanner") || "Tariff configuration published facility-wide!")}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveTariffs} className="space-y-6">
        <Card className="p-5 border border-slate-200 bg-white space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900">
                {(t("hospitalAdmin.tariffs.sectionRates") || "Hospital Standard Service Rates (Private / Out-of-Pocket)")}
              </h3>
              <p className="text-xs text-slate-500">
                {(t("hospitalAdmin.tariffs.sectionRatesHelp") || "Base fees applied before insurance co-pay calculation")}
              </p>
              {(lastUpdated || updatedBy) && (
                <div className="flex flex-wrap items-center gap-3 pt-1.5 text-[10px] text-slate-400">
                  {lastUpdated && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(t("hospitalAdmin.tariffs.lastUpdated", {
                        when: new Date(lastUpdated).toLocaleString(),
                      }) || "Last updated: {{when}}")}
                    </span>
                  )}
                  {updatedBy && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {(t("hospitalAdmin.tariffs.updatedBy", {
                        who: updatedBy,
                      }) || "By: {{who}}")}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="font-bold gap-1.5"
            >
              <Save className="h-4 w-4" />
              {(t("hospitalAdmin.tariffs.saveBtn") || "Save Pricing Changes")}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.opdFeeLabel") || "OPD Card Registration Fee (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={opdFee}
                onChange={(e) => setOpdFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.opdFeeHelp") || "Waived for Universal Patient Card holders")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.genConsultLabel") || "General OPD Consultation (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={genConsultFee}
                onChange={(e) => setGenConsultFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.genConsultHelp") || "Medical Officer standard encounter")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.specConsultLabel") || "Specialist Physician Consultation (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={specConsultFee}
                onChange={(e) => setSpecConsultFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.specConsultHelp") || "Senior Specialist / Consultant visit")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.emergFeeLabel") || "Emergency & Triage Surcharge (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={emergFee}
                onChange={(e) => setEmergFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.emergFeeHelp") || "Resuscitation Bay ESI Level 1-2 care")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.wardNightLabel") || "General Ward Inpatient Bed / Night (GHS)")}
              </label>
              <input
                type="number"
                step="10.00"
                value={wardNightFee}
                onChange={(e) => setWardNightFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.wardNightHelp") || "Includes routine nursing care")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.icuNightLabel") || "Intensive Care Unit (ICU) / Night (GHS)")}
              </label>
              <input
                type="number"
                step="25.00"
                value={icuNightFee}
                onChange={(e) => setIcuNightFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.icuNightHelp") || "Includes continuous multi-parameter monitoring")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.malariaRdtLabel") || "Malaria RDT Test (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={malariaRdtFee}
                onChange={(e) => setMalariaRdtFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.malariaRdtHelp") || "Point-of-care Histidine-Rich Protein assay")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                {(t("hospitalAdmin.tariffs.fbcLabLabel") || "Full Blood Count (FBC) Lab (GHS)")}
              </label>
              <input
                type="number"
                step="5.00"
                value={fbcLabFee}
                onChange={(e) => setFbcLabFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                {(t("hospitalAdmin.tariffs.fbcLabHelp") || "5-part differential + platelet count")}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
              {(t("hospitalAdmin.tariffs.sectionNhisBenchmarks") || "NHIS G-DRG Benchmark Tariffs (Reference Pricing)")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
                <label className="block font-bold text-teal-900">
                  {(t("hospitalAdmin.tariffs.nhisConsultLabel") || "NHIS Consultation G-DRG Tariff (GHS)")}
                </label>
                <input
                  type="number"
                  step="5.00"
                  value={nhisConsultTariff}
                  onChange={(e) => setNhisConsultTariff(e.target.value)}
                  className="w-full rounded-xl border border-teal-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
                <label className="block font-bold text-teal-900">
                  {(t("hospitalAdmin.tariffs.nhisMalariaLabel") || "NHIS Malaria RDT G-DRG Tariff (GHS)")}
                </label>
                <input
                  type="number"
                  step="5.00"
                  value={nhisMalariaTariff}
                  onChange={(e) => setNhisMalariaTariff(e.target.value)}
                  className="w-full rounded-xl border border-teal-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
                <label className="block font-bold text-teal-900">
                  {(t("hospitalAdmin.tariffs.nhisFbcLabel") || "NHIS FBC Lab G-DRG Tariff (GHS)")}
                </label>
                <input
                  type="number"
                  step="5.00"
                  value={nhisFbcTariff}
                  onChange={(e) => setNhisFbcTariff(e.target.value)}
                  className="w-full rounded-xl border border-teal-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </Card>
      </form>

      <Card className="p-5 border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              {(t("hospitalAdmin.tariffs.sectionNhis") || "Ghana Health Service / NHIA G-DRG Master Registry")}
            </h3>
            <p className="text-xs text-slate-500">
              {(t("hospitalAdmin.tariffs.sectionNhisHelp") || "Statutory tariff reimbursements received from National Health Insurance Authority (Ghana DRG v2026)")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal" className="text-xs font-bold">
              {(t("hospitalAdmin.tariffs.bandCount", { count: String(tariffs.length) }) || "{{count}} Active G-DRG Bands")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={(t("hospitalAdmin.tariffs.searchPlaceholder") || "Search code (e.g. OPDC01A, SURG01CS, FBC)...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {NHIS_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                  selectedCategory === cat
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat === "ALL"
                  ? (t("common.all") || "All")
                  : cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {tariffs.length === 0 ? (
          <Card className="p-8 border border-dashed border-slate-300 text-center bg-slate-50/50 space-y-3 mt-2">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {(t("hospitalAdmin.tariffs.noTariffs") || "No NHIS G-DRG tariffs found")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {(t("hospitalAdmin.tariffs.noTariffsHelp") || "Adjust the search filters above or check back later for the statutory NHIA reimbursement bands.")}
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thCode") || "G-DRG Code")}
                  </th>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thService") || "Service Description")}
                  </th>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thCategory") || "Category")}
                  </th>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thStandard") || "Standard Tariff")}
                  </th>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thCoverage") || "NHIA Coverage")}
                  </th>
                  <th className="p-2.5">
                    {(t("hospitalAdmin.tariffs.thCopay") || "Co-Pay")}
                  </th>
                  <th className="p-2.5 text-right">
                    {(t("hospitalAdmin.tariffs.thAuth") || "Auth Status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tariffs.map((gdrg) => (
                  <tr
                    key={gdrg.gdrg_code}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="p-2.5 font-mono font-bold text-teal-800">
                      {gdrg.gdrg_code}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-900">
                      {gdrg.service_name}
                    </td>
                    <td className="p-2.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {gdrg.category}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-black text-slate-900">
                      {(t("common.currencyGhs", {
                          amount: Number(gdrg.standard_tariff_ghs).toFixed(2),
                        }) || "GHS {{amount}}")}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700">
                      {(t("common.currencyGhs", {
                          amount: Number(gdrg.nhis_covered_amount_ghs).toFixed(2),
                        }) || "GHS {{amount}}")}
                    </td>
                    <td className="p-2.5 font-mono font-medium text-slate-600">
                      {(t("common.currencyGhs", {
                          amount: Number(gdrg.patient_copay_ghs || 0).toFixed(2),
                        }) || "GHS {{amount}}")}
                    </td>
                    <td className="p-2.5 text-right">
                      {gdrg.preauth_required ? (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          {(t("hospitalAdmin.tariffs.preauth") || "PRE-AUTH")}
                        </Badge>
                      ) : (
                        <Badge variant="teal" className="text-[10px] font-bold">
                          {(t("hospitalAdmin.tariffs.directNhis") || "DIRECT NHIS")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
