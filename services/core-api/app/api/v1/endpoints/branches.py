from datetime import datetime, timezone
import random
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.entitlements import (
    get_tenant_plan_details,
    require_feature_flag,
    verify_branch_limit,
)
from app.models.branch import (
    BranchType,
    FacilityBranch,
    IBTStatus,
    InterBranchTransfer,
    InterBranchTransferItem,
)
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.branch import (
    CreateBranchRequest,
    FacilityBranchResponse,
    IBTDispatchPayload,
    InterBranchTransferItemSchema,
    InterBranchTransferResponse,
    ReceiveIBTPayload,
    TenantEntitlementsResponse,
    UpdateBranchRequest,
)

router = APIRouter()


# ============================================================================
# 1. Tenant Entitlements & Subscription Plan Overview
# ============================================================================

@router.get("/entitlements", response_model=TenantEntitlementsResponse)
async def get_tenant_entitlements_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the active tenant subscription plan, feature flags, active seat count vs limit,
    and active branch count vs limit.
    """
    tenant_id = current_user.tenant_id
    if not tenant_id:
        # Fallback for platform super-admin or demo
        tenant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

    plan_details = await get_tenant_plan_details(tenant_id, db)

    # Active seats
    seat_res = await db.execute(
        select(func.count(User.id)).where(
            (User.tenant_id == tenant_id) & (User.is_active == True)
        )
    )
    active_seats = seat_res.scalar_one() or 1

    # Active branches
    branch_res = await db.execute(
        select(func.count(FacilityBranch.id)).where(
            (FacilityBranch.tenant_id == tenant_id) & (FacilityBranch.is_active == True)
        )
    )
    active_branches = branch_res.scalar_one() or 1

    return TenantEntitlementsResponse(
        tenant_id=str(tenant_id),
        plan_code=plan_details["plan_code"],
        plan_name=plan_details["plan_name"],
        tier=plan_details["tier"],
        feature_flags=plan_details["feature_flags"],
        limits=plan_details["limits"],
        active_seats=active_seats,
        active_branches=active_branches,
    )


# ============================================================================
# 2. Facility Branch CRUD & Quota Barrier
# ============================================================================

@router.get("", response_model=List[FacilityBranchResponse])
async def list_facility_branches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all active facility branches for the current tenant.
    Auto-provisions the primary Main Hub branch if none exist.
    """
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = (
        select(FacilityBranch)
        .where(FacilityBranch.tenant_id == tenant_id)
        .order_by(FacilityBranch.is_main_hub.desc(), FacilityBranch.name.asc())
    )
    res = await db.execute(stmt)
    branches = res.scalars().all()

    # Auto-provision default primary hub if no branches found in database
    if not branches:
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_res.scalars().first()
        tenant_name = tenant.name if tenant else "Primary Medical Hub"

        main_branch = FacilityBranch(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=f"{tenant_name} (Main Hub)",
            code="MAIN-01",
            branch_type=BranchType.MAIN_HUB,
            phone="+233302000111",
            email="main.hub@ridgehospital.health",
            address="Castle Road, Ridge",
            city="Accra",
            is_main_hub=True,
            is_active=True,
        )
        db.add(main_branch)
        await db.commit()
        await db.refresh(main_branch)
        return [main_branch]

    return branches


@router.post("", response_model=FacilityBranchResponse, status_code=status.HTTP_201_CREATED)
async def create_facility_branch(
    req: CreateBranchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new branch for the tenant.
    Enforces subscription tier branch limit (Starter: 1, Growth: 3, Enterprise: Unlimited).
    """
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    # Enforce Branch Quota Barrier
    await verify_branch_limit(tenant_id, db)

    # Validate duplicate branch code within tenant
    code_stmt = select(FacilityBranch).where(
        (FacilityBranch.tenant_id == tenant_id) & (FacilityBranch.code == req.code.strip().upper())
    )
    code_res = await db.execute(code_stmt)
    if code_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch with code '{req.code}' already exists for this facility.",
        )

    branch = FacilityBranch(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=req.name.strip(),
        code=req.code.strip().upper(),
        branch_type=BranchType(req.branch_type.upper()) if hasattr(BranchType, req.branch_type.upper()) else BranchType.CLINIC,
        phone=req.phone,
        email=req.email,
        address=req.address,
        city=req.city,
        is_main_hub=bool(req.is_main_hub),
        is_active=True,
    )
    db.add(branch)
    await db.commit()
    await db.refresh(branch)

    return branch


@router.get("/{branch_id}", response_model=FacilityBranchResponse)
async def get_facility_branch_detail(
    branch_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single branch details."""
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = select(FacilityBranch).where(
        (FacilityBranch.id == branch_id) & (FacilityBranch.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    branch = res.scalars().first()

    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    return branch


@router.put("/{branch_id}", response_model=FacilityBranchResponse)
async def update_facility_branch(
    branch_id: uuid.UUID,
    req: UpdateBranchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update branch details."""
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = select(FacilityBranch).where(
        (FacilityBranch.id == branch_id) & (FacilityBranch.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    branch = res.scalars().first()

    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    if req.name is not None:
        branch.name = req.name.strip()
    if req.phone is not None:
        branch.phone = req.phone
    if req.email is not None:
        branch.email = req.email
    if req.address is not None:
        branch.address = req.address
    if req.city is not None:
        branch.city = req.city
    if req.is_active is not None:
        branch.is_active = req.is_active

    await db.commit()
    await db.refresh(branch)
    return branch


# ============================================================================
# 3. Inter-Branch Stock Transfers (IBT) - Enterprise Guarded
# ============================================================================

@router.get("/ibt/list", response_model=List[InterBranchTransferResponse])
async def list_ibt_transfers(
    branch_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _entitlement: bool = Depends(require_feature_flag("MULTIBRANCH_IBT")),
):
    """
    Lists Inter-Branch Transfers for the tenant.
    Guarded by 'MULTIBRANCH_IBT' subscription entitlement.
    """
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = (
        select(InterBranchTransfer)
        .options(
            selectinload(InterBranchTransfer.items),
            selectinload(InterBranchTransfer.source_branch),
            selectinload(InterBranchTransfer.destination_branch),
        )
        .where(InterBranchTransfer.tenant_id == tenant_id)
        .order_by(InterBranchTransfer.created_at.desc())
    )

    if branch_id:
        stmt = stmt.where(
            (InterBranchTransfer.source_branch_id == branch_id)
            | (InterBranchTransfer.destination_branch_id == branch_id)
        )

    if status_filter:
        stmt = stmt.where(InterBranchTransfer.status == status_filter.upper())

    res = await db.execute(stmt)
    transfers = res.scalars().all()

    output: List[InterBranchTransferResponse] = []
    for t in transfers:
        output.append(
            InterBranchTransferResponse(
                id=t.id,
                tenant_id=t.tenant_id,
                transfer_number=t.transfer_number,
                source_branch_id=t.source_branch_id,
                destination_branch_id=t.destination_branch_id,
                source_branch_name=t.source_branch.name if t.source_branch else "Source Hub",
                destination_branch_name=t.destination_branch.name if t.destination_branch else "Destination Branch",
                status=t.status.value if hasattr(t.status, "value") else str(t.status),
                dispatched_by_user_id=t.dispatched_by_user_id,
                received_by_user_id=t.received_by_user_id,
                dispatched_at=t.dispatched_at,
                received_at=t.received_at,
                driver_courier_name=t.driver_courier_name,
                driver_courier_phone=t.driver_courier_phone,
                notes=t.notes,
                items=[
                    InterBranchTransferItemSchema(
                        id=i.id,
                        global_medication_id=i.global_medication_id,
                        medication_name=i.medication_name,
                        sku=i.sku,
                        batch_number=i.batch_number,
                        expiry_date=i.expiry_date,
                        quantity_dispatched=i.quantity_dispatched,
                        quantity_received=i.quantity_received,
                        unit_cost=i.unit_cost,
                        notes=i.notes,
                    )
                    for i in t.items
                ],
            )
        )

    return output


@router.post("/ibt", response_model=InterBranchTransferResponse, status_code=status.HTTP_201_CREATED)
async def dispatch_ibt_transfer(
    payload: IBTDispatchPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _entitlement: bool = Depends(require_feature_flag("MULTIBRANCH_IBT")),
):
    """
    Dispatches a new Inter-Branch Stock Transfer with line items.
    Guarded by 'MULTIBRANCH_IBT' subscription entitlement.
    """
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    if payload.source_branch_id == payload.destination_branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination branches cannot be the same.",
        )

    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one inventory line item is required for an Inter-Branch Transfer.",
        )

    # Generate sequential transfer number (e.g. IBT-2026-8492)
    transfer_number = f"IBT-{datetime.now().year}-{random.randint(1000, 9999)}"

    ibt = InterBranchTransfer(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        transfer_number=transfer_number,
        source_branch_id=payload.source_branch_id,
        destination_branch_id=payload.destination_branch_id,
        status=IBTStatus.DISPATCHED,
        dispatched_by_user_id=current_user.id,
        dispatched_at=datetime.now(timezone.utc),
        driver_courier_name=payload.driver_courier_name,
        driver_courier_phone=payload.driver_courier_phone,
        notes=payload.notes,
    )
    db.add(ibt)
    await db.flush()

    for item in payload.items:
        ibt_item = InterBranchTransferItem(
            id=uuid.uuid4(),
            transfer_id=ibt.id,
            global_medication_id=item.global_medication_id,
            medication_name=item.medication_name,
            sku=item.sku,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            quantity_dispatched=item.quantity_dispatched,
            quantity_received=0,
            unit_cost=item.unit_cost or 0,
            notes=item.notes,
        )
        db.add(ibt_item)

    await db.commit()

    # Refetch with relationships
    stmt = (
        select(InterBranchTransfer)
        .options(
            selectinload(InterBranchTransfer.items),
            selectinload(InterBranchTransfer.source_branch),
            selectinload(InterBranchTransfer.destination_branch),
        )
        .where(InterBranchTransfer.id == ibt.id)
    )
    res = await db.execute(stmt)
    full_ibt = res.scalars().first()

    return InterBranchTransferResponse(
        id=full_ibt.id,
        tenant_id=full_ibt.tenant_id,
        transfer_number=full_ibt.transfer_number,
        source_branch_id=full_ibt.source_branch_id,
        destination_branch_id=full_ibt.destination_branch_id,
        source_branch_name=full_ibt.source_branch.name if full_ibt.source_branch else "Source Hub",
        destination_branch_name=full_ibt.destination_branch.name if full_ibt.destination_branch else "Destination Branch",
        status=full_ibt.status.value if hasattr(full_ibt.status, "value") else str(full_ibt.status),
        dispatched_by_user_id=full_ibt.dispatched_by_user_id,
        dispatched_at=full_ibt.dispatched_at,
        driver_courier_name=full_ibt.driver_courier_name,
        driver_courier_phone=full_ibt.driver_courier_phone,
        notes=full_ibt.notes,
        items=[
            InterBranchTransferItemSchema(
                id=i.id,
                global_medication_id=i.global_medication_id,
                medication_name=i.medication_name,
                sku=i.sku,
                batch_number=i.batch_number,
                expiry_date=i.expiry_date,
                quantity_dispatched=i.quantity_dispatched,
                quantity_received=i.quantity_received,
                unit_cost=i.unit_cost,
                notes=i.notes,
            )
            for i in full_ibt.items
        ],
    )


@router.get("/ibt/{transfer_id}", response_model=InterBranchTransferResponse)
async def get_ibt_transfer_detail(
    transfer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _entitlement: bool = Depends(require_feature_flag("MULTIBRANCH_IBT")),
):
    """Get single IBT transfer record."""
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = (
        select(InterBranchTransfer)
        .options(
            selectinload(InterBranchTransfer.items),
            selectinload(InterBranchTransfer.source_branch),
            selectinload(InterBranchTransfer.destination_branch),
        )
        .where(
            (InterBranchTransfer.id == transfer_id)
            & (InterBranchTransfer.tenant_id == tenant_id)
        )
    )
    res = await db.execute(stmt)
    ibt = res.scalars().first()

    if not ibt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found.")

    return InterBranchTransferResponse(
        id=ibt.id,
        tenant_id=ibt.tenant_id,
        transfer_number=ibt.transfer_number,
        source_branch_id=ibt.source_branch_id,
        destination_branch_id=ibt.destination_branch_id,
        source_branch_name=ibt.source_branch.name if ibt.source_branch else "Source Hub",
        destination_branch_name=ibt.destination_branch.name if ibt.destination_branch else "Destination Branch",
        status=ibt.status.value if hasattr(ibt.status, "value") else str(ibt.status),
        dispatched_by_user_id=ibt.dispatched_by_user_id,
        received_by_user_id=ibt.received_by_user_id,
        dispatched_at=ibt.dispatched_at,
        received_at=ibt.received_at,
        driver_courier_name=ibt.driver_courier_name,
        driver_courier_phone=ibt.driver_courier_phone,
        notes=ibt.notes,
        items=[
            InterBranchTransferItemSchema(
                id=i.id,
                global_medication_id=i.global_medication_id,
                medication_name=i.medication_name,
                sku=i.sku,
                batch_number=i.batch_number,
                expiry_date=i.expiry_date,
                quantity_dispatched=i.quantity_dispatched,
                quantity_received=i.quantity_received,
                unit_cost=i.unit_cost,
                notes=i.notes,
            )
            for i in ibt.items
        ],
    )


@router.post("/ibt/{transfer_id}/receive", response_model=InterBranchTransferResponse)
async def receive_ibt_transfer(
    transfer_id: uuid.UUID,
    payload: Optional[ReceiveIBTPayload] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _entitlement: bool = Depends(require_feature_flag("MULTIBRANCH_IBT")),
):
    """
    Accepts an incoming Inter-Branch Transfer, reconciles quantities, and sets status to RECEIVED.
    Guarded by 'MULTIBRANCH_IBT' subscription entitlement.
    """
    tenant_id = current_user.tenant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")

    stmt = (
        select(InterBranchTransfer)
        .options(
            selectinload(InterBranchTransfer.items),
            selectinload(InterBranchTransfer.source_branch),
            selectinload(InterBranchTransfer.destination_branch),
        )
        .where(
            (InterBranchTransfer.id == transfer_id)
            & (InterBranchTransfer.tenant_id == tenant_id)
        )
    )
    res = await db.execute(stmt)
    ibt = res.scalars().first()

    if not ibt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found.")

    if ibt.status == IBTStatus.RECEIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer has already been accepted and marked as RECEIVED.",
        )

    # Reconcile items
    for item in ibt.items:
        # Default all dispatched to received unless custom receipt amounts specified
        item.quantity_received = item.quantity_dispatched

    ibt.status = IBTStatus.RECEIVED
    ibt.received_by_user_id = current_user.id
    ibt.received_at = datetime.now(timezone.utc)
    if payload and payload.notes:
        ibt.notes = (ibt.notes or "") + f" [Receipt Note: {payload.notes}]"

    await db.commit()
    await db.refresh(ibt)

    return InterBranchTransferResponse(
        id=ibt.id,
        tenant_id=ibt.tenant_id,
        transfer_number=ibt.transfer_number,
        source_branch_id=ibt.source_branch_id,
        destination_branch_id=ibt.destination_branch_id,
        source_branch_name=ibt.source_branch.name if ibt.source_branch else "Source Hub",
        destination_branch_name=ibt.destination_branch.name if ibt.destination_branch else "Destination Branch",
        status=ibt.status.value if hasattr(ibt.status, "value") else str(ibt.status),
        dispatched_by_user_id=ibt.dispatched_by_user_id,
        received_by_user_id=ibt.received_by_user_id,
        dispatched_at=ibt.dispatched_at,
        received_at=ibt.received_at,
        driver_courier_name=ibt.driver_courier_name,
        driver_courier_phone=ibt.driver_courier_phone,
        notes=ibt.notes,
        items=[
            InterBranchTransferItemSchema(
                id=i.id,
                global_medication_id=i.global_medication_id,
                medication_name=i.medication_name,
                sku=i.sku,
                batch_number=i.batch_number,
                expiry_date=i.expiry_date,
                quantity_dispatched=i.quantity_dispatched,
                quantity_received=i.quantity_received,
                unit_cost=i.unit_cost,
                notes=i.notes,
            )
            for i in ibt.items
        ],
    )
