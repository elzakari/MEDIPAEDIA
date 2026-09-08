from datetime import datetime
import json
from typing import Any, Callable, Iterable, List, Optional, Set, Union
import uuid
from fastapi import Cookie, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.database import get_db
from app.core.redis_session import is_token_revoked
from app.core.security import decode_token
from app.models.patient import HospitalPatientCard, PatientAccount
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole, normalize_roles_list


RoleSpec = Union[UserRole, str]


def _resolve_role_value(r: RoleSpec) -> str:
    if isinstance(r, UserRole):
        return r.value
    return str(r)


def _user_role_strings(user: User) -> Set[str]:
    normalized = normalize_roles_list(getattr(user, "normalized_roles", None) or [])
    if normalized:
        return set(normalized)
    fallback_role = getattr(user, "role", None)
    if fallback_role is not None:
        if isinstance(fallback_role, UserRole):
            return {fallback_role.value}
        return {str(fallback_role)}
    return set()


def user_has_any_role(user: User, *expected_roles: RoleSpec) -> bool:
    expected = {_resolve_role_value(r) for r in expected_roles}
    user_roles = _user_role_strings(user)
    if UserRole.SUPER_ADMIN.value in user_roles and UserRole.SUPER_ADMIN.value in {_resolve_role_value(r) for r in expected_roles}:
        return True
    if UserRole.SUPER_ADMIN.value in user_roles:
        return True
    return bool(user_roles & expected)


def user_has_role_exact(user: User, role: RoleSpec) -> bool:
    expected = _resolve_role_value(role)
    return expected in _user_role_strings(user)

# Standard OAuth2 bearer token extractor
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(None, alias="access_token"),
) -> User:
    """
    Extracts and validates the JWT Bearer access token from Authorization header or Cookie.
    Validates token revocation status against Redis denylist before fetching User.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or authentication token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    effective_token = token or access_token_cookie

    if not effective_token:
        raise credentials_exception

    # Check if token is actively blacklisted in Redis / Memory denylist
    if await is_token_revoked(effective_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or logged out. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = None
    try:
        payload = decode_token(effective_token)
        user_id_str = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if user_id_str is None or token_type != "access":
            raise credentials_exception
    except Exception:
        raise credentials_exception

    # Resolve UUID representation
    try:
        user_id = uuid.UUID(str(user_id_str))
    except Exception:
        raise credentials_exception

    # Fetch user from database with eagerly-loaded relationships to avoid greenlet deadlocks
    user = None
    if db is not None:
        try:
            from sqlalchemy.orm import selectinload
            stmt = (
                select(User)
                .options(
                    selectinload(User.tenant),
                    selectinload(User.patient_profile).selectinload(
                        PatientAccount.hospital_cards
                    ),
                )
                .where(User.id == user_id)
            )
            result = await db.execute(stmt)
            user = result.scalars().first()
        except Exception:
            user = None

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact system administrator.",
        )

    return user


async def get_current_active_tenant(
    current_user: User = Depends(get_current_user),
    x_facility_id: Optional[str] = Header(None, alias="X-Facility-ID"),
    db: AsyncSession = Depends(get_db),
) -> Optional[Tenant]:
    """
    Resolves the active tenant context for the request.
    For staff users, tenant_id is statically pinned from their user record.
    For patients holding cards across multiple hospitals, X-Facility-ID header resolves the active tenant.
    """
    if current_user.tenant_id:
        result = await db.execute(
            select(Tenant).where(
                Tenant.id == current_user.tenant_id, Tenant.is_active == True
            )
        )
        tenant = result.scalars().first()
        return tenant

    if x_facility_id:
        try:
            facility_uuid = uuid.UUID(x_facility_id)
            result = await db.execute(
                select(Tenant).where(
                    Tenant.id == facility_uuid, Tenant.is_active == True
                )
            )
            tenant = result.scalars().first()
            return tenant
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Facility-ID header format.",
            )

    return None


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    """
    Extracts user if valid token present, returns None if unauthenticated without throwing 401.
    """
    if not token:
        return None
    try:
        return await get_current_user(db=db, token=token)
    except Exception:
        return None


async def get_optional_tenant(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_facility_id: Optional[str] = Header(None, alias="X-Facility-ID"),
    db: AsyncSession = Depends(get_db),
) -> Optional[Tenant]:
    """
    Resolves tenant context optionally, falling back to default accredited facility if unauthenticated (e.g. public TV displays).
    """
    if current_user and current_user.tenant_id:
        result = await db.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id, Tenant.is_active == True)
        )
        tenant = result.scalars().first()
        if tenant:
            return tenant

    if x_facility_id:
        try:
            facility_uuid = uuid.UUID(x_facility_id)
            result = await db.execute(
                select(Tenant).where(Tenant.id == facility_uuid, Tenant.is_active == True)
            )
            tenant = result.scalars().first()
            if tenant:
                return tenant
        except Exception:
            pass

    return None


# Alias for backward compatibility across clinical and payment routers
get_current_tenant = get_current_active_tenant


def require_roles(*allowed_roles: RoleSpec) -> Callable:
    """
    RBAC dependency factory that validates the authenticated user's roles against allowed roles.
    Uses list-intersection semantics: grants if user.roles ∩ allowed_roles is non-empty, OR user holds SUPER_ADMIN.
    """
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        allowed_values = {_resolve_role_value(r) for r in allowed_roles}
        user_role_set = _user_role_strings(current_user)
        if UserRole.SUPER_ADMIN.value not in user_role_set and not (user_role_set & allowed_values):
            role_names = ", ".join(sorted(allowed_values))
            current_roles = ", ".join(sorted(user_role_set)) or "<none>"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required one of: [{role_names}]. Current roles: [{current_roles}].",
            )
        return current_user

    return role_checker


require_any_role = require_roles


async def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Enforces that the current user is strictly a platform SUPER_ADMIN.
    Grants access exclusively to platform governance endpoints.
    """
    if not user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
        current_roles = ", ".join(sorted(_user_role_strings(current_user))) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Platform governance privilege required. Only SUPER_ADMIN accounts can perform this action. Current roles: [{current_roles}].",
        )
    return current_user


def require_hospital_role(*allowed_roles: RoleSpec) -> Callable:
    """
    Granular Hospital RBAC dependency:
    Validates that the user has one of the allowed hospital roles AND belongs to an active HOSPITAL/CLINIC tenant.
    SUPER_ADMIN is granted platform-wide oversight where applicable.
    """
    async def hospital_role_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
            return current_user

        effective_allowed = {_resolve_role_value(r) for r in allowed_roles}
        if UserRole.HOSPITAL_ADMIN.value in effective_allowed:
            effective_allowed.add(UserRole.TENANT_ADMIN.value)

        user_role_set = _user_role_strings(current_user)
        if not (user_role_set & effective_allowed):
            allowed_str = ", ".join(sorted({_resolve_role_value(r) for r in allowed_roles}))
            current_roles = ", ".join(sorted(user_role_set)) or "<none>"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Hospital access denied. Required one of: [{allowed_str}]. Current roles: [{current_roles}].",
            )

        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff member is not assigned to an active hospital facility.",
            )

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = tenant_res.scalars().first()
        if not tenant or tenant.tenant_type not in [TenantType.HOSPITAL, TenantType.CLINIC]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account does not belong to an accredited Hospital or Clinic facility.",
            )

        return current_user

    return hospital_role_checker


def require_pharmacy_role(*allowed_roles: RoleSpec) -> Callable:
    """
    Granular Pharmacy RBAC dependency:
    Validates that the user has one of the allowed pharmacy roles AND belongs to an active PHARMACY tenant.
    """
    async def pharmacy_role_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
            return current_user

        effective_allowed = {_resolve_role_value(r) for r in allowed_roles}
        if UserRole.PHARMACY_ADMIN.value in effective_allowed:
            effective_allowed.add(UserRole.TENANT_ADMIN.value)

        user_role_set = _user_role_strings(current_user)
        if not (user_role_set & effective_allowed):
            allowed_str = ", ".join(sorted({_resolve_role_value(r) for r in allowed_roles}))
            current_roles = ", ".join(sorted(user_role_set)) or "<none>"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Pharmacy access denied. Required one of: [{allowed_str}]. Current roles: [{current_roles}].",
            )

        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff member is not assigned to an active pharmacy dispensary.",
            )

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = tenant_res.scalars().first()
        if not tenant or tenant.tenant_type != TenantType.PHARMACY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account does not belong to an accredited Community Pharmacy tenant.",
            )

        return current_user

    return pharmacy_role_checker


async def require_hospital_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Enforces that the user is either a HOSPITAL_ADMIN / TENANT_ADMIN of a HOSPITAL/CLINIC or SUPER_ADMIN.
    """
    checker = require_hospital_role(UserRole.HOSPITAL_ADMIN, UserRole.TENANT_ADMIN)
    return await checker(current_user=current_user, db=db)


async def require_pharmacy_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Enforces that the user is a PHARMACY_ADMIN / TENANT_ADMIN of a PHARMACY or SUPER_ADMIN.
    Uses roles-list intersection so dual-hat HOSPITAL_ADMIN + PHARMACY_ADMIN is also granted.
    """
    if not user_has_any_role(current_user, UserRole.PHARMACY_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN):
        current_roles = ", ".join(sorted(_user_role_strings(current_user))) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Pharmacy admin privilege required. Current roles: [{current_roles}] are unauthorized.",
        )
    return current_user


async def require_superintendent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Regulatory Authority Check (Act 857):
    Enforces that the user holds SUPERINTENDENT_PHARMACIST (explicit check, no SUPER_ADMIN auto-grant since regulatory).
    """
    if not user_has_role_exact(current_user, UserRole.SUPERINTENDENT_PHARMACIST):
        current_roles = ", ".join(sorted(_user_role_strings(current_user))) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Superintendent Pharmacist regulatory authorization required. Current roles: [{current_roles}] are unauthorized.",
        )
    return current_user


require_superintendent_pharmacist = require_superintendent


async def require_pharmacy_finance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Financial Governance Check:
    Enforces that the user holds PHARMACY_FINANCE or SUPER_ADMIN via roles list.
    """
    if not user_has_any_role(current_user, UserRole.PHARMACY_FINANCE, UserRole.SUPER_ADMIN):
        current_roles = ", ".join(sorted(_user_role_strings(current_user))) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Pharmacy finance & settlement privilege required. Current roles: [{current_roles}] are unauthorized.",
        )
    return current_user


async def require_dispenser(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Clinical Dispensing & FEFO Check:
    Enforces that the user holds PHARMACIST or SUPERINTENDENT_PHARMACIST via roles list.
    """
    if not user_has_any_role(current_user, UserRole.PHARMACIST, UserRole.SUPERINTENDENT_PHARMACIST):
        current_roles = ", ".join(sorted(_user_role_strings(current_user))) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Prescription dispensing & FEFO privilege required. Current roles: [{current_roles}] are unauthorized.",
        )
    return current_user


require_pharmacist = require_dispenser


async def require_clinical_staff(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Zero-PHI Governance Rule:
    Strictly forbids platform SUPER_ADMIN, HOSPITAL_FINANCE, and PHARMACY_FINANCE
    from querying patient clinical consultation records, diagnoses, or SOAP notes.
    Only licensed DOCTOR or NURSE practitioners can inspect clinical encounter records.
    Roles-list aware: blocks any user who carries SUPER_ADMIN, HOSPITAL_FINANCE, or PHARMACY_FINANCE hats even if dual-hat.
    """
    user_role_set = _user_role_strings(current_user)

    if UserRole.SUPER_ADMIN.value in user_role_set:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Zero-PHI Privacy Violation: Platform Super Admins are strictly prohibited from inspecting patient clinical records and SOAP notes.",
        )

    finance_hats = {UserRole.HOSPITAL_FINANCE.value, UserRole.PHARMACY_FINANCE.value}
    if user_role_set & finance_hats:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Zero-PHI Financial Isolation: Financial and cashier accounts are strictly restricted from inspecting clinical consultation notes and diagnoses.",
        )

    clinical_hats = {UserRole.DOCTOR.value, UserRole.NURSE.value}
    if not (user_role_set & clinical_hats):
        current_roles = ", ".join(sorted(user_role_set)) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Clinical encounter access denied. Roles [{current_roles}] are not authorized to inspect clinical records. Requires DOCTOR or NURSE.",
        )

    return current_user


async def require_zero_phi_financial_role(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Enforces that clinical doctors and nurses cannot tamper with cash registers or settlement ledgers,
    while permitting authorized finance and facility admin personnel.
    Roles-list aware: blocks any user who carries DOCTOR or NURSE hats even if dual-hat finance.
    """
    user_role_set = _user_role_strings(current_user)
    clinical_hats = {UserRole.DOCTOR.value, UserRole.NURSE.value}

    if user_role_set & clinical_hats:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinical separation: Clinical practitioners (Doctors/Nurses) cannot directly modify or audit financial accounting registers.",
        )

    allowed = [
        UserRole.HOSPITAL_FINANCE,
        UserRole.PHARMACY_FINANCE,
        UserRole.HOSPITAL_ADMIN,
        UserRole.PHARMACY_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.SUPER_ADMIN,
    ]
    if not user_has_any_role(current_user, *allowed):
        current_roles = ", ".join(sorted(user_role_set)) or "<none>"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Financial register access denied. Roles [{current_roles}] are unauthorized.",
        )

    return current_user
