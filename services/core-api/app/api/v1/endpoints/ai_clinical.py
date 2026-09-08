from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.ai_clinical import (
    AIScribeRequest,
    AISoapScribeResponse,
    ICD10DifferentialRequest,
    ICD10SuggestionResponse,
    MultilingualCounselingRequest,
    MultilingualCounselingResponse,
)
from app.services.ai_copilot import (
    generate_ambient_soap_from_audio,
    suggest_icd10_differentials,
    generate_multilingual_counseling,
)

router = APIRouter()


@router.post("/scribe/transcribe-soap", response_model=AISoapScribeResponse)
async def transcribe_ambient_soap(
    req: AIScribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ambient AI Clinical Scribe: Ingests raw consultation transcript or dictation audio stream,
    strips direct PHI tokens, and structures encounter notes into Subjective, Objective, Assessment, and Plan (SOAP).
    """
    if not req.transcript_text or not req.transcript_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript text or dictation content cannot be empty.",
        )

    res = generate_ambient_soap_from_audio(
        transcript_text=req.transcript_text,
        patient_context=req.patient_context,
    )
    return res


@router.post("/diagnostics/icd10-suggest", response_model=ICD10SuggestionResponse)
async def suggest_icd10_differential_diagnoses(
    req: ICD10DifferentialRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI ICD-10 Differential Diagnosis Engine: Evaluates patient presenting symptoms, vitals telemetry,
    and history to calculate probabilistic differential diagnostic recommendations with clinical rationales.
    """
    if not req.symptoms and not req.encounter_notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one symptom or encounter note must be provided.",
        )

    symptoms_list = req.symptoms or []
    if req.encounter_notes:
        symptoms_list.append(req.encounter_notes)

    res = suggest_icd10_differentials(
        symptoms=symptoms_list,
        vitals_summary=req.vitals_summary or "",
        history=req.history or "",
    )
    return res


@router.post("/pharmacy/counseling", response_model=MultilingualCounselingResponse)
async def generate_patient_pharmacy_counseling(
    req: MultilingualCounselingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Multilingual Pharmacy Counseling Generator: Generates localized, culturally adapted patient counseling
    notes and food/auxiliary safety label warnings in English, French, Twi, Ewe, or Ga.
    """
    if not req.prescription_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one prescription medication item is required.",
        )

    res = generate_multilingual_counseling(
        prescription_items=req.prescription_items,
        target_language=req.target_language,
        patient_name=req.patient_name or "Patient",
    )
    return res
