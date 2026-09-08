"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw,
  Trash2,
  Layers,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";

const apiClient = createApiClient();

export default function SuperintendentBatchQuarantinePage() {
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Freeze form
  const [batchNo, setBatchNo] = useState("LOT-IBU-2026-04");
  const [medName, setMedName] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("QUALITY_DEFECT");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("7749");

  // Resolve form
  const [resolution, setResolution] = useState("RETURN_TO_SUPPLIER");
  const [debitNote, setDebitNote] = useState("DN-TOB-2026-991");
  const [witness, setWitness] = useState("FDA Officer Kwame Boateng");

  const [batches, setBatches] = useState<any[]>([]);

  const loadBatches = async () => {
    try {
      const batches = (await (apiClient as any).getQuarantineBatches?.()) ?? [];
      setBatches(batches);
    } catch {
      setBatches([]);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleFreezeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLot = {
      id: `QR-2026-00${batches.length + 1}`,
      medName,
      batchNo,
      quantity,
      reason,
      supplier,
      debitNote: `DN-GEN-${Math.floor(100 + Math.random() * 900)}`,
      quarantinedAt: "Just now",
      status: "QUARANTINED_LOCKED",
      notes,
    };
    setBatches([newLot, ...batches]);
    setSuccessMessage("Batch Lot Quarantined and Frozen on All POS Terminals!");
    setTimeout(() => {
      setSuccessMessage(null);
      setFreezeModalOpen(false);
    }, 1200);
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBatches(
      batches.map((q) =>
        q.id === selectedBatch.id
          ? {
              ...q,
              status: "RESOLVED",
              resolution,
              resolvedAt: "Just now",
              debitNote,
            }
          : q
      )
    );
    setSuccessMessage("Quarantine Action Resolved & Certified!");
    setTimeout(() => {
      setSuccessMessage(null);
      setResolveModalOpen(false);
      setSelectedBatch(null);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" /> Batch Quarantine & National FDA Recall Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enforce immediate POS checkout blocks, generate supplier debit notes, and log witnessed disposal certificates
          </p>
        </div>

        <Button
          onClick={() => setFreezeModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
        >
          <Lock className="h-4 w-4" /> Freeze / Quarantine Batch Lot
        </Button>
      </div>

      {/* Quarantined Lots Grid */}
      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No quarantined stock or active FDA drug recalls.
          </div>
        ) : (
          batches.map((lot) => (
            <Card
              key={lot.id}
              className={`p-5 border bg-white shadow-sm space-y-4 ${
                lot.status === "QUARANTINED_LOCKED"
                  ? "border-amber-400 bg-amber-50/20"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {lot.id} • {lot.batchNo}
                    </span>
                    <Badge
                      variant={lot.status === "QUARANTINED_LOCKED" ? "warning" : "teal"}
                      className="text-[10px] font-bold"
                    >
                      {lot.status === "QUARANTINED_LOCKED" ? "LOCKED ON POS" : "RESOLVED"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {lot.reason}
                    </Badge>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{lot.medName}</h3>
                  <p className="text-xs text-slate-500">
                    Supplier: <strong>{lot.supplier}</strong> • Quarantined: {lot.quarantinedAt}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center px-4">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">
                      QUARANTINE QTY
                    </span>
                    <strong className="text-lg font-black text-slate-900 font-mono">
                      {lot.quantity} Units
                    </strong>
                  </div>

                  {lot.status === "QUARANTINED_LOCKED" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBatch(lot);
                        setResolveModalOpen(true);
                      }}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="h-4 w-4" /> Resolve Quarantine
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                {lot.notes}
              </p>
            </Card>
          ))
        )}
      </div>

      {/* Freeze Batch Modal */}
      {freezeModalOpen && (
        <Modal
          isOpen={freezeModalOpen}
          onClose={() => setFreezeModalOpen(false)}
          title="Quarantine & Freeze Batch Lot"
          description="Sets available inventory on POS to 0 and blocks all dispensing."
        >
          <form onSubmit={handleFreezeSubmit} className="py-4 space-y-3 text-xs">
            {successMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">{successMessage}</h3>
              </div>
            ) : (
              <>
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
                    <label className="block font-bold text-slate-800 mb-1">Medication Name</label>
                    <input
                      type="text"
                      required
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quarantine Trigger Reason</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="QUALITY_DEFECT">Packaging Defect / Discoloration</option>
                      <option value="FDA_RECALL">Official Ghana FDA Safety Recall</option>
                      <option value="BATCH_EXPIRY">Near-Expiry Threshold (&lt; 30 Days)</option>
                      <option value="CONTAMINATION_SUSPICION">Suspected Microbial Contamination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Superintendent Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <label className="block font-bold text-amber-950 text-[11px]">
                    Superintendent Pharmacist Authorization PIN (Demo: 7749)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-base font-black rounded-xl border border-amber-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-amber-600/20 bg-amber-600 hover:bg-amber-700 text-white mt-2"
                >
                  Authorize Batch Quarantine & Lock POS
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* Resolve Quarantine Modal */}
      {resolveModalOpen && selectedBatch && (
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title={`Resolve Quarantined Lot — ${selectedBatch.id}`}
          description={`Batch: ${selectedBatch.batchNo} • ${selectedBatch.medName}`}
        >
          <form onSubmit={handleResolveSubmit} className="py-4 space-y-3 text-xs">
            {successMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">{successMessage}</h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Resolution Action</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="RETURN_TO_SUPPLIER">Return to Supplier (Issue Debit Note)</option>
                    <option value="WITNESSED_DESTRUCTION">Witnessed Destruction (FDA Officer Present)</option>
                    <option value="QUALITY_RELEASE">Quality Release (QC Tested & Cleared)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Supplier Debit Note Reference</label>
                  <input
                    type="text"
                    value={debitNote}
                    onChange={(e) => setDebitNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Witness / Authorized Officer</label>
                  <input
                    type="text"
                    value={witness}
                    onChange={(e) => setWitness(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  Certify & Close Quarantine Record
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
