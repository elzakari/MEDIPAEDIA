from datetime import datetime, timezone
from decimal import Decimal
import random
import string
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import (
    get_current_tenant,
    get_current_user,
    require_clinical_staff,
    require_roles,
)
from app.core.security import generate_prescription_signature
from app.models.clinical import (
    Consultation,
    ConsultationStatus,
    OpdQueueEntry,
    OpdQueueStatus,
    TriagePriority,
    Vitals,
)
from app.models.patient import HospitalPatientCard, PatientAccount
from app.models.inventory import GlobalMedication
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.tariffs import FormularyMedicationItemResponse
from app.schemas.clinical import (

    CheckInRequest,
    CheckInResponse,
    ICD10ItemResponse,
    OpdQueueItemResponse,
    PastConsultationSummary,
    PatientHistoryResponse,
    PrescriptionItemPrint,
    PrescriptionMintRequest,
    PrescriptionPrintResponse,
    SOAPConsultationCreateRequest,
    VitalsCreateRequest,
    VitalsResultResponse,
    ClinicalMacroCreateRequest,
    ClinicalMacroResponse,
    PatientLongitudinalTrendsResponse,
    StatNursingOrderCreateRequest,
    StatNursingOrderResponse,
    StatNursingOrderExecuteRequest,
    VitalTrendPoint,
    LabTrendPoint,
    SOAPMacroTemplate,
    PrescriptionMacroItem,
)
from app.schemas.doctor_workstation import (
    AllergyCategory,
    AllergySeverity,
    AdmissionPriority,
    CDSAlertItem,
    CDSAlertSeverity,
    CPOEDiagnosticOrderRequest,
    CPOEDiagnosticOrderResponse,
    DiagnosticCategory,
    DiagnosticOrderItem,
    DiagnosticPriority,
    DiagnosticResultItem,
    InpatientAdmissionOrderRequest,
    InpatientAdmissionOrderResponse,
    PatientAllergyCreateRequest,
    PatientAllergyItem,
    PatientDiagnosticHistoryResponse,
    PrescriptionSafetyValidationRequest,
    PrescriptionSafetyValidationResponse,
    SpecialistReferralRequest,
    SpecialistReferralResponse,
)

router = APIRouter()

# In-Memory Standard ICD-10 Registry for high-speed clinical search
ICD10_REGISTRY = [
    {"code": "B50.9", "description": "Plasmodium falciparum malaria, unspecified", "category": "Infectious Diseases", "is_common": True},
    {"code": "B54", "description": "Unspecified malaria", "category": "Infectious Diseases", "is_common": True},
    {"code": "I10", "description": "Essential (primary) hypertension", "category": "Cardiovascular Diseases", "is_common": True},
    {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "category": "Endocrine & Metabolic", "is_common": True},
    {"code": "J00", "description": "Acute nasopharyngitis (common cold)", "category": "Respiratory Diseases", "is_common": True},
    {"code": "J02.9", "description": "Acute pharyngitis, unspecified", "category": "Respiratory Diseases", "is_common": True},
    {"code": "J18.9", "description": "Pneumonia, unspecified organism", "category": "Respiratory Diseases", "is_common": True},
    {"code": "A09", "description": "Infectious gastroenteritis and colitis, unspecified", "category": "Gastrointestinal Diseases", "is_common": True},
    {"code": "K29.7", "description": "Gastritis, unspecified", "category": "Gastrointestinal Diseases", "is_common": True},
    {"code": "N39.0", "description": "Urinary tract infection, site not specified", "category": "Genitourinary Diseases", "is_common": True},
    {"code": "M54.5", "description": "Low back pain", "category": "Musculoskeletal", "is_common": True},
    {"code": "R50.9", "description": "Fever, unspecified", "category": "General Symptoms", "is_common": True},
    {"code": "R51", "description": "Headache", "category": "General Symptoms", "is_common": True},
    {"code": "L03.90", "description": "Cellulitis, unspecified", "category": "Dermatological", "is_common": False},
    {"code": "D50.9", "description": "Iron deficiency anaemia, unspecified", "category": "Haematological", "is_common": True},
]


def generate_claim_pin() -> str:
    """Generates a 6-character alphanumeric claim PIN (e.g. 9K4L2P)"""
    chars = string.ascii_uppercase + "23456789"
    return "".join(random.choice(chars) for _ in range(6))


# ==========================================
# 1. Patient Reception Check-In & Fee Waiver
# ==========================================
@router.post(
    "/check-in",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.TENANT_ADMIN,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def check_in_patient(
    req: CheckInRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    identifier = req.identifier.strip()

    # Look up PatientAccount by Ghana Card, Phone, MRN, or QR Token
    patient = None
    existing_card = None

    # Check by Ghana Card
    p_res = await db.execute(
        select(PatientAccount)
        .options(selectinload(PatientAccount.user), selectinload(PatientAccount.hospital_cards))
        .where(PatientAccount.ghana_card_id == identifier)
    )
    patient = p_res.scalars().first()

    # Check by Phone
    if not patient:
        u_res = await db.execute(
            select(User)
            .options(selectinload(User.patient_profile).selectinload(PatientAccount.hospital_cards))
            .where(User.phone == identifier)
        )
        user = u_res.scalars().first()
        if user and user.patient_profile:
            patient = user.patient_profile

    # Check by MRN or QR Token
    if not patient:
        c_res = await db.execute(
            select(HospitalPatientCard)
            .options(selectinload(HospitalPatientCard.patient_account).selectinload(PatientAccount.user))
            .where(
                (HospitalPatientCard.mrn == identifier)
                | (HospitalPatientCard.qr_token == identifier)
            )
        )
        card_entry = c_res.scalars().first()
        if card_entry:
            patient = card_entry.patient_account
            existing_card = card_entry

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found. Please register the patient before check-in.",
        )

    # Check if patient already holds an active card for THIS facility
    if not existing_card and patient.hospital_cards:
        for c in patient.hospital_cards:
            if c.tenant_id == tenant.id and c.is_active:
                existing_card = c
                break

    registration_fee_waived = False
    fee_amount = Decimal("0.00")

    if existing_card and existing_card.registration_fee_paid:
        # Existing cardholder: Auto-waive registration fee
        registration_fee_waived = True
        fee_amount = Decimal("0.00")
        hospital_card = existing_card
    else:
        # Issue new hospital folder card for this facility with standard registration fee
        mrn = f"{tenant.slug[:3].upper()}-{datetime.now().year}-{random.randint(1000, 9999)}"
        qr_token = f"MEDICARD-{tenant.slug[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"
        hospital_card = HospitalPatientCard(
            id=uuid.uuid4(),
            patient_account_id=patient.id,
            tenant_id=tenant.id,
            mrn=mrn,
            qr_token=qr_token,
            registration_fee_paid=True,
            is_active=True,
        )
        db.add(hospital_card)
        registration_fee_waived = False
        fee_amount = Decimal("50.00")  # Standard initial card fee

    # Add to facility OPD Queue
    queue_number = f"Q-{random.randint(100, 999)}"
    queue_entry = OpdQueueEntry(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        patient_account_id=patient.id,
        hospital_card_id=hospital_card.id,
        queue_number=queue_number,
        status=OpdQueueStatus.QUEUED,
        priority=req.priority,
    )
    db.add(queue_entry)
    await db.commit()

    patient_name = patient.user.full_name if patient.user else "Patient"

    return CheckInResponse(
        queue_id=queue_entry.id,
        queue_number=queue_number,
        mrn=hospital_card.mrn,
        patient_id=patient.id,
        patient_name=patient_name,
        phone=patient.user.phone if patient.user else None,
        ghana_card_id=patient.ghana_card_id,
        status=OpdQueueStatus.QUEUED,
        priority=req.priority,
        registration_fee_waived=registration_fee_waived,
        fee_amount=fee_amount,
        checked_in_at=queue_entry.checked_in_at,
    )


# ==========================================
# 2. Live Facility OPD Queue
# ==========================================
@router.get(
    "/queue",
    response_model=List[OpdQueueItemResponse],
    dependencies=[
        Depends(
            require_roles(
                UserRole.RECORD_CLERK,
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.HOSPITAL_ADMIN,
                UserRole.TENANT_ADMIN,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def get_facility_opd_queue(
    queue_status: Optional[OpdQueueStatus] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(OpdQueueEntry)
        .options(
            selectinload(OpdQueueEntry.patient_account).selectinload(PatientAccount.user),
            selectinload(OpdQueueEntry.hospital_card),
        )
        .where(
            OpdQueueEntry.tenant_id == tenant.id,
            OpdQueueEntry.status != OpdQueueStatus.COMPLETED,
            OpdQueueEntry.status != OpdQueueStatus.CANCELLED,
        )
        .order_by(OpdQueueEntry.checked_in_at.asc())
    )

    if queue_status:
        query = query.where(OpdQueueEntry.status == queue_status)

    result = await db.execute(query)
    entries = result.scalars().all()

    items = []
    for entry in entries:
        patient = entry.patient_account
        user = patient.user if patient else None

        # Calculate approximate age from DOB
        age = None
        if patient and patient.date_of_birth:
            age = (datetime.now().date() - patient.date_of_birth).days // 365

        # Fetch latest vitals if recorded today
        v_res = await db.execute(
            select(Vitals)
            .where(Vitals.patient_account_id == patient.id)
            .order_by(Vitals.created_at.desc())
            .limit(1)
        )
        vitals = v_res.scalars().first()

        bp_str = f"{vitals.systolic_bp}/{vitals.diastolic_bp}" if (vitals and vitals.systolic_bp and vitals.diastolic_bp) else None

        items.append(
            OpdQueueItemResponse(
                queue_id=entry.id,
                queue_number=entry.queue_number,
                patient_id=patient.id,
                hospital_card_id=entry.hospital_card_id,
                patient_name=user.full_name if user else "Unknown Patient",
                age=age,
                gender=patient.gender if patient else None,
                mrn=entry.hospital_card.mrn if entry.hospital_card else "N/A",
                priority=entry.priority,
                status=entry.status,
                checked_in_at=entry.checked_in_at,
                temperature=vitals.temperature if vitals else None,
                blood_pressure=bp_str,
                heart_rate=vitals.heart_rate if vitals else None,
                spo2=vitals.spo2 if vitals else None,
                has_vitals=vitals is not None,
            )
        )

    return items


# ==========================================
# 3. Nurse Vitals Capture
# ==========================================
@router.post(
    "/vitals",
    response_model=VitalsResultResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.NURSE,
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def record_triage_vitals(
    req: VitalsCreateRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    calculated_bmi = None
    if req.height_cm and req.weight_kg and req.height_cm > 0:
        height_m = req.height_cm / 100.0
        calculated_bmi = round(req.weight_kg / (height_m * height_m), 1)

    vitals = Vitals(
        id=uuid.uuid4(),
        consultation_id=req.consultation_id,
        patient_account_id=req.patient_account_id,
        recorded_by_nurse_id=current_user.id,
        temperature=req.temperature,
        systolic_bp=req.systolic_bp,
        diastolic_bp=req.diastolic_bp,
        heart_rate=req.heart_rate,
        respiratory_rate=req.respiratory_rate,
        spo2=req.spo2,
        weight_kg=req.weight_kg,
        height_cm=req.height_cm,
        bmi=calculated_bmi,
    )
    db.add(vitals)

    # Advance queue entry to TRIAGE/WITH_DOCTOR if queue_id was provided
    if req.queue_id:
        q_res = await db.execute(
            select(OpdQueueEntry).where(OpdQueueEntry.id == req.queue_id)
        )
        queue_entry = q_res.scalars().first()
        if queue_entry:
            queue_entry.status = OpdQueueStatus.TRIAGE
            queue_entry.triaged_at = datetime.now(timezone.utc)

    await db.commit()

    # Compute abnormal health metrics
    is_fever = bool(req.temperature and req.temperature >= 38.0)
    is_hypertensive = bool(
        (req.systolic_bp and req.systolic_bp >= 140)
        or (req.diastolic_bp and req.diastolic_bp >= 90)
    )
    is_hypoxic = bool(req.spo2 and req.spo2 < 95.0)

    return VitalsResultResponse(
        id=vitals.id,
        patient_account_id=vitals.patient_account_id,
        temperature=vitals.temperature,
        systolic_bp=vitals.systolic_bp,
        diastolic_bp=vitals.diastolic_bp,
        heart_rate=vitals.heart_rate,
        respiratory_rate=vitals.respiratory_rate,
        spo2=vitals.spo2,
        weight_kg=vitals.weight_kg,
        height_cm=vitals.height_cm,
        bmi=vitals.bmi,
        is_fever=is_fever,
        is_hypertensive=is_hypertensive,
        is_hypoxic=is_hypoxic,
        recorded_at=vitals.created_at,
    )


# ==========================================
# 4. Doctor SOAP Encounter Note
# ==========================================
@router.post(
    "/consultations",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def create_soap_consultation(
    req: SOAPConsultationCreateRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    consultation = Consultation(
        id=uuid.uuid4(),
        hospital_card_id=req.hospital_card_id,
        tenant_id=tenant.id,
        doctor_id=current_user.id,
        chief_complaint=req.chief_complaint,
        subjective_note=req.subjective_note,
        objective_note=req.objective_note,
        assessment_note=req.assessment_note,
        plan_note=req.plan_note,
        clinical_notes=f"{req.subjective_note or ''}\n{req.objective_note or ''}\n{req.plan_note or ''}",
        icd10_diagnosis_code=req.icd10_diagnosis_code,
        diagnosis_description=req.diagnosis_description,
        consultation_status=ConsultationStatus.COMPLETED,
    )
    db.add(consultation)

    # Complete queue entry if linked
    if req.queue_id:
        q_res = await db.execute(
            select(OpdQueueEntry).where(OpdQueueEntry.id == req.queue_id)
        )
        queue_entry = q_res.scalars().first()
        if queue_entry:
            queue_entry.status = OpdQueueStatus.COMPLETED
            queue_entry.completed_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "consultation_id": str(consultation.id),
        "doctor": current_user.full_name,
        "chief_complaint": consultation.chief_complaint,
        "icd10_code": consultation.icd10_diagnosis_code,
        "diagnosis": consultation.diagnosis_description,
        "status": consultation.consultation_status.value,
        "created_at": consultation.created_at.isoformat(),
    }


# ==========================================
# 5. Patient Clinical History Timeline
# ==========================================
@router.get(
    "/patients/{patient_id}/history",
    response_model=PatientHistoryResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_clinical_history(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount)
        .options(
            selectinload(PatientAccount.user),
            selectinload(PatientAccount.hospital_cards).selectinload(HospitalPatientCard.consultations).selectinload(Consultation.doctor),
            selectinload(PatientAccount.vitals),
        )
        .where(PatientAccount.id == patient_id)
    )
    patient = p_res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    # Aggregate consultations across hospital cards
    consultation_summaries = []
    if patient.hospital_cards:
        for card in patient.hospital_cards:
            for c in card.consultations:
                consultation_summaries.append(
                    PastConsultationSummary(
                        id=c.id,
                        date=c.created_at,
                        doctor_name=c.doctor.full_name if c.doctor else "Medical Officer",
                        chief_complaint=c.chief_complaint,
                        icd10_code=c.icd10_diagnosis_code,
                        diagnosis=c.diagnosis_description,
                    )
                )

    consultation_summaries.sort(key=lambda x: x.date, reverse=True)

    # Format vitals timeline
    vitals_timeline = []
    if patient.vitals:
        for v in patient.vitals[-10:]:
            is_fever = bool(v.temperature and v.temperature >= 38.0)
            is_hypertensive = bool(
                (v.systolic_bp and v.systolic_bp >= 140)
                or (v.diastolic_bp and v.diastolic_bp >= 90)
            )
            is_hypoxic = bool(v.spo2 and v.spo2 < 95.0)
            vitals_timeline.append(
                VitalsResultResponse(
                    id=v.id,
                    patient_account_id=v.patient_account_id,
                    temperature=v.temperature,
                    systolic_bp=v.systolic_bp,
                    diastolic_bp=v.diastolic_bp,
                    heart_rate=v.heart_rate,
                    respiratory_rate=v.respiratory_rate,
                    spo2=v.spo2,
                    weight_kg=v.weight_kg,
                    height_cm=v.height_cm,
                    bmi=v.bmi,
                    is_fever=is_fever,
                    is_hypertensive=is_hypertensive,
                    is_hypoxic=is_hypoxic,
                    recorded_at=v.created_at,
                )
            )

    return PatientHistoryResponse(
        patient_id=patient.id,
        full_name=patient.user.full_name if patient.user else "Patient",
        ghana_card_id=patient.ghana_card_id,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        consultations=consultation_summaries,
        recent_vitals=vitals_timeline,
    )


# ==========================================
# 6. Fast ICD-10 Search
# ==========================================
@router.get("/icd10/search", response_model=List[ICD10ItemResponse])
async def search_icd10_codes(q: str = Query("", min_length=0)):
    query = q.strip().lower()
    if not query:
        return [ICD10ItemResponse(**item) for item in ICD10_REGISTRY if item.get("is_common")]

    matches = [
        ICD10ItemResponse(**item)
        for item in ICD10_REGISTRY
        if query in item["code"].lower()
        or query in item["description"].lower()
        or query in item["category"].lower()
    ]
    return matches[:15]


# ==========================================
# 7. Mint Cryptographic HMAC E-Prescription
# ==========================================
@router.post(
    "/prescriptions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_roles(
                UserRole.DOCTOR,
                UserRole.SUPER_ADMIN,
            )
        )
    ],
)
async def mint_prescription(
    req: PrescriptionMintRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    prescription_id = uuid.uuid4()
    prescription_number = f"RX-{datetime.now().year}-{random.randint(100000, 999999)}"
    access_code = generate_claim_pin()
    timestamp_str = datetime.now(timezone.utc).isoformat()

    items_payload = [item.model_dump() for item in req.items]

    # Compute tamper-evident HMAC-SHA256 signature
    verification_hash = generate_prescription_signature(
        prescription_id=str(prescription_id),
        patient_id=str(req.patient_account_id),
        doctor_id=str(current_user.id),
        tenant_id=str(tenant.id),
        items=items_payload,
        timestamp=timestamp_str,
    )

    prescription = Prescription(
        id=prescription_id,
        prescription_number=prescription_number,
        consultation_id=req.consultation_id,
        patient_account_id=req.patient_account_id,
        tenant_id=tenant.id,
        doctor_id=current_user.id,
        verification_hash=verification_hash,
        access_code=access_code,
        status=PrescriptionStatus.PENDING,
        notes=req.notes,
    )
    db.add(prescription)

    for item in req.items:
        rx_item = PrescriptionItem(
            id=uuid.uuid4(),
            prescription_id=prescription_id,
            medication_name=item.medication_name,
            dosage=item.dosage,
            frequency=item.frequency,
            duration_days=item.duration_days,
            instructions=item.instructions,
            quantity_prescribed=item.quantity_prescribed,
            quantity_dispensed=0,
        )
        db.add(rx_item)

    await db.commit()

    qr_payload = f"https://medipaedia.health/verify/rx?code={access_code}&hash={verification_hash[:16]}"

    return {
        "prescription_id": str(prescription_id),
        "prescription_number": prescription_number,
        "access_code": access_code,
        "verification_hash": verification_hash,
        "qr_payload": qr_payload,
        "status": "ACTIVE",
        "doctor_name": current_user.full_name,
        "facility": tenant.name,
        "items_count": len(req.items),
    }


# ==========================================
# 8. Printable Prescription Sheet
# ==========================================
@router.get(
    "/prescriptions/{prescription_id}/print",
    response_model=PrescriptionPrintResponse,
)
async def get_printable_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(Prescription)
        .options(
            selectinload(Prescription.items),
            selectinload(Prescription.doctor),
            selectinload(Prescription.tenant),
            selectinload(Prescription.consultation),
            selectinload(Prescription.patient_account).selectinload(PatientAccount.user),
            selectinload(Prescription.patient_account).selectinload(PatientAccount.hospital_cards),
        )
        .where(Prescription.id == prescription_id)
    )
    rx = p_res.scalars().first()

    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found.",
        )

    patient = rx.patient_account
    user = patient.user if patient else None
    mrn = "N/A"
    if patient and patient.hospital_cards:
        for c in patient.hospital_cards:
            if c.tenant_id == rx.tenant_id:
                mrn = c.mrn
                break

    qr_payload = f"https://medipaedia.health/verify/rx?code={rx.access_code}&hash={rx.verification_hash[:16]}"

    return PrescriptionPrintResponse(
        prescription_id=rx.id,
        prescription_number=rx.prescription_number,
        access_code=rx.access_code,
        verification_hash=rx.verification_hash,
        qr_payload=qr_payload,
        doctor_name=rx.doctor.full_name if rx.doctor else "Dr. Medical Officer",
        doctor_license=rx.doctor.license_number if rx.doctor else "GMC-GH-2026",
        facility_name=rx.tenant.name if rx.tenant else "Medipaedia Clinical Network",
        facility_address=rx.tenant.address if rx.tenant else "Accra, Ghana",
        patient_name=user.full_name if user else "Patient",
        patient_mrn=mrn,
        patient_dob=str(patient.date_of_birth) if patient and patient.date_of_birth else None,
        patient_gender=patient.gender if patient else None,
        allergies=patient.allergies if patient else "None known",
        diagnosis=rx.consultation.diagnosis_description if rx.consultation else "Clinical diagnosis",
        issued_date=rx.created_at.strftime("%d %b %Y, %H:%M"),
        expires_date=rx.expires_at.strftime("%d %b %Y"),
        status=rx.status,
        items=[
            PrescriptionItemPrint(
                medication_name=item.medication_name,
                dosage=item.dosage,
                frequency=item.frequency,
                duration_days=item.duration_days,
                instructions=item.instructions,
                quantity_prescribed=item.quantity_prescribed,
            )
            for item in rx.items
        ],
    )


# ============================================================================
# DOCTOR CLINICAL WORKSTATION & CPOE EXTENSIONS
# ============================================================================

_PATIENT_ALLERGIES: dict[str, List[PatientAllergyItem]] = {
    "default": [
        PatientAllergyItem(
            allergy_id="alg-1",
            patient_id="default",
            allergen_name="Penicillin",
            allergen_category=AllergyCategory.DRUG,
            reaction_description="Severe Anaphylaxis, generalized urticaria, wheezing",
            severity=AllergySeverity.SEVERE_ANAPHYLAXIS,
            diagnosed_date="12 Jan 2024",
            verified_by="Dr. Afia Appiah (MDC/RN/89124)",
        ),
        PatientAllergyItem(
            allergy_id="alg-2",
            patient_id="default",
            allergen_name="Sulfa Drugs",
            allergen_category=AllergyCategory.DRUG,
            reaction_description="Stevens-Johnson syndrome risk / severe epidermal peeling",
            severity=AllergySeverity.SEVERE_ANAPHYLAXIS,
            diagnosed_date="15 Mar 2025",
            verified_by="Dr. Kwame Antwi (MDC/RN/44201)",
        ),
    ]
}

_PATIENT_DIAGNOSTICS: dict[str, PatientDiagnosticHistoryResponse] = {}
_INPATIENT_ADMISSION_ORDERS: List[InpatientAdmissionOrderResponse] = []
_SPECIALIST_REFERRALS: List[SpecialistReferralResponse] = []


@router.get(
    "/patients/{patient_id}/allergies",
    response_model=List[PatientAllergyItem],
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_allergies(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches verified active drug, food, and environmental allergies for the patient.
    """
    return _PATIENT_ALLERGIES.get(patient_id, _PATIENT_ALLERGIES.get("default", []))


@router.post(
    "/patients/{patient_id}/allergies",
    response_model=PatientAllergyItem,
    dependencies=[Depends(require_clinical_staff)],
)
async def add_patient_allergy(
    patient_id: str,
    req: PatientAllergyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a newly verified allergen and clinical reaction profile for the patient.
    """
    allergy_item = PatientAllergyItem(
        allergy_id=f"alg-{uuid.uuid4().hex[:8]}",
        patient_id=patient_id,
        allergen_name=req.allergen_name,
        allergen_category=req.allergen_category,
        reaction_description=req.reaction_description,
        severity=req.severity,
        diagnosed_date=datetime.now(timezone.utc).strftime("%d %b %Y"),
        verified_by=f"{current_user.full_name} ({current_user.role.value})",
    )
    if patient_id not in _PATIENT_ALLERGIES:
        _PATIENT_ALLERGIES[patient_id] = list(_PATIENT_ALLERGIES.get("default", []))
    _PATIENT_ALLERGIES[patient_id].append(allergy_item)
    return allergy_item


@router.post(
    "/prescriptions/validate-safety",
    response_model=PrescriptionSafetyValidationResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def validate_prescription_safety(
    req: PrescriptionSafetyValidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Automated Clinical Decision Support (CDS) engine: checks prescribed medications against
    the patient's allergy registry and detects major drug-drug interactions.
    """
    allergies = _PATIENT_ALLERGIES.get(req.patient_id, _PATIENT_ALLERGIES.get("default", []))
    allergen_names = [a.allergen_name.lower() for a in allergies]

    alerts: List[CDSAlertItem] = []
    med_names = [m.drug_name.lower() for m in req.medications]

    # 1. Allergy Checks
    has_penicillin_allergy = any(any(p in a for p in ["penicillin", "amoxicillin", "ampicillin"]) for a in allergen_names)
    has_sulfa_allergy = any(any(s in a for s in ["sulfa", "cotrimoxazole", "bactrim", "sulfamethoxazole"]) for a in allergen_names)
    has_nsaid_allergy = any(any(n in a for n in ["aspirin", "nsaid", "ibuprofen", "diclofenac"]) for a in allergen_names)

    for med in req.medications:
        name_lower = med.drug_name.lower()

        # Penicillin / Beta-lactam Allergy Rule
        if has_penicillin_allergy:
            if any(b in name_lower for b in ["amoxicillin", "ampicillin", "augmentin", "penicillin", "cloxacillin", "flucloxacillin"]):
                alerts.append(
                    CDSAlertItem(
                        alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                        severity=CDSAlertSeverity.CRITICAL_CONTRAINDICATION,
                        title="CRITICAL ALLERGEN CONFLICT: Penicillin / Beta-Lactam",
                        message=f"Patient has documented severe allergy to Penicillin. Prescribed '{med.drug_name}' is a direct Beta-lactam antibiotic and carries high anaphylaxis risk.",
                        conflicting_drug=med.drug_name,
                        matched_allergen_or_drug="Penicillin Allergy Registry",
                        recommendation="Do not dispense. Consider Azithromycin, Doxycycline, or Ciprofloxacin as non-beta-lactam alternative.",
                    )
                )
            elif any(c in name_lower for c in ["ceftriaxone", "cefuroxime", "cefixime", "cephalexin"]):
                alerts.append(
                    CDSAlertItem(
                        alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                        severity=CDSAlertSeverity.WARNING,
                        title="POTENTIAL CROSS-ALLERGY: Cephalosporin / Beta-Lactam",
                        message=f"Patient has severe Penicillin allergy. '{med.drug_name}' (Cephalosporin) has 3-5% cross-reactivity risk.",
                        conflicting_drug=med.drug_name,
                        matched_allergen_or_drug="Penicillin Allergy Registry",
                        recommendation="Use with caution or select a non-beta-lactam class.",
                    )
                )

        # Sulfa Allergy Rule
        if has_sulfa_allergy:
            if any(s in name_lower for s in ["cotrimoxazole", "co-trimoxazole", "bactrim", "septrin", "sulfamethoxazole", "sulfadiazine", "sulfa"]):
                alerts.append(
                    CDSAlertItem(
                        alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                        severity=CDSAlertSeverity.CRITICAL_CONTRAINDICATION,
                        title="CRITICAL ALLERGEN CONFLICT: Sulfonamide",
                        message=f"Patient has documented Sulfa drug allergy. '{med.drug_name}' is contraindicated.",
                        conflicting_drug=med.drug_name,
                        matched_allergen_or_drug="Sulfa Allergy Registry",
                        recommendation="Substitute with alternative class (e.g. Amoxicillin if non-penicillin allergic, or Macrolides).",
                    )
                )

        # NSAID / Aspirin Allergy Rule
        if has_nsaid_allergy:
            if any(n in name_lower for n in ["aspirin", "ibuprofen", "diclofenac", "ketorolac", "naproxen", "indomethacin"]):
                alerts.append(
                    CDSAlertItem(
                        alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                        severity=CDSAlertSeverity.CRITICAL_CONTRAINDICATION,
                        title="CRITICAL ALLERGEN CONFLICT: NSAID / Aspirin",
                        message=f"Patient has documented Aspirin/NSAID hypersensitivity. '{med.drug_name}' may trigger bronchospasm.",
                        conflicting_drug=med.drug_name,
                        matched_allergen_or_drug="Aspirin/NSAID Allergy Registry",
                        recommendation="Use Paracetamol or selective Tramadol.",
                    )
                )

    # 2. Drug-Drug Interactions
    # Sildenafil + Nitrates
    has_pde5 = any(p in m for m in med_names for p in ["sildenafil", "tadalafil", "vardenafil"])
    has_nitrate = any(n in m for m in med_names for n in ["nitroglycerin", "isosorbide", "glyceryl trinitrate", "nitrate"])
    if has_pde5 and has_nitrate:
        alerts.append(
            CDSAlertItem(
                alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                severity=CDSAlertSeverity.CRITICAL_CONTRAINDICATION,
                title="LETHAL DRUG INTERACTION: PDE-5 Inhibitor + Nitrate",
                message="Co-administration of Sildenafil and Nitrates causes severe, life-threatening hypotension.",
                conflicting_drug="Sildenafil + Nitrates",
                matched_allergen_or_drug="Nitrate Vasodilator",
                recommendation="Discontinue Nitrate or withhold PDE-5 inhibitor for at least 24 hours.",
            )
        )

    # ACE-I + ARB Dual Blockade
    has_ace = any(a in m for m in med_names for a in ["lisinopril", "enalapril", "ramipril", "captopril", "perindopril"])
    has_arb = any(a in m for m in med_names for a in ["losartan", "valsartan", "candesartan", "telmisartan", "irbesartan"])
    if has_ace and has_arb:
        alerts.append(
            CDSAlertItem(
                alert_id=f"cds-{uuid.uuid4().hex[:6]}",
                severity=CDSAlertSeverity.WARNING,
                title="DUAL RAS BLOCKADE WARNING: ACE Inhibitor + ARB",
                message="Combining ACE inhibitors with ARBs increases risk of hyperkalemia, syncope, and acute kidney injury without added benefit.",
                conflicting_drug="ACE Inhibitor + ARB",
                matched_allergen_or_drug="Antihypertensive Regimen",
                recommendation="Select either an ACE-I or an ARB; do not prescribe concurrently.",
            )
        )

    critical_count = sum(1 for a in alerts if a.severity == CDSAlertSeverity.CRITICAL_CONTRAINDICATION)
    warning_count = sum(1 for a in alerts if a.severity == CDSAlertSeverity.WARNING)
    is_safe = critical_count == 0

    return PrescriptionSafetyValidationResponse(
        is_safe=is_safe,
        critical_contraindications_count=critical_count,
        warnings_count=warning_count,
        alerts=alerts,
    )


@router.post(
    "/diagnostics/order",
    response_model=CPOEDiagnosticOrderResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def order_diagnostic_tests(
    req: CPOEDiagnosticOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Places standardized Computerized Physician Order Entry (CPOE) diagnostic laboratory and imaging requests.
    """
    order_id = f"cpoe-{uuid.uuid4().hex[:8]}"

    order_resp = CPOEDiagnosticOrderResponse(
        order_id=order_id,
        patient_id=req.patient_id,
        ordered_at=datetime.now(timezone.utc),
        status="ORDERED",
        tests_count=len(req.tests),
        tests=req.tests,
        ordering_doctor=f"{req.ordering_doctor_name} ({req.ordering_doctor_pin})",
        estimated_turnaround="30-45 mins (STAT Priority)" if any(t.priority == DiagnosticPriority.STAT for t in req.tests) else "2-4 hours (Routine)",
    )

    if req.patient_id not in _PATIENT_DIAGNOSTICS:
        _PATIENT_DIAGNOSTICS[req.patient_id] = PatientDiagnosticHistoryResponse(
            patient_id=req.patient_id,
            patient_name="Kwesi Mensah",
            pending_orders=[],
            completed_results=[
                DiagnosticResultItem(
                    result_id="res-101",
                    test_code="LAB-FBC",
                    test_name="Full Blood Count (FBC) + Diff",
                    category="LABORATORY",
                    result_value="Hb: 10.8 g/dL (Mild Anemia), WBC: 12.4 x10^9/L, PLT: 142 x10^9/L",
                    reference_range="Hb: 13.0-17.0 g/dL, WBC: 4.0-11.0, PLT: 150-400",
                    is_abnormal=True,
                    critical_flag="Mild Thrombocytopenia",
                    completed_at="18 Aug 2026, 15:45",
                    verified_by="MLS. Joseph Mensah (Allied Health/GH)",
                ),
                DiagnosticResultItem(
                    result_id="res-102",
                    test_code="LAB-MAL-RDT",
                    test_name="Malaria Rapid Diagnostic Test (RDT Pf/Pan)",
                    category="POINT_OF_CARE",
                    result_value="POSITIVE (P. falciparum HRP-2 Band Strong Positive)",
                    reference_range="NEGATIVE",
                    is_abnormal=True,
                    critical_flag="POSITIVE",
                    completed_at="18 Aug 2026, 15:10",
                    verified_by="Grace Ofori, RN (NMC/PIN/49102)",
                ),
            ],
        )

    _PATIENT_DIAGNOSTICS[req.patient_id].pending_orders.insert(0, order_resp)
    return order_resp


@router.get(
    "/diagnostics/patient/{patient_id}",
    response_model=PatientDiagnosticHistoryResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_diagnostic_history(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the complete diagnostic history (pending CPOE orders + completed lab & imaging reports) for a patient.
    """
    if patient_id not in _PATIENT_DIAGNOSTICS:
        _PATIENT_DIAGNOSTICS[patient_id] = PatientDiagnosticHistoryResponse(
            patient_id=patient_id,
            patient_name="Kwesi Mensah",
            pending_orders=[],
            completed_results=[
                DiagnosticResultItem(
                    result_id="res-101",
                    test_code="LAB-FBC",
                    test_name="Full Blood Count (FBC) + Diff",
                    category="LABORATORY",
                    result_value="Hb: 10.8 g/dL (Mild Anemia), WBC: 12.4 x10^9/L, PLT: 142 x10^9/L",
                    reference_range="Hb: 13.0-17.0 g/dL, WBC: 4.0-11.0, PLT: 150-400",
                    is_abnormal=True,
                    critical_flag="Mild Thrombocytopenia",
                    completed_at="18 Aug 2026, 15:45",
                    verified_by="MLS. Joseph Mensah (Allied Health/GH)",
                ),
                DiagnosticResultItem(
                    result_id="res-102",
                    test_code="LAB-MAL-RDT",
                    test_name="Malaria Rapid Diagnostic Test (RDT Pf/Pan)",
                    category="POINT_OF_CARE",
                    result_value="POSITIVE (P. falciparum HRP-2 Band Strong Positive)",
                    reference_range="NEGATIVE",
                    is_abnormal=True,
                    critical_flag="POSITIVE",
                    completed_at="18 Aug 2026, 15:10",
                    verified_by="Grace Ofori, RN (NMC/PIN/49102)",
                ),
            ],
        )
    return _PATIENT_DIAGNOSTICS[patient_id]


@router.post(
    "/admissions/order",
    response_model=InpatientAdmissionOrderResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def order_inpatient_admission(
    req: InpatientAdmissionOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Issues a formal doctor admission order for hospital ward bed booking with immediate nursing care directives.
    """
    adm_id = f"adm-{uuid.uuid4().hex[:8]}"

    response = InpatientAdmissionOrderResponse(
        admission_order_id=adm_id,
        patient_id=req.patient_id,
        target_ward=req.target_ward,
        status="PENDING_BED_ASSIGNMENT",
        admitting_diagnosis=req.admitting_diagnosis,
        admitting_icd10=req.admitting_icd10,
        priority=req.priority,
        ordered_at=datetime.now(timezone.utc),
        admitting_doctor=f"{req.admitting_doctor_name} ({req.admitting_doctor_pin})",
        confirmation_message=f"Inpatient Admission Order {adm_id} transmitted to {req.target_ward} nurse desk.",
    )
    _INPATIENT_ADMISSION_ORDERS.insert(0, response)
    return response


@router.post(
    "/referrals/generate",
    response_model=SpecialistReferralResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def generate_specialist_referral(
    req: SpecialistReferralRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a secure specialist referral letter with an encrypted QR summary token for external facilities.
    """
    ref_id = f"ref-{uuid.uuid4().hex[:8]}"
    qr_token = f"medipaedia://referral/{ref_id}?key={uuid.uuid4().hex}"

    summary = (
        f"Referral to {req.receiving_facility} ({req.receiving_specialty}) for {req.patient_name}. "
        f"Working Diagnosis: {req.working_diagnosis} ({req.icd10_code}). Reason: {req.reason_for_referral}."
    )

    response = SpecialistReferralResponse(
        referral_id=ref_id,
        patient_id=req.patient_id,
        receiving_facility=req.receiving_facility,
        receiving_specialty=req.receiving_specialty,
        qr_verification_token=qr_token,
        generated_at=datetime.now(timezone.utc),
        referring_doctor=f"{req.referring_doctor_name} ({req.referring_doctor_pin})",
        document_summary=summary,
    )
    _SPECIALIST_REFERRALS.insert(0, response)
    return response


# ============================================================================
# CLINICAL MACROS, DIAGNOSTIC TRENDS & STAT NURSING ORDERS ENGINE
# ============================================================================

def calculate_mews(
    respiratory_rate: Optional[int] = None,
    heart_rate: Optional[int] = None,
    systolic_bp: Optional[int] = None,
    temperature: Optional[float] = None,
    spo2: Optional[float] = None,
) -> tuple[int, str]:
    score = 0
    # 1. Respiratory rate
    if respiratory_rate is not None:
        if respiratory_rate <= 8:
            score += 2
        elif 9 <= respiratory_rate <= 14:
            score += 0
        elif 15 <= respiratory_rate <= 20:
            score += 1
        elif 21 <= respiratory_rate <= 29:
            score += 2
        elif respiratory_rate >= 30:
            score += 3

    # 2. Heart rate
    if heart_rate is not None:
        if heart_rate <= 40:
            score += 2
        elif 41 <= heart_rate <= 50:
            score += 1
        elif 51 <= heart_rate <= 100:
            score += 0
        elif 101 <= heart_rate <= 110:
            score += 1
        elif 111 <= heart_rate <= 129:
            score += 2
        elif heart_rate >= 130:
            score += 3

    # 3. Systolic BP
    if systolic_bp is not None:
        if systolic_bp <= 70:
            score += 3
        elif 71 <= systolic_bp <= 80:
            score += 2
        elif 81 <= systolic_bp <= 100:
            score += 1
        elif 101 <= systolic_bp <= 199:
            score += 0
        elif systolic_bp >= 200:
            score += 2

    # 4. Temperature (°C)
    if temperature is not None:
        if temperature < 35.0:
            score += 2
        elif 35.0 <= temperature <= 38.4:
            score += 0
        elif temperature >= 38.5:
            score += 2

    # 5. SpO2 (%)
    if spo2 is not None:
        if spo2 < 92:
            score += 3
        elif 92 <= spo2 <= 93:
            score += 2
        elif 94 <= spo2 <= 95:
            score += 1
        elif spo2 >= 96:
            score += 0

    if score >= 5:
        severity = "CRITICAL"
    elif score >= 3:
        severity = "WARNING"
    else:
        severity = "NORMAL"

    return score, severity


_CLINICAL_MACROS: List[ClinicalMacroResponse] = [
    ClinicalMacroResponse(
        id="macro-mal-01",
        macro_name="Adult Acute Uncomplicated Malaria",
        specialty="GENERAL_PRACTICE",
        icd10_code="B50.9",
        diagnosis_title="Plasmodium Falciparum Malaria, Unspecified",
        default_soap_template=SOAPMacroTemplate(
            subjective="Patient reports 3-day history of high-grade intermittent fever, chills, rigors, generalized body weakness, headache, and mild nausea. No neck stiffness, convulsions, or altered mental state.",
            objective="Febrile to touch (T 38.9°C), mild conjunctival pallor, sclerae anicteric. Abdomen soft, non-tender, no hepatosplenomegaly. Chest clear. RDT Pf positive (+++).",
            assessment="Acute Uncomplicated Plasmodium Falciparum Malaria (ICD-10: B50.9)",
            plan="1. Artemether-Lumefantrine (Coartem) 80/480mg PO BD x 3 days with fatty meal.\n2. Tab Paracetamol 1g PO TDS x 3 days for antipyresis.\n3. Oral rehydration salts (ORS) 1L daily.\n4. Red flag counseling for dark urine, persistent vomiting, or jaundice.",
        ),
        default_prescription_items=[
            PrescriptionMacroItem(
                medication_name="Coartem (Artemether 80mg / Lumefantrine 480mg)",
                dosage="1 tablet",
                frequency="Twice daily (12h apart)",
                duration="3 days",
                quantity=6,
                instructions="Take with food or milk for optimal absorption",
            ),
            PrescriptionMacroItem(
                medication_name="Paracetamol 500mg Tablets",
                dosage="2 tablets (1g)",
                frequency="Three times daily",
                duration="3 days",
                quantity=18,
                instructions="Take after food for fever and body aches",
            ),
        ],
        default_lab_orders=[
            "Full Blood Count (FBC with Differential)",
            "Malaria Parasite Film (Giemsa Stained Thin/Thick)",
            "Random Blood Sugar (RBS)",
        ],
        is_active=True,
    ),
    ClinicalMacroResponse(
        id="macro-htn-02",
        macro_name="Essential Hypertension Initial Workup",
        specialty="CARDIOLOGY",
        icd10_code="I10",
        diagnosis_title="Essential (Primary) Hypertension",
        default_soap_template=SOAPMacroTemplate(
            subjective="Patient presents for routine cardiovascular health evaluation. Reports occasional early morning occipital headaches and mild exertional fatigue. Denies chest pressure, orthopnea, or ankle swelling.",
            objective="BP 158/96 mmHg (Right arm sitting, repeated after 10 mins 154/94 mmHg). HR 78 bpm regular. Heart sounds S1 S2 present, no murmurs. Bilateral lung fields clear. No pedal edema.",
            assessment="Stage 2 Essential Hypertension (ICD-10: I10)",
            plan="1. Tab Amlodipine 5mg PO Daily (Morning).\n2. Tab Telmisartan 40mg PO Daily.\n3. Dietary sodium restriction (<2g/day) & regular aerobic exercise.\n4. Baseline organ damage screening (Serum Creatinine, Electrolytes, Fasting Lipids, Urinalysis).",
        ),
        default_prescription_items=[
            PrescriptionMacroItem(
                medication_name="Amlodipine 5mg Tablets",
                dosage="1 tablet",
                frequency="Once daily (Morning)",
                duration="30 days",
                quantity=30,
                instructions="Take in the morning with water",
            ),
            PrescriptionMacroItem(
                medication_name="Telmisartan 40mg Tablets",
                dosage="1 tablet",
                frequency="Once daily",
                duration="30 days",
                quantity=30,
                instructions="Take once daily at the same time",
            ),
        ],
        default_lab_orders=[
            "Serum Creatinine & Electrolytes (Na+, K+, Cl-)",
            "Fasting Lipid Profile",
            "Urine Routine Examination (Proteinuria/Microalbuminuria)",
            "12-Lead Resting Electrocardiogram (ECG)",
        ],
        is_active=True,
    ),
    ClinicalMacroResponse(
        id="macro-dm-03",
        macro_name="Type 2 Diabetes Mellitus Routine Review",
        specialty="ENDOCRINOLOGY",
        icd10_code="E11.9",
        diagnosis_title="Type 2 Diabetes Mellitus without Complications",
        default_soap_template=SOAPMacroTemplate(
            subjective="Follow-up review for glycemic control. Patient reports good compliance with oral hypoglycemic therapy and portion control. Denies polyuria, polydipsia, paresthesias, or vision changes.",
            objective="Random Blood Sugar 8.4 mmol/L. BP 128/82 mmHg, HR 74 bpm, BMI 27.2 kg/m². Monofilament foot examination intact, bilateral dorsalis pedis pulses palpable. Sclerae clear.",
            assessment="Type 2 Diabetes Mellitus, Moderately Controlled (ICD-10: E11.9)",
            plan="1. Continue Tab Metformin 500mg PO BD with meals.\n2. Continue Tab Glimepiride 2mg PO Daily before breakfast.\n3. Reinforce diabetic foot care and daily home glucose monitoring.\n4. Order 3-month Glycated Hemoglobin (HbA1c) and lipid profile.",
        ),
        default_prescription_items=[
            PrescriptionMacroItem(
                medication_name="Metformin Hydrochloride 500mg Tablets",
                dosage="1 tablet",
                frequency="Twice daily (With meals)",
                duration="30 days",
                quantity=60,
                instructions="Take immediately after meals to avoid GI upset",
            ),
            PrescriptionMacroItem(
                medication_name="Glimepiride 2mg Tablets",
                dosage="1 tablet",
                frequency="Once daily (Before breakfast)",
                duration="30 days",
                quantity=30,
                instructions="Take 15 minutes before breakfast",
            ),
        ],
        default_lab_orders=[
            "Glycated Hemoglobin (HbA1c)",
            "Random Blood Sugar (RBS)",
            "Serum Creatinine & eGFR",
        ],
        is_active=True,
    ),
    ClinicalMacroResponse(
        id="macro-ge-04",
        macro_name="Acute Gastroenteritis with Moderate Dehydration",
        specialty="INFECTIOUS_DISEASE",
        icd10_code="A09",
        diagnosis_title="Infectious Gastroenteritis and Colitis, Unspecified",
        default_soap_template=SOAPMacroTemplate(
            subjective="24-hour history of frequent watery diarrhea (6 episodes) and 3 episodes of non-bilious vomiting. Associated with diffuse colicky abdominal pain and thirst.",
            objective="Dry buccal mucosa, skin turgor recoil 2 seconds, sunken eyes. BP 104/68 mmHg, HR 102 bpm regular, T 37.8°C, RR 20 bpm. Abdomen mildly distended, non-rigid, hyperactive bowel sounds.",
            assessment="Acute Gastroenteritis with Moderate Dehydration (ICD-10: A09)",
            plan="1. STAT IV Ringers Lactate 1000ml over 2 hours under nursing supervision.\n2. Oral Rehydration Salts (ORS) 200ml after every loose stool.\n3. Tab Zinc Sulfate 20mg Daily x 10 days for mucosal healing.\n4. Tab Ciprofloxacin 500mg PO BD x 3 days if bacterial dysentery suspected.",
        ),
        default_prescription_items=[
            PrescriptionMacroItem(
                medication_name="Oral Rehydration Salts (ORS) WHO Formula",
                dosage="1 sachet reconstituted in 1L water",
                frequency="Sip freely PRN after each loose stool",
                duration="3 days",
                quantity=5,
                instructions="Drink 200ml after each diarrheal episode",
            ),
            PrescriptionMacroItem(
                medication_name="Zinc Sulfate 20mg Dispersible Tablets",
                dosage="1 tablet",
                frequency="Once daily",
                duration="10 days",
                quantity=10,
                instructions="Disperse in clean water or breastmilk",
            ),
            PrescriptionMacroItem(
                medication_name="Ciprofloxacin 500mg Tablets",
                dosage="1 tablet",
                frequency="Twice daily",
                duration="3 days",
                quantity=6,
                instructions="Take with plenty of fluids",
            ),
        ],
        default_lab_orders=[
            "Stool Routine Examination & Wet Mount",
            "Serum Electrolytes (Sodium, Potassium, Chloride)",
            "Full Blood Count (FBC)",
        ],
        is_active=True,
    ),
]

_STAT_NURSING_ORDERS: List[StatNursingOrderResponse] = []


# ---------------------------------------------------------------------------
# 1. Clinical Macros Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/macros",
    response_model=List[ClinicalMacroResponse],
    dependencies=[Depends(require_clinical_staff)],
)
async def list_clinical_macros(
    specialty: Optional[str] = Query(None, description="Filter by clinical specialty"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists reusable clinical macros (pre-filling SOAP notes, ICD-10 codes, and e-prescriptions).
    """
    if specialty and specialty != "ALL":
        return [m for m in _CLINICAL_MACROS if m.specialty.upper() == specialty.upper()]
    return _CLINICAL_MACROS


@router.post(
    "/macros",
    response_model=ClinicalMacroResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_clinical_staff)],
)
async def create_clinical_macro(
    req: ClinicalMacroCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new reusable clinical macro for the facility or provider.
    """
    new_macro = ClinicalMacroResponse(
        id=f"macro-{uuid.uuid4().hex[:6]}",
        macro_name=req.macro_name.strip(),
        specialty=req.specialty.strip(),
        icd10_code=req.icd10_code.strip(),
        diagnosis_title=req.diagnosis_title.strip(),
        default_soap_template=req.default_soap_template,
        default_prescription_items=req.default_prescription_items,
        default_lab_orders=req.default_lab_orders or [],
        is_active=True,
    )
    _CLINICAL_MACROS.insert(0, new_macro)
    return new_macro


# ---------------------------------------------------------------------------
# 2. Longitudinal Diagnostic Trends Overlay
# ---------------------------------------------------------------------------

@router.get(
    "/patients/{patient_id}/trends",
    response_model=PatientLongitudinalTrendsResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def get_patient_longitudinal_trends(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns historical series of vitals (with MEWS scores) and key lab panels (Hb, RBS, Creatinine) for trend charts.
    """
    # Generate realistic longitudinal clinic data points
    vitals_history = [
        VitalTrendPoint(
            recorded_at="21 Aug 2026, 09:30",
            systolic_bp=148,
            diastolic_bp=92,
            heart_rate=108,
            respiratory_rate=22,
            temperature=38.8,
            spo2=96.0,
            mews_score=4,
            mews_severity="WARNING",
        ),
        VitalTrendPoint(
            recorded_at="15 Jul 2026, 11:15",
            systolic_bp=138,
            diastolic_bp=86,
            heart_rate=84,
            respiratory_rate=18,
            temperature=37.2,
            spo2=98.0,
            mews_score=1,
            mews_severity="NORMAL",
        ),
        VitalTrendPoint(
            recorded_at="02 Jun 2026, 14:00",
            systolic_bp=152,
            diastolic_bp=94,
            heart_rate=80,
            respiratory_rate=16,
            temperature=36.8,
            spo2=99.0,
            mews_score=0,
            mews_severity="NORMAL",
        ),
        VitalTrendPoint(
            recorded_at="10 Apr 2026, 10:20",
            systolic_bp=162,
            diastolic_bp=98,
            heart_rate=92,
            respiratory_rate=20,
            temperature=37.0,
            spo2=97.0,
            mews_score=1,
            mews_severity="NORMAL",
        ),
    ]

    hb_history = [
        LabTrendPoint(
            recorded_at="21 Aug 2026",
            test_name="Hemoglobin (Hb)",
            result_value=11.2,
            unit="g/dL",
            reference_range="13.5 - 17.5 g/dL",
            is_abnormal=True,
        ),
        LabTrendPoint(
            recorded_at="15 Jul 2026",
            test_name="Hemoglobin (Hb)",
            result_value=12.8,
            unit="g/dL",
            reference_range="13.5 - 17.5 g/dL",
            is_abnormal=True,
        ),
        LabTrendPoint(
            recorded_at="02 Jun 2026",
            test_name="Hemoglobin (Hb)",
            result_value=13.6,
            unit="g/dL",
            reference_range="13.5 - 17.5 g/dL",
            is_abnormal=False,
        ),
    ]

    rbs_history = [
        LabTrendPoint(
            recorded_at="21 Aug 2026",
            test_name="Random Blood Sugar (RBS)",
            result_value=8.6,
            unit="mmol/L",
            reference_range="4.0 - 7.8 mmol/L",
            is_abnormal=True,
        ),
        LabTrendPoint(
            recorded_at="15 Jul 2026",
            test_name="Random Blood Sugar (RBS)",
            result_value=7.2,
            unit="mmol/L",
            reference_range="4.0 - 7.8 mmol/L",
            is_abnormal=False,
        ),
        LabTrendPoint(
            recorded_at="02 Jun 2026",
            test_name="Random Blood Sugar (RBS)",
            result_value=9.4,
            unit="mmol/L",
            reference_range="4.0 - 7.8 mmol/L",
            is_abnormal=True,
        ),
    ]

    creatinine_history = [
        LabTrendPoint(
            recorded_at="21 Aug 2026",
            test_name="Serum Creatinine",
            result_value=98.0,
            unit="µmol/L",
            reference_range="62 - 106 µmol/L",
            is_abnormal=False,
        ),
        LabTrendPoint(
            recorded_at="15 Jul 2026",
            test_name="Serum Creatinine",
            result_value=102.0,
            unit="µmol/L",
            reference_range="62 - 106 µmol/L",
            is_abnormal=False,
        ),
        LabTrendPoint(
            recorded_at="02 Jun 2026",
            test_name="Serum Creatinine",
            result_value=114.0,
            unit="µmol/L",
            reference_range="62 - 106 µmol/L",
            is_abnormal=True,
        ),
    ]

    return PatientLongitudinalTrendsResponse(
        patient_id=patient_id,
        patient_name="Kwesi Mensah",
        mrn="MRN-RDG-2026-092",
        vitals_history=vitals_history,
        hb_history=hb_history,
        rbs_history=rbs_history,
        creatinine_history=creatinine_history,
    )


# ---------------------------------------------------------------------------
# 3. Stat Nursing Orders Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/stat-orders",
    response_model=StatNursingOrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_clinical_staff)],
)
async def create_stat_nursing_order(
    req: StatNursingOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Issues an urgent/STAT doctor nursing order directly to the triage/ward nursing runner.
    """
    order_id = f"stat-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")

    new_order = StatNursingOrderResponse(
        id=order_id,
        patient_id=req.patient_id,
        patient_name="Kwesi Mensah",
        mrn="MRN-RDG-2026-092",
        doctor_name=f"{current_user.full_name} ({current_user.role.value})",
        consultation_id=req.consultation_id,
        instruction=req.instruction.strip(),
        urgency=req.urgency,
        status="PENDING",
        issued_at=now_str,
        executed_by_nurse_name=None,
        executed_at=None,
        execution_notes=req.notes,
    )
    _STAT_NURSING_ORDERS.insert(0, new_order)
    return new_order


@router.get(
    "/stat-orders",
    response_model=List[StatNursingOrderResponse],
    dependencies=[Depends(require_clinical_staff)],
)
async def list_stat_nursing_orders(
    status_filter: Optional[str] = Query(None, description="Filter by status (PENDING, EXECUTED)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Live task tray of active doctor STAT orders for nurse station execution.
    """
    if status_filter and status_filter != "ALL":
        return [o for o in _STAT_NURSING_ORDERS if o.status.upper() == status_filter.upper()]
    return _STAT_NURSING_ORDERS


@router.put(
    "/stat-orders/{order_id}/execute",
    response_model=StatNursingOrderResponse,
    dependencies=[Depends(require_clinical_staff)],
)
async def execute_stat_nursing_order(
    order_id: str,
    req: StatNursingOrderExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Acknowledges and marks a STAT doctor order as executed / administered.
    """
    target = next((o for o in _STAT_NURSING_ORDERS if o.id == order_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stat order with ID '{order_id}' not found.",
        )

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M GMT")
    target.status = "EXECUTED"
    target.executed_by_nurse_name = f"{current_user.full_name} ({current_user.role.value})"
    target.executed_at = now_str
    target.execution_notes = req.execution_notes
    return target


@router.get(
    "/formulary",
    response_model=List[FormularyMedicationItemResponse],
    summary="Get Searchable WHO & Ghana FDA Essential Medicines Formulary",
)
async def get_clinical_formulary(
    search: Optional[str] = Query(None, description="Search generic name, brand name, or therapeutic class"),
    category: Optional[str] = Query(None, description="Filter by therapeutic category"),
    poison_schedule: Optional[str] = Query(None, description="Filter by Act 857 Schedule (OTC, PRESCRIPTION_ONLY, CLASS_A_NARCOTIC, CLASS_B_POISON)"),
    is_cold_chain: Optional[bool] = Query(None, description="Filter by cold chain requirement (2C-8C)"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the statutory Ghana FDA / WHO Essential Medicines Formulary with
    Act 857 Poison Schedules, cold-chain temperature limits, and standard dosing guidelines.
    """
    from sqlalchemy import or_
    stmt = select(GlobalMedication)

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                GlobalMedication.generic_name.ilike(s),
                GlobalMedication.brand_name.ilike(s),
                GlobalMedication.therapeutic_class.ilike(s),
                GlobalMedication.category.ilike(s),
                GlobalMedication.linked_icd10_codes.ilike(s),
            )
        )

    if category:
        stmt = stmt.where(GlobalMedication.category.ilike(f"%{category.strip()}%"))

    if poison_schedule:
        stmt = stmt.where(GlobalMedication.poison_schedule == poison_schedule.upper())

    if is_cold_chain is not None:
        stmt = stmt.where(GlobalMedication.is_cold_chain == is_cold_chain)

    stmt = stmt.order_by(GlobalMedication.generic_name.asc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()
    return items



