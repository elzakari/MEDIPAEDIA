export type TenantType = "HOSPITAL" | "CLINIC" | "PHARMACY";

export type UserRole =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "HOSPITAL_FINANCE"
  | "RECORD_CLERK"
  | "PHARMACY_ADMIN"
  | "PHARMACY_FINANCE"
  | "SUPERINTENDENT_PHARMACIST"
  | "PHARMACIST"
  | "TENANT_ADMIN"
  | "PATIENT";

export interface StaffProfile {
  id: string;
  user_id: string;
  tenant_id?: string;
  license_number?: string;
  licensing_body?: string;
  department?: string;
  specialization?: string;
  can_prescribe_narcotics: boolean;
  can_authorize_quarantine: boolean;
  can_collect_cash: boolean;
  can_initiate_payout: boolean;
  is_active: boolean;
}

export type OpdQueueStatus =
  | "QUEUED"
  | "TRIAGE"
  | "WITH_DOCTOR"
  | "COMPLETED"
  | "CANCELLED";

export type TriagePriority = "ROUTINE" | "PRIORITY" | "EMERGENCY";

export type PrescriptionStatus =
  | "PENDING"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "CANCELLED"
  | "EXPIRED";

export type EscrowStatus = "HELD" | "RELEASED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type FulfillmentType = "DELIVERY" | "PICKUP";

export type TransactionType =
  | "ESCROW_HOLD"
  | "ESCROW_RELEASE"
  | "COMMISSION_FEE"
  | "PAYOUT_TRANSFER"
  | "REFUND";

export type PayoutStatus = "PENDING" | "SUCCESS" | "FAILED" | "REVERSED";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tenant_type: TenantType;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
  email?: string;
  country?: string;
  currency?: string;
  subscription_plan_code?: string;
  subscription_status?: string;
  is_verified: boolean;
  is_active: boolean;
  is_locked?: boolean;
  license_number?: string;
  status?: string;
  branches_count?: number;
  bed_count?: number;
  monthly_revenue?: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  roles?: string[];
  primary_role?: string;
  tenant_id?: string;
  license_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface PatientAccount {
  id: string;
  user_id: string;
  ghana_card_id?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  hospital_cards?: HospitalPatientCard[];
}

export type IntakeTrack = "STANDARD" | "CORPORATE_INSURANCE" | "EMERGENCY";

export type BillingStatus = "PAID" | "UNPAID" | "PENDING" | "WAIVED" | string;

export interface HospitalPatientCard {
  id: string;
  patient_account_id: string;
  patient_id?: string;
  tenant_id: string;
  facility_name?: string;
  tenant_code?: string;
  mrn: string;
  card_number?: string;
  qr_token: string;
  registration_fee_paid: boolean;
  is_active: boolean;
  intake_type?: IntakeTrack | string;
  billing_status?: BillingStatus;
  registered_at?: string;
  created_at?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  full_name: string;
  role: UserRole;
  roles?: string[];
  primary_role?: string;
  tenant_id?: string;
  active_tenant?: Tenant;
  default_redirect_path?: string;
}

export interface AuthMe {
  user_id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  roles?: string[];
  primary_role?: string;
  tenant_id?: string;
  active_tenant?: Tenant;
  patient_profile?: PatientAccount;
  linked_facilities: HospitalPatientCard[];
}

export interface StaffLoginCredentials {
  email?: string;
  identifier?: string;
  password: string;
  facility_slug?: string;
}

export interface PatientRegisterData {
  full_name?: string;
  phone?: string;
  phone_number?: string;
  password?: string;
  email?: string;
  ghana_card_id?: string;
  ghana_card_number?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface PatientLoginCredentials {
  identifier: string;
  password: string;
}

// ================= Fintech & Escrow Types =================

export interface PaymentRecipientSetupData {
  type?: string;
  name?: string;
  account_name?: string;
  account_number: string;
  bank_code?: string;
  bank_or_network_code?: string;
  currency?: string;
}

export interface PaymentRecipientSetupResult {
  tenant_id: string;
  recipient_code: string;
  account_name: string;
  account_number: string;
  bank_or_network: string;
  currency: string;
  is_payout_configured: boolean;
  updated_at: string;
}

export interface PlatformTransactionItem {
  id: string;
  transaction_reference: string;
  transaction_type: TransactionType;
  gross_amount: number;
  fee_amount?: number;
  platform_fee?: number;
  net_amount: number;
  currency: string;
  order_id?: string;
  paystack_reference?: string;
  description?: string;
  created_at: string;
}

export interface SettlementPayoutItem {
  id: string;
  payout_reference: string;
  transfer_code?: string;
  amount?: number;
  gross_amount?: number;
  fee_deducted: number;
  net_amount?: number;
  tenant_id?: string;
  currency: string;
  status: PayoutStatus | string;
  recipient_name?: string;
  recipient_details?: Record<string, any>;
  bank_or_momo_network?: string;
  created_at?: string;
  processed_at?: string;
}

export interface PharmacyLedgerData {
  tenant_id?: string;
  facility_name?: string;
  pending_escrow_balance: number;
  available_balance: number;
  lifetime_earnings: number;
  currency: string;
  is_payout_configured?: boolean;
  paystack_recipient_code?: string;
  recipient_account_name?: string;
  recipient_account_number?: string;
  recent_transactions: PlatformTransactionItem[];
  payout_history?: SettlementPayoutItem[];
}

export interface ReleaseEscrowResult {
  order_id: string;
  order_number: string;
  gross_amount: number;
  platform_commission: number;
  net_payout_to_pharmacy: number;
  new_available_balance: number;
  escrow_status: string;
  released_at: string;
  message: string;
}

// ================= Patient Marketplace & Wallet Types =================

export interface PatientCard {
  id: string;
  facility_id?: string;
  facility_name: string;
  facility_slug?: string;
  facility_type?: string;
  facility_address?: string;
  mrn: string;
  qr_token?: string;
  qr_check_in_token?: string;
  registration_fee_paid?: boolean;
  registration_fee_status?: string;
  is_active: boolean;
  registered_at?: string;
  created_at?: string;
}

export interface PrescriptionItemDetail {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  quantity_prescribed: number;
  quantity_dispensed?: number;
  quantity_remaining?: number;
}

export interface PatientPrescriptionSummary {
  id: string;
  prescription_number: string;
  access_code?: string;
  claim_pin?: string;
  verification_hash?: string;
  hmac_signature?: string;
  status: PrescriptionStatus;
  doctor_name: string;
  doctor_license?: string;
  hospital_name?: string;
  facility_name?: string;
  diagnosis?: string;
  created_at: string;
  expires_at?: string;
  is_expired?: boolean;
  items: PrescriptionItemDetail[];
}

export interface MarketplaceSearchPayload {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
  medication_name?: string;
  query?: string;
  prescription_id?: string;
}

export interface PharmacyStockBatchItem {
  inventory_id: string;
  medication_name: string;
  dosage_form: string;
  strength: string;
  batch_number: string;
  unit_price: number;
  quantity_available: number;
  is_in_stock: boolean;
}

export interface PharmacyMarketplaceItem {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_slug?: string;
  address?: string;
  phone?: string;
  phone_number?: string;
  latitude?: number;
  longitude?: number;
  distance_km: number;
  distance_meters?: number;
  is_verified: boolean;
  open_now?: boolean;
  operating_hours: string;
  unit_price?: number;
  batch_number?: string;
  available_quantity?: number;
  in_stock?: boolean;
  stock_items?: PharmacyStockBatchItem[];
  total_basket_price?: number;
  has_full_prescription_stock?: boolean;
}

export interface MarketplaceSearchResult {
  pharmacy_id?: string;
  pharmacy_name?: string;
  address?: string;
  phone_number?: string;
  distance_km?: number;
  is_verified?: boolean;
  operating_hours?: string;
  in_stock?: boolean;
  unit_price?: number;
  batch_number?: string;
  available_quantity?: number;
  search_location?: { latitude: number; longitude: number };
  radius_km?: number;
  pharmacies_found?: number;
  results?: PharmacyMarketplaceItem[];
}

export interface CartCheckoutItemInput {
  inventory_id?: string;
  medication_name?: string;
  quantity: number;
  unit_price: number;
}

export interface CheckoutOrderPayload {
  pharmacy_tenant_id?: string;
  pharmacy_id?: string;
  prescription_id?: string;
  fulfillment_type?: FulfillmentType | string;
  delivery_address?: string;
  delivery_phone?: string;
  momo_provider?: string;
  delivery_notes?: string;
  items: CartCheckoutItemInput[];
}

export interface CheckoutOrderResult {
  order_id: string;
  order_number: string;
  pharmacy_name: string;
  total_amount: number;
  escrow_status: EscrowStatus;
  payment_status: PaymentStatus;
  fulfillment_type: FulfillmentType;
  paystack_authorization_url: string;
  paystack_access_code: string;
  paystack_reference: string;
  inventory_hold_expires_at: string;
  message: string;
}

export interface PatientOrderItem {
  medication_name: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
}

export interface PatientOrder {
  id?: string;
  order_id: string;
  order_number: string;
  pharmacy_name: string;
  pharmacy_address?: string;
  pharmacy_phone?: string;
  total_amount: number;
  escrow_status: EscrowStatus;
  payment_status: PaymentStatus;
  fulfillment_type: FulfillmentType;
  delivery_address?: string;
  created_at: string;
  pickup_qr_code?: string;
  pickup_otp?: string;
  otp_code?: string;
  status?: string;
  items: PatientOrderItem[];
}

export interface PickupQRData {
  order_id: string;
  order_number: string;
  qr_payload: string;
  otp: string;
  pharmacy_name: string;
  expires_at: string;
}

// ================= Pharmacy & POS Types =================

export interface InventoryBatch {
  id: string;
  tenant_id: string;
  medication_id?: string;
  generic_name: string;
  brand_name: string;
  dosage_form: string;
  strength: string;
  sku: string;
  batch_number: string;
  unit_price: number;
  quantity?: number;
  quantity_available: number;
  reorder_level?: number;
  reorder_threshold: number;
  expiry_date: string;
  is_low_stock: boolean;
  is_expiring_soon: boolean;
  days_to_expiry: number;
  is_available_for_marketplace: boolean;
}

export interface InventoryBatchCreateData {
  medication_name?: string;
  brand_name?: string;
  generic_name?: string;
  dosage_form?: string;
  strength?: string;
  category?: string;
  sku: string;
  batch_number: string;
  unit_price: number;
  quantity?: number;
  quantity_available?: number;
  reorder_level?: number;
  reorder_threshold?: number;
  expiry_date: string;
  is_available_for_marketplace?: boolean;
}

export interface PrescriptionMatchItem {
  item_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  quantity_remaining: number;
  in_stock: boolean;
  available_stock: number;
  unit_price?: number;
  estimated_total?: number;
  matched_batch_number?: string;
}

export interface PrescriptionVerifyResult {
  prescription_id: string;
  prescription_number: string;
  access_code: string;
  claim_pin?: string;
  is_signature_valid: boolean;
  status: PrescriptionStatus;
  doctor_name: string;
  doctor_license?: string;
  prescribing_facility?: string;
  facility_name?: string;
  patient_name: string;
  patient_mrn?: string;
  mrn?: string;
  allergies?: string;
  diagnosis?: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  items: PrescriptionMatchItem[];
  all_items_in_stock: boolean;
  total_estimated_amount: number;
}

export interface DispenseItemInput {
  prescription_item_id?: string;
  inventory_id?: string;
  inventory_batch_id?: string;
  quantity_to_dispense?: number;
  quantity?: number;
  unit_price: number;
}

export interface DispensePayload {
  prescription_id?: string;
  payment_method: string;
  patient_name?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  items: DispenseItemInput[];
}

export interface DispenseResult {
  receipt_id: string;
  receipt_number: string;
  prescription_id?: string;
  prescription_status?: PrescriptionStatus;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  dispensed_at: string;
  dispensed_by: string;
  facility_name: string;
  items_dispensed: number;
  receipt_url: string;
}

export interface DispensaryLogItem {
  id: string;
  receipt_number: string;
  prescription_number?: string;
  customer_name: string;
  customer_phone?: string;
  pharmacist_name?: string;
  items_count?: number;
  total_amount: number;
  payment_method: string;
  payment_status?: string;
  dispensed_at: string;
  dispensed_by?: string;
  items?: Array<{
    medication_name: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export interface ReceiptData {
  receipt_id?: string;
  receipt_number: string;
  prescription_number?: string;
  facility_name?: string;
  pharmacy_name?: string;
  facility_address?: string;
  facility_phone?: string;
  pharmacist_name: string;
  customer_name: string;
  customer_phone?: string;
  date?: string;
  dispensed_at?: string;
  payment_method: string;
  subtotal: number;
  tax?: number;
  tax_amount?: number;
  total_amount: number;
  items: Array<{
    medication_name: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

// ================= Clinical & EMR Types =================

export interface CheckInPayload {
  identifier: string;
  priority?: TriagePriority;
}

export interface CheckInResult {
  queue_id: string;
  queue_number: string;
  mrn: string;
  patient_id: string;
  patient_name: string;
  phone?: string;
  ghana_card_id?: string;
  status: OpdQueueStatus;
  priority: TriagePriority;
  registration_fee_waived: boolean;
  fee_amount: number;
  checked_in_at: string;
}

export interface OpdQueueItem {
  id?: string;
  queue_id: string;
  queue_number: string;
  patient_id: string;
  hospital_card_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  mrn: string;
  priority: TriagePriority;
  triage_priority?: TriagePriority;
  status: OpdQueueStatus;
  checked_in_at: string;
  ghana_card_number?: string;
  temperature?: number;
  blood_pressure?: string;
  heart_rate?: number;
  spo2?: number;
  has_vitals: boolean;
}

export interface VitalsInput {
  patient_account_id?: string;
  hospital_card_id?: string;
  consultation_id?: string;
  queue_id?: string;
  temperature?: number;
  temperature_c?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  pulse_bpm?: number;
  blood_pressure?: string;
  respiratory_rate?: number;
  respiratory_rate_bpm?: number;
  spo2?: number;
  spo2_percent?: number;
  weight_kg?: number;
  height_cm?: number;
}

export interface VitalsResult {
  id: string;
  patient_account_id: string;
  temperature?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  is_fever: boolean;
  is_hypertensive: boolean;
  is_hypoxic: boolean;
  recorded_at: string;
}

export interface SOAPConsultationInput {
  hospital_card_id: string;
  queue_id?: string;
  chief_complaint: string;
  subjective_note?: string;
  objective_note?: string;
  assessment_note?: string;
  plan_note?: string;
  icd10_diagnosis_code?: string;
  diagnosis_description?: string;
}

export interface ICD10Item {
  code: string;
  description: string;
  category: string;
  is_common: boolean;
}

export interface PrescriptionItemInput {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  quantity_prescribed: number;
}

export interface PrescriptionMintInput {
  patient_account_id?: string;
  hospital_card_id?: string;
  consultation_id?: string;
  notes?: string;
  items: PrescriptionItemInput[];
}

export interface PrescriptionPrintData {
  prescription_id: string;
  prescription_number: string;
  access_code: string;
  claim_pin?: string;
  verification_hash: string;
  hmac_signature?: string;
  qr_payload?: string;
  qr_verification_url?: string;
  doctor_name: string;
  doctor_license?: string;
  facility_name: string;
  facility_address?: string;
  patient_name: string;
  patient_mrn: string;
  mrn?: string;
  patient_dob?: string;
  patient_gender?: string;
  allergies?: string;
  diagnosis?: string;
  issued_date: string;
  issued_at?: string;
  expires_date: string;
  status: PrescriptionStatus;
  items: Array<{
    medication_name: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    instructions?: string;
    quantity_prescribed: number;
  }>;
}

export interface PatientHistory {
  patient_id: string;
  full_name: string;
  ghana_card_id?: string;
  blood_group?: string;
  allergies?: string;
  consultations: Array<{
    id: string;
    date: string;
    doctor_name: string;
    chief_complaint: string;
    icd10_code?: string;
    diagnosis?: string;
  }>;
  recent_vitals: VitalsResult[];
}

export interface Vitals {
  id: string;
  consultation_id?: string;
  patient_account_id: string;
  temperature?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  recorded_by_nurse_id?: string;
  recorded_at: string;
}

export interface Consultation {
  id: string;
  hospital_card_id: string;
  tenant_id: string;
  doctor_id: string;
  chief_complaint: string;
  clinical_notes?: string;
  subjective_note?: string;
  objective_note?: string;
  assessment_note?: string;
  plan_note?: string;
  icd10_diagnosis_code?: string;
  diagnosis_description?: string;
  consultation_status: "IN_PROGRESS" | "COMPLETED" | "REFERRED" | "CANCELLED";
  created_at: string;
  vitals?: Vitals;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
}

export interface Prescription {
  id: string;
  prescription_number: string;
  consultation_id?: string;
  patient_account_id: string;
  tenant_id: string;
  doctor_id: string;
  verification_hash: string;
  hmac_signature?: string;
  access_code: string;
  claim_pin?: string;
  status: PrescriptionStatus;
  notes?: string;
  expires_at: string;
  created_at: string;
  items: PrescriptionItem[];
}

export interface GlobalMedication {
  id: string;
  generic_name: string;
  brand_name: string;
  dosage_form: string;
  strength: string;
  category?: string;
  nafdac_fda_number?: string;
}

export interface PharmacyInventory {
  id: string;
  tenant_id: string;
  global_medication_id: string;
  sku: string;
  batch_number: string;
  unit_price: number;
  quantity_available: number;
  expiry_date: string;
  is_available_for_marketplace: boolean;
  latitude?: number;
  longitude?: number;
  medication?: GlobalMedication;
}

export interface OrderItem {
  id: string;
  order_id: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  patient_account_id: string;
  pharmacy_tenant_id: string;
  prescription_id?: string;
  escrow_status: EscrowStatus;
  paystack_reference?: string;
  payment_status: "PENDING" | "PAID" | "FAILED";
  fulfillment_type: FulfillmentType;
  delivery_address?: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  database: string;
  redis: string;
}

// ================= Super Admin Types =================

export interface AdminSystemTelemetry {
  db_postgis_latency_ms: number;
  redis_hit_ratio_percent: number;
  active_sse_triage_connections: number;
  daily_api_requests: number;
  uptime_percent: number;
  last_postgis_reindex: string;
}

export interface AdminOverviewMetrics {
  gross_marketplace_volume: number;
  platform_commission_earned: number;
  escrow_in_transit: number;
  available_payout_pool: number;
  total_tenants_count: number;
  active_hospitals_count: number;
  active_pharmacies_count: number;
  total_prescriptions_dispensed: number;
  total_patient_accounts: number;
  pending_verifications_count: number;
  system_telemetry: AdminSystemTelemetry;
}

export interface PendingFacilityItem {
  id: string;
  name: string;
  slug: string;
  tenant_type: TenantType;
  license_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  is_verified: boolean;
}

export interface VerifyFacilityPayload {
  tenant_id: string;
  approve: boolean;
  rejection_reason?: string;
  assigned_tier?: string;
}

export interface VerifyFacilityResult {
  tenant_id: string;
  facility_name: string;
  status: string;
  is_verified: boolean;
  verified_at: string;
  message: string;
}

export interface BatchSettlementSummary {
  total_eligible_pharmacies: number;
  total_payout_amount: number;
  currency: string;
  batches_pending: number;
  recent_payouts_count: number;
}

export interface ExecuteBatchPayoutPayload {
  notes?: string;
}

export interface BatchPayoutExecutionResult {
  batch_reference: string;
  pharmacies_paid_count: number;
  total_amount_disbursed: number;
  currency: string;
  status: string;
  executed_at: string;
  message: string;
}

export interface AdminAuditLogItem {
  id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface HospitalStaffItem {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface InviteHospitalStaffPayload {
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  password?: string;
}

export interface HospitalSettings {
  facility_id: string;
  name: string;
  slug: string;
  license_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opd_registration_fee_ghs: number;
  departments: string[];
}

export interface UpdateHospitalSettingsPayload {
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opd_registration_fee_ghs?: number;
  departments?: string[];
}

export interface HospitalFinances {
  total_patients_registered: number;
  opd_card_fees_collected_ghs: number;
  pending_settlements_ghs: number;
  total_consultations_billed: number;
  monthly_trend: Array<{ month: string; cards_issued: number; revenue_ghs: number }>;
}

export interface PharmacyStaffItem {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface InvitePharmacyStaffPayload {
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  password?: string;
}

export interface PharmacySettings {
  facility_id: string;
  name: string;
  slug: string;
  license_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  operating_hours: string;
  default_reorder_threshold: number;
  momo_network: string;
  momo_account_number: string;
  momo_account_name: string;
  payout_schedule: string;
}

export interface UpdatePharmacySettingsPayload {
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  operating_hours?: string;
  default_reorder_threshold?: number;
  momo_network?: string;
  momo_account_number?: string;
  momo_account_name?: string;
}

export interface UserSessionItem {
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_name: string;
  created_at: number;
  last_active: number;
  is_current?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface ForgotPasswordResponse {
  sent: boolean;
  message: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// ================= Super Admin Manage Drawer ================
export type FacilityRoleLiteral =
  | "HOSPITAL_ADMIN"
  | "PHARMACY_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "RECORD_CLERK"
  | "ACCOUNTANT";

export type FacilityTierLiteral = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type FacilityStatusLiteral = "ACTIVE" | "RESTRICTED";

export interface UpdateFacilityPayload {
  name?: string;
  tier?: FacilityTierLiteral;
  country?: string;
  currency?: string;
  status?: FacilityStatusLiteral;
  subscription_plan_code?: string;
}

export interface UpdateFacilityResult {
  success: true;
  message: string;
  tenant_id: string;
  name: string;
  country?: string;
  currency: string;
  subscription_plan_code: string;
  status: FacilityStatusLiteral;
  is_active: boolean;
  updated_at: string;
}

export interface TenantStaffItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  roles: FacilityRoleLiteral[];
  primary_role?: FacilityRoleLiteral;
  license_number?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
  invitation_sent: boolean;
}

export interface CreateTenantStaffPayload {
  full_name: string;
  email: string;
  license_number?: string;
  phone?: string;
  roles: FacilityRoleLiteral[];
}

export interface GenerateResetLinkPayload {
  validity_hours?: number;
}

export interface GenerateResetLinkResult {
  reset_link: string;
  token_id: string;
  expires_at: string;
  validity_hours: number;
  user_id: string;
  status?: string;
  raw_token?: string;
  reset_url?: string;
  expires_in?: string;
  email_sent?: boolean;
  email_dispatch_status?: "sent" | "preview" | "error" | string;
  email_error?: string | null;
}

export interface OverridePasswordPayload {
  new_password: string;
}

export interface OverridePasswordResult {
  success: true;
  message: string;
  user_id: string;
  sessions_revoked: boolean;
  updated_at: string;
}

export type SmtpProviderLiteral = "GMAIL" | "GOOGLE_WORKSPACE" | "AWS_SES" | "SENDGRID" | "CUSTOM";
export type SmtpEncryptionLiteral = "TLS" | "SSL" | "NONE";

export interface SmtpConfigResult {
  id: string;
  is_active: boolean;
  provider?: SmtpProviderLiteral | null;
  smtp_host: string;
  smtp_port: number;
  encryption: SmtpEncryptionLiteral;
  username: string;
  password_masked: string;
  from_email: string;
  from_name?: string | null;
  last_tested_at?: string | null;
  last_tested_recipient?: string | null;
  last_tested_ok?: boolean | null;
  updated_at?: string | null;
  updated_by_id?: string | null;
}

export interface SmtpConfigPayload {
  provider: SmtpProviderLiteral;
  smtp_host: string;
  smtp_port: number;
  encryption: SmtpEncryptionLiteral;
  username: string;
  password_cleartext?: string | null;
  from_email: string;
  from_name?: string | null;
}

export interface SmtpSendResult {
  status: "sent" | "preview" | "error";
  via: "smtp" | "console_preview" | "error";
  message_id?: string | null;
  preview_text?: string | null;
  error?: string | null;
  config_id?: string | null;
}

export interface SmtpTestPayload {
  recipient_email: string;
  save_settings_first?: boolean;
  settings?: SmtpConfigPayload | null;
}

export interface SmtpTestResult {
  config?: SmtpConfigResult | null;
  dispatch: SmtpSendResult;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// ================= Nurse Clinical Station Types =================

export type AVPUConsciousness = "ALERT" | "VOICE" | "PAIN" | "UNRESPONSIVE";
export type MedicationAdminStatus = "GIVEN" | "HELD" | "REFUSED";
export type FluidIntakeType = "ORAL" | "IV_CRYSTALLOID" | "IV_COLLOID" | "BLOOD_PRODUCT" | "ENTERAL";
export type FluidOutputType = "URINE" | "DRAIN" | "VOMIT" | "STOOL" | "NG_TUBE" | "INSENSIBLE";

export interface ExtendedVitalsPayload {
  patient_id?: string;
  patient_name?: string;
  queue_id?: string;
  consultation_id?: string;
  systolic_bp: number;
  diastolic_bp: number;
  heart_rate: number;
  respiratory_rate?: number;
  temperature_celsius: number;
  spo2_percent: number;
  weight_kg?: number;
  height_cm?: number;
  blood_glucose_rbs?: number;
  pain_score?: number;
  avpu?: AVPUConsciousness;
  urine_dipstick?: string;
  nurse_notes?: string;
}

export interface ExtendedVitalsResult {
  vitals_id: string;
  patient_id?: string;
  patient_name?: string;
  systolic_bp: number;
  diastolic_bp: number;
  heart_rate: number;
  respiratory_rate?: number;
  temperature_celsius: number;
  spo2_percent: number;
  bmi?: number;
  blood_glucose_rbs?: number;
  pain_score?: number;
  avpu: AVPUConsciousness;
  urine_dipstick?: string;
  esi_level: number;
  triage_category: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  is_critical_alert: boolean;
  critical_alert_message?: string;
  recorded_at: string;
  recorded_by: string;
}

export interface MedicationScheduleItem {
  medication_id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  scheduled_time: string;
  status: "PENDING" | "GIVEN" | "HELD" | "REFUSED";
  last_administered_at?: string;
  administered_by_nurse?: string;
  special_instructions?: string;
}

export interface PatientMedicationScheduleResponse {
  patient_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  allergies: string[];
  active_prescriptions_count: number;
  schedule: MedicationScheduleItem[];
}

export interface MedicationAdministerPayload {
  patient_id: string;
  medication_id: string;
  prescription_id: string;
  medication_name: string;
  dose_given: string;
  route: string;
  status?: MedicationAdminStatus;
  reason_if_not_given?: string;
  five_rights_verified?: boolean;
  nurse_signature: string;
  nurse_pin?: string;
}

export interface MedicationAdministerResult {
  administration_id: string;
  patient_id: string;
  medication_name: string;
  dose_given: string;
  status: MedicationAdminStatus;
  timestamp: string;
  nurse_signature: string;
  verified_5_rights: boolean;
  audit_message: string;
}

export interface InpatientBedItem {
  bed_id: string;
  bed_number: string;
  ward_id: string;
  ward_name: string;
  is_occupied: boolean;
  patient_id?: string;
  patient_name?: string;
  gender?: string;
  age?: number;
  ghana_card?: string;
  diagnosis?: string;
  allergies?: string[];
  oxygen_flow_rate?: string;
  current_iv_fluids?: string;
  admitted_at?: string;
  admission_duration_days?: number;
  attending_physician?: string;
}

export interface WardInfo {
  ward_id: string;
  ward_name: string;
  total_beds: number;
  occupied_beds: number;
  beds: InpatientBedItem[];
}

export interface WardBedGridResponse {
  total_facility_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate_percent: number;
  wards: WardInfo[];
}

export interface AssignBedPayload {
  patient_id: string;
  patient_name: string;
  gender: string;
  age: number;
  ghana_card: string;
  ward_id: string;
  bed_id: string;
  diagnosis: string;
  allergies?: string[];
  oxygen_flow_rate?: string;
  current_iv_fluids?: string;
  attending_physician: string;
}

export interface FluidBalanceLogPayload {
  patient_id: string;
  patient_name?: string;
  intake_type?: FluidIntakeType;
  intake_volume_ml?: number;
  intake_solution_name?: string;
  output_type?: FluidOutputType;
  output_volume_ml?: number;
  notes?: string;
  nurse_name: string;
}

export interface FluidBalanceLogItem {
  entry_id: string;
  timestamp: string;
  intake_type?: string;
  intake_volume_ml: number;
  intake_solution_name?: string;
  output_type?: string;
  output_volume_ml: number;
  nurse_name: string;
  notes?: string;
}

export interface PatientFluidBalanceSummary {
  patient_id: string;
  patient_name: string;
  total_intake_24h_ml: number;
  total_output_24h_ml: number;
  net_balance_24h_ml: number;
  fluid_status: string;
  logs: FluidBalanceLogItem[];
}

export interface SBARHandoverPayload {
  ward_name: string;
  shift: string;
  outgoing_nurse_name: string;
  outgoing_nurse_pin: string;
  patient_id?: string;
  patient_name?: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface SBARHandoverItem {
  handover_id: string;
  ward_name: string;
  shift: string;
  outgoing_nurse_name: string;
  outgoing_nurse_pin: string;
  patient_id?: string;
  patient_name?: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  created_at: string;
  is_acknowledged: boolean;
  incoming_nurse_name?: string;
  incoming_nurse_pin?: string;
  acknowledged_at?: string;
}

export interface AcknowledgeHandoverPayload {
  incoming_nurse_name: string;
  incoming_nurse_pin: string;
}

// ================= Doctor Workstation & CPOE Types =================

export type AllergySeverity = "MILD" | "MODERATE" | "SEVERE_ANAPHYLAXIS";
export type AllergyCategory = "DRUG" | "FOOD" | "ENVIRONMENTAL";
export type CDSAlertSeverity = "CRITICAL_CONTRAINDICATION" | "WARNING" | "INFO";
export type DiagnosticCategory = "LABORATORY" | "IMAGING" | "POINT_OF_CARE" | "PATHOLOGY";
export type DiagnosticPriority = "STAT" | "URGENT" | "ROUTINE";
export type AdmissionPriority = "EMERGENT" | "URGENT" | "ROUTINE";

export interface PatientAllergyItem {
  allergy_id: string;
  patient_id: string;
  allergen_name: string;
  allergen_category: AllergyCategory;
  reaction_description: string;
  severity: AllergySeverity;
  diagnosed_date?: string;
  verified_by: string;
}

export interface PatientAllergyPayload {
  allergen_name: string;
  allergen_category?: AllergyCategory;
  reaction_description: string;
  severity?: AllergySeverity;
}

export interface CDSAlertItem {
  alert_id: string;
  severity: CDSAlertSeverity;
  title: string;
  message: string;
  conflicting_drug: string;
  matched_allergen_or_drug: string;
  recommendation: string;
}

export interface PrescriptionSafetyCheckPayload {
  patient_id: string;
  medications: Array<{
    drug_name: string;
    dosage: string;
    route?: string;
    frequency?: string;
    duration_days?: number;
  }>;
  current_conditions?: string[];
}

export interface PrescriptionSafetyCheckResult {
  is_safe: boolean;
  critical_contraindications_count: number;
  warnings_count: number;
  alerts: CDSAlertItem[];
}

export interface DiagnosticOrderItem {
  test_code: string;
  test_name: string;
  category: DiagnosticCategory;
  priority?: DiagnosticPriority;
  clinical_indication: string;
}

export interface CPOEDiagnosticOrderPayload {
  patient_id: string;
  consultation_id?: string;
  tests: DiagnosticOrderItem[];
  ordering_doctor_name: string;
  ordering_doctor_pin: string;
  clinical_notes?: string;
}

export interface CPOEDiagnosticOrderResult {
  order_id: string;
  patient_id: string;
  ordered_at: string;
  status: string;
  tests_count: number;
  tests: DiagnosticOrderItem[];
  ordering_doctor: string;
  estimated_turnaround: string;
}

export interface DiagnosticResultItem {
  result_id: string;
  test_code: string;
  test_name: string;
  category: string;
  result_value: string;
  reference_range: string;
  is_abnormal: boolean;
  critical_flag?: string;
  completed_at: string;
  verified_by: string;
}

export interface PatientDiagnosticHistoryResult {
  patient_id: string;
  patient_name: string;
  pending_orders: CPOEDiagnosticOrderResult[];
  completed_results: DiagnosticResultItem[];
}

export interface InpatientAdmissionOrderPayload {
  patient_id: string;
  patient_name: string;
  consultation_id?: string;
  target_ward: string;
  admitting_diagnosis: string;
  admitting_icd10: string;
  priority?: AdmissionPriority;
  nursing_orders: string[];
  oxygen_therapy_order?: string;
  iv_fluid_regimen?: string;
  admitting_doctor_name: string;
  admitting_doctor_pin: string;
}

export interface InpatientAdmissionOrderResult {
  admission_order_id: string;
  patient_id: string;
  target_ward: string;
  status: string;
  admitting_diagnosis: string;
  admitting_icd10: string;
  priority: AdmissionPriority;
  ordered_at: string;
  admitting_doctor: string;
  confirmation_message: string;
}

export interface SpecialistReferralPayload {
  patient_id: string;
  patient_name: string;
  receiving_facility: string;
  receiving_specialty: string;
  referral_priority?: string;
  clinical_summary: string;
  working_diagnosis: string;
  icd10_code: string;
  current_medications?: string[];
  investigation_findings: string;
  reason_for_referral: string;
  referring_doctor_name: string;
  referring_doctor_pin: string;
}

export interface SpecialistReferralResult {
  referral_id: string;
  patient_id: string;
  receiving_facility: string;
  receiving_specialty: string;
  qr_verification_token: string;
  generated_at: string;
  referring_doctor: string;
  document_summary: string;
}

// ================= Hospital Finance & Revenue Cycle Management =================

export type ChargeCategory =
  | "OPD_REGISTRATION"
  | "DOCTOR_CONSULTATION"
  | "LABORATORY"
  | "IMAGING"
  | "WARD_BED_NIGHT"
  | "NURSING_PROCEDURE"
  | "MEDICATION";

export type FinancePaymentMethod = "CASH" | "MOMO" | "CARD" | "INSURANCE_DIRECT";
export type ShiftStatus = "OPEN" | "CLOSED";
export type ClaimStatus = "DRAFT" | "SUBMITTED" | "ADJUDICATING" | "REIMBURSED" | "REJECTED";

export interface PendingChargeItem {
  charge_id: string;
  patient_id: string;
  description: string;
  category: ChargeCategory;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_date: string;
  ordered_by: string;
  is_nhis_covered: boolean;
  nhis_tariff: number;
  co_pay_amount: number;
  patient_payable: number;
}

export interface PatientPendingChargesResponse {
  patient_id: string;
  patient_name: string;
  ghana_card: string;
  mrn: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  total_gross_unbilled: number;
  total_insurance_covered: number;
  total_patient_payable: number;
  charges: PendingChargeItem[];
}

export interface InvoiceGenerateRequest {
  patient_id: string;
  patient_name: string;
  selected_charge_ids?: string[];
  cashier_name: string;
  notes?: string;
}

export interface PatientInvoiceItem {
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  nhis_covered_amount: number;
  patient_portion: number;
}

export interface PatientInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  ghana_card: string;
  mrn: string;
  gross_amount: number;
  insurance_covered_amount: number;
  net_payable: number;
  status: string;
  created_at: string;
  items: PatientInvoiceItem[];
  payment_reference?: string;
}

export interface InvoicePaymentRequest {
  invoice_id: string;
  payment_method: FinancePaymentMethod;
  amount_tendered: number;
  momo_phone_number?: string;
  momo_network?: string;
  cashier_name: string;
}

export interface InvoicePaymentResponse {
  receipt_number: string;
  invoice_id: string;
  patient_name: string;
  amount_paid: number;
  amount_tendered: number;
  change_due: number;
  payment_method: FinancePaymentMethod;
  transaction_reference: string;
  paid_at: string;
  cashier_name: string;
  thermal_receipt_payload: string;
}

export interface OpenShiftRequest {
  cashier_name: string;
  cashier_id: string;
  opening_float: number;
  workstation_id?: string;
}

export interface CashierShiftResponse {
  shift_id: string;
  cashier_name: string;
  cashier_id: string;
  workstation_id: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at?: string;
  opening_float: number;
  total_cash_collected: number;
  total_momo_collected: number;
  total_card_collected: number;
  total_collections: number;
  expected_drawer_cash: number;
  transaction_count: number;
}

export interface CloseShiftRequest {
  declared_cash_count: number;
  closing_notes?: string;
}

export interface CloseShiftResponse {
  shift_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at: string;
  opening_float: number;
  expected_cash: number;
  declared_cash: number;
  discrepancy: number;
  status: string;
  total_momo: number;
  total_card: number;
  total_revenue: number;
  transactions_processed: number;
  summary_report: string;
}

export interface InsuranceClaimItem {
  claim_id: string;
  claim_batch_id: string;
  patient_name: string;
  ghana_card: string;
  nhis_number: string;
  diagnosis_icd10: string;
  service_rendered: string;
  claimed_amount: number;
  approved_amount?: number;
  status: ClaimStatus;
  submitted_date: string;
  adjudicated_date?: string;
  rejection_reason?: string;
}

export interface ClaimBatchCreateRequest {
  provider_name: string;
  claim_ids: string[];
  batch_notes?: string;
}

export interface ClaimBatchResponse {
  batch_id: string;
  provider_name: string;
  total_claims: number;
  total_claimed_amount: number;
  status: string;
  created_at: string;
}

export interface DepartmentRevenueItem {
  department: string;
  gross_revenue: number;
  percentage: number;
  patient_count: number;
}

export interface PaymentChannelBreakdown {
  channel: string;
  amount: number;
  percentage: number;
}

export interface HospitalRevenueAnalyticsResponse {
  period: string;
  total_gross_revenue: number;
  total_nhis_claims_receivable: number;
  total_out_of_pocket_cash: number;
  department_breakdown: DepartmentRevenueItem[];
  channel_breakdown: PaymentChannelBreakdown[];
  average_revenue_per_patient: number;
  daily_trends: Array<{ day: string; revenue: number }>;
}

// ================= Hospital Facility Governance & Admin =================

export type ShiftRosterType = "MORNING" | "AFTERNOON" | "NIGHT" | "ON_CALL";
export type TheatreStatus = "AVAILABLE" | "IN_USE" | "STERILIZATION" | "MAINTENANCE";
export type IncidentSeverity = "LOW" | "MODERATE" | "CRITICAL_SENTINEL";

export interface StaffMemberResponse {
  staff_id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: string;
  department: string;
  council_pin?: string;
  license_status: string;
  license_expiry?: string;
  is_active: boolean;
  is_on_duty: boolean;
}

export interface StaffInviteRequest {
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  council_pin?: string;
  license_expiry?: string;
  password?: string;
}

export interface StaffCredentialUpdateRequest {
  council_pin: string;
  license_expiry: string;
  is_on_duty?: boolean;
}

export interface ShiftRosterItem {
  roster_id: string;
  staff_id: string;
  staff_name: string;
  role: string;
  department: string;
  shift_date: string;
  shift_type: ShiftRosterType;
  start_time: string;
  end_time: string;
  status: string;
}

export interface CreateShiftRosterRequest {
  staff_id: string;
  staff_name: string;
  role: string;
  department: string;
  shift_date: string;
  shift_type: ShiftRosterType;
  start_time?: string;
  end_time?: string;
}

export interface DepartmentCapacityItem {
  department_id: string;
  name: string;
  head_of_department: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  active_nurses_on_shift: number;
}

export interface UpdateDepartmentBedsRequest {
  total_beds: number;
  head_of_department?: string;
}

export interface OperatingTheatreItem {
  theatre_id: string;
  theatre_name: string;
  theatre_type: string;
  status: TheatreStatus;
  current_procedure?: string;
  lead_surgeon?: string;
  next_available_time: string;
}

export interface TheatreStatusUpdateRequest {
  status: TheatreStatus;
  current_procedure?: string;
  lead_surgeon?: string;
  next_available_time?: string;
}

export interface HospitalTariffConfig {
  opd_registration_fee_ghs: number;
  general_consultation_fee_ghs: number;
  specialist_consultation_fee_ghs: number;
  emergency_triage_fee_ghs: number;
  general_ward_night_ghs: number;
  icu_bed_night_ghs: number;
  malaria_rdt_fee_ghs: number;
  fbc_lab_fee_ghs: number;
  nhis_consultation_gdrg_tariff: number;
  nhis_malaria_gdrg_tariff: number;
  nhis_fbc_gdrg_tariff: number;
  last_updated: string;
  updated_by: string;
}

export interface UpdateHospitalTariffRequest {
  opd_registration_fee_ghs?: number;
  general_consultation_fee_ghs?: number;
  specialist_consultation_fee_ghs?: number;
  emergency_triage_fee_ghs?: number;
  general_ward_night_ghs?: number;
  icu_bed_night_ghs?: number;
}

export interface PipelineStageItem {
  stage: string;
  count: number;
  avg_dwell_time_mins: number;
}

export interface ThroughputAnalyticsResponse {
  daily_patient_footfall: number;
  avg_triage_wait_time_mins: number;
  avg_consultation_duration_mins: number;
  bed_occupancy_rate_pct: number;
  on_duty_staff_count: number;
  today_gross_billing_ghs: number;
  pipeline_stages: PipelineStageItem[];
}

export interface ClinicalIncidentItem {
  incident_id: string;
  reported_at: string;
  department: string;
  severity: IncidentSeverity;
  incident_type: string;
  description: string;
  action_taken: string;
  reported_by: string;
  status: string;
}

export interface ClinicalIncidentCreateRequest {
  department: string;
  severity?: IncidentSeverity;
  incident_type: string;
  description: string;
  action_taken: string;
}

// ================= Patient Personal Health Record (PHR) & Care =================

export interface EmergencyICEProfile {
  blood_group: string;
  genotype: string;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  organ_donor: boolean;
  ice_token: string;
  qr_data_uri: string;
}

export interface EmergencyICEUpdateRequest {
  blood_group: string;
  genotype: string;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  organ_donor?: boolean;
}

export interface PublicICEResponse {
  full_name: string;
  ghana_card: string;
  blood_group: string;
  genotype: string;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  organ_donor: boolean;
  issued_by: string;
}

export interface DiagnosticReportItem {
  report_id: string;
  test_name: string;
  category: string;
  facility_name: string;
  ordered_by: string;
  order_date: string;
  completion_date: string;
  status: string;
  has_abnormal_flag: boolean;
  key_findings: string;
  download_url: string;
}

export interface VitalsLogItem {
  log_id: string;
  recorded_at: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_bpm?: number;
  blood_glucose_mg_dl?: number;
  temperature_c?: number;
  weight_kg?: number;
  source: string;
}

export interface VitalsLogCreateRequest {
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_bpm?: number;
  blood_glucose_mg_dl?: number;
  temperature_c?: number;
  weight_kg?: number;
}

export interface PatientAppointmentItem {
  appointment_id: string;
  facility_id: string;
  facility_name: string;
  department: string;
  doctor_name: string;
  scheduled_time: string;
  status: string;
  queue_number?: string;
  pre_checkin_completed: boolean;
}

export interface PatientAppointmentItemV2 {
  id?: string;
  appointment_id?: string;
  patient_id?: string;
  facility_id?: string;
  facility_name?: string;
  tenant_code?: string;
  facility?: { id?: string; name?: string; tenant_code?: string };
  department?: string;
  department_name?: string;
  service_name?: string;
  doctor_name?: string;
  doctor?: { id?: string; first_name?: string; last_name?: string; full_name?: string };
  scheduled_time?: string;
  scheduled_at?: string;
  appointment_date?: string;
  status?: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PENDING" | string;
  queue_pass?: string;
  queue_ticket?: string;
  queue_number?: number | string;
  card_number?: string;
  is_prechecked_in?: boolean;
  pre_checkin_completed?: boolean;
  checkin_completed_at?: string;
  reason?: string;
  notes?: string;
}

export interface ListPatientAppointmentsResponse {
  items: PatientAppointmentItemV2[];
  total?: number;
  upcoming?: number;
  page?: number;
  page_size?: number;
}

export interface CreatePatientAppointmentRequest {
  facility_id: string;
  department: string;
  doctor_id?: string;
  scheduled_time: string;
  reason?: string;
}

export interface CreatePatientAppointmentResponse {
  appointment_id: string;
  facility_name?: string;
  department?: string;
  scheduled_time?: string;
  status?: string;
  queue_pass?: string;
  queue_number?: number | string;
  message?: string;
}

export interface BookAppointmentRequest {
  facility_id: string;
  facility_name: string;
  department: string;
  doctor_name: string;
  scheduled_time: string;
  reason: string;
}

export interface PreCheckinRequest {
  appointment_id: string;
  symptoms_summary?: string;
}

export interface DependentProfileItem {
  dependent_id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  nhis_number?: string;
}

export interface AddDependentRequest {
  full_name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  nhis_number?: string;
}

export interface AdherenceScheduleItem {
  schedule_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  time_of_day: string;
  taken_today: boolean;
  streak_days: number;
}

export interface LogDoseTakenRequest {
  schedule_id: string;
  taken_at?: string;
}

export interface WalletTransactionItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  timestamp: string;
  status: string;
}

export interface PatientWalletResponse {
  wallet_id: string;
  balance_ghs: number;
  currency: string;
  nhis_active: boolean;
  nhis_number: string;
  private_insurance_provider?: string;
  private_insurance_policy?: string;
  recent_transactions: WalletTransactionItem[];
}

export interface WalletTopupRequest {
  amount_ghs: number;
  payment_method?: string;
  phone_number?: string;
}

export interface WalletTopupResponse {
  transaction_id: string;
  paystack_reference: string;
  authorization_url: string;
  amount_ghs: number;
  status: string;
}

// ================= Pharmacist Operations & Clinical POS =================

export type SafetyAlertSeverity = "LOW" | "MODERATE" | "HIGH_CONTRAINDICATION";
export type FulfillmentStage = "RECEIVED" | "PICKING" | "PACKED" | "DISPATCHED" | "COLLECTED";

export interface ClinicalSafetyAlertItem {
  alert_id: string;
  severity: SafetyAlertSeverity;
  title: string;
  message: string;
  recommendation: string;
}

export interface PrescriptionSafetyCheckRequest {
  patient_id?: string;
  patient_allergies?: string[];
  medications: string[];
  patient_age?: number;
  is_pregnant?: boolean;
}

export interface PrescriptionSafetyCheckResponse {
  is_safe_to_dispense: boolean;
  has_contraindications: boolean;
  alerts: ClinicalSafetyAlertItem[];
}

export interface GenericSubstituteItem {
  generic_name: string;
  brand_name: string;
  strength: string;
  manufacturer: string;
  stock_available: number;
  batch_number: string;
  expiry_date: string;
  price_ghs: number;
  is_cheaper: boolean;
  cost_difference_ghs: number;
}

export interface FEFODispenseItem {
  prescription_item_id: string;
  medication_name: string;
  generic_name: string;
  quantity_prescribed: number;
  batch_id: string;
  batch_number: string;
  batch_expiry: string;
  unit_price_ghs: number;
  total_price_ghs: number;
  instructions: string;
}

export interface FEFODispenseRequest {
  prescription_id: string;
  claim_pin: string;
  patient_name: string;
  pharmacist_name: string;
  pharmacist_council_pin: string;
  items: FEFODispenseItem[];
}

export interface PrintableRxLabelItem {
  label_id: string;
  pharmacy_name: string;
  pharmacy_phone: string;
  patient_name: string;
  medication_name: string;
  dosage_instructions: string;
  quantity_dispensed: string;
  batch_number: string;
  expiry_date: string;
  dispensed_by: string;
  dispense_date: string;
  caution_text: string;
  barcode_payload: string;
}

export interface FEFODispenseResponse {
  dispense_id: string;
  prescription_id: string;
  status: string;
  dispensed_at: string;
  total_amount_ghs: number;
  labels: PrintableRxLabelItem[];
}

export interface ControlledDrugLogRequest {
  drug_name: string;
  quantity_dispensed: number;
  batch_number: string;
  patient_name: string;
  patient_ghana_card: string;
  prescribing_doctor: string;
  doctor_mdc_pin: string;
  diagnosis_indication: string;
  superintendent_pharmacist?: string;
  approval_pin: string;
}

export interface ControlledDrugRegisterItem {
  entry_id: string;
  entry_date: string;
  drug_name: string;
  class_type: string;
  quantity_dispensed: number;
  batch_number: string;
  balance_in_safe: number;
  patient_name: string;
  patient_ghana_card: string;
  prescribing_doctor: string;
  doctor_mdc_pin: string;
  superintendent_signature: string;
  regulatory_status: string;
}

export interface FulfillmentOrderItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  fulfillment_stage: FulfillmentStage;
  total_amount_ghs: number;
  escrow_status: string;
  items: Array<{ name: string; quantity: number; batch?: string }>;
  created_at: string;
  collection_otp: string;
}

export interface PackOrderRequest {
  order_id: string;
  batch_lot_verified?: boolean;
  packer_name?: string;
}

export interface HandoverOrderRequest {
  order_id: string;
  otp_or_qr_code: string;
  pharmacist_name?: string;
}

export interface HandoverOrderResponse {
  order_id: string;
  order_number: string;
  status: string;
  escrow_released_ghs: number;
  payout_status: string;
}

// ================= Superintendent Regulatory & Compliance =================

export type PoisonClassType = "CLASS_A_NARCOTIC" | "CLASS_B_PSYCHOTROPIC" | "CLASS_C_RESTRICTED";
export type QuarantineReason = "FDA_RECALL" | "QUALITY_DEFECT" | "BATCH_EXPIRY" | "CONTAMINATION_SUSPICION";
export type QuarantineResolution = "RETURN_TO_SUPPLIER" | "WITNESSED_DESTRUCTION" | "QUALITY_RELEASE";
export type TemperatureExcursionLevel = "NORMAL" | "WARNING_LOW" | "WARNING_HIGH" | "CRITICAL_EXCURSION";
export type ADRReactionSeverity = "MILD" | "MODERATE" | "SEVERE_LIFE_THREATENING" | "FATAL";

export interface NarcoticsRegisterItem {
  entry_id: string;
  entry_date: string;
  substance_name: string;
  class_type: PoisonClassType;
  batch_number: string;
  quantity_dispensed: number;
  running_balance: number;
  patient_name: string;
  patient_ghana_card: string;
  prescribing_doctor: string;
  doctor_mdc_pin: string;
  clinical_indication: string;
  superintendent_name: string;
  superintendent_pin: string;
  is_authorized: boolean;
  audit_status: string;
}

export interface AuthorizeNarcoticsRequest {
  entry_id?: string;
  substance_name: string;
  quantity: number;
  batch_number: string;
  patient_name: string;
  patient_ghana_card: string;
  prescribing_doctor: string;
  doctor_mdc_pin: string;
  clinical_indication: string;
  superintendent_pin: string;
}

export interface NarcoticsExportResponse {
  export_id: string;
  export_format: string;
  facility_name: string;
  generated_at: string;
  total_entries: number;
  download_url: string;
}

export interface QuarantinedBatchItem {
  quarantine_id: string;
  medication_name: string;
  batch_number: string;
  quantity_quarantined: number;
  reason: QuarantineReason;
  supplier_name: string;
  supplier_debit_note?: string;
  quarantined_at: string;
  status: string;
  resolution?: QuarantineResolution;
  resolved_at?: string;
  superintendent_notes?: string;
}

export interface FreezeBatchRequest {
  batch_number: string;
  medication_name: string;
  quantity: number;
  reason: QuarantineReason;
  supplier_name: string;
  notes?: string;
  superintendent_pin: string;
}

export interface ResolveQuarantineRequest {
  quarantine_id: string;
  resolution: QuarantineResolution;
  witness_name?: string;
  debit_note_reference?: string;
  superintendent_pin: string;
}

export interface ColdChainLogItem {
  log_id: string;
  unit_name: string;
  recorded_at: string;
  shift: string;
  temperature_celsius: number;
  min_24h_celsius: number;
  max_24h_celsius: number;
  excursion_status: TemperatureExcursionLevel;
  logged_by: string;
  corrective_action?: string;
}

export interface LogTemperatureRequest {
  unit_name?: string;
  shift?: string;
  temperature_celsius: number;
  min_24h_celsius: number;
  max_24h_celsius: number;
  corrective_action?: string;
}

export interface ADRReportItem {
  report_id: string;
  patient_identifier: string;
  patient_age: number;
  patient_gender: string;
  suspected_drug: string;
  brand_name?: string;
  batch_number: string;
  adverse_reaction_description: string;
  severity: ADRReactionSeverity;
  onset_date: string;
  outcome: string;
  reported_by: string;
  fda_yellow_form_synced: boolean;
  created_at: string;
}

export interface FileADRRequest {
  patient_identifier: string;
  patient_age: number;
  patient_gender: string;
  suspected_drug: string;
  brand_name?: string;
  batch_number: string;
  adverse_reaction_description: string;
  severity: ADRReactionSeverity;
  onset_date: string;
  outcome?: string;
}

export interface CompoundingLogItem {
  compound_id: string;
  formula_name: string;
  active_ingredients: string[];
  batch_quantity_prepared: string;
  prepared_date: string;
  beyond_use_date: string;
  pharmacist_compiler: string;
  superintendent_verifier: string;
  storage_conditions: string;
}

// ================= Hospital Record Clerk & Reception Desk =================

export type ClinicDepartment =
  | "GENERAL_OPD"
  | "ANTENATAL"
  | "EYE_CLINIC"
  | "PEDIATRICS"
  | "EMERGENCY"
  | "DENTAL"
  | "SURGICAL_OPD";

export type ReceptionTriagePriority = "ROUTINE" | "PRIORITY" | "EMERGENCY";

export type FolderStatus =
  | "IN_ARCHIVE"
  | "CHECKED_OUT"
  | "IN_TRANSIT"
  | "MISSING";

export type NHISStatus = "ACTIVE" | "EXPIRED" | "UNVERIFIED" | "EXEMPT";

export interface DeduplicationWarning {
  match_field: string;
  similarity_score: number;
  matched_patient_id: string;
  matched_mrn: string;
  matched_full_name: string;
  matched_phone?: string;
  warning_message: string;
}

export interface PatientMasterSearchResult {
  patient_id: string;
  user_id: string;
  full_name: string;
  mrn: string;
  ghana_card_id?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  nhis_number?: string;
  nhis_status: NHISStatus;
  physical_folder_rack?: string;
  physical_folder_shelf?: string;
  folder_status: FolderStatus;
  registration_fee_paid: boolean;
  is_trauma_temporary: boolean;
  qr_token: string;
  deduplication_warnings: DeduplicationWarning[];
}

export interface ReceptionPatientRegisterInput {
  full_name: string;
  phone?: string;
  email?: string;
  ghana_card_id?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  nhis_number?: string;
  nhis_status?: NHISStatus;
  physical_folder_rack?: string;
  physical_folder_shelf?: string;
  destination_clinic?: ClinicDepartment;
  priority?: ReceptionTriagePriority;
  auto_dispatch_queue?: boolean;
}

export interface ReceptionPatientRegisterResult {
  patient_id: string;
  user_id: string;
  hospital_card_id: string;
  full_name: string;
  mrn: string;
  ghana_card_id?: string;
  phone?: string;
  nhis_number?: string;
  nhis_status: NHISStatus;
  physical_folder_rack: string;
  physical_folder_shelf: string;
  qr_token: string;
  registration_fee_waived: boolean;
  fee_amount: number;
  queue_ticket?: string;
  queue_id?: string;
  destination_clinic?: ClinicDepartment;
  created_at: string;
  deduplication_warnings: DeduplicationWarning[];
}

export interface EmergencyTraumaIntakeInput {
  gender_estimate?: string;
  approximate_age_group?: string;
  identifying_marks_or_clothing?: string;
  brought_in_by?: string;
  ambulance_call_sign?: string;
  trauma_notes?: string;
  blood_group?: string;
  initial_triage_bay?: string;
}

export interface EmergencyTraumaIntakeResult {
  patient_id: string;
  hospital_card_id: string;
  temporary_name: string;
  mrn: string;
  trauma_code: string;
  queue_id: string;
  queue_number: string;
  destination_clinic: ClinicDepartment;
  priority: ReceptionTriagePriority;
  is_trauma_temporary: boolean;
  wristband_barcode_data: string;
  checked_in_at: string;
  fee_amount: number;
  registration_fee_waived: boolean;
}

export interface MergePatientRecordsInput {
  primary_patient_id: string;
  secondary_patient_id: string;
  merge_reason: string;
  confirm_data_override?: boolean;
}

export interface MergePatientRecordsResult {
  primary_patient_id: string;
  primary_mrn: string;
  merged_patient_name: string;
  secondary_patient_id: string;
  secondary_mrn: string;
  consultations_transferred: number;
  vitals_transferred: number;
  queue_entries_transferred: number;
  prescriptions_transferred: number;
  folder_transits_transferred: number;
  merged_at: string;
  message: string;
}

export interface QueueDispatchInput {
  patient_id?: string;
  mrn_or_identifier?: string;
  destination_clinic?: ClinicDepartment;
  priority?: ReceptionTriagePriority;
  is_nhis_covered?: boolean;
  consulting_room_target?: string;
}

export interface QueueDispatchResult {
  queue_id: string;
  queue_number: string;
  patient_id: string;
  patient_name: string;
  mrn: string;
  destination_clinic: ClinicDepartment;
  priority: ReceptionTriagePriority;
  registration_fee_waived: boolean;
  fee_amount: number;
  estimated_wait_minutes: number;
  checked_in_at: string;
}

export interface ActiveQueueItem {
  queue_id: string;
  queue_number: string;
  patient_id: string;
  hospital_card_id: string;
  patient_name: string;
  mrn: string;
  ghana_card_id?: string;
  gender?: string;
  destination_clinic: ClinicDepartment;
  priority: ReceptionTriagePriority;
  status: string;
  checked_in_at: string;
  wait_duration_minutes: number;
  fee_waiver_badge: string;
  consulting_room?: string;
}

export interface TVCalledTicket {
  ticket_number: string;
  patient_display_name: string;
  destination_clinic: ClinicDepartment;
  consulting_room: string;
  priority: ReceptionTriagePriority;
  called_at: string;
  status: string;
}

export interface DepartmentQueueSummary {
  department: ClinicDepartment;
  department_name: string;
  waiting_count: number;
  current_serving_ticket?: string;
  average_wait_minutes: number;
}

export interface QueueTVDisplayData {
  facility_name: string;
  current_time: string;
  total_waiting: number;
  now_calling: TVCalledTicket[];
  departments_summary: DepartmentQueueSummary[];
  recent_calls: TVCalledTicket[];
}

export interface FolderTransitInput {
  mrn: string;
  action: "CHECK_OUT" | "RETURN";
  destination_department?: string;
  checked_out_to_doctor?: string;
  notes?: string;
}

export interface FolderTransitLogResult {
  transit_id: string;
  mrn: string;
  patient_name: string;
  rack_location: string;
  shelf_location: string;
  action: string;
  destination_department: string;
  checked_out_to?: string;
  status: FolderStatus;
  logged_at: string;
  message: string;
}

export interface FolderLedgerItem {
  transit_id: string;
  hospital_card_id: string;
  mrn: string;
  patient_name: string;
  rack: string;
  shelf: string;
  status: FolderStatus;
  current_location: string;
  checked_out_to?: string;
  checked_out_at?: string;
  duration_hours?: number;
  is_overdue: boolean;
  overdue_alert?: string;
}

export interface WristbandPrintData {
  patient_id: string;
  mrn: string;
  full_name: string;
  date_of_birth?: string;
  age_gender: string;
  blood_group: string;
  allergies: string;
  emergency_contact: string;
  ghana_card_id?: string;
  barcode_data: string;
  qr_data: string;
  facility_name: string;
  printed_at: string;
  is_emergency_trauma: boolean;
}

export interface QueueTicketPrintData {
  ticket_id: string;
  ticket_number: string;
  facility_name: string;
  destination_clinic: string;
  priority_level: string;
  patient_name: string;
  mrn: string;
  qr_pass_data: string;
  fee_status: string;
  fee_amount: string;
  issue_time: string;
  instructions: string;
}

// ================= Pharmacy Admin & Procurement Module =================

export type SupplierCreditTerms =
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "NET_60"
  | "CASH_ON_DELIVERY"
  | "PREPAYMENT";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type StockTransferStatus =
  | "DRAFT"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "REJECTED";

export type DrugCategory =
  | "POM"
  | "OTC"
  | "CONTROLLED"
  | "COSMETICS"
  | "DEVICES";

export interface PharmacySupplier {
  id: string;
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  credit_terms: SupplierCreditTerms;
  credit_limit_ghs: number;
  lead_time_days: number;
  rating: number;
  total_spend_ghs: number;
  is_active: boolean;
  created_at: string;
}

export interface SupplierCreateInput {
  name: string;
  code?: string;
  contact_person: string;
  email: string;
  phone: string;
  address?: string;
  credit_terms?: SupplierCreditTerms;
  credit_limit_ghs?: number;
  lead_time_days?: number;
  is_active?: boolean;
}

export interface ReorderSuggestionItem {
  medication_name: string;
  generic_name: string;
  category: DrugCategory;
  current_stock: number;
  reorder_threshold: number;
  monthly_sales_velocity: number;
  suggested_reorder_qty: number;
  estimated_unit_cost_ghs: number;
  estimated_total_cost_ghs: number;
  primary_supplier_name: string;
  lead_time_days: number;
  stockout_risk_level: "CRITICAL" | "HIGH" | "MODERATE";
}

export interface ReorderSuggestionsData {
  total_items_below_threshold: number;
  total_suggested_cost_ghs: number;
  critical_stockout_count: number;
  items: ReorderSuggestionItem[];
}

export interface PurchaseOrderItemInput {
  medication_name: string;
  sku?: string;
  generic_name?: string;
  quantity_ordered: number;
  unit_cost_ghs: number;
}

export interface PurchaseOrderCreateInput {
  supplier_id: string;
  supplier_name: string;
  expected_delivery_date: string;
  notes?: string;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItem {
  id: string;
  medication_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_ghs: number;
  total_cost_ghs: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  total_amount_ghs: number;
  created_by_name: string;
  approved_by_name?: string;
  expected_delivery_date: string;
  created_at: string;
  items_count: number;
  items: PurchaseOrderItem[];
}

export interface GoodsReceivedNoteItemInput {
  medication_name: string;
  sku: string;
  batch_number: string;
  expiry_date: string;
  quantity_received: number;
  unit_cost_ghs: number;
  suggested_retail_price_ghs: number;
}

export interface GoodsReceivedNoteInput {
  purchase_order_id: string;
  invoice_number: string;
  received_by_name?: string;
  supplier_delivery_note?: string;
  items: GoodsReceivedNoteItemInput[];
}

export interface GoodsReceivedNoteResult {
  grn_id: string;
  grn_number: string;
  po_number: string;
  supplier_name: string;
  total_value_received_ghs: number;
  items_received_count: number;
  inventory_batches_created: number;
  received_at: string;
  message: string;
}

export interface StockTransferItemInput {
  medication_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost_ghs: number;
}

export interface StockTransferCreateInput {
  destination_branch_name: string;
  destination_branch_id?: string;
  transfer_type?: string;
  notes?: string;
  items: StockTransferItemInput[];
}

export interface StockTransferItem {
  id: string;
  medication_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost_ghs: number;
  total_value_ghs: number;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  source_branch: string;
  destination_branch: string;
  status: StockTransferStatus;
  total_items_count: number;
  total_value_ghs: number;
  dispatched_by: string;
  dispatched_at: string;
  received_at?: string;
  driver_or_courier_name?: string;
  items: StockTransferItem[];
}

export interface CategoryMarkupRule {
  category: DrugCategory;
  category_name: string;
  target_markup_percentage: number;
  minimum_gross_margin_percentage: number;
  allow_discount: boolean;
  rounding_rule: string;
}

export interface PatientDiscountTier {
  tier_id: string;
  tier_name: string;
  discount_percentage: number;
  is_active: boolean;
}

export interface PricingRulesData {
  default_markup_percentage: number;
  category_rules: CategoryMarkupRule[];
  patient_discount_tiers: PatientDiscountTier[];
  tax_rate_percentage: number;
}

export interface UpdatePricingRulesInput {
  default_markup_percentage: number;
  category_rules: CategoryMarkupRule[];
  patient_discount_tiers: PatientDiscountTier[];
}

export interface BulkMarkupApplyInput {
  category: DrugCategory;
  unit_cost_ghs: number;
}

export interface BulkMarkupApplyResult {
  category: DrugCategory;
  unit_cost_ghs: number;
  markup_percentage: number;
  calculated_retail_price_ghs: number;
  gross_margin_percentage: number;
  pesewas_rounded: boolean;
}

export interface CycleCountItemInput {
  inventory_batch_id: string;
  medication_name: string;
  batch_number: string;
  system_quantity: number;
  physical_counted_quantity: number;
  unit_cost_ghs: number;
}

export interface CycleCountSubmitInput {
  audit_name: string;
  counted_by: string;
  approved_by?: string;
  notes?: string;
  items: CycleCountItemInput[];
}

export interface CycleCountVarianceItem {
  inventory_batch_id: string;
  medication_name: string;
  batch_number: string;
  system_qty: number;
  physical_qty: number;
  variance_units: number;
  variance_value_ghs: number;
  status: "MATCH" | "DEFICIT_SHRINKAGE" | "SURPLUS";
}

export interface CycleCountAudit {
  audit_id: string;
  audit_code: string;
  audit_name: string;
  counted_by: string;
  conducted_at: string;
  total_lines_counted: number;
  total_variance_units: number;
  net_financial_variance_ghs: number;
  shrinkage_loss_ghs: number;
  surplus_gain_ghs: number;
  reconciled_status: string;
  variances: CycleCountVarianceItem[];
}

export interface PharmacyAdminOverviewMetrics {
  facility_name: string;
  total_inventory_valuation_cost_ghs: number;
  total_inventory_valuation_retail_ghs: number;
  thirty_day_gross_margin_percentage: number;
  active_stockout_alerts_count: number;
  low_stock_items_count: number;
  pending_purchase_orders_count: number;
  in_transit_transfers_count: number;
  monthly_sales_revenue_ghs: number;
  currency: string;
  stock_valuation?: number;
  retail_value?: number;
  gross_margin_pct?: number;
  stockout_count?: number;
  low_stock_count?: number;
  pending_po_count?: number;
  in_transit_ibt_count?: number;
}

export interface ExtendedPharmacySettings {
  facility_id: string;
  name: string;
  slug: string;
  license_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  operating_hours: string;
  default_reorder_threshold: number;
  max_cash_in_drawer_limit_ghs: number;
  thermal_receipt_header: string;
  thermal_receipt_footer: string;
  auto_reorder_alert_enabled: boolean;
  momo_network: string;
  momo_account_number: string;
  momo_account_name: string;
  payout_schedule: string;
}

export interface UpdateExtendedPharmacySettingsInput {
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  operating_hours?: string;
  default_reorder_threshold?: number;
  max_cash_in_drawer_limit_ghs?: number;
  thermal_receipt_header?: string;
  thermal_receipt_footer?: string;
  auto_reorder_alert_enabled?: boolean;
  momo_network?: string;
  momo_account_number?: string;
  momo_account_name?: string;
}

// ==========================================
// Multi-Country West Africa Payment & Subscription Billing
// ==========================================

export type SubscriptionPlanTier = "STARTER" | "GROWTH" | "ENTERPRISE";

export interface SubscriptionPlanItem {
  id: string;
  code: string;
  name: string;
  tier: SubscriptionPlanTier;
  description: string;
  price_ghs_monthly: number;
  price_xof_monthly: number;
  price_ghs_annual: number;
  price_xof_annual: number;
  features: string[];
  max_staff_seats: number;
  max_branches: number;
  includes_cpoe: boolean;
  includes_escrow: boolean;
  includes_telemetry: boolean;
  is_active: boolean;
}

export interface TenantSubscriptionMatrixItem {
  tenant_id: string;
  facility_name: string;
  facility_type: string;
  country: string;
  currency: string;
  plan_code: string;
  plan_name: string;
  billing_interval: string;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "RESTRICTED_LOCKED" | "SUSPENDED";
  days_overdue: number;
  is_locked: boolean;
  momo_phone: string;
  momo_network: string;
  next_billing_date: string;
  last_payment_date: string;
  last_amount_paid: number;
  contact_email: string;
}

export interface RecurringCollectionResult {
  collection_batch_id: string;
  total_tenants_processed: number;
  total_collected_ghs: number;
  total_collected_xof: number;
  successful_charges: number;
  failed_charges: number;
  dunning_lockouts_applied: number;
  executed_at: string;
  details: Array<{
    tenant_id: string;
    facility_name: string;
    country: string;
    currency: string;
    amount: number;
    momo_phone?: string;
    network?: string;
    tx_ref?: string;
    gateway?: string;
    status: string;
    is_locked?: boolean;
  }>;
}

export interface MultiCountryMoMoChargeRequest {
  country: "GH" | "TG" | "BJ" | string;
  currency: "GHS" | "XOF" | string;
  amount: number;
  phone: string;
  network: string;
  customer_name?: string;
  customer_email?: string;
  invoice_number?: string;
  order_id?: string;
  description?: string;
}

export interface MultiCountryMoMoChargeResponse {
  transaction_reference: string;
  gateway: "PAYSTACK" | "FEDAPAY" | "HUB2" | string;
  country: string;
  currency: string;
  amount: number;
  phone: string;
  network: string;
  network_display_name: string;
  status: string;
  ussd_prompt_instruction: string;
  qr_verification_payload: string;
  checkout_url?: string;
  created_at: string;
}

export interface MoMoStatusCheckResponse {
  transaction_reference: string;
  status: "PENDING_USER_ACTION" | "PROCESSING" | "SUCCESS" | "FAILED" | string;
  amount: number;
  currency: string;
  gateway: string;
  phone: string;
  network: string;
  is_paid: boolean;
  paid_at?: string;
  receipt_ready: boolean;
  receipt_data?: {
    receipt_number: string;
    transaction_reference: string;
    invoice_number: string;
    customer_name: string;
    phone_number?: string;
    payment_network?: string;
    payment_gateway?: string;
    amount_paid: number;
    currency: string;
    payment_date: string;
    cashier_name: string;
    qr_verification_code: string;
    tax_inclusive: boolean;
    vat_amount: number;
  };
}

export interface MoMoSweepRequest {
  amount?: number;
  momo_phone?: string;
  network?: string;
  currency?: string;
  country?: string;
}

// ==========================================
// Dynamic Plan Builder & Gateway Config Types
// ==========================================

export interface SubscriptionPlanDetail {
  id: string;
  code: string;
  name: string;
  tier: "STARTER" | "GROWTH" | "ENTERPRISE" | "CUSTOM" | string;
  target_facility_type: "ALL" | "HOSPITAL" | "CLINIC" | "PHARMACY" | string;
  description: string;
  price_ghs_monthly: number;
  price_xof_monthly: number;
  price_usd_monthly: number;
  price_ghs_annual: number;
  price_xof_annual: number;
  price_usd_annual: number;
  trial_days: number;
  max_staff_seats: number;
  max_beds: number;
  max_monthly_rx: number;
  max_branches: number;
  features: string[];
  feature_flags: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionPlanInput {
  code: string;
  name: string;
  tier?: string;
  target_facility_type?: string;
  description: string;
  price_ghs_monthly: number;
  price_xof_monthly: number;
  price_usd_monthly?: number;
  price_ghs_annual: number;
  price_xof_annual: number;
  price_usd_annual?: number;
  trial_days?: number;
  max_staff_seats?: number;
  max_beds?: number;
  max_monthly_rx?: number;
  max_branches?: number;
  features?: string[];
  feature_flags?: Record<string, boolean>;
  is_active?: boolean;
}

export interface UpdateSubscriptionPlanInput {
  name?: string;
  tier?: string;
  target_facility_type?: string;
  description?: string;
  price_ghs_monthly?: number;
  price_xof_monthly?: number;
  price_usd_monthly?: number;
  price_ghs_annual?: number;
  price_xof_annual?: number;
  price_usd_annual?: number;
  trial_days?: number;
  max_staff_seats?: number;
  max_beds?: number;
  max_monthly_rx?: number;
  max_branches?: number;
  features?: string[];
  feature_flags?: Record<string, boolean>;
  is_active?: boolean;
}

export interface GatewaySmartRouteRule {
  network: string;
  country: string;
  currency: string;
  gateway_id: string;
  is_fallback?: boolean;
}

export interface GatewayConfigItem {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  environment: "sandbox" | "live" | string;
  public_key: string;
  encrypted_secret_key: string;
  webhook_secret?: string;
  supported_currencies: string[];
  supported_countries: string[];
  routing_rules: GatewaySmartRouteRule[];
  priority: number;
  last_ping_status?: string;
  last_ping_at?: string;
}

export interface UpdateGatewayConfigInput {
  name?: string;
  is_active?: boolean;
  environment?: string;
  public_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  supported_currencies?: string[];
  supported_countries?: string[];
  routing_rules?: GatewaySmartRouteRule[];
  priority?: number;
}

export interface TestGatewayConnectionResult {
  gateway_id: string;
  status: string;
  environment: string;
  latency_ms: number;
  message: string;
  timestamp: string;
}

export interface TenantBillingPolicyItem {
  tenant_id: string;
  facility_name: string;
  facility_type: string;
  standard_commission_pct: number;
  custom_commission_pct?: number | null;
  effective_commission_pct: number;
  grace_period_days: number;
  discount_pct: number;
  auto_payout_sweep_enabled: boolean;
  min_payout_sweep_amount: number;
  notes?: string;
  updated_at: string;
}

export interface UpdateTenantBillingPolicyInput {
  custom_commission_pct?: number | null;
  grace_period_days?: number;
  discount_pct?: number;
  auto_payout_sweep_enabled?: boolean;
  min_payout_sweep_amount?: number;
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CustomInvoiceInput {
  tenant_id: string;
  invoice_title?: string;
  amount: number;
  currency?: string;
  due_date: string;
  billing_period: string;
  line_items?: InvoiceLineItem[];
  notes?: string;
  send_momo_prompt?: boolean;
  momo_phone?: string;
  momo_network?: string;
}

export interface CustomInvoiceResult {
  invoice_id: string;
  invoice_number: string;
  tenant_id: string;
  facility_name: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  billing_period: string;
  line_items: InvoiceLineItem[];
  momo_prompt_sent: boolean;
  tx_reference?: string;
  issued_at: string;
}

// ==========================================
// Hospital Admin Billing, Gateways & Tariffs
// ==========================================

export interface FacilityGatewayConfig {
  facility_id: string;
  facility_name: string;
  gateway_mode: "PLATFORM_ESCROW" | "DIRECT_SUBACCOUNT" | string;
  primary_gateway: "PAYSTACK" | "FEDAPAY" | "HUB2" | string;
  subaccount_code?: string;
  payout_network: string;
  payout_account_number: string;
  payout_account_name: string;
  payout_bank_code?: string;
  enable_ussd_push: boolean;
  allow_split_tender: boolean;
  fee_bearer: "PATIENT" | "HOSPITAL" | string;
  max_cashier_drawer_limit: number;
  auto_payout_schedule: "DAILY" | "WEEKLY" | "MANUAL" | string;
  is_verified: boolean;
  last_tested_at?: string;
}

export interface UpdateFacilityGatewayConfigInput {
  gateway_mode?: string;
  primary_gateway?: string;
  subaccount_code?: string;
  payout_network?: string;
  payout_account_number?: string;
  payout_account_name?: string;
  payout_bank_code?: string;
  enable_ussd_push?: boolean;
  allow_split_tender?: boolean;
  fee_bearer?: string;
  max_cashier_drawer_limit?: number;
  auto_payout_schedule?: string;
}

export interface TestPayoutPingResult {
  status: string;
  facility_id: string;
  payout_network: string;
  account_number: string;
  account_name: string;
  latency_ms: number;
  message: string;
  timestamp: string;
}

export interface HospitalServiceTariffItem {
  id: string;
  service_code: string;
  name: string;
  category: "REGISTRATION" | "CONSULTATION" | "LABORATORY" | "WARD_STAY" | "PROCEDURE" | "PHARMACY" | string;
  department: string;
  base_price: number;
  currency: string;
  nhis_covered: boolean;
  nhis_tariff_amount: number;
  patient_copay: number;
  is_emergency_waiver_eligible: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface CreateHospitalServiceTariffInput {
  service_code: string;
  name: string;
  category: string;
  department: string;
  base_price: number;
  currency?: string;
  nhis_covered?: boolean;
  nhis_tariff_amount?: number;
  patient_copay?: number;
  is_emergency_waiver_eligible?: boolean;
  is_active?: boolean;
}

export interface UpdateHospitalServiceTariffInput {
  name?: string;
  category?: string;
  department?: string;
  base_price?: number;
  currency?: string;
  nhis_covered?: boolean;
  nhis_tariff_amount?: number;
  patient_copay?: number;
  is_emergency_waiver_eligible?: boolean;
  is_active?: boolean;
}

export interface BulkTariffAdjustmentInput {
  category?: string;
  percentage_change: number;
  round_to_nearest?: number;
}

export interface CorporateInsuranceAccountItem {
  id: string;
  account_name: string;
  account_code: string;
  account_type: "PRIVATE_INSURANCE_HMO" | "CORPORATE_EMPLOYER" | "EMBASSY_NGO" | string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  payment_terms_days: number;
  discount_pct: number;
  status: "ACTIVE" | "ON_HOLD" | "SUSPENDED" | string;
  last_invoice_date?: string;
}

export interface CreateCorporateAccountInput {
  account_name: string;
  account_code: string;
  account_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  payment_terms_days?: number;
  discount_pct?: number;
  status?: string;
}

export interface UpdateCorporateAccountInput {
  account_name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  credit_limit?: number;
  payment_terms_days?: number;
  discount_pct?: number;
  status?: string;
}

export interface StatementOfAccountResult {
  account_id: string;
  account_name: string;
  generated_at: string;
  statement_period: string;
  opening_balance: number;
  total_claims_billed: number;
  total_payments_received: number;
  closing_balance: number;
  claims_count: number;
  download_url: string;
}

export interface CashierShiftAuditItem {
  shift_id: string;
  cashier_name: string;
  cashier_email: string;
  opened_at: string;
  closed_at: string;
  opening_float: number;
  system_cash_expected: number;
  cashier_declared_cash: number;
  discrepancy_amount: number;
  discrepancy_type: "BALANCED" | "OVERAGE" | "SHORTAGE" | string;
  momo_collected: number;
  insurance_billed: number;
  total_revenue: number;
  supervisor_signed_off: boolean;
  supervisor_name?: string;
  supervisor_notes?: string;
}

export type UnpaidFolioStatus = "UNPAID" | "PARTIAL" | "SETTLED" | "OVERPAID" | "PENDING" | "VOID";

export interface UnpaidFolioItem {
  folio_id: string;
  patient_name: string;
  patient_mrn?: string;
  cashier_name: string;
  total_amount: number;
  amount_paid?: number;
  outstanding: number;
  status: UnpaidFolioStatus;
  payment_method?: FinancePaymentMethod;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// ==========================================
// Pharmacy Admin Billing, Dynamic Markups & Payouts
// ==========================================

export interface PharmacyGatewayConfig {
  facility_id: string;
  facility_name: string;
  gateway_mode: "PLATFORM_ESCROW" | "DIRECT_SUBACCOUNT" | string;
  primary_gateway: "PAYSTACK" | "FEDAPAY" | "HUB2" | string;
  subaccount_code?: string;
  payout_network: string;
  payout_account_number: string;
  payout_account_name: string;
  payout_bank_code?: string;
  enable_ussd_push: boolean;
  allow_split_tender: boolean;
  fee_bearer: "MERCHANT" | "PATIENT" | string;
  auto_payout_schedule: "DAILY_AUTOMATED_SWEEP" | "WEEKLY" | "MANUAL" | string;
  max_cashier_drawer_limit: number;
  escrow_available_balance: number;
  escrow_pending_balance: number;
  currency: string;
  is_verified: boolean;
  last_payout_at?: string;
}

export interface UpdatePharmacyGatewayConfigInput {
  gateway_mode?: string;
  primary_gateway?: string;
  subaccount_code?: string;
  payout_network?: string;
  payout_account_number?: string;
  payout_account_name?: string;
  payout_bank_code?: string;
  enable_ussd_push?: boolean;
  allow_split_tender?: boolean;
  fee_bearer?: string;
  auto_payout_schedule?: string;
  max_cashier_drawer_limit?: number;
}

export interface TestPharmacyPayoutPingResult {
  status: string;
  facility_id: string;
  payout_network: string;
  account_number: string;
  account_name: string;
  latency_ms: number;
  message: string;
  timestamp: string;
}

export interface RequestInstantPayoutInput {
  amount: number;
  payout_destination?: string;
  notes?: string;
}

export interface RequestInstantPayoutResult {
  payout_id: string;
  amount: number;
  currency: string;
  destination_network: string;
  destination_account: string;
  status: string;
  tx_reference: string;
  remaining_escrow_balance: number;
  timestamp: string;
}

export interface PharmacyPricingRules {
  pom_markup_pct: number;
  otc_markup_pct: number;
  surgicals_markup_pct: number;
  supplements_markup_pct: number;
  controlled_markup_pct: number;
  vat_tax_rate_pct: number;
  enable_vat_on_receipts: boolean;
  max_cashier_discount_pct: number;
  enable_prescriber_loyalty_split: boolean;
  rounding_mode: "NEAREST_10_PESEWAS" | "EXACT" | "ROUND_UP" | string;
  currency: string;
  updated_at?: string;
}

export interface UpdatePharmacyPricingRulesInput {
  pom_markup_pct?: number;
  otc_markup_pct?: number;
  surgicals_markup_pct?: number;
  supplements_markup_pct?: number;
  controlled_markup_pct?: number;
  vat_tax_rate_pct?: number;
  enable_vat_on_receipts?: boolean;
  max_cashier_discount_pct?: number;
  enable_prescriber_loyalty_split?: boolean;
  rounding_mode?: string;
}

export interface ApplyBatchPricingInput {
  category?: string;
  round_prices?: boolean;
}

export interface ApplyBatchPricingResult {
  status: string;
  category_applied: string;
  batches_updated_count: number;
  average_margin_pct: number;
  message: string;
  applied_at: string;
}

export interface PharmacyCorporateDebtorItem {
  id: string;
  company_name: string;
  account_code: string;
  account_type: "PRIVATE_HMO" | "CORPORATE_EMPLOYER" | "EMBASSY_NGO" | string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  current_outstanding_debt: number;
  available_credit: number;
  payment_terms_days: number;
  discount_pct: number;
  status: "ACTIVE" | "ON_HOLD" | "SUSPENDED" | string;
  last_payment_date?: string;
  last_statement_generated_at?: string;
}

export interface CreatePharmacyCorporateDebtorInput {
  company_name: string;
  account_code: string;
  account_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  payment_terms_days?: number;
  discount_pct?: number;
  status?: string;
}

export interface UpdatePharmacyCorporateDebtorInput {
  company_name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  credit_limit?: number;
  payment_terms_days?: number;
  discount_pct?: number;
  status?: string;
}

export interface RecordDebtorPaymentInput {
  amount_paid: number;
  payment_method?: string;
  reference_number: string;
  notes?: string;
}

export interface RecordDebtorPaymentResult {
  status: string;
  debtor_id: string;
  company_name: string;
  amount_paid: number;
  previous_debt: number;
  new_outstanding_debt: number;
  new_available_credit: number;
  receipt_number: string;
  paid_at: string;
}

export interface PharmacyDebtorStatementResult {
  debtor_id: string;
  company_name: string;
  statement_period: string;
  opening_balance: number;
  total_prescriptions_billed: number;
  total_payments_credited: number;
  closing_balance: number;
  prescriptions_count: number;
  download_url: string;
  generated_at: string;
}

export interface PharmacyCashierShiftAuditItem {
  shift_id: string;
  cashier_name: string;
  cashier_email: string;
  terminal_id: string;
  opened_at: string;
  closed_at: string;
  opening_float: number;
  system_expected_cash: number;
  cashier_declared_cash: number;
  cash_discrepancy_amount: number;
  discrepancy_status: "BALANCED" | "OVERAGE" | "SHORTAGE" | string;
  momo_collected_amount: number;
  insurance_co_pay_billed: number;
  total_shift_sales: number;
  supervisor_signed_off: boolean;
  supervisor_name?: string;
  notes?: string;
}

// ==========================================
// Clinical Acceleration & Acceleration Types
// ==========================================

export interface SOAPMacroTemplate {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PrescriptionMacroItem {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface ClinicalMacro {
  id: string;
  macro_name: string;
  specialty: string;
  icd10_code: string;
  diagnosis_title: string;
  default_soap_template: SOAPMacroTemplate;
  default_prescription_items: PrescriptionMacroItem[];
  default_lab_orders?: string[];
  is_active: boolean;
}

export interface CreateClinicalMacroInput {
  macro_name: string;
  specialty?: string;
  icd10_code: string;
  diagnosis_title: string;
  default_soap_template: SOAPMacroTemplate;
  default_prescription_items: PrescriptionMacroItem[];
  default_lab_orders?: string[];
}

export interface VitalTrendPoint {
  recorded_at: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  spo2?: number;
  mews_score: number;
  mews_severity: "NORMAL" | "WARNING" | "CRITICAL" | string;
}

export interface LabTrendPoint {
  recorded_at: string;
  test_name: string;
  result_value: number;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
}

export interface PatientLongitudinalTrends {
  patient_id: string;
  patient_name: string;
  mrn: string;
  vitals_history: VitalTrendPoint[];
  hb_history: LabTrendPoint[];
  rbs_history: LabTrendPoint[];
  creatinine_history: LabTrendPoint[];
}

export interface StatNursingOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  mrn: string;
  doctor_name: string;
  consultation_id?: string;
  instruction: string;
  urgency: "STAT" | "URGENT" | "ROUTINE" | string;
  status: "PENDING" | "EXECUTED" | "CANCELLED" | string;
  issued_at: string;
  executed_by_nurse_name?: string;
  executed_at?: string;
  execution_notes?: string;
}

export interface CreateStatNursingOrderInput {
  patient_id: string;
  consultation_id?: string;
  instruction: string;
  urgency?: "STAT" | "URGENT" | "ROUTINE" | string;
  notes?: string;
}

export interface ExecuteStatNursingOrderInput {
  execution_notes?: string;
}

// ================= Infrastructure, DLQ & Security Types =================

export interface GatewayHealthMetric {
  provider: string;
  name: string;
  region: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN" | string;
  latency_ms: number;
  uptime_percent: number;
  error_rate_percent: number;
  last_checked: string;
  auto_failover_enabled: boolean;
  active_fallback_provider?: string | null;
}

export interface GatewayHealthResponse {
  gateways: GatewayHealthMetric[];
  system_status: string;
  auto_failover_active: boolean;
  last_updated: string;
}

export interface FailoverUpdateRequest {
  provider: string;
  auto_failover_enabled: boolean;
  fallback_provider?: string;
}

export interface WebhookDLQItem {
  id: string;
  gateway_provider: string;
  event_type: string;
  payload: Record<string, any>;
  headers?: Record<string, any>;
  error_reason: string;
  retry_count: number;
  status: "PENDING" | "REPLAYED" | "DISCARDED" | string;
  received_at: string;
  last_retry_at?: string | null;
}

export interface WebhookDLQListResponse {
  items: WebhookDLQItem[];
  total_count: number;
  pending_count: number;
  replayed_count: number;
  discarded_count: number;
}

export interface WebhookReplayResponse {
  id: string;
  success: boolean;
  message: string;
  retry_count: number;
  execution_timestamp: string;
}

export interface TenantHealthAuditItem {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  check_type: "ISOLATION" | "INTEGRITY" | "LEDGER" | string;
  status: "PASSED" | "WARNING" | "FAILED" | string;
  details: Record<string, any>;
  audited_at: string;
}

export interface TenantAuditSweepResponse {
  audit_id: string;
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  failed_checks: number;
  overall_status: string;
  results: TenantHealthAuditItem[];
  completed_at: string;
}

// ================= Predictive Depletion, Regulatory Export & Dispatch Types =================

export interface DepletionForecastItem {
  medication_id: string;
  medication_name: string;
  brand_name: string;
  generic_name: string;
  sku: string;
  category: string;
  current_stock: number;
  dispensed_last_30_days: number;
  daily_velocity: number;
  days_until_depletion: number;
  predicted_runout_date: string;
  urgency: "CRITICAL" | "WARNING" | "NORMAL" | string;
  lead_time_days: number;
  unit_cost_ghs: number;
  suggested_packs_order: number;
  estimated_po_cost_ghs: number;
  supplier_id: string;
  supplier_name: string;
}

export interface DepletionForecastResponse {
  total_items_monitored: number;
  critical_stockouts_count: number;
  warning_stockouts_count: number;
  total_estimated_restock_cost_ghs: number;
  forecast_timeline: DepletionForecastItem[];
}

export interface BulkPOGenerationItemInput {
  medication_id: string;
  supplier_id: string;
  suggested_packs: number;
  unit_cost_ghs: number;
}

export interface BulkPOGenerationRequest {
  items: BulkPOGenerationItemInput[];
  notes?: string;
}

export interface BulkPOGenerationResponse {
  purchase_orders_created: number;
  po_numbers: string[];
  total_commitment_ghs: number;
  message: string;
}

export interface ComplianceExportRequest {
  start_date: string;
  end_date: string;
  inspectorate_agency?: string;
  include_dangerous_drugs?: boolean;
  include_cold_chain?: boolean;
  include_quarantine_logs?: boolean;
  include_adr_reports?: boolean;
}

export interface ComplianceBundleRecordItem {
  section: string;
  record_count: number;
  status: string;
  summary: string;
}

export interface ComplianceExportBundleResponse {
  certificate_id: string;
  issued_at: string;
  date_range: string;
  pharmacy_name: string;
  superintendent_name: string;
  superintendent_pin: string;
  facility_license_number: string;
  tamper_proof_sha256_hash: string;
  total_records_certified: number;
  sections: ComplianceBundleRecordItem[];
  raw_compliance_payload: Record<string, any>;
}

export interface AuditPackageHistoryItem {
  id: string;
  certificate_number: string;
  date_range: string;
  generated_at: string;
  generated_by: string;
  agency: string;
  sha256_hash: string;
  status: string;
}

export interface CounterPickupItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: "STORE_PICKUP" | string;
  items: Array<{ name: string; quantity: number; batch?: string }>;
  total_amount_ghs: number;
  escrow_status: string;
  collection_otp: string;
  ready_since: string;
  status: "READY_FOR_PICKUP" | "COLLECTED" | string;
}

export interface CourierDeliveryItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  digital_gps_address: string;
  order_type: "EXPRESS_COURIER" | string;
  items: Array<{ name: string; quantity: number; batch?: string }>;
  total_amount_ghs: number;
  escrow_status: string;
  courier_provider?: "YANGO" | "BOLT" | "IN_HOUSE" | string | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  tracking_code?: string | null;
  delivery_otp: string;
  dispatched_at?: string | null;
  status: "AWAITING_COURIER" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | string;
}

export interface UnifiedDispatchQueueResponse {
  counter_pickups: CounterPickupItem[];
  courier_deliveries: CourierDeliveryItem[];
  pending_counter_count: number;
  pending_courier_count: number;
}

export interface CourierDispatchActionRequest {
  order_id: string;
  courier_provider: "YANGO" | "BOLT" | "IN_HOUSE" | string;
  rider_name: string;
  rider_phone: string;
  vehicle_registration?: string;
  notes?: string;
}

export interface CourierDispatchActionResponse {
  order_id: string;
  order_number: string;
  tracking_code: string;
  courier_provider: string;
  rider_name: string;
  status: string;
  dispatched_at: string;
  message: string;
}

// Patient Pill Box & Adherence
export interface PillBoxCompartmentItem {
  compartment_id: string;
  medication_name: string;
  brand_name?: string;
  dosage: string;
  instructions: string;
  time_of_day: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | string;
  scheduled_time: string;
  status: "PENDING" | "TAKEN" | "MISSED" | "SKIPPED" | string;
  taken_at?: string | null;
  can_refill: boolean;
  refill_remaining_days: number;
  pharmacy_pickup_partner?: string;
}

export interface PillBoxDailyScheduleResponse {
  current_date: string;
  streak_days: number;
  compliance_percentage: number;
  morning_doses: PillBoxCompartmentItem[];
  afternoon_doses: PillBoxCompartmentItem[];
  evening_doses: PillBoxCompartmentItem[];
  night_doses: PillBoxCompartmentItem[];
  total_doses_today: number;
  doses_completed_today: number;
}

export interface LogPillBoxDoseRequest {
  compartment_id: string;
  status?: "TAKEN" | "MISSED" | "SKIPPED" | string;
  taken_time?: string;
}

export interface LogPillBoxDoseResponse {
  success: boolean;
  compartment_id: string;
  status: string;
  streak_days: number;
  compliance_percentage: number;
  message: string;
}

// 1-Click Telehealth
export interface BookTelehealthSessionRequest {
  doctor_name?: string;
  specialty?: string;
  scheduled_start: string;
  duration_minutes?: number;
  reason_for_visit?: string;
  payment_method?: "WALLET" | "MOMO" | "NHIS" | string;
}

export interface BookTelehealthSessionResponse {
  session_id: string;
  appointment_id: string;
  doctor_name: string;
  specialty: string;
  scheduled_start: string;
  duration_minutes: number;
  room_token: string;
  join_url: string;
  session_status: string;
  message: string;
}

// Reception Fast Scanner Intake
export interface FastScannerIntakeRequest {
  raw_payload: string;
  scanner_type?: "AUTO" | "NFC" | "BARCODE" | "GHANA_CARD" | "ICE_QR" | string;
  target_department?: string;
  priority?: "ROUTINE" | "PRIORITY" | "EMERGENCY" | string;
}

export interface FastScannerResolvedPatient {
  patient_id: string;
  mrn: string;
  full_name: string;
  ghana_card_id?: string;
  blood_group?: string;
  allergies?: string;
  nhis_status: string;
  physical_folder_rack: string;
  physical_folder_shelf: string;
}

export interface FastScannerIntakeResponse {
  success: boolean;
  scan_source: string;
  patient: FastScannerResolvedPatient;
  queue_ticket_number: string;
  queue_entry_id: string;
  destination_department: string;
  priority: string;
  issued_at: string;
  message: string;
}

// Reception Archival Folder Grid
export interface FolderShelfLocationItem {
  card_id: string;
  mrn: string;
  patient_name: string;
  rack_number: string;
  shelf_row: string;
  file_box_code: string;
  status: "IN_ARCHIVE" | "WITH_DOCTOR" | "IN_WARD" | "IN_TRANSIT" | string;
  current_holder_name?: string | null;
  last_moved_at: string;
  color_tag: string;
}

export interface FolderArchiveMapResponse {
  total_folders_tracked: number;
  in_archive_count: number;
  with_doctors_count: number;
  in_wards_count: number;
  available_racks: string[];
  folders: FolderShelfLocationItem[];
}

export interface FolderCheckoutActionRequest {
  card_id: string;
  destination_department: string;
  doctor_name: string;
  notes?: string;
}

export interface FolderReturnActionRequest {
  card_id: string;
  rack_number?: string;
  shelf_row?: string;
  file_box_code?: string;
  notes?: string;
}

export interface FolderTransitActionResponse {
  success: boolean;
  card_id: string;
  mrn: string;
  status: string;
  location_summary: string;
  timestamp: string;
  message: string;
}

// Queue Audio Announcements & TV stream
export interface QueueAudioEventItem {
  event_id: string;
  ticket_number: string;
  patient_name: string;
  room_name: string;
  doctor_name: string;
  department: string;
  announcement_text: string;
  timestamp: string;
  chime_type: "STANDARD_BELL" | "URGENT_TRIPLE" | string;
}

export interface QueueAudioStreamResponse {
  active_calls: QueueAudioEventItem[];
  current_calling?: QueueAudioEventItem | null;
  waiting_count: number;
  completed_today: number;
  stream_timestamp: string;
}

// ============================================================================
// AI INTELLIGENCE SUITE (SOAP SCRIBE, ICD-10 DIFFERENTIAL, COUNSELING)
// ============================================================================

export interface SOAPSections {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface AIScribeRequest {
  transcript_text: string;
  patient_context?: Record<string, any>;
  consultation_id?: string;
  doctor_notes_hint?: string;
}

export interface AISoapScribeResponse {
  success: boolean;
  ambient_audio_processed: boolean;
  word_count: number;
  soap: SOAPSections;
  suggested_icd10_code: string;
  suggested_icd10_title: string;
  suggested_prescriptions: Array<{ name: string; dosage: string; duration?: string }>;
  suggested_follow_up_days: number;
  phi_token_stripped: boolean;
  inference_latency_ms: number;
}

export interface ICD10DifferentialRequest {
  symptoms: string[];
  vitals_summary?: string;
  history?: string;
  encounter_notes?: string;
}

export interface ICD10DifferentialItem {
  icd10_code: string;
  title: string;
  confidence_score: number;
  category: string;
  clinical_reasoning: string;
  recommended_investigations: string[];
  is_primary_recommendation: boolean;
}

export interface ICD10SuggestionResponse {
  success: boolean;
  total_differentials_evaluated: number;
  primary_diagnosis: ICD10DifferentialItem;
  differentials: ICD10DifferentialItem[];
  clinical_guideline_reference: string;
}

export type SupportedCounselingLanguage = "ENGLISH" | "FRENCH" | "TWI" | "EWE" | "GA";

export interface PrescriptionCounselingInputItem {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  instructions?: string;
}

export interface MultilingualCounselingRequest {
  prescription_items: PrescriptionCounselingInputItem[];
  target_language?: SupportedCounselingLanguage;
  patient_name?: string;
}

export interface DrugCounselingItem {
  medication_name: string;
  how_to_take: string;
  meal_instructions: string;
  warnings_and_precautions: string[];
  auxiliary_label_text: string;
}

export interface MultilingualCounselingResponse {
  success: boolean;
  language: SupportedCounselingLanguage;
  language_display_name: string;
  patient_greeting: string;
  medications_counseling: DrugCounselingItem[];
  general_lifestyle_advice: string;
  emergency_warning: string;
  sms_whatsapp_dispatch_copy: string;
}

// ============================================================================
// AI VISION OCR & QUEUE PREDICTION TYPES (PHASE 2)
// ============================================================================

export interface IDCardOCRRequest {
  image_base64?: string;
  document_type?: string;
  raw_text_hint?: string;
}

export interface IDCardOCRResponse {
  success: boolean;
  document_type: string;
  id_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  expiry_date?: string;
  confidence_score: number;
  ocr_quality: string;
  raw_text_extracted?: string;
  processing_time_ms: number;
}

export interface ExtractedDrugItem {
  drug_id?: string;
  medication_name: string;
  generic_name: string;
  strength: string;
  dosage_instructions: string;
  frequency: string;
  duration_days: number;
  quantity_prescribed: number;
  unit_price: number;
  confidence_score: number;
  in_stock_inventory_id?: string;
}

export interface PrescriptionOCRRequest {
  image_base64?: string;
  doctor_notes_hint?: string;
  raw_text_hint?: string;
}

export interface PrescriptionOCRResponse {
  success: boolean;
  doctor_name?: string;
  prescriber_pin?: string;
  facility_name?: string;
  prescription_date?: string;
  confidence_score: number;
  extracted_items: ExtractedDrugItem[];
  detected_diagnosis?: string;
  handwriting_legibility_score: number;
  processing_time_ms: number;
}

export interface QueueWaitTimeEstimateRequest {
  department?: string;
  queue_position?: number;
  triage_priority?: string;
}

export interface QueueWaitTimeEstimateResponse {
  success: boolean;
  department: string;
  queue_position: number;
  estimated_wait_minutes: number;
  estimated_consultation_eta: string;
  active_physicians_count: number;
  average_pace_minutes_per_patient: number;
  urgency_tier: string;
  live_traffic_status: string;
}

// ============================================================================
// AI PREDICTIVE ANALYTICS, CLAIM SCRUBBER & EPIDEMIC SENTINEL (PHASE 3)
// ============================================================================

export interface SeasonalForecastItem {
  medication_name: string;
  category: string;
  current_stock_on_hand: number;
  daily_velocity: number;
  seasonal_factor_multiplier: number;
  predicted_monthly_demand: number;
  recommended_order_quantity: number;
  stockout_risk_level: string;
  primary_surge_driver: string;
  estimated_purchase_cost_ghs: number;
}

export interface SeasonalDemandResponse {
  success: boolean;
  target_period: string;
  season_name: string;
  climate_driver: string;
  total_forecasted_spend_ghs: number;
  total_items_analyzed: number;
  high_risk_stockouts_count: number;
  forecast_items: SeasonalForecastItem[];
}

export interface ClaimScrubIssue {
  issue_id: string;
  claim_id: string;
  patient_name: string;
  patient_identifier: string;
  insurance_scheme: string;
  severity: string;
  issue_type: string;
  description: string;
  suggested_auto_fix: string;
  impact_amount_ghs: number;
}

export interface ClaimScrubberReportResponse {
  success: boolean;
  batch_id: string;
  total_claims_audited: number;
  clean_claim_rate_percent: number;
  total_audited_value_ghs: number;
  potential_rejection_value_ghs: number;
  passed_clean_count: number;
  issues_flagged_count: number;
  issues: ClaimScrubIssue[];
  ready_for_adjudication: boolean;
}

export interface ClaimScrubBatchRequest {
  batch_id?: string;
  claims_count?: number;
  insurance_provider?: string;
}

export interface EpidemicOutbreakAlertItem {
  alert_id: string;
  icd10_code: string;
  disease_name: string;
  region_cluster: string;
  baseline_30d_cases: number;
  current_7d_cases: number;
  surge_multiplier: number;
  severity_level: string;
  confidence_level: number;
  public_health_guideline: string;
  anonymized_patient_sample_count: number;
}

export interface EpidemicSentinelResponse {
  success: boolean;
  telemetry_timestamp: string;
  total_anonymized_encounters_scanned: number;
  active_outbreak_alerts_count: number;
  regional_clusters: EpidemicOutbreakAlertItem[];
}

// ============================================================================
// Multi-Branch & Inter-Branch Transfer (IBT) Types
// ============================================================================

export type BranchType = "MAIN_HUB" | "CLINIC" | "DISPENSARY" | "OUTLET" | "WAREHOUSE";
export type IBTStatus = "DRAFT" | "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED" | "CANCELLED";

export interface FacilityBranch {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  branch_type: BranchType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  is_main_hub: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CreateBranchRequest {
  name: string;
  code: string;
  branch_type?: BranchType | string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_main_hub?: boolean;
}

export interface UpdateBranchRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_active?: boolean;
}

export interface InterBranchTransferItem {
  id?: string;
  global_medication_id?: string | null;
  medication_name: string;
  sku?: string | null;
  batch_number: string;
  expiry_date?: string | null;
  quantity_dispatched: number;
  quantity_received?: number;
  unit_cost?: number;
  notes?: string | null;
}

export interface IBTDispatchPayload {
  source_branch_id: string;
  destination_branch_id: string;
  driver_courier_name?: string;
  driver_courier_phone?: string;
  notes?: string;
  items: InterBranchTransferItem[];
}

export interface ReceiveIBTPayload {
  notes?: string;
  item_receipts?: Array<{
    item_id?: string;
    quantity_received: number;
    notes?: string;
  }>;
}

export type LabOrderStatus =
  | "ORDERED"
  | "SAMPLE_COLLECTED"
  | "ANALYZING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "CANCELLED"
  | string;

export interface LabOrderObservationItem {
  id?: string;
  test_code?: string;
  parameter_name: string;
  result_value?: string | number;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  flag?: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | string;
  notes?: string;
}

export interface PatientLabOrderItem {
  id: string;
  order_id?: string;
  investigation_code?: string;
  test_name: string;
  category?: string;
  ordering_physician?: string;
  ordering_doctor_name?: string;
  facility_name?: string;
  tenant_code?: string;
  ordered_at?: string;
  ordered_date?: string;
  completed_at?: string;
  status: LabOrderStatus;
  observations?: LabOrderObservationItem[];
  results?: LabOrderObservationItem[];
  report_url?: string;
  download_url?: string;
  has_abnormal_flag?: boolean;
}

export type LatestVitalsStatus = "RECORDED" | "PENDING" | string;

export interface LatestPatientVitals {
  recorded_at?: string;
  status: LatestVitalsStatus;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate_bpm?: number | null;
  pulse_bpm?: number | null;
  temperature_c?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
  blood_glucose_mg_dl?: number | null;
  source?: string;
  source_facility_name?: string;
}

export interface ListPatientHospitalCardsResponse {
  items: HospitalPatientCard[];
  total?: number;
}

export interface ListPatientPrescriptionsResponse {
  items: PatientPrescriptionSummary[];
  total?: number;
  upcoming?: number;
  active?: number;
}

export interface ListPatientLabOrdersResponse {
  items: PatientLabOrderItem[];
  total?: number;
  pending?: number;
  completed?: number;
}

export interface InterBranchTransfer {
  id: string;
  tenant_id: string;
  transfer_number: string;
  source_branch_id: string;
  destination_branch_id: string;
  source_branch_name?: string;
  destination_branch_name?: string;
  status: IBTStatus;
  dispatched_by_user_id?: string | null;
  received_by_user_id?: string | null;
  dispatched_at: string;
  received_at?: string | null;
  driver_courier_name?: string | null;
  driver_courier_phone?: string | null;
  notes?: string | null;
  items: InterBranchTransferItem[];
}

export interface TenantEntitlementsResponse {
  tenant_id: string;
  plan_code: string;
  plan_name: string;
  tier: string;
  feature_flags: Record<string, boolean>;
  limits: {
    max_staff_seats: number;
    max_branches: number;
    max_beds: number;
    max_monthly_rx: number;
  };
  active_seats: number;
  active_branches: number;
}

export interface NHISGDRGTariffItem {
  id: string;
  gdrg_code: string;
  service_name: string;
  category: string;
  standard_tariff_ghs: number | string;
  nhis_covered_amount_ghs: number | string;
  patient_copay_ghs: number | string;
  preauth_required: boolean;
  is_active: boolean;
  description?: string;
}

export interface FormularyMedicationItem {
  id: string;
  generic_name: string;
  brand_name: string;
  dosage_form: string;
  strength: string;
  category?: string;
  therapeutic_class?: string;
  poison_schedule?: "OTC" | "PRESCRIPTION_ONLY" | "CLASS_A_NARCOTIC" | "CLASS_B_POISON" | string;
  standard_dosing?: string;
  is_cold_chain: boolean;
  storage_temp_min?: number;
  storage_temp_max?: number;
  linked_icd10_codes?: string;
  nafdac_fda_number?: string;
  description?: string;
}










// ==========================================
// Onboarding & Invitation Types
// ==========================================

export interface CompanyInvitationCreateRequest {
  company_name: string;
  admin_email: string;
  tenant_type?: "HOSPITAL" | "CLINIC" | "PHARMACY";
  country?: string;
  currency?: string;
  assigned_plan_code?: string;
}

export interface CompanyInviteSubmissionRequest {
  company_name: string;
  admin_email: string;
  admin_phone: string;
  tenant_type?: "HOSPITAL" | "CLINIC" | "PHARMACY";
  city?: string;
  country?: string;
  currency?: string;
  note?: string;
}

export interface CompanyInvitationResponse {
  id: string;
  token: string;
  company_name: string;
  admin_email: string;
  tenant_type: string;
  country: string;
  currency: string;
  assigned_plan_code: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | string;
  expires_at: string;
  onboarding_url: string;
  created_at: string;
}

export interface CompanyVerificationResponse {
  valid: boolean;
  token: string;
  company_name: string;
  admin_email: string;
  tenant_type: string;
  country: string;
  currency: string;
  assigned_plan_code: string;
  expires_at: string;
}

export interface CompanyOnboardingCompletionRequest {
  token: string;
  admin_full_name: string;
  password: string;
  phone_number: string;
  registration_number?: string;
  physical_address?: string;
  digital_address?: string;
  city?: string;
  facility_name?: string;
}

export interface CompanyOnboardingCompletionResponse {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_type: string;
  user_id: string;
  user_email: string;
  user_role: string;
  default_redirect_path: string;
}

export interface StaffInvitationCreateRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id?: string;
}

export interface StaffInvitationResponse {
  id: string;
  token: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id?: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | string;
  expires_at: string;
  invitation_url: string;
  created_at: string;
}

export interface StaffVerificationResponse {
  valid: boolean;
  token: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  facility_name: string;
  tenant_type: string;
  branch_name?: string;
  expires_at: string;
}

export interface StaffOnboardingCompletionRequest {
  token: string;
  password: string;
  phone_number?: string;
  license_number?: string;
  license_expiry?: string;
}

export interface StaffOnboardingCompletionResponse {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  default_redirect_path: string;
}

export interface StaffSeatQuotaSummary {
  active_seats: number;
  max_seats: number;
  seats_remaining: number;
  plan_name: string;
  tier: string;
}

export interface CriticalAlertItem {
  alert_id: string;
  severity: "RESUSCITATION" | "CRITICAL" | "URGENT" | "WARNING" | "INFO";
  title: string;
  message: string;
  patient_id?: string;
  patient_name?: string;
  mrn?: string;
  location?: string;
  bed_id?: string;
  attending_staff?: string;
  created_at: string;
  acknowledged: boolean;
}

export interface DueMedicationItem {
  medication_id: string;
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  bed_id?: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  frequency: string;
  status: "DUE" | "PENDING" | "OVERDUE" | "GIVEN" | "HELD";
  special_instructions?: string;
}

export interface WardOccupancySnapshot {
  total_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate_percent: number;
  ward_breakdown: Array<{
    ward_id: string;
    ward_name: string;
    occupied: number;
    total: number;
    rate_percent: number;
  }>;
}

export interface PendingTriageItem {
  queue_id: string;
  queue_number: string;
  patient_id: string;
  hospital_card_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  mrn: string;
  chief_complaint?: string;
  checked_in_at: string;
  triage_priority?: "EMERGENCY" | "URGENT" | "SEMI_URGENT" | "ROUTINE";
  has_vitals: boolean;
  temperature?: number;
  blood_pressure?: string;
  heart_rate?: number;
  spo2?: number;
  ghana_card_number?: string;
}

export interface FacilityBedItem {
  bed_id: string;
  bed_number: string;
  ward_id: string;
  ward_name: string;
  is_occupied: boolean;
  patient_id?: string;
  patient_name?: string;
  gender?: string;
  age?: number;
  ghana_card?: string;
  diagnosis?: string;
  allergies?: string[];
  oxygen_flow_rate?: string;
  current_iv_fluids?: string;
  attending_physician?: string;
  admitted_at?: string;
}

export interface TriageEncounterPayload {
  queue_id?: string;
  patient_id?: string;
  hospital_card_id?: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  ghana_card_number?: string;
  chief_complaint?: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate_bpm?: number;
  respiratory_rate_bpm?: number;
  temperature_c?: number;
  oxygen_saturation_percent?: number;
  blood_glucose_mmol_l?: number;
  weight_kg?: number;
  height_cm?: number;
  pain_score?: number;
  avpu?: "ALERT" | "VOICE" | "PAIN" | "UNRESPONSIVE";
  urine_dipstick?: string;
  mews_score?: number;
  esi_level?: 1 | 2 | 3 | 4 | 5;
  triage_category?: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  nurse_notes?: string;
}

export interface TriageEncounter {
  encounter_id: string;
  patient_id: string;
  recorded_at: string;
  recorded_by_nurse: string;
  mews_score: number;
  esi_level: 1 | 2 | 3 | 4 | 5;
  triage_category: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  is_critical: boolean;
  critical_alert_message?: string;
}

export interface CriticalAlertItem {
  alert_id: string;
  severity: "RESUSCITATION" | "CRITICAL" | "URGENT" | "WARNING" | "INFO";
  title: string;
  message: string;
  patient_id?: string;
  patient_name?: string;
  mrn?: string;
  location?: string;
  bed_id?: string;
  attending_staff?: string;
  created_at: string;
  acknowledged: boolean;
}

export interface DueMedicationItem {
  medication_id: string;
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  bed_id?: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  frequency: string;
  status: "DUE" | "PENDING" | "OVERDUE" | "GIVEN" | "HELD";
  special_instructions?: string;
}

export interface WardOccupancySnapshot {
  total_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate_percent: number;
  ward_breakdown: Array<{
    ward_id: string;
    ward_name: string;
    occupied: number;
    total: number;
    rate_percent: number;
  }>;
}

export interface TelemedicineTokenRequest {
  consultation_id: string;
  room_name?: string;
}

export interface TelemedicineTokenResponse {
  token: string;
  server_url: string;
  room_name: string;
  participant_name: string;
  participant_identity: string;
}

export interface PendingTriageItem {
  queue_id: string;
  queue_number: string;
  patient_id: string;
  hospital_card_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  mrn: string;
  chief_complaint?: string;
  checked_in_at: string;
  triage_priority?: "EMERGENCY" | "URGENT" | "SEMI_URGENT" | "ROUTINE";
  has_vitals: boolean;
  temperature?: number;
  blood_pressure?: string;
  heart_rate?: number;
  spo2?: number;
  ghana_card_number?: string;
}

export interface FacilityBedItem {
  bed_id: string;
  bed_number: string;
  ward_id: string;
  ward_name: string;
  is_occupied: boolean;
  patient_id?: string;
  patient_name?: string;
  gender?: string;
  age?: number;
  ghana_card?: string;
  diagnosis?: string;
  allergies?: string[];
  oxygen_flow_rate?: string;
  current_iv_fluids?: string;
  attending_physician?: string;
  admitted_at?: string;
}

export interface TriageEncounterPayload {
  queue_id?: string;
  patient_id?: string;
  hospital_card_id?: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  ghana_card_number?: string;
  chief_complaint?: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate_bpm?: number;
  respiratory_rate_bpm?: number;
  temperature_c?: number;
  oxygen_saturation_percent?: number;
  blood_glucose_mmol_l?: number;
  weight_kg?: number;
  height_cm?: number;
  pain_score?: number;
  avpu?: "ALERT" | "VOICE" | "PAIN" | "UNRESPONSIVE";
  urine_dipstick?: string;
  mews_score?: number;
  esi_level?: 1 | 2 | 3 | 4 | 5;
  triage_category?: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  nurse_notes?: string;
}

export interface TriageEncounter {
  encounter_id: string;
  patient_id: string;
  recorded_at: string;
  recorded_by_nurse: string;
  mews_score: number;
  esi_level: 1 | 2 | 3 | 4 | 5;
  triage_category: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  is_critical: boolean;
  critical_alert_message?: string;
}

export interface WardBedsSummarySnapshot {
  ward_name: string;
  ward_id: string;
  total_beds: number;
  beds_allocated: number;
  beds_vacant: number;
  occupancy_percent: number;
}

export interface WardBedsSummary {
  facility_total_beds: number;
  facility_beds_allocated: number;
  facility_beds_vacant: number;
  facility_occupancy_percent: number;
  wards: WardBedsSummarySnapshot[];
}