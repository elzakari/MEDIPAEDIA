from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ClinicDepartment(str, Enum):
    GENERAL_OPD = "GENERAL_OPD"
    ANTENATAL = "ANTENATAL"
    EYE_CLINIC = "EYE_CLINIC"
    PEDIATRICS = "PEDIATRICS"
    EMERGENCY = "EMERGENCY"
    DENTAL = "DENTAL"
    SURGICAL_OPD = "SURGICAL_OPD"


class ReceptionTriagePriority(str, Enum):
    ROUTINE = "ROUTINE"
    PRIORITY = "PRIORITY"
    EMERGENCY = "EMERGENCY"


class FolderStatus(str, Enum):
    IN_ARCHIVE = "IN_ARCHIVE"
    CHECKED_OUT = "CHECKED_OUT"
    IN_TRANSIT = "IN_TRANSIT"
    MISSING = "MISSING"


class NHISStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    UNVERIFIED = "UNVERIFIED"
    EXEMPT = "EXEMPT"


class DeduplicationWarning(BaseModel):
    match_field: str  # "ghana_card_id", "phone", "name_and_dob", "fuzzy_name"
    similarity_score: float = 1.0  # 0.0 to 1.0
    matched_patient_id: UUID
    matched_mrn: str
    matched_full_name: str
    matched_phone: Optional[str] = None
    warning_message: str


class PatientMasterSearchResult(BaseModel):
    patient_id: UUID
    user_id: UUID
    full_name: str
    mrn: str
    ghana_card_id: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    nhis_number: Optional[str] = None
    nhis_status: NHISStatus = NHISStatus.ACTIVE
    physical_folder_rack: Optional[str] = "Rack-A1"
    physical_folder_shelf: Optional[str] = "Shelf-01"
    folder_status: FolderStatus = FolderStatus.IN_ARCHIVE
    registration_fee_paid: bool = True
    is_trauma_temporary: bool = False
    qr_token: str
    deduplication_warnings: List[DeduplicationWarning] = []

    model_config = ConfigDict(from_attributes=True)


class ReceptionPatientRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    email: Optional[str] = None
    ghana_card_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = "Other"
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    nhis_number: Optional[str] = None
    nhis_status: Optional[NHISStatus] = NHISStatus.ACTIVE
    physical_folder_rack: Optional[str] = "Rack-A1"
    physical_folder_shelf: Optional[str] = "Shelf-01"
    destination_clinic: Optional[ClinicDepartment] = ClinicDepartment.GENERAL_OPD
    priority: Optional[ReceptionTriagePriority] = ReceptionTriagePriority.ROUTINE
    auto_dispatch_queue: bool = True


class ReceptionPatientRegisterResponse(BaseModel):
    patient_id: UUID
    user_id: UUID
    hospital_card_id: UUID
    full_name: str
    mrn: str
    ghana_card_id: Optional[str] = None
    phone: Optional[str] = None
    nhis_number: Optional[str] = None
    nhis_status: NHISStatus
    physical_folder_rack: str
    physical_folder_shelf: str
    qr_token: str
    registration_fee_waived: bool
    fee_amount: Decimal
    queue_ticket: Optional[str] = None
    queue_id: Optional[UUID] = None
    destination_clinic: Optional[ClinicDepartment] = None
    created_at: datetime
    deduplication_warnings: List[DeduplicationWarning] = []


class EmergencyTraumaIntakeRequest(BaseModel):
    gender_estimate: Optional[str] = "Unknown"
    approximate_age_group: Optional[str] = "Adult"  # Adult, Pediatric, Elderly, Infant
    identifying_marks_or_clothing: Optional[str] = None
    brought_in_by: Optional[str] = "National Ambulance Service (NAS)"
    ambulance_call_sign: Optional[str] = "NAS-AMB-402"
    trauma_notes: Optional[str] = "Unconscious polytrauma victim, immediate resuscitation needed"
    blood_group: Optional[str] = "O-"
    initial_triage_bay: Optional[str] = "Resuscitation Bay 1"


class EmergencyTraumaIntakeResponse(BaseModel):
    patient_id: UUID
    hospital_card_id: UUID
    temporary_name: str
    mrn: str
    trauma_code: str
    queue_id: UUID
    queue_number: str
    destination_clinic: ClinicDepartment = ClinicDepartment.EMERGENCY
    priority: ReceptionTriagePriority = ReceptionTriagePriority.EMERGENCY
    is_trauma_temporary: bool = True
    wristband_barcode_data: str
    checked_in_at: datetime
    fee_amount: Decimal = Decimal("0.00")
    registration_fee_waived: bool = True


class MergePatientRecordsRequest(BaseModel):
    primary_patient_id: UUID  # Verified permanent master record
    secondary_patient_id: UUID  # Duplicate or temporary emergency trauma record
    merge_reason: str = Field(..., min_length=4)
    confirm_data_override: bool = True


class MergePatientRecordsResponse(BaseModel):
    primary_patient_id: UUID
    primary_mrn: str
    merged_patient_name: str
    secondary_patient_id: UUID
    secondary_mrn: str
    consultations_transferred: int
    vitals_transferred: int
    queue_entries_transferred: int
    prescriptions_transferred: int
    folder_transits_transferred: int
    merged_at: datetime
    message: str


class QueueDispatchRequest(BaseModel):
    patient_id: Optional[UUID] = None
    mrn_or_identifier: Optional[str] = None
    destination_clinic: ClinicDepartment = ClinicDepartment.GENERAL_OPD
    priority: ReceptionTriagePriority = ReceptionTriagePriority.ROUTINE
    is_nhis_covered: bool = True
    consulting_room_target: Optional[str] = None


class QueueDispatchResponse(BaseModel):
    queue_id: UUID
    queue_number: str
    patient_id: UUID
    patient_name: str
    mrn: str
    destination_clinic: ClinicDepartment
    priority: ReceptionTriagePriority
    registration_fee_waived: bool
    fee_amount: Decimal
    estimated_wait_minutes: int
    checked_in_at: datetime


class ActiveQueueItemResponse(BaseModel):
    queue_id: UUID
    queue_number: str
    patient_id: UUID
    hospital_card_id: Optional[UUID] = None
    patient_name: str
    mrn: str
    ghana_card_id: Optional[str] = None
    gender: Optional[str] = None
    destination_clinic: ClinicDepartment
    priority: ReceptionTriagePriority
    status: str
    checked_in_at: datetime
    wait_duration_minutes: int
    estimated_wait_minutes: Optional[int] = None
    fee_waiver_badge: str = "WAIVED"  # "WAIVED", "PAID", "NHIS", "EXEMPT"
    consulting_room: Optional[str] = None


class TVCalledTicket(BaseModel):
    ticket_number: str
    patient_display_name: str  # e.g. "K. Mensah" for privacy
    destination_clinic: ClinicDepartment
    consulting_room: str  # e.g. "Consulting Room 3"
    priority: ReceptionTriagePriority
    called_at: str
    status: str


class DepartmentQueueSummary(BaseModel):
    department: ClinicDepartment
    department_name: str
    waiting_count: int
    current_serving_ticket: Optional[str] = None
    average_wait_minutes: int


class QueueTVDisplayResponse(BaseModel):
    facility_name: str
    current_time: str
    total_waiting: int
    now_calling: List[TVCalledTicket]
    departments_summary: List[DepartmentQueueSummary]
    recent_calls: List[TVCalledTicket]


class FolderTransitLogRequest(BaseModel):
    mrn: str
    action: str = Field(..., pattern="^(CHECK_OUT|RETURN)$")
    destination_department: str = "Consulting Room 2"
    checked_out_to_doctor: Optional[str] = "Dr. Afia Appiah"
    notes: Optional[str] = None


class FolderTransitLogResponse(BaseModel):
    transit_id: UUID
    mrn: str
    patient_name: str
    rack_location: str
    shelf_location: str
    action: str
    destination_department: str
    checked_out_to: Optional[str] = None
    status: FolderStatus
    logged_at: datetime
    message: str


class FolderLedgerItemResponse(BaseModel):
    transit_id: UUID
    hospital_card_id: UUID
    mrn: str
    patient_name: str
    rack: str
    shelf: str
    status: FolderStatus
    current_location: str
    checked_out_to: Optional[str] = None
    checked_out_at: Optional[datetime] = None
    duration_hours: Optional[float] = None
    is_overdue: bool = False
    overdue_alert: Optional[str] = None


class WristbandPrintResponse(BaseModel):
    patient_id: UUID
    mrn: str
    full_name: str
    date_of_birth: Optional[str] = None
    age_gender: str
    blood_group: str
    allergies: str
    emergency_contact: str
    ghana_card_id: Optional[str] = None
    barcode_data: str
    qr_data: str
    facility_name: str
    printed_at: str
    is_emergency_trauma: bool = False


class QueueTicketPrintResponse(BaseModel):
    ticket_id: UUID
    ticket_number: str
    facility_name: str
    destination_clinic: str
    priority_level: str
    patient_name: str
    mrn: str
    qr_pass_data: str
    fee_status: str
    fee_amount: str
    issue_time: str
    instructions: str


# ============================================================================
# FAST SCANNER INTAKE, ARCHIVE MAP & TV QUEUE AUDIO
# ============================================================================

class FastScannerIntakeRequest(BaseModel):
    raw_payload: str  # e.g., "GHA-71298412-1", "MRN-RDG-2026-99120", "NFC-TAG-881294"
    scanner_type: str = "AUTO"  # AUTO, NFC, BARCODE, GHANA_CARD, ICE_QR
    target_department: Optional[str] = "GENERAL_OPD"
    priority: Optional[str] = "ROUTINE"


class FastScannerResolvedPatient(BaseModel):
    patient_id: str
    mrn: str
    full_name: str
    ghana_card_id: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    nhis_status: str = "ACTIVE"
    physical_folder_rack: str
    physical_folder_shelf: str


class FastScannerIntakeResponse(BaseModel):
    success: bool
    scan_source: str
    patient: FastScannerResolvedPatient
    queue_ticket_number: str
    queue_entry_id: str
    destination_department: str
    priority: str
    issued_at: str
    message: str


class FolderShelfLocationItem(BaseModel):
    card_id: str
    mrn: str
    patient_name: str
    rack_number: str
    shelf_row: str
    file_box_code: str
    status: str  # IN_ARCHIVE, WITH_DOCTOR, IN_WARD, IN_TRANSIT
    current_holder_name: Optional[str] = None
    last_moved_at: str
    color_tag: str


class FolderArchiveMapResponse(BaseModel):
    total_folders_tracked: int
    in_archive_count: int
    with_doctors_count: int
    in_wards_count: int
    available_racks: List[str]
    folders: List[FolderShelfLocationItem]


class FolderCheckoutActionRequest(BaseModel):
    card_id: str
    destination_department: str = "Consultation Room 3"
    doctor_name: str = "Dr. Afia Appiah"
    notes: Optional[str] = None


class FolderReturnActionRequest(BaseModel):
    card_id: str
    rack_number: Optional[str] = "Rack-A1"
    shelf_row: Optional[str] = "Shelf-01"
    file_box_code: Optional[str] = "BOX-2026-01"
    notes: Optional[str] = None


class FolderTransitActionResponse(BaseModel):
    success: bool
    card_id: str
    mrn: str
    status: str
    location_summary: str
    timestamp: str
    message: str


class QueueAudioEventItem(BaseModel):
    event_id: str
    ticket_number: str
    patient_name: str
    room_name: str
    doctor_name: str
    department: str
    announcement_text: str
    announcement_text_fr: Optional[str] = None
    voice_locale: str = "en-US"
    timestamp: str
    chime_type: str = "STANDARD_BELL"  # STANDARD_BELL, URGENT_TRIPLE



class QueueAudioStreamResponse(BaseModel):
    active_calls: List[QueueAudioEventItem]
    current_calling: Optional[QueueAudioEventItem] = None
    waiting_count: int
    completed_today: int
    stream_timestamp: str

