"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import {
  QrCode as QrIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building2,
  ShoppingCart,
  ArrowRight,
  User,
  Clock,
  Package,
  Loader2,
  Globe,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  QRScanner,
  PrinterSetupModal,
} from "@medipaedia/ui";
import { PrinterManager, buildDrugAuxiliaryLabel50x30mm } from "@medipaedia/hardware";
import { Printer } from "lucide-react";

import {
  createApiClient,
  PrescriptionVerifyResult,
  MultilingualCounselingResponse,
  SupportedCounselingLanguage,
} from "@medipaedia/api-client";

function PrescriptionVerifyContent() {
  const [claimPin, setClaimPin] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<PrescriptionVerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multilingual AI Counseling State
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedCounselingLanguage>("ENGLISH");
  const [counselingData, setCounselingData] = useState<MultilingualCounselingResponse | null>(null);
  const [isGeneratingCounseling, setIsGeneratingCounseling] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);
  const [isPrinterSetupOpen, setIsPrinterSetupOpen] = useState(false);
  const [printedItemIndex, setPrintedItemIndex] = useState<number | null>(null);

  const apiClient = createApiClient();

  const handlePrintDrugLabel = async (item: any, rx: PrescriptionVerifyResult, index: number) => {
    try {
      setPrintedItemIndex(index);
      const bytes = buildDrugAuxiliaryLabel50x30mm({
        facilityName: "Osu Community Pharmacy",
        rxClaimPin: rx.prescription_number,
        drugName: item.medication_name,
        dosageInstructions: item.dosage || "As directed by physician",
        quantity: `${item.quantity_prescribed} Units`,
        patientName: rx.patient_name,
        batchNumber: "LOT-FEFO-2026-09",
        expiryDate: "11/2027",
        auxiliaryWarningLang: "EN",
        barcodeSku: rx.prescription_number,
      });

      const res = await PrinterManager.getInstance().print("LABEL", bytes);
      console.log("Drug Label Print output:", res);
      setTimeout(() => setPrintedItemIndex(null), 1500);
    } catch (err: any) {
      console.warn("Label print error:", err.message);
      setPrintedItemIndex(null);
    }
  };


  const handleGenerateCounseling = async (
    rx: PrescriptionVerifyResult,
    lang: SupportedCounselingLanguage = "ENGLISH"
  ) => {
    setSelectedLanguage(lang);
    setIsGeneratingCounseling(true);
    try {
      const itemsPayload = rx.items.map((it) => ({
        medication_name: it.medication_name,
        dosage: it.dosage,
        frequency: "As prescribed",
        duration_days: 5,
      }));

      const res = await apiClient.generatePatientCounseling({
        prescription_items: itemsPayload,
        target_language: lang,
        patient_name: rx.patient_name,
      });
      setCounselingData(res);
    } catch (err: any) {
      console.warn("AI Counseling error:", err.message);
    } finally {
      setIsGeneratingCounseling(false);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || claimPin).trim().toUpperCase();
    if (!code) return;
    setErrorMessage(null);
    setIsVerifying(true);

    try {
      const res = await apiClient.verifyPrescriptionClaim(code);
      setVerifiedResult(res);
      await handleGenerateCounseling(res, selectedLanguage);
    } catch (err: any) {
      setErrorMessage(err.message || "Prescription not found, expired, or invalid claim PIN.");
      setVerifiedResult(null);
      setCounselingData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQrScan = (token: string) => {
    setIsScanning(false);
    if (token.includes("code=")) {
      const pin = token.split("code=")[1].split("&")[0];
      setClaimPin(pin);
      handleVerify(pin);
    } else {
      setClaimPin(token);
      handleVerify(token);
    }
  };

  const handleCopySms = () => {
    if (!counselingData) return;
    navigator.clipboard.writeText(counselingData.sms_whatsapp_dispatch_copy);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cryptographic Prescription Verification &amp; AI Counseling Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Validate HMAC-SHA256 doctor signatures, inspect drug allergies, generate multilingual patient instructions, and check dispensary stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsPrinterSetupOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 border-slate-300 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-teal-700" />
            <span>Printer Setup</span>
          </Button>
          <Badge variant="teal" className="flex items-center gap-1.5 self-start sm:self-center">
            <ShieldCheck className="h-4 w-4" />
            Anti-Counterfeit Protection
          </Badge>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Verification Trigger Card */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrIcon className="h-5 w-5 text-teal-600" />
                  Prescription Claim Entry
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsScanning(!isScanning)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  {isScanning ? "Enter PIN Manually" : "Scan QR Token"}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isScanning ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <QRScanner onScanSuccess={handleQrScan} />
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerify();
                  }}
                  className="space-y-4"
                >
                  <Input
                    label="6-Digit Claim PIN"
                    value={claimPin}
                    onChange={(e) => setClaimPin(e.target.value.toUpperCase())}
                    placeholder="e.g. 9K4L2P"
                    maxLength={10}
                    className="font-mono uppercase text-center text-lg tracking-widest font-bold"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
                    isLoading={isVerifying}
                  >
                    Verify Authenticity &amp; Check Stock
                  </Button>
                </form>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification Result & AI Counseling Area */}
        <div className="lg:col-span-7 space-y-6">
          {verifiedResult ? (
            <Card className="border-2 border-teal-500 shadow-md">
              <CardHeader className="bg-teal-50/50 pb-4 border-b border-teal-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-teal-800 uppercase block">
                      HMAC-SHA256 SIGNATURE VALID
                    </span>
                    <CardTitle className="text-lg text-slate-900 mt-0.5">
                      {verifiedResult.prescription_number}
                    </CardTitle>
                  </div>
                  <Badge variant="teal" className="text-xs font-mono">
                    Issued: {new Date(verifiedResult.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Patient Summary & Allergies */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">PATIENT NAME</span>
                    <strong className="text-slate-900 text-sm">{verifiedResult.patient_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">MRN NUMBER</span>
                    <strong className="text-slate-800 font-mono">{verifiedResult.mrn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ALLERGY WARNING</span>
                    <strong className="text-rose-600 font-bold">{verifiedResult.allergies || "None Reported"}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px]">DIAGNOSIS</span>
                    <span className="text-slate-800 font-medium">{verifiedResult.diagnosis || "Outpatient Prescription"}</span>
                  </div>
                </div>

                {/* Prescribed Items & Live Stock Mapping */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-600" />
                    Prescribed Items vs Current Dispensary Stock
                  </h4>

                  <div className="space-y-2">
                    {verifiedResult.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.medication_name}</p>
                          <p className="text-xs text-slate-500">{item.dosage}</p>
                          <p className="text-[11px] text-teal-700 font-mono mt-0.5">
                            Unit Price: GHS {Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800 block">
                              Prescribed: {item.quantity_prescribed}
                            </span>
                            <span className={`text-[11px] font-medium ${item.in_stock ? "text-emerald-600" : "text-rose-600"}`}>
                              In Stock: {item.available_stock} units
                            </span>
                          </div>
                          <Badge variant={item.in_stock ? "teal" : "danger"} className="text-[10px]">
                            {item.in_stock ? "Ready" : "Out of Stock"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintDrugLabel(item, verifiedResult, idx)}
                            className="text-[10px] font-bold gap-1 border-teal-300 text-teal-800 hover:bg-teal-50"
                          >
                            <Printer className="h-3 w-3" />
                            <span>{printedItemIndex === idx ? "Sent to Printer" : "Print 50x30 Label"}</span>
                          </Button>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

                {/* MULTILINGUAL AI PATIENT COUNSELING GENERATOR */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
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

                  {/* Language Selector */}
                  <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-center text-[10px] font-extrabold">
                    {(["ENGLISH", "FRENCH", "TWI", "EWE", "GA"] as SupportedCounselingLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleGenerateCounseling(verifiedResult, lang)}
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating counseling instructions in {selectedLanguage}...
                    </div>
                  ) : counselingData ? (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5 text-xs">
                      <p className="font-bold text-indigo-950 text-[11px]">
                        {counselingData.patient_greeting}
                      </p>

                      <div className="space-y-1.5">
                        {counselingData.medications_counseling.map((m, idx) => (
                          <div key={idx} className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
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

                      <div className="text-[10px] text-slate-600 italic">
                        💡 {counselingData.general_lifestyle_advice}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-indigo-200/70">
                        <span className="text-[10px] text-indigo-800 font-bold">
                          SMS / WhatsApp Dispatch Ready
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySms}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-300 font-bold text-[10px] flex items-center gap-1 transition"
                        >
                          {copiedSms ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedSms ? "Copied to Clipboard!" : "Copy for Patient SMS"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Action to POS */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                  <Link
                    href={`/pos?claimPin=${verifiedResult.claim_pin}&rx=${verifiedResult.prescription_number}&patient=${encodeURIComponent(verifiedResult.patient_name)}`}
                  >
                    <Button variant="primary" size="lg" className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold">
                      <ShoppingCart className="h-4 w-4" /> Load Directly into POS Terminal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-3">
              <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">No Active Prescription Loaded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Scan a patient QR code or input the 6-character claim PIN on the left to verify authenticity and inspect local stock.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hardware Thermal Printer Setup */}
      <PrinterSetupModal
        isOpen={isPrinterSetupOpen}
        onClose={() => setIsPrinterSetupOpen(false)}
        defaultTab="LABEL"
      />
    </div>
  );
}


export default function PrescriptionVerifyPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-xs p-8">Loading claim verification portal...</div>}>
      <PrescriptionVerifyContent />
    </Suspense>
  );
}
