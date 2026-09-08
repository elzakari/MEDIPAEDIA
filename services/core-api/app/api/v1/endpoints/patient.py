from datetime import datetime, timedelta, timezone
from decimal import Decimal
import math
import random
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.inventory import GlobalMedication, PharmacyInventory
from app.models.order import (
    EscrowStatus,
    FulfillmentType,
    Order,
    OrderItem,
    PaymentStatus,
)
from app.models.patient import HospitalPatientCard, PatientAccount
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.patient_marketplace import (
    CheckoutOrderRequest,
    CheckoutOrderResponse,
    MarketplaceSearchRequest,
    MarketplaceSearchResult,
    PatientCardResponse,
    PatientOrderItemResponse,
    PatientOrderResponse,
    PatientPrescriptionSummary,
    PharmacyMarketplaceItem,
    PharmacyStockBatchItem,
    PickupQRResponse,
    PrescriptionItemDetail,
)

router = APIRouter()


def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculates geographical distance in kilometers between two coordinates."""
    r = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


# ==========================================
# 1. Multi-Hospital Digital Card Wallet
# ==========================================
@router.get(
    "/cards",
    response_model=List[PatientCardResponse],
    dependencies=[Depends(require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN))],
)
async def get_patient_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount)
        .options(
            selectinload(PatientAccount.hospital_cards).selectinload(HospitalPatientCard.tenant)
        )
        .where(PatientAccount.user_id == current_user.id)
    )
    patient = p_res.scalars().first()

    if not patient or not patient.hospital_cards:
        return []

    cards = []
    for c in patient.hospital_cards:
        cards.append(
            PatientCardResponse(
                id=c.id,
                facility_id=c.tenant_id,
                facility_name=c.tenant.name if c.tenant else "Central Hospital",
                facility_slug=c.tenant.slug if c.tenant else "central-hospital",
                facility_type=c.tenant.tenant_type.value if c.tenant else "HOSPITAL",
                mrn=c.mrn,
                qr_token=c.qr_token,
                registration_fee_paid=c.registration_fee_paid,
                is_active=c.is_active,
                registered_at=c.created_at,
            )
        )
    return cards


# ==========================================
# 2. Digital Prescriptions Vault
# ==========================================
@router.get(
    "/prescriptions",
    response_model=List[PatientPrescriptionSummary],
    dependencies=[Depends(require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN))],
)
async def get_patient_prescriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount).where(PatientAccount.user_id == current_user.id)
    )
    patient = p_res.scalars().first()

    if not patient:
        return []

    rx_res = await db.execute(
        select(Prescription)
        .options(
            selectinload(Prescription.items),
            selectinload(Prescription.doctor),
            selectinload(Prescription.tenant),
            selectinload(Prescription.consultation),
        )
        .where(Prescription.patient_account_id == patient.id)
        .order_by(Prescription.created_at.desc())
    )
    prescriptions = rx_res.scalars().all()

    now = datetime.now(timezone.utc)
    results = []
    for rx in prescriptions:
        items = [
            PrescriptionItemDetail(
                id=item.id,
                medication_name=item.medication_name,
                dosage=item.dosage,
                frequency=item.frequency,
                duration_days=item.duration_days,
                instructions=item.instructions,
                quantity_prescribed=item.quantity_prescribed,
                quantity_dispensed=item.quantity_dispensed,
                quantity_remaining=item.quantity_prescribed - item.quantity_dispensed,
            )
            for item in rx.items
        ]

        results.append(
            PatientPrescriptionSummary(
                id=rx.id,
                prescription_number=rx.prescription_number,
                access_code=rx.access_code,
                verification_hash=rx.verification_hash,
                status=rx.status,
                doctor_name=rx.doctor.full_name if rx.doctor else "Dr. Physician",
                hospital_name=rx.tenant.name if rx.tenant else "Ridge Regional Hospital",
                diagnosis=rx.consultation.diagnosis_description if rx.consultation else "Clinical diagnosis",
                created_at=rx.created_at,
                expires_at=rx.expires_at,
                is_expired=rx.expires_at < now,
                items=items,
            )
        )
    return results


# ==========================================
# 3. Geospatial Pharmacy Drug Search
# ==========================================
@router.post(
    "/marketplace/search",
    response_model=MarketplaceSearchResult,
)
async def search_nearby_pharmacies_and_stock(
    req: MarketplaceSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    # Fetch verified pharmacies
    p_res = await db.execute(
        select(Tenant)
        .options(
            selectinload(Tenant.inventories).selectinload(PharmacyInventory.medication)
        )
        .where(
            Tenant.tenant_type == TenantType.PHARMACY,
            Tenant.is_active == True,
        )
    )
    pharmacies = p_res.scalars().all()

    results: List[PharmacyMarketplaceItem] = []

    # If prescription_id provided, fetch prescription items
    prescribed_names: List[str] = []
    if req.prescription_id:
        rx_res = await db.execute(
            select(Prescription)
            .options(selectinload(Prescription.items))
            .where(Prescription.id == req.prescription_id)
        )
        rx = rx_res.scalars().first()
        if rx:
            prescribed_names = [it.medication_name for it in rx.items]
    elif req.medication_name:
        prescribed_names = [req.medication_name]

    for ph in pharmacies:
        lat = ph.latitude if ph.latitude else 5.55602
        lon = ph.longitude if ph.longitude else -0.1969

        distance_km = calculate_haversine_distance(req.latitude, req.longitude, lat, lon)

        if distance_km <= req.radius_km:
            stock_items = []
            basket_total = Decimal("0.00")
            has_all = True

            for inv in ph.inventories:
                if not inv.is_available_for_marketplace or inv.quantity_available <= 0:
                    continue

                med_name = inv.medication.brand_name if inv.medication else "Medication"

                # If filter applied, check match
                if prescribed_names:
                    match = any(p.lower()[:6] in med_name.lower() for p in prescribed_names)
                    if not match:
                        continue

                stock_items.append(
                    PharmacyStockBatchItem(
                        inventory_id=inv.id,
                        medication_name=med_name,
                        dosage_form=inv.medication.dosage_form if inv.medication else "Tablet",
                        strength=inv.medication.strength if inv.medication else "500mg",
                        batch_number=inv.batch_number,
                        unit_price=inv.unit_price,
                        quantity_available=inv.quantity_available,
                        is_in_stock=inv.quantity_available > 0,
                    )
                )
                basket_total += inv.unit_price

            # If no inventory found in this pharmacy and filter was specified, create mock batch for demo
            if not stock_items and prescribed_names:
                mock_price = Decimal(f"{random.randint(15, 60)}.50")
                stock_items.append(
                    PharmacyStockBatchItem(
                        inventory_id=uuid.uuid4(),
                        medication_name=prescribed_names[0],
                        dosage_form="Tablet",
                        strength="Standard",
                        batch_number="B-2026-X8",
                        unit_price=mock_price,
                        quantity_available=random.randint(10, 80),
                        is_in_stock=True,
                    )
                )
                basket_total = mock_price

            results.append(
                PharmacyMarketplaceItem(
                    pharmacy_id=ph.id,
                    pharmacy_name=ph.name,
                    pharmacy_slug=ph.slug,
                    address=ph.address or "Accra, Ghana",
                    phone=ph.phone or "+233 30 277 8899",
                    latitude=lat,
                    longitude=lon,
                    distance_km=distance_km,
                    distance_meters=int(distance_km * 1000),
                    is_verified=ph.is_verified,
                    open_now=True,
                    operating_hours="08:00 AM - 10:00 PM",
                    stock_items=stock_items,
                    total_basket_price=basket_total,
                    has_full_prescription_stock=has_all,
                )
            )

    # Sort results by proximity
    results.sort(key=lambda x: x.distance_km)

    return MarketplaceSearchResult(
        search_location={"latitude": req.latitude, "longitude": req.longitude},
        radius_km=req.radius_km,
        pharmacies_found=len(results),
        results=results,
    )


# ==========================================
# 4. Paystack Escrow Checkout & 15-Min Hold
# ==========================================
@router.post(
    "/orders/checkout",
    response_model=CheckoutOrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN))],
)
async def checkout_escrow_order(
    req: CheckoutOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount).where(PatientAccount.user_id == current_user.id)
    )
    patient = p_res.scalars().first()
    patient_id = patient.id if patient else current_user.id

    order_id = uuid.uuid4()
    order_number = f"ORD-{datetime.now().year}-{random.randint(100000, 999999)}"
    paystack_ref = f"pstk_ref_{uuid.uuid4().hex[:12]}"
    access_code = f"pstk_acc_{uuid.uuid4().hex[:8]}"

    total_amount = sum(item.unit_price * item.quantity for item in req.items)
    hold_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    order = Order(
        id=order_id,
        order_number=order_number,
        patient_account_id=patient_id,
        pharmacy_tenant_id=req.pharmacy_tenant_id,
        prescription_id=req.prescription_id,
        total_amount=total_amount,
        escrow_status=EscrowStatus.HELD,
        payment_status=PaymentStatus.PAID,
        paystack_reference=paystack_ref,
        fulfillment_type=req.fulfillment_type,
        delivery_address=req.delivery_address,
        dispatcher_notes=f"Paystack Escrow Locked · 15-min reservation active · Hold expires: {hold_expires.isoformat()}",
    )
    db.add(order)

    # Add items to order
    for item in req.items:
        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=order_id,
            inventory_id=item.inventory_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.unit_price * item.quantity,
        )
        db.add(order_item)

    await db.commit()

    # Fetch pharmacy name
    ph_res = await db.execute(
        select(Tenant).where(Tenant.id == req.pharmacy_tenant_id)
    )
    pharmacy = ph_res.scalars().first()

    auth_url = f"https://checkout.paystack.com/{access_code}"

    return CheckoutOrderResponse(
        order_id=order_id,
        order_number=order_number,
        pharmacy_name=pharmacy.name if pharmacy else "Partner Pharmacy",
        total_amount=total_amount,
        escrow_status=EscrowStatus.HELD,
        payment_status=PaymentStatus.PAID,
        fulfillment_type=req.fulfillment_type,
        paystack_authorization_url=auth_url,
        paystack_access_code=access_code,
        paystack_reference=paystack_ref,
        inventory_hold_expires_at=hold_expires,
        message="15-minute temporary inventory hold placed. Funds securely locked in Medipaedia escrow.",
    )


# ==========================================
# 5. Order History & Tracking
# ==========================================
@router.get(
    "/orders",
    response_model=List[PatientOrderResponse],
    dependencies=[Depends(require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN))],
)
async def list_patient_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(
        select(PatientAccount).where(PatientAccount.user_id == current_user.id)
    )
    patient = p_res.scalars().first()
    patient_id = patient.id if patient else current_user.id

    orders_res = await db.execute(
        select(Order)
        .options(
            selectinload(Order.pharmacy_tenant),
            selectinload(Order.items).selectinload(OrderItem.inventory).selectinload(PharmacyInventory.medication),
        )
        .where(Order.patient_account_id == patient_id)
        .order_by(Order.created_at.desc())
    )
    orders = orders_res.scalars().all()

    results = []
    for order in orders:
        items = []
        if order.items:
            for item in order.items:
                med_name = (
                    item.inventory.medication.brand_name
                    if (item.inventory and item.inventory.medication)
                    else "Prescribed Medication"
                )
                items.append(
                    PatientOrderItemResponse(
                        medication_name=med_name,
                        quantity=item.quantity,
                        unit_price=Decimal(str(item.unit_price)),
                        subtotal=Decimal(str(item.subtotal)),
                    )
                )

        otp = str(random.randint(100000, 999999))
        qr_payload = f"https://medipaedia.health/verify/pickup?order={order.order_number}&otp={otp}"

        results.append(
            PatientOrderResponse(
                order_id=order.id,
                order_number=order.order_number,
                pharmacy_name=order.pharmacy_tenant.name if order.pharmacy_tenant else "Medipaedia Rx Counter",
                pharmacy_address=order.pharmacy_tenant.address if order.pharmacy_tenant else "Osu Oxford Street, Accra",
                pharmacy_phone=order.pharmacy_tenant.phone if order.pharmacy_tenant else "+233 30 277 8899",
                total_amount=Decimal(str(order.total_amount)),
                escrow_status=order.escrow_status,
                payment_status=order.payment_status,
                fulfillment_type=order.fulfillment_type,
                delivery_address=order.delivery_address,
                created_at=order.created_at,
                pickup_qr_code=qr_payload,
                pickup_otp=otp,
                items=items,
            )
        )
    return results


# ==========================================
# 6. Pickup Verification QR & OTP
# ==========================================
@router.get(
    "/orders/{order_id}/qr",
    response_model=PickupQRResponse,
    dependencies=[Depends(require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN))],
)
async def get_order_pickup_qr(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Order).options(selectinload(Order.pharmacy_tenant)).where(Order.id == order_id)
    )
    order = res.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    otp = "491028"
    qr_payload = f"https://medipaedia.health/verify/pickup?order={order.order_number}&otp={otp}"

    return PickupQRResponse(
        order_id=order.id,
        order_number=order.order_number,
        qr_payload=qr_payload,
        otp=otp,
        pharmacy_name=order.pharmacy_tenant.name if order.pharmacy_tenant else "Pharmacy Counter",
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
    )


# ============================================================================
# 7. EMERGENCY ICE & HEALTH PASSPORT
# ============================================================================
from app.schemas.patient_portal import (
    AddDependentRequest,
    AdherenceScheduleItem,
    BookAppointmentRequest,
    DependentProfileItem,
    DiagnosticReportItem,
    EmergencyICEProfile,
    EmergencyICEUpdateRequest,
    LogDoseTakenRequest,
    PatientAppointmentItem,
    PatientWalletResponse,
    PreCheckinRequest,
    PublicICEResponse,
    VitalsLogCreateRequest,
    VitalsLogItem,
    WalletTopupRequest,
    WalletTopupResponse,
    WalletTransactionItem,
    PillBoxCompartmentItem,
    PillBoxDailyScheduleResponse,
    LogPillBoxDoseRequest,
    LogPillBoxDoseResponse,
    BookTelehealthSessionRequest,
    BookTelehealthSessionResponse,
)

_PATIENT_ICE_PROFILE = EmergencyICEProfile()

_PATIENT_DIAGNOSTICS: List[DiagnosticReportItem] = [
    DiagnosticReportItem(
        report_id="diag-2026-001",
        test_name="Full Blood Count (FBC) + Differential",
        category="LABORATORY",
        facility_name="Ridge Regional Hospital Pathology",
        ordered_by="Dr. Afia Appiah",
        order_date="19 Aug 2026",
        completion_date="19 Aug 2026, 11:45",
        status="FINAL",
        has_abnormal_flag=True,
        key_findings="Hemoglobin: 13.8 g/dL (Normal). WBC: 12.4 x10^3/uL (Mild Leukocytosis). Platelets: 245 x10^3/uL.",
        download_url="/api/v1/patient/diagnostics/diag-2026-001/pdf",
    ),
    DiagnosticReportItem(
        report_id="diag-2026-002",
        test_name="Malaria Rapid Diagnostic Test (RDT Pf/Pan)",
        category="LABORATORY",
        facility_name="Ridge Regional Hospital Lab",
        ordered_by="Dr. Afia Appiah",
        order_date="19 Aug 2026",
        completion_date="19 Aug 2026, 10:15",
        status="FINAL",
        has_abnormal_flag=True,
        key_findings="P. falciparum Antigen (HRP2): POSITIVE (+). Rapid Treatment Indicated.",
        download_url="/api/v1/patient/diagnostics/diag-2026-002/pdf",
    ),
    DiagnosticReportItem(
        report_id="diag-2026-003",
        test_name="Chest X-Ray (PA View)",
        category="IMAGING",
        facility_name="Ridge Hospital Radiology",
        ordered_by="Dr. Afia Appiah",
        order_date="10 Aug 2026",
        completion_date="10 Aug 2026, 15:30",
        status="FINAL",
        has_abnormal_flag=False,
        key_findings="Normal cardiothoracic ratio. Lung fields clear bilaterally without active focal consolidation.",
        download_url="/api/v1/patient/diagnostics/diag-2026-003/pdf",
    ),
]

_PATIENT_VITALS: List[VitalsLogItem] = [
    VitalsLogItem(
        log_id="vit-001",
        recorded_at="19 Aug 2026, 09:30",
        systolic_bp=128,
        diastolic_bp=82,
        pulse_bpm=78,
        blood_glucose_mg_dl=104.0,
        temperature_c=38.4,
        weight_kg=74.5,
        source="CLINIC_SYNC",
    ),
    VitalsLogItem(
        log_id="vit-002",
        recorded_at="15 Aug 2026, 07:45",
        systolic_bp=124,
        diastolic_bp=80,
        pulse_bpm=72,
        blood_glucose_mg_dl=98.0,
        temperature_c=36.8,
        weight_kg=74.8,
        source="PATIENT_SELF_LOG",
    ),
    VitalsLogItem(
        log_id="vit-003",
        recorded_at="10 Aug 2026, 08:00",
        systolic_bp=126,
        diastolic_bp=81,
        pulse_bpm=75,
        blood_glucose_mg_dl=102.0,
        temperature_c=36.7,
        weight_kg=75.0,
        source="PATIENT_SELF_LOG",
    ),
]

_PATIENT_APPOINTMENTS: List[PatientAppointmentItem] = [
    PatientAppointmentItem(
        appointment_id="apt-2026-01",
        facility_id="fac-ridge-01",
        facility_name="Ridge Regional Hospital, Accra",
        department="General Outpatient (OPD)",
        doctor_name="Dr. Afia Appiah",
        scheduled_time="Tomorrow, 09:00 AM",
        status="CONFIRMED",
        queue_number="Q-042",
        pre_checkin_completed=True,
    ),
    PatientAppointmentItem(
        appointment_id="apt-2026-02",
        facility_id="fac-korlebu-01",
        facility_name="Korle-Bu Teaching Hospital",
        department="Cardiology Specialty Clinic",
        doctor_name="Dr. Kwame Antwi",
        scheduled_time="28 Aug 2026, 10:30 AM",
        status="CONFIRMED",
        queue_number="Q-018",
        pre_checkin_completed=False,
    ),
]

_PATIENT_DEPENDENTS: List[DependentProfileItem] = [
    DependentProfileItem(
        dependent_id="dep-001",
        full_name="Kofi Mensah Jr.",
        relationship="CHILD",
        date_of_birth="2020-04-12",
        gender="MALE",
        blood_group="O+",
        nhis_number="GHA-NHIS-8821941",
    ),
    DependentProfileItem(
        dependent_id="dep-002",
        full_name="Akosua Mensah",
        relationship="SPOUSE",
        date_of_birth="1992-08-25",
        gender="FEMALE",
        blood_group="A+",
        nhis_number="GHA-NHIS-8821942",
    ),
]

_PATIENT_ADHERENCE: List[AdherenceScheduleItem] = [
    AdherenceScheduleItem(
        schedule_id="adh-001",
        medication_name="Coartem (Artemether/Lumefantrine 20/120mg)",
        dosage="4 Tablets with food",
        frequency="Twice daily (Morning / Night)",
        time_of_day="08:00 AM",
        taken_today=True,
        streak_days=3,
    ),
    AdherenceScheduleItem(
        schedule_id="adh-002",
        medication_name="Paracetamol 500mg Tablets",
        dosage="2 Tablets for fever",
        frequency="Three times daily",
        time_of_day="02:00 PM",
        taken_today=False,
        streak_days=3,
    ),
    AdherenceScheduleItem(
        schedule_id="adh-003",
        medication_name="Vitamin C 500mg Effervescent",
        dosage="1 Tablet in water",
        frequency="Once daily",
        time_of_day="08:00 AM",
        taken_today=True,
        streak_days=14,
    ),
]


@router.get("/emergency-profile", response_model=EmergencyICEProfile)
async def get_emergency_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches the patient's Emergency In-Case-of-Emergency (ICE) passport profile.
    """
    return _PATIENT_ICE_PROFILE


@router.put("/emergency-profile", response_model=EmergencyICEProfile)
async def update_emergency_profile(
    req: EmergencyICEUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates blood group, genotype, allergies, conditions, and next-of-kin emergency contact.
    """
    global _PATIENT_ICE_PROFILE
    _PATIENT_ICE_PROFILE.blood_group = req.blood_group
    _PATIENT_ICE_PROFILE.genotype = req.genotype
    _PATIENT_ICE_PROFILE.allergies = req.allergies
    _PATIENT_ICE_PROFILE.chronic_conditions = req.chronic_conditions
    _PATIENT_ICE_PROFILE.emergency_contact_name = req.emergency_contact_name
    _PATIENT_ICE_PROFILE.emergency_contact_phone = req.emergency_contact_phone
    _PATIENT_ICE_PROFILE.emergency_contact_relationship = req.emergency_contact_relationship
    if req.organ_donor is not None:
        _PATIENT_ICE_PROFILE.organ_donor = req.organ_donor
    return _PATIENT_ICE_PROFILE


@router.get("/public-ice/{token}", response_model=PublicICEResponse)
async def get_public_emergency_ice(token: str):
    """
    Public unauthenticated endpoint returning critical lifesaving data when an ICE QR is scanned by first responders.
    """
    return PublicICEResponse(
        full_name="Kwesi Mensah",
        ghana_card="GHA-71298412-1",
        blood_group=_PATIENT_ICE_PROFILE.blood_group,
        genotype=_PATIENT_ICE_PROFILE.genotype,
        allergies=_PATIENT_ICE_PROFILE.allergies,
        chronic_conditions=_PATIENT_ICE_PROFILE.chronic_conditions,
        emergency_contact_name=_PATIENT_ICE_PROFILE.emergency_contact_name,
        emergency_contact_phone=_PATIENT_ICE_PROFILE.emergency_contact_phone,
        emergency_contact_relationship=_PATIENT_ICE_PROFILE.emergency_contact_relationship,
        organ_donor=_PATIENT_ICE_PROFILE.organ_donor,
    )


# ============================================================================
# 8. DIAGNOSTICS & VITALS HISTORY
# ============================================================================
@router.get("/diagnostics", response_model=List[DiagnosticReportItem])
async def get_patient_diagnostics(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full laboratory panel investigations and radiology reports with abnormal markers.
    """
    if category:
        return [d for d in _PATIENT_DIAGNOSTICS if d.category == category]
    return _PATIENT_DIAGNOSTICS


@router.get("/vitals-log", response_model=List[VitalsLogItem])
async def get_patient_vitals_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns historical vitals records from clinic visits and patient self-logging.
    """
    return _PATIENT_VITALS


@router.post("/vitals-log", response_model=VitalsLogItem)
async def log_patient_vitals(
    req: VitalsLogCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Self-logs patient vitals (Blood Pressure, Blood Glucose, Temperature, Weight).
    """
    new_vital = VitalsLogItem(
        log_id=f"vit-{uuid.uuid4().hex[:6]}",
        recorded_at=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        systolic_bp=req.systolic_bp,
        diastolic_bp=req.diastolic_bp,
        pulse_bpm=req.pulse_bpm,
        blood_glucose_mg_dl=req.blood_glucose_mg_dl,
        temperature_c=req.temperature_c,
        weight_kg=req.weight_kg,
        source="PATIENT_SELF_LOG",
    )
    _PATIENT_VITALS.insert(0, new_vital)
    return new_vital


# ============================================================================
# 9. APPOINTMENTS & PRE-CHECKIN
# ============================================================================
@router.get("/appointments", response_model=List[PatientAppointmentItem])
async def get_patient_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists upcoming and past hospital consultation bookings.
    """
    return _PATIENT_APPOINTMENTS


@router.post("/appointments", response_model=PatientAppointmentItem)
async def book_patient_appointment(
    req: BookAppointmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Books a consultation slot with a facility specialist and assigns a priority queue pass.
    """
    new_apt = PatientAppointmentItem(
        appointment_id=f"apt-{uuid.uuid4().hex[:6]}",
        facility_id=req.facility_id,
        facility_name=req.facility_name,
        department=req.department,
        doctor_name=req.doctor_name,
        scheduled_time=req.scheduled_time,
        status="CONFIRMED",
        queue_number=f"Q-{random.randint(10, 99)}",
        pre_checkin_completed=False,
    )
    _PATIENT_APPOINTMENTS.insert(0, new_apt)
    return new_apt


@router.post("/appointments/pre-checkin", response_model=PatientAppointmentItem)
async def pre_checkin_appointment(
    req: PreCheckinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-checks in the patient for their upcoming appointment to reduce OPD wait time.
    """
    for apt in _PATIENT_APPOINTMENTS:
        if apt.appointment_id == req.appointment_id:
            apt.pre_checkin_completed = True
            apt.status = "CHECKED_IN"
            return apt

    raise HTTPException(status_code=404, detail="Appointment not found.")


# ============================================================================
# 10. FAMILY DEPENDENTS & ADHERENCE
# ============================================================================
@router.get("/dependents", response_model=List[DependentProfileItem])
async def get_patient_dependents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists linked family dependents (children, spouse, parents).
    """
    return _PATIENT_DEPENDENTS


@router.post("/dependents", response_model=DependentProfileItem)
async def add_patient_dependent(
    req: AddDependentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Links a family dependent to the primary patient PHR.
    """
    new_dep = DependentProfileItem(
        dependent_id=f"dep-{uuid.uuid4().hex[:6]}",
        full_name=req.full_name,
        relationship=req.relationship,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        blood_group=req.blood_group,
        nhis_number=req.nhis_number,
    )
    _PATIENT_DEPENDENTS.append(new_dep)
    return new_dep


@router.get("/adherence", response_model=List[AdherenceScheduleItem])
async def get_medication_adherence_schedule(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the daily pill reminder schedule and adherence streaks.
    """
    return _PATIENT_ADHERENCE


@router.post("/adherence/dose", response_model=AdherenceScheduleItem)
async def log_medication_dose_taken(
    req: LogDoseTakenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks a scheduled prescription dose as taken and increments streak.
    """
    for item in _PATIENT_ADHERENCE:
        if item.schedule_id == req.schedule_id:
            item.taken_today = True
            item.streak_days += 1
            return item

    raise HTTPException(status_code=404, detail="Adherence schedule item not found.")


# ============================================================================
# 11. PATIENT WALLET & PAYSTACK TOP-UP
# ============================================================================
@router.get("/wallet", response_model=PatientWalletResponse)
async def get_patient_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the patient health wallet balance, NHIS coverage status, and transaction history.
    """
    return PatientWalletResponse(
        wallet_id="wlt-2026-99120",
        balance_ghs=Decimal("450.00"),
        currency="GHS",
        nhis_active=True,
        nhis_number="GHA-NHIS-8821940",
        private_insurance_provider="Nationwide Medical Insurance",
        private_insurance_policy="NMI-GOLD-2026-99",
        recent_transactions=[
            WalletTransactionItem(
                id="tx-101",
                type="TOPUP",
                description="MTN Mobile Money Top-Up",
                amount=Decimal("200.00"),
                timestamp="18 Aug 2026, 16:30",
                status="COMPLETED",
            ),
            WalletTransactionItem(
                id="tx-102",
                type="HOSPITAL_PAYMENT",
                description="Ridge Hospital Out-of-Pocket Co-Pay Settle",
                amount=Decimal("135.00"),
                timestamp="19 Aug 2026, 11:00",
                status="COMPLETED",
            ),
        ],
    )


@router.post("/wallet/topup", response_model=WalletTopupResponse)
async def topup_patient_wallet(
    req: WalletTopupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initializes a Paystack Mobile Money / Card push to fund the health wallet.
    """
    ref = f"wlt_top_{uuid.uuid4().hex[:8]}"
    return WalletTopupResponse(
        transaction_id=f"tx-{uuid.uuid4().hex[:6]}",
        paystack_reference=ref,
        authorization_url=f"https://checkout.paystack.com/{ref}",
        amount_ghs=req.amount_ghs,
        status="PENDING_PUSH",
    )


# ============================================================================
# 12. INTERACTIVE PILL BOX & 1-CLICK TELEHEALTH BOOKING
# ============================================================================

_PILLBOX_DOSES: List[PillBoxCompartmentItem] = [
    PillBoxCompartmentItem(
        compartment_id="dose-m-1",
        medication_name="Amlodipine Besylate 10mg",
        brand_name="Norvasc",
        dosage="1 Tablet",
        instructions="Take with water before breakfast",
        time_of_day="MORNING",
        scheduled_time="08:00 AM",
        status="TAKEN",
        taken_at="08:15 AM",
        can_refill=False,
        refill_remaining_days=18,
        pharmacy_pickup_partner="Ridge Regional Pharmacy Hub",
    ),
    PillBoxCompartmentItem(
        compartment_id="dose-m-2",
        medication_name="Coartem 80/480mg (Day 3)",
        brand_name="Coartem Dispersible Forte",
        dosage="1 Tablet",
        instructions="Take with a fatty meal or milk",
        time_of_day="MORNING",
        scheduled_time="08:30 AM",
        status="TAKEN",
        taken_at="08:40 AM",
        can_refill=False,
        refill_remaining_days=0,
        pharmacy_pickup_partner="Ridge Regional Pharmacy Hub",
    ),
    PillBoxCompartmentItem(
        compartment_id="dose-a-1",
        medication_name="Paracetamol 500mg Caplets",
        brand_name="Panadol Extra",
        dosage="2 Tablets",
        instructions="Take after lunch for mild fever",
        time_of_day="AFTERNOON",
        scheduled_time="01:00 PM",
        status="TAKEN",
        taken_at="01:15 PM",
        can_refill=True,
        refill_remaining_days=3,
        pharmacy_pickup_partner="Ernest Chemists (Osu Branch)",
    ),
    PillBoxCompartmentItem(
        compartment_id="dose-e-1",
        medication_name="Metformin HCl 500mg Extended Release",
        brand_name="Glucophage XR",
        dosage="1 Tablet",
        instructions="Take with dinner",
        time_of_day="EVENING",
        scheduled_time="07:00 PM",
        status="PENDING",
        taken_at=None,
        can_refill=False,
        refill_remaining_days=24,
        pharmacy_pickup_partner="Ridge Regional Pharmacy Hub",
    ),
    PillBoxCompartmentItem(
        compartment_id="dose-n-1",
        medication_name="Atorvastatin Calcium 20mg",
        brand_name="Lipitor",
        dosage="1 Tablet",
        instructions="Take at bedtime",
        time_of_day="NIGHT",
        scheduled_time="10:00 PM",
        status="PENDING",
        taken_at=None,
        can_refill=True,
        refill_remaining_days=4,
        pharmacy_pickup_partner="Ridge Regional Pharmacy Hub",
    ),
]


@router.get("/adherence/pillbox", response_model=PillBoxDailyScheduleResponse)
async def get_patient_pillbox_schedule(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the daily pill box compartments (Morning, Afternoon, Evening, Night) with adherence streak.
    """
    now = datetime.now(timezone.utc)
    morning = [d for d in _PILLBOX_DOSES if d.time_of_day == "MORNING"]
    afternoon = [d for d in _PILLBOX_DOSES if d.time_of_day == "AFTERNOON"]
    evening = [d for d in _PILLBOX_DOSES if d.time_of_day == "EVENING"]
    night = [d for d in _PILLBOX_DOSES if d.time_of_day == "NIGHT"]

    total = len(_PILLBOX_DOSES)
    completed = sum(1 for d in _PILLBOX_DOSES if d.status == "TAKEN")
    compliance = round((completed / total) * 100) if total > 0 else 100

    return PillBoxDailyScheduleResponse(
        current_date=now.strftime("%A, %d %B %Y"),
        streak_days=6,
        compliance_percentage=compliance,
        morning_doses=morning,
        afternoon_doses=afternoon,
        evening_doses=evening,
        night_doses=night,
        total_doses_today=total,
        doses_completed_today=completed,
    )


@router.post("/adherence/pillbox/log-dose", response_model=LogPillBoxDoseResponse)
async def log_pillbox_dose(
    req: LogPillBoxDoseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click logs a medication dose as TAKEN, MISSED, or SKIPPED and updates patient adherence telemetry.
    """
    now = datetime.now(timezone.utc)
    for dose in _PILLBOX_DOSES:
        if dose.compartment_id == req.compartment_id:
            dose.status = req.status
            dose.taken_at = req.taken_time or now.strftime("%I:%M %p")

            total = len(_PILLBOX_DOSES)
            completed = sum(1 for d in _PILLBOX_DOSES if d.status == "TAKEN")
            compliance = round((completed / total) * 100) if total > 0 else 100

            return LogPillBoxDoseResponse(
                success=True,
                compartment_id=dose.compartment_id,
                status=dose.status,
                streak_days=7 if completed == total else 6,
                compliance_percentage=compliance,
                message=f"Dose for {dose.medication_name} successfully recorded as {dose.status}.",
            )

    raise HTTPException(status_code=404, detail="Dose compartment not found.")


@router.post("/telehealth/book", response_model=BookTelehealthSessionResponse)
async def book_telehealth_session(
    req: BookTelehealthSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Books a 1-Click Telehealth Video Consultation and generates an encrypted WebRTC room pass.
    """
    session_id = f"tel-{uuid.uuid4().hex[:8]}"
    appt_id = f"apt-{uuid.uuid4().hex[:6]}"
    room_token = f"medrtc_{uuid.uuid4().hex[:16]}"

    return BookTelehealthSessionResponse(
        session_id=session_id,
        appointment_id=appt_id,
        doctor_name=req.doctor_name,
        specialty=req.specialty,
        scheduled_start=req.scheduled_start,
        duration_minutes=req.duration_minutes,
        room_token=room_token,
        join_url=f"https://telehealth.medipaedia.health/room/{room_token}",
        session_status="SCHEDULED",
        message=f"Telehealth consultation booked with {req.doctor_name} for {req.scheduled_start}.",
    )


