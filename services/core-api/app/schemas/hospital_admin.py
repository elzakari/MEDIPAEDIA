from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.email_verifier import validate_deliverable_email


class ShiftType(str, Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    NIGHT = "NIGHT"
    ON_CALL = "ON_CALL"


class TheatreStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    IN_USE = "IN_USE"
    STERILIZATION = "STERILIZATION"
    MAINTENANCE = "MAINTENANCE"


class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    CRITICAL_SENTINEL = "CRITICAL_SENTINEL"


# ============================================================================
# 1. STAFF WORKFORCE & CREDENTIALING
# ============================================================================
class StaffMemberResponse(BaseModel):
    staff_id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    department: str
    council_pin: Optional[str] = None
    license_status: str = "PENDING_VERIFICATION"
    license_expiry: Optional[str] = None
    is_active: bool = False
    is_on_duty: bool = False


class StaffInviteRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    department: str
    council_pin: Optional[str] = None
    license_expiry: Optional[str] = None
    password: Optional[str] = "Medipaedia2026!"

    @field_validator("email")
    @classmethod
    def validate_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)


class StaffCredentialUpdateRequest(BaseModel):
    council_pin: str
    license_expiry: str
    is_on_duty: Optional[bool] = None


# ============================================================================
# 2. SHIFT ROSTER & SCHEDULING
# ============================================================================
class ShiftRosterItem(BaseModel):
    roster_id: str
    staff_id: str
    staff_name: str
    role: str
    department: str
    shift_date: str
    shift_type: ShiftType
    start_time: str
    end_time: str
    status: str = "SCHEDULED"


class CreateShiftRosterRequest(BaseModel):
    staff_id: str
    staff_name: str
    role: str
    department: str
    shift_date: str
    shift_type: ShiftType = ShiftType.MORNING
    start_time: str = "08:00"
    end_time: str = "16:00"


# ============================================================================
# 3. RESOURCE & DEPARTMENT CAPACITY
# ============================================================================
class DepartmentCapacityItem(BaseModel):
    department_id: str
    name: str
    head_of_department: str
    total_beds: int
    occupied_beds: int
    available_beds: int
    occupancy_rate: float
    active_nurses_on_shift: int


class UpdateDepartmentBedsRequest(BaseModel):
    total_beds: int
    head_of_department: Optional[str] = None


class OperatingTheatreItem(BaseModel):
    theatre_id: str
    theatre_name: str
    theatre_type: str
    status: TheatreStatus
    current_procedure: Optional[str] = None
    lead_surgeon: Optional[str] = None
    next_available_time: str


class TheatreStatusUpdateRequest(BaseModel):
    status: TheatreStatus
    current_procedure: Optional[str] = None
    lead_surgeon: Optional[str] = None
    next_available_time: Optional[str] = None


# ============================================================================
# 4. TARIFF MASTER & PRICING SCHEDULES
# ============================================================================
class HospitalTariffConfig(BaseModel):
    opd_registration_fee_ghs: Decimal = Decimal("50.00")
    general_consultation_fee_ghs: Decimal = Decimal("80.00")
    specialist_consultation_fee_ghs: Decimal = Decimal("120.00")
    emergency_triage_fee_ghs: Decimal = Decimal("90.00")
    general_ward_night_ghs: Decimal = Decimal("150.00")
    icu_bed_night_ghs: Decimal = Decimal("550.00")
    malaria_rdt_fee_ghs: Decimal = Decimal("45.00")
    fbc_lab_fee_ghs: Decimal = Decimal("95.00")
    nhis_consultation_gdrg_tariff: Decimal = Decimal("80.00")
    nhis_malaria_gdrg_tariff: Decimal = Decimal("35.00")
    nhis_fbc_gdrg_tariff: Decimal = Decimal("65.00")
    last_updated: str = "19 Aug 2026, 12:00"
    updated_by: str = "Hospital Administrator (admin.ridge@ridgehospital.health)"


class UpdateHospitalTariffRequest(BaseModel):
    opd_registration_fee_ghs: Optional[Decimal] = None
    general_consultation_fee_ghs: Optional[Decimal] = None
    specialist_consultation_fee_ghs: Optional[Decimal] = None
    emergency_triage_fee_ghs: Optional[Decimal] = None
    general_ward_night_ghs: Optional[Decimal] = None
    icu_bed_night_ghs: Optional[Decimal] = None


# ============================================================================
# 5. QUALITY, RISK & THROUGHPUT ANALYTICS
# ============================================================================
class PipelineStageItem(BaseModel):
    stage: str
    count: int
    avg_dwell_time_mins: int


class ThroughputAnalyticsResponse(BaseModel):
    daily_patient_footfall: int
    avg_triage_wait_time_mins: int
    avg_consultation_duration_mins: int
    bed_occupancy_rate_pct: float
    on_duty_staff_count: int
    today_gross_billing_ghs: Decimal
    pipeline_stages: List[PipelineStageItem]


class ClinicalIncidentItem(BaseModel):
    incident_id: str
    reported_at: str
    department: str
    severity: IncidentSeverity
    incident_type: str
    description: str
    action_taken: str
    reported_by: str
    status: str = "UNDER_INVESTIGATION"


class ClinicalIncidentCreateRequest(BaseModel):
    department: str
    severity: IncidentSeverity = IncidentSeverity.MODERATE
    incident_type: str
    description: str
    action_taken: str
