"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  QrCode,
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Calendar,
  Layers,
  Loader2,
  AlertCircle,
  Printer,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";
import { createApiClient } from "@medipaedia/api-client";
import type { HospitalPatientCard, Tenant, IntakeTrack, BillingStatus } from "@medipaedia/api-client";
import { QRCodeSVG } from "qrcode.react";

type CardStatus = "ACTIVE" | "PENDING_REGISTRATION";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cardPalette(id: string): { gradient: string; accent: string; soft: string } {
  const palettes: Array<{ gradient: string; accent: string; soft: string }> = [
    { gradient: "from-teal-800 to-slate-900", accent: "text-teal-300", soft: "bg-teal-50 text-teal-800 border-teal-200" },
    { gradient: "from-slate-800 to-slate-950", accent: "text-slate-300", soft: "bg-slate-50 text-slate-800 border-slate-200" },
    { gradient: "from-indigo-900 to-slate-900", accent: "text-indigo-300", soft: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    { gradient: "from-emerald-900 to-slate-900", accent: "text-emerald-300", soft: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { gradient: "from-amber-900 to-slate-900", accent: "text-amber-300", soft: "bg-amber-50 text-amber-800 border-amber-200" },
    { gradient: "from-rose-900 to-slate-900", accent: "text-rose-300", soft: "bg-rose-50 text-rose-800 border-rose-200" },
  ];
  return palettes[hashString(id) % palettes.length];
}

function cardStatus(c: HospitalPatientCard): CardStatus {
  return c.is_active ? "ACTIVE" : "PENDING_REGISTRATION";
}

function statusBadge(s: CardStatus): "teal" | "warning" | "outline" {
  if (s === "ACTIVE") return "teal";
  if (s === "PENDING_REGISTRATION") return "warning";
  return "outline";
}

function intakeLabel(t?: IntakeTrack | string): string {
  if (!t) return "STANDARD";
  if (t === "STANDARD") return "Standard OPD";
  if (t === "CORPORATE_INSURANCE") return "Corporate Insurance";
  if (t === "EMERGENCY") return "Emergency Walk-In";
  return String(t);
}

function billingBadge(b?: BillingStatus): "success" | "warning" | "outline" | "danger" {
  if (!b) return "outline";
  if (b === "PAID" || b === "WAIVED") return "success";
  if (b === "UNPAID" || b === "PENDING") return "warning";
  return "outline";
}

function formatDateIso(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function HospitalCardsPage() {
  const apiClient = createApiClient();
  const [cards, setCards] = useState<HospitalPatientCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<HospitalPatientCard | null>(null);
  const [patientDisplayName, setPatientDisplayName] = useState<string>("—");
  const [facilityOptions, setFacilityOptions] = useState<Tenant[]>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkFacilityId, setLinkFacilityId] = useState<string>("");
  const [linkMrn, setLinkMrn] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [listResult, userResult] = await Promise.allSettled([
        apiClient.getPatientHospitalCards(),
        Promise.resolve(apiClient.getCurrentUser ? apiClient.getCurrentUser() : null).catch(() => null),
      ]);

      if (listResult.status === "fulfilled") {
        setCards(listResult.value ?? []);
      } else {
        const msg = listResult.reason instanceof Error ? listResult.reason.message : "Unable to load hospital cards";
        setError(msg);
        setCards([]);
      }

      if (userResult.status === "fulfilled" && userResult.value) {
        const u: any = userResult.value;
        const first = u?.first_name || u?.firstName || "";
        const last = u?.last_name || u?.lastName || "";
        const full = u?.full_name || u?.fullName || u?.name || "";
        const built = full || [first, last].filter(Boolean).join(" ");
        setPatientDisplayName(built || "—");
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load hospital cards");
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  const loadFacilities = useCallback(async () => {
    try {
      if (typeof (apiClient as any).getTenants !== "function") {
        setFacilityOptions([]);
        return;
      }
      const res = await (apiClient as any).getTenants?.("HOSPITAL");
      if (Array.isArray(res)) setFacilityOptions(res);
      else if (res && Array.isArray((res as any).items)) setFacilityOptions((res as any).items);
      else if (res && Array.isArray((res as any).data)) setFacilityOptions((res as any).data);
      else setFacilityOptions([]);
    } catch {
      setFacilityOptions([]);
    }
  }, [apiClient]);

  const openLinkModal = async () => {
    setLinkModalOpen(true);
    setLinkSuccess(false);
    setLinkFacilityId("");
    setLinkMrn("");
    await loadFacilities();
  };

  const handleLinkFacility = async () => {
    if (!linkFacilityId) return;
    try {
      setIsLinking(true);
      if (typeof (apiClient as any).selectFacility === "function") {
        await (apiClient as any).selectFacility(linkFacilityId);
      }
      setLinkSuccess(true);
      await loadCards();
      setTimeout(() => {
        setLinkSuccess(false);
        setLinkModalOpen(false);
      }, 1200);
    } catch (e: any) {
      alert(e?.message || "Unable to link facility");
    } finally {
      setIsLinking(false);
    }
  };

  const handlePrint = (c: HospitalPatientCard) => {
    setActiveCard(c);
    setTimeout(() => window.print(), 50);
  };

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const facilityNameOf = (c: HospitalPatientCard): string =>
    c.facility_name || c.tenant_code || "Medical Facility";

  const qrPayloadOf = (c: HospitalPatientCard): string =>
    JSON.stringify({ opd: c.card_number ?? "", pid: c.patient_id ?? "" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-700" /> Multi-Hospital Digital Card Wallet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            One-touch dynamic QR check-in passes for seamless hospital admissions
          </p>
        </div>

        <Button
          onClick={openLinkModal}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <Plus className="h-4 w-4" /> Link New Hospital Pass
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-slate-100 animate-pulse space-y-5 border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-slate-300 rounded" />
                  <div className="h-5 w-48 bg-slate-300 rounded mt-1" />
                </div>
                <div className="h-5 w-20 bg-slate-300 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-40 bg-slate-300 rounded" />
                <div className="h-7 w-56 bg-slate-300 rounded font-mono" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  <div className="h-3 w-24 bg-slate-300 rounded" />
                  <div className="h-4 w-40 bg-slate-300 rounded mt-1" />
                </div>
                <div className="h-9 w-32 bg-slate-300 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-extrabold text-rose-900">Unable to load your hospital cards</h3>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
                <Button
                  onClick={loadCards}
                  variant="primary"
                  size="sm"
                  className="mt-3 font-bold gap-2"
                >
                  <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center py-8 max-w-md mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
                <CreditCard className="h-7 w-7 text-teal-700" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">No hospital cards linked yet</h3>
              <p className="text-sm text-slate-500 mt-1.5">
                Connect your first facility registration pass to unlock instant check-in QR codes and synchronized medical records.
              </p>
              <Button
                onClick={openLinkModal}
                variant="primary"
                size="md"
                className="mt-5 font-bold gap-2 shadow-md shadow-teal-700/20"
              >
                <Plus className="h-4 w-4" /> Link Your First Hospital Pass
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const palette = cardPalette(card.id);
            const status = cardStatus(card);
            const issued = formatDateIso(card.registered_at || card.created_at);
            return (
              <div
                key={card.id}
                className={`p-6 rounded-3xl bg-gradient-to-br ${palette.gradient} text-white shadow-xl space-y-5 relative overflow-hidden border border-white/10`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
                      OFFICIAL OPD PASS
                    </span>
                    <h3 className="text-base font-black text-white leading-tight mt-0.5">
                      {facilityNameOf(card)}
                    </h3>
                  </div>
                  <Badge variant={statusBadge(status)} className="text-[10px] font-bold bg-white/20 text-white border-none">
                    {status === "ACTIVE" ? "ACTIVE" : "PENDING REGISTRATION"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-white/60 uppercase block">Card Number (ACC)</span>
                  <div className="text-lg font-black font-mono tracking-wider text-white">
                    {card.card_number || card.mrn || "—"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-white/60 block">Intake Track</span>
                    <span className={`text-[11px] font-black ${palette.accent}`}>
                      {intakeLabel(card.intake_type)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-white/60 block">Billing</span>
                    <Badge variant={billingBadge(card.billing_status)} className="text-[9px] font-bold px-2 py-0">
                      {card.billing_status || "PENDING"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-white/60 block">PATIENT</span>
                    <strong className="text-white">{patientDisplayName}</strong>
                    <div className="text-[10px] text-white/50 mt-0.5">Issued {issued}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint(card)}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold text-xs gap-1.5 shadow-md"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveCard(card)}
                      className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs gap-1.5 shadow-md"
                    >
                      <QrCode className="h-3.5 w-3.5" /> Check-in
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeCard && (
        <Modal
          isOpen={true}
          onClose={() => setActiveCard(null)}
          title={`Hospital Express Check-in — ${facilityNameOf(activeCard)}`}
          description="Present this QR code to the triage reception or self-service kiosk."
        >
          <div className="py-4 space-y-4 text-xs">
            <div id="opd-print-shell">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      OPD REGISTRATION PASS
                    </span>
                    <h3 className="text-sm font-black text-white mt-0.5 leading-tight">
                      {facilityNameOf(activeCard)}
                    </h3>
                  </div>
                  <Badge variant={statusBadge(cardStatus(activeCard))} className="text-[10px] font-bold">
                    {cardStatus(activeCard)}
                  </Badge>
                </div>

                <div className="bg-white rounded-2xl p-3 mx-auto flex items-center justify-center shadow-lg">
                  <QRCodeSVG
                    value={qrPayloadOf(activeCard)}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="text-center">
                  <strong className="text-base font-black text-white block font-mono">
                    {activeCard.card_number || activeCard.mrn || "—"}
                  </strong>
                  <div className="text-[11px] text-slate-400 mt-1">
                    MRN: <span className="font-mono">{activeCard.mrn || "—"}</span>
                    <span className="mx-2 opacity-50">•</span>
                    Track: <span className="font-semibold text-teal-300">{intakeLabel(activeCard.intake_type)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Patient: <span className="font-semibold">{patientDisplayName}</span>
                  </div>
                </div>

                <p className="text-[11px] text-teal-300 font-medium text-center">
                  ⚡ Secure, scannable, and linked to your patient identity
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => window.print()}
                className="w-full font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveCard(null)}
                className="w-full font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {linkModalOpen && (
        <Modal
          isOpen={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          title="Link New Facility Registration Pass"
          description="Connect your patient identity to another hospital's electronic health record system."
        >
          <div className="py-4 space-y-3 text-xs">
            {linkSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Hospital Card Linked!</h3>
                <p className="text-[11px] font-normal text-emerald-700">
                  Your facility record is now available in your wallet.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Select Healthcare Facility</label>
                  <select
                    value={linkFacilityId}
                    onChange={(e) => setLinkFacilityId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="">
                      {facilityOptions.length === 0
                        ? "No facilities available to list"
                        : "— Select a facility —"}
                    </option>
                    {facilityOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.slug || String(t.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Existing MRN (If already registered)</label>
                  <input
                    type="text"
                    value={linkMrn}
                    onChange={(e) => setLinkMrn(e.target.value)}
                    placeholder="Optional — facility MRN if known"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                  />
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleLinkFacility}
                  disabled={!linkFacilityId || isLinking}
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2 gap-2"
                >
                  {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isLinking ? "Authorizing…" : "Authorize & Link Hospital Record"}
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
