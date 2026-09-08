"""
==============================================================================
Statutory Ghana NHIA G-DRG Tariffs & Essential Medicines Formulary Endpoints
==============================================================================
Provides searchable access to:
1. Ghana National Health Insurance Scheme (NHIS) G-DRG statutory tariff bands.
2. WHO & Ghana FDA Essential Medicines Formulary with Act 857 Poison Schedules,
   cold-chain temperature ranges, and dosing guidelines.
"""

from decimal import Decimal
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.clinical import NHISGDRGTariff
from app.models.inventory import GlobalMedication
from app.schemas.tariffs import (
    FormularyMedicationItemResponse,
    FormularyMedicationListResponse,
    NHISGDRGTariffItemResponse,
    NHISGDRGTariffListResponse,
)

logger = logging.getLogger("medipaedia.api.tariffs")

router = APIRouter()


@router.get(
    "/nhis-gdrg",
    response_model=List[NHISGDRGTariffItemResponse],
    summary="Get Searchable Ghana NHIS G-DRG Tariff Catalog",
)
async def get_nhis_gdrg_tariffs(
    search: Optional[str] = Query(None, description="Search by G-DRG code or service name"),
    category: Optional[str] = Query(None, description="Filter by category (CONSULTATION, LABORATORY, RADIOLOGY, SURGERY, DELIVERY, WARD_ACCOMMODATION, PROCEDURE)"),
    preauth_required: Optional[bool] = Query(None, description="Filter by pre-authorization requirement"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the statutory Ghana National Health Insurance Authority (NHIA)
    G-DRG tariff bands with coverage and patient co-pay calculations.
    """
    stmt = select(NHISGDRGTariff).where(NHISGDRGTariff.is_active == True)

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                NHISGDRGTariff.gdrg_code.ilike(s),
                NHISGDRGTariff.service_name.ilike(s),
                NHISGDRGTariff.description.ilike(s),
            )
        )

    if category:
        stmt = stmt.where(NHISGDRGTariff.category == category.upper())

    if preauth_required is not None:
        stmt = stmt.where(NHISGDRGTariff.preauth_required == preauth_required)

    stmt = stmt.order_by(NHISGDRGTariff.gdrg_code.asc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()
    return items


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
