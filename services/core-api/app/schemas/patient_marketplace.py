from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.order import EscrowStatus, FulfillmentType, PaymentStatus
from app.models.prescription import PrescriptionStatus


class PatientCardResponse(BaseModel):
    id: UUID
    facility_id: UUID
    facility_name: str
    facility_slug: str
    facility_type: str
    mrn: str
    qr_token: str
    registration_fee_paid: bool
    is_active: bool
    registered_at: datetime


class PrescriptionItemDetail(BaseModel):
    id: UUID
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None
    quantity_prescribed: int
    quantity_dispensed: int
    quantity_remaining: int


class PatientPrescriptionSummary(BaseModel):
    id: UUID
    prescription_number: str
    access_code: str
    verification_hash: str
    status: PrescriptionStatus
    doctor_name: str
    hospital_name: str
    diagnosis: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_expired: bool
    items: List[PrescriptionItemDetail]


class MarketplaceSearchRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(10.0, ge=0.5, le=50.0)
    medication_name: Optional[str] = None
    prescription_id: Optional[UUID] = None


class PharmacyStockBatchItem(BaseModel):
    inventory_id: UUID
    medication_name: str
    dosage_form: str
    strength: str
    batch_number: str
    unit_price: Decimal
    quantity_available: int
    is_in_stock: bool


class PharmacyMarketplaceItem(BaseModel):
    pharmacy_id: UUID
    pharmacy_name: str
    pharmacy_slug: str
    address: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: float
    distance_meters: int
    is_verified: bool
    open_now: bool = True
    operating_hours: str = "08:00 AM - 10:00 PM"
    stock_items: List[PharmacyStockBatchItem]
    total_basket_price: Optional[Decimal] = None
    has_full_prescription_stock: bool = True


class MarketplaceSearchResult(BaseModel):
    search_location: dict
    radius_km: float
    pharmacies_found: int
    results: List[PharmacyMarketplaceItem]


class CartCheckoutItemInput(BaseModel):
    inventory_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)


class CheckoutOrderRequest(BaseModel):
    pharmacy_tenant_id: UUID
    prescription_id: Optional[UUID] = None
    fulfillment_type: FulfillmentType = FulfillmentType.PICKUP
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    items: List[CartCheckoutItemInput]


class CheckoutOrderResponse(BaseModel):
    order_id: UUID
    order_number: str
    pharmacy_name: str
    total_amount: Decimal
    escrow_status: EscrowStatus
    payment_status: PaymentStatus
    fulfillment_type: FulfillmentType
    paystack_authorization_url: str
    paystack_access_code: str
    paystack_reference: str
    inventory_hold_expires_at: datetime
    message: str


class PatientOrderItemResponse(BaseModel):
    medication_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class PatientOrderResponse(BaseModel):
    order_id: UUID
    order_number: str
    pharmacy_name: str
    pharmacy_address: Optional[str] = None
    pharmacy_phone: Optional[str] = None
    total_amount: Decimal
    escrow_status: EscrowStatus
    payment_status: PaymentStatus
    fulfillment_type: FulfillmentType
    delivery_address: Optional[str] = None
    created_at: datetime
    pickup_qr_code: str
    pickup_otp: str
    items: List[PatientOrderItemResponse]


class PickupQRResponse(BaseModel):
    order_id: UUID
    order_number: str
    qr_payload: str
    otp: str
    pharmacy_name: str
    expires_at: datetime
