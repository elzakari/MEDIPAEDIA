"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  AlertCircle,
  Inbox,
  RefreshCw,
  User,
  CreditCard,
  Calendar,
  Droplets,
  Phone,
  Mail,
  AlertTriangle,
  Printer as PrinterIcon,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  Badge,
  useTranslation,
} from "@medipaedia/ui";
import { createApiClient, type PatientAccount, type HospitalPatientCard } from "@medipaedia/api-client";
import { OPDCardPrintModal, type OPDCardPrintData } from "@/components/clinical/OPDCardPrintModal";

export default function PatientDirectoryPage() {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [opdModalOpen, setOpdModalOpen] = useState(false);
  const [opdCardForPrint, setOpdCardForPrint] = useState<OPDCardPrintData | null>(null);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const client = createApiClient();
      const data = await client.getPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error") || "Error";
      setErrorMessage(message);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filtered = patients.filter((p) => {
    const s = search.toLowerCase();
    if (!s) return true;
    const hay = [
      p.ghana_card_id,
      p.date_of_birth,
      p.gender,
      p.blood_group,
      p.allergies,
      p.emergency_contact_name,
      p.emergency_contact_phone,
      ...(p.hospital_cards || []).flatMap((c: HospitalPatientCard) => [c.mrn, c.id, c.qr_token]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(s);
  });

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const calculateAge = (dob?: string): string => {
    if (!dob) return "—";
    try {
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return "—";
      const diff = Date.now() - birth.getTime();
      const ageYrs = Math.floor(diff / 31536000000);
      if (ageYrs >= 1) return `${ageYrs} yrs`;
      const ageMos = Math.floor(diff / 2592000000);
      return `${ageMos} mos`;
    } catch {
      return "—";
    }
  };

  const getPrimaryCard = (p: PatientAccount): HospitalPatientCard | undefined => {
    return p.hospital_cards?.find((c: HospitalPatientCard) => c.is_active) || p.hospital_cards?.[0];
  };

  const getGenderLabel = (g?: string) => {
    if (!g) return "—";
    const lower = g.toLowerCase();
    if (lower === "male") return t("reception.genderMale") || "Male";
    if (lower === "female") return t("reception.genderFemale") || "Female";
    return g;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("clinical.patientDirectoryTitle") || "Patient Records Directory"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("clinical.patientDirectorySubtitle") || "Unified patient registry with Ghana Card IDs, MRN assignments, blood group, allergy history, and emergency contacts."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPatients} disabled={isLoading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("common.refresh") || "Refresh"}
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold text-rose-800">{t("common.error") || "Patient registry unavailable"}</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <Button size="sm" variant="primary" onClick={loadPatients}>
            {t("common.retry") || "Retry"}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clinical.searchPatientsPlaceholder") || "Search patient name, MRN, Ghana Card, blood group, or allergy..."}
            className="pl-10 text-xs"
          />
        </div>
        <Badge variant="teal" className="text-xs font-bold px-3 py-2 self-start sm:self-center">
          <User className="h-3 w-3 mr-1 inline" />
          {patients.length} {t("clinical.totalRegistered") || "Registered Patients"}
        </Badge>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-5 border border-slate-200 bg-white space-y-3 animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !errorMessage && patients.length === 0 && (
        <Card className="p-10 border-dashed border-teal-200 bg-teal-50">
          <div className="text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-white border border-teal-100 text-teal-700">
              <Inbox className="h-10 w-10" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              {t("clinical.patientsEmpty") || "Patient Registry Empty"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t("clinical.patientsEmptyDesc") || "No patients are registered yet. Patients will appear here automatically once reception completes OPD walk-in registration and hospital card issuance."}
            </p>
            <div className="pt-2">
              <Button size="sm" variant="primary" onClick={loadPatients} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("common.refresh") || "Refresh registry"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !errorMessage && patients.length > 0 && filtered.length === 0 && (
        <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
          <div className="text-center space-y-2">
            <Search className="h-10 w-10 mx-auto text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-700">
              {t("common.noResults") || "No matching patients"}
            </h3>
            <p className="text-xs text-slate-500">
              {t("common.adjustSearch") || "Try clearing your search or adjusting filter criteria."}
            </p>
          </div>
        </Card>
      )}

      {!isLoading && !errorMessage && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const card = getPrimaryCard(p);
            const age = calculateAge(p.date_of_birth);
            return (
              <Card
                key={p.id}
                className="p-5 border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-base">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {p.ghana_card_id ? t("clinical.anonymousPatient") || `Patient ${p.ghana_card_id.slice(-4)}` : t("patient.portalTitle") || "Patient"}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            {getGenderLabel(p.gender)} • {age}
                          </span>
                          {card?.is_active ? (
                            <Badge variant="teal" className="text-[9px] uppercase font-bold py-0 px-1.5">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 px-1.5">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                      {p.blood_group && (
                        <Badge variant="danger" className="text-[10px] font-mono font-bold shrink-0">
                          <Droplets className="h-3 w-3 mr-0.5" />
                          {p.blood_group}
                        </Badge>
                      )}
                    </div>

                    {card?.mrn && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                        <CreditCard className="h-3 w-3 text-teal-600 shrink-0" />
                        <span className="truncate">{t("reception.nhisNumber") || "MRN"}: <strong className="text-slate-800">{card.mrn}</strong></span>
                      </div>
                    )}

                    {p.ghana_card_id && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <CreditCard className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{p.ghana_card_id}</span>
                      </div>
                    )}

                    {p.date_of_birth && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{formatDate(p.date_of_birth)}</span>
                      </div>
                    )}

                    {p.allergies && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-800">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2"><strong>{t("doctor.allergies") || "Allergies"}:</strong> {p.allergies}</span>
                      </div>
                    )}

                    {p.emergency_contact_name && (
                      <div className="pt-1 border-t border-slate-100 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{p.emergency_contact_name}</span>
                        </div>
                        {p.emergency_contact_phone && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.emergency_contact_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {card?.registered_at && (
                      <div className="pt-1 text-[10px] text-slate-400 font-mono">
                        {t("common.date") || "Registered"}: {formatDate(card.registered_at)}
                      </div>
                    )}

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const data: OPDCardPrintData = {
                            cardNumber:
                              (card as any)?.opd_card_number ||
                              (card as any)?.card_number ||
                              card?.qr_token ||
                              (card?.mrn ? `ACC-${card.mrn}` : `PAT-${p.id.slice(0, 8).toUpperCase()}`),
                            patientName:
                              (p as any)?.full_name ||
                              (p as any)?.name ||
                              p.ghana_card_id ||
                              (t("clinical.anonymousPatient") || "Patient"),
                            patientId: p.id,
                            mrn: card?.mrn || undefined,
                            intakeTrack:
                              (((card as any)?.intake_track || (card as any)?.track) as
                                | "STANDARD"
                                | "CORPORATE_INSURANCE"
                                | "EMERGENCY") || "STANDARD",
                            billingStatus:
                              (card as any)?.billing_status ||
                              (card?.is_active ? "ACTIVE" : "PENDING"),
                            triageStatus:
                              (card as any)?.triage_status ||
                              (p as any)?.triage_status ||
                              "NOT TRIAGED",
                            emergencyDeferred:
                              !!(card as any)?.emergency_deferred || false,
                            facilityName:
                              (card as any)?.facility_name ||
                              (card as any)?.branch_name ||
                              undefined,
                            facilityCode:
                              (card as any)?.facility_code ||
                              (card as any)?.branch_code ||
                              undefined,
                            issuedAt: card?.registered_at || p.created_at || undefined,
                            bloodGroup: p.blood_group || undefined,
                            emergencyContact:
                              [p.emergency_contact_name, p.emergency_contact_phone]
                                .filter(Boolean)
                                .join(" · ") || undefined,
                          };
                          setOpdCardForPrint(data);
                          setOpdModalOpen(true);
                        }}
                        className="gap-1.5 text-[11px] font-bold border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 h-8"
                      >
                        <PrinterIcon className="h-3.5 w-3.5 text-teal-600" />
                        {t("reception.printOpdCard", "Print OPD Card")}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {opdCardForPrint ? (
        <OPDCardPrintModal
          isOpen={opdModalOpen}
          onClose={() => {
            setOpdModalOpen(false);
            setOpdCardForPrint(null);
          }}
          card={opdCardForPrint}
        />
      ) : null}
    </div>
  );
}
