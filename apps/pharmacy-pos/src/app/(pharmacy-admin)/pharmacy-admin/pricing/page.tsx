"use client";

import React, { useEffect, useState } from "react";
import {
  Tag,
  Percent,
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Boxes,
  Sparkles,
  Layers,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@medipaedia/ui";
import {
  createApiClient,
  PricingRulesData,
  CategoryMarkupRule,
  PatientDiscountTier,
  DrugCategory,
} from "@medipaedia/api-client";

export default function PharmacyPricingRulesPage() {
  const apiClient = createApiClient();

  const [pricingRules, setPricingRules] = useState<PricingRulesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Live Margin Simulator State
  const [simCategory, setSimCategory] = useState<DrugCategory>("POM");
  const [simCostPrice, setSimCostPrice] = useState<number>(35.0);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadPricingRules = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPricingRules();
      setPricingRules(data);
    } catch (err: any) {
      console.warn("Pricing rules fetch error:", err.message);
      setPricingRules({
        default_markup_percentage: 0,
        category_rules: [],
        patient_discount_tiers: [],
        tax_rate_percentage: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPricingRules();
  }, []);

  const handleSaveRules = async () => {
    if (!pricingRules) return;
    setIsSaving(true);
    try {
      const res = await apiClient.updatePricingRules({
        default_markup_percentage: pricingRules.default_markup_percentage,
        category_rules: pricingRules.category_rules,
        patient_discount_tiers: pricingRules.patient_discount_tiers,
      });
      setPricingRules(res);
      setStatusMessage({
        type: "success",
        text: "Dynamic pricing schedules and discount tiers successfully saved!",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update pricing rules.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMarkupRule = () => {
    if (!pricingRules) return;
    const usedCategories = new Set(pricingRules.category_rules.map((r) => r.category));
    const allCategories: DrugCategory[] = ["POM", "OTC", "CONTROLLED", "COSMETICS", "DEVICES"];
    const categoryLabels: Record<DrugCategory, string> = {
      POM: "Prescription Only Medicines (POM)",
      OTC: "Over The Counter (OTC)",
      CONTROLLED: "Controlled & Dangerous Drugs",
      COSMETICS: "Cosmetics & Wellness",
      DEVICES: "Medical Devices & Diagnostics",
    };
    const nextCategory = allCategories.find((c) => !usedCategories.has(c));
    if (!nextCategory) return;
    const newRule: CategoryMarkupRule = {
      category: nextCategory,
      category_name: categoryLabels[nextCategory],
      target_markup_percentage: pricingRules.default_markup_percentage ?? 0,
      minimum_gross_margin_percentage: 0,
      allow_discount: true,
      rounding_rule: "NEAREST_50_PESEWAS",
    };
    setPricingRules({
      ...pricingRules,
      category_rules: [...pricingRules.category_rules, newRule],
    });
  };

  // Live Simulator Computation
  const activeSimRule = pricingRules?.category_rules.find((r) => r.category === simCategory);
  const targetMarkup = activeSimRule?.target_markup_percentage || 40.0;
  const rawSellingPrice = simCostPrice * (1.0 + targetMarkup / 100.0);
  const roundedSellingPrice = Math.ceil(rawSellingPrice * 2.0) / 2.0;
  const grossProfit = roundedSellingPrice - simCostPrice;
  const grossMarginPct = roundedSellingPrice > 0 ? (grossProfit / roundedSellingPrice) * 100.0 : 0;

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Tag className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Dynamic Pricing Margins &amp; Category Schedules
              </h1>
              <p className="text-xs text-slate-500">
                Category Markups (POM vs OTC) · Patient Discount Tiers · Pesewas Rounding Rules (Act 851 Exempt)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPricingRules}
              className="gap-1.5 text-xs text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRules}
              isLoading={isSaving}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              <Save className="h-4 w-4" /> Save Pricing Schedules
            </Button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Two Column Layout: Category Schedules & Interactive Margin Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Markup Schedules */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Drug Category Markup Schedules
              </CardTitle>
              <p className="text-xs text-slate-500">
                Target retail markup and gross margin floors applied across GRN intake and POS sales.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {pricingRules?.category_rules.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
                  <Button
                    variant="primary"
                    onClick={handleAddMarkupRule}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  >
                    <Plus className="h-4 w-4" /> + Add Markup Rule
                  </Button>
                  <p className="text-xs text-slate-500 max-w-sm">
                    No markup rules configured. A default baseline markup of{" "}
                    <strong className="text-slate-700">
                      {pricingRules.default_markup_percentage ?? 0}%
                    </strong>{" "}
                    applies until category rules are added.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {pricingRules?.category_rules.map((rule, idx) => (
                    <div key={rule.category} className="p-4 hover:bg-slate-50/70 transition space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="teal" className="text-[10px] font-bold">
                            {rule.category}
                          </Badge>
                          <strong className="text-slate-900 font-bold text-sm">
                            {rule.category_name}
                          </strong>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Floor Margin: <strong>{rule.minimum_gross_margin_percentage}%</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Target Markup (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={rule.target_markup_percentage}
                              onChange={(e) => {
                                const updated = [...pricingRules.category_rules];
                                updated[idx].target_markup_percentage = parseFloat(e.target.value) || 0;
                                setPricingRules({ ...pricingRules, category_rules: updated });
                              }}
                              className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                              min="0"
                              max="200"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                              %
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Rounding Rule
                          </label>
                          <select
                            value={rule.rounding_rule}
                            onChange={(e) => {
                              const updated = [...pricingRules.category_rules];
                              updated[idx].rounding_rule = e.target.value;
                              setPricingRules({ ...pricingRules, category_rules: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                          >
                            <option value="NEAREST_50_PESEWAS">Nearest 50 Pesewas (GHp 50)</option>
                            <option value="NEAREST_1_CEDI">Nearest GH₵ 1.00</option>
                            <option value="EXACT">Exact (2 Decimals)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Patient Discounts Allowed
                          </label>
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={rule.allow_discount}
                              onChange={(e) => {
                                const updated = [...pricingRules.category_rules];
                                updated[idx].allow_discount = e.target.checked;
                                setPricingRules({ ...pricingRules, category_rules: updated });
                              }}
                              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-slate-700 font-medium">
                              {rule.allow_discount ? "Discount Eligible" : "No Discounts (Fixed)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Discount Tiers Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Patient Discount &amp; Loyalty Tiers
              </CardTitle>
              <p className="text-xs text-slate-500">
                Special co-payment concessions applied automatically during POS checkout.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {pricingRules?.patient_discount_tiers.map((tier, idx) => (
                  <div key={tier.tier_id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 font-bold block">{tier.tier_name}</strong>
                      <span className="font-mono text-[10px] text-slate-400">{tier.tier_id}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-28">
                        <input
                          type="number"
                          value={tier.discount_percentage}
                          onChange={(e) => {
                            const updated = [...pricingRules.patient_discount_tiers];
                            updated[idx].discount_percentage = parseFloat(e.target.value) || 0;
                            setPricingRules({ ...pricingRules, patient_discount_tiers: updated });
                          }}
                          className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-right"
                          min="0"
                          max="50"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          %
                        </span>
                      </div>

                      <Badge variant={tier.is_active ? "teal" : "secondary"} className="text-[10px]">
                        {tier.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Live Pricing & Margin Simulator */}
        <div className="space-y-4">
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-white shadow-md sticky top-24">
            <CardHeader className="pb-3 border-b border-teal-100">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Live Margin &amp; Price Simulator
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500">
                Interactive real-time margin and selling price calculator.
              </p>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Drug Category
                </label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value as DrugCategory)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                >
                  <option value="POM">Prescription Only Medicine (POM)</option>
                  <option value="OTC">Over The Counter (OTC)</option>
                  <option value="CONTROLLED">Controlled & Dangerous Drugs</option>
                  <option value="COSMETICS">Cosmetics & Wellness</option>
                  <option value="DEVICES">Medical Devices</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier Landed Cost (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                    GHS
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={simCostPrice}
                    onChange={(e) => setSimCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Simulated Results Box */}
              <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Applied Markup:</span>
                  <strong className="text-teal-700 font-mono font-bold">+{targetMarkup}%</strong>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Raw Calculated Price:</span>
                  <span className="font-mono text-slate-500">GHS {rawSellingPrice.toFixed(3)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Rounding Adjustment:</span>
                  <Badge variant="outline" className="text-[10px]">
                    Nearest 50 Pesewas
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Final Retail Price:</span>
                  <strong className="text-lg font-black text-teal-900 font-mono">
                    GHS {roundedSellingPrice.toFixed(2)}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-800 block">
                      GROSS MARGIN
                    </span>
                    <strong className="text-base font-black text-teal-950 font-mono">
                      {grossMarginPct.toFixed(2)}%
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-teal-800 block">
                      UNIT PROFIT
                    </span>
                    <strong className="text-base font-black text-teal-950 font-mono">
                      GHS {grossProfit.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
