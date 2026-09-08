"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Truck,
  PackageCheck,
  Search,
  MapPin,
  Phone,
  Layers,
  Clock,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
} from "@medipaedia/ui";

export interface Branch {
  id: string;
  name: string;
  code: string;
  branch_type: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  is_main_hub: boolean;
  is_active: boolean;
}

export interface IBTItem {
  id?: string;
  medication_name: string;
  sku?: string | null;
  batch_number: string;
  quantity_dispatched: number;
  quantity_received?: number;
  unit_cost?: number;
  notes?: string | null;
}

export interface IBTTransfer {
  id: string;
  transfer_number: string;
  source_branch_id: string;
  destination_branch_id: string;
  source_branch_name?: string;
  destination_branch_name?: string;
  status: string;
  dispatched_at: string;
  received_at?: string | null;
  driver_courier_name?: string | null;
  driver_courier_phone?: string | null;
  notes?: string | null;
  items: IBTItem[];
}

export default function MultiBranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<IBTTransfer[]>([]);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"branches" | "transfers">("transfers");

  // Create Branch Modal
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchType, setBranchType] = useState("DISPENSARY");
  const [branchCity, setBranchCity] = useState("Accra");
  const [branchPhone, setBranchPhone] = useState("+233 30 200 0000");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchError, setBranchError] = useState<string | null>(null);

  // Dispatch IBT Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [destBranchId, setDestBranchId] = useState("");
  const [medName, setMedName] = useState("Artemether + Lumefantrine 20/120mg");
  const [batchNo, setBatchNo] = useState("LOT-ACT-2026-99");
  const [dispatchQty, setDispatchQty] = useState(100);
  const [courierName, setCourierName] = useState("Kofi Adams (Logistics Courier)");
  const [courierPhone, setCourierPhone] = useState("0244123456");
  const [dispatchNotes, setDispatchNotes] = useState("Cold-pack express transfer to replenish weekend stock.");
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, tRes, eRes] = await Promise.allSettled([
        fetch("http://localhost:8000/api/v1/branches").then((r) => r.json()),
        fetch("http://localhost:8000/api/v1/branches/ibt/list").then((r) => r.json()),
        fetch("http://localhost:8000/api/v1/branches/entitlements").then((r) => r.json()),
      ]);

      if (bRes.status === "fulfilled" && Array.isArray(bRes.value)) {
        setBranches(bRes.value);
        if (bRes.value.length > 0) {
          setSourceBranchId(bRes.value[0].id);
          if (bRes.value.length > 1) {
            setDestBranchId(bRes.value[1].id);
          }
        }
      }

      if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) {
        setTransfers(tRes.value);
      }

      if (eRes.status === "fulfilled") {
        setEntitlements(eRes.value);
      }
    } catch {
      // Offline mock data
      const mockBranches: Branch[] = [
        { id: "b-01", name: "Osu Main Hub", code: "OSU-01", branch_type: "MAIN_HUB", is_main_hub: true, is_active: true, city: "Accra", phone: "+233 30 200 1111" },
        { id: "b-02", name: "Ridge Dispensary Outlet", code: "RDG-02", branch_type: "DISPENSARY", is_main_hub: false, is_active: true, city: "Accra", phone: "+233 30 200 2222" },
        { id: "b-03", name: "Tema Port Depot", code: "TMA-03", branch_type: "WAREHOUSE", is_main_hub: false, is_active: true, city: "Tema", phone: "+233 30 200 3333" },
      ];
      setBranches(mockBranches);
      setSourceBranchId("b-01");
      setDestBranchId("b-02");
      setTransfers([
        {
          id: "ibt-01",
          transfer_number: "IBT-2026-1042",
          source_branch_id: "b-01",
          destination_branch_id: "b-02",
          source_branch_name: "Osu Main Hub",
          destination_branch_name: "Ridge Dispensary Outlet",
          status: "DISPATCHED",
          dispatched_at: "Today, 10:15 AM",
          driver_courier_name: "Kofi Adams (Logistics Courier)",
          driver_courier_phone: "0244123456",
          notes: "Replenishing anti-malarial ACT packs for evening shifts.",
          items: [
            { medication_name: "Artemether + Lumefantrine 20/120mg", batch_number: "LOT-ACT-2026-99", quantity_dispatched: 100, quantity_received: 0 },
            { medication_name: "Paracetamol 500mg Tablets", batch_number: "LOT-PCM-2026-04", quantity_dispatched: 250, quantity_received: 0 },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchName,
          code: branchCode,
          branch_type: branchType,
          city: branchCity,
          phone: branchPhone,
          address: branchAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create branch location.");
      }

      setBranchModalOpen(false);
      setBranchName("");
      setBranchCode("");
      loadData();
    } catch (err: any) {
      setBranchError(err.message || "Failed to create branch.");
    }
  };

  const handleDispatchIBT = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/branches/ibt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_branch_id: sourceBranchId,
          destination_branch_id: destBranchId,
          driver_courier_name: courierName,
          driver_courier_phone: courierPhone,
          notes: dispatchNotes,
          items: [
            {
              medication_name: medName,
              batch_number: batchNo,
              quantity_dispatched: dispatchQty,
              unit_cost: 15.0,
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to dispatch Inter-Branch Transfer.");
      }

      setDispatchSuccess(true);
      setTimeout(() => {
        setDispatchSuccess(false);
        setDispatchModalOpen(false);
        loadData();
      }, 1200);
    } catch (err: any) {
      setDispatchError(err.message || "Failed to dispatch transfer.");
    }
  };

  const handleReceiveIBT = async (transferId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/branches/ibt/${transferId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "All quantities verified and credited into destination inventory." }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to accept transfer.");
        return;
      }
      loadData();
    } catch {
      // Local state optimistic update
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? { ...t, status: "RECEIVED", received_at: "Just now" }
            : t
        )
      );
    }
  };

  const isStarter = entitlements?.plan_code === "PLAN-STARTER";
  const maxBranches = entitlements?.limits?.max_branches || 3;
  const activeBranchCount = branches.length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-700" /> Multi-Branch & Inter-Branch Stock Transfers (IBT)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enterprise multi-location inventory synchronization, stock transfer waybills, and destination receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadData()}
            variant="outline"
            size="md"
            className="font-bold gap-2 text-xs border-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>

          <Button
            onClick={() => setBranchModalOpen(true)}
            variant="outline"
            size="md"
            className="font-bold gap-2 text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
          >
            <Plus className="h-3.5 w-3.5" /> Open New Branch
          </Button>

          <Button
            onClick={() => setDispatchModalOpen(true)}
            variant="primary"
            size="md"
            className="font-bold gap-2 text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-700/20"
          >
            <Send className="h-3.5 w-3.5" /> Dispatch IBT Transfer
          </Button>
        </div>
      </div>

      {/* Subscription Quota & Plan Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Subscription Tier
              </p>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {entitlements?.plan_name || "Regional Growth Plan"}
              </h3>
            </div>
            <Badge variant="teal" className="text-xs font-bold font-mono">
              {entitlements?.plan_code || "PLAN-GROWTH"}
            </Badge>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Branch Quota
              </p>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {activeBranchCount} / {maxBranches >= 50 ? "Unlimited" : maxBranches} Locations
              </h3>
            </div>
            <div className="h-8 w-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold font-mono text-xs">
              {Math.max(0, maxBranches - activeBranchCount)} left
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active IBT Transfers
              </p>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {transfers.filter((t) => t.status === "DISPATCHED").length} In-Transit
              </h3>
            </div>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "transfers"
              ? "bg-teal-700 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Inter-Branch Transfers ({transfers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("branches")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "branches"
              ? "bg-teal-700 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Branch Locations Registry ({branches.length})
        </button>
      </div>

      {/* TAB 1: IBT TRANSFERS TABLE */}
      {activeTab === "transfers" && (
        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Transfer Waybill #</th>
                  <th className="p-3">Route (From &rarr; To)</th>
                  <th className="p-3">Dispatched Items</th>
                  <th className="p-3">Logistics & Driver</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No Inter-Branch Transfers dispatched yet. Click "Dispatch IBT Transfer" to initiate stock movement.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-teal-900 block text-xs">
                          {t.transfer_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {t.dispatched_at}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{t.source_branch_name || "Source Hub"}</span>
                          <span className="text-teal-600 font-extrabold">&rarr;</span>
                          <span>{t.destination_branch_name || "Destination Branch"}</span>
                        </div>
                        {t.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                            {t.notes}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {t.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{item.medication_name}</span>
                              <span className="text-[10px] font-mono px-1 py-0.5 bg-slate-100 rounded text-slate-600">
                                Lot: {item.batch_number}
                              </span>
                              <Badge variant="teal" className="text-[10px] font-bold">
                                Qty: {item.quantity_dispatched}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {t.driver_courier_name ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{t.driver_courier_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{t.driver_courier_phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Direct Transfer</span>
                        )}
                      </td>
                      <td className="p-3">
                        {t.status === "RECEIVED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Truck className="h-3 w-3 text-amber-600 animate-pulse" /> In Transit
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {t.status !== "RECEIVED" ? (
                          <Button
                            onClick={() => handleReceiveIBT(t.id)}
                            size="sm"
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1"
                          >
                            <PackageCheck className="h-3 w-3" /> Receive & Credit
                          </Button>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-700 font-bold">
                            Reconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: BRANCH LOCATIONS */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-5 border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">{branch.name}</h3>
                    {branch.is_main_hub && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        PRIMARY HUB
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-700 block mt-0.5">
                    Code: {branch.code}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                  {branch.branch_type}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {branch.city && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{branch.address ? `${branch.address}, ` : ""}{branch.city}</span>
                  </p>
                )}
                {branch.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{branch.phone}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Active Facility
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem("active_branch_id", branch.id);
                    document.cookie = `active_branch_id=${branch.id}; path=/; max-age=2592000; SameSite=Lax`;
                    alert(`Switched active context to: ${branch.name} (${branch.code})`);
                  }}
                  className="text-[11px] font-bold"
                >
                  Switch Context
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: Open New Branch */}
      {branchModalOpen && (
        <Modal
          isOpen={branchModalOpen}
          onClose={() => setBranchModalOpen(false)}
          title="Open New Facility Branch Location"
          description="Registers a new satellite clinic, dispensary outlet, or regional depot."
        >
          <form onSubmit={handleCreateBranch} className="py-3 space-y-3 text-xs">
            {branchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                {branchError}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Facility Name</label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Kumasi Central Dispensary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch Code</label>
                <Input
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KMS-04"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location Type</label>
                <select
                  value={branchType}
                  onChange={(e) => setBranchType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none"
                >
                  <option value="CLINIC">Satellite Clinic</option>
                  <option value="DISPENSARY">Dispensary Outlet</option>
                  <option value="WAREHOUSE">Central Depot / Warehouse</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                <Input
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="e.g. Kumasi"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <Input
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="+233..."
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
              <Input
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="e.g. Bantama High Street, Kumasi"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBranchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                Create Branch Location
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Dispatch IBT Transfer */}
      {dispatchModalOpen && (
        <Modal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          title="Dispatch Inter-Branch Stock Transfer (IBT)"
          description="Generates an official pharmaceutical stock waybill and transfers inventory."
        >
          <form onSubmit={handleDispatchIBT} className="py-3 space-y-3 text-xs">
            {dispatchSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">IBT Stock Transfer Dispatched!</h3>
                <p className="text-xs text-emerald-800">Waybill generated and stock deducted from origin hub.</p>
              </div>
            ) : (
              <>
                {dispatchError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                    {dispatchError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Origin Branch (From)</label>
                    <select
                      value={sourceBranchId}
                      onChange={(e) => setSourceBranchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Destination Branch (To)</label>
                    <select
                      value={destBranchId}
                      onChange={(e) => setDestBranchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Medication / Molecule</label>
                    <Input
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={dispatchQty}
                      onChange={(e) => setDispatchQty(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Batch / Lot Number</label>
                    <Input
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Courier / Driver Name</label>
                    <Input
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waybill Notes & Temperature Precautions</label>
                  <Input
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDispatchModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                    Dispatch Transfer Waybill
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
