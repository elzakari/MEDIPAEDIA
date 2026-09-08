"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function SuperintendentCompoundingPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Form state
  const [formulaName, setFormulaName] = useState("Pediatric Chloral Hydrate Syrup 100mg/5mL");
  const [ingredients, setIngredients] = useState("Chloral Hydrate Crystals BP 10g, Simple Syrup BP 80mL");
  const [qty, setQty] = useState("500 mL");
  const [bud, setBud] = useState("14 Days BUD (26 Aug 2026)");
  const [compiler, setCompiler] = useState("Pharm. Efua Danso");
  const [storage, setStorage] = useState("Amber glass bottle at 2°C - 8°C. Do not freeze.");

  const [formulas, setFormulas] = useState([
    {
      id: "CMP-2026-01",
      name: "Pediatric Chloral Hydrate Syrup 100mg/5mL",
      ingredients: ["Chloral Hydrate Crystals BP 10g", "Simple Syrup BP 80mL", "Flavoring Essence qs"],
      qty: "500 mL",
      prepDate: "12 Aug 2026",
      bud: "26 Aug 2026 (14 Days BUD)",
      compiler: "Pharm. Efua Danso",
      verifier: "Pharm. Kojo Asante (FPCPharm)",
      storage: "Amber glass bottle at 2°C - 8°C. Do not freeze.",
    },
    {
      id: "CMP-2026-02",
      name: "Salicylic Acid 2% + Sulfur 5% Ointment",
      ingredients: ["Salicylic Acid Powder BP 2g", "Precipitated Sulfur 5g", "White Soft Paraffin BP 93g"],
      qty: "200 g",
      prepDate: "14 Aug 2026",
      bud: "14 Nov 2026 (90 Days BUD)",
      compiler: "Pharm. Kojo Asante",
      verifier: "Pharm. Kojo Asante (FPCPharm)",
      storage: "Store in airtight opaque container below 25°C.",
    },
  ]);

  const handleAddCompound = (e: React.FormEvent) => {
    e.preventDefault();
    const newC = {
      id: `CMP-2026-0${formulas.length + 1}`,
      name: formulaName,
      ingredients: ingredients.split(",").map((s) => s.trim()),
      qty,
      prepDate: "Just now",
      bud,
      compiler,
      verifier: "Pharm. Kojo Asante (FPCPharm)",
      storage,
    };
    setFormulas([newC, ...formulas]);
    setLogSuccess(true);
    setTimeout(() => {
      setLogSuccess(false);
      setLogModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-700" /> Extemporaneous Compounding & Beyond-Use Dates (BUD)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Master formula records, active ingredient traceability, and pharmaceutical compounding compliance
          </p>
        </div>

        <Button
          onClick={() => setLogModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20"
        >
          <Plus className="h-4 w-4" /> Record Compounded Preparation
        </Button>
      </div>

      {/* Formulas List */}
      <div className="space-y-4">
        {formulas.map((f) => (
          <Card
            key={f.id}
            className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-emerald-400 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-emerald-900">{f.id}</span>
                  <Badge variant="teal" className="text-[10px] font-bold">
                    ✓ SUPERINTENDENT VERIFIED
                  </Badge>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{f.name}</h3>
                <p className="text-xs text-slate-500">
                  Prepared: <strong>{f.prepDate}</strong> • Yield: <strong>{f.qty}</strong>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center px-4">
                <span className="text-[9px] text-emerald-800 font-bold uppercase block">
                  BEYOND-USE DATE (BUD)
                </span>
                <strong className="text-sm font-black text-emerald-950 font-mono">
                  {f.bud}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <strong className="text-slate-900 font-bold block">Active Formulation Ingredients:</strong>
              <ul className="list-disc list-inside text-slate-700">
                {f.ingredients.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div>Compiled by: <strong className="text-slate-800">{f.compiler}</strong></div>
              <div>Storage: <strong className="text-slate-800">{f.storage}</strong></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Record Compounding Modal */}
      {logModalOpen && (
        <Modal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          title="Record Extemporaneous Compounded Preparation"
          description="Log master formula active ingredients, quantity prepared, and BUD."
        >
          <form onSubmit={handleAddCompound} className="py-4 space-y-3 text-xs">
            {logSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Compounding Record Logged!</h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Preparation / Formula Name</label>
                  <input
                    type="text"
                    required
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Active Ingredients (Comma separated)</label>
                  <textarea
                    rows={2}
                    required
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Batch Yield / Quantity</label>
                    <input
                      type="text"
                      required
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Beyond-Use Date (BUD)</label>
                    <input
                      type="text"
                      required
                      value={bud}
                      onChange={(e) => setBud(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Storage Conditions</label>
                  <input
                    type="text"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-emerald-700/20 bg-emerald-700 hover:bg-emerald-800 text-white mt-2"
                >
                  Verify & Sign Master Compounding Sheet
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
