
// ============================================================================
// NURSE PORTAL — LIVE ENDPOINT TYPES
// ============================================================================

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
