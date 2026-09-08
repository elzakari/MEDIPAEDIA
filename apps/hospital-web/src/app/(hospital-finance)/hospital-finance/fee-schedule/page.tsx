"use client";

import React, { useEffect, useState } from "react";
import {
  Layers,
  Search,
  Plus,
  Edit2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medipaedia/ui";
import { createApiClient, HospitalServiceTariffItem } from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";

function formatCurrency(amount: number, currency: string = "GHS"): string {
  if (amount == null || isNaN(amount)) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeCategory(categoryTab: string, serviceCategory: string | null | undefined): boolean {
  if (categoryTab === "ALL") return true;
  const tab = categoryTab.toUpperCase();
  const svc = (serviceCategory || "").toString().toUpperCase();
  if (tab === svc) return true;
  if (tab === "WARD_BED" && svc === "WARD_STAY") return true;
  if (tab === "WARD_STAY" && svc === "WARD_BED") return true;
  return false;
}

export default function FacilityFeeSchedulePage() {
  const { tenant } = useAuth();
  const apiClient = createApiClient();
  const currency = tenant?.currency || "GHS";

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const [tariffs, setTariffs] = useState<HospitalServiceTariffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTariffs = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const rows = await apiClient.getHospitalServices({ include_inactive: false });
      setTariffs(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setTariffs([]);
      setLoadError(err?.message || String(err) || "Unable to load facility fee schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  const filteredTariffs = tariffs.filter((t) => {
    const matchesCategory = normalizeCategory(activeCategory, t.category);
    const hayName = (t.name || "").toLowerCase();
    const hayCode = (t.service_code || "").toLowerCase();
    const needle = search.toLowerCase();
    const matchesSearch = !needle || hayName.includes(needle) || hayCode.includes(needle);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-700" /> Hospital Fee Schedule & Tariffs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Standard facility price master list and NHIS co-pay tariff rules
          </p>
        </div>

        <Button
          onClick={() => alert("Fee addition workflow opened.")}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Add New Service Tariff
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name or tariff code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "CONSULTATION", "LABORATORY", "IMAGING", "WARD_BED", "PROCEDURE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeCategory === cat
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Load Error Banner */}
      {loadError && !isLoading && (
        <Card className="p-4 border border-rose-200 bg-rose-50/80">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-rose-900 text-xs">Failed to load fee schedule</h4>
              <p className="text-[11px] text-rose-700 font-mono break-words">{loadError}</p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={loadTariffs} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Price List Table */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Code</th>
                <th className="p-2.5">Service Description</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Standard Private Rate</th>
                <th className="p-2.5">NHIS Gov Tariff</th>
                <th className="p-2.5">Patient Co-Pay</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="space-y-3 max-w-3xl mx-auto">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredTariffs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl mb-3">
                        📑
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No Tariffs Configured</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        The facility fee schedule is currently empty. Add service tariffs or import standard NHIS fee schedules.
                      </p>
                      <button className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800">
                        + Add Tariff Code
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTariffs.map((t) => {
                  const rowCurrency = (t.currency as string | undefined) || currency;
                  return (
                    <tr key={t.id || t.service_code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-teal-800">{t.service_code}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{t.name}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {t.category || "UNCATEGORIZED"}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {formatCurrency(Number(t.base_price ?? 0), rowCurrency)}
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-indigo-700">
                        {formatCurrency(Number(t.nhis_tariff_amount ?? 0), rowCurrency)}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-teal-900">
                        {formatCurrency(Number(t.patient_copay ?? 0), rowCurrency)}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => alert(`Editing rate for ${t.service_code}...`)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
