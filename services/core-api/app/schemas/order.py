from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.order import EscrowStatus, FulfillmentType, PaymentStatus


class OrderItemBase(BaseModel):
    inventory_id: UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderItemCreate(BaseModel):
    inventory_id: UUID
    quantity: int


class OrderItemResponse(OrderItemBase):
    id: UUID
    order_id: UUID

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    patient_account_id: UUID
    pharmacy_tenant_id: UUID
    prescription_id: Optional[UUID] = None
    fulfillment_type: FulfillmentType = FulfillmentType.PICKUP
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    items: List[OrderItemCreate]


class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    patient_account_id: UUID
    pharmacy_tenant_id: UUID
    prescription_id: Optional[UUID] = None
    escrow_status: EscrowStatus
    payment_status: PaymentStatus
    fulfillment_type: FulfillmentType
    paystack_reference: Optional[str] = None
    delivery_address: Optional[str] = None
    total_amount: Decimal
    escrow_fee: Decimal
    delivery_fee: Decimal
    created_at: datetime
    items: List[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
