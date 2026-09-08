from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.tenant import TenantType


class TenantBase(BaseModel):
    name: str
    slug: str
    tenant_type: TenantType
    license_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Ghana"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: UUID
    is_verified: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
