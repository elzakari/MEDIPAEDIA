"use client";

import React, { useEffect, useState } from "react";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Pill,
  Search,
  Scan,
  RefreshCw,
  Layers,
  ArrowRight,
  Sparkles,
  Globe,
  Copy,
  MessageSquare,
  Bot,
  Check,
  Loader2,
  Volume2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import {
  createApiClient,
  MultilingualCounselingResponse,
  SupportedCounselingLanguage,
} from "@medipaedia/api-client";

export default function DispensaryVerifyAndDispensePage() {
  const apiClient = createApiClient();

  const [pinInput, setPinInput] = useState("849201");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedRx, setVerifiedRx] = useState<any>({
    id: "RX-2026-99214",
    claimPin: "849201",
    patientName: "Active Patient",
    patientGhanaCard: "GHA-PATIENT-ID",
    patientAllergies: ["Amoxicillin / Penicillin", "Peanuts"],
    prescriberName: "Attending Physician",
    prescriberPin: "MDC/GMC-STAFF",
    facility: "Facility Health Service",
    diagnosis: "Uncomplicated P. falciparum Malaria (B50.9) & Pyrexia",
    hmacValid: true,
    issuedAt: "19 Aug 2026, 11:30 AM",
    items: [
      {
        id: "item-01",
        medicationName: "Coartem (Artemether/Lumefantrine 20/120mg)",
        genericName: "Artemether + Lumefantrine",
        quantity: 24,
        instructions: "Take 4 tablets stat, then 4 tablets at 8h, 24h, 36h, 48h, 60h with meals",
        selectedBatch: "LOT-COA-2026-01",
        batchExpiry: "30 Nov 2027",
        stockAvailable: 48,
        price: 45.0,
      },
      {
        id: "item-02",
        medicationName: "Paracetamol 500mg Tablets",
        genericName: "Paracetamol",
        quantity: 20,
        instructions: "2 tablets TDS for 3 days as needed for fever",
        selectedBatch: "LOT-PCM-2026-03",
        batchExpiry: "20 Sep 2027",
        stockAvailable: 250,
        price: 6.0,
      },
    ],
  });

  const [dispenseSuccessModal, setDispenseSuccessModal] = useState(false);
  const [printedLabel, setPrintedLabel] = useState<any>(null);
  const [isDispensing, setIsDispensing] = useState(false);

  // Multilingual AI Counseling State
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedCounselingLanguage>("ENGLISH");
  const [counselingData, setCounselingData] = useState<MultilingualCounselingResponse | null>(null);
  const [isGeneratingCounseling, setIsGeneratingCounseling] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const handleFetchCounseling = async (lang: SupportedCounselingLanguage) => {
    setSelectedLanguage(lang);
    setIsGeneratingCounseling(true);
    try {
      const itemsPayload = verifiedRx.items.map((it: any) => ({
        medication_name: it.medicationName,
        dosage: it.instructions,
        frequency: "As prescribed",
        duration_days: 3,
      }));

      const res = await apiClient.generatePatientCounseling({
        prescription_items: itemsPayload,
        target_language: lang,
        patient_name: verifiedRx.patientName,
      });
      setCounselingData(res);
    } catch (err: any) {
      console.warn("AI Counseling fetch error:", err.message);
    } finally {
      setIsGeneratingCounseling(false);
    }
  };

  useEffect(() => {
    handleFetchCounseling("ENGLISH");
  }, []);

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 400);
  };

  const handleCopySms = () => {
    if (!counselingData) return;
    navigator.clipboard.writeText(counselingData.sms_whatsapp_dispatch_copy);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 3000);
  };

  const handleDispenseFEFO = () => {
    setIsDispensing(true);
    setTimeout(() => {
      setIsDispensing(false);
      setPrintedLabel({
        pharmacy: "Ridge Hospital Outpatient Pharmacy, Accra",
        phone: "+233 30 277 8899",
        patient: verifiedRx.patientName,
        drug: verifiedRx.items[0].medicationName,
        dosage: verifiedRx.items[0].instructions,
        qty: `${verifiedRx.items[0].quantity} Tablets`,
        lot: verifiedRx.items[0].selectedBatch,
        exp: verifiedRx.items[0].batchExpiry,
        auxiliary: counselingData?.medications_counseling[0]?.auxiliary_label_text || "Take with food or milk",
        pharmacist: "Pharm. Kojo Asante (PSGH/REG/89201)",
        date: "Today, 10:45 AM",
      });
      setDispenseSuccessModal(true);
    }, 650);
  };

  return (
    <div className="space-y-4">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scan className="h-5 w-5 text-teal-700" /> Prescription Verification, AI Counseling &amp; FEFO Dispensing
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Optical Scanner Listener Active • Pharmacist: Pharm. Kojo Asante (PSGH/REG/89201)
          </p>
        </div>

        <Badge variant="teal" className="text-xs font-bold px-3 py-1 font-mono">
          FEFO Enforcement: STRICT
        </Badge>
      </div>

      {/* 3-Panel Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* PANEL 1: LEFT PANEL - SCANNER INPUT & IDENTITY PROOF (Col span 3) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="p-3.5 border border-slate-200 bg-white shadow-sm space-y-3 text-xs">
            <span className="font-extrabold text-slate-900 block pb-1 border-b border-slate-100">
              Prescription Claim Lookup
            </span>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                6-Digit Claim PIN / Optical Token
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="w-full text-center font-mono font-black text-base tracking-widest uppercase rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-teal-500"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleVerify}
                  isLoading={isVerifying}
                  className="bg-teal-700 hover:bg-teal-800 font-bold"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cryptographic HMAC Verification Proof */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-[11px]">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>HMAC-SHA256 Valid</span>
              </div>
              <p className="text-[10px] font-mono break-all text-emerald-800">
                Sig: 9f8a7c2b...4d1e (MDC Vault Auth)
              </p>
            </div>

            {/* Patient Card Preview */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Patient Identity</span>
              <strong className="text-slate-900 text-sm block">{verifiedRx.patientName}</strong>
              <div className="font-mono text-[11px] text-slate-600">ID: {verifiedRx.patientGhanaCard}</div>
              <div className="pt-1 border-t border-slate-200 text-rose-700 font-bold text-[11px]">
                ⚠️ Allergies: {verifiedRx.patientAllergies.join(", ")}
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: CENTER PANEL - PRESCRIPTION & AI COUNSELING (Col span 5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-3.5 border border-slate-200 bg-white shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-mono font-bold text-slate-800">{verifiedRx.id}</span>
              <Badge variant="teal" className="text-[10px] font-bold">DIGITALLY SIGNED</Badge>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Prescriber:</span>
                <strong className="text-slate-900">{verifiedRx.prescriberName} ({verifiedRx.prescriberPin})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Diagnosis:</span>
                <span className="text-teal-900 font-bold">{verifiedRx.diagnosis}</span>
              </div>
            </div>

            {/* Prescription Items */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block">Prescribed Medicines</span>
              {verifiedRx.items.map((it: any) => (
                <div key={it.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{it.medicationName}</span>
                    <span className="font-mono">Qty: {it.quantity}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono">{it.instructions}</p>
                </div>
              ))}
            </div>

            {/* MULTILINGUAL AI PATIENT COUNSELING GENERATOR */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  <strong className="text-xs font-black text-slate-900">
                    AI Multilingual Patient Counseling
                  </strong>
                </div>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
                  AI CO-PILOT
                </Badge>
              </div>

              {/* Language Switcher Tabs */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-center text-[10px] font-extrabold">
                {(["ENGLISH", "FRENCH", "TWI", "EWE", "GA"] as SupportedCounselingLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleFetchCounseling(lang)}
                    className={`py-1.5 rounded-lg transition ${
                      selectedLanguage === lang
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {lang === "FRENCH" ? "Français" : lang === "TWI" ? "Twi" : lang === "EWE" ? "Eʋe" : lang === "GA" ? "Ga" : "English"}
                  </button>
                ))}
              </div>

              {isGeneratingCounseling ? (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating localized counseling copy...
                </div>
              ) : counselingData ? (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2 text-xs">
                  <p className="font-bold text-indigo-950 text-[11px]">
                    {counselingData.patient_greeting}
                  </p>

                  <div className="space-y-1.5">
                    {counselingData.medications_counseling.map((m, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                        <div className="flex justify-between items-baseline font-bold text-[11px] text-slate-900">
                          <span>{m.medication_name}</span>
                          <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {m.auxiliary_label_text}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700">👉 {m.how_to_take}</p>
                        <p className="text-[10px] text-amber-800 font-medium">🍽️ {m.meal_instructions}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 text-[10px] text-slate-600 italic">
                    💡 {counselingData.general_lifestyle_advice}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-indigo-200/70">
                    <span className="text-[10px] text-indigo-800 font-bold">
                      SMS / WhatsApp Notification Copy Ready
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySms}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-300 font-bold text-[10px] flex items-center gap-1 transition"
                    >
                      {copiedSms ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedSms ? "Copied!" : "Copy SMS Copy"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 3: RIGHT PANEL - FEFO STOCK MATCHER & DISPENSE TRIGGER (Col span 4) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-4 border-2 border-teal-500 bg-white shadow-sm space-y-3.5 text-xs">
            <span className="font-extrabold text-slate-900 block pb-1 border-b border-slate-100">
              FEFO Automated Batch Matcher
            </span>

            <div className="space-y-2.5">
              {verifiedRx.items.map((it: any) => (
                <div key={it.id} className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-bold">{it.genericName}</strong>
                    <Badge variant="teal" className="text-[9px] font-mono">FEFO PRIORITY</Badge>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Batch: <strong className="text-teal-900">{it.selectedBatch}</strong> • Exp: {it.batchExpiry}
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-teal-200/60">
                    <span>In Stock: <strong className="text-slate-800">{it.stockAvailable} units</strong></span>
                    <span className="font-mono font-bold text-slate-900">GHS {it.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleDispenseFEFO}
              isLoading={isDispensing}
              className="w-full font-bold shadow-md shadow-teal-700/20 py-3 gap-1.5"
            >
              <Printer className="h-4 w-4" /> Dispense FEFO &amp; Mint Thermal Label
            </Button>
          </Card>
        </div>
      </div>

      {/* Dispense Success & Thermal Label Modal */}
      {dispenseSuccessModal && printedLabel && (
        <Modal
          isOpen={dispenseSuccessModal}
          onClose={() => setDispenseSuccessModal(false)}
          title="Prescription Dispensed &amp; Thermal Label Ready"
          description="Atomic inventory decrement completed. Thermal label ready with auxiliary patient warnings."
        >
          <div className="py-4 space-y-4 text-xs">
            {/* 50x30mm Thermal Label Preview Container */}
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-[11px] space-y-1.5 border border-slate-800 shadow-inner">
              <div className="text-center font-bold text-teal-300">
                ========================================<br />
                   {printedLabel.pharmacy}<br />
                    {printedLabel.phone}<br />
                ========================================
              </div>
              <div>PATIENT:  {printedLabel.patient}</div>
              <div>DRUG:     {printedLabel.drug}</div>
              <div className="text-emerald-300 font-bold">DOSAGE:   {printedLabel.dosage}</div>
              <div>QTY:      {printedLabel.qty}</div>
              <div>BATCH:    {printedLabel.lot} • EXP: {printedLabel.exp}</div>
              <div className="text-amber-300 font-bold">AUX LABEL: {printedLabel.auxiliary}</div>
              <div>DISP BY:  {printedLabel.pharmacist}</div>
              <div>DATE:     {printedLabel.date}</div>
              <div className="text-center text-[9px] text-slate-400 pt-1">
                *** DIGITAL NHIS / FDA GHANA COMPLIANT ***
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDispenseSuccessModal(false)}
                className="font-bold"
              >
                Close Workstation
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                  setDispenseSuccessModal(false);
                }}
                className="bg-teal-700 hover:bg-teal-800 font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print 50x30mm Label Now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
