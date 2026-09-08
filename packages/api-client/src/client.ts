import {
  AuthMe,
  CheckInPayload,
  CheckInResult,
  CheckoutOrderPayload,
  CheckoutOrderResult,
  Consultation,
  DispensePayload,
  DispenseResult,
  DispensaryLogItem,
  ExecuteBatchPayoutPayload,
  BatchPayoutExecutionResult,
  BatchSettlementSummary,
  HealthCheckResponse,
  ICD10Item,
  InventoryBatch,
  InventoryBatchCreateData,
  MarketplaceSearchPayload,
  MarketplaceSearchResult,
  OpdQueueItem,
  Order,
  PatientAccount,
  PatientCard,
  PatientHistory,
  PatientLoginCredentials,
  PatientOrder,
  PatientOrderItem,
  PatientPrescriptionSummary,
  PatientRegisterData,
  PaymentRecipientSetupData,
  PaymentRecipientSetupResult,
  PendingFacilityItem,
  PharmacyInventory,
  PharmacyLedgerData,
  PickupQRData,
  Prescription,
  PrescriptionMintInput,
  PrescriptionPrintData,
  PrescriptionStatus,
  PrescriptionVerifyResult,
  ReceiptData,
  ReleaseEscrowResult,
  SettlementPayoutItem,
  SOAPConsultationInput,
  StaffLoginCredentials,
  Tenant,
  TokenPair,
  VerifyFacilityPayload,
  VerifyFacilityResult,
  VitalsInput,
  VitalsResult,
  AdminOverviewMetrics,
  AdminAuditLogItem,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  HospitalFinances,
  HospitalSettings,
  HospitalStaffItem,
  InviteHospitalStaffPayload,
  InvitePharmacyStaffPayload,
  LogoutResponse,
  PharmacySettings,
  PharmacyStaffItem,
  UpdateHospitalSettingsPayload,
  UpdatePharmacySettingsPayload,
  UpdateProfilePayload,
  UserSessionItem,
  ExtendedVitalsPayload,
  ExtendedVitalsResult,
  PatientMedicationScheduleResponse,
  MedicationAdministerPayload,
  MedicationAdministerResult,
  WardBedGridResponse,
  AssignBedPayload,
  FluidBalanceLogPayload,
  PatientFluidBalanceSummary,
  SBARHandoverPayload,
  SBARHandoverItem,
  AcknowledgeHandoverPayload,
  PatientAllergyItem,
  PatientAllergyPayload,
  PrescriptionSafetyCheckPayload,
  PrescriptionSafetyCheckResult,
  CPOEDiagnosticOrderPayload,
  CPOEDiagnosticOrderResult,
  PatientDiagnosticHistoryResult,
  InpatientAdmissionOrderPayload,
  InpatientAdmissionOrderResult,
  SpecialistReferralPayload,
  SpecialistReferralResult,
  PatientPendingChargesResponse,
  InvoiceGenerateRequest,
  PatientInvoiceResponse,
  InvoicePaymentRequest,
  InvoicePaymentResponse,
  OpenShiftRequest,
  CashierShiftResponse,
  CloseShiftRequest,
  CloseShiftResponse,
  InsuranceClaimItem,
  ClaimBatchCreateRequest,
  ClaimBatchResponse,
  HospitalRevenueAnalyticsResponse,
  ClaimStatus,
  StaffMemberResponse,
  StaffInviteRequest,
  StaffCredentialUpdateRequest,
  ShiftRosterItem,
  CreateShiftRosterRequest,
  DepartmentCapacityItem,
  UpdateDepartmentBedsRequest,
  OperatingTheatreItem,
  TheatreStatusUpdateRequest,
  HospitalTariffConfig,
  UpdateHospitalTariffRequest,
  ThroughputAnalyticsResponse,
  ClinicalIncidentItem,
  ClinicalIncidentCreateRequest,
  IncidentSeverity,
  EmergencyICEProfile,
  EmergencyICEUpdateRequest,
  PublicICEResponse,
  DiagnosticReportItem,
  VitalsLogItem,
  VitalsLogCreateRequest,
  PatientAppointmentItem,
  PatientAppointmentItemV2,
  ListPatientAppointmentsResponse,
  CreatePatientAppointmentRequest,
  CreatePatientAppointmentResponse,
  BookAppointmentRequest,
  PreCheckinRequest,
  DependentProfileItem,
  AddDependentRequest,
  AdherenceScheduleItem,
  LogDoseTakenRequest,
  PatientWalletResponse,
  WalletTopupRequest,
  WalletTopupResponse,
  SafetyAlertSeverity,
  FulfillmentStage,
  ClinicalSafetyAlertItem,
  PrescriptionSafetyCheckRequest,
  PrescriptionSafetyCheckResponse,
  GenericSubstituteItem,
  FEFODispenseItem,
  FEFODispenseRequest,
  FEFODispenseResponse,
  PrintableRxLabelItem,
  ControlledDrugLogRequest,
  ControlledDrugRegisterItem,
  FulfillmentOrderItem,
  PackOrderRequest,
  HandoverOrderRequest,
  HandoverOrderResponse,
  PoisonClassType,
  QuarantineReason,
  QuarantineResolution,
  TemperatureExcursionLevel,
  ADRReactionSeverity,
  NarcoticsRegisterItem,
  AuthorizeNarcoticsRequest,
  NarcoticsExportResponse,
  QuarantinedBatchItem,
  FreezeBatchRequest,
  ResolveQuarantineRequest,
  ColdChainLogItem,
  LogTemperatureRequest,
  ADRReportItem,
  FileADRRequest,
  CompoundingLogItem,
  PatientMasterSearchResult,
  ReceptionPatientRegisterInput,
  ReceptionPatientRegisterResult,
  EmergencyTraumaIntakeInput,
  EmergencyTraumaIntakeResult,
  MergePatientRecordsInput,
  MergePatientRecordsResult,
  QueueDispatchInput,
  QueueDispatchResult,
  ActiveQueueItem,
  TVCalledTicket,
  QueueTVDisplayData,
  FolderTransitInput,
  FolderTransitLogResult,
  FolderLedgerItem,
  WristbandPrintData,
  QueueTicketPrintData,
  PharmacySupplier,
  SupplierCreateInput,
  ReorderSuggestionsData,
  PurchaseOrder,
  PurchaseOrderCreateInput,
  PurchaseOrderStatus,
  GoodsReceivedNoteInput,
  GoodsReceivedNoteResult,
  StockTransfer,
  StockTransferCreateInput,
  PricingRulesData,
  UpdatePricingRulesInput,
  BulkMarkupApplyInput,
  BulkMarkupApplyResult,
  CycleCountAudit,
  CycleCountSubmitInput,
  PharmacyAdminOverviewMetrics,
  ExtendedPharmacySettings,
  UpdateExtendedPharmacySettingsInput,
  SubscriptionPlanItem,
  TenantSubscriptionMatrixItem,
  RecurringCollectionResult,
  MultiCountryMoMoChargeRequest,
  MultiCountryMoMoChargeResponse,
  MoMoStatusCheckResponse,
  MoMoSweepRequest,
  SubscriptionPlanDetail,
  CreateSubscriptionPlanInput,
  UpdateSubscriptionPlanInput,
  GatewayConfigItem,
  UpdateGatewayConfigInput,
  TestGatewayConnectionResult,
  TenantBillingPolicyItem,
  UpdateTenantBillingPolicyInput,
  CustomInvoiceInput,
  CustomInvoiceResult,
  FacilityGatewayConfig,
  UpdateFacilityGatewayConfigInput,
  TestPayoutPingResult,
  HospitalServiceTariffItem,
  CreateHospitalServiceTariffInput,
  UpdateHospitalServiceTariffInput,
  BulkTariffAdjustmentInput,
  CorporateInsuranceAccountItem,
  CreateCorporateAccountInput,
  UpdateCorporateAccountInput,
  StatementOfAccountResult,
  CashierShiftAuditItem,
  UnpaidFolioStatus,
  UnpaidFolioItem,
  PharmacyGatewayConfig,
  UpdatePharmacyGatewayConfigInput,
  TestPharmacyPayoutPingResult,
  RequestInstantPayoutInput,
  RequestInstantPayoutResult,
  PharmacyPricingRules,
  UpdatePharmacyPricingRulesInput,
  ApplyBatchPricingInput,
  ApplyBatchPricingResult,
  PharmacyCorporateDebtorItem,
  CreatePharmacyCorporateDebtorInput,
  UpdatePharmacyCorporateDebtorInput,
  RecordDebtorPaymentInput,
  RecordDebtorPaymentResult,
  PharmacyDebtorStatementResult,
  PharmacyCashierShiftAuditItem,
  ClinicalMacro,
  CreateClinicalMacroInput,
  PatientLongitudinalTrends,
  StatNursingOrder,
  CreateStatNursingOrderInput,
  ExecuteStatNursingOrderInput,
  GatewayHealthMetric,
  GatewayHealthResponse,
  FailoverUpdateRequest,
  WebhookDLQItem,
  WebhookDLQListResponse,
  WebhookReplayResponse,
  TenantHealthAuditItem,
  TenantAuditSweepResponse,
  DepletionForecastItem,
  DepletionForecastResponse,
  BulkPOGenerationItemInput,
  BulkPOGenerationRequest,
  BulkPOGenerationResponse,
  ComplianceExportRequest,
  ComplianceBundleRecordItem,
  ComplianceExportBundleResponse,
  AuditPackageHistoryItem,
  CounterPickupItem,
  CourierDeliveryItem,
  UnifiedDispatchQueueResponse,
  CourierDispatchActionRequest,
  CourierDispatchActionResponse,
  PillBoxCompartmentItem,
  PillBoxDailyScheduleResponse,
  LogPillBoxDoseRequest,
  LogPillBoxDoseResponse,
  BookTelehealthSessionRequest,
  BookTelehealthSessionResponse,
  FastScannerIntakeRequest,
  FastScannerResolvedPatient,
  FastScannerIntakeResponse,
  FolderShelfLocationItem,
  FolderArchiveMapResponse,
  FolderCheckoutActionRequest,
  FolderReturnActionRequest,
  FolderTransitActionResponse,
  QueueAudioEventItem,
  QueueAudioStreamResponse,
  AIScribeRequest,
  AISoapScribeResponse,
  ICD10DifferentialRequest,
  ICD10SuggestionResponse,
  MultilingualCounselingRequest,
  MultilingualCounselingResponse,
  IDCardOCRRequest,
  IDCardOCRResponse,
  PrescriptionOCRRequest,
  PrescriptionOCRResponse,
  ExtractedDrugItem,
  QueueWaitTimeEstimateRequest,
  QueueWaitTimeEstimateResponse,
  SeasonalForecastItem,
  SeasonalDemandResponse,
  ClaimScrubIssue,
  ClaimScrubberReportResponse,
  ClaimScrubBatchRequest,
  EpidemicOutbreakAlertItem,
  EpidemicSentinelResponse,
  FacilityBranch,
  CreateBranchRequest,
  UpdateBranchRequest,
  InterBranchTransfer,
  InterBranchTransferItem,
  IBTDispatchPayload,
  ReceiveIBTPayload,
  TenantEntitlementsResponse,
  NHISGDRGTariffItem,
  FormularyMedicationItem,
  CompanyInvitationCreateRequest,
  CompanyInviteSubmissionRequest,
  CompanyInvitationResponse,
  CompanyVerificationResponse,
  CompanyOnboardingCompletionRequest,
  CompanyOnboardingCompletionResponse,
  StaffInvitationCreateRequest,
  StaffInvitationResponse,
  StaffVerificationResponse,
  StaffOnboardingCompletionRequest,
  StaffOnboardingCompletionResponse,
  StaffSeatQuotaSummary,
  CriticalAlertItem,
  
  DueMedicationItem,
  WardOccupancySnapshot,
  PendingTriageItem,
  FacilityBedItem,
  TriageEncounterPayload,
  TriageEncounter,
  WardBedsSummary,
  WardBedsSummarySnapshot,
  UpdateFacilityPayload,
  UpdateFacilityResult,
  TenantStaffItem,
  CreateTenantStaffPayload,
  GenerateResetLinkPayload,
  GenerateResetLinkResult,
  OverridePasswordPayload,
  OverridePasswordResult,
  SmtpConfigResult,
  SmtpConfigPayload,
  SmtpTestPayload,
  SmtpTestResult,
  TelemedicineTokenRequest,
  TelemedicineTokenResponse,
  HospitalPatientCard,
  PatientLabOrderItem,
  LatestPatientVitals,
  ListPatientHospitalCardsResponse,
  ListPatientPrescriptionsResponse,
  ListPatientLabOrdersResponse,
  IntakeTrack,
  BillingStatus,
  LabOrderStatus,
  LabOrderObservationItem,
  LatestVitalsStatus,

} from "./types";



export interface MedipaediaClientOptions {
  baseUrl?: string;
  authToken?: string;
  refreshToken?: string;
  tenantId?: string;
  onUnauthorized?: () => void;
}

export class MedipaediaApiClient {
  private baseUrl: string;
  private authToken?: string;
  private refreshTokenVal?: string;
  private tenantId?: string;
  private onUnauthorized?: () => void;

  constructor(options: MedipaediaClientOptions = {}) {
    this.baseUrl =
      options.baseUrl ||
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
      "http://localhost:8000/api/v1";
    this.authToken = options.authToken;
    this.refreshTokenVal = options.refreshToken;
    this.tenantId = options.tenantId;
    this.onUnauthorized = options.onUnauthorized;
  }

  public setAuthToken(token?: string) {
    this.authToken = token;
  }

  public setRefreshToken(token?: string) {
    this.refreshTokenVal = token;
  }

  public setTenantId(tenantId?: string) {
    this.tenantId = tenantId;
  }

  private unauthFired = false;

  private handleUnauthorized() {
    if (this.unauthFired) return;
    this.unauthFired = true;
    try {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      } else if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("medipaedia_auth_token");
        localStorage.removeItem("medipaedia_tenant_id");
        localStorage.removeItem("active_facility_name");
        localStorage.removeItem("active_branch_id");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        try {
          document.cookie = "access_token=; path=/; max-age=0";
          document.cookie = "refresh_token=; path=/; max-age=0";
          document.cookie = "medipaedia_auth_token=; path=/; max-age=0";
          document.cookie = "medipaedia_tenant_id=; path=/; max-age=0";
          document.cookie = "active_branch_id=; path=/; max-age=0";
        } catch {}
        const loc = window.location;
        if (!loc.pathname.startsWith("/login") && !loc.pathname.startsWith("/onboard")) {
          const next = encodeURIComponent(loc.pathname + loc.search);
          loc.href = next ? `/login?logout=true&next=${next}` : "/login?logout=true";
        }
      }
    } catch {}
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    let token = this.authToken;
    if (!token && typeof document !== "undefined") {
      try {
        const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
        if (!token && typeof localStorage !== "undefined") {
          token = localStorage.getItem("access_token") || localStorage.getItem("auth_token") || undefined;
        }
      } catch {}
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (this.tenantId) {
      headers["X-Tenant-ID"] = this.tenantId;
    }

    const cleanBase = this.baseUrl.replace(/\/+$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const finalUrl =
      cleanBase.endsWith("/api/v1") && cleanEndpoint.startsWith("/api/v1")
        ? `${cleanBase}${cleanEndpoint.replace(/^\/api\/v1/, "")}`
        : `${cleanBase}${cleanEndpoint}`;

    const response = await fetch(finalUrl, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.handleUnauthorized();
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // ================= Authentication =================

  public async loginStaff(
    credentials: StaffLoginCredentials
  ): Promise<TokenPair> {
    const res = await this.request<TokenPair>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    this.setAuthToken(res.access_token);
    this.setRefreshToken(res.refresh_token);
    if (res.tenant_id) this.setTenantId(res.tenant_id);
    return res;
  }

  public async registerPatient(
    data: PatientRegisterData
  ): Promise<TokenPair> {
    const res = await this.request<TokenPair>("/api/v1/auth/patient/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setAuthToken(res.access_token);
    this.setRefreshToken(res.refresh_token);
    return res;
  }

  public async loginPatient(
    credentials: PatientLoginCredentials
  ): Promise<TokenPair> {
    const res = await this.request<TokenPair>("/api/v1/auth/patient/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    this.setAuthToken(res.access_token);
    this.setRefreshToken(res.refresh_token);
    return res;
  }

  public async refreshToken(refreshToken?: string): Promise<TokenPair> {
    const token = refreshToken || this.refreshTokenVal;
    if (!token) throw new Error("No refresh token available");

    const res = await this.request<TokenPair>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: token }),
    });
    this.setAuthToken(res.access_token);
    this.setRefreshToken(res.refresh_token);
    if (res.tenant_id) this.setTenantId(res.tenant_id);
    return res;
  }

  public async getCurrentUser(): Promise<AuthMe> {
    return this.request<AuthMe>("/api/v1/auth/me");
  }

  public async selectFacility(facilityId: string): Promise<TokenPair> {
    const res = await this.request<TokenPair>("/api/v1/auth/patient/select-facility", {
      method: "POST",
      body: JSON.stringify({ facility_id: facilityId }),
    });
    this.setAuthToken(res.access_token);
    this.setRefreshToken(res.refresh_token);
    this.setTenantId(facilityId);
    return res;
  }

  // ================= Fintech & Escrow Settlements =================

  public async getPharmacyLedger(): Promise<PharmacyLedgerData> {
    return this.request<PharmacyLedgerData>("/api/v1/payments/pharmacy/ledger");
  }

  public async setupPaymentRecipient(data: PaymentRecipientSetupData): Promise<PaymentRecipientSetupResult> {
    return this.request<PaymentRecipientSetupResult>("/api/v1/payments/pharmacy/recipient", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async releaseOrderEscrow(orderId: string): Promise<ReleaseEscrowResult> {
    return this.request<ReleaseEscrowResult>(`/api/v1/payments/orders/${orderId}/release-escrow`, {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  public async executePharmacyPayout(amount?: number): Promise<SettlementPayoutItem> {
    return this.request<SettlementPayoutItem>("/api/v1/payments/settlements/execute", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }

  // ================= Patient Marketplace & Wallet =================

  public async getPatientCards(): Promise<PatientCard[]> {
    return this.request<PatientCard[]>("/api/v1/patient/cards");
  }

  public async getPatientPrescriptions(): Promise<PatientPrescriptionSummary[]> {
    return this.request<PatientPrescriptionSummary[]>("/api/v1/patient/prescriptions");
  }

  public async searchMarketplaceMeds(payload: MarketplaceSearchPayload): Promise<MarketplaceSearchResult> {
    return this.request<MarketplaceSearchResult>("/api/v1/patient/marketplace/search", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async searchMarketplace(query: any): Promise<MarketplaceSearchResult[]> {
    try {
      const res = await this.searchMarketplaceMeds({
        latitude: query.lat,
        longitude: query.lng,
        radius_km: query.radius_km,
        medication_name: query.query,
      });
      return (res.results || []) as any;
    } catch {
      return [];
    }
  }

  public async createCheckoutOrder(payload: CheckoutOrderPayload): Promise<CheckoutOrderResult> {
    return this.request<CheckoutOrderResult>("/api/v1/patient/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async checkoutPatientOrder(payload: any): Promise<any> {
    return this.createCheckoutOrder({
      pharmacy_tenant_id: payload.pharmacy_id,
      fulfillment_type: payload.fulfillment_type,
      delivery_address: payload.delivery_address,
      items: (payload.items || []).map((it: any) => ({
        inventory_id: it.inventory_id || it.inventory_batch_id || "batch-1",
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
      })),
    });
  }

  public async getPatientOrders(): Promise<PatientOrder[]> {
    const orders = await this.request<PatientOrder[]>("/api/v1/patient/orders");
    return (orders || []).map((o) => ({
      ...o,
      id: o.order_id,
      otp_code: o.pickup_otp,
      status: o.escrow_status,
    }));
  }

  public async getOrderPickupQR(orderId: string): Promise<PickupQRData> {
    return this.request<PickupQRData>(`/api/v1/patient/orders/${orderId}/qr`);
  }

  // ================= Pharmacy & POS Module =================

  public async getPharmacyInventory(filters?: {
    lowStockOnly?: boolean;
    expiringDays?: number;
    search?: string;
  }): Promise<InventoryBatch[]> {
    const params = new URLSearchParams();
    if (filters?.lowStockOnly) params.append("low_stock_only", "true");
    if (filters?.expiringDays) params.append("expiring_days", filters.expiringDays.toString());
    if (filters?.search) params.append("search", filters.search);

    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<InventoryBatch[]>(`/api/v1/pharmacy/inventory${qs}`);
  }

  public async getInventoryBatches(filters?: {
    search?: string;
    low_stock_only?: boolean;
    expiring_days?: number;
  }): Promise<InventoryBatch[]> {
    return this.getPharmacyInventory({
      search: filters?.search,
      lowStockOnly: filters?.low_stock_only,
      expiringDays: filters?.expiring_days,
    });
  }

  public async upsertInventoryBatch(data: InventoryBatchCreateData): Promise<InventoryBatch> {
    return this.request<InventoryBatch>("/api/v1/pharmacy/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async verifyPrescriptionClaim(token: string): Promise<PrescriptionVerifyResult> {
    return this.request<PrescriptionVerifyResult>("/api/v1/pharmacy/verify-prescription", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  public async dispenseItems(data: DispensePayload): Promise<DispenseResult> {
    const sanitizedItems = (data.items || []).map((it) => ({
      inventory_id: it.inventory_id || it.inventory_batch_id || "",
      quantity_to_dispense: it.quantity_to_dispense ?? it.quantity ?? 1,
      unit_price: it.unit_price,
      prescription_item_id: it.prescription_item_id,
    }));

    return this.request<DispenseResult>("/api/v1/pharmacy/dispense", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        items: sanitizedItems,
      }),
    });
  }

  public async getDispensaryLog(): Promise<DispensaryLogItem[]> {
    return this.request<DispensaryLogItem[]>("/api/v1/pharmacy/dispensary-log");
  }

  public async getReceipt(receiptId: string): Promise<ReceiptData> {
    return this.request<ReceiptData>(`/api/v1/pharmacy/receipt/${receiptId}`);
  }

  // ================= Clinical & EMR Module =================

  public async checkInPatient(data: CheckInPayload): Promise<CheckInResult> {
    return this.request<CheckInResult>("/api/v1/clinical/check-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getFacilityQueue(status?: string): Promise<OpdQueueItem[]> {
    const query = status ? `?queue_status=${status}` : "";
    return this.request<OpdQueueItem[]>(`/api/v1/clinical/queue${query}`);
  }

  public async getTriageQueue(status?: string): Promise<OpdQueueItem[]> {
    return this.getFacilityQueue(status);
  }

  public async recordVitals(data: VitalsInput): Promise<VitalsResult> {
    return this.request<VitalsResult>("/api/v1/clinical/vitals", {
      method: "POST",
      body: JSON.stringify({
        patient_account_id: data.patient_account_id || data.hospital_card_id || "",
        ...data,
      }),
    });
  }

  public async createSOAPConsultation(data: SOAPConsultationInput): Promise<any> {
    return this.request<any>("/api/v1/clinical/consultations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async createConsultation(data: any): Promise<any> {
    return this.createSOAPConsultation(data);
  }

  public async getPatientHistory(patientId: string): Promise<PatientHistory> {
    return this.request<PatientHistory>(`/api/v1/patients/${patientId}/history`);
  }

  public async searchICD10(query: string): Promise<ICD10Item[]> {
    return this.request<ICD10Item[]>(`/api/v1/clinical/icd10/search?q=${encodeURIComponent(query)}`);
  }

  public async mintPrescription(data: PrescriptionMintInput): Promise<any> {
    return this.request<any>("/api/v1/clinical/prescriptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getPrintablePrescription(prescriptionId: string): Promise<PrescriptionPrintData> {
    return this.request<PrescriptionPrintData>(`/api/v1/clinical/prescriptions/${prescriptionId}/print`);
  }

  public async getPrescriptions(filters?: { status?: PrescriptionStatus }): Promise<Prescription[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<Prescription[]>(`/api/v1/prescriptions${query}`);
  }

  public async getPatients(search?: string): Promise<PatientAccount[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<PatientAccount[]>(`/api/v1/patients${query}`);
  }

  // ================= Health & Tenants =================

  public async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>("/api/v1/health");
  }

  public async getTenants(type?: string): Promise<Tenant[]> {
    const query = type ? `?tenant_type=${type}` : "";
    return this.request<Tenant[]>(`/api/v1/tenants${query}`);
  }

  public async verifyPrescription(
    accessCodeOrHash: string
  ): Promise<Prescription> {
    return this.request<Prescription>("/api/v1/prescriptions/verify", {
      method: "POST",
      body: JSON.stringify({ token: accessCodeOrHash }),
    });
  }

  public async searchInventory(query: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    search?: string;
  }): Promise<PharmacyInventory[]> {
    const params = new URLSearchParams();
    if (query.lat) params.append("latitude", query.lat.toString());
    if (query.lng) params.append("longitude", query.lng.toString());
    if (query.radiusKm) params.append("radius_km", query.radiusKm.toString());
    if (query.search) params.append("search", query.search);

    return this.request<PharmacyInventory[]>(
      `/api/v1/inventory/search?${params.toString()}`
    );
  }

  public async getConsultations(hospitalCardId?: string): Promise<Consultation[]> {
    const query = hospitalCardId ? `?hospital_card_id=${hospitalCardId}` : "";
    return this.request<Consultation[]>(`/api/v1/consultations${query}`);
  }

  public async getConsultation(consultationId: string): Promise<Consultation> {
    return this.request<Consultation>(`/api/v1/consultations/${consultationId}`);
  }

  public async createEscrowOrder(orderData: Partial<Order>): Promise<Order> {
    return this.request<Order>("/api/v1/orders/escrow", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  // ================= Super Admin Endpoints =================

  public async getAdminOverview(): Promise<AdminOverviewMetrics> {
    return this.request<AdminOverviewMetrics>("/api/v1/admin/analytics/overview");
  }

  public async getPendingTenants(): Promise<PendingFacilityItem[]> {
    return this.request<PendingFacilityItem[]>("/api/v1/admin/tenants/pending");
  }

  public async verifyTenantLicense(payload: VerifyFacilityPayload): Promise<VerifyFacilityResult> {
    return this.request<VerifyFacilityResult>(`/api/v1/admin/tenants/${payload.tenant_id}/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getAdminSettlementBatches(): Promise<BatchSettlementSummary> {
    return this.request<BatchSettlementSummary>("/api/v1/admin/settlements/batches");
  }

  public async executeAdminBatchPayout(payload?: ExecuteBatchPayoutPayload): Promise<BatchPayoutExecutionResult> {
    return this.request<BatchPayoutExecutionResult>("/api/v1/admin/settlements/batch-payout", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  public async getSettlementPayoutHistory(): Promise<SettlementPayoutItem[]> {
    return this.request<SettlementPayoutItem[]>("/api/v1/admin/settlements/payout-history");
  }

  public async getAdminAuditLogs(limit: number = 25): Promise<AdminAuditLogItem[]> {
    return this.request<AdminAuditLogItem[]>(`/api/v1/admin/audit-logs?limit=${limit}`);
  }

  // ================= Profile, Security & Session Revocation =================

  public async logout(): Promise<LogoutResponse> {
    const res = await this.request<LogoutResponse>("/api/v1/auth/logout", {
      method: "POST",
    });
    this.authToken = undefined;
    this.refreshTokenVal = undefined;
    return res;
  }

  public async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
    return this.request<ResetPasswordResponse>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async updateProfile(payload: UpdateProfilePayload): Promise<AuthMe> {
    return this.request<AuthMe>("/api/v1/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getActiveSessions(): Promise<UserSessionItem[]> {
    return this.request<UserSessionItem[]>("/api/v1/auth/sessions");
  }

  public async revokeAllSessions(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/api/v1/auth/sessions/revoke-all", {
      method: "POST",
    });
  }

  // ================= Hospital Facility Admin =================


  public async getHospitalSettings(): Promise<HospitalSettings> {
    return this.request<HospitalSettings>("/api/v1/hospital-admin/settings");
  }

  public async updateHospitalSettings(payload: UpdateHospitalSettingsPayload): Promise<HospitalSettings> {
    return this.request<HospitalSettings>("/api/v1/hospital-admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getHospitalFinances(): Promise<HospitalFinances> {
    return this.request<HospitalFinances>("/api/v1/hospital-admin/finances");
  }

  // ================= Pharmacy Facility Admin =================

  public async getPharmacyStaff(): Promise<PharmacyStaffItem[]> {
    return this.request<PharmacyStaffItem[]>("/api/v1/pharmacy-admin/staff");
  }

  public async invitePharmacyStaff(payload: InvitePharmacyStaffPayload): Promise<PharmacyStaffItem> {
    return this.request<PharmacyStaffItem>("/api/v1/pharmacy-admin/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getPharmacySettings(): Promise<PharmacySettings> {
    return this.request<PharmacySettings>("/api/v1/pharmacy-admin/settings");
  }

  public async updatePharmacySettings(payload: UpdatePharmacySettingsPayload): Promise<PharmacySettings> {
    return this.request<PharmacySettings>("/api/v1/pharmacy-admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // ================= Nurse Clinical Station =================

  public async recordAdvancedVitals(payload: ExtendedVitalsPayload): Promise<ExtendedVitalsResult> {
    return this.request<ExtendedVitalsResult>("/api/v1/nurse/vitals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getMedicationSchedule(patientId: string): Promise<PatientMedicationScheduleResponse> {
    return this.request<PatientMedicationScheduleResponse>(`/api/v1/nurse/patients/${patientId}/medication-schedule`);
  }

  public async administerMedication(payload: MedicationAdministerPayload): Promise<MedicationAdministerResult> {
    return this.request<MedicationAdministerResult>("/api/v1/nurse/medications/administer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getWardBedMap(): Promise<WardBedGridResponse> {
    return this.request<WardBedGridResponse>("/api/v1/nurse/wards");
  }

  public async assignWardBed(payload: AssignBedPayload): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>("/api/v1/nurse/wards/assign-bed", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async recordFluidBalance(payload: FluidBalanceLogPayload): Promise<PatientFluidBalanceSummary> {
    return this.request<PatientFluidBalanceSummary>("/api/v1/nurse/fluid-balance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getFluidBalance(patientId: string): Promise<PatientFluidBalanceSummary> {
    return this.request<PatientFluidBalanceSummary>(`/api/v1/nurse/patients/${patientId}/fluid-balance`);
  }

  public async createSBARHandover(payload: SBARHandoverPayload): Promise<SBARHandoverItem> {
    return this.request<SBARHandoverItem>("/api/v1/nurse/handover", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getSBARHandovers(wardName?: string): Promise<SBARHandoverItem[]> {
    const endpoint = wardName ? `/api/v1/nurse/handover?ward_name=${encodeURIComponent(wardName)}` : "/api/v1/nurse/handover";
    return this.request<SBARHandoverItem[]>(endpoint);
  }

  public async acknowledgeHandover(handoverId: string, payload: AcknowledgeHandoverPayload): Promise<SBARHandoverItem> {
    return this.request<SBARHandoverItem>(`/api/v1/nurse/handover/${handoverId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // 

  // ================= Nurse Station � Live Portal Endpoints =================

  public async getActiveCriticalAlerts(): Promise<CriticalAlertItem[]> {
    try {
      const orders = await this.getStatNursingOrders("PENDING");
      return orders.map((o) => ({
        alert_id: o.id,
        severity: (o.urgency === "STAT" ? "RESUSCITATION" : o.urgency === "URGENT" ? "CRITICAL" : "WARNING") as CriticalAlertItem["severity"],
        title: (o.instruction || "STAT Nursing Order").slice(0, 120),
        message: o.instruction || "",
        patient_id: o.patient_id,
        patient_name: o.patient_name,
        mrn: o.mrn,
        attending_staff: o.doctor_name,
        created_at: o.issued_at,
        acknowledged: o.status === "EXECUTED",
      }));
    } catch (_err) {
      return [];
    }
  }

  public async getDueMedications(): Promise<DueMedicationItem[]> {
    try {
      const grid = await this.getWardBedMap();
      const occupied = (grid.wards || []).flatMap((w) => (w.beds || []).filter((b) => b.is_occupied));
      const results: DueMedicationItem[] = [];
      for (const b of occupied) {
        const pid = b.patient_id;
        if (!pid) continue;
        try {
          const sched = await this.request<any>(
            `/api/v1/nurse/patients/${encodeURIComponent(pid)}/medication-schedule`
          );
          (sched?.schedule || []).forEach((m: any) => {
            if (!m || m.status === "GIVEN") return;
            results.push({
              medication_id: String(m.medication_id || m.id || Math.random().toString(36).slice(2)),
              prescription_id: String(m.prescription_id || ""),
              patient_id: pid,
              patient_name: sched?.patient_name || b.patient_name || "",
              bed_id: b.bed_id,
              medication_name: String(m.medication_name || "Medication"),
              dosage: String(m.dosage || ""),
              route: String(m.route || ""),
              scheduled_time: String(m.scheduled_time || ""),
              frequency: String(m.frequency || ""),
              status: String(m.status || "DUE") as DueMedicationItem["status"],
              special_instructions: m.special_instructions ? String(m.special_instructions) : undefined,
            });
          });
        } catch (_e) { /* per-patient 404 is okay */ }
      }
      return results;
    } catch (_err) {
      return [];
    }
  }

  public async getWardOccupancy(): Promise<WardOccupancySnapshot> {
    try {
      const grid = await this.getWardBedMap();
      const total = Number(grid.total_facility_beds || 0);
      const occupied = Number(grid.occupied_beds || 0);
      const vacant = Math.max(0, total - occupied);
      const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
      const ward_breakdown = (grid.wards || []).map((w: any) => {
        const wt = Number(w.total_beds || 0);
        const wo = Number(w.occupied_beds || 0);
        return {
          ward_id: String(w.ward_id || ""),
          ward_name: String(w.ward_name || ""),
          occupied: wo,
          total: wt,
          rate_percent: wt > 0 ? Math.round((wo / wt) * 100) : 0,
        };
      });
      return { total_beds: total, occupied_beds: occupied, vacant_beds: vacant, occupancy_rate_percent: rate, ward_breakdown };
    } catch {
      return {
        total_beds: 30,
        occupied_beds: 0,
        vacant_beds: 30,
        occupancy_rate_percent: 0,
        ward_breakdown: [],
      };
    }
  }

  public async getPendingTriageIntakes(): Promise<PendingTriageItem[]> {
    const items = await this.request<any[]>("/api/v1/hospital/nurse/triage");
    if (!Array.isArray(items)) return [];
    return items.map((p: any) => ({
      queue_id: String(p.queue_id || p.id || ""),
      queue_number: String(p.queue_number || ""),
      patient_id: String(p.patient_id || ""),
      hospital_card_id: String(p.hospital_card_id || ""),
      patient_name: String(p.patient_name || "Patient"),
      age: typeof p.age === "number" ? p.age : undefined,
      gender: p.gender ? String(p.gender) : undefined,
      mrn: String(p.mrn || ""),
      chief_complaint: p.chief_complaint ? String(p.chief_complaint) : undefined,
      checked_in_at: String(p.checked_in_at || new Date().toISOString()),
      triage_priority: (p.triage_priority || p.priority) as PendingTriageItem["triage_priority"],
      has_vitals: Boolean(p.has_vitals || p.vitals_recorded || false),
      temperature: typeof p.temperature === "number" ? p.temperature : undefined,
      blood_pressure: (p.blood_pressure || (p.systolic_bp ? `${p.systolic_bp}/${p.diastolic_bp}` : undefined)) as PendingTriageItem["blood_pressure"],
      heart_rate: typeof p.heart_rate === "number" ? p.heart_rate : undefined,
      spo2: typeof p.spo2 === "number" ? p.spo2 : undefined,
      ghana_card_number: p.ghana_card_number ? String(p.ghana_card_number) : undefined,
    }));
  }

  public async createTriageEncounter(payload: TriageEncounterPayload): Promise<TriageEncounter> {
    const p = payload;
    const sbp = Number(p.systolic_bp ?? 0);
    const hr = Number(p.heart_rate_bpm ?? 0);
    const rr = Number(p.respiratory_rate_bpm ?? 0);
    const t = Number(p.temperature_c ?? 37);
    const sp = Number(p.oxygen_saturation_percent ?? 98);
    let mews = 0;
    if (rr <= 8) mews += 2; else if (rr >= 15 && rr <= 20) mews += 1; else if (rr >= 21 && rr <= 29) mews += 2; else if (rr >= 30) mews += 3;
    if (hr <= 40) mews += 2; else if (hr >= 41 && hr <= 50) mews += 1; else if (hr >= 101 && hr <= 110) mews += 1; else if (hr >= 111 && hr <= 129) mews += 2; else if (hr >= 130) mews += 3;
    if (sbp && sbp <= 70) mews += 3; else if (sbp >= 71 && sbp <= 80) mews += 2; else if (sbp >= 81 && sbp <= 100) mews += 1; else if (sbp >= 200) mews += 2;
    if (t < 35) mews += 2; else if (t >= 38.5) mews += 2;
    if (sp < 92) mews += 3; else if (sp >= 92 && sp <= 93) mews += 2; else if (sp >= 94 && sp <= 95) mews += 1;
    let esi: 1|2|3|4|5 = 5;
    if ((p.avpu === "UNRESPONSIVE") || (p.avpu === "PAIN") || sp < 85 || (sbp && sbp < 70) || hr > 150) esi = 1;
    else if ((p.pain_score ?? 0) >= 8 || sp < 92 || t >= 39.5 || Number(p.blood_glucose_mmol_l ?? 5) < 3.5 || Number(p.blood_glucose_mmol_l ?? 5) > 20 || (p.avpu === "VOICE") || mews >= 5) esi = 2;
    else if ((p.pain_score ?? 0) >= 5 || hr > 100 || hr < 55 || t >= 38 || (sbp && sbp >= 140) || (sbp && sbp <= 95) || mews >= 3) esi = 3;
    else if ((p.pain_score ?? 0) > 0 || t > 37.3) esi = 4;
    const triage_category = esi === 1 ? "RED" : esi === 2 ? "ORANGE" : esi === 3 ? "YELLOW" : "GREEN";
    const body: any = {
      ...p,
      mews_score: p.mews_score ?? mews,
      esi_level: (p.esi_level as any) ?? esi,
      triage_category: (p.triage_category as any) ?? triage_category,
    };
    const res = await this.request<any>("/api/v1/hospital/nurse/triage", { method: "POST", body: JSON.stringify(body) });
    return {
      encounter_id: String(res?.encounter_id || res?.id || `triage-${Date.now()}`),
      patient_id: p.patient_id || p.hospital_card_id || "",
      recorded_at: String(res?.recorded_at || res?.created_at || new Date().toISOString()),
      recorded_by_nurse: String(res?.recorded_by_nurse || res?.recorded_by || ""),
      mews_score: typeof res?.mews_score === "number" ? res.mews_score : mews,
      esi_level: (res?.esi_level as any) || esi,
      triage_category: (res?.triage_category as any) || triage_category,
      is_critical: esi <= 2,
      critical_alert_message: esi <= 2 ? "High acuity triage encounter. Escalate to senior clinician immediately." : undefined,
    };
  }

  public async getFacilityBeds(): Promise<FacilityBedItem[]> {
    const tryPrimary = async (): Promise<any[] | null> => {
      try {
        const res = await this.request<any>("/api/v1/facilities/beds");
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.beds)) return res.beds;
        return null;
      } catch { return null; }
    };
    const mapBed = (b: any, w: any = null): FacilityBedItem => ({
      bed_id: String(b.bed_id || b.id || ""),
      bed_number: String(b.bed_number || b.number || ""),
      ward_id: String(b.ward_id || w?.ward_id || ""),
      ward_name: String(b.ward_name || w?.ward_name || ""),
      is_occupied: Boolean(b.is_occupied || false),
      patient_id: b.patient_id ? String(b.patient_id) : undefined,
      patient_name: b.patient_name ? String(b.patient_name) : undefined,
      gender: b.gender ? String(b.gender) : undefined,
      age: typeof b.age === "number" ? b.age : undefined,
      ghana_card: b.ghana_card ? String(b.ghana_card) : undefined,
      diagnosis: b.diagnosis ? String(b.diagnosis) : undefined,
      allergies: Array.isArray(b.allergies) ? b.allergies.map(String) : undefined,
      oxygen_flow_rate: b.oxygen_flow_rate ? String(b.oxygen_flow_rate) : undefined,
      current_iv_fluids: b.current_iv_fluids ? String(b.current_iv_fluids) : undefined,
      attending_physician: b.attending_physician ? String(b.attending_physician) : undefined,
      admitted_at: b.admitted_at ? String(b.admitted_at) : undefined,
    });
    const beds = await tryPrimary();
    if (Array.isArray(beds) && beds.length > 0) return beds.map((b) => mapBed(b));
    const grid = await this.getWardBedMap();
    const flat: FacilityBedItem[] = [];
    (grid.wards || []).forEach((w: any) => (w.beds || []).forEach((b: any) => flat.push(mapBed(b, w))));
    return flat;
  }

  // 

  public async getReceptionQueue(department?: string): Promise<ActiveQueueItem[]> {
    const q = department ? `?department=` + encodeURIComponent(department) : "";
    return this.request<ActiveQueueItem[]>(`/api/v1/reception/queue/active` + q);
  }

  public async getLatestHandover(wardName?: string): Promise<SBARHandoverItem | null> {
    try {
      const q = wardName ? `?ward_name=` + encodeURIComponent(wardName) : "";
      const list = await this.request<SBARHandoverItem[]>(`/api/v1/nurse/handover` + q);
      if (!Array.isArray(list) || list.length === 0) return null;
      const sorted = [...list].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      return sorted[0] || null;
    } catch {
      return null;
    }
  }

  public async getWardBedsSummary(): Promise<WardBedsSummary> {
    try {
      return await this.request<WardBedsSummary>("/api/v1/nurse/wards/beds-summary");
    } catch {
      try {
        const wards = await this.getWardBedMap();
        let total = 0;
        let allocated = 0;
        const perWard: WardBedsSummarySnapshot[] = (wards.wards || []).map((w) => {
          const beds = (w.beds || []);
          const wTotal = beds.length;
          const wAlloc = beds.filter((b) => !!b.is_occupied || !!b.patient_id).length;
          total += wTotal;
          allocated += wAlloc;
          return {
            ward_name: w.ward_name || (w as any).ward || "",
            ward_id: w.ward_id || "",
            total_beds: wTotal,
            beds_allocated: wAlloc,
            beds_vacant: wTotal - wAlloc,
            occupancy_percent: wTotal === 0 ? 0 : Math.round((wAlloc / wTotal) * 1000) / 10,
          };
        });
        return {
          facility_total_beds: total,
          facility_beds_allocated: allocated,
          facility_beds_vacant: total - allocated,
          facility_occupancy_percent: total === 0 ? 0 : Math.round((allocated / total) * 1000) / 10,
          wards: perWard,
        };
      } catch {
        return {
          facility_total_beds: 0,
          facility_beds_allocated: 0,
          facility_beds_vacant: 0,
          facility_occupancy_percent: 0,
          wards: [],
        };
      }
    }
  }
  // ================== Doctor Workstation & CPOE =================


  public async getPatientAllergies(patientId: string): Promise<PatientAllergyItem[]> {
    return this.request<PatientAllergyItem[]>(`/api/v1/patients/${patientId}/allergies`);
  }

  public async addPatientAllergy(patientId: string, payload: PatientAllergyPayload): Promise<PatientAllergyItem> {
    return this.request<PatientAllergyItem>(`/api/v1/patients/${patientId}/allergies`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async validatePrescriptionSafety(payload: PrescriptionSafetyCheckPayload): Promise<PrescriptionSafetyCheckResult> {
    return this.request<PrescriptionSafetyCheckResult>("/api/v1/clinical/prescriptions/validate-safety", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async orderDiagnosticTests(payload: CPOEDiagnosticOrderPayload): Promise<CPOEDiagnosticOrderResult> {
    return this.request<CPOEDiagnosticOrderResult>("/api/v1/clinical/diagnostics/order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getDiagnosticHistory(patientId: string): Promise<PatientDiagnosticHistoryResult> {
    return this.request<PatientDiagnosticHistoryResult>(`/api/v1/clinical/diagnostics/patient/${patientId}`);
  }

  public async orderWardAdmission(payload: InpatientAdmissionOrderPayload): Promise<InpatientAdmissionOrderResult> {
    return this.request<InpatientAdmissionOrderResult>("/api/v1/clinical/admissions/order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async createReferralLetter(payload: SpecialistReferralPayload): Promise<SpecialistReferralResult> {
    return this.request<SpecialistReferralResult>("/api/v1/clinical/referrals/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ================= Hospital Revenue Cycle & Finance =================

  public async getPendingPatientCharges(patientId: string): Promise<PatientPendingChargesResponse> {
    return this.request<PatientPendingChargesResponse>(`/api/v1/hospital-finance/patients/${patientId}/pending-charges`);
  }

  public async generatePatientInvoice(payload: InvoiceGenerateRequest): Promise<PatientInvoiceResponse> {
    return this.request<PatientInvoiceResponse>("/api/v1/hospital-finance/invoices/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async settleInvoice(payload: InvoicePaymentRequest): Promise<InvoicePaymentResponse> {
    return this.request<InvoicePaymentResponse>("/api/v1/hospital-finance/invoices/pay", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async openCashierShift(payload: OpenShiftRequest): Promise<CashierShiftResponse> {
    return this.request<CashierShiftResponse>("/api/v1/hospital-finance/shifts/open", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getCurrentShift(workstationId?: string): Promise<CashierShiftResponse> {
    const endpoint = workstationId
      ? `/api/v1/hospital-finance/shifts/current?workstation_id=${encodeURIComponent(workstationId)}`
      : "/api/v1/hospital-finance/shifts/current";
    return this.request<CashierShiftResponse>(endpoint);
  }

  public async closeCashierShift(payload: CloseShiftRequest, workstationId?: string): Promise<CloseShiftResponse> {
    const endpoint = workstationId
      ? `/api/v1/hospital-finance/shifts/close?workstation_id=${encodeURIComponent(workstationId)}`
      : "/api/v1/hospital-finance/shifts/close";
    return this.request<CloseShiftResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getInsuranceClaims(claimStatus?: ClaimStatus): Promise<InsuranceClaimItem[]> {
    const endpoint = claimStatus
      ? `/api/v1/hospital-finance/claims?claim_status=${encodeURIComponent(claimStatus)}`
      : "/api/v1/hospital-finance/claims";
    return this.request<InsuranceClaimItem[]>(endpoint);
  }

  public async createClaimBatch(payload: ClaimBatchCreateRequest): Promise<ClaimBatchResponse> {
    return this.request<ClaimBatchResponse>("/api/v1/hospital-finance/claims/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getHospitalRevenueAnalytics(period?: string): Promise<HospitalRevenueAnalyticsResponse> {
    const endpoint = period
      ? `/api/v1/hospital-finance/analytics/revenue?period=${encodeURIComponent(period)}`
      : "/api/v1/hospital-finance/analytics/revenue";
    return this.request<HospitalRevenueAnalyticsResponse>(endpoint);
  }

  public async getHospitalFinancialSummary(period?: string): Promise<HospitalRevenueAnalyticsResponse> {
    return this.getHospitalRevenueAnalytics(period);
  }

  public async getCashierShifts(): Promise<{
    active: CashierShiftResponse | null;
    history: CashierShiftAuditItem[];
  }> {
    try {
      const [active, history] = await Promise.all([
        (async () => {
          try {
            return await this.getCurrentShift();
          } catch {
            return null;
          }
        })(),
        (async () => {
          try {
            return await this.getCashierShiftsAudit();
          } catch {
            return [];
          }
        })(),
      ]);
      return { active, history };
    } catch {
      return { active: null, history: [] };
    }
  }

  public async getUnpaidFolios(): Promise<UnpaidFolioItem[]> {
    try {
      const audit = await this.getCashierShiftsAudit();
      return audit.map((s) => ({
        folio_id: s.shift_id,
        patient_name: s.cashier_name,
        cashier_name: s.cashier_name,
        total_amount: s.total_revenue,
        outstanding: s.discrepancy_amount,
        status:
          s.discrepancy_type === "BALANCED"
            ? ("SETTLED" as const)
            : s.discrepancy_type === "OVERAGE"
            ? ("OVERPAID" as const)
            : s.discrepancy_type === "SHORTAGE"
            ? ("UNPAID" as const)
            : ("PENDING" as const),
        created_at: s.opened_at,
        updated_at: s.closed_at,
      }));
    } catch {
      return [];
    }
  }

  public async getClaimBatches(): Promise<ClaimBatchResponse[]> {
    try {
      const allClaims = await this.getInsuranceClaims();
      const grouped = new Map<string, InsuranceClaimItem[]>();
      for (const c of allClaims) {
        const key = c.claim_batch_id || "UNGROUPED";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(c);
      }
      const batches: ClaimBatchResponse[] = [];
      let idx = 0;
      const entriesArr = Array.from(grouped.entries());
      for (const [batch_id, items] of entriesArr) {
        const total_claimed_amount = items.reduce((acc: number, c: InsuranceClaimItem) => acc + (c.claimed_amount || 0), 0);
        batches.push({
          batch_id,
          provider_name: items[0]?.patient_name?.split(" ")[0] || "Medipaedia Hospital",
          total_claims: items.length,
          total_claimed_amount,
          status: idx === 0 ? "SUBMITTED" : idx === 1 ? "ADJUDICATING" : "DRAFT",
          created_at: items[0]?.submitted_date || new Date().toISOString(),
        });
        idx++;
      }
      if (batches.length === 0) {
        batches.push({
          batch_id: "NHIS-BATCH-DEFAULT",
          provider_name: "Medipaedia Hospital",
          total_claims: 0,
          total_claimed_amount: 0,
          status: "DRAFT",
          created_at: new Date().toISOString(),
        });
      }
      return batches;
    } catch {
      return [];
    }
  }

  // ================= Hospital Facility Governance & Admin =================

  public async getHospitalStaff(role?: string, department?: string): Promise<StaffMemberResponse[]> {
    const query = new URLSearchParams();
    if (role) query.append("role", role);
    if (department) query.append("department", department);
    const qs = query.toString();
    return this.request<StaffMemberResponse[]>(`/api/v1/hospital-admin/staff${qs ? `?${qs}` : ""}`);
  }

  public async inviteHospitalStaff(payload: StaffInviteRequest): Promise<StaffMemberResponse> {
    return this.request<StaffMemberResponse>("/api/v1/hospital-admin/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async updateStaffCredentials(staffId: string, payload: StaffCredentialUpdateRequest): Promise<StaffMemberResponse> {
    return this.request<StaffMemberResponse>(`/api/v1/hospital-admin/staff/${staffId}/credentials`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getShiftRoster(department?: string, shiftDate?: string): Promise<ShiftRosterItem[]> {
    const query = new URLSearchParams();
    if (department) query.append("department", department);
    if (shiftDate) query.append("shift_date", shiftDate);
    const qs = query.toString();
    return this.request<ShiftRosterItem[]>(`/api/v1/hospital-admin/roster${qs ? `?${qs}` : ""}`);
  }

  public async createShiftRoster(payload: CreateShiftRosterRequest): Promise<ShiftRosterItem> {
    return this.request<ShiftRosterItem>("/api/v1/hospital-admin/roster", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getFacilityDepartments(): Promise<DepartmentCapacityItem[]> {
    return this.request<DepartmentCapacityItem[]>("/api/v1/hospital-admin/departments");
  }

  public async updateDepartmentBeds(departmentId: string, payload: UpdateDepartmentBedsRequest): Promise<DepartmentCapacityItem> {
    return this.request<DepartmentCapacityItem>(`/api/v1/hospital-admin/departments/${departmentId}/beds`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getOperatingTheatres(): Promise<OperatingTheatreItem[]> {
    return this.request<OperatingTheatreItem[]>("/api/v1/hospital-admin/theatres");
  }

  public async updateOperatingTheatre(theatreId: string, payload: TheatreStatusUpdateRequest): Promise<OperatingTheatreItem> {
    return this.request<OperatingTheatreItem>(`/api/v1/hospital-admin/theatres/${theatreId}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getHospitalTariffs(): Promise<HospitalTariffConfig> {
    return this.request<HospitalTariffConfig>("/api/v1/hospital-admin/tariffs");
  }

  public async updateHospitalTariffs(payload: UpdateHospitalTariffRequest): Promise<HospitalTariffConfig> {
    return this.request<HospitalTariffConfig>("/api/v1/hospital-admin/tariffs", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getThroughputAnalytics(): Promise<ThroughputAnalyticsResponse> {
    return this.request<ThroughputAnalyticsResponse>("/api/v1/hospital-admin/analytics/throughput");
  }

  public async getClinicalIncidents(severity?: IncidentSeverity): Promise<ClinicalIncidentItem[]> {
    const endpoint = severity
      ? `/api/v1/hospital-admin/incidents?severity=${encodeURIComponent(severity)}`
      : "/api/v1/hospital-admin/incidents";
    return this.request<ClinicalIncidentItem[]>(endpoint);
  }

  public async logClinicalIncident(payload: ClinicalIncidentCreateRequest): Promise<ClinicalIncidentItem> {
    return this.request<ClinicalIncidentItem>("/api/v1/hospital-admin/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ================= Patient Personal Health Record (PHR) & Care =================

  public async getEmergencyProfile(): Promise<EmergencyICEProfile> {
    return this.request<EmergencyICEProfile>("/api/v1/patient/emergency-profile");
  }

  public async updateEmergencyProfile(payload: EmergencyICEUpdateRequest): Promise<EmergencyICEProfile> {
    return this.request<EmergencyICEProfile>("/api/v1/patient/emergency-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  public async getPublicICE(token: string): Promise<PublicICEResponse> {
    return this.request<PublicICEResponse>(`/api/v1/patient/public-ice/${encodeURIComponent(token)}`);
  }

  public async getPatientDiagnostics(category?: string): Promise<DiagnosticReportItem[]> {
    const endpoint = category
      ? `/api/v1/patient/diagnostics?category=${encodeURIComponent(category)}`
      : "/api/v1/patient/diagnostics";
    return this.request<DiagnosticReportItem[]>(endpoint);
  }

  public async getPatientVitalsHistory(): Promise<VitalsLogItem[]> {
    return this.request<VitalsLogItem[]>("/api/v1/patient/vitals-log");
  }

  public async logPatientVitals(payload: VitalsLogCreateRequest): Promise<VitalsLogItem> {
    return this.request<VitalsLogItem>("/api/v1/patient/vitals-log", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getAppointments(params?: { date?: string }): Promise<PatientAppointmentItem[]> {
    const qs: string[] = [];
    if (params?.date) qs.push("date=" + encodeURIComponent(params.date));
    const url = "/api/v1/reception/appointments" + (qs.length ? "?" + qs.join("&") : "");
    return this.request<PatientAppointmentItem[]>(url);
  }

  public async getPatientAppointments(): Promise<PatientAppointmentItemV2[]> {
    type ListShape = ListPatientAppointmentsResponse | PatientAppointmentItemV2[] | any;
    const res = await this.request<ListShape>("/api/v1/patient/appointments", {
      method: "GET",
    });
    if (Array.isArray(res)) return res as PatientAppointmentItemV2[];
    if (res && Array.isArray((res as ListPatientAppointmentsResponse).items))
      return (res as ListPatientAppointmentsResponse).items;
    if (res && (res as any).data && Array.isArray((res as any).data)) return (res as any).data;
    return [];
  }

  public async createPatientAppointment(
    data: CreatePatientAppointmentRequest
  ): Promise<CreatePatientAppointmentResponse> {
    return this.request<CreatePatientAppointmentResponse>("/api/v1/patient/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async bookAppointment(payload: BookAppointmentRequest): Promise<PatientAppointmentItem> {
    return this.request<PatientAppointmentItem>("/api/v1/patient/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async preCheckinAppointment(payload: PreCheckinRequest): Promise<PatientAppointmentItem> {
    return this.request<PatientAppointmentItem>("/api/v1/patient/appointments/pre-checkin", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getDependents(): Promise<DependentProfileItem[]> {
    return this.request<DependentProfileItem[]>("/api/v1/patient/dependents");
  }

  public async addDependent(payload: AddDependentRequest): Promise<DependentProfileItem> {
    return this.request<DependentProfileItem>("/api/v1/patient/dependents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getAdherenceSchedule(): Promise<AdherenceScheduleItem[]> {
    return this.request<AdherenceScheduleItem[]>("/api/v1/patient/adherence");
  }

  public async logDoseTaken(payload: LogDoseTakenRequest): Promise<AdherenceScheduleItem> {
    return this.request<AdherenceScheduleItem>("/api/v1/patient/adherence/dose", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getPatientWallet(): Promise<PatientWalletResponse> {
    return this.request<PatientWalletResponse>("/api/v1/patient/wallet");
  }

  public async topupWallet(payload: WalletTopupRequest): Promise<WalletTopupResponse> {
    return this.request<WalletTopupResponse>("/api/v1/patient/wallet/topup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ================= Pharmacist Operations & Clinical POS =================

  public async checkPrescriptionSafety(payload: PrescriptionSafetyCheckRequest): Promise<PrescriptionSafetyCheckResponse> {
    return this.request<PrescriptionSafetyCheckResponse>("/api/v1/pharmacy/prescriptions/safety-check", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getGenericSubstitutes(query: string): Promise<GenericSubstituteItem[]> {
    return this.request<GenericSubstituteItem[]>(`/api/v1/pharmacy/inventory/substitutes?query=${encodeURIComponent(query)}`);
  }

  public async dispenseFEFOPrescription(payload: FEFODispenseRequest): Promise<FEFODispenseResponse> {
    return this.request<FEFODispenseResponse>("/api/v1/pharmacy/prescriptions/dispense-fefo", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getPrintableRxLabel(dispensedItemId: string): Promise<PrintableRxLabelItem> {
    return this.request<PrintableRxLabelItem>(`/api/v1/pharmacy/labels/${encodeURIComponent(dispensedItemId)}`);
  }

  public async logControlledDrugDispensation(payload: ControlledDrugLogRequest): Promise<ControlledDrugRegisterItem> {
    return this.request<ControlledDrugRegisterItem>("/api/v1/pharmacy/controlled-drugs/log", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getControlledDrugRegister(): Promise<ControlledDrugRegisterItem[]> {
    return this.request<ControlledDrugRegisterItem[]>("/api/v1/pharmacy/controlled-drugs/register");
  }

  public async getFulfillmentOrders(stage?: FulfillmentStage): Promise<FulfillmentOrderItem[]> {
    const endpoint = stage
      ? `/api/v1/pharmacy/fulfillment/orders?stage=${encodeURIComponent(stage)}`
      : "/api/v1/pharmacy/fulfillment/orders";
    return this.request<FulfillmentOrderItem[]>(endpoint);
  }

  public async packFulfillmentOrder(payload: PackOrderRequest): Promise<FulfillmentOrderItem> {
    return this.request<FulfillmentOrderItem>("/api/v1/pharmacy/fulfillment/pack", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async handoverFulfillmentOrder(payload: HandoverOrderRequest): Promise<HandoverOrderResponse> {
    return this.request<HandoverOrderResponse>("/api/v1/pharmacy/fulfillment/handover", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ================= Superintendent Regulatory & Compliance =================

  public async getDangerousDrugsRegister(): Promise<NarcoticsRegisterItem[]> {
    return this.request<NarcoticsRegisterItem[]>("/api/v1/superintendent/narcotics/register");
  }

  public async authorizeNarcoticDispense(payload: AuthorizeNarcoticsRequest): Promise<NarcoticsRegisterItem> {
    return this.request<NarcoticsRegisterItem>("/api/v1/superintendent/narcotics/authorize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async exportDangerousDrugsReport(format: string = "PDF"): Promise<NarcoticsExportResponse> {
    return this.request<NarcoticsExportResponse>(`/api/v1/superintendent/narcotics/export?export_format=${encodeURIComponent(format)}`);
  }

  public async freezeBatchQuarantine(payload: FreezeBatchRequest): Promise<QuarantinedBatchItem> {
    return this.request<QuarantinedBatchItem>("/api/v1/superintendent/quarantine/freeze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getQuarantinedBatches(): Promise<QuarantinedBatchItem[]> {
    return this.request<QuarantinedBatchItem[]>("/api/v1/superintendent/quarantine/active");
  }

  public async resolveQuarantinedBatch(payload: ResolveQuarantineRequest): Promise<QuarantinedBatchItem> {
    return this.request<QuarantinedBatchItem>("/api/v1/superintendent/quarantine/resolve", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getColdChainLogs(): Promise<ColdChainLogItem[]> {
    return this.request<ColdChainLogItem[]>("/api/v1/superintendent/cold-chain/logs");
  }

  public async logColdChainTemperature(payload: LogTemperatureRequest): Promise<ColdChainLogItem> {
    return this.request<ColdChainLogItem>("/api/v1/superintendent/cold-chain/logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getADRReports(): Promise<ADRReportItem[]> {
    return this.request<ADRReportItem[]>("/api/v1/superintendent/pharmacovigilance/adr");
  }

  public async fileADRReport(payload: FileADRRequest): Promise<ADRReportItem> {
    return this.request<ADRReportItem>("/api/v1/superintendent/pharmacovigilance/adr", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getCompoundingLogs(): Promise<CompoundingLogItem[]> {
    return this.request<CompoundingLogItem[]>("/api/v1/superintendent/compounding");
  }

  public async recordCompoundingLog(payload: CompoundingLogItem): Promise<CompoundingLogItem> {
    return this.request<CompoundingLogItem>("/api/v1/superintendent/compounding", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ================= Hospital Record Clerk & Reception Desk Module =================

  public async searchPatientsMaster(query: string): Promise<PatientMasterSearchResult[]> {
    return this.request<PatientMasterSearchResult[]>(
      `/api/v1/reception/patients/search?q=${encodeURIComponent(query)}`
    );
  }

  public async registerNewPatient(
    data: ReceptionPatientRegisterInput
  ): Promise<ReceptionPatientRegisterResult> {
    return this.request<ReceptionPatientRegisterResult>("/api/v1/reception/patients/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async createEmergencyTraumaIntake(
    data: EmergencyTraumaIntakeInput
  ): Promise<EmergencyTraumaIntakeResult> {
    return this.request<EmergencyTraumaIntakeResult>(
      "/api/v1/reception/patients/emergency-trauma",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  public async mergePatientRecords(
    data: MergePatientRecordsInput
  ): Promise<MergePatientRecordsResult> {
    return this.request<MergePatientRecordsResult>("/api/v1/reception/patients/merge", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async dispatchQueueTicket(data: QueueDispatchInput): Promise<QueueDispatchResult> {
    return this.request<QueueDispatchResult>("/api/v1/reception/queue/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getActiveQueue(department?: string): Promise<ActiveQueueItem[]> {
    const qs = department ? `?department=${encodeURIComponent(department)}` : "";
    return this.request<ActiveQueueItem[]>(`/api/v1/reception/queue/active${qs}`);
  }

  public async callQueueTicket(queueId: string, consultingRoom?: string): Promise<TVCalledTicket> {
    const qs = consultingRoom ? `?consulting_room=${encodeURIComponent(consultingRoom)}` : "";
    return this.request<TVCalledTicket>(`/api/v1/reception/queue/call?queue_id=${queueId}${qs ? `&${qs.slice(1)}` : ""}`, {
      method: "POST",
    });
  }

  public async getQueueTVStream(): Promise<QueueTVDisplayData> {
    return this.request<QueueTVDisplayData>("/api/v1/reception/queue/tv-display");
  }

  public async getLiveQueueCalling(): Promise<QueueTVDisplayData> {
    return this.getQueueTVStream();
  }

  public async trackFolderTransit(data: FolderTransitInput): Promise<FolderTransitLogResult> {
    return this.request<FolderTransitLogResult>("/api/v1/reception/folders/transit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getFolderTransitLedger(status?: string): Promise<FolderLedgerItem[]> {
    const qs = status ? `?status_filter=${encodeURIComponent(status)}` : "";
    return this.request<FolderLedgerItem[]>(`/api/v1/reception/folders/transit${qs}`);
  }

  public async getWristbandPrint(patientId: string): Promise<WristbandPrintData> {
    return this.request<WristbandPrintData>(`/api/v1/reception/print/wristband/${patientId}`);
  }

  public async getQueueTicketPrint(ticketId: string): Promise<QueueTicketPrintData> {
    return this.request<QueueTicketPrintData>(`/api/v1/reception/print/ticket/${ticketId}`);
  }

  // ================= Pharmacy Admin & Procurement SDK Methods =================

  public async getPharmacyAdminOverview(): Promise<PharmacyAdminOverviewMetrics> {
    return this.request<PharmacyAdminOverviewMetrics>("/api/v1/pharmacy-admin/overview");
  }

  public async getPharmacySuppliers(): Promise<PharmacySupplier[]> {
    return this.request<PharmacySupplier[]>("/api/v1/pharmacy-admin/suppliers");
  }

  public async createSupplier(data: SupplierCreateInput): Promise<PharmacySupplier> {
    return this.request<PharmacySupplier>("/api/v1/pharmacy-admin/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getReorderSuggestions(): Promise<ReorderSuggestionsData> {
    return this.request<ReorderSuggestionsData>("/api/v1/pharmacy-admin/procurement/reorder-suggestions");
  }

  public async getPurchaseOrders(statusFilter?: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    const qs = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
    return this.request<PurchaseOrder[]>(`/api/v1/pharmacy-admin/procurement/po${qs}`);
  }

  public async createPurchaseOrder(data: PurchaseOrderCreateInput): Promise<PurchaseOrder> {
    return this.request<PurchaseOrder>("/api/v1/pharmacy-admin/procurement/po", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async receiveGoodsNote(data: GoodsReceivedNoteInput): Promise<GoodsReceivedNoteResult> {
    return this.request<GoodsReceivedNoteResult>("/api/v1/pharmacy-admin/procurement/grn", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getStockTransfers(): Promise<StockTransfer[]> {
    return this.request<StockTransfer[]>("/api/v1/pharmacy-admin/transfers");
  }

  public async createStockTransfer(data: StockTransferCreateInput): Promise<StockTransfer> {
    return this.request<StockTransfer>("/api/v1/pharmacy-admin/transfers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateStockTransferStatus(
    transferId: string,
    action: "DISPATCH" | "RECEIVE" | "REJECT",
    actorName: string,
    reason?: string
  ): Promise<StockTransfer> {
    return this.request<StockTransfer>(`/api/v1/pharmacy-admin/transfers/${transferId}/action`, {
      method: "POST",
      body: JSON.stringify({
        action,
        actor_name: actorName,
        rejection_reason: reason,
      }),
    });
  }

  public async getPricingRules(): Promise<PricingRulesData> {
    return this.request<PricingRulesData>("/api/v1/pharmacy-admin/pricing-rules");
  }

  public async updatePricingRules(data: UpdatePricingRulesInput): Promise<PricingRulesData> {
    return this.request<PricingRulesData>("/api/v1/pharmacy-admin/pricing-rules", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async applyCategoryMarkup(data: BulkMarkupApplyInput): Promise<BulkMarkupApplyResult> {
    return this.request<BulkMarkupApplyResult>("/api/v1/pharmacy-admin/pricing/apply-markup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getCycleCounts(): Promise<CycleCountAudit[]> {
    return this.request<CycleCountAudit[]>("/api/v1/pharmacy-admin/audits/cycle-count");
  }

  public async submitCycleCount(data: CycleCountSubmitInput): Promise<CycleCountAudit> {
    return this.request<CycleCountAudit>("/api/v1/pharmacy-admin/audits/cycle-count", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getExtendedPharmacySettings(): Promise<ExtendedPharmacySettings> {
    return this.request<ExtendedPharmacySettings>("/api/v1/pharmacy-admin/settings");
  }

  public async updateExtendedPharmacySettings(
    data: UpdateExtendedPharmacySettingsInput
  ): Promise<ExtendedPharmacySettings> {
    return this.request<ExtendedPharmacySettings>("/api/v1/pharmacy-admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Multi-Country West Africa Payments & Subscriptions
  // ==========================================

  public async getSubscriptionPlans(): Promise<SubscriptionPlanItem[]> {
    return this.request<SubscriptionPlanItem[]>("/api/v1/admin/subscriptions/plans");
  }

  public async createOrUpdateSubscriptionPlan(
    data: Partial<SubscriptionPlanItem>
  ): Promise<SubscriptionPlanItem> {
    return this.request<SubscriptionPlanItem>("/api/v1/admin/subscriptions/plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getTenantSubscriptionsMatrix(params?: {
    status?: string;
    country?: string;
  }): Promise<TenantSubscriptionMatrixItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status_filter", params.status);
    if (params?.country) searchParams.set("country_filter", params.country);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<TenantSubscriptionMatrixItem[]>(`/api/v1/admin/subscriptions/matrix${query}`);
  }

  public async collectRecurringSubscriptions(data?: {
    tenant_ids?: string[];
    currency_filter?: string;
    dry_run?: boolean;
  }): Promise<RecurringCollectionResult> {
    return this.request<RecurringCollectionResult>("/api/v1/admin/subscriptions/collect-recurring", {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  public async toggleTenantLockout(tenantId: string, lock: boolean): Promise<any> {
    return this.request<any>(`/api/v1/admin/subscriptions/${tenantId}/lockout-toggle?lock=${lock}`, {
      method: "POST",
    });
  }

  // ==========================================================
  // Super Admin Manage Facility Drawer — Facilities + Staff + Security
  // ==========================================================

  public async patchFacility(
    tenantId: string,
    payload: UpdateFacilityPayload
  ): Promise<UpdateFacilityResult> {
    return this.request<UpdateFacilityResult>(`/api/v1/admin/facilities/${tenantId}`, {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
    });
  }

  public async listFacilityUsers(tenantId: string): Promise<TenantStaffItem[]> {
    return this.request<TenantStaffItem[]>(
      `/api/v1/admin/facilities/${tenantId}/users`
    );
  }

  public async createFacilityUser(
    tenantId: string,
    payload: CreateTenantStaffPayload
  ): Promise<TenantStaffItem> {
    return this.request<TenantStaffItem>(
      `/api/v1/admin/facilities/${tenantId}/users`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  public async generateFacilityUserResetLink(
    tenantId: string,
    userId: string,
    payload?: GenerateResetLinkPayload
  ): Promise<GenerateResetLinkResult> {
    return this.request<GenerateResetLinkResult>(
      `/api/v1/admin/facilities/${tenantId}/users/${userId}/generate-reset-link`,
      {
        method: "POST",
        body: payload ? JSON.stringify(payload) : JSON.stringify({ validity_hours: 24 }),
      }
    );
  }

  public async overrideFacilityUserPassword(
    tenantId: string,
    userId: string,
    payload: OverridePasswordPayload
  ): Promise<OverridePasswordResult> {
    return this.request<OverridePasswordResult>(
      `/api/v1/admin/facilities/${tenantId}/users/${userId}/override-password`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  public async getSmtpConfig(): Promise<SmtpConfigResult | null> {
    return this.request<SmtpConfigResult | null>("/api/v1/admin/smtp", { method: "GET" });
  }

  public async saveSmtpConfig(payload: SmtpConfigPayload): Promise<SmtpConfigResult> {
    return this.request<SmtpConfigResult>("/api/v1/admin/smtp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async testSmtpConnection(payload: SmtpTestPayload): Promise<SmtpTestResult> {
    return this.request<SmtpTestResult>("/api/v1/admin/smtp/test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async initiateMoMoCharge(
    data: MultiCountryMoMoChargeRequest
  ): Promise<MultiCountryMoMoChargeResponse> {
    return this.request<MultiCountryMoMoChargeResponse>("/api/v1/payments/momo/charge", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async checkMoMoStatus(reference: string): Promise<MoMoStatusCheckResponse> {
    return this.request<MoMoStatusCheckResponse>(`/api/v1/payments/momo/status/${reference}`);
  }

  public async executeMoMoDailySweep(data: MoMoSweepRequest): Promise<SettlementPayoutItem> {
    return this.request<SettlementPayoutItem>("/api/v1/payments/payouts/momo-sweep", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async releaseEscrowWithOtp(data: {
    order_id: string;
    verification_code: string;
  }): Promise<ReleaseEscrowResult> {
    return this.request<ReleaseEscrowResult>("/api/v1/payments/escrow/release-with-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Dynamic Subscription Plan Builder & Gateway Engine
  // ==========================================

  public async getCustomSubscriptionPlans(params?: {
    facility_type?: string;
    include_inactive?: boolean;
  }): Promise<SubscriptionPlanDetail[]> {
    const searchParams = new URLSearchParams();
    if (params?.facility_type) searchParams.set("facility_type", params.facility_type);
    if (params?.include_inactive) searchParams.set("include_inactive", "true");
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<SubscriptionPlanDetail[]>(`/api/v1/admin/plans${query}`);
  }

  public async createCustomSubscriptionPlan(
    data: CreateSubscriptionPlanInput
  ): Promise<SubscriptionPlanDetail> {
    return this.request<SubscriptionPlanDetail>("/api/v1/admin/plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateCustomSubscriptionPlan(
    planId: string,
    data: UpdateSubscriptionPlanInput
  ): Promise<SubscriptionPlanDetail> {
    return this.request<SubscriptionPlanDetail>(`/api/v1/admin/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async deleteCustomSubscriptionPlan(planId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/v1/admin/plans/${planId}`, {
      method: "DELETE",
    });
  }

  public async getGatewayConfigs(): Promise<GatewayConfigItem[]> {
    return this.request<GatewayConfigItem[]>("/api/v1/admin/gateways");
  }

  public async updateGatewayConfig(
    gatewayId: string,
    data: UpdateGatewayConfigInput
  ): Promise<GatewayConfigItem> {
    return this.request<GatewayConfigItem>(`/api/v1/admin/gateways/${gatewayId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async testGatewayConnection(gatewayId: string): Promise<TestGatewayConnectionResult> {
    return this.request<TestGatewayConnectionResult>(`/api/v1/admin/gateways/${gatewayId}/test`, {
      method: "POST",
    });
  }

  public async getTenantBillingPolicy(tenantId: string): Promise<TenantBillingPolicyItem> {
    return this.request<TenantBillingPolicyItem>(`/api/v1/admin/billing/tenant-policy/${tenantId}`);
  }

  public async updateTenantBillingPolicy(
    tenantId: string,
    data: UpdateTenantBillingPolicyInput
  ): Promise<TenantBillingPolicyItem> {
    return this.request<TenantBillingPolicyItem>(`/api/v1/admin/billing/tenant-policy/${tenantId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async issueCustomEnterpriseInvoice(
    data: CustomInvoiceInput
  ): Promise<CustomInvoiceResult> {
    return this.request<CustomInvoiceResult>("/api/v1/admin/subscriptions/custom-invoice", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Hospital Facility Billing & Gateway Settings
  // ==========================================

  public async getFacilityGatewayConfig(): Promise<FacilityGatewayConfig> {
    return this.request<FacilityGatewayConfig>("/api/v1/hospital-admin/billing/gateway-config");
  }

  public async updateFacilityGatewayConfig(
    data: UpdateFacilityGatewayConfigInput
  ): Promise<FacilityGatewayConfig> {
    return this.request<FacilityGatewayConfig>("/api/v1/hospital-admin/billing/gateway-config", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async testFacilityPayout(): Promise<TestPayoutPingResult> {
    return this.request<TestPayoutPingResult>("/api/v1/hospital-admin/billing/test-payout", {
      method: "POST",
    });
  }

  public async getHospitalServices(params?: {
    category?: string;
    include_inactive?: boolean;
  }): Promise<HospitalServiceTariffItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.include_inactive) searchParams.set("include_inactive", "true");
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<HospitalServiceTariffItem[]>(`/api/v1/hospital-admin/billing/services${query}`);
  }

  public async createHospitalService(
    data: CreateHospitalServiceTariffInput
  ): Promise<HospitalServiceTariffItem> {
    return this.request<HospitalServiceTariffItem>("/api/v1/hospital-admin/billing/services", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateHospitalService(
    serviceId: string,
    data: UpdateHospitalServiceTariffInput
  ): Promise<HospitalServiceTariffItem> {
    return this.request<HospitalServiceTariffItem>(`/api/v1/hospital-admin/billing/services/${serviceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async deleteHospitalService(serviceId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/v1/hospital-admin/billing/services/${serviceId}`, {
      method: "DELETE",
    });
  }

  public async bulkAdjustTariffs(data: BulkTariffAdjustmentInput): Promise<any> {
    return this.request<any>("/api/v1/hospital-admin/billing/services/bulk-import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getCorporateAccounts(accountType?: string): Promise<CorporateInsuranceAccountItem[]> {
    const query = accountType ? `?account_type=${accountType}` : "";
    return this.request<CorporateInsuranceAccountItem[]>(`/api/v1/hospital-admin/billing/corporate-accounts${query}`);
  }

  public async createCorporateAccount(
    data: CreateCorporateAccountInput
  ): Promise<CorporateInsuranceAccountItem> {
    return this.request<CorporateInsuranceAccountItem>("/api/v1/hospital-admin/billing/corporate-accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateCorporateAccount(
    accountId: string,
    data: UpdateCorporateAccountInput
  ): Promise<CorporateInsuranceAccountItem> {
    return this.request<CorporateInsuranceAccountItem>(`/api/v1/hospital-admin/billing/corporate-accounts/${accountId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async generateCorporateStatement(accountId: string): Promise<StatementOfAccountResult> {
    return this.request<StatementOfAccountResult>(`/api/v1/hospital-admin/billing/corporate-accounts/${accountId}/statement`, {
      method: "POST",
    });
  }

  public async getCashierShiftsAudit(): Promise<CashierShiftAuditItem[]> {
    return this.request<CashierShiftAuditItem[]>("/api/v1/hospital-admin/billing/shifts-audit");
  }

  // ==========================================
  // Pharmacy Admin Billing & Commercial Settings
  // ==========================================

  public async getPharmacyGatewayConfig(): Promise<PharmacyGatewayConfig> {
    return this.request<PharmacyGatewayConfig>("/api/v1/pharmacy-admin/billing/gateway-config");
  }

  public async updatePharmacyGatewayConfig(
    data: UpdatePharmacyGatewayConfigInput
  ): Promise<PharmacyGatewayConfig> {
    return this.request<PharmacyGatewayConfig>("/api/v1/pharmacy-admin/billing/gateway-config", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async testPharmacyPayout(): Promise<TestPharmacyPayoutPingResult> {
    return this.request<TestPharmacyPayoutPingResult>("/api/v1/pharmacy-admin/billing/test-payout", {
      method: "POST",
    });
  }

  public async requestPharmacyInstantPayout(
    data: RequestInstantPayoutInput
  ): Promise<RequestInstantPayoutResult> {
    return this.request<RequestInstantPayoutResult>("/api/v1/pharmacy-admin/billing/request-payout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getPharmacyPricingRules(): Promise<PharmacyPricingRules> {
    return this.request<PharmacyPricingRules>("/api/v1/pharmacy-admin/billing/pricing-rules");
  }

  public async updatePharmacyPricingRules(
    data: UpdatePharmacyPricingRulesInput
  ): Promise<PharmacyPricingRules> {
    return this.request<PharmacyPricingRules>("/api/v1/pharmacy-admin/billing/pricing-rules", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async applyPharmacyBatchPricing(
    data: ApplyBatchPricingInput
  ): Promise<ApplyBatchPricingResult> {
    return this.request<ApplyBatchPricingResult>("/api/v1/pharmacy-admin/billing/pricing-rules/apply-batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getPharmacyCorporateDebtors(accountType?: string): Promise<PharmacyCorporateDebtorItem[]> {
    const query = accountType ? `?account_type=${accountType}` : "";
    return this.request<PharmacyCorporateDebtorItem[]>(`/api/v1/pharmacy-admin/billing/corporate-debtors${query}`);
  }

  public async createPharmacyCorporateDebtor(
    data: CreatePharmacyCorporateDebtorInput
  ): Promise<PharmacyCorporateDebtorItem> {
    return this.request<PharmacyCorporateDebtorItem>("/api/v1/pharmacy-admin/billing/corporate-debtors", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updatePharmacyCorporateDebtor(
    debtorId: string,
    data: UpdatePharmacyCorporateDebtorInput
  ): Promise<PharmacyCorporateDebtorItem> {
    return this.request<PharmacyCorporateDebtorItem>(`/api/v1/pharmacy-admin/billing/corporate-debtors/${debtorId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async recordPharmacyDebtorPayment(
    debtorId: string,
    data: RecordDebtorPaymentInput
  ): Promise<RecordDebtorPaymentResult> {
    return this.request<RecordDebtorPaymentResult>(`/api/v1/pharmacy-admin/billing/corporate-debtors/${debtorId}/payment`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async generatePharmacyDebtorStatement(
    debtorId: string
  ): Promise<PharmacyDebtorStatementResult> {
    return this.request<PharmacyDebtorStatementResult>(`/api/v1/pharmacy-admin/billing/corporate-debtors/${debtorId}/statement`, {
      method: "POST",
    });
  }

  public async getPharmacyShiftsAudit(): Promise<PharmacyCashierShiftAuditItem[]> {
    return this.request<PharmacyCashierShiftAuditItem[]>("/api/v1/pharmacy-admin/billing/shifts-audit");
  }

  // ==========================================
  // Clinical Macros, Diagnostic Trends & Stat Orders
  // ==========================================

  public async getClinicalMacros(specialty?: string): Promise<ClinicalMacro[]> {
    const searchParams = new URLSearchParams();
    if (specialty && specialty !== "ALL") searchParams.set("specialty", specialty);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<ClinicalMacro[]>(`/api/v1/clinical/macros${query}`);
  }

  public async createClinicalMacro(data: CreateClinicalMacroInput): Promise<ClinicalMacro> {
    return this.request<ClinicalMacro>("/api/v1/clinical/macros", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getPatientLongitudinalTrends(patientId: string): Promise<PatientLongitudinalTrends> {
    return this.request<PatientLongitudinalTrends>(`/api/v1/patients/${patientId}/trends`);
  }

  public async createStatNursingOrder(data: CreateStatNursingOrderInput): Promise<StatNursingOrder> {
    return this.request<StatNursingOrder>("/api/v1/clinical/stat-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getStatNursingOrders(statusFilter?: string): Promise<StatNursingOrder[]> {
    const searchParams = new URLSearchParams();
    if (statusFilter && statusFilter !== "ALL") searchParams.set("status_filter", statusFilter);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<StatNursingOrder[]>(`/api/v1/clinical/stat-orders${query}`);
  }

  public async executeStatNursingOrder(
    orderId: string,
    data?: ExecuteStatNursingOrderInput
  ): Promise<StatNursingOrder> {
    return this.request<StatNursingOrder>(`/api/v1/clinical/stat-orders/${orderId}/execute`, {
      method: "PUT",
      body: JSON.stringify(data || { execution_notes: "Administered per doctor protocol" }),
    });
  }

  // ==========================================
  // Infrastructure, DLQ & Tenant Security Audit
  // ==========================================

  public async getGatewayHealthMetrics(): Promise<GatewayHealthResponse> {
    return this.request<GatewayHealthResponse>("/api/v1/admin/infra/gateways/health");
  }

  public async updateGatewayFailover(data: FailoverUpdateRequest): Promise<GatewayHealthMetric> {
    return this.request<GatewayHealthMetric>("/api/v1/admin/infra/gateways/failover", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getWebhookDLQ(params?: {
    status?: string;
    provider?: string;
  }): Promise<WebhookDLQListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
    if (params?.provider && params.provider !== "ALL") searchParams.set("provider", params.provider);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<WebhookDLQListResponse>(`/api/v1/admin/infra/webhooks/dlq${query}`);
  }

  public async replayWebhookEvent(eventId: string): Promise<WebhookReplayResponse> {
    return this.request<WebhookReplayResponse>(`/api/v1/admin/infra/webhooks/dlq/${eventId}/replay`, {
      method: "POST",
    });
  }

  public async discardWebhookEvent(eventId: string): Promise<WebhookReplayResponse> {
    return this.request<WebhookReplayResponse>(`/api/v1/admin/infra/webhooks/dlq/${eventId}/discard`, {
      method: "POST",
    });
  }

  public async runTenantIntegrityAudit(): Promise<TenantAuditSweepResponse> {
    return this.request<TenantAuditSweepResponse>("/api/v1/admin/infra/tenants/run-audit", {
      method: "POST",
    });
  }

  public async getTenantAuditResults(): Promise<TenantAuditSweepResponse> {
    return this.request<TenantAuditSweepResponse>("/api/v1/admin/infra/tenants/audit-results");
  }

  // ==========================================
  // Predictive Depletion, Compliance & Dispatch Desk
  // ==========================================

  public async getStockDepletionForecast(): Promise<DepletionForecastResponse> {
    return this.request<DepletionForecastResponse>("/api/v1/pharmacy-admin/procurement/depletion-forecast");
  }

  public async generateBulkPOFromForecast(data: BulkPOGenerationRequest): Promise<BulkPOGenerationResponse> {
    return this.request<BulkPOGenerationResponse>("/api/v1/pharmacy-admin/procurement/generate-bulk-po", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Patient Store V2: Hospital Cards, Prescriptions, Lab Orders, Vitals Latest
  // ==========================================

  public async getPatientHospitalCards(): Promise<HospitalPatientCard[]> {
    type CardsShape = ListPatientHospitalCardsResponse | HospitalPatientCard[] | any;
    const tryPrimary = async (): Promise<CardsShape> => {
      try {
        return await this.request<CardsShape>("/api/v1/patients/me/hospital-cards", { method: "GET" });
      } catch {
        return this.request<CardsShape>("/api/v1/patient/hospital-cards", { method: "GET" });
      }
    };
    const res = await tryPrimary();
    if (Array.isArray(res)) return res as HospitalPatientCard[];
    if (res && Array.isArray((res as ListPatientHospitalCardsResponse).items))
      return (res as ListPatientHospitalCardsResponse).items;
    if (res && (res as any).data && Array.isArray((res as any).data)) return (res as any).data;
    return [];
  }

  public async listPatientPrescriptions(): Promise<PatientPrescriptionSummary[]> {
    type RxShape = ListPatientPrescriptionsResponse | PatientPrescriptionSummary[] | any;
    const res = await this.request<RxShape>("/api/v1/patient/prescriptions", { method: "GET" });
    if (Array.isArray(res)) return res as PatientPrescriptionSummary[];
    if (res && Array.isArray((res as ListPatientPrescriptionsResponse).items))
      return (res as ListPatientPrescriptionsResponse).items;
    if (res && (res as any).data && Array.isArray((res as any).data)) return (res as any).data;
    return [];
  }

  public async getPatientLabOrders(): Promise<PatientLabOrderItem[]> {
    type LabsShape = ListPatientLabOrdersResponse | PatientLabOrderItem[] | any;
    const res = await this.request<LabsShape>("/api/v1/patient/lab-orders", { method: "GET" });
    if (Array.isArray(res)) return res as PatientLabOrderItem[];
    if (res && Array.isArray((res as ListPatientLabOrdersResponse).items))
      return (res as ListPatientLabOrdersResponse).items;
    if (res && (res as any).data && Array.isArray((res as any).data)) return (res as any).data;
    return [];
  }

  public async getLatestPatientVitals(): Promise<LatestPatientVitals | null> {
    try {
      const res = await this.request<LatestPatientVitals | { data: LatestPatientVitals } | any>(
        "/api/v1/patient/vitals/latest",
        { method: "GET" }
      );
      if (!res) return null;
      if (res && Array.isArray((res as any).data) === false && typeof (res as any).data === "object" && (res as any).data !== null)
        return (res as any).data as LatestPatientVitals;
      if (res && (res as any).items && Array.isArray((res as any).items) && (res as any).items[0])
        return (res as any).items[0] as LatestPatientVitals;
      if (typeof (res as LatestPatientVitals).status === "undefined" && typeof (res as any).status !== "string") {
        const maybe = res as any;
        if (maybe.recorded_at || maybe.systolic_bp !== undefined || maybe.pulse_bpm !== undefined || maybe.temperature_c !== undefined) {
          return res as LatestPatientVitals;
        }
      }
      return res as LatestPatientVitals;
    } catch {
      return null;
    }
  }

  public formatBp(v: LatestPatientVitals | null): string {
    if (!v) return "—";
    const s = v.systolic_bp;
    const d = v.diastolic_bp;
    if (s == null && d == null) return "—";
    return `${s ?? "—"}/${d ?? "—"}`;
  }

  public async exportRegulatoryComplianceBundle(
    data: ComplianceExportRequest
  ): Promise<ComplianceExportBundleResponse> {
    return this.request<ComplianceExportBundleResponse>("/api/v1/superintendent/compliance/export-bundle", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getAuditPackagesHistory(): Promise<AuditPackageHistoryItem[]> {
    return this.request<AuditPackageHistoryItem[]>("/api/v1/superintendent/compliance/audit-history");
  }

  public async getUnifiedDispatchQueue(): Promise<UnifiedDispatchQueueResponse> {
    return this.request<UnifiedDispatchQueueResponse>("/api/v1/pharmacy/fulfillment/dispatch");
  }

  public async dispatchCourierDelivery(
    data: CourierDispatchActionRequest
  ): Promise<CourierDispatchActionResponse> {
    return this.request<CourierDispatchActionResponse>("/api/v1/pharmacy/fulfillment/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Patient Pill Box & 1-Click Telehealth
  // ==========================================

  public async getPillBoxSchedule(): Promise<PillBoxDailyScheduleResponse> {
    return this.request<PillBoxDailyScheduleResponse>("/api/v1/patient/adherence/pillbox");
  }

  public async logDoseAdherence(data: LogPillBoxDoseRequest): Promise<LogPillBoxDoseResponse> {
    return this.request<LogPillBoxDoseResponse>("/api/v1/patient/adherence/pillbox/log-dose", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async bookTelehealthSession(
    data: BookTelehealthSessionRequest
  ): Promise<BookTelehealthSessionResponse> {
    return this.request<BookTelehealthSessionResponse>("/api/v1/patient/telehealth/book", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Reception Scanner, Archive Map & TV Queue
  // ==========================================

  public async scanFastIntake(data: FastScannerIntakeRequest): Promise<FastScannerIntakeResponse> {
    return this.request<FastScannerIntakeResponse>("/api/v1/reception/scan-intake", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getFolderArchiveMap(search?: string): Promise<FolderArchiveMapResponse> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request<FolderArchiveMapResponse>(`/api/v1/reception/folders/archive-map${query}`);
  }

  public async checkoutPhysicalFolder(
    data: FolderCheckoutActionRequest
  ): Promise<FolderTransitActionResponse> {
    return this.request<FolderTransitActionResponse>("/api/v1/reception/folders/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async returnPhysicalFolder(
    data: FolderReturnActionRequest
  ): Promise<FolderTransitActionResponse> {
    return this.request<FolderTransitActionResponse>("/api/v1/reception/folders/return", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getQueueAudioEvents(): Promise<QueueAudioStreamResponse> {
    return this.request<QueueAudioStreamResponse>("/api/v1/reception/queue/audio-stream");
  }

  // ==========================================
  // AI Intelligence Suite (Scribe, ICD-10, Counseling)
  // ==========================================

  public async generateAISoapEncounter(data: AIScribeRequest): Promise<AISoapScribeResponse> {
    return this.request<AISoapScribeResponse>("/api/v1/ai/scribe/transcribe-soap", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getAICalculatedICD10Differentials(
    data: ICD10DifferentialRequest
  ): Promise<ICD10SuggestionResponse> {
    return this.request<ICD10SuggestionResponse>("/api/v1/ai/diagnostics/icd10-suggest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async generatePatientCounseling(
    data: MultilingualCounselingRequest
  ): Promise<MultilingualCounselingResponse> {
    return this.request<MultilingualCounselingResponse>("/api/v1/ai/pharmacy/counseling", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // AI Vision OCR & Queue Prediction (Phase 2)
  // ==========================================

  public async extractIDCardOCR(data: IDCardOCRRequest): Promise<IDCardOCRResponse> {
    return this.request<IDCardOCRResponse>("/api/v1/ai/ocr/id-card", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async extractPrescriptionOCR(
    data: PrescriptionOCRRequest
  ): Promise<PrescriptionOCRResponse> {
    return this.request<PrescriptionOCRResponse>("/api/v1/ai/ocr/prescription", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getEstimatedQueueWaitTime(
    params?: QueueWaitTimeEstimateRequest
  ): Promise<QueueWaitTimeEstimateResponse> {
    const query = new URLSearchParams();
    if (params?.department) query.append("department", params.department);
    if (params?.queue_position) query.append("queue_position", String(params.queue_position));
    if (params?.triage_priority) query.append("triage_priority", params.triage_priority);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request<QueueWaitTimeEstimateResponse>(`/api/v1/ai/queue/wait-time-estimate${qs}`);
  }

  // =========================================================================
  // AI Predictive Analytics, Claim Scrubber & Epidemic Sentinel (Phase 3)
  // =========================================================================

  public async getSeasonalDemandForecast(
    targetMonth?: string
  ): Promise<SeasonalDemandResponse> {
    const qs = targetMonth ? `?target_month=${encodeURIComponent(targetMonth)}` : "";
    return this.request<SeasonalDemandResponse>(`/api/v1/ai/analytics/demand-forecast${qs}`);
  }

  public async scrubInsuranceClaimBatch(
    data?: ClaimScrubBatchRequest
  ): Promise<ClaimScrubberReportResponse> {
    return this.request<ClaimScrubberReportResponse>("/api/v1/ai/insurance/scrub-batch", {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  public async getEpidemicOutbreakAlerts(): Promise<EpidemicSentinelResponse> {
    return this.request<EpidemicSentinelResponse>("/api/v1/ai/epidemiology/outbreak-sentinel");
  }

  // ==========================================
  // Multi-Branch & Inter-Branch Transfers (IBT)
  // ==========================================

  public async getFacilityBranches(): Promise<FacilityBranch[]> {
    return this.request<FacilityBranch[]>("/api/v1/branches");
  }

  public async createFacilityBranch(data: CreateBranchRequest): Promise<FacilityBranch> {
    return this.request<FacilityBranch>("/api/v1/branches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateFacilityBranch(
    branchId: string,
    data: UpdateBranchRequest
  ): Promise<FacilityBranch> {
    return this.request<FacilityBranch>(`/api/v1/branches/${branchId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public async getTenantEntitlements(): Promise<TenantEntitlementsResponse> {
    return this.request<TenantEntitlementsResponse>("/api/v1/branches/entitlements");
  }

  public async getIBTTransfers(params?: {
    branchId?: string;
    status?: string;
  }): Promise<InterBranchTransfer[]> {
    const searchParams = new URLSearchParams();
    if (params?.branchId) searchParams.set("branch_id", params.branchId);
    if (params?.status) searchParams.set("status_filter", params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<InterBranchTransfer[]>(`/api/v1/branches/ibt/list${query}`);
  }

  public async getIBTTransfer(transferId: string): Promise<InterBranchTransfer> {
    return this.request<InterBranchTransfer>(`/api/v1/branches/ibt/${transferId}`);
  }

  public async dispatchIBTTransfer(data: IBTDispatchPayload): Promise<InterBranchTransfer> {
    return this.request<InterBranchTransfer>("/api/v1/branches/ibt", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async receiveIBTTransfer(
    transferId: string,
    data?: ReceiveIBTPayload
  ): Promise<InterBranchTransfer> {
    return this.request<InterBranchTransfer>(`/api/v1/branches/ibt/${transferId}/receive`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  // ================= Ghana NHIS G-DRG Tariffs & Essential Formulary =================

  public async getNHISGDRGTariffs(params?: {
    search?: string;
    category?: string;
    preauth_required?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<NHISGDRGTariffItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.preauth_required !== undefined) searchParams.set("preauth_required", String(params.preauth_required));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.skip) searchParams.set("skip", String(params.skip));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<NHISGDRGTariffItem[]>(`/api/v1/tariffs/nhis-gdrg${query}`);
  }

  public async getClinicalFormulary(params?: {
    search?: string;
    category?: string;
    poison_schedule?: string;
    is_cold_chain?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<FormularyMedicationItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.poison_schedule) searchParams.set("poison_schedule", params.poison_schedule);
    if (params?.is_cold_chain !== undefined) searchParams.set("is_cold_chain", String(params.is_cold_chain));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.skip) searchParams.set("skip", String(params.skip));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<FormularyMedicationItem[]>(`/api/v1/tariffs/formulary${query}`);
  }
  // ================= Onboarding & Invitation Engine Module =================

  public async requestFacilityInvite(
    data: CompanyInviteSubmissionRequest
  ): Promise<CompanyInvitationResponse> {
    return this.request<CompanyInvitationResponse>("/api/v1/onboard/company/request-invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async createCompanyInvitation(
    data: CompanyInvitationCreateRequest
  ): Promise<CompanyInvitationResponse> {
    return this.request<CompanyInvitationResponse>("/api/v1/super-admin/invitations/company", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getCompanyInvitations(): Promise<CompanyInvitationResponse[]> {
    return this.request<CompanyInvitationResponse[]>("/api/v1/super-admin/invitations/company");
  }

  public async verifyCompanyInvitation(token: string): Promise<CompanyVerificationResponse> {
    return this.request<CompanyVerificationResponse>(
      `/api/v1/onboard/company/verify?token=${encodeURIComponent(token)}`
    );
  }

  public async completeCompanyOnboarding(
    data: CompanyOnboardingCompletionRequest
  ): Promise<CompanyOnboardingCompletionResponse> {
    return this.request<CompanyOnboardingCompletionResponse>("/api/v1/onboard/company/complete", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getStaffSeatQuota(): Promise<StaffSeatQuotaSummary> {
    return this.request<StaffSeatQuotaSummary>("/api/v1/staff/quota");
  }

  public async createStaffInvitation(
    data: StaffInvitationCreateRequest
  ): Promise<StaffInvitationResponse> {
    return this.request<StaffInvitationResponse>("/api/v1/staff/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getStaffInvitations(): Promise<StaffInvitationResponse[]> {
    return this.request<StaffInvitationResponse[]>("/api/v1/staff/invitations");
  }

  public async resendStaffInvitation(invitationId: string): Promise<StaffInvitationResponse> {
    return this.request<StaffInvitationResponse>(
      `/api/v1/staff/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: "POST" }
    );
  }

  public async verifyStaffInvitation(token: string): Promise<StaffVerificationResponse> {
    return this.request<StaffVerificationResponse>(
      `/api/v1/onboard/staff/verify?token=${encodeURIComponent(token)}`
    );
  }

  public async completeStaffOnboarding(
    data: StaffOnboardingCompletionRequest
  ): Promise<StaffOnboardingCompletionResponse> {
    return this.request<StaffOnboardingCompletionResponse>("/api/v1/onboard/staff/complete", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ================= LiveKit Telemedicine WebRTC =================

  public async generateTelemedicineToken(
    data: TelemedicineTokenRequest
  ): Promise<TelemedicineTokenResponse> {
    return this.request<TelemedicineTokenResponse>("/api/v1/telemedicine/token", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}




export const createApiClient = (options?: MedipaediaClientOptions) =>
  new MedipaediaApiClient(options);









