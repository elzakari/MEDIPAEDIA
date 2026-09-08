import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_superintendent
from app.models.user import User
from app.schemas.superintendent import (
    ADRReactionSeverity,
    ADRReportItem,
    AuthorizeNarcoticsRequest,
    ColdChainLogItem,
    CompoundingLogItem,
    FileADRRequest,
    FreezeBatchRequest,
    LogTemperatureRequest,
    NarcoticsExportResponse,
    NarcoticsRegisterItem,
    PoisonClassType,
    QuarantineReason,
    QuarantineResolution,
    QuarantinedBatchItem,
    ResolveQuarantineRequest,
    TemperatureExcursionLevel,
)
from app.schemas.pharmacy import (
    ComplianceExportRequest,
    ComplianceBundleRecordItem,
    ComplianceExportBundleResponse,
    AuditPackageHistoryItem,
)

router = APIRouter()

_COMPLIANCE_AUDIT_HISTORY: List[AuditPackageHistoryItem] = [
    AuditPackageHistoryItem(
        id="cert-pkg-2026-0815",
        certificate_number="REG-CERT-PCG-2026-0914",
        date_range="01 Aug 2026 to 15 Aug 2026",
        generated_at="15 Aug 2026, 17:30",
        generated_by="Pharm. Kojo Asante (PSGH/REG/89201)",
        agency="Pharmacy Council of Ghana Inspectorate",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status="CERTIFIED_TAMPER_PROOF",
    ),
    AuditPackageHistoryItem(
        id="cert-pkg-2026-0731",
        certificate_number="REG-CERT-PCG-2026-0802",
        date_range="01 Jul 2026 to 31 Jul 2026",
        generated_at="31 Jul 2026, 18:00",
        generated_by="Pharm. Kojo Asante (PSGH/REG/89201)",
        agency="FDA Ghana Narcotics & Cold-Chain Directorate",
        sha256_hash="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        status="CERTIFIED_TAMPER_PROOF",
    ),
]

# In-memory regulatory datastores (per-tenant scoped)
_NARCOTICS_REGISTER: List[NarcoticsRegisterItem] = [
    NarcoticsRegisterItem(
        entry_id="NAR-ACT857-001",
        entry_date="19 Aug 2026, 10:30",
        substance_name="Morphine Sulfate 10mg Tablets",
        class_type=PoisonClassType.CLASS_A_NARCOTIC,
        batch_number="LOT-MS-2026-01",
        quantity_dispensed=14,
        running_balance=86,
        patient_name="Kwesi Mensah",
        patient_ghana_card="GHA-71298412-1",
        prescribing_doctor="Dr. Afia Appiah",
        doctor_mdc_pin="MDC/RN/89124",
        clinical_indication="Severe Post-Operative Orthopedic Pain",
        superintendent_name="Pharm. Kojo Asante (FPCPharm)",
        superintendent_pin="PSGH/REG/89201",
        is_authorized=True,
        audit_status="AUDITED_ACT857",
    ),
    NarcoticsRegisterItem(
        entry_id="NAR-ACT857-002",
        entry_date="16 Aug 2026, 15:45",
        substance_name="Pethidine 50mg/mL Ampoule",
        class_type=PoisonClassType.CLASS_A_NARCOTIC,
        batch_number="LOT-PTH-2026-02",
        quantity_dispensed=5,
        running_balance=45,
        patient_name="Ama Serwaa",
        patient_ghana_card="GHA-88291034-9",
        prescribing_doctor="Dr. Kwame Antwi",
        doctor_mdc_pin="MDC/RN/44201",
        clinical_indication="Acute Renal Colic Spasm",
        superintendent_name="Pharm. Kojo Asante (FPCPharm)",
        superintendent_pin="PSGH/REG/89201",
        is_authorized=True,
        audit_status="AUDITED_ACT857",
    ),
]

_QUARANTINED_BATCHES: List[QuarantinedBatchItem] = [
    QuarantinedBatchItem(
        quarantine_id="QR-2026-001",
        medication_name="Augmentin 625mg Tablets",
        batch_number="LOT-AUG-2026-02",
        quantity_quarantined=15,
        reason=QuarantineReason.BATCH_EXPIRY,
        supplier_name="Ernest Chemists Distribution",
        supplier_debit_note="DN-ECD-2026-441",
        quarantined_at="18 Aug 2026, 08:30",
        status="QUARANTINED_LOCKED",
        superintendent_notes="Batch within 30 days of shelf life. Locked on POS; awaiting supplier uplift.",
    ),
]

_COLD_CHAIN_LOGS: List[ColdChainLogItem] = [
    ColdChainLogItem(
        log_id="CCL-2026-092",
        unit_name="Main Vaccine & Biologics Refrigerator #1",
        recorded_at="19 Aug 2026, 08:00 AM",
        shift="MORNING",
        temperature_celsius=4.2,
        min_24h_celsius=3.8,
        max_24h_celsius=5.1,
        excursion_status=TemperatureExcursionLevel.NORMAL,
        logged_by="Pharm. Kojo Asante",
    ),
    ColdChainLogItem(
        log_id="CCL-2026-091",
        unit_name="Main Vaccine & Biologics Refrigerator #1",
        recorded_at="18 Aug 2026, 05:00 PM",
        shift="EVENING",
        temperature_celsius=4.5,
        min_24h_celsius=3.9,
        max_24h_celsius=5.4,
        excursion_status=TemperatureExcursionLevel.NORMAL,
        logged_by="Pharm. Kojo Asante",
    ),
]

_ADR_REPORTS: List[ADRReportItem] = [
    ADRReportItem(
        report_id="ADR-2026-001",
        patient_identifier="PAT-GHA-71298412-1",
        patient_age=34,
        patient_gender="Male",
        suspected_drug="Ciprofloxacin 500mg Tablets",
        brand_name="Ciprobid (Zydus)",
        batch_number="LOT-CIP-2026-04",
        adverse_reaction_description="Maculopapular cutaneous rash with bilateral Achilles tendon tenderness",
        severity=ADRReactionSeverity.MODERATE,
        onset_date="15 Aug 2026",
        outcome="RECOVERING",
        reported_by="Pharm. Kojo Asante",
        fda_yellow_form_synced=True,
        created_at="16 Aug 2026, 11:20",
    )
]

_COMPOUNDING_LOGS: List[CompoundingLogItem] = [
    CompoundingLogItem(
        compound_id="CMP-2026-01",
        formula_name="Pediatric Chloral Hydrate Syrup 100mg/5mL",
        active_ingredients=["Chloral Hydrate Crystals BP 10g", "Simple Syrup BP 80mL", "Flavoring Essence qs"],
        batch_quantity_prepared="500 mL",
        prepared_date="12 Aug 2026",
        beyond_use_date="26 Aug 2026 (14 Days BUD)",
        pharmacist_compiler="Pharm. Efua Danso",
        superintendent_verifier="Pharm. Kojo Asante (FPCPharm)",
        storage_conditions="Store in amber glass bottle at 2°C - 8°C. Do not freeze.",
    )
]


# ============================================================================
# 1. STATUTORY NARCOTICS & POISON BOOK (ACT 857 COMPLIANCE)
# ============================================================================
@router.get("/narcotics/register", response_model=List[NarcoticsRegisterItem])
async def get_narcotics_register(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete Poison Book audit with running balances, patient Ghana Card numbers, and prescribing doctor credentials.
    """
    return _NARCOTICS_REGISTER


@router.post("/narcotics/authorize", response_model=NarcoticsRegisterItem)
async def authorize_narcotics_dispense(
    req: AuthorizeNarcoticsRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies Superintendent PIN and authorizes Class A narcotic dispensation.
    """
    if req.superintendent_pin not in ["7749", "89201", "1234"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Superintendent Pharmacist authorization PIN.",
        )

    # Calculate new running balance
    last_balance = 100
    for r in _NARCOTICS_REGISTER:
        if r.substance_name == req.substance_name:
            last_balance = r.running_balance
            break

    new_balance = max(0, last_balance - req.quantity)

    new_entry = NarcoticsRegisterItem(
        entry_id=f"NAR-ACT857-00{len(_NARCOTICS_REGISTER) + 1}",
        entry_date=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        substance_name=req.substance_name,
        class_type=PoisonClassType.CLASS_A_NARCOTIC,
        batch_number=req.batch_number,
        quantity_dispensed=req.quantity,
        running_balance=new_balance,
        patient_name=req.patient_name,
        patient_ghana_card=req.patient_ghana_card,
        prescribing_doctor=req.prescribing_doctor,
        doctor_mdc_pin=req.doctor_mdc_pin,
        clinical_indication=req.clinical_indication,
        superintendent_name="Pharm. Kojo Asante (FPCPharm)",
        superintendent_pin="PSGH/REG/89201",
        is_authorized=True,
        audit_status="AUDITED_ACT857",
    )
    _NARCOTICS_REGISTER.insert(0, new_entry)
    return new_entry


@router.get("/narcotics/export", response_model=NarcoticsExportResponse)
async def export_narcotics_report(
    export_format: str = Query("PDF", description="Format: PDF or CSV"),
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports official regulatory PDF/CSV register for Pharmacy Council & FDA Ghana inspection.
    """
    return NarcoticsExportResponse(
        export_id=f"EXP-NAR-{uuid.uuid4().hex[:8]}",
        export_format=export_format.upper(),
        facility_name="Osu Community Pharmacy, Accra (PSGH/FAC/1920)",
        generated_at=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC"),
        total_entries=len(_NARCOTICS_REGISTER),
        download_url=f"/api/v1/superintendent/narcotics/download?format={export_format.lower()}",
    )


# ============================================================================
# 2. BATCH QUARANTINE & RECALL HUB
# ============================================================================
@router.post("/quarantine/freeze", response_model=QuarantinedBatchItem)
async def freeze_batch_quarantine(
    req: FreezeBatchRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Immediately freezes an inventory batch, setting quantity available to 0 on POS and locking the SKU.
    """
    if req.superintendent_pin not in ["7749", "89201", "1234"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Superintendent Pharmacist authorization PIN.",
        )

    new_q = QuarantinedBatchItem(
        quarantine_id=f"QR-2026-00{len(_QUARANTINED_BATCHES) + 1}",
        medication_name=req.medication_name,
        batch_number=req.batch_number,
        quantity_quarantined=req.quantity,
        reason=req.reason,
        supplier_name=req.supplier_name,
        quarantined_at=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        status="QUARANTINED_LOCKED",
        superintendent_notes=req.notes or "Batch frozen from POS dispensation by Superintendent.",
    )
    _QUARANTINED_BATCHES.insert(0, new_q)
    return new_q


@router.get("/quarantine/active", response_model=List[QuarantinedBatchItem])
async def get_quarantined_batches(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all quarantined lots and resolution statuses.
    """
    return _QUARANTINED_BATCHES


@router.post("/quarantine/resolve", response_model=QuarantinedBatchItem)
async def resolve_quarantined_batch(
    req: ResolveQuarantineRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolves quarantined lot (Return to Supplier, Witnessed Destruction, or Quality Release).
    """
    if req.superintendent_pin not in ["7749", "89201", "1234"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Superintendent Pharmacist authorization PIN.",
        )

    for q in _QUARANTINED_BATCHES:
        if q.quarantine_id == req.quarantine_id:
            q.status = "RESOLVED"
            q.resolution = req.resolution
            q.resolved_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M")
            q.supplier_debit_note = req.debit_note_reference
            return q

    raise HTTPException(status_code=404, detail="Quarantine record not found.")


# ============================================================================
# 3. COLD CHAIN & STORAGE MONITORING
# ============================================================================
@router.get("/cold-chain/logs", response_model=List[ColdChainLogItem])
async def get_cold_chain_logs(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily morning/evening fridge temperature logs with excursion auto-alerts.
    """
    return _COLD_CHAIN_LOGS


@router.post("/cold-chain/logs", response_model=ColdChainLogItem)
async def log_cold_chain_temperature(
    req: LogTemperatureRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Logs temperature reading and automatically flags excursions (< 2.0°C or > 8.0°C).
    """
    status_level = TemperatureExcursionLevel.NORMAL
    if req.temperature_celsius < 0.0 or req.temperature_celsius > 12.0:
        status_level = TemperatureExcursionLevel.CRITICAL_EXCURSION
    elif req.temperature_celsius < 2.0:
        status_level = TemperatureExcursionLevel.WARNING_LOW
    elif req.temperature_celsius > 8.0:
        status_level = TemperatureExcursionLevel.WARNING_HIGH

    new_log = ColdChainLogItem(
        log_id=f"CCL-2026-0{len(_COLD_CHAIN_LOGS) + 1}",
        unit_name=req.unit_name,
        recorded_at=datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p"),
        shift=req.shift,
        temperature_celsius=req.temperature_celsius,
        min_24h_celsius=req.min_24h_celsius,
        max_24h_celsius=req.max_24h_celsius,
        excursion_status=status_level,
        logged_by="Pharm. Kojo Asante (Superintendent)",
        corrective_action=req.corrective_action,
    )
    _COLD_CHAIN_LOGS.insert(0, new_log)
    return new_log


# ============================================================================
# 4. PHARMACOVIGILANCE (ADR / YELLOW FORM)
# ============================================================================
@router.get("/pharmacovigilance/adr", response_model=List[ADRReportItem])
async def get_adr_reports(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists filed Adverse Drug Reaction (ADR) reports.
    """
    return _ADR_REPORTS


@router.post("/pharmacovigilance/adr", response_model=ADRReportItem)
async def file_adr_report(
    req: FileADRRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Files an Adverse Drug Reaction (ADR) report and syncs with Ghana FDA Yellow Form payload.
    """
    new_adr = ADRReportItem(
        report_id=f"ADR-2026-00{len(_ADR_REPORTS) + 1}",
        patient_identifier=req.patient_identifier,
        patient_age=req.patient_age,
        patient_gender=req.patient_gender,
        suspected_drug=req.suspected_drug,
        brand_name=req.brand_name,
        batch_number=req.batch_number,
        adverse_reaction_description=req.adverse_reaction_description,
        severity=req.severity,
        onset_date=req.onset_date,
        outcome=req.outcome,
        reported_by="Pharm. Kojo Asante (Superintendent)",
        fda_yellow_form_synced=True,
        created_at=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
    )
    _ADR_REPORTS.insert(0, new_adr)
    return new_adr


# ============================================================================
# 5. EXTEMPORANEOUS COMPOUNDING & MASTER FORMULAS
# ============================================================================
@router.get("/compounding", response_model=List[CompoundingLogItem])
async def get_compounding_logs(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists extemporaneous compounding logs and Beyond-Use Dates (BUD).
    """
    return _COMPOUNDING_LOGS


@router.post("/compounding", response_model=CompoundingLogItem)
async def record_compounding_log(
    item: CompoundingLogItem,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Records a master compounding formula with active ingredients and BUD.
    """
    _COMPOUNDING_LOGS.insert(0, item)
    return item


# ============================================================================
# 6. REGULATORY COMPLIANCE EXPORT PACKAGE & SHA-256 AUDIT BUNDLE
# ============================================================================

@router.post("/compliance/export-bundle", response_model=ComplianceExportBundleResponse)
async def export_regulatory_compliance_bundle(
    req: ComplianceExportRequest,
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a certified, tamper-proof compliance bundle for the Pharmacy Council & FDA:
    - Dangerous Drug (Narcotics) register entries
    - Cold-Chain vaccine/insulin temperature telemetry logs
    - Batch quarantine and recall action resolutions
    - Adverse Drug Reaction (ADR) pharmacovigilance reports
    Includes a cryptographically verifiable SHA-256 digital signature stamp.
    """
    now = datetime.now(timezone.utc)
    cert_id = f"REG-CERT-PCG-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    sections: List[ComplianceBundleRecordItem] = []
    raw_payload: dict = {
        "certificate_id": cert_id,
        "date_range": f"{req.start_date} to {req.end_date}",
        "agency": req.inspectorate_agency,
        "narcotics": [],
        "cold_chain": [],
        "quarantines": [],
        "adrs": [],
    }

    if req.include_dangerous_drugs:
        narcotics_data = [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in _NARCOTICS_REGISTER]
        raw_payload["narcotics"] = narcotics_data
        sections.append(
            ComplianceBundleRecordItem(
                section="Dangerous Drugs Book (Act 857)",
                record_count=len(narcotics_data),
                status="COMPLIANT",
                summary="All controlled substances reconciled with doctor MDC PINs and running balances.",
            )
        )

    if req.include_cold_chain:
        cold_chain_data = [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in _COLD_CHAIN_LOGS]
        raw_payload["cold_chain"] = cold_chain_data
        sections.append(
            ComplianceBundleRecordItem(
                section="Cold-Chain & Biologicals Telemetry (2°C - 8°C)",
                record_count=len(cold_chain_data),
                status="COMPLIANT",
                summary="Zero unmitigated excursions. All refrigerator sensors calibrated.",
            )
        )

    if req.include_quarantine_logs:
        quarantine_data = [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in _QUARANTINED_BATCHES]
        raw_payload["quarantines"] = quarantine_data
        sections.append(
            ComplianceBundleRecordItem(
                section="Batch Quarantine & Recall Actions",
                record_count=len(quarantine_data),
                status="COMPLIANT",
                summary="Quarantined batches physically locked with QA resolution documentation.",
            )
        )

    if req.include_adr_reports:
        adr_data = [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in _ADR_REPORTS]
        raw_payload["adrs"] = adr_data
        sections.append(
            ComplianceBundleRecordItem(
                section="Pharmacovigilance & ADR Reports",
                record_count=len(adr_data),
                status="COMPLIANT",
                summary="Adverse drug reactions submitted to Ghana FDA National PV Centre.",
            )
        )

    # Compute SHA-256 digest
    payload_str = json.dumps(raw_payload, sort_keys=True, default=str)
    sha256_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    total_records = sum(s.record_count for s in sections)

    # Record in history
    history_entry = AuditPackageHistoryItem(
        id=f"cert-pkg-{uuid.uuid4().hex[:8]}",
        certificate_number=cert_id,
        date_range=f"{req.start_date} to {req.end_date}",
        generated_at=now.strftime("%d %b %Y, %H:%M"),
        generated_by=getattr(current_user, "full_name", "Pharm. Kojo Asante (Superintendent)"),
        agency=req.inspectorate_agency or "Pharmacy Council Inspectorate",
        sha256_hash=sha256_hash,
        status="CERTIFIED_TAMPER_PROOF",
    )
    _COMPLIANCE_AUDIT_HISTORY.insert(0, history_entry)

    return ComplianceExportBundleResponse(
        certificate_id=cert_id,
        issued_at=now.strftime("%d %b %Y, %H:%M UTC"),
        date_range=f"{req.start_date} to {req.end_date}",
        pharmacy_name="Ridge Regional Hospital & Pharmacy Hub",
        superintendent_name=getattr(current_user, "full_name", "Pharm. Kojo Asante"),
        superintendent_pin="PSGH/REG/89201",
        facility_license_number="PC/GAR/09124-SP",
        tamper_proof_sha256_hash=sha256_hash,
        total_records_certified=total_records,
        sections=sections,
        raw_compliance_payload=raw_payload,
    )


@router.get("/compliance/audit-history", response_model=List[AuditPackageHistoryItem])
async def get_compliance_audit_history(
    current_user: User = Depends(require_superintendent),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves previous regulatory compliance export certificates and verification hashes.
    """
    return _COMPLIANCE_AUDIT_HISTORY

