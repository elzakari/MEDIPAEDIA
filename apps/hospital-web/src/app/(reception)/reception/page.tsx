"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  UserCheck,
  QrCode as QrIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Users,
  Activity,
  Loader2,
  PlusCircle,
  Zap,
  Printer,
  FileText,
  GitMerge,
  FolderArchive,
  Volume2,
  RefreshCw,
  X,
  Stethoscope,
  Eye,
  Baby,
  HeartPulse,
  Flame,
  Camera,
  Sparkles,
  Scan,
  Inbox,
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
  useTranslation,
} from "@medipaedia/ui";
import { PrinterManager, buildOpdQueueTicket80mm } from "@medipaedia/hardware";

import {
  createApiClient,
  PatientMasterSearchResult,
  ReceptionPatientRegisterResult,
  EmergencyTraumaIntakeResult,
  ActiveQueueItem,
  ClinicDepartment,
  ReceptionTriagePriority,
  QueueDispatchResult,
  WristbandPrintData,
  QueueTicketPrintData,
  FolderStatus,
  NHISStatus,
} from "@medipaedia/api-client";

export default function MasterIntakeDeskPage() {
  const { t } = useTranslation();
  const apiClient = createApiClient();

  // Search & Intake State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientMasterSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientMasterSearchResult | null>(null);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Dispatch Form State
  const [destinationClinic, setDestinationClinic] = useState<ClinicDepartment>("GENERAL_OPD");
  const [priority, setPriority] = useState<ReceptionTriagePriority>("ROUTINE");
  const [isNhisCovered, setIsNhisCovered] = useState(true);
  const [consultingRoom, setConsultingRoom] = useState("Consulting Room 1");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<QueueDispatchResult | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Live Queue Stream State
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDepartmentTab, setSelectedDepartmentTab] = useState<string>("ALL");
  const [callingQueueId, setCallingQueueId] = useState<string | null>(null);

  // Modals
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isTraumaModalOpen, setIsTraumaModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isIdOcrModalOpen, setIsIdOcrModalOpen] = useState(false);
  const [isProcessingIdOcr, setIsProcessingIdOcr] = useState(false);
  const [idOcrSuccessData, setIdOcrSuccessData] = useState<any | null>(null);
  const [printType, setPrintType] = useState<"WRISTBAND" | "TICKET">("WRISTBAND");
  const [wristbandData, setWristbandData] = useState<WristbandPrintData | null>(null);
  const [ticketData, setTicketData] = useState<QueueTicketPrintData | null>(null);
  const [isPrinterSetupOpen, setIsPrinterSetupOpen] = useState(false);

  const executeThermalQueuePrint = async (
    ticketNumber: string,
    patientName: string,
    mrn: string,
    clinicName?: string,
    prio?: string
  ) => {
    try {
      const bytes = buildOpdQueueTicket80mm({
        facilityName: "Ridge Regional Hospital, Accra",
        ticketNumber: ticketNumber,
        department: clinicName || destinationClinic.replace("_", " "),
        patientName: patientName,
        patientMrn: mrn,
        priority: prio || priority,
        estimatedWaitMinutes: 12,
        autoCut: true,
      });
      const res = await PrinterManager.getInstance().print("RECEIPT", bytes);
      console.log("Thermal OPD Ticket print job:", res);
    } catch (err: any) {
      console.warn("Thermal ticket print notice:", err.message);
    }
  };


  const handleScanGhanaCardOCR = async (sampleHint?: string) => {
    setIsProcessingIdOcr(true);
    try {
      const res = await apiClient.extractIDCardOCR({
        document_type: "GHANA_CARD",
        raw_text_hint:
          sampleHint ||
          "REPUBLIC OF GHANA NATIONAL IDENTITY CARD\nSURNAME: MENSAH\nFIRST NAMES: KWESI KOJO\nSEX: M\nDATE OF BIRTH: 1988-08-14\nPERSONAL ID NUMBER: GHA-71298412-1\nNATIONALITY: GHANAIAN\nEXPIRY DATE: 2032-05-12",
      });
      setIdOcrSuccessData(res);
      setRegForm((prev) => ({
        ...prev,
        full_name: res.full_name,
        ghana_card_id: res.id_number,
        date_of_birth: res.date_of_birth,
        gender: res.gender === "MALE" ? "Male" : "Female",
      }));
      setTimeout(() => {
        setIsIdOcrModalOpen(false);
        setIsRegModalOpen(true);
        setStatusMessage({
          type: "success",
          text: `AI OCR extracted demographics for ${res.full_name} (${res.id_number}) in ${res.processing_time_ms}ms with ${(res.confidence_score * 100).toFixed(1)}% confidence.`,
        });
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to scan ID card." });
    } finally {
      setIsProcessingIdOcr(false);
    }
  };

  // Form states for modals
  const [regForm, setRegForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    ghana_card_id: "",
    date_of_birth: "1990-05-15",
    gender: "Male",
    blood_group: "O+",
    allergies: "None",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    nhis_number: "",
    nhis_status: "ACTIVE" as NHISStatus,
    physical_folder_rack: "Rack-B2",
    physical_folder_shelf: "Shelf-04",
    destination_clinic: "GENERAL_OPD" as ClinicDepartment,
    priority: "ROUTINE" as ReceptionTriagePriority,
  });

  const [traumaForm, setTraumaForm] = useState({
    gender_estimate: "Male",
    approximate_age_group: "Adult",
    identifying_marks_or_clothing: "Blue denim, unconscious, severe head trauma",
    brought_in_by: "National Ambulance Service (NAS)",
    ambulance_call_sign: "NAS-ACC-102",
    trauma_notes: "Multiple fracture signs, hypovolemic shock risk",
    blood_group: "O-",
    initial_triage_bay: "Resuscitation Bay 1",
  });

  const [mergeForm, setMergeForm] = useState({
    primary_mrn: "",
    secondary_mrn: "",
    merge_reason: "Reconciling emergency trauma intake profile with verified Ghana Card master folder.",
  });

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // High-Speed Hardware Scanner State
  const [fastScanInput, setFastScanInput] = useState("");
  const [isFastScanning, setIsFastScanning] = useState(false);
  const [hardwareListenerActive, setHardwareListenerActive] = useState(true);

  const handleFastScannerIntake = async (rawPayload: string) => {
    if (!rawPayload.trim()) return;
    setIsFastScanning(true);
    try {
      const res = await apiClient.scanFastIntake({
        raw_payload: rawPayload.trim(),
        scanner_type: "AUTO",
        target_department: destinationClinic,
        priority: priority,
      });

      setStatusMessage({
        type: "success",
        text: `1-Second Fast Check-In: Queue Ticket ${res.queue_ticket_number} generated for ${res.patient.full_name}! Physical Archive: ${res.patient.physical_folder_rack}/${res.patient.physical_folder_shelf}.`,
      });

      // Update selected patient
      setSelectedPatient({
        patient_id: res.patient.patient_id,
        user_id: `u-${res.patient.patient_id}`,
        full_name: res.patient.full_name,
        mrn: res.patient.mrn,
        ghana_card_id: res.patient.ghana_card_id,
        blood_group: res.patient.blood_group || "O+",
        allergies: res.patient.allergies || "None",
        nhis_status: res.patient.nhis_status as any,
        physical_folder_rack: res.patient.physical_folder_rack,
        physical_folder_shelf: res.patient.physical_folder_shelf,
        folder_status: "IN_ARCHIVE",
        registration_fee_paid: true,
        is_trauma_temporary: false,
        qr_token: `TOKEN-${res.patient.mrn}`,
        deduplication_warnings: [],
      });

      setFastScanInput("");
      try { const resQ = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ) ? resQ : []); } catch {}
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Fast scanner check-in failed.",
      });
    } finally {
      setIsFastScanning(false);
    }
  };

  // USB Keyboard Wedge Scanner Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hardwareListenerActive) return;
      const target = e.target as HTMLElement;
      // Don't intercept when user is typing in regular text inputs other than fast scan input
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ""; // Reset if human typing speed
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          handleFastScannerIntake(buffer);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hardwareListenerActive, destinationClinic, priority]);

  // Fetch Live Queue
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getReceptionQueue();
        setQueue(Array.isArray(res) ? res : []);
      } catch (e) {
        setQueue([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  // Execute Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setStatusMessage(null);
    setSearchError(null);

    try {
      const results = await apiClient.searchPatientsMaster(searchQuery.trim());
      setSearchResults(results || []);
      if (results && results.length > 0) {
        setSelectedPatient(results[0]);
      } else {
        setSelectedPatient(null);
        setStatusMessage({
          type: "warning",
          text: t("reception.search.noResults", { query: searchQuery }),
        });
      }
    } catch (err: any) {
      setSearchResults([]);
      setSelectedPatient(null);
      const errMsg = err.message || String(err) || t("reception.errors.searchFailed");
      setSearchError(errMsg);
      setStatusMessage({
        type: "error",
        text: errMsg,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Direct Dispatch from check-in form
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setStatusMessage(null);
    setDispatchError(null);

    try {
      const identifier = selectedPatient?.mrn || searchQuery.trim();
      const res = await apiClient.dispatchQueueTicket({
        patient_id: selectedPatient?.patient_id,
        mrn_or_identifier: identifier,
        destination_clinic: destinationClinic,
        priority: priority,
        is_nhis_covered: isNhisCovered,
        consulting_room_target: consultingRoom,
      });

      setDispatchResult(res);
      setDispatchError(null);
      executeThermalQueuePrint(res.queue_number, res.patient_name, res.mrn, res.destination_clinic, res.priority);
      setStatusMessage({
        type: "success",
        text: t("reception.dispatch.success", {
          ticket: res.queue_number,
          patient: res.patient_name,
          clinic: res.destination_clinic,
        }),
      });
      try { const resQ2 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ2) ? resQ2 : []); } catch {}
    } catch (err: any) {
      setDispatchResult(null);
      const errMsg = err.message || String(err) || t("reception.errors.dispatchFailed");
      setDispatchError(errMsg);
      setStatusMessage({
        type: "error",
        text: errMsg,
      });
    } finally {
      setIsDispatching(false);
    }
  };

  // Register New Patient Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.registerNewPatient(regForm);
      setIsRegModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `Patient ${res.full_name} registered successfully! MRN: ${res.mrn}. Physical Folder assigned to ${res.physical_folder_rack}/${res.physical_folder_shelf}.`,
      });
      setSearchQuery(res.mrn);
      await handleSearch();
      try { const resQ2 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ2) ? resQ2 : []); } catch {}
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to register patient.",
      });
    }
  };

  // Emergency Trauma 1-Click Intake Submit
  const handleTraumaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.createEmergencyTraumaIntake(traumaForm);
      setIsTraumaModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `EMERGENCY TRAUMA INTAKE RECORDED: ${res.temporary_name} (MRN: ${res.mrn})! Dispatched to Resuscitation Bay with Ticket ${res.queue_number}.`,
      });
      try { const resQ2 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ2) ? resQ2 : []); } catch {}
      // Auto open wristband print
      openWristbandPrint(res.patient_id, res.mrn, res.temporary_name);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to execute trauma intake.",
      });
    }
  };

  // Merge Records Submit
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.mergePatientRecords({
        primary_patient_id: mergeForm.primary_mrn,
        secondary_patient_id: mergeForm.secondary_mrn,
        merge_reason: mergeForm.merge_reason,
        confirm_data_override: true,
      });
      setIsMergeModalOpen(false);
      setStatusMessage({
        type: "success",
        text: res.message || "Patient records successfully merged.",
      });
      try { const resQ2 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ2) ? resQ2 : []); } catch {}
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to merge patient records.",
      });
    }
  };

  // Call Ticket to Room
  const handleCallTicket = async (queueId: string, room: string = "Consulting Room 2") => {
    setCallingQueueId(queueId);
    try {
      const called = await apiClient.callQueueTicket(queueId, room);
      setStatusMessage({
        type: "success",
        text: t("reception.callTicket.success", {
          ticket: called.ticket_number,
          patient: called.patient_display_name,
          room: called.consulting_room,
        }),
      });
      try { const resQ2 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ2) ? resQ2 : []); } catch {}
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || String(err) || t("reception.errors.callTicketFailed"),
      });
    } finally {
      setCallingQueueId(null);
    }
  };

  // Open Wristband Print
  const openWristbandPrint = (
    patientId: string,
    mrn: string = "RRH-2026-0812",
    patientName: string = "Patient"
  ) => {
    setPrintType("WRISTBAND");
    setWristbandData({
      patient_id: patientId,
      mrn: mrn,
      full_name: patientName,
      date_of_birth: selectedPatient?.date_of_birth || "1988-03-24",
      age_gender: `${selectedPatient?.gender || "Male"} · 38Y`,
      blood_group: selectedPatient?.blood_group || "O+",
      allergies: selectedPatient?.allergies || "Penicillin (Severe)",
      emergency_contact: selectedPatient?.emergency_contact_name
        ? `${selectedPatient.emergency_contact_name} (${selectedPatient.emergency_contact_phone})`
        : "None Recorded",
      ghana_card_id: selectedPatient?.ghana_card_id,
      barcode_data: `*${mrn}*`,
      qr_data: `https://medipaedia.health/verify/patient?mrn=${mrn}`,
      facility_name: "Ridge Regional Hospital, Accra",
      printed_at: new Date().toLocaleString(),
      is_emergency_trauma: mrn.includes("TRM"),
    });
    setIsPrintModalOpen(true);
  };

  // Open Queue Ticket Print
  const openTicketPrint = (ticketNumber: string, patientName: string, mrn: string) => {
    setPrintType("TICKET");
    setTicketData({
      ticket_id: `t-${Date.now()}`,
      ticket_number: ticketNumber,
      facility_name: "Ridge Regional Hospital, Accra",
      destination_clinic: destinationClinic.replace("_", " "),
      priority_level: priority,
      patient_name: patientName,
      mrn: mrn,
      qr_pass_data: `https://medipaedia.health/queue/pass?t=${ticketNumber}`,
      fee_status: "WAIVED / NHIS",
      fee_amount: "GHS 0.00",
      issue_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      instructions: "Please proceed to Nurse Triage Room 3. Watch waiting room TV display.",
    });
    setIsPrintModalOpen(true);
  };

  const handleQrScan = (token: string) => {
    setSearchQuery(token);
    setIsCameraScanning(false);
    handleSearch();
  };

  const clinicDepartments: { id: ClinicDepartment; label: string; icon: any; color: string }[] = [
    { id: "GENERAL_OPD", label: (t("reception.dept.general_opd") || "General OPD"), icon: Stethoscope, color: "teal" },
    { id: "ANTENATAL", label: (t("reception.dept.antenatal") || "Antenatal Clinic (ANC)"), icon: HeartPulse, color: "pink" },
    { id: "EYE_CLINIC", label: (t("reception.dept.eye") || "Eye Clinic"), icon: Eye, color: "indigo" },
    { id: "PEDIATRICS", label: (t("reception.dept.pediatrics") || "Pediatrics & Child"), icon: Baby, color: "amber" },
    { id: "EMERGENCY", label: (t("reception.dept.emergency") || "Emergency & Trauma"), icon: Flame, color: "rose" },
    { id: "DENTAL", label: (t("reception.dept.dental") || "Dental Clinic"), icon: Activity, color: "cyan" },
    { id: "SURGICAL_OPD", label: (t("reception.dept.surgical") || "Surgical OPD"), icon: Stethoscope, color: "purple" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <UserCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Patient Intake & Fast Identification
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  USB hardware wedge card reader, AI camera OCR, emergency trauma intake, and waiting queue routing
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrinterSetupOpen(true)}
              className="gap-1.5 font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4 text-teal-700" /> {(t("reception.buttons.printerSetup") || "Printer Setup")}
            </Button>

            <Link href="/reception/folders">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                <FolderArchive className="h-4 w-4 text-indigo-600" /> {(t("reception.buttons.folderGrid") || "Folder Archival Grid")}
              </Button>
            </Link>


            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIdOcrModalOpen(true)}
              className="gap-1.5 font-bold border-indigo-500 text-indigo-700 hover:bg-indigo-50 shadow-xs"
            >
              <Scan className="h-4 w-4 text-indigo-600" /> {(t("reception.buttons.idScanner") || "AI ID Card Scanner")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRegModalOpen(true)}
              className="gap-1.5 font-bold border-teal-500 text-teal-700 hover:bg-teal-50"
            >
              <PlusCircle className="h-4 w-4 text-teal-600" /> {(t("reception.buttons.newPatient") || "New Patient Registration")}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTraumaModalOpen(true)}
              className="gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20"
            >
              <Zap className="h-4 w-4" /> {(t("reception.buttons.traumaIntake") || "Emergency Trauma Intake (John Doe)")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMergeModalOpen(true)}
              className="gap-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <GitMerge className="h-4 w-4 text-slate-500" /> {(t("reception.buttons.mergeRecords") || "Merge Records")}
            </Button>

            <Link href="/reception/tv-display" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Volume2 className="h-4 w-4 text-teal-600" /> {(t("reception.buttons.tvScreen") || "TV Screen")}
              </Button>
            </Link>
          </div>
        </div>

        {/* 1-Second Fast Hardware Scanner Bar */}
        <div className="p-3 bg-gradient-to-r from-teal-900 to-slate-900 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-800 flex items-center justify-center text-teal-300">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-black text-white">{(t("reception.fastScan.title") || "Hardware Fast Intake")}</strong>
                <Badge variant="teal" className="bg-teal-800 text-teal-200 border-teal-600 text-[9px] font-mono">
                  {(t("reception.fastScan.listenerActive") || "● USB WEDGE LISTENER ACTIVE")}
                </Badge>
              </div>
              <p className="text-[10px] text-teal-200/80">
                {(t("reception.fastScan.hint") || "Ghana Card Barcode / RFID Wedge Reader")}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFastScannerIntake(fastScanInput);
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              value={fastScanInput}
              onChange={(e) => setFastScanInput(e.target.value)}
              placeholder="Scan card barcode or swipe NFC token..."
              className="px-3 py-1.5 bg-slate-800 border border-teal-600/50 rounded-lg text-xs text-white placeholder:text-slate-400 font-mono w-full sm:w-72 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isFastScanning}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs shrink-0"
            >
              {isFastScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (t("reception.fastScan.submit") || "Fast Check-In")}
            </Button>
          </form>
        </div>

        {/* Global Instant Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient by Name, Phone Number, or National ID PIN..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setIsCameraScanning(!isCameraScanning)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
            >
              <QrIcon className="h-3.5 w-3.5 text-teal-700" />
              {isCameraScanning ? (t("common.close") || "Close") : (t("reception.search.qrScan") || "QR Scan")}
            </button>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="bg-teal-600 hover:bg-teal-700 font-bold px-6"
            isLoading={isSearching}
          >
            {(t("reception.search.submit") || "Search Master Index")}
          </Button>
        </form>

        {isCameraScanning && (
          <div className="p-4 bg-slate-900 rounded-2xl text-white">
            <QRScanner
              onScanSuccess={handleQrScan}
              title="Optical Hardware / Webcam Scanner"
              placeholder="Scanning for Ghana Card QR or Hospital MRN token..."
            />
          </div>
        )}

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusMessage.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : statusMessage.type === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              {statusMessage.text}
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Check-In Dispatch, Right Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active Patient Check-In & Clinic Dispatch */}
        <div className="lg:col-span-6 space-y-6">
          {/* Patient Profile Card (if found) */}
          {selectedPatient ? (
            <Card className="border-teal-300 bg-gradient-to-br from-teal-500/5 via-white to-white shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                      {selectedPatient.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {selectedPatient.full_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        MRN: {selectedPatient.mrn} · {selectedPatient.ghana_card_id || "No National ID"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openWristbandPrint(
                          selectedPatient.patient_id,
                          selectedPatient.mrn,
                          selectedPatient.full_name
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" /> Wristband
                    </button>
                    <Badge variant="teal" className="text-[10px] uppercase">
                      {selectedPatient.nhis_status} NHIS
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3.5 space-y-3.5">
                {/* Physical Archival Coordinates */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      PHYSICAL ARCHIVE
                    </span>
                    <strong className="text-slate-800 font-mono text-xs">
                      {selectedPatient.physical_folder_rack} / {selectedPatient.physical_folder_shelf}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      FOLDER STATUS
                    </span>
                    <Badge
                      variant={
                        selectedPatient.folder_status === "CHECKED_OUT" ? "warning" : "teal"
                      }
                      className="text-[10px]"
                    >
                      {selectedPatient.folder_status}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      BLOOD / ALLERGIES
                    </span>
                    <strong className="text-rose-700 text-xs">
                      {selectedPatient.blood_group} · {selectedPatient.allergies}
                    </strong>
                  </div>
                </div>

                {/* Deduplication Conflict Alerts (if any) */}
                {selectedPatient.deduplication_warnings &&
                  selectedPatient.deduplication_warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        Deduplication Conflict Alert
                      </div>
                      {selectedPatient.deduplication_warnings.map((w, idx) => (
                        <p key={idx} className="text-[11px]">
                          {w.warning_message}
                        </p>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
              <Inbox className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                {t("reception.patientSelector.empty")}
              </p>
            </div>
          )}

          {/* Clinic Dispatch & Check-In Form */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                Clinic Routing & Queue Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleDispatch} className="space-y-4">
                {/* Destination Department Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Select Destination Clinic / Specialty
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {clinicDepartments.map((dept) => {
                      const Icon = dept.icon;
                      const isSelected = destinationClinic === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setDestinationClinic(dept.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                            isSelected
                              ? "border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20 font-bold"
                              : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs truncate">{dept.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Triage Priority */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Triage Urgency Flag
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { level: "ROUTINE", label: "Routine (Green)", desc: "Standard OPD" },
                      { level: "PRIORITY", label: "Priority (Yellow)", desc: "High pain / Elderly" },
                      { level: "EMERGENCY", label: "Emergency (Red)", desc: "Resuscitation" },
                    ].map((p) => (
                      <button
                        key={p.level}
                        type="button"
                        onClick={() => setPriority(p.level as any)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          priority === p.level
                            ? p.level === "EMERGENCY"
                              ? "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 font-bold"
                              : p.level === "PRIORITY"
                              ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 font-bold"
                              : "border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20 font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold">{p.label}</div>
                        <div className="text-[10px] text-slate-400">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Waiver & Consulting Room Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 block">
                      PAYMENT & FEE WAIVER STATUS
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="nhisWaiver"
                        checked={isNhisCovered}
                        onChange={(e) => setIsNhisCovered(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <label htmlFor="nhisWaiver" className="text-xs font-bold text-slate-800">
                        {isNhisCovered ? "GHS 0.00 (NHIS Covered / Waived)" : "GHS 50.00 (Cash Standard)"}
                      </label>
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Target Consulting Room"
                      value={consultingRoom}
                      onChange={(e) => setConsultingRoom(e.target.value)}
                      placeholder="e.g. Consulting Room 2"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isDispatching}
                    className="w-full gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-sm shadow-md"
                  >
                    Issue Queue Ticket & Dispatch to Clinic <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Success Check-In Slip & Thermal Reprint Button */}
          {dispatchResult && (
            <Card className="border-emerald-400 bg-emerald-50/40">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Check-In Successful</h4>
                      <p className="text-xs text-slate-500">Dispatched to {dispatchResult.destination_clinic}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">QUEUE TICKET</span>
                    <strong className="text-2xl font-black text-teal-700 font-mono">
                      {dispatchResult.queue_number}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-600 font-medium">
                    Estimated Wait: <strong>~{dispatchResult.estimated_wait_minutes} mins</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openTicketPrint(
                          dispatchResult.queue_number,
                          dispatchResult.patient_name,
                          dispatchResult.mrn
                        )
                      }
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print 80mm Thermal Slip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Live Multi-Clinic Waiting Queue Stream */}
        <div className="lg:col-span-6 space-y-4">
          <Card>
            <CardHeader className="py-3.5 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Live Waiting Queue Stream
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => { try { setLoading(true); const resQ3 = await apiClient.getReceptionQueue(); setQueue(Array.isArray(resQ3) ? resQ3 : []); } finally { setLoading(false); } }}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-medium flex items-center gap-1 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-teal-600" /> Refresh
                  </button>
                </div>
              </div>

              {/* Department Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-1">
                {[
                  { id: "ALL", label: "All Clinics" },
                  { id: "GENERAL_OPD", label: "General OPD" },
                  { id: "ANTENATAL", label: "Antenatal" },
                  { id: "EMERGENCY", label: "Emergency" },
                  { id: "PEDIATRICS", label: "Pediatrics" },
                  { id: "EYE_CLINIC", label: "Eye Clinic" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDepartmentTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      selectedDepartmentTab === tab.id
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  Loading queue&hellip;
                </div>
              ) : queue.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">No patients currently in waiting queue</p>
                  <p className="text-xs text-slate-500 mt-1">Checked-in patients will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                  {queue.map((item) => (
                    <div
                      key={item.queue_id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-teal-700 text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {item.queue_number}
                          </span>
                          <strong className="text-slate-900 text-sm">{item.patient_name}</strong>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          MRN: {item.mrn} · {item.destination_clinic}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {item.wait_duration_minutes}m wait
                          </span>
                          <span>·</span>
                          <span className="text-slate-600 font-semibold">{item.consulting_room || "Room 1"}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Badge
                            variant={
                              item.priority === "EMERGENCY"
                                ? "danger"
                                : item.priority === "PRIORITY"
                                ? "warning"
                                : "teal"
                            }
                            className="text-[10px]"
                          >
                            {item.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {item.fee_waiver_badge}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleCallTicket(item.queue_id, item.consulting_room || "Consulting Room 2")}
                            disabled={callingQueueId === item.queue_id}
                            className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition"
                          >
                            <Volume2 className="h-3 w-3" /> Call Room
                          </button>
                          <button
                            type="button"
                            onClick={() => openTicketPrint(item.queue_number, item.patient_name, item.mrn)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                            title="Reprint Slip"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. Modal: New Patient Registration */}
      {/* ==================================================================== */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  New Patient Master Registration & Folder Allocation
                </h3>
              </div>
              <button
                onClick={() => setIsRegModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full Name *"
                  value={regForm.full_name}
                  onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                  placeholder="e.g. Ama Serwaa Mensah"
                  required
                />
                <Input
                  label="Ghana Card ID"
                  value={regForm.ghana_card_id}
                  onChange={(e) => setRegForm({ ...regForm, ghana_card_id: e.target.value })}
                  placeholder="e.g. GHA-712345678-9"
                />
                <Input
                  label="Phone Number"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+233..."
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={regForm.date_of_birth}
                  onChange={(e) => setRegForm({ ...regForm, date_of_birth: e.target.value })}
                />
                <Input
                  label="NHIS Number"
                  value={regForm.nhis_number}
                  onChange={(e) => setRegForm({ ...regForm, nhis_number: e.target.value })}
                  placeholder="e.g. NHIS-992144"
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
                <h4 className="font-bold text-teal-900 text-xs">
                  Physical Records Archival Allocation (Rack / Shelf)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Assigned Rack"
                    value={regForm.physical_folder_rack}
                    onChange={(e) => setRegForm({ ...regForm, physical_folder_rack: e.target.value })}
                    placeholder="Rack-B2"
                  />
                  <Input
                    label="Assigned Shelf"
                    value={regForm.physical_folder_shelf}
                    onChange={(e) => setRegForm({ ...regForm, physical_folder_shelf: e.target.value })}
                    placeholder="Shelf-04"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsRegModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="bg-teal-600 hover:bg-teal-700 font-bold">
                  Register & Generate Facility MRN
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. Modal: Emergency Trauma 1-Click Fast Intake */}
      {/* ==================================================================== */}
      {isTraumaModalOpen && (
        <div className="fixed inset-0 z-50 bg-rose-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-rose-500 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-rose-900">
                    Emergency Trauma Intake Protocol (John/Jane Doe)
                  </h3>
                  <p className="text-[11px] text-rose-600">
                    Immediate ESI Level 1 dispatch for unconscious or unidentified polytrauma patients.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTraumaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTraumaSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Gender</label>
                  <select
                    value={traumaForm.gender_estimate}
                    onChange={(e) => setTraumaForm({ ...traumaForm, gender_estimate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs text-slate-900 font-bold"
                  >
                    <option value="Male">Unknown Male</option>
                    <option value="Female">Unknown Female</option>
                    <option value="Pediatric">Unknown Pediatric</option>
                  </select>
                </div>
                <Input
                  label="Blood Group (Default Universal O-)"
                  value={traumaForm.blood_group}
                  onChange={(e) => setTraumaForm({ ...traumaForm, blood_group: e.target.value })}
                />
                <Input
                  label="Ambulance Call Sign"
                  value={traumaForm.ambulance_call_sign}
                  onChange={(e) => setTraumaForm({ ...traumaForm, ambulance_call_sign: e.target.value })}
                  placeholder="NAS-ACC-102"
                />
                <Input
                  label="Initial Resuscitation Bay"
                  value={traumaForm.initial_triage_bay}
                  onChange={(e) => setTraumaForm({ ...traumaForm, initial_triage_bay: e.target.value })}
                  placeholder="Resuscitation Bay 1"
                />
              </div>

              <Input
                label="Identifying Marks / Clothing Description"
                value={traumaForm.identifying_marks_or_clothing}
                onChange={(e) => setTraumaForm({ ...traumaForm, identifying_marks_or_clothing: e.target.value })}
                placeholder="e.g. Blue denim jacket, silver ring on left thumb, head laceration"
              />

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-semibold space-y-1">
                <span className="font-bold block text-rose-800">AUTOMATIC ACTIONS ON SUBMIT:</span>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                  <li>Generates temporary trauma MRN: <code>RRH-TRM-2026-XXXX</code></li>
                  <li>Assigns ESI Level 1 (Resuscitation) & Routes to Emergency Bay</li>
                  <li>Automatically triggers thermal trauma barcode wristband layout</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsTraumaModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-lg shadow-rose-500/20"
                >
                  ⚡ Execute 1-Click Trauma Intake
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. Modal: Patient Record Merge Desk */}
      {/* ==================================================================== */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Patient Master Profile Reconciliation & Merge
                </h3>
              </div>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-3.5 text-xs">
              <Input
                label="Primary Target MRN (Verified Permanent Record) *"
                value={mergeForm.primary_mrn}
                onChange={(e) => setMergeForm({ ...mergeForm, primary_mrn: e.target.value })}
                placeholder="e.g. RRH-2026-0812 (Verified Ghana Card master)"
                required
              />

              <Input
                label="Secondary Source MRN (Duplicate or Trauma Temp ID) *"
                value={mergeForm.secondary_mrn}
                onChange={(e) => setMergeForm({ ...mergeForm, secondary_mrn: e.target.value })}
                placeholder="e.g. RRH-TRM-2026-912 (Temporary emergency trauma)"
                required
              />

              <Input
                label="Merge Clinical Justification *"
                value={mergeForm.merge_reason}
                onChange={(e) => setMergeForm({ ...mergeForm, merge_reason: e.target.value })}
                placeholder="Provide clinical audit rationale for merge..."
                required
              />

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                <span className="font-bold block">AUDIT COMPLIANCE NOTICE:</span>
                <p className="text-[11px]">
                  All consultations, vitals, prescriptions, and physical folder logs will be reconciled into the primary permanent record. The secondary temporary identifier will be archived.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsMergeModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                  Execute Record Merge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. Modal: Thermal Wristband & Queue Ticket Print Preview */}
      {/* ==================================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {printType === "WRISTBAND" ? "Thermal Patient Wristband (Zebra/TSC)" : "80mm POS Receipt Slip"}
                </h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Wristband Layout */}
            {printType === "WRISTBAND" && wristbandData && (
              <div className="p-4 rounded-xl border-2 border-slate-900 bg-slate-50 font-mono text-slate-900 space-y-2">
                <div className="flex justify-between border-b border-slate-300 pb-1 text-xs">
                  <strong>{wristbandData.facility_name}</strong>
                  <span className="font-bold text-rose-700">{wristbandData.blood_group}</span>
                </div>
                <div className="text-sm font-black tracking-wide">{wristbandData.full_name}</div>
                <div className="text-xs flex justify-between">
                  <span>MRN: {wristbandData.mrn}</span>
                  <span>{wristbandData.age_gender}</span>
                </div>
                <div className="text-[11px] text-rose-700 font-bold">
                  ALLERGIES: {wristbandData.allergies}
                </div>
                <div className="text-[10px] text-slate-500">
                  EMERGENCY CONTACT: {wristbandData.emergency_contact}
                </div>
                {/* 1D Barcode Simulation */}
                <div className="pt-2 text-center">
                  <div className="h-8 bg-slate-800 mx-auto rounded flex items-center justify-center text-white text-[10px] tracking-[0.3em] font-black">
                    |||||||| | ||||| |||| ||||||||
                  </div>
                  <span className="text-[10px] tracking-widest">{wristbandData.barcode_data}</span>
                </div>
              </div>
            )}

            {/* 80mm Queue Ticket Layout */}
            {printType === "TICKET" && ticketData && (
              <div className="p-4 rounded-xl border border-dashed border-slate-400 bg-white font-mono text-slate-900 space-y-2 text-center">
                <div className="text-xs font-bold uppercase">{ticketData.facility_name}</div>
                <div className="text-[10px] text-slate-500">PATIENT OPD QUEUE PASS</div>
                <div className="text-3xl font-black text-teal-700 py-1 font-mono tracking-wider">
                  {ticketData.ticket_number}
                </div>
                <div className="text-xs font-bold">{ticketData.destination_clinic}</div>
                <div className="text-xs">{ticketData.patient_name} · {ticketData.mrn}</div>
                <div className="text-[10px] text-emerald-700 font-bold">
                  FEE: {ticketData.fee_status} ({ticketData.fee_amount})
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-2">
                  {ticketData.issue_time} · {ticketData.instructions}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                  setIsPrintModalOpen(false);
                }}
                className="bg-teal-600 hover:bg-teal-700 font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" /> Send to Printer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI ID Card Scanner Modal */}
      {isIdOcrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Scan className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI ID Card OCR Scanner
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghana National ID · ECOWAS Passport · Driver's License
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIdOcrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Webcam / Viewfinder Simulation */}
            <div className="relative rounded-2xl bg-slate-950 p-6 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 text-center overflow-hidden min-h-[220px]">
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 border-2 border-indigo-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                  <div className="w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                </div>
                <div className="flex justify-between">
                  <div className="w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                  <div className="w-3 h-3 border-b-2 border-r-2 border-indigo-400" />
                </div>
              </div>

              {isProcessingIdOcr ? (
                <div className="space-y-2 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-xs font-bold text-indigo-300">
                    Scanning ID Card & Extracting Demographics...
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">Zero-PHI Local Buffer Processing</p>
                </div>
              ) : (
                <div className="space-y-2 z-10">
                  <Camera className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-200">
                    Hold National ID Card inside the frame or select a quick sample:
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleScanGhanaCardOCR(
                          "REPUBLIC OF GHANA NATIONAL IDENTITY CARD\nSURNAME: SAMPLE\nFIRST NAMES: DEMO\nSEX: M\nDATE OF BIRTH: 1990-01-01\nPERSONAL ID NUMBER: GHA-000000000-0\nNATIONALITY: GHANAIAN\nEXPIRY DATE: 2030-01-01"
                        )
                      }
                      className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50"
                    >
                      🇬🇭 Demo Sample (Ghana Card)
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> High-Confidence OCR Engine
              </span>
              <span className="font-mono text-slate-400">NIA / GHA-Compliant</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsIdOcrModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hardware Printer Setup Modal */}
      <PrinterSetupModal
        isOpen={isPrinterSetupOpen}
        onClose={() => setIsPrinterSetupOpen(false)}
        defaultTab="RECEIPT"
      />
    </div>
  );
}

