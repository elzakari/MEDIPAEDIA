from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

try:
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point
except ImportError:
    from_shape = None
    Point = None

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.tenant import Tenant, TenantType
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantResponse

router = APIRouter()


@router.get("/current", response_model=TenantResponse, summary="Get Current Authenticated Tenant")
async def get_current_tenant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the authentic healthcare facility tenant for the currently logged-in user.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not scoped to a healthcare tenant.",
        )
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant facility not found.",
        )
    return tenant


@router.get("", response_model=List[TenantResponse])
async def list_tenants(

    tenant_type: Optional[TenantType] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tenant).where(Tenant.is_active == True)
    if tenant_type:
        query = query.where(Tenant.tenant_type == tenant_type)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_in: TenantCreate,
    db: AsyncSession = Depends(get_db),
):
    # Check for existing slug
    existing = await db.execute(select(Tenant).where(Tenant.slug == tenant_in.slug))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Facility with slug '{tenant_in.slug}' already exists.",
        )

    location_geom = None
    if (
        tenant_in.latitude is not None
        and tenant_in.longitude is not None
        and from_shape is not None
        and Point is not None
    ):
        point = Point(tenant_in.longitude, tenant_in.latitude)
        location_geom = from_shape(point, srid=4326)

    tenant = Tenant(
        name=tenant_in.name,
        slug=tenant_in.slug,
        tenant_type=tenant_in.tenant_type,
        license_number=tenant_in.license_number,
        phone=tenant_in.phone,
        email=tenant_in.email,
        address=tenant_in.address,
        city=tenant_in.city,
        country=tenant_in.country,
        latitude=tenant_in.latitude,
        longitude=tenant_in.longitude,
        location=location_geom,
        is_verified=tenant_in.is_verified,
        is_active=True,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant
