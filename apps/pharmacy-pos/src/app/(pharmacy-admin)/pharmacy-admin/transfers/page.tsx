"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Boxes,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
  Check,
  Ban,
  RefreshCw,
  MapPin,
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
  StockTransfer,
  StockTransferStatus,
  StockTransferCreateInput,
  StockTransferItemInput,
} from "@medipaedia/api-client";

export default function PharmacyBranchTransfersPage() {
  const apiClient = createApiClient();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; location?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);

  const [newTransferForm, setNewTransferForm] = useState<StockTransferCreateInput>({
    destination_branch_name: "",
    transfer_type: "INTER_BRANCH",
    notes: "",
    items: [],
  });

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadTransfers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getStockTransfers();
      setTransfers(data || []);
    } catch (err: any) {
      console.warn("Transfers fetch error:", err.message);
      setTransfers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.createStockTransfer(newTransferForm);
      setTransfers((prev) => [res, ...prev]);
      setIsNewTransferModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `Stock Transfer ${res.transfer_number} dispatched to ${res.destination_branch}!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to create stock transfer.",
      });
    }
  };

  const handleUpdateStatus = async (
    transferId: string,
    action: "DISPATCH" | "RECEIVE" | "REJECT"
  ) => {
    try {
      const res = await apiClient.updateStockTransferStatus(
        transferId,
        action,
        "Pharm. Administrator"
      );
      setTransfers((prev) => prev.map((t) => (t.id === transferId ? res : t)));
      setStatusMessage({
        type: "success",
        text: `Transfer ${res.transfer_number} marked as ${res.status}.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update transfer status.",
      });
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    const q = searchQuery.toLowerCase();
    return (
      t.transfer_number.toLowerCase().includes(q) ||
      t.destination_branch.toLowerCase().includes(q) ||
      t.source_branch.toLowerCase().includes(q)
    );
  });

  const totalInTransit = transfers.filter((t) => t.status === "IN_TRANSIT").length;
  const inTransitVal = transfers
    .filter((t) => t.status === "IN_TRANSIT")
    .reduce((acc, curr) => acc + curr.total_value_ghs, 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <ArrowLeftRight className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Inter-Branch Stock Transfers (IBT) Desk
              </h1>
              <p className="text-xs text-slate-500">
                Multi-Branch Dispensary Logistics · Atomic Stock Reservation & In-Transit Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTransfers}
              className="gap-1.5 text-xs text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewTransferModalOpen(true)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <PlusCircle className="h-4 w-4" /> Dispatch Stock Transfer
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">TOTAL TRANSFERS</span>
            <strong className="text-xl font-bold text-slate-800">{transfers.length} Shipments</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">IN-TRANSIT ACTIVE</span>
            <strong className="text-xl font-bold text-amber-900">{totalInTransit} On the Road</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] uppercase font-bold text-blue-600 block">IN-TRANSIT VALUATION</span>
            <strong className="text-xl font-bold text-blue-900 font-mono">GHS {inTransitVal.toLocaleString()}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">COMPLETED DELIVERIES</span>
            <strong className="text-xl font-bold text-emerald-900">
              {transfers.filter((t) => t.status === "RECEIVED").length} Received
            </strong>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by IBT #, destination branch, or courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {["ALL", "IN_TRANSIT", "DISPATCHED", "RECEIVED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
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

      {/* Transfer Ledger Table */}
      <Card>
        <CardContent className="p-0">
          {transfers.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs text-slate-500">No inter-branch transfers requested.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Transfer # & Date</th>
                    <th className="py-3.5 px-4">Route & Destination Branch</th>
                    <th className="py-3.5 px-4">Total Valuation (GHS)</th>
                    <th className="py-3.5 px-4">Items / SKUs</th>
                    <th className="py-3.5 px-4">Courier / Vehicle</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {t.transfer_number}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {new Date(t.dispatched_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span>{t.source_branch}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-blue-700">{t.destination_branch}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">By: {t.dispatched_by}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        GHS {t.total_value_ghs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {t.total_items_count} SKU Lines
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {t.driver_or_courier_name}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            t.status === "RECEIVED"
                              ? "teal"
                              : t.status === "IN_TRANSIT"
                              ? "warning"
                              : t.status === "DISPATCHED"
                              ? "cyan"
                              : "danger"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {t.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {t.status === "IN_TRANSIT" || t.status === "DISPATCHED" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(t.id, "RECEIVE")}
                              className="text-[11px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" /> Receive to Stock
                            </Button>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Accepted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Transfer Modal */}
      {isNewTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Dispatch Inter-Branch Stock Transfer (IBT)
                </h3>
              </div>
              <button
                onClick={() => setIsNewTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destination Branch / Satellite Dispensary *
                </label>
                <select
                  value={newTransferForm.destination_branch_name}
                  onChange={(e) =>
                    setNewTransferForm({
                      ...newTransferForm,
                      destination_branch_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Select destination branch
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                      {b.location ? ` (${b.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transfer Type
                </label>
                <select
                  value={newTransferForm.transfer_type}
                  onChange={(e) =>
                    setNewTransferForm({ ...newTransferForm, transfer_type: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="INTER_BRANCH">Inter-Branch Stock Transfer</option>
                  <option value="WAREHOUSE_REPLENISHMENT">Warehouse Replenishment</option>
                  <option value="EMERGENCY_BORROW">Emergency Mutual Aid / Borrow</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Transfer Items</label>
                {newTransferForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <Input
                      placeholder="Medication Name"
                      value={item.medication_name}
                      onChange={(e) => {
                        const updated = [...newTransferForm.items];
                        updated[idx].medication_name = e.target.value;
                        setNewTransferForm({ ...newTransferForm, items: updated });
                      }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Batch #"
                        value={item.batch_number}
                        onChange={(e) => {
                          const updated = [...newTransferForm.items];
                          updated[idx].batch_number = e.target.value;
                          setNewTransferForm({ ...newTransferForm, items: updated });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...newTransferForm.items];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setNewTransferForm({ ...newTransferForm, items: updated });
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                        min="1"
                      />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Unit Cost"
                        value={item.unit_cost_ghs}
                        onChange={(e) => {
                          const updated = [...newTransferForm.items];
                          updated[idx].unit_cost_ghs = parseFloat(e.target.value) || 0;
                          setNewTransferForm({ ...newTransferForm, items: updated });
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsNewTransferModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 font-bold"
                >
                  Confirm & Dispatch Shipment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
