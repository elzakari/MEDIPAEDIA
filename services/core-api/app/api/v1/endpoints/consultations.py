import uuid
from typing import List, Optional
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
from app.models.clinical import Consultation, Vitals
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
    VitalsCreate,
    VitalsResponse,
)

router = APIRouter()


@router.get("", response_model=List[ConsultationResponse])
async def list_consultations(
    hospital_card_id: Optional[uuid.UUID] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_clinical_staff),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Consultation)
        .options(selectinload(Consultation.vitals))
        .where(Consultation.tenant_id == tenant.id)
    )
    if hospital_card_id:
        query = query.where(Consultation.hospital_card_id == hospital_card_id)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "",
    response_model=ConsultationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_clinical_staff)],
)
async def create_consultation(
    consult_in: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    consultation = Consultation(
        hospital_card_id=consult_in.hospital_card_id,
        tenant_id=tenant.id,
        doctor_id=current_user.id,
        chief_complaint=consult_in.chief_complaint,
        history_of_present_illness=consult_in.history_of_present_illness,
        examination_findings=consult_in.examination_findings,
        clinical_notes=consult_in.clinical_notes,
        icd10_diagnosis_code=consult_in.icd10_diagnosis_code,
        diagnosis_description=consult_in.diagnosis_description,
        consultation_status=consult_in.consultation_status,
    )
    db.add(consultation)
    await db.commit()
    await db.refresh(consultation)
    return consultation


@router.post(
    "/vitals",
    response_model=VitalsResponse,
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
async def record_vitals(
    vitals_in: VitalsCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    calculated_bmi = None
    if vitals_in.height_cm and vitals_in.weight_kg and vitals_in.height_cm > 0:
        height_m = vitals_in.height_cm / 100.0
        calculated_bmi = round(vitals_in.weight_kg / (height_m * height_m), 1)

    vitals = Vitals(
        consultation_id=vitals_in.consultation_id,
        patient_account_id=vitals_in.patient_account_id,
        recorded_by_nurse_id=current_user.id,
        temperature=vitals_in.temperature,
        systolic_bp=vitals_in.systolic_bp,
        diastolic_bp=vitals_in.diastolic_bp,
        heart_rate=vitals_in.heart_rate,
        respiratory_rate=vitals_in.respiratory_rate,
        spo2=vitals_in.spo2,
        weight_kg=vitals_in.weight_kg,
        height_cm=vitals_in.height_cm,
        bmi=calculated_bmi or vitals_in.bmi,
    )
    db.add(vitals)
    await db.commit()
    await db.refresh(vitals)
    return vitals
