"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Printer,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  DollarSign,
  Package,
  Clock,
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
} from "@medipaedia/ui";
import {
  createApiClient,
  ExtendedPharmacySettings,
} from "@medipaedia/api-client";

export default function PharmacyHardwareSettingsPage() {
  const apiClient = createApiClient();

  const [settings, setSettings] = useState<ExtendedPharmacySettings>({
    facility_id: "11111111-1111-1111-1111-111111111111",
    name: "",
    slug: "",
    license_number: "GPC/GAR/2026-PH",
    phone: "+233 30 277 8899",
    email: "",
    address: "",
    city: "Accra",
    operating_hours: "08:00 AM - 09:00 PM (Daily)",
    default_reorder_threshold: 15,
    max_cash_in_drawer_limit_ghs: 5000,
    thermal_receipt_header:
      "OSU COMMUNITY PHARMACY LTD\nOxford Street, Osu - Accra\nTel: +233 30 277 8899\nPharmacy Council Lic: GPC/GAR/2026",
    thermal_receipt_footer:
      "",
    auto_reorder_alert_enabled: true,
    momo_network: "MTN",
    momo_account_number: "0244556677",
    momo_account_name: "",
    payout_schedule: "DAILY_AUTOMATED_SWEEP",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getExtendedPharmacySettings();
      if (data) setSettings(data);
    } catch (err: any) {
      console.warn("Could not load extended settings:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await apiClient.updateExtendedPharmacySettings(settings);
      setSettings(res);
      setStatusMessage({
        type: "success",
        text: "Store, receipt hardware, and cash drawer settings updated successfully!",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Settings className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Store Hardware &amp; Policy Settings
              </h1>
              <p className="text-xs text-slate-500">
                POS Receipt Header/Footer · Maximum Cash Drawer Limits · MoMo Payout Credentials
              </p>
            </div>
          </div>

          <Button
            onClick={loadSettings}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-600 self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
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

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Cashier Hardware & Drawer Security */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Cash Drawer Security &amp; Thresholds
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Automated skim alerts trigger when physical drawer currency exceeds this limit.
            </p>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Maximum Cash-in-Drawer Limit (GHS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                    GHS
                  </span>
                  <input
                    type="number"
                    value={settings.max_cash_in_drawer_limit_ghs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_cash_in_drawer_limit_ghs: parseFloat(e.target.value) || 1000,
                      })
                    }
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500"
                    min="100"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cashiers receive &quot;Cash Drop Required&quot; notifications when drawer crosses this threshold.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Low-Stock Alert Threshold (Units) *
                </label>
                <input
                  type="number"
                  value={settings.default_reorder_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_reorder_threshold: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500"
                  min="1"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Triggers visual amber badge across POS search and auto-reorder engine.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: POS Thermal Receipt Customizer */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Thermal POS Receipt Template (80mm / 58mm)
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Customize printable receipt headers, council accreditation numbers, and disclaimer footers.
            </p>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Receipt Header Lines (Facility &amp; Pharmacy Council Info)
              </label>
              <textarea
                rows={3}
                value={settings.thermal_receipt_header}
                onChange={(e) =>
                  setSettings({ ...settings, thermal_receipt_header: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Receipt Footer Lines (Disclaimer &amp; Return Policy)
              </label>
              <textarea
                rows={3}
                value={settings.thermal_receipt_footer}
                onChange={(e) =>
                  setSettings({ ...settings, thermal_receipt_footer: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Mobile Money Escrow Settlement Account */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Mobile Money Escrow Settlement Account
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Dispensary proceeds and prescription claim funds are automatically disbursed here.
            </p>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Network Provider
                </label>
                <select
                  value={settings.momo_network}
                  onChange={(e) => setSettings({ ...settings, momo_network: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="MTN">MTN Mobile Money (Ghana)</option>
                  <option value="TELECEL">Telecel Cash (Vodafone)</option>
                  <option value="AIRTELTIGO">AT Money (AirtelTigo)</option>
                  <option value="BANK">Direct Bank Transfer (GhIPSS Instant Pay)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recipient Wallet / Account Number *
                </label>
                <Input
                  value={settings.momo_account_number}
                  onChange={(e) =>
                    setSettings({ ...settings, momo_account_number: e.target.value })
                  }
                  placeholder="0244556677"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Registered Account Name *
                </label>
                <Input
                  value={settings.momo_account_name}
                  onChange={(e) =>
                    setSettings({ ...settings, momo_account_name: e.target.value })
                  }
                  placeholder="Facility Registered Name"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            className="bg-teal-600 hover:bg-teal-700 font-bold text-xs px-6 py-2.5"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
