from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NHISGDRGTariffItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    gdrg_code: str
    service_name: str
    category: str
    standard_tariff_ghs: Decimal
    nhis_covered_amount_ghs: Decimal
    patient_copay_ghs: Decimal = Decimal("0.00")
    preauth_required: bool = False
    is_active: bool = True
    description: Optional[str] = None


class NHISGDRGTariffListResponse(BaseModel):
    total: int
    items: List[NHISGDRGTariffItemResponse]


class FormularyMedicationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    generic_name: str
    brand_name: str
    dosage_form: str
    strength: str
    category: Optional[str] = None
    therapeutic_class: Optional[str] = None
    poison_schedule: Optional[str] = "OTC"
    standard_dosing: Optional[str] = None
    is_cold_chain: bool = False
    storage_temp_min: Optional[float] = None
    storage_temp_max: Optional[float] = None
    linked_icd10_codes: Optional[str] = None
    nafdac_fda_number: Optional[str] = None
    description: Optional[str] = None


class FormularyMedicationListResponse(BaseModel):
    total: int
    items: List[FormularyMedicationItemResponse]
