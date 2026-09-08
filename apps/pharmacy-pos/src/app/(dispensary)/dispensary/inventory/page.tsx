"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  Loader2,
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
  Modal,
} from "@medipaedia/ui";
import { createApiClient, InventoryBatch } from "@medipaedia/api-client";

export default function PharmacyInventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LOW_STOCK" | "EXPIRING">("ALL");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inventoryList, setInventoryList] = useState<InventoryBatch[]>([]);

  // New Batch Form State
  const [batchForm, setBatchForm] = useState({
    medicationName: "",
    dosageForm: "Tablet",
    strength: "500mg",
    category: "Antibiotics",
    sku: "",
    batchNumber: "",
    quantity: "100",
    unitPrice: "25.00",
    reorderLevel: "20",
    expiryDate: "2027-08-30",
  });

  const apiClient = createApiClient();

  const loadBatches = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getInventoryBatches({
        search: searchQuery || undefined,
        low_stock_only: filterType === "LOW_STOCK" ? true : undefined,
        expiring_days: filterType === "EXPIRING" ? 60 : undefined,
      });
      setInventoryList(data || []);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn("Could not load inventory batches:", err.message);
      setInventoryList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [filterType]);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await apiClient.upsertInventoryBatch({
        sku: batchForm.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        batch_number: batchForm.batchNumber || `B-${Math.floor(100 + Math.random() * 900)}`,
        quantity: parseInt(batchForm.quantity) || 0,
        unit_price: parseFloat(batchForm.unitPrice) || 0,
        expiry_date: batchForm.expiryDate,
        reorder_level: parseInt(batchForm.reorderLevel) || 10,
        brand_name: batchForm.medicationName,
        generic_name: batchForm.medicationName,
        dosage_form: batchForm.dosageForm,
        strength: batchForm.strength,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setAddModalOpen(false);
        loadBatches();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to stock in batch.");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = inventoryList.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.brand_name || "").toLowerCase().includes(q) ||
      (item.generic_name || "").toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.batch_number.toLowerCase().includes(q)
    );
  });

  const lowStockCount = inventoryList.filter((i) => i.is_low_stock).length;
  const expiringCount = inventoryList.filter((i) => (i.days_to_expiry || 999) <= 60).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pharmacy Batch Inventory & Reorder Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Osu Community Pharmacy · Real-time stock counts, FEFO (First-Expired-First-Out) batch control, and automated reorder alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBatches}
            className="p-2 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Button
            variant="primary"
            onClick={() => setAddModalOpen(true)}
            className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs"
          >
            <Plus className="h-4 w-4" /> Stock In New Batch
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* KPI Alert Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType("ALL")}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterType === "ALL"
              ? "bg-teal-50 border-teal-500 ring-2 ring-teal-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-semibold text-slate-500 block">TOTAL ACTIVE BATCHES</span>
          <strong className="text-2xl font-black text-slate-900">{inventoryList.length}</strong>
        </div>

        <div
          onClick={() => setFilterType("LOW_STOCK")}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterType === "LOW_STOCK"
              ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">LOW STOCK WARNINGS</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <strong className="text-2xl font-black text-amber-900">{lowStockCount} Batches</strong>
        </div>

        <div
          onClick={() => setFilterType("EXPIRING")}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterType === "EXPIRING"
              ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">EXPIRING WITHIN 60 DAYS</span>
            <Clock className="h-4 w-4 text-rose-600" />
          </div>
          <strong className="text-2xl font-black text-rose-900">{expiringCount} Batches</strong>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="py-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search by drug name, brand, SKU, or batch number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <strong>{filtered.length}</strong> batches
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Loading batch inventory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Package className="h-12 w-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">No Inventory Batches Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? "No batches matched your search query."
                  : "Your pharmacy has no logged inventory batches yet. Click 'Stock In New Batch' to begin."}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="mt-2 text-xs bg-teal-600 hover:bg-teal-700 font-bold"
              >
                Stock In First Batch
              </Button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Medication & SKU</th>
                  <th className="py-3.5 px-4">Batch No.</th>
                  <th className="py-3.5 px-4">Form / Strength</th>
                  <th className="py-3.5 px-4">Quantity Available</th>
                  <th className="py-3.5 px-4">Unit Price (GHS)</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{item.brand_name || item.generic_name || "Pharmaceutical Item"}</p>
                      <p className="text-[11px] text-slate-500 font-mono">SKU: {item.sku}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {item.batch_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {item.dosage_form || "Tablet"} · {item.strength || "Standard"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-bold text-sm ${
                          item.is_low_stock ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded" : "text-slate-900"
                        }`}
                      >
                        {item.quantity} units
                      </span>
                      {item.is_low_stock && (
                        <span className="block text-[10px] text-amber-600 font-medium">
                          Below min ({item.reorder_level})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      GHS {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono ${
                          (item.days_to_expiry || 999) <= 60
                            ? "text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                            : "text-slate-700"
                        }`}
                      >
                        {item.expiry_date}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {item.days_to_expiry || 365} days remaining
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(item.days_to_expiry || 999) <= 60 ? (
                        <Badge variant="danger" className="text-[10px]">Expiring</Badge>
                      ) : item.is_low_stock ? (
                        <Badge variant="warning" className="text-[10px]">Low Stock</Badge>
                      ) : (
                        <Badge variant="teal" className="text-[10px]">In Stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Stock In Batch Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Stock In New Pharmaceutical Batch"
        description="Register incoming stock batches with expiration dates and unit retail prices"
      >
        {saveSuccess ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-base">Batch Added to Inventory</h3>
            <p className="text-xs text-slate-500">Stock counts and FEFO queues have been synchronized.</p>
          </div>
        ) : (
          <form onSubmit={handleAddBatch} className="space-y-4">
            <Input
              label="Medication Name"
              value={batchForm.medicationName}
              onChange={(e) => setBatchForm({ ...batchForm, medicationName: e.target.value })}
              placeholder="e.g. Ciprofloxacin 500mg"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Strength"
                value={batchForm.strength}
                onChange={(e) => setBatchForm({ ...batchForm, strength: e.target.value })}
                placeholder="500mg"
                required
              />
              <Input
                label="Dosage Form"
                value={batchForm.dosageForm}
                onChange={(e) => setBatchForm({ ...batchForm, dosageForm: e.target.value })}
                placeholder="Tablet, Syrup, Injection"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Batch Number"
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                placeholder="B-2026-C9"
                required
              />
              <Input
                label="SKU / Barcode"
                value={batchForm.sku}
                onChange={(e) => setBatchForm({ ...batchForm, sku: e.target.value })}
                placeholder="CIP-500-100"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Quantity"
                type="number"
                value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                required
              />
              <Input
                label="Unit Price (GHS)"
                value={batchForm.unitPrice}
                onChange={(e) => setBatchForm({ ...batchForm, unitPrice: e.target.value })}
                placeholder="25.00"
                required
              />
              <Input
                label="Expiry Date"
                type="date"
                value={batchForm.expiryDate}
                onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                required
              />
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSaving}
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
              >
                Confirm & Stock In Batch
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
