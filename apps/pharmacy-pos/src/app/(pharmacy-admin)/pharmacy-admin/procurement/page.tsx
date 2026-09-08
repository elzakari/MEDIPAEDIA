"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  X,
  RefreshCw,
  Sparkles,
  Users,
  Check,
  Loader2,
  Activity,
  Zap,
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
import {
  createApiClient,
  PharmacySupplier,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItemInput,
  PurchaseOrderCreateInput,
  ReorderSuggestionItem,
  SupplierCreditTerms,
  SupplierCreateInput,
  GoodsReceivedNoteInput,
  DepletionForecastItem,
  DepletionForecastResponse,
  SeasonalDemandResponse,
  SeasonalForecastItem,
} from "@medipaedia/api-client";

function ProcurementContent() {
  const apiClient = createApiClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"po" | "forecast" | "seasonal" | "reorder" | "suppliers" | "grn">("po");
  const [isLoading, setIsLoading] = useState(true);

  // Predictive Depletion Radar State
  const [forecastData, setForecastData] = useState<DepletionForecastResponse | null>(null);
  const [seasonalData, setSeasonalData] = useState<SeasonalDemandResponse | null>(null);
  const [isBulkPoModalOpen, setIsBulkPoModalOpen] = useState(false);
  const [isGeneratingBulkPo, setIsGeneratingBulkPo] = useState(false);
  const [bulkPoSuccessMessage, setBulkPoSuccessMessage] = useState<string | null>(null);

  // Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poFilter, setPoFilter] = useState<string>("ALL");
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);

  // Auto-Reorder Engine State
  const [reorders, setReorders] = useState<ReorderSuggestionItem[]>([]);
  const [reorderSearch, setReorderSearch] = useState("");

  // Suppliers State
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  // GRN State
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrder | null>(null);
  const [grnInvoiceNumber, setGrnInvoiceNumber] = useState("");
  const [grnDeliveryNote, setGrnDeliveryNote] = useState("");
  const [grnBatchData, setGrnBatchData] = useState<{
    [key: string]: { batchNumber: string; expiryDate: string; retailPrice: string };
  }>({});

  // Form States
  const [newPoForm, setNewPoForm] = useState<PurchaseOrderCreateInput>({
    supplier_id: "",
    supplier_name: "",
    expected_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    notes: "",
    items: [],
  });

  const [newSupplierForm, setNewSupplierForm] = useState<SupplierCreateInput>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "Accra Industrial Area",
    credit_terms: "NET_30",
    credit_limit_ghs: 50000,
    lead_time_days: 3,
  });

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadProcurementData = async () => {
    try {
      setIsLoading(true);
      const [poRes, reorderRes, suppRes, forecastRes, seasonalRes] = await Promise.allSettled([
        apiClient.getPurchaseOrders(),
        apiClient.getReorderSuggestions(),
        apiClient.getPharmacySuppliers(),
        apiClient.getStockDepletionForecast(),
        apiClient.getSeasonalDemandForecast(),
      ]);

      if (poRes.status === "fulfilled" && poRes.value) {
        setPurchaseOrders(poRes.value);
        if (poRes.value.length > 0 && !selectedPoForGrn) {
          setSelectedPoForGrn(poRes.value[0]);
        }
      }
      if (reorderRes.status === "fulfilled" && reorderRes.value) {
        setReorders(reorderRes.value.items || []);
      }
      if (suppRes.status === "fulfilled" && suppRes.value) {
        setSuppliers(suppRes.value);
        if (suppRes.value.length > 0 && !newPoForm.supplier_id) {
          setNewPoForm((prev) => ({
            ...prev,
            supplier_id: suppRes.value[0].id,
            supplier_name: suppRes.value[0].name,
          }));
        }
      }
      if (forecastRes.status === "fulfilled" && forecastRes.value) {
        setForecastData(forecastRes.value);
      }
      if (seasonalRes.status === "fulfilled" && seasonalRes.value) {
        setSeasonalData(seasonalRes.value);
      }
    } catch (err) {
      console.error("Procurement load error:", err);
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteBulkPo = async () => {
    if (!forecastData?.forecast_timeline || forecastData.forecast_timeline.length === 0) return;
    setIsGeneratingBulkPo(true);
    setBulkPoSuccessMessage(null);
    try {
      const itemsToOrder = forecastData.forecast_timeline
        .filter((i) => i.urgency === "CRITICAL" || i.urgency === "WARNING")
        .map((i) => ({
          medication_id: i.medication_id,
          supplier_id: i.supplier_id,
          suggested_packs: i.suggested_packs_order,
          unit_cost_ghs: i.unit_cost_ghs,
        }));

      const res = await apiClient.generateBulkPOFromForecast({
        items: itemsToOrder,
        notes: "Automated PO generation triggered from Predictive Depletion Radar",
      });

      setBulkPoSuccessMessage(res.message);
      loadProcurementData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to generate bulk purchase orders.",
      });
    } finally {
      setIsGeneratingBulkPo(false);
    }
  };

  useEffect(() => {
    loadProcurementData();
    const tabParam = searchParams.get("tab");
    if (tabParam === "reorder" || tabParam === "suppliers" || tabParam === "grn" || tabParam === "po") {
      setActiveTab(tabParam as any);
    }
    if (searchParams.get("new") === "true") {
      setIsNewPoModalOpen(true);
    }
  }, []);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoForm.supplier_id || newPoForm.items.length === 0) return;

    try {
      const res = await apiClient.createPurchaseOrder(newPoForm);
      setPurchaseOrders((prev) => [res, ...prev]);
      setIsNewPoModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `Purchase Order ${res.po_number} successfully issued to ${res.supplier_name}!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to create purchase order.",
      });
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.createSupplier(newSupplierForm);
      setSuppliers((prev) => [res, ...prev]);
      setIsNewSupplierModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `Supplier ${res.name} (${res.code}) successfully registered!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to register supplier.",
      });
    }
  };

  const handleReceiveGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForGrn) return;

    try {
      const grnItems = selectedPoForGrn.items.map((item, idx) => {
        const itemKey = `${item.medication_name}-${idx}`;
        const batch = grnBatchData[itemKey]?.batchNumber || `LOT-${item.medication_name.slice(0, 3).toUpperCase()}-2026`;
        const exp = grnBatchData[itemKey]?.expiryDate || "2028-06-30";
        const retail = parseFloat(grnBatchData[itemKey]?.retailPrice) || item.unit_cost_ghs * 1.4;

        return {
          medication_name: item.medication_name,
          sku: `SKU-${item.medication_name.slice(0, 3).toUpperCase()}`,
          batch_number: batch,
          expiry_date: exp,
          quantity_received: item.quantity_ordered,
          unit_cost_ghs: item.unit_cost_ghs,
          suggested_retail_price_ghs: retail,
        };
      });

      const res = await apiClient.receiveGoodsNote({
        purchase_order_id: selectedPoForGrn.id,
        invoice_number: grnInvoiceNumber || `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        supplier_delivery_note: grnDeliveryNote || "DN-2026-GH",
        items: grnItems,
      });

      setStatusMessage({
        type: "success",
        text: res.message,
      });

      // Update PO status locally
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === selectedPoForGrn.id ? { ...p, status: "RECEIVED" } : p))
      );
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to process Goods Received Note.",
      });
    }
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    if (poFilter === "ALL") return true;
    return po.status === poFilter;
  });

  const filteredReorders = reorders.filter((r) => {
    const q = reorderSearch.toLowerCase();
    return (
      r.medication_name.toLowerCase().includes(q) ||
      r.generic_name.toLowerCase().includes(q) ||
      r.primary_supplier_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Workstation Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pharmaceutical Procurement & Suppliers
              </h1>
              <p className="text-xs text-slate-500">
                Automated Reorder Engine · Purchase Order (PO) Workflows · Goods Received Notes (GRN)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProcurementData}
              className="gap-1.5 text-xs text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewPoModalOpen(true)}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              <PlusCircle className="h-4 w-4" /> Issue Purchase Order
            </Button>
          </div>
        </div>

        {/* Workstation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 pt-2">
          <button
            onClick={() => setActiveTab("po")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "po"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("forecast")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "forecast"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="h-4 w-4 text-rose-500" />
            Predictive Depletion Radar ({forecastData?.critical_stockouts_count || 0})
          </button>
          <button
            onClick={() => setActiveTab("seasonal")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "seasonal"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Seasonal Forecast (AI) ({seasonalData?.forecast_items.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("reorder")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "reorder"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Auto-Reorder Engine ({reorders.length})
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "suppliers"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Supplier Directory ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab("grn")}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${
              activeTab === "grn"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            Receive Goods (GRN)
          </button>
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

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === "po" && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Purchase Orders Ledger
              </CardTitle>
              <p className="text-xs text-slate-500">
                Track status from initial draft approval through vendor delivery and goods receipt.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {["ALL", "APPROVED", "SENT", "RECEIVED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setPoFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    poFilter === f
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">PO Number & Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Total Amount (GHS)</th>
                    <th className="py-3 px-4">Items Ordered</th>
                    <th className="py-3 px-4">Expected Delivery</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {po.po_number}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {new Date(po.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-800 block font-bold">{po.supplier_name}</strong>
                        <span className="text-[10px] text-slate-400">By: {po.created_by_name}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        GHS {po.total_amount_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {po.items_count} SKU Lines
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {po.expected_delivery_date}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            po.status === "RECEIVED"
                              ? "teal"
                              : po.status === "SENT"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {po.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {po.status !== "RECEIVED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPoForGrn(po);
                              setActiveTab("grn");
                            }}
                            className="text-[11px] font-bold text-teal-700 border-teal-300 hover:bg-teal-50"
                          >
                            Receive GRN
                          </Button>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs flex items-center justify-end gap-1">
                            <Check className="h-3.5 w-3.5" /> Stocked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPOs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg mb-2">📦</div>
                          <p className="text-sm font-semibold text-slate-700">No Purchase Orders Recorded</p>
                          <p className="text-xs text-slate-500 mt-0.5">Click "+ Issue Purchase Order" to raise an order with a supplier.</p>
                          <div className="mt-4">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setIsNewPoModalOpen(true)}
                              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                            >
                              <PlusCircle className="h-4 w-4" /> Issue Purchase Order
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: PREDICTIVE DEPLETION RADAR */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {/* Radar Telemetry Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-rose-200 bg-rose-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase font-bold text-rose-700 tracking-wider">
                    Critical Runout (&lt; 7 Days)
                  </p>
                  <p className="text-2xl font-black text-rose-900 mt-1">
                    {forecastData?.critical_stockouts_count || 0}
                  </p>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                    Imminent stockout risk
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase font-bold text-amber-700 tracking-wider">
                    Stockout Warning (&lt; 14 Days)
                  </p>
                  <p className="text-2xl font-black text-amber-900 mt-1">
                    {forecastData?.warning_stockouts_count || 0}
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                    Order buffer recommended
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-teal-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase font-bold text-teal-700 tracking-wider">
                    Monitored SKUs
                  </p>
                  <p className="text-2xl font-black text-teal-900 mt-1">
                    {forecastData?.total_items_monitored || 0}
                  </p>
                  <p className="text-[10px] text-teal-600 font-semibold mt-0.5">
                    Continuous 30-day velocity tracking
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                  <Boxes className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/70">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
                    Restock Commitment
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    GHS {forecastData?.total_estimated_restock_cost_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Auto-computed 30-day safety pack cost
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {bulkPoSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-bold">{bulkPoSuccessMessage}</span>
              </div>
              <button
                onClick={() => setBulkPoSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Radar Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Predictive Stock Depletion Radar &amp; Runout Timeline
                </CardTitle>
                <p className="text-xs text-slate-500">
                  30-Day Dispensation Velocity $\times$ Remaining Batch Stock $\rightarrow$ Calendar Runout Projection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBulkPoModalOpen(true)}
                  className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  <Zap className="h-4 w-4" /> 1-Click Convert Forecast to PO
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Medication SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">30-Day Dispensed</th>
                      <th className="py-3 px-4">Daily Velocity</th>
                      <th className="py-3 px-4">Days Left</th>
                      <th className="py-3 px-4">Runout Date</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Suggested Restock</th>
                      <th className="py-3 px-4">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {forecastData?.forecast_timeline.map((item) => (
                      <tr key={item.medication_id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-900 block font-bold">{item.medication_name}</strong>
                          <span className="text-[11px] text-slate-500">{item.brand_name} · {item.sku}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {item.category}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.current_stock} units
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item.dispensed_last_30_days} units
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                          {item.daily_velocity} / day
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                              item.urgency === "CRITICAL"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : item.urgency === "WARNING"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {item.days_until_depletion} days
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.predicted_runout_date}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              item.urgency === "CRITICAL"
                                ? "danger"
                                : item.urgency === "WARNING"
                                ? "warning"
                                : "teal"
                            }
                            className="text-[10px] font-bold uppercase"
                          >
                            {item.urgency}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-teal-800 block">
                            +{item.suggested_packs_order} packs
                          </span>
                          <span className="text-[10px] text-slate-500">
                            GHS {item.estimated_po_cost_ghs.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="block font-medium">{item.supplier_name}</span>
                          <span className="text-[10px] text-slate-400">Lead: {item.lead_time_days} days</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: SEASONAL DEMAND FORECAST (AI) */}
      {activeTab === "seasonal" && (
        <div className="space-y-6">
          {/* Climate & Vector Surge Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white border border-indigo-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="text-base font-extrabold tracking-tight">
                  Seasonal Demand Forecasting Engine · {seasonalData?.season_name || "Rainy / Harmattan Cycle"}
                </h3>
              </div>
              <p className="text-xs text-indigo-200">
                {seasonalData?.climate_driver || "Precipitation Surge + Ambient Humidity Spikes (West Africa Region)"}
              </p>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-300 block">Total Forecasted Spend</span>
                <strong className="text-xl font-black font-mono text-emerald-400">
                  GHS {seasonalData?.total_forecasted_spend_ghs.toLocaleString() || "105,800.00"}
                </strong>
              </div>
            </div>
          </div>

          {/* Forecast Cards Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  3-Month Forward Inventory Projections & Historical Multipliers
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated against 30-day velocity burn rates with climate surge buffers
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNewPoForm({
                    supplier_id: suppliers[0]?.id || "",
                    supplier_name: suppliers[0]?.name || "",
                    expected_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                    notes: "Automated Bulk PO for Seasonal Peak Surge",
                    items: (seasonalData?.forecast_items || []).map((item) => ({
                      medication_name: item.medication_name,
                      quantity_ordered: item.recommended_order_quantity,
                      unit_cost_ghs: Number((item.estimated_purchase_cost_ghs / Math.max(1, item.recommended_order_quantity)).toFixed(2)),
                    })),
                  });
                  setIsNewPoModalOpen(true);
                }}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <Zap className="h-4 w-4" /> 1-Click Draft Seasonal Bulk PO
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Medication</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Stock on Hand</th>
                      <th className="py-3 px-4">Daily Velocity</th>
                      <th className="py-3 px-4">Seasonal Multiplier</th>
                      <th className="py-3 px-4">Primary Surge Driver</th>
                      <th className="py-3 px-4">Recommended Restock</th>
                      <th className="py-3 px-4">Estimated Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {seasonalData?.forecast_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-900 block font-bold">{item.medication_name}</strong>
                          <span className="text-[10px] text-slate-400">{item.stockout_risk_level}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.current_stock_on_hand} units
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item.daily_velocity} / day
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded-md font-bold text-indigo-700 bg-indigo-50 border border-indigo-100">
                            {item.seasonal_factor_multiplier}x
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate text-[11px]">
                          {item.primary_surge_driver}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          +{item.recommended_order_quantity} units
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          GHS {item.estimated_purchase_cost_ghs.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: AUTO-REORDER ENGINE */}
      {activeTab === "reorder" && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Automated Inventory Reorder Recommendation Engine
              </CardTitle>
              <p className="text-xs text-slate-500">
                Dynamic threshold alerts based on stock buffer + 30-day dispensing velocity allowance.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reorder candidates..."
                value={reorderSearch}
                onChange={(e) => setReorderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Medication</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Stock / Buffer</th>
                    <th className="py-3 px-4">Monthly Velocity</th>
                    <th className="py-3 px-4">Suggested Reorder Qty</th>
                    <th className="py-3 px-4">Estimated Total Cost</th>
                    <th className="py-3 px-4">Primary Supplier</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredReorders.map((item, idx) => (
                    <tr key={`${item.medication_name}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-bold">{item.medication_name}</strong>
                        <span className="text-[11px] text-slate-500">{item.generic_name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {item.category}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.stockout_risk_level === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.current_stock} / {item.reorder_threshold} units
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {item.monthly_sales_velocity} / month
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                        {item.suggested_reorder_qty} units
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        GHS {item.estimated_total_cost_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {item.primary_supplier_name} ({item.lead_time_days}d lead)
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            const supp = suppliers.find((s) => s.name.includes(item.primary_supplier_name.split(" ")[0])) || suppliers[0];
                            setNewPoForm({
                              supplier_id: supp?.id || "11111111-1111-1111-1111-111111111111",
                              supplier_name: supp?.name || item.primary_supplier_name,
                              expected_delivery_date: new Date(Date.now() + item.lead_time_days * 86400000).toISOString().split("T")[0],
                              notes: `Auto-reorder generated for low stock item (${item.current_stock} remaining)`,
                              items: [
                                {
                                  medication_name: item.medication_name,
                                  quantity_ordered: item.suggested_reorder_qty,
                                  unit_cost_ghs: item.estimated_unit_cost_ghs,
                                },
                              ],
                            });
                            setIsNewPoModalOpen(true);
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-xs font-bold"
                        >
                          Issue PO
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredReorders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 px-4 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 rounded-full bg-emerald-50 border border-emerald-200">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                          </div>
                          <p className="text-sm font-semibold text-emerald-700">All Stock Levels Optimal</p>
                          <p className="text-xs text-slate-400 max-w-xs">
                            No reorder suggestions at this time. All monitored SKUs maintain healthy stock buffers above their safety thresholds.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SUPPLIER DIRECTORY */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Accredited Pharmaceutical Suppliers</h3>
              <p className="text-xs text-slate-500">
                Registered distributors, payment terms, and credit limits.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewSupplierModalOpen(true)}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              <PlusCircle className="h-4 w-4" /> Add Wholesale Supplier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <Card key={s.id} className="p-5 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                    {s.code}
                  </span>
                  <Badge variant="teal" className="text-[10px]">
                    ★ {s.rating} Rating
                  </Badge>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  <p className="text-xs text-slate-500">{s.contact_person} · {s.phone}</p>
                  <p className="text-xs text-slate-500 truncate">{s.email}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Credit Terms:</span>
                    <strong className="text-slate-800">{s.credit_terms.replace("_", " ")}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Credit Limit:</span>
                    <strong className="text-slate-800 font-mono">GHS {s.credit_limit_ghs.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Lead Time:</span>
                    <strong className="text-slate-800">{s.lead_time_days} business days</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECEIVE GOODS NOTE (GRN) */}
      {activeTab === "grn" && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Goods Received Note (GRN) & Lot Allocation Desk
            </CardTitle>
            <p className="text-xs text-slate-500">
              Verify vendor delivery notes, assign lot numbers, expiry dates, and establish retail prices.
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {purchaseOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No purchase orders available for goods receipt.
              </div>
            ) : (
              <form onSubmit={handleReceiveGrn} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Purchase Order *
                    </label>
                    <select
                      value={selectedPoForGrn?.id || ""}
                      onChange={(e) => {
                        const po = purchaseOrders.find((p) => p.id === e.target.value);
                        setSelectedPoForGrn(po || null);
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                    >
                      {purchaseOrders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.po_number} · {p.supplier_name} (GHS {p.total_amount_ghs})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Invoice # *
                    </label>
                    <Input
                      value={grnInvoiceNumber}
                      onChange={(e) => setGrnInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-ECL-88210"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Note / Waybill #
                    </label>
                    <Input
                      value={grnDeliveryNote}
                      onChange={(e) => setGrnDeliveryNote(e.target.value)}
                      placeholder="e.g. DN-2026-99"
                    />
                  </div>
                </div>

                {selectedPoForGrn && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Receiving Items for {selectedPoForGrn.po_number}</span>
                      <span>Supplier: {selectedPoForGrn.supplier_name}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {selectedPoForGrn.items.map((item, idx) => {
                        const itemKey = `${item.medication_name}-${idx}`;
                        return (
                          <div
                            key={itemKey}
                            className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-48">
                              <strong className="text-slate-900 block font-bold">
                                {item.medication_name}
                              </strong>
                              <span className="text-slate-500 font-mono">
                                Ordered: {item.quantity_ordered} units @ GHS {item.unit_cost_ghs}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                              <Input
                                label="Assigned Lot / Batch #"
                                placeholder="e.g. LOT-2026-44"
                                value={grnBatchData[itemKey]?.batchNumber || ""}
                                onChange={(e) =>
                                  setGrnBatchData({
                                    ...grnBatchData,
                                    [itemKey]: {
                                      ...grnBatchData[itemKey],
                                      batchNumber: e.target.value,
                                    },
                                  })
                                }
                              />
                              <Input
                                label="Expiry Date"
                                type="date"
                                value={grnBatchData[itemKey]?.expiryDate || "2028-06-30"}
                                onChange={(e) =>
                                  setGrnBatchData({
                                    ...grnBatchData,
                                    [itemKey]: {
                                      ...grnBatchData[itemKey],
                                      expiryDate: e.target.value,
                                    },
                                  })
                                }
                              />
                              <Input
                                label="Retail Price (GHS)"
                                type="number"
                                step="0.5"
                                placeholder={`e.g. ${(item.unit_cost_ghs * 1.4).toFixed(2)}`}
                                value={grnBatchData[itemKey]?.retailPrice || ""}
                                onChange={(e) =>
                                  setGrnBatchData({
                                    ...grnBatchData,
                                    [itemKey]: {
                                      ...grnBatchData[itemKey],
                                      retailPrice: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-teal-600 hover:bg-teal-700 font-bold text-xs"
                  >
                    Confirm GRN & Receive Stock into Inventory
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* New PO Modal */}
      {isNewPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Issue Supplier Purchase Order
                </h3>
              </div>
              <button
                onClick={() => setIsNewPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier / Wholesaler *
                </label>
                <select
                  value={newPoForm.supplier_id}
                  onChange={(e) => {
                    const s = suppliers.find((x) => x.id === e.target.value);
                    setNewPoForm({
                      ...newPoForm,
                      supplier_id: e.target.value,
                      supplier_name: s ? s.name : "",
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) · {s.credit_terms}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Expected Delivery Date *
                </label>
                <Input
                  type="date"
                  value={newPoForm.expected_delivery_date}
                  onChange={(e) =>
                    setNewPoForm({ ...newPoForm, expected_delivery_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Line Items</label>
                {newPoForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Medication Name"
                      value={item.medication_name}
                      onChange={(e) => {
                        const updated = [...newPoForm.items];
                        updated[idx].medication_name = e.target.value;
                        setNewPoForm({ ...newPoForm, items: updated });
                      }}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity_ordered}
                      onChange={(e) => {
                        const updated = [...newPoForm.items];
                        updated[idx].quantity_ordered = parseInt(e.target.value) || 1;
                        setNewPoForm({ ...newPoForm, items: updated });
                      }}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      min="1"
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Cost"
                      value={item.unit_cost_ghs}
                      onChange={(e) => {
                        const updated = [...newPoForm.items];
                        updated[idx].unit_cost_ghs = parseFloat(e.target.value) || 0;
                        setNewPoForm({ ...newPoForm, items: updated });
                      }}
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsNewPoModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 font-bold"
                >
                  Approve & Issue PO
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Register Wholesale Supplier
                </h3>
              </div>
              <button
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <Input
                label="Company / Distributor Name *"
                value={newSupplierForm.name}
                onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                placeholder="e.g. M&G Pharmaceuticals Ltd"
                required
              />

              <Input
                label="Key Contact Person *"
                value={newSupplierForm.contact_person}
                onChange={(e) =>
                  setNewSupplierForm({ ...newSupplierForm, contact_person: e.target.value })
                }
                placeholder="e.g. Kofi Mensah (Sales Manager)"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Email Address *"
                  type="email"
                  value={newSupplierForm.email}
                  onChange={(e) =>
                    setNewSupplierForm({ ...newSupplierForm, email: e.target.value })
                  }
                  required
                />
                <Input
                  label="Phone Number *"
                  value={newSupplierForm.phone}
                  onChange={(e) =>
                    setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Terms</label>
                  <select
                    value={newSupplierForm.credit_terms}
                    onChange={(e) =>
                      setNewSupplierForm({
                        ...newSupplierForm,
                        credit_terms: e.target.value as SupplierCreditTerms,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                    <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                  </select>
                </div>

                <Input
                  label="Lead Time (Days)"
                  type="number"
                  value={newSupplierForm.lead_time_days?.toString()}
                  onChange={(e) =>
                    setNewSupplierForm({
                      ...newSupplierForm,
                      lead_time_days: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 font-bold"
                >
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click Bulk PO Generation Modal */}
      {isBulkPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    1-Click Bulk Purchase Order Generator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Converts critical &amp; warning stock depletion items into supplier POs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Restock Scope &amp; Safety Stock Buffer</p>
                  <p className="text-[11px] text-amber-700">
                    Includes {forecastData?.forecast_timeline.filter((i) => i.urgency !== "NORMAL").length || 0} priority medications with &le; 14 days inventory left.
                  </p>
                </div>
                <Badge variant="warning" className="font-bold">
                  30-Day Buffer
                </Badge>
              </div>

              <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Medication</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Days Left</th>
                    <th className="py-2.5 px-3">Suggested Order</th>
                    <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastData?.forecast_timeline
                    .filter((i) => i.urgency !== "NORMAL")
                    .map((item) => (
                      <tr key={item.medication_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">{item.medication_name}</span>
                          <span className="text-[10px] text-slate-400">{item.sku}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.supplier_name.split(" ")[0]}</td>
                        <td className="py-2 px-3">
                          <span className="text-rose-700 font-bold font-mono">{item.days_until_depletion}d</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-teal-800">
                          {item.suggested_packs_order} packs
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          GHS {item.estimated_po_cost_ghs.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Total Purchase Commitment:</span>
                <span className="font-black text-sm text-slate-900 font-mono">
                  GHS {forecastData?.forecast_timeline
                    .filter((i) => i.urgency !== "NORMAL")
                    .reduce((acc, i) => acc + i.estimated_po_cost_ghs, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsBulkPoModalOpen(false)}
                disabled={isGeneratingBulkPo}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={async () => {
                  await handleExecuteBulkPo();
                  setIsBulkPoModalOpen(false);
                }}
                disabled={isGeneratingBulkPo}
                className="bg-rose-600 hover:bg-rose-700 font-bold text-white gap-2"
              >
                {isGeneratingBulkPo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating POs...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Confirm &amp; Issue Purchase Orders
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PharmacyProcurementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          Loading procurement portal...
        </div>
      }
    >
      <ProcurementContent />
    </Suspense>
  );
}

