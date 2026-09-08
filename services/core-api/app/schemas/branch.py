from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class BranchTypeEnum(str):
    MAIN_HUB = "MAIN_HUB"
    CLINIC = "CLINIC"
    DISPENSARY = "DISPENSARY"
    OUTLET = "OUTLET"
    WAREHOUSE = "WAREHOUSE"


class FacilityBranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    code: str
    branch_type: str = "CLINIC"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_main_hub: bool = False
    is_active: bool = True
    created_at: datetime


class CreateBranchRequest(BaseModel):
    name: str
    code: str
    branch_type: str = "CLINIC"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_main_hub: Optional[bool] = False


class UpdateBranchRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None


class InterBranchTransferItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[uuid.UUID] = None
    global_medication_id: Optional[uuid.UUID] = None
    medication_name: str
    sku: Optional[str] = None
    batch_number: str
    expiry_date: Optional[str] = None
    quantity_dispatched: int
    quantity_received: Optional[int] = 0
    unit_cost: Optional[Decimal] = Decimal("0.00")
    notes: Optional[str] = None


class IBTDispatchPayload(BaseModel):
    source_branch_id: uuid.UUID
    destination_branch_id: uuid.UUID
    driver_courier_name: Optional[str] = None
    driver_courier_phone: Optional[str] = None
    notes: Optional[str] = None
    items: List[InterBranchTransferItemSchema]


class ReceiveIBTPayload(BaseModel):
    notes: Optional[str] = None
    item_receipts: Optional[List[Dict[str, Any]]] = None


class InterBranchTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    transfer_number: str
    source_branch_id: uuid.UUID
    destination_branch_id: uuid.UUID
    source_branch_name: Optional[str] = None
    destination_branch_name: Optional[str] = None
    status: str
    dispatched_by_user_id: Optional[uuid.UUID] = None
    received_by_user_id: Optional[uuid.UUID] = None
    dispatched_at: datetime
    received_at: Optional[datetime] = None
    driver_courier_name: Optional[str] = None
    driver_courier_phone: Optional[str] = None
    notes: Optional[str] = None
    items: List[InterBranchTransferItemSchema] = []


class TenantEntitlementsResponse(BaseModel):
    tenant_id: str
    plan_code: str
    plan_name: str
    tier: str
    feature_flags: Dict[str, bool]
    limits: Dict[str, int]
    active_seats: int
    active_branches: int
