import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import (
    get_current_active_tenant,
    get_current_user,
    require_any_role,
    user_has_any_role,
    user_has_role_exact,
    _user_role_strings,
)
from app.core.security import get_password_hash
from app.models.audit import AuditLog
from app.models.tenant import Tenant
from app.models.user import User, UserRole, normalize_roles_list
from app.schemas.user import (
    AdminUserCreateRequest,
    AdminUserDeleteResponse,
    AdminUserListResponse,
    AdminUserPatchRequest,
    UserResponse,
)

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin User Management (Tenant-Scoped)"],
    dependencies=[Depends(require_any_role(
        UserRole.HOSPITAL_ADMIN,
        UserRole.PHARMACY_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.SUPER_ADMIN,
    ))],
)


# ============================================================================
# Internal helpers
# ============================================================================

async def _assert_actor_can_grant_roles(actor: User, proposed_roles: List[str]) -> None:
    """Only SUPER_ADMIN can grant the SUPER_ADMIN hat."""
    normalized = normalize_roles_list(proposed_roles or [])
    if UserRole.SUPER_ADMIN.value in normalized and not user_has_role_exact(actor, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role grant violation: Only Platform SUPER_ADMIN accounts can issue SUPER_ADMIN privileges.",
        )


async def _resolve_target_tenant(
    current_user: User,
    explicit_tenant: Optional[Tenant],
    db: AsyncSession,
) -> Optional[Tenant]:
    """For SUPER_ADMIN callers, allow explicit tenant override via header; otherwise use user.tenant_id."""
    if user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
        if explicit_tenant is not None:
            return explicit_tenant
        if current_user.tenant_id:
            res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
            return res.scalars().first()
        return None
    if current_user.tenant_id:
        res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        return res.scalars().first()
    return None


async def _write_admin_audit(
    db: AsyncSession,
    actor: User,
    tenant_id: Optional[uuid.UUID],
    action: str,
    target_user_id: uuid.UUID,
    changes: dict,
) -> None:
    actor_roles = _user_role_strings(actor)
    actor_role = actor.primary_role or (sorted(actor_roles)[0] if actor_roles else None)
    audit = AuditLog(
        tenant_id=tenant_id,
        actor_id=actor.id,
        actor_role=actor_role,
        action=action,
        resource_type="USER",
        resource_id=str(target_user_id),
        changes_json=changes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)


# ============================================================================
# 1. GET /api/v1/admin/users — list, search, paginate, role-filter
# ============================================================================

@router.get("", response_model=AdminUserListResponse)
async def list_facility_users(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(25, ge=1, le=200, description="Rows per page"),
    search: Optional[str] = Query(None, min_length=2, max_length=100, description="Fuzzy match on name, email, phone, license"),
    role_filter: Optional[str] = Query(None, description="Single role hat to filter by (e.g. DOCTOR)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_active_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_target_tenant(current_user, current_tenant, db)
    tenant_id = tenant.id if tenant else (current_user.tenant_id if not user_has_role_exact(current_user, UserRole.SUPER_ADMIN) else None)

    conditions = []
    if tenant_id is not None:
        conditions.append(User.tenant_id == tenant_id)
    elif not user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=400, detail="Tenant context missing for user listing.")

    if search:
        like = f"%{search.strip().lower()}%"
        conditions.append(or_(
            func.lower(User.full_name).like(like),
            func.lower(User.email).like(like),
            func.lower(func.coalesce(User.phone, '')).like(like),
            func.lower(func.coalesce(User.license_number, '')).like(like),
        ))

    if role_filter:
        normalized_filter = normalize_roles_list([role_filter])
        if normalized_filter:
            rf = normalized_filter[0]
            conditions.append(or_(
                func.array_position(User.roles, rf).isnot(None),
                User.role == rf,
            ))

    if is_active is not None:
        conditions.append(User.is_active == is_active)

    where = and_(*conditions) if conditions else True

    count_stmt = select(func.count()).select_from(User).where(where)
    total_res = await db.execute(count_stmt)
    total = int(total_res.scalar() or 0)

    stmt = (
        select(User)
        .where(where)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    items = [UserResponse.model_validate(u) for u in res.scalars().all()]

    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)) if total else 1,
    )


# ============================================================================
# 2. POST /api/v1/admin/users — create scoped user
# ============================================================================

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_facility_user(
    req: AdminUserCreateRequest,
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_active_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_target_tenant(current_user, current_tenant, db)
    tenant_id = tenant.id if tenant else current_user.tenant_id
    if tenant_id is None and not user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=400, detail="Tenant context required to create facility users.")

    await _assert_actor_can_grant_roles(current_user, req.roles or [])

    # (tenant_id, lower(email)) uniqueness pre-check to raise 409 instead of raw IntegrityError
    dup_stmt = select(User).where(
        (func.lower(User.email) == req.email.lower())
        & ((User.tenant_id == tenant_id) if tenant_id is not None else (User.tenant_id.is_(None)))
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "TENANT_EMAIL_NOT_UNIQUE",
                "message": "A staff member with this email already exists in the current facility.",
                "email": req.email,
            },
        )

    final_roles = normalize_roles_list(req.roles or [])
    if req.role is None and final_roles:
        try:
            req.role = UserRole(final_roles[0])
        except ValueError:
            pass

    new_user = User(
        email=req.email,
        full_name=req.full_name,
        phone=req.phone,
        role=req.role,
        roles=final_roles,
        tenant_id=tenant_id,
        hashed_password=get_password_hash(req.password),
        license_number=req.license_number,
        is_active=req.is_active,
        is_verified=True,
    )
    db.add(new_user)
    await db.flush()

    await _write_admin_audit(
        db, current_user, tenant_id,
        action="ADMIN_USER_CREATED",
        target_user_id=new_user.id,
        changes={
            "email": req.email,
            "full_name": req.full_name,
            "roles": final_roles,
            "is_active": req.is_active,
            "license_number": req.license_number,
        },
    )
    await db.commit()
    await db.refresh(new_user)
    return UserResponse.model_validate(new_user)


# ============================================================================
# 3. GET /api/v1/admin/users/{user_id} — retrieve profile + roles
# ============================================================================

@router.get("/{user_id}", response_model=UserResponse)
async def get_facility_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_active_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_target_tenant(current_user, current_tenant, db)
    tenant_id = tenant.id if tenant else current_user.tenant_id

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff profile not found.")

    is_super = user_has_role_exact(current_user, UserRole.SUPER_ADMIN)
    if not is_super and target.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-facility user lookup is restricted to SUPER_ADMIN oversight.",
        )

    return UserResponse.model_validate(target)


# ============================================================================
# 4. PATCH /api/v1/admin/users/{user_id} — update name/roles/is_active/phone/license
# ============================================================================

@router.patch("/{user_id}", response_model=UserResponse)
async def patch_facility_user(
    user_id: uuid.UUID,
    req: AdminUserPatchRequest,
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_active_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_target_tenant(current_user, current_tenant, db)
    tenant_id = tenant.id if tenant else current_user.tenant_id

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff profile not found.")

    is_super = user_has_role_exact(current_user, UserRole.SUPER_ADMIN)
    if not is_super and target.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-facility user modification is restricted to SUPER_ADMIN oversight.",
        )

    changes: dict = {}

    if req.full_name is not None and req.full_name != target.full_name:
        changes["full_name"] = {"before": target.full_name, "after": req.full_name}
        target.full_name = req.full_name

    if req.phone is not None and req.phone != target.phone:
        changes["phone"] = {"before": target.phone, "after": req.phone}
        target.phone = req.phone

    if req.license_number is not None and req.license_number != target.license_number:
        changes["license_number"] = {"before": target.license_number, "after": req.license_number}
        target.license_number = req.license_number

    if req.is_active is not None and req.is_active != target.is_active:
        changes["is_active"] = {"before": target.is_active, "after": req.is_active}
        target.is_active = req.is_active

    if req.roles is not None:
        await _assert_actor_can_grant_roles(current_user, req.roles)
        before_roles = list(target.normalized_roles) if target.normalized_roles else []
        new_roles = normalize_roles_list(req.roles)
        if set(new_roles) != set(before_roles):
            changes["roles"] = {"before": before_roles, "after": new_roles}
            target.roles = new_roles
            if new_roles:
                try:
                    target.role = UserRole(new_roles[0])
                except ValueError:
                    pass
            else:
                target.role = None

    if changes:
        await _write_admin_audit(
            db, current_user, target.tenant_id,
            action="ADMIN_USER_PATCHED",
            target_user_id=target.id,
            changes=changes,
        )
        await db.commit()
        await db.refresh(target)

    return UserResponse.model_validate(target)


# ============================================================================
# 5. DELETE /api/v1/admin/users/{user_id} — soft delete (is_active=false)
# ============================================================================

@router.delete("/{user_id}", response_model=AdminUserDeleteResponse)
async def delete_facility_user(
    user_id: uuid.UUID,
    purge: bool = Query(False, description="If true + SUPER_ADMIN, hard-delete the row. Otherwise soft-disable membership."),
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_active_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_target_tenant(current_user, current_tenant, db)
    tenant_id = tenant.id if tenant else current_user.tenant_id

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff profile not found.")

    is_super = user_has_role_exact(current_user, UserRole.SUPER_ADMIN)
    if not is_super and target.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-facility user removal is restricted to SUPER_ADMIN.",
        )

    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-deletion is not allowed. Ask another administrator to disable your account.",
        )

    action: str
    message: str

    if purge and is_super:
        await db.delete(target)
        action = "PURGED"
        message = "User membership permanently purged from the facility roster."
        changes = {"purged": True, "email": target.email, "last_known_roles": list(target.normalized_roles or [])}
    else:
        if not target.is_active:
            return AdminUserDeleteResponse(
                success=True,
                user_id=target.id,
                action="NOOP",
                message="User membership is already disabled in this facility.",
            )
        target.is_active = False
        action = "SOFT_DISABLED"
        message = "User membership disabled. The staff account can no longer sign in."
        changes = {"is_active": {"before": True, "after": False}, "email": target.email}

    await _write_admin_audit(
        db, current_user, target.tenant_id,
        action="ADMIN_USER_DELETED" if action == "SOFT_DISABLED" else "ADMIN_USER_PURGED",
        target_user_id=target.id,
        changes=changes,
    )
    await db.commit()

    return AdminUserDeleteResponse(
        success=True,
        user_id=user_id,
        action=action,
        message=message,
    )
