"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Printer,
  Smartphone,
  Wallet,
  Coins,
  ShieldCheck,
  User,
  X,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  Globe,
  Zap,
  Check,
  Building2,
  Sparkles,
  Inbox,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal, PrinterSetupModal } from "@medipaedia/ui";
import { PrinterManager, buildCashierReceipt80mm } from "@medipaedia/hardware";
import { createApiClient, CashierShiftAuditItem, UnpaidFolioItem } from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";
import { OPDCardPrintModal, type OPDCardPrintData } from "@/components/clinical/OPDCardPrintModal";

interface ChargeItem {
  id: string;
  description: string;
  category: string;
  unitPrice: number;
  totalPrice: number;
  nhisTariff: number;
  patientPayable: number;
  selected: boolean;
}

const COUNTRY_CONFIGS = {
  GH: {
    name: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    gateway: "PAYSTACK",
    rateFromGHS: 1.0,
    networks: [
      { id: "mtn", name: "MTN Mobile Money", ussd: "*170#", prefix: "024/054/055/059" },
      { id: "telecel", name: "Telecel Cash", ussd: "*110#", prefix: "020/050" },
      { id: "at", name: "AT Money", ussd: "*110#", prefix: "027/057/026" },
    ],
  },
  TG: {
    name: "Togo",
    flag: "🇹🇬",
    currency: "XOF",
    gateway: "FEDAPAY",
    rateFromGHS: 50.0,
    networks: [
      { id: "tmoney", name: "T-Money (Togo)", ussd: "*145#", prefix: "90/91/92/93" },
      { id: "moov_tg", name: "Moov Money Togo", ussd: "*155#", prefix: "96/97/98/99" },
    ],
  },
  BJ: {
    name: "Bénin",
    flag: "🇧🇯",
    currency: "XOF",
    gateway: "FEDAPAY",
    rateFromGHS: 50.0,
    networks: [
      { id: "mtn_bj", name: "MTN MoMo Bénin", ussd: "*880#", prefix: "96/97/61/62" },
      { id: "moov_bj", name: "Moov Money Bénin", ussd: "*855#", prefix: "95/94/65" },
    ],
  },
};

export default function HospitalCashierPOSPage() {
  const { t } = useTranslation();
  const apiClient = createApiClient();

  const [selectedCountry, setSelectedCountry] = useState<"GH" | "TG" | "BJ">("GH");
  const [searchQuery, setSearchQuery] = useState("GHA-71298412-1");
  const [patientFound, setPatientFound] = useState(true);

  const activeCountry = COUNTRY_CONFIGS[selectedCountry];

  const [charges, setCharges] = useState<ChargeItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOMO" | "CARD">("MOMO");
  const [momoPhone, setMomoPhone] = useState(selectedCountry === "GH" ? "0244123456" : "+228 90 12 34 56");
  const [momoNetwork, setMomoNetwork] = useState(activeCountry.networks[0].id);
  const [cashTendered, setCashTendered] = useState("150.00");
  const [isProcessing, setIsProcessing] = useState(false);
  const [momoStatus, setMomoStatus] = useState<"IDLE" | "PUSH_SENT" | "CONFIRMED">("IDLE");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState<any>(null);

  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const catalogServices = [
    { code: "SRV-REG-NEW", name: t("cashier.catalog.newPatientRegistration") || "New Patient Registration (OPD Card)", category: "REGISTRATION", unitPrice: 45.0, nhisTariff: 30.0, copay: 15.0 },
    { code: "SRV-CONS-GEN", name: t("cashier.catalog.generalConsultation") || "General Medical Consultation", category: "CONSULTATION", unitPrice: 60.0, nhisTariff: 50.0, copay: 10.0 },
    { code: "SRV-CONS-SPEC", name: t("cashier.catalog.specialistClinic") || "Specialist Clinic Review", category: "CONSULTATION", unitPrice: 150.0, nhisTariff: 0.0, copay: 150.0 },
    { code: "SRV-LAB-FBC", name: t("cashier.catalog.fbc") || "Full Blood Count (FBC / FBE)", category: "LABORATORY", unitPrice: 75.0, nhisTariff: 55.0, copay: 20.0 },
    { code: "SRV-LAB-MAL", name: t("cashier.catalog.malariaRdt") || "Malaria Rapid Diagnostic Test (RDT)", category: "LABORATORY", unitPrice: 35.0, nhisTariff: 35.0, copay: 0.0 },
    { code: "SRV-WARD-GEN", name: t("cashier.catalog.wardBed") || "General Ward Bed Day", category: "WARD_STAY", unitPrice: 80.0, nhisTariff: 60.0, copay: 20.0 },
    { code: "SRV-PROC-CS", name: t("cashier.catalog.emergencyCs") || "Emergency Caesarean Section (LSCS)", category: "PROCEDURE", unitPrice: 1200.0, nhisTariff: 950.0, copay: 250.0 },
  ];

  const [receiptsList, setReceiptsList] = useState<UnpaidFolioItem[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const loadReceipts = async () => {
    try {
      setIsLoadingReceipts(true);
      setReceiptsError(null);
      const data = await apiClient.getUnpaidFolios();
      setReceiptsList(data || []);
    } catch (err: any) {
      setReceiptsError(err.message || (t("cashier.errors.failedToLoadReceipts") || "Unable to load unpaid patient folios from the server."));
      setReceiptsList([]);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleAddCatalogService = (srv: typeof catalogServices[0]) => {
    const newCharge: ChargeItem = {
      id: `chg-${Date.now()}`,
      description: srv.name,
      category: srv.category,
      unitPrice: srv.unitPrice,
      totalPrice: srv.unitPrice,
      nhisTariff: srv.nhisTariff,
      patientPayable: srv.copay,
      selected: true,
    };
    setCharges((prev) => [...prev, newCharge]);
    setIsAddServiceModalOpen(false);
  };

  useEffect(() => {
    setMomoNetwork(activeCountry.networks[0].id);
    if (selectedCountry === "GH") setMomoPhone("0244123456");
    else if (selectedCountry === "TG") setMomoPhone("+228 90 12 34 56");
    else setMomoPhone("+229 97 00 11 22");
  }, [selectedCountry]);

  const selectedCharges = charges.filter((c) => c.selected);
  const rate = activeCountry.rateFromGHS;

  const grossTotal = selectedCharges.reduce((acc, c) => acc + c.totalPrice * rate, 0);
  const nhisCovered = selectedCharges.reduce((acc, c) => acc + c.nhisTariff * rate, 0);
  const netPatientDue = selectedCharges.reduce((acc, c) => acc + c.patientPayable * rate, 0);

  const parsedCash = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, parsedCash - netPatientDue);

  const handleToggleCharge = (id: string) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleProcessPayment = () => {
    setIsProcessing(true);
    if (paymentMethod === "MOMO") {
      setMomoStatus("PUSH_SENT");
    }

    setTimeout(() => {
      setIsProcessing(false);
      setMomoStatus("CONFIRMED");

      const activeNet = activeCountry.networks.find((n) => n.id === momoNetwork)?.name || (t("cashier.payment.momo") || "Mobile Money");
      const txRef = `${activeCountry.gateway === "PAYSTACK" ? "PAY-GH" : "FEDA-XOF"}-${Date.now().toString().slice(-6)}`;

      const newRcp = {
        id: `RCP-${Date.now().toString().slice(-5)}`,
        txRef,
        patient: t("cashier.defaultPatientName") || "Ama Serwaa Akoto",
        mrn: "MRN-RDG-2026-092",
        payer: t("cashier.defaultPayer") || "NHIS Ghana / Patient Copay",
        items: selectedCharges.map((c) => ({
          desc: c.description,
          total: c.patientPayable * rate,
        })),
        grossAmount: grossTotal,
        nhisCovered: nhisCovered,
        amountPaid: netPatientDue,
        currency: activeCountry.currency,
        countryName: activeCountry.name,
        gateway: activeCountry.gateway,
        method: paymentMethod === "MOMO" ? `${activeNet} (${activeCountry.gateway})` : paymentMethod,
        phone: momoPhone,
        cashier: t("cashier.defaultCashier") || "Nurse Opoku",
        facilityName: t("cashier.defaultFacility") || "Medipaedia Ridge General Hospital",
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        qrVerificationCode: `VERIFY-${txRef}-${activeCountry.currency}-${netPatientDue.toFixed(0)}`,
      };

      setLatestReceipt(newRcp);
      setPaymentSuccess(true);
      handleThermalPrint(newRcp);

      const hasNewOpdRegistration = selectedCharges.some(
        (c) =>
          c.id?.toUpperCase().includes("REG-NEW") ||
          c.description?.toUpperCase().includes("OPD CARD") ||
          c.description?.toUpperCase().includes("NEW PATIENT REGISTRATION")
      );
      const metaOpd: any = (newRcp as any).opd_card_metadata || undefined;
      if (hasNewOpdRegistration || metaOpd) {
        const deriveTrack = (): OPDCardPrintData["intakeTrack"] => {
          if (metaOpd?.intake_track) return metaOpd.intake_track;
          const anyEmergency = selectedCharges.some(
            (c) =>
              (c.description || "").toUpperCase().includes("EMERGENCY") ||
              (c.category || "").toUpperCase().includes("PROCEDURE")
          );
          if (anyEmergency) return "EMERGENCY";
          const anyLarge = selectedCharges.some((c) => c.unitPrice > 500);
          if (anyLarge) return "CORPORATE_INSURANCE";
          return "STANDARD";
        };
        const data: OPDCardPrintData = {
          cardNumber:
            metaOpd?.card_number ||
            metaOpd?.opd_number ||
            newRcp.mrn ||
            `ACC-${newRcp.id || "2026-" + Date.now().toString().slice(-6)}`,
          patientName: metaOpd?.patient_name || newRcp.patient,
          patientId: metaOpd?.patient_id || newRcp.mrn || newRcp.id || "patient-0",
          mrn: newRcp.mrn || metaOpd?.mrn || undefined,
          intakeTrack: deriveTrack(),
          billingStatus: metaOpd?.billing_status || "PAID",
          triageStatus: metaOpd?.triage_status || "AWAITING TRIAGE",
          emergencyDeferred: !!metaOpd?.emergency_deferred || false,
          facilityName: newRcp.facilityName,
          issuedAt: metaOpd?.issued_at || newRcp.date,
          bloodGroup: metaOpd?.blood_group || undefined,
          emergencyContact: metaOpd?.emergency_contact || undefined,
        };
        setOpdCardToPrint(data);
        setOpdCardModalOpen(true);
      }
    }, 1500);
  };

  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

  const [opdCardModalOpen, setOpdCardModalOpen] = useState(false);
  const [opdCardToPrint, setOpdCardToPrint] = useState<OPDCardPrintData | null>(null);

  const handleThermalPrint = async (rcp: any) => {
    try {
      const bytes = buildCashierReceipt80mm({
        facilityName: rcp.facilityName || (t("cashier.print.facility") || "Medipaedia Ridge General Hospital"),
        facilityAddress: t("cashier.print.address") || "Lot 9 Independence Ave, Ridge, Greater Accra",
        facilityPhone: t("cashier.print.phone") || "+233 (0)30 299 0000",
        receiptNumber: rcp.id || "RCP-2026-9901",
        date: rcp.date || new Date().toLocaleString("en-GB"),
        cashierName: rcp.cashier || (t("cashier.defaultCashier") || "Nurse Opoku"),
        patientName: rcp.patient || (t("cashier.defaultPatientName") || "Ama Serwaa Akoto"),
        patientMrn: rcp.mrn || "MRN-GHA-8821",
        items: rcp.items?.length
          ? rcp.items.map((i: any) => ({
              description: i.description || (t("cashier.print.defaultService") || "Billable Service Item"),
              qty: i.qty || 1,
              unitPrice: i.unitPrice || i.total || 0,
              total: i.total || i.unitPrice || 0,
            }))
          : [
              {
                description: t("cashier.print.revenueSettlement") || "Cashier Shift Revenue Settlement",
                qty: 1,
                unitPrice: rcp.amountPaid || 0,
                total: rcp.amountPaid || 0,
              },
            ],
        subtotal: rcp.grossAmount || rcp.amountPaid || 0,
        insuranceDeduction: rcp.nhisCovered || 0,
        grandTotal: rcp.amountPaid || 0,
        currency: rcp.currency || activeCountry.currency,
        paymentMethod: rcp.method || "CASH",
        transactionRef: rcp.id,
        verificationUrl: `https://medipaedia.health/verify/rct/${rcp.id}`,
        autoCut: true,
        kickDrawer: true,
      });

      const res = await PrinterManager.getInstance().print("RECEIPT", bytes);
      console.log("Thermal print job output:", res);
    } catch (err: any) {
      console.warn("Hardware thermal printing notification:", err.message);
    }
  };

  const renderReceiptsContent = () => {
    if (isLoadingReceipts) {
      return (
        <div className="p-8 text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">{t("cashier.receipts.loading") || "Loading cashier shift audit trail..."}</p>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-2 bg-slate-200 rounded w-2/3 mb-1"></div>
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (receiptsError) {
      return (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <div>
            <h4 className="font-bold text-rose-900 text-sm mb-1">{t("cashier.errors.receiptsFailedTitle") || "Could not load shift audit"}</h4>
            <p className="text-xs text-rose-700">{receiptsError}</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={loadReceipts}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.retry") || "Retry"}
          </Button>
        </div>
      );
    }

    if (!isLoadingReceipts && !receiptsError && receiptsList.length === 0) {
      return (
        <div className="p-8 text-center space-y-3">
          <Card className="p-8 border-dashed border-slate-200 bg-white max-w-xs mx-auto">
            <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 w-fit mb-4">
              <Inbox className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm mb-1">{t("superAdmin.noReceipts") || "No cashier shift receipts on file"}</h4>
              <p className="text-xs text-slate-500">{t("cashier.receipts.emptyDescription") || "Process patient payments at the POS terminal to begin generating the shift audit roll."}</p>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {receiptsList.map((rcp: UnpaidFolioItem) => (
          <div
            key={rcp.folio_id}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
          >
            <div className="flex items-center justify-between font-mono font-bold text-teal-800">
              <span>{rcp.folio_id}</span>
              <span className="text-slate-900">
                {activeCountry.currency} {(rcp.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[11px] text-slate-700 font-medium">
              {rcp.patient_name} &bull;{" "}
              <Badge
                variant={
                  rcp.status === "SETTLED"
                    ? "teal"
                    : rcp.status === "UNPAID" || rcp.status === "PARTIAL"
                    ? "warning"
                    : rcp.status === "OVERPAID"
                    ? "cyan"
                    : "outline"
                }
                className="text-[9px]"
              >
                {rcp.status || "PENDING"}
              </Badge>
              {rcp.outstanding !== 0 && rcp.outstanding !== undefined && rcp.outstanding !== null && (
                <span className="text-[9px] text-slate-500 font-mono ml-1">
                  O/S: {activeCountry.currency} {(rcp.outstanding || 0).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
              <span className="font-mono">
                {rcp.created_at?.slice(0, 16) || "—"} → {rcp.updated_at?.slice(0, 16) || t("cashier.audit.open") || "OPEN"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const syntheticRcp = {
                    id: rcp.folio_id,
                    txRef: rcp.folio_id,
                    patient: rcp.patient_name || t("cashier.audit.shiftSummary") || "Folio Summary",
                    mrn: rcp.patient_mrn || rcp.folio_id,
                    payer: t("cashier.audit.shiftAudit") || "Patient Folio",
                    items: [
                      { desc: t("cashier.audit.systemCash") || "Total Billed", total: rcp.total_amount || 0 },
                      { desc: t("cashier.audit.declaredCash") || "Amount Paid", total: (rcp.amount_paid ?? rcp.total_amount - rcp.outstanding) || 0 },
                      { desc: t("cashier.audit.discrepancy") || "Outstanding", total: rcp.outstanding || 0 },
                    ],
                    grossAmount: rcp.total_amount || 0,
                    nhisCovered: 0,
                    amountPaid: (rcp.amount_paid ?? rcp.total_amount - rcp.outstanding) || 0,
                    currency: activeCountry.currency,
                    countryName: activeCountry.name,
                    gateway: activeCountry.gateway,
                    method: rcp.payment_method || t("cashier.audit.momo") || "Unpaid Folio",
                    phone: "",
                    cashier: rcp.cashier_name || t("cashier.defaultCashier") || "Cashier",
                    facilityName: t("cashier.defaultFacility") || "Medipaedia Hospital",
                    date: rcp.created_at || new Date().toLocaleString(),
                    qrVerificationCode: `FOLIO-${rcp.folio_id}-${(rcp.total_amount || 0).toFixed(0)}`,
                  };
                  setLatestReceipt(syntheticRcp);
                  setPaymentSuccess(true);
                }}
                className="text-teal-700 font-bold hover:underline flex items-center gap-1"
              >
                <Printer className="h-3 w-3" /> {t("cashier.receipts.printThermal") || "Print Folio"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-700" />
            <span>{t("cashier.title") || "Outpatient Cashier & POS Terminal"}</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            {t("cashier.subtitle", { workstation: "TILL-01-OPD", cashier: t("cashier.defaultCashier") || "Nurse Opoku", currency: activeCountry.currency, country: activeCountry.name }) || `Workstation TILL-01-OPD · Cashier ${t("cashier.defaultCashier") || "Nurse Opoku"} · ${activeCountry.currency} · ${activeCountry.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedCountry("GH")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                selectedCountry === "GH" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🇬🇭</span>
              <span>{t("cashier.countries.ghana") || "Ghana"} (GHS)</span>
            </button>
            <button
              onClick={() => setSelectedCountry("TG")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                selectedCountry === "TG" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🇹🇬</span>
              <span>{t("cashier.countries.togo") || "Togo"} (XOF)</span>
            </button>
            <button
              onClick={() => setSelectedCountry("BJ")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                selectedCountry === "BJ" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🇧🇯</span>
              <span>{t("cashier.countries.benin") || "Bénin"} (XOF)</span>
            </button>
          </div>

          <Button
            onClick={() => setIsPrinterModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 border-slate-300 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-teal-700" />
            <span>{t("cashier.printerSetup") || "Printer Setup"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-3.5 border border-slate-200 bg-white shadow-xs space-y-2.5">
            <label className="block font-bold text-xs text-slate-800">
              {t("cashier.searchPatient") || "Lookup Patient by MRN / Ghana Card"}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t("cashier.searchPlaceholder") || "Search patient ID, MRN ref, or biometric lookup..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {patientFound && (
              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-extrabold">{t("cashier.defaultPatientName") || "Ama Serwaa Akoto"}</strong>
                  <Badge variant="teal" className="text-[10px] font-bold">{t("cashier.nhisActive") || "NHIS Active"}</Badge>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  GHA-71298412-1 &bull; MRN-RDG-2026-092
                </div>
                <div className="text-[11px] text-teal-800 font-medium">
                  {t("cashier.policy") || "Policy"}: <strong>GHA-NHIS-8821940</strong> ({t("cashier.govHealthInsurance") || "Ghana National Health Insurance"})
                </div>
              </div>
            )}
          </Card>

          <Card className="p-3.5 border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-extrabold text-slate-900">
                {t("cashier.pendingOrders", { count: charges.length }) || `Billable Line Items (${charges.length})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(true)}
                  className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold hover:bg-teal-100 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> {t("cashier.addService") || "Add Service"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCharges(charges.map((c) => ({ ...c, selected: true })))
                  }
                  className="text-[11px] text-teal-700 font-bold hover:underline"
                >
                  {t("cashier.selectAll") || "Select All"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {charges.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
                  <Inbox className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{t("cashier.noCharges") || "No charges added — add billable services from the catalog."}</p>
                </div>
              ) : (
                charges.map((c) => {
                  const totalInCurr = c.totalPrice * rate;
                  const nhisInCurr = c.nhisTariff * rate;
                  const patientInCurr = c.patientPayable * rate;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleCharge(c.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        c.selected
                          ? "bg-teal-50/60 border-teal-300 shadow-xs"
                          : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={() => {}}
                            className="mt-0.5 rounded-sm accent-teal-600"
                          />
                          <span className="font-semibold text-slate-900 leading-tight">
                            {c.description}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 shrink-0">
                          {activeCountry.currency} {totalInCurr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pl-5 text-slate-500">
                        <span>
                          {t("cashier.insuranceTariff") || "NHIS Tariff"}: <strong className="text-indigo-700">{activeCountry.currency} {nhisInCurr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span>
                          {t("cashier.patientLabel") || "Patient Pay"}: <strong className="text-slate-900 font-bold">{activeCountry.currency} {patientInCurr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 border border-slate-200 bg-white shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-900">
                {t("cashier.paymentTerminal") || "Payment Terminal & Collection"}
              </span>
              <Badge variant="teal" className="text-[10px] font-mono font-bold">
                {t("cashier.gateway") || "Gateway"}: {activeCountry.gateway}
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>{t("cashier.grossBill") || "Gross Bill"}:</span>
                <span className="font-mono font-bold text-slate-800">
                  {activeCountry.currency} {grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-indigo-700 font-medium">
                <span>{t("cashier.lessInsurance") || "Less NHIS Covered"}:</span>
                <span className="font-mono font-bold">
                  - {activeCountry.currency} {nhisCovered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-teal-950">
                <span>{t("cashier.netPayable") || "Net Patient Payable"}:</span>
                <span className="font-mono text-xl text-teal-900">
                  {activeCountry.currency} {netPatientDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-800 mb-1.5">
                {t("cashier.selectPaymentChannel") || "Select Payment Channel"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("MOMO")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                    paymentMethod === "MOMO"
                      ? "bg-amber-500 text-white border-amber-500 shadow-md"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>{t("cashier.channels.mobileMoney") || "Mobile Money"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                    paymentMethod === "CASH"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  <span>{t("cashier.channels.physicalCash") || "Physical Cash"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                    paymentMethod === "CARD"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>{t("cashier.channels.cardPos") || "Card POS"}</span>
                </button>
              </div>
            </div>

            {paymentMethod === "MOMO" && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      {activeCountry.flag} {t("cashier.operatorNetwork") || "Operator Network"}
                    </label>
                    <select
                      value={momoNetwork}
                      onChange={(e) => setMomoNetwork(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 p-2 text-xs bg-white focus:outline-hidden font-medium"
                    >
                      {activeCountry.networks.map((net) => (
                        <option key={net.id} value={net.id}>
                          {net.name} ({net.ussd})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      {t("cashier.patientPhone") || "Patient Phone"}
                    </label>
                    <input
                      type="text"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      placeholder={t("cashier.phonePlaceholder") || "02XX XXX XXX (MoMo wallet)"}
                      className="w-full rounded-xl border border-amber-300 p-2 text-xs font-mono bg-white focus:outline-hidden font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl">
                  <Zap className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    {t("cashier.directStkPush", { gateway: activeCountry.gateway, ussd: activeCountry.networks.find((n) => n.id === momoNetwork)?.ussd || "" }) || `Direct STK Push via ${activeCountry.gateway} · Dial ${activeCountry.networks.find((n) => n.id === momoNetwork)?.ussd || ""} if prompt missed.`}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === "CASH" && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      {t("cashier.cashTendered", { currency: activeCountry.currency }) || `Cash Tendered (${activeCountry.currency})`}
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full rounded-xl border border-emerald-300 p-2 text-xs font-mono font-bold bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      {t("cashier.changeToReturn") || "Change to Return"}
                    </label>
                    <div className="w-full rounded-xl border border-emerald-300 p-2 text-xs font-mono font-black text-emerald-900 bg-white">
                      {activeCountry.currency} {changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleProcessPayment}
              isLoading={isProcessing}
              disabled={selectedCharges.length === 0}
              className="w-full font-bold shadow-md shadow-teal-700/20 py-3 text-sm flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              <span>
                {t("cashier.collectAndSettle", { currency: activeCountry.currency, amount: netPatientDue.toLocaleString(undefined, { minimumFractionDigits: 2 }) }) || `Collect ${activeCountry.currency} ${netPatientDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} & Settle`}
              </span>
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-3">
          <Card className="p-3.5 border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-extrabold text-slate-900 block">
                {t("cashier.recentReceipts") || "Shift Audit & Recent Receipts"}
              </span>
              <button
                type="button"
                onClick={loadReceipts}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                title={t("common.refresh") || "Refresh"}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-teal-600 ${isLoadingReceipts ? "animate-spin" : ""}`} />
              </button>
            </div>
            {renderReceiptsContent()}
          </Card>
        </div>
      </div>

      {paymentSuccess && latestReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-500 uppercase tracking-wider font-mono">
                {t("cashier.print.slipTitle") || "Payment Receipt Slip"}
              </span>
              <button
                onClick={() => setPaymentSuccess(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-3 text-slate-800">
              <div className="text-center space-y-0.5">
                <p className="font-black text-sm">{t("cashier.print.headerBrand") || "MEDIPAEDIA ENTERPRISE CLINICAL"}</p>
                <p className="text-[10px] text-slate-500">{t("cashier.print.headerFacility") || "Ridge General Hospital — Outpatient Dept."}</p>
                <p className="text-[10px] text-slate-500">{t("cashier.print.headerPhone") || "Billing & Collections (Cashier Desk"}</p>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>{t("cashier.print.receiptNo") || "Receipt No"}:</span>
                  <span className="font-bold">{latestReceipt.id || "RCP-99214"}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("cashier.print.dateTime") || "Date / Time"}:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("cashier.print.patient") || "Patient Name"}:</span>
                  <span className="font-bold">{latestReceipt.patient || (t("cashier.defaultPatientName") || "Ama Serwaa Akoto")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("cashier.print.channel") || "Payment Channel"}:</span>
                  <span className="font-bold">{latestReceipt.method}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-xs font-black">
                  <span>{t("cashier.print.totalPaid") || "Total Amount Paid"}:</span>
                  <span>{latestReceipt.amount || `${latestReceipt.currency} ${latestReceipt.amountPaid?.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{t("cashier.print.taxIncluded") || "NHIS Levy / Tax Included"}:</span>
                  <span>{t("cashier.print.confirmed") || "PAYMENT CONFIRMED"}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                <p className="text-[10px] text-slate-500">{t("cashier.print.scanToVerify") || "Scan QR code or enter ref at medipaedia.health/verify"}</p>
                <div className="p-2 bg-white rounded-lg border border-slate-300 inline-block font-mono text-[9px] font-bold">
                  {latestReceipt.qrVerificationCode || "MEDIPAEDIA-VERIFIED-TX"}
                </div>
                <p className="text-[9px] text-slate-400">{t("cashier.print.thankYou") || "Thank you for choosing Medipaedia — your health, our priority."}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white"
                onClick={() => {
                  handleThermalPrint(latestReceipt);
                  setPaymentSuccess(false);
                }}
              >
                <Printer className="h-4 w-4" /> {t("cashier.print.printEscPos") || "Print 80mm ESC/POS"}
              </Button>
              <Button
                variant="outline"
                className="font-bold text-xs"
                onClick={() => setPaymentSuccess(false)}
              >
                {t("common.done") || "Done"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PrinterSetupModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        defaultTab="RECEIPT"
      />

      {opdCardToPrint ? (
        <OPDCardPrintModal
          isOpen={opdCardModalOpen}
          onClose={() => {
            setOpdCardModalOpen(false);
            setOpdCardToPrint(null);
          }}
          card={opdCardToPrint}
        />
      ) : null}

      <Modal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        title={t("cashier.modal.addServiceTitle") || "Add Billable Service from Catalog"}
      >
        <div className="space-y-3 py-2 text-xs">
          <p className="text-slate-500">
            {t("cashier.modal.addServiceDescription") || "Tap a catalog line item to add it to the current patient bill. NHIS tariffs are statutory; co-pay rates shown are payable at point of service."}
          </p>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {catalogServices.map((srv) => (
              <div
                key={srv.code}
                onClick={() => handleAddCatalogService(srv)}
                className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900">{srv.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {srv.code} &bull; {srv.category} &bull; {t("cashier.modal.nhis") || "NHIS"}: GHS {srv.nhisTariff.toFixed(2)}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-black text-teal-800 text-sm block">
                    GHS {srv.copay.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{t("cashier.modal.copay") || "Co-Pay"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsAddServiceModalOpen(false)}
              className="w-full text-xs"
            >
              {t("common.cancel") || "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
