"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Search,
  Plus,
  Pill,
  ArrowLeft,
  QrCode,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  FileText,
  Bed,
  Send,
  Sparkles,
  Zap,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Calculator,
  ShieldAlert,
  X,
  TrendingUp,
  Flame,
  Check,
  Mic,
  MicOff,
  Bot,
  Radio,
  BrainCircuit,
  Wand2,
  Loader2,
  Inbox,
  RefreshCw,
  Printer,
  Video,
  ShieldCheck as ShieldCheckIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal, QRCode, useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  ClinicalMacro,
  PatientLongitudinalTrends,
  StatNursingOrder,
  AISoapScribeResponse,
  ICD10DifferentialItem,
  PatientHistory,
  VitalsResult,
  Consultation,
  AuthMe,
  ICD10Item,
  PrescriptionPrintData,
  PrescriptionItem,
  TelemedicineTokenResponse,
} from "@medipaedia/api-client";
import { LiveKitRoomModal } from "@/components/telemedicine/LiveKitRoomModal";
import { StartCallButton } from "@/components/telemedicine/StartCallButton";

type MedicationItem = {
  drug: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
};

type DiagnosticTestSelection = {
  code: string;
  name: string;
  category: "LABORATORY" | "IMAGING" | "POINT_OF_CARE";
  priority: "STAT" | "ROUTINE";
  selected: boolean;
};

export default function DoctorConsultationWorkstationPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams?.get("patient_id") || searchParams?.get("card") || searchParams?.get("patientId");
  const queueTicketId = searchParams?.get("ticket_id") || searchParams?.get("queueId");
  const consultationId = (id as string) || "";

  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [mintedPrescription, setMintedPrescription] = useState<PrescriptionPrintData | null>(null);

  const loadContext = useCallback(async () => {
    if (!consultationId) {
      setIsLoadingContext(false);
      return;
    }

    // NEW: Guard against hitting /api/v1/consultations/new (HTTP 404) when id === 'new'
    // Initialize a fresh blank consultation draft instead of fetching from API
    if (consultationId === 'new' || (id && String(id) === 'new')) {
      const draftConsultation = {
        id: 'draft',
        patient_id: patientId || '',
        chief_complaint: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        prescriptions: [],
        status: 'IN_PROGRESS' as const,
      } as unknown as Consultation;
      setConsultation(draftConsultation);
      setIsLoadingContext(true);
      setContextError(null);
      try {
        const client = createApiClient();
        const [user] = await Promise.all([
          client.getCurrentUser(),
        ]);
        setCurrentUser(user);
        if (patientId) {
          try {
            const history = await client.getPatientHistory(patientId);
            setPatientHistory(history);
            if (history.recent_vitals && history.recent_vitals[0]) {
              const v = history.recent_vitals[0];
              setObjective((prev) => {
                if (prev && prev.trim().length > 10) return prev;
                return `[Autopopulated from Triage Vitals] • BP: ${v.systolic_bp ?? "-"}/${v.diastolic_bp ?? "-"} mmHg • Temp: ${v.temperature ?? "-"}°C • HR: ${v.heart_rate ?? "-"} bpm • SpO2: ${v.spo2 ?? "-"}%`;
              });
            }
          } catch {
            setPatientHistory(null);
          }
        }
      } catch (err) {
        if (consultationId === 'new' || (id && String(id) === 'new')) {
          setContextError(null);
        } else {
          const message = err instanceof Error ? err.message : (t("common.error") || "Error");
          setContextError(message);
        }
      } finally {
        setIsLoadingContext(false);
      }
      return;
    }

    setIsLoadingContext(true);
    setContextError(null);
    try {
      const client = createApiClient();
      const [user, enc] = await Promise.all([
        client.getCurrentUser(),
        client.getConsultation(consultationId),
      ]);
      setCurrentUser(user);
      setConsultation(enc);
      const patientPk = (enc as any).patient_id || (enc as any).patient_account_id;
      if (patientPk) {
        const history = await client.getPatientHistory(patientPk);
        setPatientHistory(history);
        if (history.recent_vitals && history.recent_vitals[0]) {
          const v = history.recent_vitals[0];
          setObjective((prev) => {
            if (prev && prev.trim().length > 10) return prev;
            return `[Autopopulated from Triage Vitals] • BP: ${v.systolic_bp ?? "-"}/${v.diastolic_bp ?? "-"} mmHg • Temp: ${v.temperature ?? "-"}°C • HR: ${v.heart_rate ?? "-"} bpm • SpO2: ${v.spo2 ?? "-"}%`;
          });
        }
      }
      if (enc) {
        if (enc.chief_complaint) setChiefComplaint(enc.chief_complaint);
        const soap: any = (enc as any).soap || (enc as any).soap_notes || {};
        if (soap.subjective) setSubjective(soap.subjective);
        if (soap.objective && !objective) setObjective(soap.objective);
        if (soap.assessment) setAssessment(soap.assessment);
        if (soap.plan) setPlan(soap.plan);
        const encIcd: any = (enc as any).icd10_code || (enc as any).primary_icd10;
        if (encIcd) {
          setPrimaryIcd10({
            code: (typeof encIcd === "string") ? encIcd : encIcd.code,
            description: (typeof encIcd === "string") ? ((enc as any).diagnosis || "") : encIcd.description,
          });
        }
        if ((enc as any).hpi) setHpi((enc as any).hpi);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (t("common.error") || "Error");
      setContextError(message);
      setPatientHistory(null);
      setConsultation(null);
    } finally {
      setIsLoadingContext(false);
    }
  }, [consultationId, id, patientId, t]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const [rightTab, setRightTab] = useState<"RX" | "CPOE" | "DISPOSITION">("RX");

  // Clinical Acceleration State
  const [availableMacros, setAvailableMacros] = useState<ClinicalMacro[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState<string>("");
  const [macroNotice, setMacroNotice] = useState<string | null>(null);

  // Diagnostic Trends Overlay State
  const [trendDrawerOpen, setTrendDrawerOpen] = useState(false);
  const [trendData, setTrendData] = useState<PatientLongitudinalTrends | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // STAT Nursing Order State
  const [statOrderModalOpen, setStatOrderModalOpen] = useState(false);
  const [statInstruction, setStatInstruction] = useState("");
  const [statUrgency, setStatUrgency] = useState<"STAT" | "URGENT">("STAT");
  const [statNotes, setStatNotes] = useState("");
  const [isSubmittingStat, setIsSubmittingStat] = useState(false);
  const [statSuccessToast, setStatSuccessToast] = useState<string | null>(null);
  const [statErrorToast, setStatErrorToast] = useState<string | null>(null);

  // Ambient AI Clinical Scribe & Differential Co-Pilot State
  const [isRecordingScribe, setIsRecordingScribe] = useState(false);
  const [isGeneratingScribe, setIsGeneratingScribe] = useState(false);
  const [scribeModalOpen, setScribeModalOpen] = useState(false);
  const [aiGeneratedSoap, setAiGeneratedSoap] = useState<AISoapScribeResponse | null>(null);
  const [ambientAudioText, setAmbientAudioText] = useState("");
  const [aiDifferentials, setAiDifferentials] = useState<ICD10DifferentialItem[]>([]);
  const [isLoadingDifferentials, setIsLoadingDifferentials] = useState(false);

  // LiveKit Telemedicine Room State
  const [telemedModalOpen, setTelemedModalOpen] = useState(false);
  const [isFetchingTelemed, setIsFetchingTelemed] = useState(false);
  const [telemedSession, setTelemedSession] = useState<TelemedicineTokenResponse | null>(null);
  const [telemedError, setTelemedError] = useState<string | null>(null);

  const handleTriggerAIScribe = async () => {
    setIsGeneratingScribe(true);
    try {
      const res = await createApiClient().generateAISoapEncounter({
        transcript_text: ambientAudioText,
        patient_context: {
          vitals: {
            blood_pressure: "128/84 mmHg",
            temperature: "38.6 °C",
            pulse: "88 bpm",
            spo2: "98%",
          },
        },
      });
      setAiGeneratedSoap(res);
      setScribeModalOpen(true);
    } catch (err: any) {
      console.warn("AI Scribe error:", err.message);
    } finally {
      setIsGeneratingScribe(false);
    }
  };

  const handleApplyAISoapDraft = () => {
    if (!aiGeneratedSoap) return;
    setSubjective(aiGeneratedSoap.soap.subjective);
    setObjective(aiGeneratedSoap.soap.objective);
    setAssessment(aiGeneratedSoap.soap.assessment);
    setPlan(aiGeneratedSoap.soap.plan);

    if (aiGeneratedSoap.suggested_icd10_code) {
      setPrimaryIcd10({
        code: aiGeneratedSoap.suggested_icd10_code,
        description: aiGeneratedSoap.suggested_icd10_title,
      });
    }

    if (aiGeneratedSoap.suggested_prescriptions && aiGeneratedSoap.suggested_prescriptions.length > 0) {
      const formattedRx: MedicationItem[] = aiGeneratedSoap.suggested_prescriptions.map((p) => ({
        drug: p.name,
        dosage: p.dosage,
        route: "Oral",
        frequency: "As Directed",
        duration: p.duration || "3 days",
        quantity: 1,
      }));
      setRxItems(formattedRx);
    }

    setScribeModalOpen(false);
    setMacroNotice("✨ AI Scribe Draft successfully populated across SOAP, ICD-10, and Rx items!");
    setTimeout(() => setMacroNotice(null), 4000);
  };

  const handleStartTelemedicine = async () => {
    if (!consultationId || consultationId === "new" || consultationId === "draft") {
      setTelemedError(t("telemed.saveEncounterFirst", "Save the consultation encounter before starting a video session.") || "Save the consultation encounter before starting a video session.");
      setTimeout(() => setTelemedError(null), 4500);
      return;
    }
    setIsFetchingTelemed(true);
    setTelemedError(null);
    try {
      const client = createApiClient();
      const roomName = `consultation-${consultationId}`;
      const session = await client.generateTelemedicineToken({
        consultation_id: consultationId,
        room_name: roomName,
      });
      setTelemedSession(session);
      setTelemedModalOpen(true);
    } catch (err: any) {
      const msg =
        err instanceof Error
          ? err.message
          : t("telemed.tokenFetchFailed", "Failed to obtain telemedicine session token.") ||
            "Failed to obtain telemedicine session token.";
      setTelemedError(msg);
      console.warn("Telemedicine token fetch error:", err);
      setTimeout(() => setTelemedError(null), 6000);
    } finally {
      setIsFetchingTelemed(false);
    }
  };

  const handleCloseTelemed = () => {
    setTelemedModalOpen(false);
    setTelemedSession(null);
  };

  const handleFetchAIDifferentials = async () => {
    setIsLoadingDifferentials(true);
    try {
      const res = await createApiClient().getAICalculatedICD10Differentials({
        symptoms: [chiefComplaint, subjective],
        vitals_summary: "Temp 38.6°C, BP 128/84, HR 88 bpm, Malaria RDT Positive",
        history: hpi,
        encounter_notes: assessment,
      });
      setAiDifferentials(res.differentials || []);
    } catch (err: any) {
      console.warn("AI Differentials error:", err.message);
    } finally {
      setIsLoadingDifferentials(false);
    }
  };

  // Center Panel Documentation State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    handleFetchAIDifferentials();
  }, [assessment, chiefComplaint]);

  // ICD-10 Diagnostic Tagging
  const [primaryIcd10, setPrimaryIcd10] = useState<{ code: string; description: string } | null>(null);
  const [differentialIcd10s, setDifferentialIcd10s] = useState<Array<{ code: string; description: string }>>([]);
  const [icdSearchQuery, setIcdSearchQuery] = useState("");
  const [icdDropdownOpen, setIcdDropdownOpen] = useState(false);
  const [icd10List, setIcd10List] = useState<ICD10Item[]>([]);
  const [icdSearchLoading, setIcdSearchLoading] = useState(false);
  const [icdSearchError, setIcdSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!icdSearchQuery.trim()) {
      setIcd10List([]);
      setIcdSearchError(null);
      return;
    }
    let cancelled = false;
    setIcdSearchLoading(true);
    setIcdSearchError(null);
    createApiClient().searchICD10(icdSearchQuery).then((results) => {
      if (!cancelled) setIcd10List(results || []);
    }).catch((err: any) => {
      if (!cancelled) setIcdSearchError(err?.message || (t("doctor.icd10SearchUnavailable") || "ICD-10 search unavailable"));
    }).finally(() => {
      if (!cancelled) setIcdSearchLoading(false);
    });
    return () => { cancelled = true; };
  }, [icdSearchQuery, t]);

  // Right Panel: E-Prescription State
  const [rxItems, setRxItems] = useState<MedicationItem[]>([]);
  const [newDrugInput, setNewDrugInput] = useState("");
  const [newDoseInput, setNewDoseInput] = useState("");
  const [newFreqInput, setNewFreqInput] = useState("BD");
  const [newDurationInput, setNewDurationInput] = useState("3 days");

  // CDS Safety Validation State
  const [cdsAlerts, setCdsAlerts] = useState<Array<{ type: "DANGER" | "WARNING"; text: string }>>([]);
  const [isSigningRx, setIsSigningRx] = useState(false);
  const [rxSuccessModal, setRxSuccessModal] = useState(false);
  const [claimPin, setClaimPin] = useState("9K4L2P");
  const [hmacToken, setHmacToken] = useState("");

  // Right Panel: CPOE Diagnostics State
  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTestSelection[]>([]);
  const [cpoeNotes, setCpoeNotes] = useState("");
  const [cpoeSuccess, setCpoeSuccess] = useState(false);
  const [isSubmittingCpoe, setIsSubmittingCpoe] = useState(false);

  // Right Panel: Disposition State
  const [dispositionType, setDispositionType] = useState<"DISCHARGE" | "ADMIT" | "REFER">("DISCHARGE");
  const [reviewDate, setReviewDate] = useState("");
  const [targetWard, setTargetWard] = useState("");
  const [nursingDirectives, setNursingDirectives] = useState("");
  const [receivingFacility, setReceivingFacility] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [dispositionSaved, setDispositionSaved] = useState(false);

  // Left Panel: Collapsible Trees
  const [historyOpen, setHistoryOpen] = useState(true);
  const [labsOpen, setLabsOpen] = useState(true);

  // Live CDS Safety Check on medications
  useEffect(() => {
    const alerts: Array<{ type: "DANGER" | "WARNING"; text: string }> = [];
    const allergyString = (patientHistory?.allergies || "").toLowerCase();
    const patientAllergies = ["penicillin", "sulfa"].filter(
      (a) => allergyString.includes(a) || allergyString.length === 0 && a === "penicillin"
    );
    if (allergyString.length === 0) return;

    rxItems.forEach((item) => {
      const name = item.drug.toLowerCase();
      if (
        name.includes("penicillin") ||
        name.includes("amoxicillin") ||
        name.includes("ampicillin") ||
        name.includes("augmentin")
      ) {
        alerts.push({
          type: "DANGER",
          text: `CRITICAL ALLERGEN CONFLICT: '${item.drug}' is a Beta-Lactam. Patient has documented Severe Penicillin Anaphylaxis!`,
        });
      }
      if (name.includes("ceftriaxone") || name.includes("cefuroxime")) {
        alerts.push({
          type: "WARNING",
          text: `POTENTIAL CROSS-ALLERGY: '${item.drug}' (Cephalosporin) has 3-5% cross-reactivity with Penicillin allergy.`,
        });
      }
      if (name.includes("cotrimoxazole") || name.includes("bactrim") || name.includes("sulfa") || name.includes("septrin")) {
        alerts.push({
          type: "DANGER",
          text: `CRITICAL ALLERGEN CONFLICT: '${item.drug}' contains Sulfonamides. Patient is allergic to Sulfa Drugs!`,
        });
      }
    });

    setCdsAlerts(alerts);
  }, [rxItems, patientHistory]);

  const handleAddMedication = () => {
    if (!newDrugInput) return;
    setRxItems([
      ...rxItems,
      {
        drug: newDrugInput,
        dosage: newDoseInput || "1 tab OD",
        route: "Oral",
        frequency: newFreqInput,
        duration: newDurationInput,
        quantity: 10,
      },
    ]);
    setNewDrugInput("");
    setNewDoseInput("");
  };

  const handleRemoveMedication = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const [rxSignError, setRxSignError] = useState<string | null>(null);

  const handleSignPrescription = async () => {
    if (rxItems.length === 0 || !primaryIcd10) return;
    setIsSigningRx(true);
    setRxSignError(null);
    try {
      const client = createApiClient();
      const pk = patientHistory?.patient_id || consultationId;
      const items = rxItems.map((it) => ({
        medication_name: it.drug,
        dosage: it.dosage,
        route: it.route,
        frequency: it.frequency,
        duration: it.duration,
        duration_days: parseInt(it.duration) || 3,
        instructions: it.dosage + " " + it.frequency,
        quantity_prescribed: it.quantity,
      }));
      const result = await client.mintPrescription({
        patient_account_id: pk,
        consultation_id: consultationId,
        items,
      });
      setMintedPrescription(result);
      setRxSuccessModal(true);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : (t("doctor.rxSignFailed") || "Prescription signing failed");
      setRxSignError(msg);
    } finally {
      setIsSigningRx(false);
    }
  };

  const handleSubmitCPOE = () => {
    setIsSubmittingCpoe(true);
    setTimeout(() => {
      setIsSubmittingCpoe(false);
      setCpoeSuccess(true);
      setTimeout(() => setCpoeSuccess(false), 2500);
    }, 600);
  };

  const handleSaveDisposition = () => {
    setDispositionSaved(true);
    setTimeout(() => setDispositionSaved(false), 2500);
  };

  const loadClinicalAccelerationData = async () => {
    try {
      const macros = await createApiClient().getClinicalMacros();
      if (macros && macros.length > 0) {
        setAvailableMacros(macros);
      }
    } catch (e: any) {
      console.warn("Could not fetch clinical macros:", e.message);
    }
  };

  const handleOpenTrendOverlay = async () => {
    setTrendDrawerOpen(true);
    if (!trendData && patientHistory?.patient_id) {
      try {
        setIsLoadingTrends(true);
        const data = await createApiClient().getPatientLongitudinalTrends(patientHistory.patient_id);
        setTrendData(data);
      } catch (e: any) {
        console.warn("Could not fetch longitudinal trends:", e.message);
      } finally {
        setIsLoadingTrends(false);
      }
    }
  };

  useEffect(() => {
    loadClinicalAccelerationData();
  }, []);

  const handleSelectMacro = (macroId: string) => {
    setSelectedMacroId(macroId);
    const macro = availableMacros.find((m) => m.id === macroId);
    if (!macro) return;

    // 1. Populate structured SOAP notes
    if (macro.default_soap_template) {
      setSubjective(macro.default_soap_template.subjective || "");
      setObjective(macro.default_soap_template.objective || "");
      setAssessment(macro.default_soap_template.assessment || "");
      setPlan(macro.default_soap_template.plan || "");
      setChiefComplaint(macro.default_soap_template.subjective.slice(0, 100) + "...");
    }

    // 2. Set ICD-10 Coding
    if (macro.icd10_code) {
      setPrimaryIcd10({
        code: macro.icd10_code,
        description: macro.diagnosis_title,
      });
    }

    // 3. Inject default prescription items
    if (macro.default_prescription_items && macro.default_prescription_items.length > 0) {
      const formattedMeds: MedicationItem[] = macro.default_prescription_items.map((it) => ({
        drug: it.medication_name,
        dosage: it.dosage,
        route: "Oral",
        frequency: it.frequency,
        duration: it.duration,
        quantity: it.quantity || 10,
      }));
      setRxItems(formattedMeds);
    }

    setMacroNotice(`Clinical Macro '${macro.macro_name}' applied successfully (SOAP + ICD-10 ${macro.icd10_code} + Rx Items).`);
    setTimeout(() => setMacroNotice(null), 4000);
  };

  const handleSendStatOrder = async () => {
    if (!statInstruction.trim()) return;
    setIsSubmittingStat(true);
    setStatErrorToast(null);
    try {
      const stat_patient_id = patientHistory?.patient_id || consultationId;
      await createApiClient().createStatNursingOrder({
        patient_id: stat_patient_id,
        consultation_id: consultationId,
        instruction: statInstruction,
        urgency: statUrgency,
        notes: statNotes,
      });
      setStatSuccessToast(
        (t("doctor.statOrderSuccess") || "STAT Order transmitted to Ward desk") +
          `: '${statInstruction.slice(0, 40)}...'`
      );
      setStatOrderModalOpen(false);
      setTimeout(() => setStatSuccessToast(null), 4000);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : (t("common.error") || "Error");
      console.warn("Failed to create stat order:", msg);
      setStatErrorToast(`${t("doctor.statOrderFailed") || "STAT Order failed"}: ${msg}`);
      setTimeout(() => setStatErrorToast(null), 5000);
    } finally {
      setIsSubmittingStat(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/doctor/queue">
            <Button variant="outline" size="sm" className="gap-1.5 font-bold text-xs">
              <ArrowLeft className="h-4 w-4" /> {t("doctor.backToQueue", "Back to Queue")}
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-700" />
              {t("doctor.consultationWorkstation", "Consultation Workstation")}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {t("doctor.encounterLabel", "Encounter")}: {consultation?.id || consultationId} • {(consultation as any)?.facility_name || currentUser?.active_tenant?.name || (currentUser?.linked_facilities?.[0] as any)?.facility_name || (t("clinical.defaultFacility", "MEDIPAEDIA Hospital"))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Diagnostic Trend Overlay Button */}
          <Button
            onClick={handleOpenTrendOverlay}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100 shadow-sm"
          >
            <Activity className="h-4 w-4 text-teal-600" />
            <span>{t("doctor.diagnosticTrendOverlay", "Diagnostic Trends")}</span>
          </Button>

          {/* Telemedicine Video Session Button */}
          <Button
            onClick={handleStartTelemedicine}
            disabled={isFetchingTelemed}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 border-indigo-400 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isFetchingTelemed ? (
              <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
            ) : (
              <Video className="h-4 w-4 text-indigo-600" />
            )}
            <span>
              {isFetchingTelemed
                ? t("telemed.joiningRoom", "Joining Room…") || "Joining Room…"
                : t("telemed.startSession", "Telemedicine Video") || "Telemedicine Video"}
            </span>
          </Button>

          {/* Issue STAT Order Button */}
          <Button
            onClick={() => setStatOrderModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 shadow-sm"
          >
            <Zap className="h-4 w-4 text-rose-600" />
            <span>{t("doctor.issueStatOrder", "Issue STAT Order")}</span>
          </Button>

          <Badge variant="teal" className="text-xs font-bold px-3 py-1">
            {currentUser?.full_name || (t("doctor.anonymousProvider", "Signed-in Provider"))}
            {(currentUser as any)?.license_number ? ` (${(currentUser as any).license_number})` : ""}
          </Badge>

          <StartCallButton
            consultationId={consultationId}
            patientName={patientHistory?.full_name}
            size="sm"
            variant="outline"
          />

          <Button
            onClick={() => router.push("/doctor/queue")}
            variant="secondary"
            size="sm"
            className="text-xs font-bold gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("doctor.completeEncounter", "Complete Encounter")}
          </Button>
        </div>
      </div>

      {/* Real-Time Status Toasts */}
      {macroNotice && (
        <div className="p-3 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-teal-700/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-200" />
            <span>{macroNotice}</span>
          </div>
          <button onClick={() => setMacroNotice(null)} className="text-teal-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {statSuccessToast && (
        <div className="p-3 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-rose-700/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-rose-200" />
            <span>{statSuccessToast}</span>
          </div>
          <button onClick={() => setStatSuccessToast(null)} className="text-rose-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {statErrorToast && (
        <div className="p-3 rounded-xl bg-amber-700 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-amber-700/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-200" />
            <span>{statErrorToast}</span>
          </div>
          <button onClick={() => setStatErrorToast(null)} className="text-amber-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {telemedError && (
        <div className="p-3 rounded-xl bg-indigo-700 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-indigo-700/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-indigo-200" />
            <span>{telemedError}</span>
          </div>
          <button onClick={() => setTelemedError(null)} className="text-indigo-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoadingContext ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-4 border border-slate-200 bg-white shadow-sm animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-40 bg-slate-200 rounded" />
                    <div className="h-2.5 w-28 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-16 w-full bg-slate-200 rounded-lg" />
              </Card>
            ))}
          </div>
          <div className="lg:col-span-9 space-y-3">
            <Card className="p-6 border border-slate-200 bg-white shadow-sm animate-pulse space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 w-full bg-slate-100 rounded-xl" />
              ))}
            </Card>
          </div>
        </div>
      ) : contextError ? (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-rose-900">{t("common.error") || "Failed to load consultation workstation"}</h3>
            <p className="text-xs text-rose-800 max-w-2xl">{contextError}</p>
            <Button variant="danger" size="sm" onClick={loadContext} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {t("common.retry") || "Retry"}
            </Button>
          </div>
        </div>
      ) : (!patientHistory && !((consultationId === 'new' || (id && String(id) === 'new')))) || !consultation ? (
        <Card className="p-10 border-dashed border-teal-200 bg-teal-50 text-center">
          <div className="mx-auto p-4 rounded-2xl bg-white border border-teal-100 text-teal-700 w-fit mb-4">
            <Inbox className="h-10 w-10" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">
            {t("doctor.selectPatientEncounter") || "Select a Patient Encounter"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {t("doctor.selectPatientEncounterDesc") || "Scan a Ghana Card or select a patient from the outpatient queue to begin documentation."}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={loadContext} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {t("common.retry") || "Retry"}
            </Button>
            <Link href="/doctor/queue">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                {t("doctor.returnToQueue") || "Return to Queue"}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-3 space-y-3">
          {/* Patient Card Banner */}
          <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-teal-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
                {patientHistory?.full_name ? patientHistory.full_name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 truncate">
                  {patientHistory?.full_name || (t("doctor.selectPatientEncounter") || "Select a Patient Encounter")}
                </h3>
                <p className="text-xs font-mono text-slate-500">{patientHistory?.ghana_card_id || patientHistory?.patient_id || (t("doctor.pendingPatientLink") || "— Awaiting patient selection —")}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  {patientHistory?.blood_group && <strong className="text-teal-800">{patientHistory.blood_group}</strong>}
                </div>
              </div>
            </div>

            {/* Red High-Visibility Allergen Badge */}
            {patientHistory?.allergies ? (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-1">
                <span className="font-extrabold flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-700">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600 shrink-0" /> {t("doctor.allergies") || "Documented Allergies"}
                </span>
                <div className="space-y-0.5 text-xs font-semibold">
                  {patientHistory.allergies.split(",").map((a, i) => (
                    <div key={i} className="text-rose-800">⚠️ {a.trim()}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                {t("doctor.noKnownAllergies") || "No Known Drug Allergies (NKDA)"}
              </div>
            )}
          </Card>

          {/* Vitals Trend Progression */}
          <Card className="p-3.5 border border-slate-200 bg-white shadow-sm space-y-2">
            <span className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>{t("doctor.todaysVitalsBaseline") || "Recent Vitals Baseline"}</span>
              {patientHistory?.recent_vitals && patientHistory.recent_vitals[0] && (
                <Badge variant="teal" className="text-[9px] font-bold">
                  {new Date(patientHistory.recent_vitals[0].recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              )}
            </span>
            {patientHistory?.recent_vitals && patientHistory.recent_vitals.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(() => {
                  const v = patientHistory.recent_vitals[0];
                  return (
                    <>
                      <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-100">
                        <span className="text-[10px] text-teal-700 font-semibold block">{t("nurse.bloodPressure") || "Blood Pressure"}</span>
                        <strong className="text-teal-950 font-mono text-sm">
                          {v.systolic_bp || "—"}/{v.diastolic_bp || "—"}
                        </strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${(v.temperature || 0) >= 38 ? "bg-amber-50/70 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                        <span className={`text-[10px] font-semibold block ${(v.temperature || 0) >= 38 ? "text-amber-700" : "text-slate-500"}`}>{t("nurse.temperature") || "Body Temp"}</span>
                        <strong className={`font-mono text-sm ${(v.temperature || 0) >= 38 ? "text-amber-950" : "text-slate-800"}`}>
                          {v.temperature ?? "—"}°C
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-semibold block">{t("nurse.pulseRate") || "Heart Rate"}</span>
                        <strong className="text-slate-800 font-mono text-sm">{v.heart_rate ?? "—"} bpm</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-semibold block">{t("nurse.spO2") || "SpO2"}</span>
                        <strong className="text-slate-800 font-mono text-sm">{v.spo2 ?? "—"}%</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-3">
                <Inbox className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-[11px] text-slate-500">{t("doctor.noVitalsRecorded") || "No recent vitals recorded."}</p>
              </div>
            )}
          </Card>

          {/* Collapsible History Tree */}
          <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full p-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <span>{t("doctor.pastClinicalEncounters") || "Past Clinical Encounters"} ({patientHistory?.consultations?.length || 0})</span>
              {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {historyOpen && (
              <div className="p-3 text-xs space-y-2 divide-y divide-slate-100">
                {patientHistory?.consultations && patientHistory.consultations.length > 0 ? (
                  patientHistory.consultations.map((enc) => (
                    <div key={enc.id} className="py-1.5 space-y-0.5 first:pt-0">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{enc.diagnosis || enc.chief_complaint || enc.icd10_code || (t("doctor.genericEncounter") || "Clinical Encounter")}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(enc.date || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {enc.doctor_name || (t("clinical.unknownProvider") || "Signed Clinician")}{enc.icd10_code ? ` • ${enc.icd10_code}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-center text-[11px] text-slate-500">
                    <Inbox className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                    {t("doctor.noPastEncounters") || "No previous encounter history recorded for this patient."}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Diagnostic Lab Reports */}
          <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setLabsOpen(!labsOpen)}
              className="w-full p-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <span>{t("doctor.attachedLabResults") || "Attached Lab Results"}</span>
              {labsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {labsOpen && (
              <div className="p-3 text-center py-4">
                <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500">
                  {t("doctor.noLabResultsAttached") || "No lab results attached. Order tests using CPOE."}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: CENTER PANEL - CLINICAL DOCUMENTATION & ICD-10 (Col span 5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-3">
            {/* Ambient AI Clinical Scribe Action Bar */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white shadow-sm space-y-2 border border-teal-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                      Ambient AI Clinical Scribe <Badge variant="teal" className="bg-teal-800 text-teal-200 border-teal-600 text-[8px] font-mono">PHASE 1 ACTIVE</Badge>
                    </h3>
                    <p className="text-[10px] text-teal-200/80">
                      Auto-transcribes natural doctor-patient dialogue into structured SOAP &amp; suggested Rx
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingScribe(!isRecordingScribe)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isRecordingScribe
                        ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30"
                        : "bg-teal-800/80 text-teal-100 hover:bg-teal-700"
                    }`}
                  >
                    {isRecordingScribe ? (
                      <>
                        <Radio className="h-3.5 w-3.5 animate-spin" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-teal-300" /> Dictate Ambient
                      </>
                    )}
                  </button>

                  <Button
                    size="sm"
                    disabled={isGeneratingScribe}
                    onClick={handleTriggerAIScribe}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm"
                  >
                    {isGeneratingScribe ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    Generate SOAP
                  </Button>
                </div>
              </div>

              {isRecordingScribe && (
                <div className="p-2 bg-slate-900/90 rounded-xl border border-rose-500/30 flex items-center justify-between text-[11px] text-slate-300 font-mono animate-fadeIn">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" /> Live Audio Stream Active
                  </span>
                  <span className="text-[10px] text-slate-400">Zero-PHI Local Buffer</span>
                </div>
              )}
            </div>

            {/* Clinical Macro Engine Dropdown & Presets */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span>Clinical Macro Preset Engine</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Auto-injects SOAP + ICD-10 + Rx items</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-8">
                  <select
                    value={selectedMacroId}
                    onChange={(e) => handleSelectMacro(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">⚡ Select Clinical Protocol Preset...</option>
                    {availableMacros.map((macro) => (
                      <option key={macro.id} value={macro.id}>
                        {macro.macro_name} ({macro.icd10_code})
                      </option>
                    ))}
                    {availableMacros.length === 0 && (
                      <>
                        <option value="macro-mal-01">Adult Acute Uncomplicated Malaria (B50.9)</option>
                        <option value="macro-htn-02">Essential Hypertension Initial Workup (I10)</option>
                        <option value="macro-dm-03">Type 2 Diabetes Mellitus Routine Review (E11.9)</option>
                        <option value="macro-ge-04">Acute Gastroenteritis with Dehydration (A09)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-4 flex gap-1">
                  <select
                    value={selectedMacroId}
                    onChange={(e) => e.target.value && handleSelectMacro(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white p-1.5 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">{t("doctor.quickMacroLabel") || "⚡ Quick Macro Apply"}</option>
                    {availableMacros.length > 0 ? availableMacros.slice(0, 6).map((m) => (
                      <option key={m.id} value={m.id}>{m.macro_name}</option>
                    )) : (
                      <>
                        <option value="">{t("doctor.noMacrosAvailable") || "No API macros loaded yet"}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Chief Complaint & HPI */}
            <div>
              <label className="block font-bold text-xs text-slate-800 mb-1">Chief Complaint</label>
              <textarea
                rows={2}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-800 mb-1">
                History of Presenting Illness (HPI)
              </label>
              <textarea
                rows={3}
                value={hpi}
                onChange={(e) => setHpi(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* SOAP Tabs */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-xs text-slate-800 mb-1">
                  [S] Subjective
                </label>
                <textarea
                  rows={2}
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-800 mb-1">
                  [O] Objective &amp; Vitals
                </label>
                <textarea
                  rows={4}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-800 mb-1">
                  [A] ICD-10 Assessment
                </label>
                <input
                  type="text"
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-teal-950 bg-teal-50/40 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* AI ICD-10 Differential Co-Pilot Badge Strip */}
              <div className="p-2.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="h-4 w-4 text-indigo-600" />
                    <strong className="text-[11px] font-extrabold text-indigo-950">
                      AI Differential Diagnosis Co-Pilot
                    </strong>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    Probabilistic ICD-10 Match
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {aiDifferentials.slice(0, 3).map((diff) => (
                    <div
                      key={diff.icd10_code}
                      className="p-2 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-900 text-xs">
                            {diff.icd10_code}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 font-mono">
                            {Math.round(diff.confidence_score * 100)}% Match
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-700 line-clamp-1">
                          {diff.title}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrimaryIcd10({
                            code: diff.icd10_code,
                            description: diff.title,
                          });
                          setAssessment(diff.title);
                        }}
                        className="w-full text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 rounded border border-indigo-200 transition text-center"
                      >
                        + Apply Diagnosis
                      </button>
                    </div>
                  ))}
                  {aiDifferentials.length === 0 && (
                    <div className="col-span-3 text-center py-2 text-slate-400 text-[11px]">
                      Analyzing encounter notes for ICD-10 differentials...
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-800 mb-1">
                  [P] Treatment Plan
                </label>
                <textarea
                  rows={3}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* ICD-10 Search & Multi-Coding */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="font-bold text-xs text-slate-800 block">
                Primary & Differential ICD-10 Codes
              </span>

              {/* Primary Code */}
              {primaryIcd10 && (
                <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-300 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 uppercase block">PRIMARY DIAGNOSIS</span>
                    <strong className="text-teal-950 font-mono">{primaryIcd10.code}</strong> — {primaryIcd10.description}
                  </div>
                  <Badge variant="teal" className="text-[10px] font-bold">PRIMARY</Badge>
                </div>
              )}

              {/* Differential Codes List */}
              <div className="flex flex-wrap gap-1.5">
                {differentialIcd10s.map((diff, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800"
                  >
                    <strong className="font-mono">{diff.code}</strong>: {diff.description}
                    <button
                      type="button"
                      onClick={() => setDifferentialIcd10s(differentialIcd10s.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* ICD-10 Search Picker */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ICD-10 code or disease name to add differential..."
                  value={icdSearchQuery}
                  onChange={(e) => {
                    setIcdSearchQuery(e.target.value);
                    setIcdDropdownOpen(true);
                  }}
                  onFocus={() => setIcdDropdownOpen(true)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {icdDropdownOpen && icdSearchQuery && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg text-xs">
                    {icd10List
                      .filter(
                        (i) =>
                          i.code.toLowerCase().includes(icdSearchQuery.toLowerCase()) ||
                          i.description.toLowerCase().includes(icdSearchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.code}
                          onClick={() => {
                            setDifferentialIcd10s([...differentialIcd10s, item]);
                            setIcdSearchQuery("");
                            setIcdDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-teal-50 cursor-pointer border-b border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <strong className="font-mono text-teal-800">{item.code}</strong> — {item.description}
                          </div>
                          <span className="text-[10px] text-slate-400">+ Add</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 3: RIGHT PANEL - ORDERS & DISPOSITION HUB (Col span 4) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-3">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setRightTab("RX")}
              className={`py-2 rounded-xl transition-all ${
                rightTab === "RX" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              E-Prescriptions
            </button>
            <button
              onClick={() => setRightTab("CPOE")}
              className={`py-2 rounded-xl transition-all ${
                rightTab === "CPOE" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              CPOE Lab/Rad
            </button>
            <button
              onClick={() => setRightTab("DISPOSITION")}
              className={`py-2 rounded-xl transition-all ${
                rightTab === "DISPOSITION" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Disposition
            </button>
          </div>

          {/* TAB 1: E-PRESCRIPTION BUILDER */}
          {rightTab === "RX" && (
            <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-teal-600" /> Prescribed Medications ({rxItems.length})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">HMAC-SHA256 Ready</span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-1">
                {t("doctor.rxSealedDescription") || "Cryptographically sealed e-prescriptions sent directly to facility pharmacy POS."}
              </p>

              {/* CDS Safety Warnings Banner */}
              {cdsAlerts.length > 0 && (
                <div className="space-y-1.5">
                  {cdsAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs font-semibold ${
                        alert.type === "DANGER"
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-amber-50 border-amber-300 text-amber-900"
                      }`}
                    >
                      {alert.text}
                    </div>
                  ))}
                </div>
              )}

              {/* Medication Items List */}
              <div className="space-y-2">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 relative">
                    <div className="flex items-center justify-between pr-5">
                      <strong className="text-slate-900">{item.drug}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Dose: <strong>{item.dosage}</strong> | Freq: {item.frequency} | Dur: {item.duration}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Drug Sub-Form */}
              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2 text-xs">
                <span className="font-bold text-teal-900 block text-[11px] uppercase tracking-wider">
                  + Add Medication
                </span>
                <input
                  type="text"
                  placeholder="Drug Name (e.g. Ciprofloxacin 500mg)"
                  value={newDrugInput}
                  onChange={(e) => setNewDrugInput(e.target.value)}
                  className="w-full rounded-xl border border-teal-300 p-2 text-xs bg-white focus:outline-none"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    placeholder="Dosage (500mg)"
                    value={newDoseInput}
                    onChange={(e) => setNewDoseInput(e.target.value)}
                    className="rounded-xl border border-teal-300 p-1.5 text-xs bg-white focus:outline-none"
                  />
                  <select
                    value={newFreqInput}
                    onChange={(e) => setNewFreqInput(e.target.value)}
                    className="rounded-xl border border-teal-300 p-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="OD">OD (Once)</option>
                    <option value="BD">BD (Twice)</option>
                    <option value="TDS">TDS (Thrice)</option>
                    <option value="QDS">QDS (4x)</option>
                    <option value="PRN">PRN (As needed)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Duration"
                    value={newDurationInput}
                    onChange={(e) => setNewDurationInput(e.target.value)}
                    className="rounded-xl border border-teal-300 p-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMedication}
                  className="w-full font-bold text-xs border-teal-400 text-teal-800 hover:bg-teal-100"
                >
                  + Add to Prescription
                </Button>
              </div>

              {/* Sign & Mint Action */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={cdsAlerts.some((a) => a.type === "DANGER")}
                onClick={handleSignPrescription}
                isLoading={isSigningRx}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                {cdsAlerts.some((a) => a.type === "DANGER")
                  ? "Resolve Critical Allergen Conflicts to Sign"
                  : "HMAC Sign & Mint E-Prescription"}
              </Button>
            </Card>
          )}

          {/* TAB 2: CPOE DIAGNOSTICS */}
          {rightTab === "CPOE" && (
            <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-600" /> CPOE Laboratory & Imaging Orders
                </span>
              </div>

              {cpoeSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Orders Transmitted to Laboratory & Radiology!</span>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-1.5">
                {diagnosticTests.map((t, idx) => (
                  <label
                    key={t.code}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                      t.selected ? "bg-teal-50/60 border-teal-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.selected}
                        onChange={(e) => {
                          const updated = [...diagnosticTests];
                          updated[idx].selected = e.target.checked;
                          setDiagnosticTests(updated);
                        }}
                        className="rounded accent-teal-600"
                      />
                      <span className="font-semibold text-slate-800">{t.name}</span>
                    </div>
                    <Badge variant={t.priority === "STAT" ? "danger" : "outline"} className="text-[9px] font-bold">
                      {t.priority}
                    </Badge>
                  </label>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Indication / Notes for Lab</label>
                <input
                  type="text"
                  value={cpoeNotes}
                  onChange={(e) => setCpoeNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleSubmitCPOE}
                isLoading={isSubmittingCpoe}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                Transmit CPOE Diagnostic Order
              </Button>
            </Card>
          )}

          {/* TAB 3: DISPOSITION & REFERRALS */}
          {rightTab === "DISPOSITION" && (
            <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-3 text-xs">
              <span className="font-extrabold text-xs text-slate-900 block">
                Patient Encounter Disposition
              </span>

              {dispositionSaved && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Disposition Recorded & Transmitted!</span>
                </div>
              )}

              {/* Disposition Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDispositionType("DISCHARGE")}
                  className={`py-2 rounded-xl font-bold text-xs border ${
                    dispositionType === "DISCHARGE"
                      ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Discharge
                </button>
                <button
                  type="button"
                  onClick={() => setDispositionType("ADMIT")}
                  className={`py-2 rounded-xl font-bold text-xs border ${
                    dispositionType === "ADMIT"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Admit to Ward
                </button>
                <button
                  type="button"
                  onClick={() => setDispositionType("REFER")}
                  className={`py-2 rounded-xl font-bold text-xs border ${
                    dispositionType === "REFER"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Refer Out
                </button>
              </div>

              {dispositionType === "DISCHARGE" && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Input
                    label="Scheduled Review / Follow-up Date"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">
                    Patient will receive automated SMS reminder 24 hours prior to review date.
                  </p>
                </div>
              )}

              {dispositionType === "ADMIT" && (
                <div className="space-y-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div>
                    <label className="block font-semibold text-amber-900 mb-1">Target Inpatient Ward</label>
                    <select
                      value={targetWard}
                      onChange={(e) => setTargetWard(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="Male Medical Ward">Male Medical Ward (10/12 Occupied)</option>
                      <option value="Female Medical Ward">Female Medical Ward (8/12 Occupied)</option>
                      <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                      <option value="Pediatric Ward">Pediatric Ward</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-900 mb-1">Immediate Nursing Orders</label>
                    <textarea
                      rows={3}
                      value={nursingDirectives}
                      onChange={(e) => setNursingDirectives(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {dispositionType === "REFER" && (
                <div className="space-y-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <Input
                    label="Receiving Specialist Facility"
                    value={receivingFacility}
                    onChange={(e) => setReceivingFacility(e.target.value)}
                  />
                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Reason for Referral</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Higher level hemodynamic monitoring and specialist consultation"
                      value={referralReason}
                      onChange={(e) => setReferralReason(e.target.value)}
                      className="w-full rounded-xl border border-indigo-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleSaveDisposition}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                Confirm Disposition & Transmit Order
              </Button>
            </Card>
          )}
        </div>
      </div>
      )}

      {/* Prescription Minted Success Modal */}
      {rxSuccessModal && mintedPrescription && (
        <Modal
          isOpen={rxSuccessModal}
          onClose={() => setRxSuccessModal(false)}
          title={t("doctor.rxMintedModalTitle") || "E-Prescription Cryptographically Signed!"}
          description={t("doctor.rxMintedModalDesc") || "HMAC-SHA256 verified and uploaded to Ghana Health Service Rx Registry."}
          className="max-w-2xl"
        >
          <div className="py-3 space-y-5 text-xs">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{t("doctor.rxMintedSuccess") || "Rx Minted Successfully"}</h3>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5 break-all">{t("common.hash") || "Hash"}: {(mintedPrescription.hmac_signature || mintedPrescription.verification_hash || "").slice(0, 32)}...</p>
              </div>
            </div>

            {/* Printable Minted Rx Card */}
            <div className="p-5 bg-white rounded-xl border-2 border-slate-800 text-slate-900 space-y-3 print:border-none">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-black text-base">{mintedPrescription.facility_name || (t("clinical.defaultFacility") || "MEDIPAEDIA Hospital")}</h4>
                  <p className="text-[11px] text-slate-600">{mintedPrescription.doctor_name || currentUser?.full_name || "-"} ({mintedPrescription.doctor_license || (currentUser as any)?.license_number || "-"})</p>
                  <p className="text-[10px] text-slate-500">{mintedPrescription.facility_address || (t("clinical.defaultAddress") || "Accra, Ghana")}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold block">{mintedPrescription.prescription_number}</span>
                  <span className="text-[10px] text-slate-500">{new Date(mintedPrescription.issued_at || mintedPrescription.issued_date || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[9px]">{t("doctor.rxPrintPatientLabel") || "PATIENT"}</span>
                  <strong>{mintedPrescription.patient_name || patientHistory?.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">{t("doctor.rxPrintMrnLabel") || "MRN & ALLERGIES"}</span>
                  <span className="font-mono">{mintedPrescription.mrn || mintedPrescription.patient_mrn || "-"} · <strong className="text-rose-600">{mintedPrescription.allergies || patientHistory?.allergies || (t("patient.noneReported") || "None Reported")}</strong></span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[9px]">{t("doctor.rxPrintDiagnosisLabel") || "DIAGNOSIS"}</span>
                  <strong>{mintedPrescription.diagnosis || primaryIcd10?.description}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-0.5">
                  {t("doctor.rxPrintMedicationsTitle") || "Rx Medications"}
                </div>
                {(mintedPrescription.items || []).slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="text-[11px] flex justify-between items-center py-1 border-b border-slate-100">
                    <div>
                      <p className="font-bold">{i + 1}. {m.medication_name}</p>
                      <p className="text-slate-500 text-[10px]">{m.dosage} · {m.frequency} {t("doctor.rxPrintMultiply") || "x"} {m.duration_days || m.duration} {t("common.days") || "days"} ({m.instructions})</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{t("doctor.qtyLabel") || "Qty"}: {m.quantity_prescribed}</Badge>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950 text-slate-100 rounded-xl gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("doctor.rxPrintHmacLabel") || "Verification PIN"}: {mintedPrescription.claim_pin || mintedPrescription.access_code}
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 break-all">
                    {mintedPrescription.qr_verification_url || mintedPrescription.qr_payload}
                  </p>
                </div>
                <div className="bg-white p-1 rounded-lg shrink-0">
                  <QRCode value={mintedPrescription.qr_verification_url || mintedPrescription.qr_payload || `https://medipaedia.health/verify/rx?code=${mintedPrescription.claim_pin || mintedPrescription.access_code}`} size={64} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-[11px]">
                <Printer className="h-3.5 w-3.5" /> {t("doctor.printRxSheet") || "Print Prescription"}
              </Button>
              <Link href="/doctor/prescriptions">
                <Button variant="primary" size="sm" className="gap-1.5 text-[11px] bg-teal-600 hover:bg-teal-700" onClick={() => setRxSuccessModal(false)}>
                  {t("doctor.viewInRxRegistry") || "Go to Rx Registry"}
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={() => setRxSuccessModal(false)} className="text-[11px]">
                {t("common.done") || "Done"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {rxSignError && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3 fixed top-4 right-4 z-50 max-w-md shadow-xl">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold text-rose-900">{t("doctor.rxSignFailedTitle") || "Prescription Signing Failed"}</h4>
            <p className="text-[11px] text-rose-800">{rxSignError}</p>
          </div>
          <button onClick={() => setRxSignError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIAGNOSTIC TREND OVERLAY DRAWER / MODAL */}
      {/* ========================================================================= */}
      {trendDrawerOpen && (
        <Modal
          isOpen={trendDrawerOpen}
          onClose={() => setTrendDrawerOpen(false)}
          title={t("doctor.longitudinalTrendTitle") || "Longitudinal Diagnostic & Vitals Trend Overlay"}
          description={`${t("doctor.trajectoryFor") || "Patient Clinical Trajectory"}: ${patientHistory?.full_name || "-"} (${(patientHistory as any)?.mrn || patientHistory?.ghana_card_id || "-"})`}
        >
          <div className="py-2 space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {isLoadingTrends ? (
              <div className="space-y-3">
                {[0,1,2,3].map((i) => (
                  <Card key={i} className="p-4 border border-slate-200 bg-white shadow-sm animate-pulse space-y-3">
                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                    <div className="h-10 w-full bg-slate-100 rounded-lg" />
                  </Card>
                ))}
              </div>
            ) : !trendData || ((!trendData.vitals_history || trendData.vitals_history.length === 0) && (!trendData.hb_history || trendData.hb_history.length === 0) && (!trendData.rbs_history || trendData.rbs_history.length === 0) && (!trendData.creatinine_history || trendData.creatinine_history.length === 0)) ? (
              <Card className="p-10 border-dashed border-teal-200 bg-teal-50 text-center">
                <div className="mx-auto p-4 rounded-2xl bg-white border border-teal-100 text-teal-700 w-fit mb-4">
                  <Inbox className="h-10 w-10" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">
                  {t("doctor.noLongitudinalData") || "No Longitudinal Data Available"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  {t("doctor.noLongitudinalDataDesc") || "No historical vitals or lab trend history is available for this patient."}
                </p>
                <Button variant="outline" size="sm" onClick={handleOpenTrendOverlay} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  {t("common.refresh") || "Refresh Trends"}
                </Button>
              </Card>
            ) : (
              <>
                {/* MEWS Trajectory Banner (conditional) */}
                {typeof (trendData as any).latest_mews_score === "number" && (
                  <div className={`p-3 rounded-2xl flex items-center justify-between shadow-md ${
                    (trendData as any).latest_mews_score >= 3 ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800 border border-slate-200"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm ${
                        (trendData as any).latest_mews_score >= 5 ? "bg-rose-500/20 border border-rose-400 text-rose-200" :
                        (trendData as any).latest_mews_score >= 3 ? "bg-amber-500/20 border border-amber-400 text-amber-300" :
                        "bg-emerald-500/20 border border-emerald-400 text-emerald-700"
                      }`}>
                        {(trendData as any).latest_mews_score}
                      </div>
                      <div>
                        <h4 className={`font-extrabold text-sm flex items-center gap-2 ${
                          (trendData as any).latest_mews_score >= 3 ? "text-slate-100" : "text-slate-900"
                        }`}>
                          {t("doctor.mewsTitle") || "Modified Early Warning Score (MEWS)"}
                          {(trendData as any).latest_mews_severity && (
                            <Badge variant={(trendData as any).latest_mews_severity === "WARNING" || (trendData as any).latest_mews_score >= 3 ? "warning" : "success"} className="text-[9px]">
                              {(trendData as any).latest_mews_severity}
                            </Badge>
                          )}
                        </h4>
                        {(trendData as any).mews_reasoning && (
                          <p className={`text-[11px] ${(trendData as any).latest_mews_score >= 3 ? "text-slate-400" : "text-slate-600"}`}>
                            {(trendData as any).mews_reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                    {(trendData as any).triage_rule_active && (
                      <Badge variant="outline" className="text-[10px] text-teal-300 border-teal-500">
                        {t("doctor.activeTriageRule") || "Active Triage Rule"}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Vitals History Longitudinal Table */}
                {trendData.vitals_history && trendData.vitals_history.length > 0 && (
                  <Card className="border border-slate-200 shadow-none">
                    <CardHeader className="py-2.5 px-3 bg-slate-50 border-b border-slate-200">
                      <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-rose-600" />
                        {t("doctor.historicalVitalsSeries") || "Historical Vitals Series & MEWS Progression"}
                      </CardTitle>
                    </CardHeader>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100/75 text-slate-600 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                          <tr>
                            <th className="p-2">{t("doctor.dateTime") || "Date / Time"}</th>
                            <th className="p-2">BP (mmHg)</th>
                            <th className="p-2">HR (bpm)</th>
                            <th className="p-2">RR (/min)</th>
                            <th className="p-2">Temp (°C)</th>
                            <th className="p-2">SpO2</th>
                            <th className="p-2 text-right">MEWS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {trendData.vitals_history.map((v: any, i: number) => (
                            <tr key={i} className={i === 0 ? "bg-amber-50/40 font-bold" : "hover:bg-slate-50"}>
                              <td className="p-2 font-sans text-slate-700">
                                {typeof v.recorded_at === "string" ? v.recorded_at : new Date(v.recorded_at || Date.now()).toLocaleDateString()}
                              </td>
                              <td className="p-2 text-slate-900">{v.systolic_bp}/{v.diastolic_bp}</td>
                              <td className="p-2 text-slate-800">{v.heart_rate}</td>
                              <td className="p-2 text-slate-800">{v.respiratory_rate}</td>
                              <td className="p-2 text-amber-800">{v.temperature}°C</td>
                              <td className="p-2 text-slate-800">{v.spo2}%</td>
                              <td className="p-2 text-right font-bold">
                                {typeof v.mews_score === "number" && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    v.mews_score >= 5 ? "bg-rose-100 text-rose-800 font-black" :
                                    v.mews_score >= 3 ? "bg-amber-100 text-amber-800 font-bold" :
                                    "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {v.mews_score} ({v.mews_severity || (v.mews_score >= 3 ? "WARN" : "OK")})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Key Diagnostic Panels Progression - HB, RBS, Creatinine */}
                {((trendData.hb_history && trendData.hb_history.length > 0) ||
                  (trendData.rbs_history && trendData.rbs_history.length > 0) ||
                  (trendData.creatinine_history && trendData.creatinine_history.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      { key: "hb", label: "Hemoglobin (HB)", unit: "g/dL", history: trendData.hb_history as any[] },
                      { key: "rbs", label: "Random Blood Sugar (RBS)", unit: "mg/dL", history: trendData.rbs_history as any[] },
                      { key: "creat", label: "Serum Creatinine", unit: "mg/dL", history: trendData.creatinine_history as any[] },
                    ].map(({ key, label, unit, history }) => {
                      if (!history || history.length === 0) return null;
                      const latest = history[0];
                      const latestStatus = latest?.status || latest?.result_status;
                      const latestValue = latest?.value ?? "-";
                      return (
                        <Card key={key} className="border border-slate-200 shadow-none p-3 space-y-2">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span className="flex items-center gap-1">
                              {latestStatus === "Low" ? <Droplet className="h-3.5 w-3.5 text-rose-600" /> :
                               latestStatus === "High" ? <Activity className="h-3.5 w-3.5 text-amber-600" /> :
                               <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />} {label}
                            </span>
                            <Badge variant={
                              latestStatus === "Low" || latestStatus === "High"
                                ? latestStatus === "Low" ? "danger" : "warning"
                                : "success"
                            } className="text-[9px]">
                              {latestValue} {unit}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-[11px] font-mono divide-y divide-slate-100">
                            {history.slice(0, 4).map((entry: any, idx: number) => {
                              const entryStatus = entry?.status || entry?.result_status;
                              const entryValue = entry?.value ?? "-";
                              const entryDate = entry?.date || entry?.recorded_at || (typeof entry?.recorded_at === "string" ? entry.recorded_at : (entry.recorded_at ? new Date(entry.recorded_at).toLocaleDateString() : "-"));
                              return (
                                <div key={idx} className="flex justify-between py-1">
                                  <span className={idx === 0 ? "text-slate-700 font-semibold" : "text-slate-500"}>{entryDate}:</span>
                                  {idx === 0 && entryStatus ? (
                                    <strong className={
                                      entryStatus === "Low" ? "text-rose-700" :
                                      entryStatus === "High" ? "text-amber-700" :
                                      "text-emerald-700"
                                    }>{entryValue} {entryStatus ? `(${entryStatus})` : ""}</strong>
                                  ) : (
                                    <span>{entryValue}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <Button
              variant="outline"
              size="md"
              onClick={() => setTrendDrawerOpen(false)}
              className="w-full font-bold mt-2"
            >
              {t("doctor.closeOverlay") || "Close Diagnostic Overlay"}
            </Button>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* ISSUE STAT NURSING ORDER MODAL */}
      {/* ========================================================================= */}
      {statOrderModalOpen && (
        <Modal
          isOpen={statOrderModalOpen}
          onClose={() => setStatOrderModalOpen(false)}
          title="⚡ Issue Immediate STAT Nursing Order"
          description="Transmits high-priority orders directly to the Ward / Triage Nurse Runner desk."
        >
          <div className="py-2 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1 text-rose-900">
              <span className="font-bold block uppercase text-[10px] tracking-wider text-rose-700">
                Target Patient
              </span>
              <div className="flex justify-between items-baseline font-bold text-sm">
                <span>Active Encounter Patient</span>
                <span className="font-mono text-xs text-rose-800">Encounter Active</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Urgency Tier
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatUrgency("STAT")}
                  className={`p-2 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    statUrgency === "STAT"
                      ? "bg-rose-600 text-white border-rose-600 shadow"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <Zap className="h-4 w-4" /> STAT (Immediate Execution)
                </button>
                <button
                  type="button"
                  onClick={() => setStatUrgency("URGENT")}
                  className={`p-2 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    statUrgency === "URGENT"
                      ? "bg-amber-600 text-white border-amber-600 shadow"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <Clock className="h-4 w-4" /> URGENT (Within 30 Mins)
                </button>
              </div>
            </div>

            {/* Quick Directive Chips */}
            <div className="space-y-1">
              <span className="font-semibold text-slate-600 text-[10px] uppercase">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "STAT IV Crystalloid 1000ml bolus",
                  "STAT IV Paracetamol 1g infusion",
                  "Urgent Bedside RBS + 12-Lead ECG",
                  "STAT Nebulization Short-Acting Bronchodilator",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStatInstruction(chip)}
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-medium transition"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Order Instruction / Directive
              </label>
              <textarea
                rows={3}
                value={statInstruction}
                onChange={(e) => setStatInstruction(e.target.value)}
                placeholder="e.g. STAT IV bolus instruction with infusion rate..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Nursing Notes &amp; Monitoring Directives
              </label>
              <input
                type="text"
                value={statNotes}
                onChange={(e) => setStatNotes(e.target.value)}
                placeholder="e.g. Monitor BP every 15 mins during infusion"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStatOrderModalOpen(false)}
                className="w-1/3 font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSendStatOrder}
                isLoading={isSubmittingStat}
                disabled={!statInstruction.trim()}
                className="w-2/3 bg-rose-600 hover:bg-rose-700 font-bold gap-2"
              >
                <Zap className="h-4 w-4" /> Transmit STAT Order
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* AMBIENT AI CLINICAL SCRIBE REVIEW & ACCEPTANCE MODAL */}
      {/* ========================================================================= */}
      {scribeModalOpen && aiGeneratedSoap && (
        <Modal
          isOpen={scribeModalOpen}
          onClose={() => setScribeModalOpen(false)}
          title="✨ Review AI Ambient Clinical Scribe Draft"
          description="Extracted structured SOAP notes and treatment protocol from consultation audio stream."
        >
          <div className="py-2 space-y-3.5 text-xs">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Zero-PHI Clinical Intelligence Synthesis
              </span>
              <span className="font-mono text-[10px] text-teal-700 font-semibold">
                {aiGeneratedSoap.inference_latency_ms}ms · {aiGeneratedSoap.word_count} Words Parsed
              </span>
            </div>

            {/* SOAP Preview */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-extrabold text-[11px]">
                  [S] Subjective:
                </strong>
                <p className="text-slate-700">{aiGeneratedSoap.soap.subjective}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-extrabold text-[11px]">
                  [O] Objective:
                </strong>
                <p className="text-slate-700 font-mono text-[11px] whitespace-pre-line">
                  {aiGeneratedSoap.soap.objective}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                <strong className="text-teal-950 block font-extrabold text-[11px]">
                  [A] Assessment &amp; Diagnosis:
                </strong>
                <p className="text-teal-900 font-bold">
                  {aiGeneratedSoap.soap.assessment}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="teal" className="font-mono text-[10px]">
                    {aiGeneratedSoap.suggested_icd10_code}
                  </Badge>
                  <span className="text-[11px] text-teal-800">
                    {aiGeneratedSoap.suggested_icd10_title}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-extrabold text-[11px]">
                  [P] Plan &amp; Recommendations:
                </strong>
                <p className="text-slate-700 whitespace-pre-line">{aiGeneratedSoap.soap.plan}</p>
              </div>

              {aiGeneratedSoap.suggested_prescriptions.length > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
                  <strong className="text-indigo-950 block font-extrabold text-[11px]">
                    Suggested Prescription Items ({aiGeneratedSoap.suggested_prescriptions.length}):
                  </strong>
                  <div className="space-y-1">
                    {aiGeneratedSoap.suggested_prescriptions.map((rx, i) => (
                      <div key={i} className="text-[11px] text-indigo-900 flex justify-between">
                        <span className="font-bold">• {rx.name}</span>
                        <span className="text-indigo-700 font-mono">{rx.dosage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setScribeModalOpen(false)}
                className="w-1/3 font-bold"
              >
                Discard
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleApplyAISoapDraft}
                className="w-2/3 bg-teal-600 hover:bg-teal-700 font-bold gap-1.5"
              >
                <Check className="h-4 w-4" /> Accept AI Draft &amp; Populate SOAP
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <LiveKitRoomModal
        isOpen={telemedModalOpen}
        onClose={handleCloseTelemed}
        token={telemedSession?.token || ""}
        serverUrl={telemedSession?.server_url || ""}
        roomName={telemedSession?.room_name || ""}
        patientName={patientHistory?.full_name}
        consultationId={consultationId && consultationId !== "new" && consultationId !== "draft" ? consultationId : undefined}
      />
    </div>
  );
}
