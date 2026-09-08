"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Package,
  Search,
  Filter,
  ArrowUpDown,
  History,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function DispensaryFEFOInventoryPage() {
  const [search, setSearch] = useState("");
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockSuccess, setStockSuccess] = useState(false);

  // Form state
  const [medName, setMedName] = useState("Amoxicillin 500mg Capsules");
  const [batchNo, setBatchNo] = useState("LOT-AMX-2026-09");
  const [expiry, setExpiry] = useState("2027-08-30");
  const [quantity, setQuantity] = useState(100);
  const [unitCost, setUnitCost] = useState("18.50");

  const [batches, setBatches] = useState([
    {
      id: "b-01",
      medName: "Coartem (Artemether/Lumefantrine 20/120mg)",
      generic: "Artemether + Lumefantrine",
      batchNo: "LOT-COA-2026-01",
      expiry: "30 Nov 2027",
      daysLeft: 467,
      stock: 48,
      minStock: 20,
      unitPriceGhs: 45.0,
      status: "OPTIMAL",
    },
    {
      id: "b-02",
      medName: "Paracetamol 500mg Tablets (Ernest)",
      generic: "Paracetamol",
      batchNo: "LOT-PCM-2026-03",
      expiry: "20 Sep 2027",
      daysLeft: 396,
      stock: 250,
      minStock: 50,
      unitPriceGhs: 6.0,
      status: "OPTIMAL",
    },
    {
      id: "b-03",
      medName: "Augmentin 625mg Tablets (GSK)",
      generic: "Amoxicillin + Clavulanic Acid",
      batchNo: "LOT-AUG-2026-02",
      expiry: "15 Sep 2026",
      daysLeft: 26,
      stock: 12,
      minStock: 25,
      unitPriceGhs: 95.0,
      status: "EXPIRING_SOON",
    },
    {
      id: "b-04",
      medName: "Salbutamol 100mcg Inhaler (Ventolin)",
      generic: "Salbutamol Sulfate",
      batchNo: "LOT-SAL-2026-04",
      expiry: "10 Oct 2026",
      daysLeft: 51,
      stock: 6,
      minStock: 15,
      unitPriceGhs: 40.0,
      status: "LOW_STOCK",
    },
  ]);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newB = {
      id: `b-0${batches.length + 1}`,
      medName,
      generic: "Active Molecule",
      batchNo,
      expiry,
      daysLeft: 365,
      stock: quantity,
      minStock: 20,
      unitPriceGhs: parseFloat(unitCost) || 20.0,
      status: "OPTIMAL",
    };
    setBatches([newB, ...batches]);
    setStockSuccess(true);
    setTimeout(() => {
      setStockSuccess(false);
      setStockModalOpen(false);
    }, 1200);
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.medName.toLowerCase().includes(search.toLowerCase()) ||
      b.batchNo.toLowerCase().includes(search.toLowerCase()) ||
      b.generic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-700" /> First-Expiry, First-Out (FEFO) Batch Inventory Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time shelf tracking, automated batch lot rotation, and proactive expiry countdowns
          </p>
        </div>

        <Button
          onClick={() => setStockModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Receive New Batch Lot
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Active Batches</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{batches.length}</div>
          <span className="text-xs text-teal-700 font-bold">100% FEFO Indexed</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-rose-700 uppercase">Expiring &lt; 30 Days</span>
          <div className="text-2xl font-black text-rose-900 font-mono">
            {batches.filter((b) => b.daysLeft <= 30).length} Batches
          </div>
          <span className="text-xs text-rose-700 font-bold">Priority FEFO Clearance</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Low Stock Alerts</span>
          <div className="text-2xl font-black text-amber-900 font-mono">
            {batches.filter((b) => b.stock <= b.minStock).length} SKUs
          </div>
          <span className="text-xs text-amber-700 font-bold">Reorder Triggered</span>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-teal-700 uppercase">Inventory Valuation</span>
          <div className="text-2xl font-black text-teal-950 font-mono">
            GHS {batches.reduce((acc, b) => acc + b.stock * b.unitPriceGhs, 0).toFixed(2)}
          </div>
          <span className="text-xs text-teal-800 font-bold">Wholesale Value</span>
        </div>
      </div>

      {/* Batch Table */}
      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by drug name, generic molecule, or batch number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Medication & Molecule</th>
                <th className="p-3">Batch Number</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3 text-center">Shelf Life Countdown</th>
                <th className="p-3 text-center">In Stock</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-center">FEFO Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    <strong className="text-slate-900 block">{b.medName}</strong>
                    <span className="text-[10px] text-slate-400 font-medium">{b.generic}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800">{b.batchNo}</td>
                  <td className="p-3 font-mono text-slate-600">{b.expiry}</td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={b.daysLeft <= 30 ? "danger" : b.daysLeft <= 60 ? "warning" : "teal"}
                      className="font-mono text-[10px]"
                    >
                      {b.daysLeft} days remaining
                    </Badge>
                  </td>
                  <td className="p-3 font-mono font-bold text-center text-slate-900">
                    {b.stock} units
                  </td>
                  <td className="p-3 font-mono font-bold text-right text-slate-900">
                    GHS {b.unitPriceGhs.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={b.status === "EXPIRING_SOON" ? "danger" : b.status === "LOW_STOCK" ? "warning" : "teal"}
                      className="text-[9px]"
                    >
                      {b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Receive Batch Modal */}
      {stockModalOpen && (
        <Modal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          title="Receive & Ingest Batch Lot (FEFO Intake)"
          description="Log newly received pharmaceutical stock with manufacturing batch number and expiry date."
        >
          <form onSubmit={handleAddBatch} className="py-4 space-y-3 text-xs">
            {stockSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Batch Lot Added to FEFO Master!</h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Batch Lot Number</label>
                    <input
                      type="text"
                      required
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quantity Received</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Unit Selling Price (GHS)</label>
                    <input
                      type="number"
                      step="0.10"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  Ingest Batch Lot into FEFO Matrix
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
