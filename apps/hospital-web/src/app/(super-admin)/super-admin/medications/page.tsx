"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Search,
  Plus,
  CheckCircle2,
  Filter,
  ShieldCheck,
  FileText,
  Tag,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
} from "@medipaedia/ui";
import { createApiClient, type FormularyMedicationItem } from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

export default function AdminMedicationsPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medications, setMedications] = useState<FormularyMedicationItem[]>([]);

  const [brandName, setBrandName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [dosageForm, setDosageForm] = useState("Tablet");
  const [strength, setStrength] = useState("");
  const [isPom, setIsPom] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rx = await apiClient.getClinicalFormulary();
      setMedications(Array.isArray(rx) ? rx : []);
    } catch (err: any) {
      setError(err?.message || t("common.loadError") || "Failed to load drug formulary catalog.");
      setMedications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    const newMed: FormularyMedicationItem = {
      id: `form-${Date.now()}`,
      brand_name: brandName,
      generic_name: genericName,
      dosage_form: dosageForm,
      strength: strength,
      category: t("superAdmin.generalTherapeutic") || "General Therapeutic",
      poison_schedule: isPom ? "PRESCRIPTION_ONLY" : "OTC",
      is_cold_chain: false,
      nafdac_fda_number: `FDA-${Date.now().toString().slice(-8)}`,
    };
    setMedications([newMed, ...medications]);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setAddModalOpen(false);
      setBrandName("");
      setGenericName("");
      setStrength("");
    }, 1200);
  };

  const filtered = medications.filter((m: FormularyMedicationItem) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const brand = m.brand_name || "";
    const generic = m.generic_name || "";
    const category = m.category || m.therapeutic_class || "";
    const fda = m.nafdac_fda_number || "";
    return (
      brand.toLowerCase().includes(q) ||
      generic.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q) ||
      fda.toLowerCase().includes(q)
    );
  });

  const renderSkeleton = () => (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
    </div>
  );

  const renderError = () => (
    <Card className="border-rose-200 bg-rose-50/50">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{t("common.error")}</h3>
          <p className="text-sm text-slate-600 mt-1">{error}</p>
        </div>
        <Button variant="teal" onClick={loadData}>
          <Sparkles className="h-4 w-4 mr-1.5" /> {t("common.retry")}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("superAdmin.globalDrugMaster")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("superAdmin.drugMasterSubtitle")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs"
        >
          <Plus className="h-4 w-4" /> {t("superAdmin.addGlobalDrug")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <Input
            label={t("superAdmin.searchGlobalDrug")}
            placeholder={t("superAdmin.searchDrugPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : (
        <>
          {!loading && !error && filtered.length === 0 && medications.length > 0 && (
            <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
              <div className="text-center space-y-2">
                <Search className="h-10 w-10 mx-auto text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-700">
                  {t("common.noResults") || "No matching medications"}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("common.adjustSearch") || "Try clearing your search filter."}
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader className="py-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900">
                {t("superAdmin.registeredPharmaceuticals") || "Registered Pharmaceuticals"} ({filtered.length})
              </CardTitle>
              <Badge variant="teal" className="text-[10px]">
                {t("superAdmin.whoInnCompliant") || "WHO INN COMPLIANT"}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase">
                    <tr>
                      <th className="p-3.5">{t("superAdmin.brandAndDosage") || "Brand / Dosage"}</th>
                      <th className="p-3.5">{t("superAdmin.genericInn") || "Generic (INN)"}</th>
                      <th className="p-3.5">{t("common.strength") || "Strength"}</th>
                      <th className="p-3.5">{t("superAdmin.therapeuticCategory") || "Therapeutic Category"}</th>
                      <th className="p-3.5">{t("superAdmin.fdaRegNumber") || "FDA/MOH Reg #"}</th>
                      <th className="p-3.5">{t("superAdmin.classification") || "Schedule"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3 text-slate-400">
                              💊
                            </div>
                            <p className="text-sm font-semibold text-slate-300">Global Drug Master Empty</p>
                            <p className="text-xs text-slate-600 mt-1 max-w-sm">
                              No formulary records in database. Click "+ Add Drug" or import the national FDA / Essential Medicines List.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m: FormularyMedicationItem) => {
                        const brand = m.brand_name;
                        const generic = m.generic_name || "—";
                        const form = m.dosage_form || "Tablet";
                        const strengthVal = m.strength || "—";
                        const category = m.category || m.therapeutic_class || t("superAdmin.generalTherapeutic") || "General Therapeutic";
                        const fdaNumber = m.nafdac_fda_number || "—";
                        const schedule = m.poison_schedule || "";
                        const isPom = schedule.includes("PRESCRIPTION") || schedule.includes("NARCOTIC") || schedule.includes("POISON") || schedule === "CLASS_A" || schedule === "CLASS_B" || (m.poison_schedule === "PRESCRIPTION_ONLY");
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60">
                            <td className="p-3.5">
                              <strong className="text-slate-900 block">{brand}</strong>
                              <span className="text-[11px] text-slate-400">{form}</span>
                            </td>
                            <td className="p-3.5 font-medium text-slate-700">{generic}</td>
                            <td className="p-3.5 font-mono text-slate-600">{strengthVal}</td>
                            <td className="p-3.5 text-slate-500">{category}</td>
                            <td className="p-3.5 font-mono text-teal-800 text-[11px]">{fdaNumber}</td>
                            <td className="p-3.5">
                              {isPom || m.poison_schedule !== "OTC" ? (
                                <Badge variant="danger" className="text-[9px]">
                                  {schedule.replace(/_/g, " ") || "POM"} ({t("superAdmin.pomPrescriptionOnly") || "Rx Only"})
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[9px]">
                                  OTC ({t("superAdmin.otcOverTheCounter") || "OTC"})
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
        </>
      )}

      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title={t("superAdmin.addGlobalDrugTitle")}
          description={t("superAdmin.addGlobalDrugDescription")}
        >
          {addedSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">{t("superAdmin.medicationAdded")}</h3>
              <p className="text-xs text-slate-500">{t("superAdmin.medicationIndexed")}</p>
            </div>
          ) : (
            <form onSubmit={handleAddMed} className="space-y-4 py-2 text-xs">
              <Input
                label={t("superAdmin.brandCommercialName")}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={t("superAdmin.brandPlaceholder")}
                required
              />

              <Input
                label={t("superAdmin.genericActiveIngredient")}
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder={t("superAdmin.genericPlaceholder")}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("superAdmin.dosageForm")}</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Tablet">{t("forms.tablet")}</option>
                    <option value="Capsule">{t("forms.capsule")}</option>
                    <option value="Syrup">{t("forms.syrup")}</option>
                    <option value="Injection">{t("forms.injection")}</option>
                    <option value="Inhaler">{t("forms.inhaler")}</option>
                  </select>
                </div>

                <Input
                  label={t("superAdmin.strengthSpecification")}
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder={t("superAdmin.strengthPlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("superAdmin.prescriptionRequirement")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPom(true)}
                    className={`p-2.5 rounded-lg border font-bold text-center transition ${
                      isPom
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    {t("superAdmin.pomRequired")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPom(false)}
                    className={`p-2.5 rounded-lg border font-bold text-center transition ${
                      !isPom
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    {t("superAdmin.otcAvailable")}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
              >
                {t("superAdmin.saveToMasterCatalog")}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
