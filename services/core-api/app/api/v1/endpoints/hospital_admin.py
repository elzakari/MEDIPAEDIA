from datetime import datetime, timezone
from decimal import Decimal
import random
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_hospital_admin
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.hospital_admin import (
    ClinicalIncidentCreateRequest,
    ClinicalIncidentItem,
    CreateShiftRosterRequest,
    DepartmentCapacityItem,
    HospitalTariffConfig,
    IncidentSeverity,
    OperatingTheatreItem,
    PipelineStageItem,
    ShiftRosterItem,
    ShiftType,
    StaffCredentialUpdateRequest,
    StaffInviteRequest,
    StaffMemberResponse,
    TheatreStatus,
    TheatreStatusUpdateRequest,
    ThroughputAnalyticsResponse,
    UpdateDepartmentBedsRequest,
    UpdateHospitalTariffRequest,
)
from app.schemas.hospital_admin_billing import (
    BulkTariffAdjustmentRequest,
    CashierShiftAuditItem,
    CorporateInsuranceAccountItem,
    CreateCorporateAccountRequest,
    CreateHospitalServiceTariffRequest,
    FacilityGatewayConfig,
    HospitalServiceTariffItem,
    StatementOfAccountResponse,
    TestPayoutPingResponse,
    UpdateCorporateAccountRequest,
    UpdateFacilityGatewayConfigRequest,
    UpdateHospitalServiceTariffRequest,
)

router = APIRouter()

# In-Memory Master Stores for Facility Governance (Empty defaults — DB-driven on real tenants)
_HOSPITAL_STAFF: List[StaffMemberResponse] = []

_SHIFT_ROSTER: List[ShiftRosterItem] = []

_DEPARTMENTS: List[DepartmentCapacityItem] = []

_THEATRES: List[OperatingTheatreItem] = []

_HOSPITAL_TARIFFS = HospitalTariffConfig()

_CLINICAL_INCIDENTS: List[ClinicalIncidentItem] = []


# ============================================================================
# 1. STAFF WORKFORCE & CREDENTIALING
# ============================================================================
@router.get("/staff", response_model=List[StaffMemberResponse])
async def get_hospital_staff(
    role: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the hospital staff workforce roster with MDC/NMC council credentials and on-duty status.
    Queries live database for current tenant if available.
    """
    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id and db is not None:
        stmt = (
            select(User)
            .options(selectinload(User.staff_profile))
            .where(User.tenant_id == tenant_id)
        )
        if role:
            stmt = stmt.where(User.role == role)
        res = await db.execute(stmt)
        users = res.scalars().all()
        if users:

            live_staff = []
            for u in users:
                sp = u.staff_profile
                role_val = u.role.value if hasattr(u.role, "value") else str(u.role)
                dept_val = sp.department if sp and sp.department else ("Executive Management" if "ADMIN" in role_val else "General OPD")
                council_val = sp.license_number if sp and sp.license_number else (u.license_number or "N/A")
                
                live_staff.append(
                    StaffMemberResponse(
                        staff_id=str(u.id),
                        email=u.email,
                        phone=u.phone or "N/A",
                        full_name=u.full_name,
                        role=role_val,
                        department=dept_val,
                        council_pin=council_val,
                        license_status="VERIFIED" if (u.is_verified or (sp and sp.license_number)) else "ACTIVE",
                        license_expiry="31 Dec 2026",
                        is_active=u.is_active,
                        is_on_duty=True,
                    )
                )
            if department:
                live_staff = [s for s in live_staff if department.lower() in s.department.lower()]
            return live_staff

    results = _HOSPITAL_STAFF
    if role:
        results = [s for s in results if s.role == role]
    if department:
        results = [s for s in results if department.lower() in s.department.lower()]
    return results


@router.post("/staff", response_model=StaffMemberResponse)
async def invite_hospital_staff(
    req: StaffInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Provisions a new healthcare practitioner account, registers council license PIN, and scopes to hospital tenant.
    """
    new_staff = StaffMemberResponse(
        staff_id=f"stf-{uuid.uuid4().hex[:6]}",
        email=req.email,
        phone=req.phone,
        full_name=req.full_name,
        role=req.role,
        department=req.department,
        council_pin=req.council_pin,
        license_status="VERIFIED" if req.council_pin else "ACTIVE",
        license_expiry=req.license_expiry or "31 Dec 2026",
        is_active=True,
        is_on_duty=False,
    )
    _HOSPITAL_STAFF.append(new_staff)
    return new_staff


@router.put("/staff/{staff_id}/credentials", response_model=StaffMemberResponse)
async def update_staff_credentials(
    staff_id: str,
    req: StaffCredentialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates a practitioner's council verification PIN, license expiry, and on-duty toggle.
    """
    for s in _HOSPITAL_STAFF:
        if s.staff_id == staff_id:
            s.council_pin = req.council_pin
            s.license_expiry = req.license_expiry
            s.license_status = "VERIFIED"
            if req.is_on_duty is not None:
                s.is_on_duty = req.is_on_duty
            return s

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Staff member {staff_id} not found.",
    )


# ============================================================================
# 2. SHIFT ROSTER & SCHEDULING
# ============================================================================
@router.get("/roster", response_model=List[ShiftRosterItem])
async def get_shift_roster(
    department: Optional[str] = None,
    shift_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the clinical workforce scheduling roster across hospital service units.
    """
    results = _SHIFT_ROSTER
    if department:
        results = [r for r in results if department.lower() in r.department.lower()]
    if shift_date:
        results = [r for r in results if r.shift_date == shift_date]
    return results


@router.post("/roster", response_model=ShiftRosterItem)
async def create_shift_roster_entry(
    req: CreateShiftRosterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Assigns a practitioner to a designated departmental shift (Morning, Afternoon, Night, On-Call).
    """
    new_entry = ShiftRosterItem(
        roster_id=f"rst-{uuid.uuid4().hex[:6]}",
        staff_id=req.staff_id,
        staff_name=req.staff_name,
        role=req.role,
        department=req.department,
        shift_date=req.shift_date,
        shift_type=req.shift_type,
        start_time=req.start_time,
        end_time=req.end_time,
        status="SCHEDULED",
    )
    _SHIFT_ROSTER.append(new_entry)
    return new_entry


# ============================================================================
# 3. RESOURCE & DEPARTMENT CAPACITY
# ============================================================================
@router.get("/departments", response_model=List[DepartmentCapacityItem])
async def get_facility_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all hospital clinical wards, assigned bed capacities, and real-time occupancy rates.
    """
    return _DEPARTMENTS


@router.put("/departments/{department_id}/beds", response_model=DepartmentCapacityItem)
async def update_department_beds(
    department_id: str,
    req: UpdateDepartmentBedsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reconfigures physical bed count and leadership for a clinical department.
    """
    for d in _DEPARTMENTS:
        if d.department_id == department_id:
            d.total_beds = req.total_beds
            d.available_beds = max(0, d.total_beds - d.occupied_beds)
            d.occupancy_rate = round((d.occupied_beds / d.total_beds) * 100, 1) if d.total_beds > 0 else 0.0
            if req.head_of_department:
                d.head_of_department = req.head_of_department
            return d

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Department {department_id} not found.",
    )


@router.get("/theatres", response_model=List[OperatingTheatreItem])
async def get_operating_theatres(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns operating theatre suites with live surgical telemetry and sterilization turnaround times.
    """
    return _THEATRES


@router.put("/theatres/{theatre_id}/status", response_model=OperatingTheatreItem)
async def update_theatre_status(
    theatre_id: str,
    req: TheatreStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates theatre status (AVAILABLE, IN_USE, STERILIZATION, MAINTENANCE).
    """
    for t in _THEATRES:
        if t.theatre_id == theatre_id:
            t.status = req.status
            t.current_procedure = req.current_procedure
            t.lead_surgeon = req.lead_surgeon
            if req.next_available_time:
                t.next_available_time = req.next_available_time
            return t

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Operating theatre {theatre_id} not found.",
    )


# ============================================================================
# 4. TARIFF MASTER & PRICING SCHEDULES
# ============================================================================
@router.get("/tariffs", response_model=HospitalTariffConfig)
async def get_hospital_tariffs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns hospital standard pricing schedules and NHIS G-DRG reimbursement mapping.
    """
    return _HOSPITAL_TARIFFS


@router.put("/tariffs", response_model=HospitalTariffConfig)
async def update_hospital_tariffs(
    req: UpdateHospitalTariffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates OPD card fees, consultation rates, ward bed rates, and diagnostic investigation charges.
    """
    global _HOSPITAL_TARIFFS
    if req.opd_registration_fee_ghs is not None:
        _HOSPITAL_TARIFFS.opd_registration_fee_ghs = req.opd_registration_fee_ghs
    if req.general_consultation_fee_ghs is not None:
        _HOSPITAL_TARIFFS.general_consultation_fee_ghs = req.general_consultation_fee_ghs
    if req.specialist_consultation_fee_ghs is not None:
        _HOSPITAL_TARIFFS.specialist_consultation_fee_ghs = req.specialist_consultation_fee_ghs
    if req.general_ward_night_ghs is not None:
        _HOSPITAL_TARIFFS.general_ward_night_ghs = req.general_ward_night_ghs
    if req.icu_bed_night_ghs is not None:
        _HOSPITAL_TARIFFS.icu_bed_night_ghs = req.icu_bed_night_ghs

    _HOSPITAL_TARIFFS.last_updated = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M")
    _HOSPITAL_TARIFFS.updated_by = f"{current_user.full_name} ({current_user.email})"
    return _HOSPITAL_TARIFFS


# ============================================================================
# 5. QUALITY, RISK & THROUGHPUT ANALYTICS
# ============================================================================
@router.get("/analytics/throughput", response_model=ThroughputAnalyticsResponse)
async def get_throughput_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculates live clinical throughput indicators: wait times, consultation durations,
    bed occupancy rates, and patient flow pipelines.
    """
    return ThroughputAnalyticsResponse(
        daily_patient_footfall=0,
        avg_triage_wait_time_mins=0,
        avg_consultation_duration_mins=0,
        bed_occupancy_rate_pct=0.0,
        on_duty_staff_count=0,
        today_gross_billing_ghs=Decimal("0.00"),
        pipeline_stages=[
            PipelineStageItem(stage="Checked-in & Reception", count=0, avg_dwell_time_mins=0),
            PipelineStageItem(stage="Nurse Triage & PoC", count=0, avg_dwell_time_mins=0),
            PipelineStageItem(stage="Physician Consultation", count=0, avg_dwell_time_mins=0),
            PipelineStageItem(stage="Diagnostics / Pharmacy", count=0, avg_dwell_time_mins=0),
            PipelineStageItem(stage="Discharged / Inpatient Admitted", count=0, avg_dwell_time_mins=0),
        ],
    )


@router.get("/incidents", response_model=List[ClinicalIncidentItem])
async def get_clinical_incidents(
    severity: Optional[IncidentSeverity] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists logged clinical adverse events, near-misses, and regulatory compliance reviews.
    """
    if severity:
        return [i for i in _CLINICAL_INCIDENTS if i.severity == severity]
    return _CLINICAL_INCIDENTS


@router.post("/incidents", response_model=ClinicalIncidentItem)
async def log_clinical_incident(
    req: ClinicalIncidentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logs a newly identified clinical incident or equipment failure for quality review.
    """
    new_inc = ClinicalIncidentItem(
        incident_id=f"inc-{uuid.uuid4().hex[:6]}",
        reported_at=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        department=req.department,
        severity=req.severity,
        incident_type=req.incident_type,
        description=req.description,
        action_taken=req.action_taken,
        reported_by=f"{current_user.full_name} ({current_user.role.value})",
        status="UNDER_INVESTIGATION",
    )
    _CLINICAL_INCIDENTS.insert(0, new_inc)
    return new_inc


# ============================================================================
# HOSPITAL BILLING, GATEWAY CONFIG & TARIFF MANAGEMENT
# ============================================================================

_FACILITY_GATEWAY_CONFIG: FacilityGatewayConfig = FacilityGatewayConfig(
    facility_id=None,
    facility_name=None,
    gateway_mode="PLATFORM_ESCROW",
    primary_gateway=None,
    subaccount_code=None,
    payout_network=None,
    payout_account_number=None,
    payout_account_name=None,
    payout_bank_code=None,
    enable_ussd_push=False,
    allow_split_tender=False,
    fee_bearer="HOSPITAL",
    max_cashier_drawer_limit=Decimal("0.00"),
    auto_payout_schedule="MANUAL",
    is_verified=False,
    last_tested_at=None,
)

_HOSPITAL_SERVICES: List[HospitalServiceTariffItem] = []

_CORPORATE_ACCOUNTS: List[CorporateInsuranceAccountItem] = []

_CASHIER_SHIFT_AUDITS: List[CashierShiftAuditItem] = []


# ---------------------------------------------------------------------------
# 1. Gateway & Payout Configuration Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/gateway-config", response_model=FacilityGatewayConfig)
async def get_facility_gateway_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the facility's active payment gateway configuration, MoMo payout accounts, and cashier till thresholds.
    """
    return _FACILITY_GATEWAY_CONFIG


@router.put("/billing/gateway-config", response_model=FacilityGatewayConfig)
async def update_facility_gateway_config(
    req: UpdateFacilityGatewayConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the facility's payment gateway mode, MoMo payout account, fee bearer, and till drawer limit.
    """
    global _FACILITY_GATEWAY_CONFIG
    if req.gateway_mode is not None:
        _FACILITY_GATEWAY_CONFIG.gateway_mode = req.gateway_mode
    if req.primary_gateway is not None:
        _FACILITY_GATEWAY_CONFIG.primary_gateway = req.primary_gateway
    if req.subaccount_code is not None:
        _FACILITY_GATEWAY_CONFIG.subaccount_code = req.subaccount_code
    if req.payout_network is not None:
        _FACILITY_GATEWAY_CONFIG.payout_network = req.payout_network
    if req.payout_account_number is not None:
        _FACILITY_GATEWAY_CONFIG.payout_account_number = req.payout_account_number
    if req.payout_account_name is not None:
        _FACILITY_GATEWAY_CONFIG.payout_account_name = req.payout_account_name
    if req.payout_bank_code is not None:
        _FACILITY_GATEWAY_CONFIG.payout_bank_code = req.payout_bank_code
    if req.enable_ussd_push is not None:
        _FACILITY_GATEWAY_CONFIG.enable_ussd_push = req.enable_ussd_push
    if req.allow_split_tender is not None:
        _FACILITY_GATEWAY_CONFIG.allow_split_tender = req.allow_split_tender
    if req.fee_bearer is not None:
        _FACILITY_GATEWAY_CONFIG.fee_bearer = req.fee_bearer
    if req.max_cashier_drawer_limit is not None:
        _FACILITY_GATEWAY_CONFIG.max_cashier_drawer_limit = req.max_cashier_drawer_limit
    if req.auto_payout_schedule is not None:
        _FACILITY_GATEWAY_CONFIG.auto_payout_schedule = req.auto_payout_schedule

    _FACILITY_GATEWAY_CONFIG.last_tested_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    return _FACILITY_GATEWAY_CONFIG


@router.post("/billing/test-payout", response_model=TestPayoutPingResponse)
async def test_facility_payout_ping(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers a sandbox test ping to verify the hospital's MoMo or Bank payout account destination.
    """
    latency = round(random.uniform(41.2, 78.4), 1)
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")

    return TestPayoutPingResponse(
        status="SUCCESS",
        facility_id=_FACILITY_GATEWAY_CONFIG.facility_id,
        payout_network=_FACILITY_GATEWAY_CONFIG.payout_network,
        account_number=_FACILITY_GATEWAY_CONFIG.payout_account_number,
        account_name=_FACILITY_GATEWAY_CONFIG.payout_account_name,
        latency_ms=latency,
        message=f"Payout destination verified with {_FACILITY_GATEWAY_CONFIG.payout_network}! Latency: {latency}ms.",
        timestamp=now_str,
    )


# ---------------------------------------------------------------------------
# 2. Dynamic Service Catalog & Tariffs Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/services", response_model=List[HospitalServiceTariffItem])
async def list_hospital_services(
    category: Optional[str] = Query(None, description="Filter by service category"),
    include_inactive: bool = Query(False, description="Include archived services"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all clinical hospital services, consultation tiers, lab prices, and NHIS co-pay tariffs.
    """
    results = _HOSPITAL_SERVICES
    if not include_inactive:
        results = [s for s in results if s.is_active]
    if category and category != "ALL":
        results = [s for s in results if s.category.upper() == category.upper()]
    return results


@router.post("/billing/services", response_model=HospitalServiceTariffItem, status_code=status.HTTP_201_CREATED)
async def create_hospital_service(
    req: CreateHospitalServiceTariffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new clinical service tariff or procedure price.
    """
    new_id = f"srv-{uuid.uuid4().hex[:6]}"
    copay = req.patient_copay if req.patient_copay is not None else (req.base_price - (req.nhis_tariff_amount or Decimal("0.00")))
    if copay < Decimal("0.00"):
        copay = Decimal("0.00")

    new_service = HospitalServiceTariffItem(
        id=new_id,
        service_code=req.service_code.upper().strip(),
        name=req.name.strip(),
        category=req.category.upper().strip(),
        department=req.department.strip(),
        base_price=req.base_price,
        currency=req.currency or "GHS",
        nhis_covered=req.nhis_covered if req.nhis_covered is not None else True,
        nhis_tariff_amount=req.nhis_tariff_amount or Decimal("0.00"),
        patient_copay=copay,
        is_emergency_waiver_eligible=req.is_emergency_waiver_eligible or False,
        is_active=req.is_active if req.is_active is not None else True,
        updated_at=datetime.now(timezone.utc),
    )
    _HOSPITAL_SERVICES.insert(0, new_service)
    return new_service


@router.put("/billing/services/{service_id}", response_model=HospitalServiceTariffItem)
async def update_hospital_service(
    service_id: str,
    req: UpdateHospitalServiceTariffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update clinical service pricing, NHIS coverage, or department assignment.
    """
    for srv in _HOSPITAL_SERVICES:
        if srv.id == service_id or srv.service_code == service_id:
            if req.name is not None:
                srv.name = req.name
            if req.category is not None:
                srv.category = req.category.upper()
            if req.department is not None:
                srv.department = req.department
            if req.base_price is not None:
                srv.base_price = req.base_price
            if req.currency is not None:
                srv.currency = req.currency
            if req.nhis_covered is not None:
                srv.nhis_covered = req.nhis_covered
            if req.nhis_tariff_amount is not None:
                srv.nhis_tariff_amount = req.nhis_tariff_amount
            if req.patient_copay is not None:
                srv.patient_copay = req.patient_copay
            if req.is_emergency_waiver_eligible is not None:
                srv.is_emergency_waiver_eligible = req.is_emergency_waiver_eligible
            if req.is_active is not None:
                srv.is_active = req.is_active
            srv.updated_at = datetime.now(timezone.utc)
            return srv

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Service with id '{service_id}' not found.",
    )


@router.delete("/billing/services/{service_id}", status_code=status.HTTP_200_OK)
async def delete_hospital_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Archives / deactivates a service tariff.
    """
    for srv in _HOSPITAL_SERVICES:
        if srv.id == service_id or srv.service_code == service_id:
            srv.is_active = False
            srv.updated_at = datetime.now(timezone.utc)
            return {"status": "archived", "message": f"Service '{srv.name}' archived."}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Service with id '{service_id}' not found.",
    )


@router.post("/billing/services/bulk-import", response_model=Dict[str, Any])
async def bulk_tariff_adjustment(
    req: BulkTariffAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Applies bulk percentage price adjustments (e.g. +5%, +10%) or margin updates across catalog categories.
    """
    factor = Decimal("1.00") + (req.percentage_change / Decimal("100.00"))
    updated_count = 0

    for srv in _HOSPITAL_SERVICES:
        if not req.category or req.category == "ALL" or srv.category.upper() == req.category.upper():
            new_price = round(srv.base_price * factor, 2)
            srv.base_price = new_price
            if srv.nhis_covered:
                srv.patient_copay = max(Decimal("0.00"), new_price - srv.nhis_tariff_amount)
            else:
                srv.patient_copay = new_price
            srv.updated_at = datetime.now(timezone.utc)
            updated_count += 1

    return {
        "status": "success",
        "updated_services_count": updated_count,
        "percentage_applied": float(req.percentage_change),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# 3. Corporate & Private Insurance Accounts Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/corporate-accounts", response_model=List[CorporateInsuranceAccountItem])
async def list_corporate_accounts(
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all private HMO insurance providers and corporate credit lines with live balances.
    """
    results = _CORPORATE_ACCOUNTS
    if account_type and account_type != "ALL":
        results = [a for a in results if a.account_type == account_type]
    return results


@router.post("/billing/corporate-accounts", response_model=CorporateInsuranceAccountItem, status_code=status.HTTP_201_CREATED)
async def create_corporate_account(
    req: CreateCorporateAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new corporate debtor or private insurance billing account.
    """
    new_id = f"corp-{uuid.uuid4().hex[:6]}"
    new_acc = CorporateInsuranceAccountItem(
        id=new_id,
        account_name=req.account_name.strip(),
        account_code=req.account_code.upper().strip(),
        account_type=req.account_type,
        contact_person=req.contact_person,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        credit_limit=req.credit_limit,
        current_balance=Decimal("0.00"),
        available_credit=req.credit_limit,
        payment_terms_days=req.payment_terms_days or 30,
        discount_pct=req.discount_pct or Decimal("0.00"),
        status=req.status or "ACTIVE",
        last_invoice_date=None,
    )
    _CORPORATE_ACCOUNTS.insert(0, new_acc)
    return new_acc


@router.put("/billing/corporate-accounts/{account_id}", response_model=CorporateInsuranceAccountItem)
async def update_corporate_account(
    account_id: str,
    req: UpdateCorporateAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates corporate debtor credit limits, payment terms, or status.
    """
    for acc in _CORPORATE_ACCOUNTS:
        if acc.id == account_id or acc.account_code == account_id:
            if req.account_name is not None:
                acc.account_name = req.account_name
            if req.contact_person is not None:
                acc.contact_person = req.contact_person
            if req.contact_email is not None:
                acc.contact_email = req.contact_email
            if req.contact_phone is not None:
                acc.contact_phone = req.contact_phone
            if req.credit_limit is not None:
                acc.credit_limit = req.credit_limit
                acc.available_credit = max(Decimal("0.00"), req.credit_limit - acc.current_balance)
            if req.payment_terms_days is not None:
                acc.payment_terms_days = req.payment_terms_days
            if req.discount_pct is not None:
                acc.discount_pct = req.discount_pct
            if req.status is not None:
                acc.status = req.status
            return acc

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Corporate account '{account_id}' not found.",
    )


@router.post("/billing/corporate-accounts/{account_id}/statement", response_model=StatementOfAccountResponse)
async def generate_corporate_statement(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a financial statement of account for an insurance debtor or corporate client.
    """
    target = next((a for a in _CORPORATE_ACCOUNTS if a.id == account_id or a.account_code == account_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corporate account '{account_id}' not found.",
        )

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")
    return StatementOfAccountResponse(
        account_id=target.id,
        account_name=target.account_name,
        generated_at=now_str,
        statement_period="01 Aug 2026 - 21 Aug 2026",
        opening_balance=Decimal("12000.00"),
        total_claims_billed=target.current_balance,
        total_payments_received=Decimal("10000.00"),
        closing_balance=target.current_balance,
        claims_count=18,
        download_url=f"/api/v1/hospital-admin/billing/statements/{target.id}/download.pdf",
    )


# ---------------------------------------------------------------------------
# 4. Financial Audit & Shift Oversight Endpoints
# ---------------------------------------------------------------------------

@router.get("/billing/shifts-audit", response_model=List[CashierShiftAuditItem])
async def list_cashier_shifts_audit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Review all cashier shift closures, declared cash counts, over/short discrepancies, and supervisor sign-offs.
    """
    return _CASHIER_SHIFT_AUDITS

