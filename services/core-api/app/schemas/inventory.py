from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class GlobalMedicationBase(BaseModel):
    generic_name: str
    brand_name: str
    dosage_form: str
    strength: str
    category: Optional[str] = None
    nafdac_fda_number: Optional[str] = None
    description: Optional[str] = None


class GlobalMedicationResponse(GlobalMedicationBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PharmacyInventoryBase(BaseModel):
    global_medication_id: UUID
    sku: str
    batch_number: str
    unit_price: Decimal
    cost_price: Optional[Decimal] = None
    quantity_available: int
    expiry_date: date
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_available_for_marketplace: bool = True
    requires_prescription: bool = True


class PharmacyInventoryCreate(PharmacyInventoryBase):
    pass


class PharmacyInventoryResponse(PharmacyInventoryBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    medication: Optional[GlobalMedicationResponse] = None

    model_config = ConfigDict(from_attributes=True)
