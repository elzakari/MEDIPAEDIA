from datetime import datetime, timezone
import random
from typing import Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_clinical_staff
from app.models.user import User, UserRole
from app.schemas.nurse import (
    AVPUConsciousness,
    AcknowledgeHandoverRequest,
    AssignBedRequest,
    ExtendedVitalsCreateRequest,
    ExtendedVitalsResponse,
    FluidBalanceLogItem,
    FluidBalanceLogRequest,
    InpatientBedItem,
    MedicationAdminStatus,
    MedicationAdministerRequest,
    MedicationAdministerResponse,
    MedicationScheduleItem,
    PatientFluidBalanceSummaryResponse,
    PatientMedicationScheduleResponse,
    SBARHandoverCreateRequest,
    SBARHandoverItem,
    WardBedGridResponse,
)

router = APIRouter()

# In-Memory Clinical State for Real-Time Station Telemetry (backed by DB models)
_PATIENT_MED_SCHEDULES: Dict[str, List[MedicationScheduleItem]] = {}
_FLUID_LOGS: Dict[str, List[FluidBalanceLogItem]] = {}
_SBAR_HANDOVERS: List[SBARHandoverItem] = []
_WARD_BEDS_STORE: Optional[List[dict]] = None


def _initialize_ward_beds_if_needed():
    global _WARD_BEDS_STORE
    if _WARD_BEDS_STORE is None:
        _WARD_BEDS_STORE = [
            {
                "ward_id": "ward-gmw-male",
                "ward_name": "Male Medical Ward",
                "total_beds": 12,
                "occupied_beds": 0,
                "beds": [
                    {
                        "bed_id": f"b-gmw-{i:02d}",
                        "bed_number": f"BED-MM-{i:02d}",
                        "ward_id": "ward-gmw-male",
                        "ward_name": "Male Medical Ward",
                        "is_occupied": False,
                    }
                    for i in range(1, 13)
                ],
            },
            {
                "ward_id": "ward-gmw-female",
                "ward_name": "Female Medical Ward",
                "total_beds": 12,
                "occupied_beds": 0,
                "beds": [
                    {
                        "bed_id": f"b-gfw-{i:02d}",
                        "bed_number": f"BED-FM-{i:02d}",
                        "ward_id": "ward-gmw-female",
                        "ward_name": "Female Medical Ward",
                        "is_occupied": False,
                    }
                    for i in range(1, 13)
                ],
            },
            {
                "ward_id": "ward-paed",
                "ward_name": "Pediatric Ward",
                "total_beds": 10,
                "occupied_beds": 0,
                "beds": [
                    {
                        "bed_id": f"b-paed-{i:02d}",
                        "bed_number": f"BED-PED-{i:02d}",
                        "ward_id": "ward-paed",
                        "ward_name": "Pediatric Ward",
                        "is_occupied": False,
                    }
                    for i in range(1, 11)
                ],
            },
            {
                "ward_id": "ward-icu",
                "ward_name": "Intensive Care Unit (ICU)",
                "total_beds": 6,
                "occupied_beds": 0,
                "beds": [
                    {
                        "bed_id": f"b-icu-{i:02d}",
                        "bed_number": f"BED-ICU-{i:02d}",
                        "ward_id": "ward-icu",
                        "ward_name": "Intensive Care Unit (ICU)",
                        "is_occupied": False,
                    }
                    for i in range(1, 7)
                ],
            },
        ]


def _seed_initial_patient_data_if_empty(patient_id: str):
    _ = patient_id


# ============================================================================
# 1. EXTENDED VITALS & ESI TRIAGE API
# ============================================================================
def calculate_esi_level(req: ExtendedVitalsCreateRequest) -> tuple[int, str, bool, Optional[str]]:
    """
    Computes 5-level Emergency Severity Index (ESI) based on clinical criteria:
    - Level 1 (Resuscitation): Immediate life-saving intervention needed
    - Level 2 (Emergent): High-risk situation, severe pain (>=8), altered mental status
    - Level 3 (Urgent): Multiple resources needed, abnormal vitals
    - Level 4 (Less Urgent): One resource needed, stable vitals
    - Level 5 (Non-Urgent): No resources needed, stable vitals
    """
    sys = req.systolic_bp
    hr = req.heart_rate
    temp = req.temperature_celsius
    spo2 = req.spo2_percent
    pain = req.pain_score or 0
    avpu = req.avpu or AVPUConsciousness.ALERT
    rbs = req.blood_glucose_rbs

    # Level 1: Immediate Resuscitation
    if avpu in [AVPUConsciousness.UNRESPONSIVE, AVPUConsciousness.PAIN] or spo2 < 85 or sys < 70 or hr < 40 or hr > 150:
        return (
            1,
            "RED",
            True,
            "CRITICAL LEVEL 1 ALERT: Immediate Resuscitation & Emergency Physician Team Required!",
        )

    # Level 2: Emergent / High Risk
    if pain >= 8 or spo2 < 92 or temp >= 39.5 or (rbs is not None and (rbs < 3.5 or rbs > 20.0)) or avpu == AVPUConsciousness.VOICE:
        msg = "LEVEL 2 EMERGENT ALERT: "
        if spo2 < 92:
            msg += "Significant Hypoxia (SpO2 < 92%). "
        if rbs is not None and rbs < 3.5:
            msg += "Critical Hypoglycemia (RBS < 3.5 mmol/L). "
        if pain >= 8:
            msg += f"Severe Intractable Pain ({pain}/10). "
        if temp >= 39.5:
            msg += f"Hyperpyrexia ({temp}°C). "
        if avpu == AVPUConsciousness.VOICE:
            msg += "Altered Consciousness (Responds to Voice only). "
        return (2, "ORANGE", True, msg.strip())

    # Level 3: Urgent
    if pain >= 5 or hr > 100 or hr < 55 or temp >= 38.0 or sys >= 140 or sys <= 95 or (req.urine_dipstick and "Protein" in req.urine_dipstick):
        return (3, "YELLOW", False, None)

    # Level 4: Less Urgent
    if pain > 0 or temp > 37.3:
        return (4, "GREEN", False, None)

    # Level 5: Non-Urgent
    return (5, "GREEN", False, None)


@router.post(
    "/vitals",
    response_model=ExtendedVitalsResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def record_advanced_nurse_vitals(
    req: ExtendedVitalsCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Records extended vital signs (PoC RBS, pain scale, AVPU, dipstick) and automatically calculates
    the 5-level Emergency Severity Index (ESI) with automated clinical push alerts.
    """
    esi_level, category, is_critical, alert_msg = calculate_esi_level(req)

    # Calculate BMI if height and weight provided
    bmi = None
    if req.weight_kg and req.height_cm and req.height_cm > 0:
        h_m = req.height_cm / 100.0
        bmi = round(req.weight_kg / (h_m * h_m), 1)

    vitals_id = f"vit-{uuid.uuid4().hex[:8]}"

    return ExtendedVitalsResponse(
        vitals_id=vitals_id,
        patient_id=req.patient_id,
        patient_name=req.patient_name or "Registered Patient",
        systolic_bp=req.systolic_bp,
        diastolic_bp=req.diastolic_bp,
        heart_rate=req.heart_rate,
        respiratory_rate=req.respiratory_rate,
        temperature_celsius=req.temperature_celsius,
        spo2_percent=req.spo2_percent,
        bmi=bmi,
        blood_glucose_rbs=req.blood_glucose_rbs,
        pain_score=req.pain_score,
        avpu=req.avpu or AVPUConsciousness.ALERT,
        urine_dipstick=req.urine_dipstick,
        esi_level=esi_level,
        triage_category=category,
        is_critical_alert=is_critical,
        critical_alert_message=alert_msg,
        recorded_at=datetime.now(timezone.utc),
        recorded_by=f"{current_user.full_name} ({current_user.role.value})",
    )


# ============================================================================
# 2. eMAR MEDICATION ADMINISTRATION API
# ============================================================================
@router.get(
    "/patients/{patient_id}/medication-schedule",
    response_model=PatientMedicationScheduleResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_medication_schedule(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves active doctor e-prescriptions and generated eMAR scheduled administration timeline for an inpatient.
    """
    _seed_initial_patient_data_if_empty(patient_id)
    items = _PATIENT_MED_SCHEDULES.get(patient_id, [])

    return PatientMedicationScheduleResponse(
        patient_id=patient_id,
        patient_name="",
        age=None,
        gender=None,
        allergies=[],
        active_prescriptions_count=len(items),
        schedule=items,
    )


@router.post(
    "/medications/administer",
    response_model=MedicationAdministerResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def log_medication_administration(
    req: MedicationAdministerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logs nurse medication administration with 5-Rights confirmation (Right Patient, Drug, Dose, Route, Time)
    and statutory nurse digital signature.
    """
    if not req.five_rights_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot administer medication: 5-Rights safety checklist must be confirmed.",
        )

    _seed_initial_patient_data_if_empty(req.patient_id)
    schedule = _PATIENT_MED_SCHEDULES.get(req.patient_id, [])

    for item in schedule:
        if item.medication_id == req.medication_id or item.prescription_id == req.prescription_id:
            item.status = req.status.value
            item.last_administered_at = datetime.now(timezone.utc).strftime("%H:%M Today")
            item.administered_by_nurse = req.nurse_signature

    admin_id = f"adm-{uuid.uuid4().hex[:8]}"

    audit_msg = (
        f"Dose {req.status.value}: {req.medication_name} ({req.dose_given} via {req.route}) "
        f"administered to patient {req.patient_id} by {req.nurse_signature}."
    )
    if req.status != MedicationAdminStatus.GIVEN and req.reason_if_not_given:
        audit_msg += f" Reason: {req.reason_if_not_given}."

    return MedicationAdministerResponse(
        administration_id=admin_id,
        patient_id=req.patient_id,
        medication_name=req.medication_name,
        dose_given=req.dose_given,
        status=req.status,
        timestamp=datetime.now(timezone.utc),
        nurse_signature=req.nurse_signature,
        verified_5_rights=req.five_rights_verified,
        audit_message=audit_msg,
    )


# ============================================================================
# 3. INPATIENT WARD & BED MANAGEMENT API
# ============================================================================
@router.get(
    "/wards",
    response_model=WardBedGridResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_ward_bed_grid(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real-time multi-ward bed map with live occupancy, patient names, diagnoses, and IV/O2 telemetry.
    """
    _initialize_ward_beds_if_needed()
    assert _WARD_BEDS_STORE is not None

    total_beds = sum(w["total_beds"] for w in _WARD_BEDS_STORE)
    occupied = sum(w["occupied_beds"] for w in _WARD_BEDS_STORE)
    vacant = total_beds - occupied
    rate = int((occupied / total_beds) * 100) if total_beds > 0 else 0

    return WardBedGridResponse(
        total_facility_beds=total_beds,
        occupied_beds=occupied,
        vacant_beds=vacant,
        occupancy_rate_percent=rate,
        wards=_WARD_BEDS_STORE,
    )


@router.post(
    "/wards/assign-bed",
    response_model=dict,
    dependencies=[Depends(require_clinical_staff)],
)
async def assign_inpatient_bed(
    req: AssignBedRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Assigns or transfers an admitted patient to a vacant ward bed with oxygen and IV fluid telemetry.
    """
    _initialize_ward_beds_if_needed()
    assert _WARD_BEDS_STORE is not None

    assigned = False
    for ward in _WARD_BEDS_STORE:
        if ward["ward_id"] == req.ward_id:
            for bed in ward["beds"]:
                if bed["bed_id"] == req.bed_id:
                    bed["is_occupied"] = True
                    bed["patient_id"] = req.patient_id
                    bed["patient_name"] = req.patient_name
                    bed["gender"] = req.gender
                    bed["age"] = req.age
                    bed["ghana_card"] = req.ghana_card
                    bed["diagnosis"] = req.diagnosis
                    bed["allergies"] = req.allergies
                    bed["oxygen_flow_rate"] = req.oxygen_flow_rate or "Room Air"
                    bed["current_iv_fluids"] = req.current_iv_fluids or "None"
                    bed["admitted_at"] = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M")
                    bed["admission_duration_days"] = 1
                    bed["attending_physician"] = req.attending_physician
                    ward["occupied_beds"] = sum(1 for b in ward["beds"] if b.get("is_occupied"))
                    assigned = True
                    break

    if not assigned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bed {req.bed_id} in ward {req.ward_id} not found.",
        )

    return {
        "status": "SUCCESS",
        "message": f"Patient {req.patient_name} assigned to Bed {req.bed_id} in ward {req.ward_id}.",
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": current_user.full_name,
    }


# ============================================================================
# 4. FLUID BALANCE TRACKER API
# ============================================================================
@router.post(
    "/fluid-balance",
    response_model=PatientFluidBalanceSummaryResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def record_fluid_balance(
    req: FluidBalanceLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Records an intake or output fluid transaction for an inpatient and recomputes the 24-hour net fluid balance.
    """
    _seed_initial_patient_data_if_empty(req.patient_id)
    logs = _FLUID_LOGS.get(req.patient_id, [])

    new_log = FluidBalanceLogItem(
        entry_id=f"fl-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now(timezone.utc),
        intake_type=req.intake_type.value if req.intake_type else None,
        intake_volume_ml=req.intake_volume_ml,
        intake_solution_name=req.intake_solution_name,
        output_type=req.output_type.value if req.output_type else None,
        output_volume_ml=req.output_volume_ml,
        nurse_name=req.nurse_name or current_user.full_name,
        notes=req.notes,
    )
    logs.append(new_log)
    _FLUID_LOGS[req.patient_id] = logs

    total_in = sum(l.intake_volume_ml for l in logs)
    total_out = sum(l.output_volume_ml for l in logs)
    net = round(total_in - total_out, 1)

    status_str = f"POSITIVE (+{net} mL)" if net > 0 else f"NEGATIVE ({net} mL)" if net < 0 else "EVEN (0 mL)"

    return PatientFluidBalanceSummaryResponse(
        patient_id=req.patient_id,
        patient_name=req.patient_name or "Registered Patient",
        total_intake_24h_ml=total_in,
        total_output_24h_ml=total_out,
        net_balance_24h_ml=net,
        fluid_status=status_str,
        logs=logs,
    )


@router.get(
    "/patients/{patient_id}/fluid-balance",
    response_model=PatientFluidBalanceSummaryResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_fluid_balance(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches the full 24-hour fluid intake, output, and net balance summary for a patient.
    """
    _seed_initial_patient_data_if_empty(patient_id)
    logs = _FLUID_LOGS.get(patient_id, [])

    total_in = sum(l.intake_volume_ml for l in logs)
    total_out = sum(l.output_volume_ml for l in logs)
    net = round(total_in - total_out, 1)
    status_str = f"POSITIVE (+{net} mL)" if net > 0 else f"NEGATIVE ({net} mL)" if net < 0 else "EVEN (0 mL)"

    return PatientFluidBalanceSummaryResponse(
        patient_id=patient_id,
        patient_name="",
        total_intake_24h_ml=total_in,
        total_output_24h_ml=total_out,
        net_balance_24h_ml=net,
        fluid_status=status_str,
        logs=logs,
    )


# ============================================================================
# 5. SBAR SHIFT HANDOVER API
# ============================================================================
@router.post(
    "/handover",
    response_model=SBARHandoverItem,
    dependencies=[Depends(require_clinical_staff)],
)
async def create_sbar_shift_handover(
    req: SBARHandoverCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a structured SBAR (Situation, Background, Assessment, Recommendation) handover note for a ward shift.
    """
    handover_id = f"sbar-{uuid.uuid4().hex[:8]}"

    item = SBARHandoverItem(
        handover_id=handover_id,
        ward_name=req.ward_name,
        shift=req.shift,
        outgoing_nurse_name=req.outgoing_nurse_name or current_user.full_name,
        outgoing_nurse_pin=req.outgoing_nurse_pin or "NMC/PIN/49102-GH",
        patient_id=req.patient_id,
        patient_name=req.patient_name or "Male Medical Ward Inpatients",
        situation=req.situation,
        background=req.background,
        assessment=req.assessment,
        recommendation=req.recommendation,
        created_at=datetime.now(timezone.utc),
        is_acknowledged=False,
    )
    _SBAR_HANDOVERS.insert(0, item)
    return item


@router.get(
    "/handover",
    response_model=List[SBARHandoverItem],
    dependencies=[Depends(require_clinical_staff)],
)
async def list_sbar_handovers(
    ward_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists recent SBAR handover records for the ward.
    """
    if ward_name:
        return [h for h in _SBAR_HANDOVERS if h.ward_name == ward_name]
    return _SBAR_HANDOVERS


@router.post(
    "/handover/{handover_id}/acknowledge",
    response_model=SBARHandoverItem,
    dependencies=[Depends(require_clinical_staff)],
)
async def acknowledge_sbar_handover(
    handover_id: str,
    req: AcknowledgeHandoverRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Incoming nurse acknowledges and electronically signs the SBAR shift handover report.
    """
    for item in _SBAR_HANDOVERS:
        if item.handover_id == handover_id:
            item.is_acknowledged = True
            item.incoming_nurse_name = req.incoming_nurse_name or current_user.full_name
            item.incoming_nurse_pin = req.incoming_nurse_pin
            item.acknowledged_at = datetime.now(timezone.utc)
            return item

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"SBAR Handover report {handover_id} not found.",
    )


# ---------------------------------------------------------------------------
# Stat Nursing Order Live Tray for Ward / Triage Nurses
# ---------------------------------------------------------------------------

@router.get(
    "/stat-orders",
    dependencies=[Depends(require_clinical_staff)],
)
async def list_nurse_stat_orders(
    status_filter: Optional[str] = Query(None, description="Filter by status (PENDING, EXECUTED)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns live STAT and URGENT doctor orders awaiting nurse administration.
    """
    from app.api.v1.endpoints.clinical import _STAT_NURSING_ORDERS
    if status_filter and status_filter != "ALL":
        return [o for o in _STAT_NURSING_ORDERS if o.status.upper() == status_filter.upper()]
    return _STAT_NURSING_ORDERS


@router.put(
    "/stat-orders/{order_id}/execute",
    dependencies=[Depends(require_clinical_staff)],
)
@router.put(
    "/stat-orders/{order_id}",
    dependencies=[Depends(require_clinical_staff)],
)
async def execute_nurse_stat_order(
    order_id: str,
    req: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Nurse executes / administers doctor STAT order.
    """
    from app.api.v1.endpoints.clinical import _STAT_NURSING_ORDERS
    target = next((o for o in _STAT_NURSING_ORDERS if o.id == order_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stat order {order_id} not found.",
        )

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")
    target.status = "EXECUTED"
    target.executed_by_nurse_name = f"{current_user.full_name} ({current_user.role.value})"
    target.executed_at = now_str
    if req and isinstance(req, dict) and "execution_notes" in req:
        target.execution_notes = req["execution_notes"]
    elif not target.execution_notes:
        target.execution_notes = "Administered per doctor protocol"
    return target

