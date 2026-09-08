"use client";

import React, { useState } from "react";
import {
  Settings,
  DollarSign,
  Building2,
  CheckCircle2,
  Save,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@medipaedia/ui";

export default function HospitalSettingsPage() {
  const [opdFee, setOpdFee] = useState("0.00");
  const [consultationFee, setConsultationFee] = useState("0.00");
  const [emergencyFee, setEmergencyFee] = useState("0.00");
  const [facilityName, setFacilityName] = useState("");
  const [facilitySlug, setFacilitySlug] = useState("");
  const [momoAccount, setMomoAccount] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
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
            Facility Rates & Operational Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure OPD digital folder issuance tariffs, consultation charges, and Mobile Money collections
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Hospital billing rates and facility metadata updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Fee Tariffs */}
        <Card className="p-6 border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="h-5 w-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Outpatient & Clinical Fee Tariffs (GHS)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                OPD Digital Folder Issuance Fee
              </label>
              <Input
                type="number"
                step="1.00"
                value={opdFee}
                onChange={(e) => setOpdFee(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard charge for creating new hospital patient card
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                General Specialist Consultation
              </label>
              <Input
                type="number"
                step="1.00"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Physician encounter consultation rate
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency & Triage Intake Fee
              </label>
              <Input
                type="number"
                step="1.00"
                value={emergencyFee}
                onChange={(e) => setEmergencyFee(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Trauma & acute casualty desk fee
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Facility Identification */}
        <Card className="p-6 border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Facility Identity & Multi-Tenant Slug
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Facility Name</label>
              <Input
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Multi-Tenant Slug</label>
              <Input
                value={facilitySlug}
                disabled
                className="bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </Card>

        {/* Card 3: Mobile Money Collections Account */}
        <Card className="p-6 border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Automated MoMo Collection Gateway
              </h3>
            </div>
            <Badge variant="teal" className="text-[9px] uppercase font-bold py-0">
              GhIPSS SETTLEMENT READY
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Money Provider</label>
              <Input value={momoNetwork} disabled className="bg-slate-50 text-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Account</label>
              <Input value={momoAccount} disabled className="bg-slate-50 text-slate-600 font-mono" />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="teal"
            size="lg"
            isLoading={isSaving}
            className="font-bold shadow-md shadow-teal-700/20"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save Rate Modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
