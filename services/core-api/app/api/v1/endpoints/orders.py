from decimal import Decimal
import random
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.inventory import PharmacyInventory
from app.models.order import EscrowStatus, Order, OrderItem, PaymentStatus
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter()


@router.get("", response_model=List[OrderResponse])
async def list_orders(
    patient_id: Optional[uuid.UUID] = None,
    pharmacy_id: Optional[uuid.UUID] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).options(selectinload(Order.items))
    if patient_id:
        query = query.where(Order.patient_account_id == patient_id)
    if pharmacy_id:
        query = query.where(Order.pharmacy_tenant_id == pharmacy_id)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/escrow", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_escrow_order(
    order_in: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    order_id = uuid.uuid4()
    order_number = f"MED-ORD-{datetime.now().year}-{random.randint(10000, 99999)}"
    paystack_ref = f"pstk_{uuid.uuid4().hex[:16]}"

    total_amount = Decimal("0.00")
    order_items = []

    for item_in in order_in.items:
        inv_res = await db.execute(
            select(PharmacyInventory).where(PharmacyInventory.id == item_in.inventory_id)
        )
        inv = inv_res.scalars().first()
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {item_in.inventory_id} not found.",
            )

        if inv.quantity_available < item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory stock for SKU {inv.sku}.",
            )

        subtotal = Decimal(str(inv.unit_price)) * item_in.quantity
        total_amount += subtotal

        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=order_id,
            inventory_id=item_in.inventory_id,
            quantity=item_in.quantity,
            unit_price=inv.unit_price,
            subtotal=subtotal,
        )
        order_items.append(order_item)

    # 1.5% Escrow platform protection fee
    escrow_fee = round(total_amount * Decimal("0.015"), 2)
    delivery_fee = Decimal("15.00") if order_in.fulfillment_type.value == "DELIVERY" else Decimal("0.00")
    final_total = total_amount + escrow_fee + delivery_fee

    order = Order(
        id=order_id,
        order_number=order_number,
        patient_account_id=order_in.patient_account_id,
        pharmacy_tenant_id=order_in.pharmacy_tenant_id,
        prescription_id=order_in.prescription_id,
        escrow_status=EscrowStatus.HELD,
        payment_status=PaymentStatus.PAID,  # Simulated paid status
        fulfillment_type=order_in.fulfillment_type,
        paystack_reference=paystack_ref,
        delivery_address=order_in.delivery_address,
        delivery_latitude=order_in.delivery_latitude,
        delivery_longitude=order_in.delivery_longitude,
        total_amount=final_total,
        escrow_fee=escrow_fee,
        delivery_fee=delivery_fee,
    )
    db.add(order)
    for oi in order_items:
        db.add(oi)

    await db.commit()

    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalars().first()
