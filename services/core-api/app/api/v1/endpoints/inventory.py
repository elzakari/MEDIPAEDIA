import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

try:
    from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
except ImportError:
    ST_DWithin, ST_MakePoint, ST_SetSRID = None, None, None

from app.core.database import get_db
from app.models.inventory import GlobalMedication, PharmacyInventory
from app.schemas.inventory import (
    GlobalMedicationResponse,
    PharmacyInventoryCreate,
    PharmacyInventoryResponse,
)

router = APIRouter()


@router.get("/medications", response_model=List[GlobalMedicationResponse])
async def list_global_medications(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(GlobalMedication)
    if search:
        query = query.where(
            GlobalMedication.generic_name.ilike(f"%{search}%")
            | GlobalMedication.brand_name.ilike(f"%{search}%")
        )
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/search", response_model=List[PharmacyInventoryResponse])
async def search_pharmacy_inventory(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(10.0, ge=0.5, le=50.0),
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Geospatial nearby stock availability locator.
    """
    query = (
        select(PharmacyInventory)
        .options(
            selectinload(PharmacyInventory.medication),
            selectinload(PharmacyInventory.tenant),
        )
        .where(
            PharmacyInventory.is_available_for_marketplace == True,
            PharmacyInventory.quantity_available > 0,
        )
    )

    if search:
        query = query.join(PharmacyInventory.medication).where(
            GlobalMedication.generic_name.ilike(f"%{search}%")
            | GlobalMedication.brand_name.ilike(f"%{search}%")
        )

    if latitude is not None and longitude is not None and ST_DWithin is not None:
        user_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        radius_meters = radius_km * 1000.0
        query = query.where(
            ST_DWithin(PharmacyInventory.location, user_point, radius_meters)
        )

    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/stock",
    response_model=PharmacyInventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_or_update_stock(
    stock_in: PharmacyInventoryCreate,
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    inventory = PharmacyInventory(
        tenant_id=tenant_id,
        global_medication_id=stock_in.global_medication_id,
        sku=stock_in.sku,
        batch_number=stock_in.batch_number,
        unit_price=stock_in.unit_price,
        quantity_available=stock_in.quantity_available,
        expiry_date=stock_in.expiry_date,
        is_available_for_marketplace=stock_in.is_available_for_marketplace,
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)
    return inventory
