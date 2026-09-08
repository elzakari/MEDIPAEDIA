"use client";

import React, { useState } from "react";
import {
  Settings,
  AlertTriangle,
  Receipt,
  Save,
  CheckCircle2,
  Building2,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";

export default function PharmacyStoreSettingsPage() {
  const [minStockThreshold, setMinStockThreshold] = useState("10");
  const [expiryWarningDays, setExpiryWarningDays] = useState("60");
  const [pharmacyName, setPharmacyName] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your patronage. Medipaedia Rx Verified.");
  const [thermalWidth, setThermalWidth] = useState("80mm (Standard POS)");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dispensary Store Settings & Stock Thresholds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure FEFO batch expiry lead times, automated reorder triggers, and thermal receipt formats
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Dispensary thresholds and receipt printer preferences updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Inventory & FEFO Thresholds */}
        <Card className="p-6 border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertTriangle className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              FEFO & Stock Depletion Warning Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Stock Low-Level Warning Threshold (Units)
              </label>
              <Input
                type="number"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Triggers visual alert on POS register when batch units drop below this number
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                FEFO Expiry Advance Warning (Days)
              </label>
              <Input
                type="number"
                value={expiryWarningDays}
                onChange={(e) => setExpiryWarningDays(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Flags batches in inventory nearing statutory expiration date
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Thermal Receipt Settings */}
        <Card className="p-6 border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Printer className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Thermal Receipt & POS Printing Setup
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Header Store Name</label>
              <Input
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Printer Paper Width</label>
              <select
                value={thermalWidth}
                onChange={(e) => setThermalWidth(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="80mm (Standard POS)">80mm (Standard POS Thermal)</option>
                <option value="58mm (Compact ESC/POS)">58mm (Compact ESC/POS)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Custom Receipt Footer Message</label>
            <Input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            className="font-bold shadow-md shadow-emerald-700/20"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save Dispensary Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
