"use client";

import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  CreditCard,
  Receipt,
  X,
  ShieldAlert,
  CheckCircle2,
  User,
  Clock,
  Building2,
} from "lucide-react";
import { Badge, Button, useTranslation } from "@medipaedia/ui";
import { cn } from "@medipaedia/ui/src/lib/utils";

export interface OPDCardPrintData {
  cardNumber: string;
  patientName: string;
  patientId: string;
  mrn?: string;
  intakeTrack: "STANDARD" | "CORPORATE_INSURANCE" | "EMERGENCY";
  billingStatus: string;
  triageStatus: string;
  emergencyDeferred?: boolean;
  facilityName?: string;
  facilityCode?: string;
  issuedAt?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface OPDCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: OPDCardPrintData | null;
}

type CardView = "thermal" | "badge";

function TrackBadge({
  intakeTrack,
  variant,
  emergencyDeferred,
}: {
  intakeTrack: OPDCardPrintData["intakeTrack"];
  variant: CardView;
  emergencyDeferred?: boolean;
}) {
  const map: Record<
    OPDCardPrintData["intakeTrack"],
    { label: string; cls: string; icon?: typeof ShieldAlert }
  > = {
    STANDARD: {
      label: "STANDARD INTAKE",
      cls:
        variant === "thermal"
          ? "border-black text-black bg-white"
          : "border-slate-600 bg-slate-900 text-slate-100",
    },
    CORPORATE_INSURANCE: {
      label: "CORPORATE / INSURANCE",
      cls:
        variant === "thermal"
          ? "border-black text-black bg-white"
          : "border-indigo-600 bg-indigo-950 text-indigo-100",
    },
    EMERGENCY: {
      label: "⚡ EMERGENCY",
      cls:
        variant === "thermal"
          ? "border-black text-black bg-white font-black"
          : "border-rose-600 bg-rose-950 text-rose-100",
      icon: ShieldAlert,
    },
  };
  const info = map[intakeTrack];
  const Icon = info.icon;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-black text-[10px] uppercase tracking-widest",
          info.cls
        )}
      >
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {info.label}
      </div>
      {emergencyDeferred ? (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
            variant === "thermal"
              ? "border-black text-black"
              : "border-amber-500 bg-amber-950 text-amber-100"
          )}
        >
          <ShieldAlert className="h-2.5 w-2.5" />
          DEF
        </div>
      ) : null}
    </div>
  );
}

function ThermalRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-0.5">
      <span className="uppercase text-black/60 font-bold shrink-0 text-[9px]">
        {label}
      </span>
      <span
        className={cn(
          "font-bold text-right truncate text-black text-[9px]",
          mono && "font-mono tracking-wide"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ThermalSlipView({ card }: { card: OPDCardPrintData }) {
  const { t } = useTranslation();
  const facility = card.facilityName || t("opd.defaultFacility", "MEDIPAEDIA HEALTHCARE NETWORK");
  const facilityCode = card.facilityCode || "GH-ACC-MP-01";
  const issued = card.issuedAt
    ? new Date(card.issuedAt).toLocaleString()
    : new Date().toLocaleString();
  const qrPayload = useMemo(
    () => JSON.stringify({ opd: card.cardNumber, pid: card.patientId }),
    [card.cardNumber, card.patientId]
  );

  return (
    <div
      id="opd-thermal-printable"
      data-print-target="thermal"
      className="mx-auto bg-white text-black font-mono"
      style={{
        width: "80mm",
        maxWidth: "80mm",
        minHeight: "190mm",
        padding: "4mm 3mm",
      }}
    >
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-black">
          <Building2 className="h-3 w-3 text-black" />
          <div className="text-[11px] font-black uppercase tracking-widest leading-tight">
            {facility}
          </div>
        </div>
        <div className="text-[8px] uppercase tracking-widest text-black/70">
          {facilityCode} · Inpatient &amp; Outpatient Services
        </div>
        <div className="mt-2 border-t border-dashed border-black/60 border-b border-dashed border-black/60 py-1 text-[8px] font-bold uppercase">
          ⚠ {t("opd.emergencyDisclaimer", "Present this slip at all service counters. For emergencies, call front desk immediately.")}
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[8px] uppercase tracking-widest text-black/60">
          <CreditCard className="h-2.5 w-2.5 text-black/70" />
          {t("opd.cardNumber", "OPD Card Number")}
        </div>
        <div className="mt-1 text-[17px] font-black tracking-widest break-all leading-none text-black">
          {card.cardNumber}
        </div>
      </div>

      <div className="mt-3 flex justify-center bg-white py-1">
        <div className="border border-black/40 p-1 bg-white">
          <QRCodeSVG
            value={qrPayload}
            size={128}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>

      <div className="mt-2 space-y-1 text-[9px] text-black">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <span className="flex items-center gap-1 uppercase text-black/60 font-bold shrink-0 text-[9px]">
            <User className="h-2.5 w-2.5" />
            {t("opd.patientName", "PATIENT")}
          </span>
          <span className="font-bold text-right truncate text-black text-[9px]">
            {card.patientName}
          </span>
        </div>
        <ThermalRow label={t("opd.mrn", "MRN")} value={card.mrn || "—"} mono />
        <ThermalRow label={t("opd.pid", "PATIENT ID")} value={card.patientId} mono />
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <span className="flex items-center gap-1 uppercase text-black/60 font-bold shrink-0 text-[9px]">
            <Clock className="h-2.5 w-2.5" />
            {t("opd.issuedAt", "ISSUED")}
          </span>
          <span className="font-bold text-right truncate text-black text-[9px]">
            {issued}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <TrackBadge
          intakeTrack={card.intakeTrack}
          variant="thermal"
          emergencyDeferred={card.emergencyDeferred}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[8px] uppercase text-black">
        <div className="border border-black/60 p-1 rounded-sm bg-white">
          <div className="opacity-70">{t("opd.billing", "BILLING")}</div>
          <div className="font-black">{card.billingStatus}</div>
        </div>
        <div className="border border-black/60 p-1 rounded-sm bg-white">
          <div className="opacity-70">{t("opd.triage", "TRIAGE")}</div>
          <div className="font-black">{card.triageStatus}</div>
        </div>
      </div>

      <div className="mt-2 border-t border-dashed border-black/60 pt-1 text-[8px] text-center text-black">
        <div className="flex items-center justify-center gap-1 text-black/80">
          <CheckCircle2 className="h-2.5 w-2.5" />
          <span className="uppercase tracking-widest font-bold">
            {t("opd.verified", "Barcoded &amp; verified at issuance")}
          </span>
        </div>
        <div className="mt-0.5 uppercase tracking-widest opacity-60">
          — {t("opd.thankYou", "Thank you for choosing Medipaedia")} —
        </div>
      </div>
    </div>
  );
}

function IdBadgeMicro({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[6.8px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div
        className={cn(
          "text-[10px] font-bold truncate text-white",
          mono && "font-mono tracking-wider"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function IdBadgeView({ card }: { card: OPDCardPrintData }) {
  const { t } = useTranslation();
  const facility = card.facilityName || t("opd.defaultFacilityShort", "MEDIPAEDIA");
  const facilityCode = card.facilityCode || "GH-ACC-MP-01";
  const qrPayload = useMemo(
    () => JSON.stringify({ opd: card.cardNumber, pid: card.patientId }),
    [card.cardNumber, card.patientId]
  );

  return (
    <div
      id="opd-badge-printable"
      data-print-target="badge"
      className="mx-auto text-white"
      style={{
        width: "85.6mm",
        height: "53.98mm",
        maxWidth: "85.6mm",
        borderRadius: "3.18mm",
        overflow: "hidden",
        background:
          "linear-gradient(135deg,#0f172a 0%,#0b3b3b 38%,#134e4a 60%,#0f172a 100%)",
        color: "#fff",
        boxShadow: "0 10px 40px rgba(0,0,0,.45)",
        position: "relative",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, #fff 0, transparent 40%), radial-gradient(circle at 90% 90%, #fff 0, transparent 40%)",
        }}
      />
      <div className="relative h-full flex flex-col p-[3mm]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-[7mm] w-[7mm] rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-inner">
              <User className="h-[4.5mm] w-[4.5mm] text-slate-900" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.22em] text-teal-200">
                <Building2 className="h-[3mm] w-[3mm] text-teal-300" />
                {facility}
              </div>
              <div className="text-[7.5px] uppercase tracking-[0.2em] text-white/60">
                {facilityCode} · {t("opd.outpatient", "OUTPATIENT ID")}
              </div>
            </div>
          </div>
          <TrackBadge
            intakeTrack={card.intakeTrack}
            variant="badge"
            emergencyDeferred={card.emergencyDeferred}
          />
        </div>

        <div className="mt-[2mm] flex items-stretch gap-[3mm] flex-1 min-h-0">
          <div className="shrink-0">
            <div
              className="rounded-[2.5mm] bg-white/10 border border-white/15 flex items-center justify-center text-white/40 font-black"
              style={{ width: "18mm", height: "22mm" }}
            >
              <div className="text-center leading-tight">
                <User className="h-[7mm] w-[7mm] mx-auto" />
                <div className="mt-1 text-[6px] uppercase tracking-wider text-white/50">
                  {t("opd.photoPlaceholder", "PHOTO")}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-[1.2mm] justify-center">
            <div>
              <div className="text-[8.5px] uppercase tracking-widest text-white/50">
                {t("opd.patientName", "PATIENT")}
              </div>
              <div className="text-[13px] font-black leading-none truncate text-white">
                {card.patientName}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-[3mm] gap-y-[1mm]">
              <IdBadgeMicro label={t("opd.mrn", "MRN")} value={card.mrn || "—"} mono />
              <IdBadgeMicro label={t("opd.bloodGroup", "BLOOD")} value={card.bloodGroup || "—"} />
              <IdBadgeMicro
                label={t("opd.issuedAt", "ISSUED")}
                value={
                  card.issuedAt
                    ? new Date(card.issuedAt).toLocaleDateString()
                    : new Date().toLocaleDateString()
                }
                mono
              />
              <IdBadgeMicro label={t("opd.triage", "TRIAGE")} value={card.triageStatus} />
            </div>
            <div>
              <div className="text-[7px] uppercase tracking-widest text-white/50">
                {t("opd.emergencyContact", "EMERGENCY CONTACT")}
              </div>
              <div className="text-[10px] font-bold truncate text-teal-200">
                {card.emergencyContact || t("opd.onFile", "On file")}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center gap-[1mm]">
            <div
              className="rounded-[1.2mm] bg-white p-[0.8mm] shadow-inner"
              style={{ width: "19mm", height: "19mm" }}
            >
              <QRCodeSVG
                value={qrPayload}
                size={56}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="text-center font-mono tracking-wider">
              <div className="text-[6.5px] text-white/50 uppercase tracking-[0.18em]">
                {t("opd.cardNumberShort", "OPD #")}
              </div>
              <div className="text-[9.5px] font-black text-white leading-none">
                {card.cardNumber}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-[2mm] pt-[1.5mm] border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[7px] uppercase tracking-widest text-teal-200/90">
            <CheckCircle2 className="h-[2.8mm] w-[2.8mm]" />
            {t("opd.verifiedBadge", "Verified · Patient ID linked")}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="teal"
              className="!bg-teal-400/15 !text-teal-200 !border-teal-400/30 !text-[7px] !px-1.5 !py-0.5"
            >
              BILLING: {card.billingStatus}
            </Badge>
            <div
              className="h-[2mm] w-[16mm] rounded-[0.4mm] relative overflow-hidden"
              aria-hidden
              style={{
                background:
                  "repeating-linear-gradient(90deg,#fff 0 1.2mm,#0f172a 1.2mm 2.4mm,#14b8a6 2.4mm 3.2mm)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OPDCardPrintModal({
  isOpen,
  onClose,
  card,
}: OPDCardPrintModalProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<CardView>("thermal");

  useEffect(() => {
    if (!isOpen) setView("thermal");
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @media print {
          @page { size: auto; margin: 2mm; }
          html, body, #__next { background: #fff !important; }
          body * { visibility: hidden !important; }
          #opd-print-shell,
          #opd-print-shell * { visibility: visible !important; }
          #opd-print-shell {
            position: fixed !important;
            inset: 0 !important;
            padding: 4mm 4mm !important;
            background: #fff !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            overflow: visible !important;
          }
          .opd-print-area {
            width: auto !important;
            height: auto !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .opd-screen-only { display: none !important; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150 opd-screen-only"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 bg-gradient-to-r from-slate-50 via-white to-teal-50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-900 tracking-tight truncate">
                  {t("opd.modalTitle", "OPD Intake Card — Print")}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {card?.cardNumber || "—"} · {card?.patientName || "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-5 pt-3 opd-screen-only flex-wrap">
            <button
              type="button"
              onClick={() => setView("thermal")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition border opd-screen-only",
                view === "thermal"
                  ? "bg-teal-600 text-white border-teal-700 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Receipt className="h-4 w-4" />
              {t("opd.tabThermal", "Thermal Slip (80mm POS)")}
            </button>
            <button
              type="button"
              onClick={() => setView("badge")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition border opd-screen-only",
                view === "badge"
                  ? "bg-teal-600 text-white border-teal-700 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <CreditCard className="h-4 w-4" />
              {t("opd.tabBadge", "ID Badge (CR80 PVC)")}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                {t("opd.printNow", "Print")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => window.print()}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700"
                disabled={!card}
              >
                <Printer className="h-4 w-4" />
                {t("opd.printPrimary", "Print Card")}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
            <div
              id="opd-print-shell"
              className={cn(
                "opd-print-area mx-auto w-full rounded-xl border border-slate-200 py-8 flex items-start justify-center",
                view === "thermal" ? "bg-white" : "bg-slate-900"
              )}
            >
              {card ? (
                view === "thermal" ? (
                  <ThermalSlipView card={card} />
                ) : (
                  <IdBadgeView card={card} />
                )
              ) : (
                <div className="py-16 text-center space-y-3 max-w-sm">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">
                    {t("opd.noCardData", "No OPD card data loaded")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      "opd.noCardDataDesc",
                      "Complete a valid billing/registration transaction or select a patient record to populate the printable card."
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 flex items-center justify-between gap-3 opd-screen-only">
            <p className="text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                {t(
                  "opd.footerHint",
                  "Tip: Scoped @media print hides all page chrome — only the highlighted card container is sent to printer."
                )}
              </span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {t("common.close", "Close")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
