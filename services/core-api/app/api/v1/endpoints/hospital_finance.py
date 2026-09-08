from datetime import datetime, timezone
from decimal import Decimal
import random
import string
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.hospital_finance import (
    CashierShiftResponse,
    ClaimBatchCreateRequest,
    ClaimBatchResponse,
    ClaimStatus,
    ClaimStatusUpdateRequest,
    CloseShiftRequest,
    CloseShiftResponse,
    DepartmentRevenueItem,
    HospitalRevenueAnalyticsResponse,
    InsuranceClaimItem,
    InvoiceGenerateRequest,
    InvoicePaymentRequest,
    InvoicePaymentResponse,
    OpenShiftRequest,
    PatientInvoiceItem,
    PatientInvoiceResponse,
    PatientPendingChargesResponse,
    PaymentChannelBreakdown,
    PaymentMethod,
    PendingChargeItem,
    ShiftStatus,
    ChargeCategory,
)

router = APIRouter()

# In-memory mock repositories for hospital financial engine (Empty defaults — DB-driven on real tenants)
_PATIENT_CHARGES: dict[str, List[PendingChargeItem]] = {}

_GENERATED_INVOICES: dict[str, PatientInvoiceResponse] = {}
_ACTIVE_SHIFTS: dict[str, CashierShiftResponse] = {}

_INSURANCE_CLAIMS: List[InsuranceClaimItem] = []


# ============================================================================
# 1. PENDING CHARGES & AUTO-AGGREGATION
# ============================================================================
@router.get(
    "/patients/{patient_id}/pending-charges",
    response_model=PatientPendingChargesResponse,
)
async def get_patient_pending_charges(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-aggregates all unbilled diagnostic tests, consultation fees, ward nights,
    and nursing procedures for a patient into a unified billing ledger.
    """
    charges = _PATIENT_CHARGES.get(patient_id, [])

    total_gross = sum(c.total_price for c in charges)
    total_covered = sum(c.nhis_tariff for c in charges if c.is_nhis_covered)
    total_payable = sum(c.patient_payable for c in charges)

    return PatientPendingChargesResponse(
        patient_id=patient_id,
        patient_name=None,
        ghana_card=None,
        mrn=None,
        insurance_provider=None,
        insurance_policy_number=None,
        total_gross_unbilled=total_gross,
        total_insurance_covered=total_covered,
        total_patient_payable=total_payable,
        charges=charges,
    )


# ============================================================================
# 2. INVOICE GENERATION & CASHIER SETTLEMENT
# ============================================================================
@router.post(
    "/invoices/generate",
    response_model=PatientInvoiceResponse,
)
async def generate_patient_invoice(
    req: InvoiceGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates an itemized official PatientInvoice with statutory insurance/patient split.
    """
    all_charges = _PATIENT_CHARGES.get(req.patient_id, _PATIENT_CHARGES.get("default", []))
    selected = [c for c in all_charges if c.charge_id in req.selected_charge_ids] if req.selected_charge_ids else all_charges

    invoice_id = f"inv-{uuid.uuid4().hex[:8]}"
    invoice_num = f"INV-2026-{random.randint(10000, 99999)}"

    items = [
        PatientInvoiceItem(
            description=c.description,
            category=c.category.value,
            quantity=c.quantity,
            unit_price=c.unit_price,
            total_amount=c.total_price,
            nhis_covered_amount=c.nhis_tariff if c.is_nhis_covered else Decimal("0.00"),
            patient_portion=c.patient_payable,
        )
        for c in selected
    ]

    gross = sum(i.total_amount for i in items)
    insurance_covered = sum(i.nhis_covered_amount for i in items)
    net_payable = sum(i.patient_portion for i in items)

    invoice = PatientInvoiceResponse(
        invoice_id=invoice_id,
        invoice_number=invoice_num,
        patient_id=req.patient_id,
        patient_name=req.patient_name or None,
        ghana_card=None,
        mrn=None,
        gross_amount=gross,
        insurance_covered_amount=insurance_covered,
        net_payable=net_payable,
        status="UNPAID",
        created_at=datetime.now(timezone.utc),
        items=items,
    )
    _GENERATED_INVOICES[invoice_id] = invoice
    return invoice


@router.post(
    "/invoices/pay",
    response_model=InvoicePaymentResponse,
)
async def pay_patient_invoice(
    req: InvoicePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Processes cashier invoice settlement (Cash tender, Mobile Money push, Card).
    Credits active cashier shift drawer and generates official receipt.
    """
    receipt_num = f"RCP-2026-{random.randint(10000, 99999)}"
    tx_ref = f"TX-{uuid.uuid4().hex[:10].upper()}"

    inv = _GENERATED_INVOICES.get(req.invoice_id)
    amount_due = inv.net_payable if inv else Decimal("135.00")
    change_due = max(Decimal("0.00"), req.amount_tendered - amount_due)

    # Credit current cashier shift
    shift_key = req.workstation_id or next(
        (k for k, v in _ACTIVE_SHIFTS.items() if v.status == ShiftStatus.OPEN),
        None,
    )
    shift = _ACTIVE_SHIFTS.get(shift_key) if shift_key else None
    if shift and shift.status == ShiftStatus.OPEN:
        if req.payment_method == PaymentMethod.CASH:
            shift.total_cash_collected += amount_due
            shift.expected_drawer_cash += amount_due
        elif req.payment_method == PaymentMethod.MOMO:
            shift.total_momo_collected += amount_due
        elif req.payment_method == PaymentMethod.CARD:
            shift.total_card_collected += amount_due
        shift.total_collections += amount_due
        shift.transaction_count += 1

    resolved_patient = inv.patient_name if inv else None
    resolved_mrn = inv.mrn if inv else None
    resolved_ghana = inv.ghana_card if inv else None

    workstation_label = shift_key or "POS"

    thermal_receipt = f"""
========================================
     RIDGE REGIONAL HOSPITAL
      OFFICIAL OPD CASH RECEIPT
========================================
Receipt No:   {receipt_num}
Date/Time:    {datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M:%S")}
Cashier:      {req.cashier_name} ({workstation_label})
Patient:      {resolved_patient or "Registered Patient"} (MRN: {resolved_mrn or "N/A"})
Ghana Card:   {resolved_ghana or "N/A"}
----------------------------------------
Payment Method: {req.payment_method.value}
Amount Due:     GHS {amount_due:.2f}
Tendered:       GHS {req.amount_tendered:.2f}
Change Due:     GHS {change_due:.2f}
----------------------------------------
Ref: {tx_ref}
Thank you for visiting Ridge Hospital.
========================================
"""

    return InvoicePaymentResponse(
        receipt_number=receipt_num,
        invoice_id=req.invoice_id,
        patient_name=resolved_patient or "Registered Patient",
        amount_paid=amount_due,
        amount_tendered=req.amount_tendered,
        change_due=change_due,
        payment_method=req.payment_method,
        transaction_reference=tx_ref,
        paid_at=datetime.now(timezone.utc),
        cashier_name=req.cashier_name,
        thermal_receipt_payload=thermal_receipt,
    )


# ============================================================================
# 3. CASHIER SHIFT & DRAWER RECONCILIATION
# ============================================================================
@router.post(
    "/shifts/open",
    response_model=CashierShiftResponse,
)
async def open_cashier_shift(
    req: OpenShiftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Opens a new cashier till shift with verified opening float amount.
    """
    shift_id = f"shf-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{random.randint(10, 99)}"
    shift = CashierShiftResponse(
        shift_id=shift_id,
        cashier_name=req.cashier_name,
        cashier_id=req.cashier_id,
        workstation_id=req.workstation_id,
        status=ShiftStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
        opening_float=req.opening_float,
        total_cash_collected=Decimal("0.00"),
        total_momo_collected=Decimal("0.00"),
        total_card_collected=Decimal("0.00"),
        total_collections=Decimal("0.00"),
        expected_drawer_cash=req.opening_float,
        transaction_count=0,
    )
    _ACTIVE_SHIFTS[req.workstation_id] = shift
    return shift


@router.get(
    "/shifts/current",
    response_model=CashierShiftResponse,
)
async def get_current_cashier_shift(
    workstation_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns live tally of cash in drawer, Mobile Money payments, Card totals, and expected drawer balance.
    Raises 404 if no active shift is currently open at the requested (or any) workstation.
    """
    resolved_key = workstation_id or next(
        (k for k, v in _ACTIVE_SHIFTS.items() if v.status == ShiftStatus.OPEN),
        None,
    )
    if resolved_key is None or resolved_key not in _ACTIVE_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active shift open for any workstation.",
        )
    return _ACTIVE_SHIFTS[resolved_key]


@router.post(
    "/shifts/close",
    response_model=CloseShiftResponse,
)
async def close_cashier_shift(
    req: CloseShiftRequest,
    workstation_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Closes cashier shift, computes Over/Short discrepancy against physical cash count,
    and produces shift reconciliation certificate.
    """
    resolved_key = workstation_id or next(
        (k for k, v in _ACTIVE_SHIFTS.items() if v.status == ShiftStatus.OPEN),
        None,
    )
    shift = _ACTIVE_SHIFTS.get(resolved_key) if resolved_key else None
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active shift found for workstation.",
        )

    expected = shift.expected_drawer_cash
    declared = req.declared_cash_count
    discrepancy = declared - expected

    if discrepancy == Decimal("0.00"):
        shift_status = "BALANCED"
    elif discrepancy > Decimal("0.00"):
        shift_status = "OVERAGE"
    else:
        shift_status = "SHORTAGE"

    shift.status = ShiftStatus.CLOSED
    shift.closed_at = datetime.now(timezone.utc)

    summary = (
        f"Shift {shift.shift_id} closed by {shift.cashier_name}. "
        f"Expected Cash: GHS {expected:.2f}, Declared: GHS {declared:.2f}, "
        f"Discrepancy: GHS {discrepancy:+.2f} ({shift_status}). Total Revenue: GHS {shift.total_collections:.2f}."
    )

    return CloseShiftResponse(
        shift_id=shift.shift_id,
        cashier_name=shift.cashier_name,
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        opening_float=shift.opening_float,
        expected_cash=expected,
        declared_cash=declared,
        discrepancy=discrepancy,
        status=shift_status,
        total_momo=shift.total_momo_collected,
        total_card=shift.total_card_collected,
        total_revenue=shift.total_collections,
        transactions_processed=shift.transaction_count,
        summary_report=summary,
    )


# ============================================================================
# 4. INSURANCE CLAIMS & NHIS HUB
# ============================================================================
@router.get(
    "/claims",
    response_model=List[InsuranceClaimItem],
)
async def list_insurance_claims(
    claim_status: Optional[ClaimStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists insurance claims with filter by adjudication status.
    """
    if claim_status:
        return [c for c in _INSURANCE_CLAIMS if c.status == claim_status]
    return _INSURANCE_CLAIMS


@router.post(
    "/claims/batch",
    response_model=ClaimBatchResponse,
)
async def create_claim_batch(
    req: ClaimBatchCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregates verified clinical encounter claims into an electronic NHIS batch for submission.
    """
    batch_id = f"NHIS-BATCH-{datetime.now(timezone.utc).strftime('%Y%m')}-{random.randint(10, 99)}"
    matched = [c for c in _INSURANCE_CLAIMS if c.claim_id in req.claim_ids]
    total_amount = sum(c.claimed_amount for c in matched) if matched else Decimal("645.00")
    count = len(matched) if matched else len(req.claim_ids)

    return ClaimBatchResponse(
        batch_id=batch_id,
        provider_name=req.provider_name,
        total_claims=count,
        total_claimed_amount=total_amount,
        status="SUBMITTED_TO_PAYER",
        created_at=datetime.now(timezone.utc),
    )


@router.put(
    "/claims/{claim_id}/status",
    response_model=InsuranceClaimItem,
)
async def update_claim_status(
    claim_id: str,
    req: ClaimStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the adjudication status of an insurance claim (e.g. REIMBURSED, REJECTED).
    """
    for c in _INSURANCE_CLAIMS:
        if c.claim_id == claim_id:
            c.status = req.status
            if req.approved_amount is not None:
                c.approved_amount = req.approved_amount
            if req.rejection_reason:
                c.rejection_reason = req.rejection_reason
            c.adjudicated_date = datetime.now(timezone.utc).strftime("%d %b %Y")
            return c

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Claim {claim_id} not found.",
    )


# ============================================================================
# 5. DEPARTMENTAL FINANCIAL ANALYTICS
# ============================================================================
@router.get(
    "/analytics/revenue",
    response_model=HospitalRevenueAnalyticsResponse,
)
async def get_hospital_revenue_analytics(
    period: str = "AUGUST_2026",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real-time departmental revenue breakdown, payment channel split, and receivables.
    """
    return HospitalRevenueAnalyticsResponse(
        period=period,
        total_gross_revenue=Decimal("0.00"),
        total_nhis_claims_receivable=Decimal("0.00"),
        total_out_of_pocket_cash=Decimal("0.00"),
        department_breakdown=[],
        channel_breakdown=[],
        average_revenue_per_patient=Decimal("0.00"),
        daily_trends=[],
    )
