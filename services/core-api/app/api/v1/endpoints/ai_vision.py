from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.ai_vision import (
    IDCardOCRRequest,
    IDCardOCRResponse,
    PrescriptionOCRRequest,
    PrescriptionOCRResponse,
    QueueWaitTimeEstimateResponse,
)
from app.services.ai_vision_ocr import (
    extract_id_card_data,
    extract_prescription_ocr,
    predict_queue_wait_time,
)

router = APIRouter()


@router.post("/ocr/id-card", response_model=IDCardOCRResponse)
async def process_id_card_ocr(
    req: IDCardOCRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    ID Card OCR Extractor: Parses national ID cards (Ghana Card GHA-..., passports) extracting
    Full Name, ID PIN, Date of Birth, Gender, and Expiry Date with confidence metrics.
    """
    res = extract_id_card_data(
        image_payload=req.image_base64,
        document_type=req.document_type or "GHANA_CARD",
        raw_text_hint=req.raw_text_hint,
    )
    return res


@router.post("/ocr/prescription", response_model=PrescriptionOCRResponse)
async def process_prescription_handwriting_ocr(
    req: PrescriptionOCRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Prescription Handwriting OCR Parser: Detects medication line items, strengths, dosage frequencies,
    and maps them into inventory products ready for 1-click POS cart injection.
    """
    res = extract_prescription_ocr(
        image_payload=req.image_base64,
        doctor_notes_hint=req.doctor_notes_hint,
        raw_text_hint=req.raw_text_hint,
    )
    return res


@router.get("/queue/wait-time-estimate", response_model=QueueWaitTimeEstimateResponse)
async def get_queue_wait_time_estimate(
    department: str = Query(default="GENERAL_OPD", description="Target hospital department"),
    queue_position: int = Query(default=1, ge=1, description="Current position in queue"),
    triage_priority: str = Query(default="ROUTINE", description="STAT, URGENT, or ROUTINE"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Predictive OPD Queue Wait-Time Estimator: Computes dynamic wait times (minutes) and ETA
    factoring in current waiting load, average physician consultation pace, and triage urgency weighting.
    """
    res = predict_queue_wait_time(
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        department=department,
        queue_position=queue_position,
        triage_priority=triage_priority,
    )
    return res
