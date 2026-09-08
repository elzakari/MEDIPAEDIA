import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status, Request
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, oauth2_scheme, user_has_role_exact
from app.core.config import settings
from app.core.mailer import (
    EmailDispatchResult,
    render_password_reset_email,
    send_system_email,
)
from app.core.redis_session import (
    get_user_sessions,
    revoke_all_user_sessions,
    revoke_token,
)
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_reset_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models.audit import AuditLog
from app.models.patient import HospitalPatientCard, PatientAccount
from app.models.staff_profile import StaffProfile
from app.models.tenant import Tenant, TenantType
from app.models.user import PasswordResetToken, User, UserRole, normalize_roles_list
from app.schemas.auth import (
    AuthMeResponse,
    ChangePasswordRequest,
    FacilitySelectRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LogoutResponse,
    MultiFacilityLoginItem,
    MultiFacilityLoginResponse,
    PatientLoginRequest,
    PatientRegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    StaffLoginRequest,
    TokenPairResponse,
    TokenRefreshRequest,
    UpdateProfileRequest,
    UserSessionItem,
)
from app.schemas.patient import HospitalPatientCardResponse, PatientAccountResponse
from app.schemas.tenant import TenantResponse

logger = logging.getLogger(__name__)

router = APIRouter()

_COOKIE_ACCESS_MAX_AGE: int = int(timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds())
_COOKIE_REFRESH_MAX_AGE: int = int(timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())


def _get_cookie_domain() -> Optional[str]:
    domain = getattr(settings, "SESSION_COOKIE_DOMAIN", None) or None
    if domain is None:
        return None
    domain = str(domain).strip()
    if not domain or domain.lower() in {"none", "null", "localhost", "127.0.0.1", "::1"}:
        return None
    return domain


def _write_session_cookies(response: Response, access_token: str, refresh_token: Optional[str] = None, secure: bool = False) -> None:
    domain = _get_cookie_domain()
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
        max_age=_COOKIE_ACCESS_MAX_AGE,
    )
    if domain is not None:
        try:
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                samesite="lax",
                secure=secure,
                path="/",
                max_age=_COOKIE_ACCESS_MAX_AGE,
                domain=domain,
            )
        except Exception:
            pass
    if refresh_token is not None:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=secure,
            path="/",
            max_age=_COOKIE_REFRESH_MAX_AGE,
        )
        if domain is not None:
            try:
                response.set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    samesite="lax",
                    secure=secure,
                    path="/",
                    max_age=_COOKIE_REFRESH_MAX_AGE,
                    domain=domain,
                )
            except Exception:
                pass


def _clear_session_cookies(response: Response) -> None:
    domain = _get_cookie_domain()
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    if domain is not None:
        try:
            response.delete_cookie(key="access_token", path="/", domain=domain)
            response.delete_cookie(key="refresh_token", path="/", domain=domain)
        except Exception:
            pass


def _normalize_phone_digits(raw: str) -> str:
    return "".join(ch for ch in raw if ch.isdigit())


def _looks_like_email(raw: str) -> bool:
    if "@" not in raw:
        return False
    return "." in raw.split("@", 1)[-1]


async def _resolve_staff_users(identifier: str, db: AsyncSession) -> List[User]:
    """Return every active user row(s) matching identifier (email/phone/license), case-insensitive email, with tenant eagerly loaded."""
    normalized = identifier.strip()
    if not normalized:
        return []
    clauses: Any = [func.lower(User.email) == normalized.lower()] if "@" in normalized else [User.email.ilike(normalized.lower())]
    phone_digits = _normalize_phone_digits(normalized)
    if phone_digits and len(phone_digits) >= 8:
        clauses.append(func.regexp_replace(User.phone, r"[^0-9]", "", "g") == phone_digits)
    if len(normalized) <= 100 and not _looks_like_email(normalized):
        clauses.append(func.upper(User.license_number) == normalized.upper())
    q = (
        select(User)
        .options(selectinload(User.tenant))
        .where(or_(*clauses))
    )
    try:
        result = await db.execute(q)
        users = list(result.scalars().unique().all())
    except Exception:
        return []
    return [u for u in users if u.is_active is True or u.is_active is None]


async def _resolve_staff_user(identifier: str, db: AsyncSession) -> Optional[User]:
    users = await _resolve_staff_users(identifier, db)
    return users[0] if users else None


def compute_default_redirect(role: UserRole, tenant: Optional[Tenant] = None, roles: Optional[List[str]] = None) -> str:
    effective_roles = normalize_roles_list(roles or [])
    has_hospital = any(r in {
        UserRole.SUPER_ADMIN.value, UserRole.HOSPITAL_ADMIN.value, UserRole.TENANT_ADMIN.value,
        UserRole.DOCTOR.value, UserRole.NURSE.value, UserRole.RECORD_CLERK.value,
        UserRole.HOSPITAL_FINANCE.value,
    } for r in effective_roles) or role in {
        UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.TENANT_ADMIN,
        UserRole.DOCTOR, UserRole.NURSE, UserRole.RECORD_CLERK, UserRole.HOSPITAL_FINANCE,
    }
    has_pharmacy = any(r in {
        UserRole.PHARMACY_ADMIN.value, UserRole.PHARMACY_FINANCE.value,
        UserRole.SUPERINTENDENT_PHARMACIST.value, UserRole.PHARMACIST.value,
    } for r in effective_roles) or role in {
        UserRole.PHARMACY_ADMIN, UserRole.PHARMACY_FINANCE,
        UserRole.SUPERINTENDENT_PHARMACIST, UserRole.PHARMACIST,
    }
    if role == UserRole.SUPER_ADMIN or UserRole.SUPER_ADMIN.value in effective_roles:
        return "/super-admin"
    if UserRole.DOCTOR.value in effective_roles or role == UserRole.DOCTOR:
        return "/doctor"
    if UserRole.NURSE.value in effective_roles or role == UserRole.NURSE:
        return "/nurse"
    if UserRole.HOSPITAL_FINANCE.value in effective_roles or role == UserRole.HOSPITAL_FINANCE:
        return "/hospital-finance"
    if UserRole.RECORD_CLERK.value in effective_roles or role == UserRole.RECORD_CLERK:
        return "/reception"
    if UserRole.SUPERINTENDENT_PHARMACIST.value in effective_roles or role == UserRole.SUPERINTENDENT_PHARMACIST:
        return "/superintendent"
    if UserRole.PHARMACIST.value in effective_roles or role == UserRole.PHARMACIST:
        return "/dispensary"
    if UserRole.PHARMACY_FINANCE.value in effective_roles or role == UserRole.PHARMACY_FINANCE:
        return "/pharmacy-finance"
    if UserRole.PHARMACY_ADMIN.value in effective_roles or role == UserRole.PHARMACY_ADMIN:
        return "/pharmacy-admin"
    if role in {UserRole.HOSPITAL_ADMIN, UserRole.TENANT_ADMIN} or any(r in {UserRole.HOSPITAL_ADMIN.value, UserRole.TENANT_ADMIN.value} for r in effective_roles):
        if tenant and tenant.tenant_type == TenantType.PHARMACY:
            return "/pharmacy-admin"
        return "/hospital-admin"
    if role == UserRole.PATIENT or UserRole.PATIENT.value in effective_roles:
        return "/dashboard"
    # Fall back: prefer hospital if any-hospital role present, else pharmacy if any-pharmacy else /
    if has_hospital:
        return "/hospital-admin"
    if has_pharmacy:
        return "/pharmacy-admin"
    return "/"


DEMO_STAFF_ACCOUNTS = {
    "admin@medipaedia.health": {
        "user_id": "usr-super-admin-01",
        "full_name": "National System Administrator",
        "role": UserRole.SUPER_ADMIN,
        "tenant_id": None,
        "tenant_name": "National Health Grid",
        "tenant_slug": None,
        "tenant_type": None,
    },
    "super.admin@medipaedia.health": {
        "user_id": "usr-super-admin-01",
        "full_name": "National System Administrator",
        "role": UserRole.SUPER_ADMIN,
        "tenant_id": None,
        "tenant_name": "National Health Grid",
        "tenant_slug": None,
        "tenant_type": None,
    },
    "admin.ridge@ridgehospital.health": {
        "user_id": "usr-hosp-admin-01",
        "full_name": "Dr. Afia Appiah (Medical Director & Administrator)",
        "role": UserRole.HOSPITAL_ADMIN,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "doctor.afia@ridgehospital.health": {
        "user_id": "usr-doctor-01",
        "full_name": "Dr. Afia Appiah (Senior Clinical Specialist)",
        "role": UserRole.DOCTOR,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "nurse.grace@ridgehospital.health": {
        "user_id": "usr-nurse-01",
        "full_name": "Grace Ofori, RN (Emergency Triage Lead)",
        "role": UserRole.NURSE,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "finance.esi@ridgehospital.health": {
        "user_id": "usr-finance-01",
        "full_name": "Esi Boateng (RCM & Billing Lead)",
        "role": UserRole.HOSPITAL_FINANCE,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "hospital.finance@ridgehospital.health": {
        "user_id": "usr-finance-01",
        "full_name": "Esi Boateng (RCM & Billing Lead)",
        "role": UserRole.HOSPITAL_FINANCE,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "clerk.mensah@ridgehospital.health": {
        "user_id": "usr-clerk-01",
        "full_name": "Kwame Mensah (OPD Records & Triage Clerk)",
        "role": UserRole.RECORD_CLERK,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "reception.clerk@ridgehospital.health": {
        "user_id": "usr-clerk-01",
        "full_name": "Kwame Mensah (OPD Records & Triage Clerk)",
        "role": UserRole.RECORD_CLERK,
        "tenant_id": "fac-ridge-01",
        "tenant_name": "Ridge Regional Hospital, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.HOSPITAL,
    },
    "admin.osu@osupharmacy.health": {
        "user_id": "usr-pharm-admin-01",
        "full_name": "Yaw Boakye (Pharmacy Store Manager)",
        "role": UserRole.PHARMACY_ADMIN,
        "tenant_id": "fac-osu-01",
        "tenant_name": "Osu Community Pharmacy, Accra",
        "tenant_slug": "osu-community-pharmacy",
        "tenant_type": TenantType.PHARMACY,
    },
    "superintendent.kojo@osupharmacy.health": {
        "user_id": "usr-super-pharm-01",
        "full_name": "Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)",
        "role": UserRole.SUPERINTENDENT_PHARMACIST,
        "tenant_id": "fac-osu-01",
        "tenant_name": "Osu Community Pharmacy, Accra",
        "tenant_slug": "osu-community-pharmacy",
        "tenant_type": TenantType.PHARMACY,
    },
    "pharm.kojo@osupharmacy.health": {
        "user_id": "usr-pharm-01",
        "full_name": "Pharm. Kojo Asante (Dispensary Pharmacist)",
        "role": UserRole.PHARMACIST,
        "tenant_id": "fac-osu-01",
        "tenant_name": "Osu Community Pharmacy, Accra",
        "tenant_slug": "osu-community-pharmacy",
        "tenant_type": TenantType.PHARMACY,
    },
    "dispensary.clerk@ridgehospital.health": {
        "user_id": "usr-pharm-01",
        "full_name": "Pharm. Kojo Asante (Dispensary Pharmacist)",
        "role": UserRole.PHARMACIST,
        "tenant_id": "fac-osu-01",
        "tenant_name": "Ridge Dispensary Hub, Accra",
        "tenant_slug": "ridge-regional-hospital",
        "tenant_type": TenantType.PHARMACY,
    },
    "finance.abena@osupharmacy.health": {
        "user_id": "usr-pharm-finance-01",
        "full_name": "Abena Osei (Pharmacy Finance & Escrow Lead)",
        "role": UserRole.PHARMACY_FINANCE,
        "tenant_id": "fac-osu-01",
        "tenant_name": "Osu Community Pharmacy, Accra",
        "tenant_slug": "osu-community-pharmacy",
        "tenant_type": TenantType.PHARMACY,
    },
}


@router.post("/login")
async def login_staff(
    req: StaffLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates healthcare staff (Hospital Doctors, Nurses, Pharmacists, Admins)
    and returns JWT tokens along with tenant metadata and tailored redirect path.

    If the same identifier resolves to multiple active user rows across different tenant_ids,
    returns HTTP 200 with `{multiple_facilities:true, facilities:[...]}` so the front-end can
    render a facility picker. Re-post with `tenant_id` to select.

    Accepts flexible identifier modes:
      * Email address (case-insensitive)
      * Phone / MoMo number (normalized by last 9-10 digits)
      * Medical & Dental Council (MDC) license number (case-insensitive)
      * Pharmacy Council registration ID (case-insensitive, treated as license_number)
    """
    canonical_id = req.canonical_identifier
    if not canonical_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="An identifier is required: staff email, phone number, or MDC / Council license number.",
        )

    matched_users = await _resolve_staff_users(canonical_id, db)

    if settings.ALLOW_DEMO_LOGIN_FALLBACK and not matched_users:
        demo_match = None
        canonical_lower = canonical_id.lower()
        if canonical_lower in DEMO_STAFF_ACCOUNTS:
            demo_match = canonical_lower
        else:
            demo_phone = _normalize_phone_digits(canonical_id)
            for demo_email in DEMO_STAFF_ACCOUNTS.keys():
                if _normalize_phone_digits(demo_email) == demo_phone and demo_phone:
                    demo_match = demo_email
                    break
        if demo_match and req.password == "Medipaedia2026!":
            demo = DEMO_STAFF_ACCOUNTS[demo_match]
            roles = [demo["role"].value]
            access_token = create_access_token(
                subject=demo["user_id"],
                role=demo["role"].value,
                tenant_id=demo["tenant_id"],
                extra_claims={"roles": roles},
            )
            refresh_token = create_refresh_token(
                subject=demo["user_id"],
                role=demo["role"].value,
                tenant_id=demo["tenant_id"],
                extra_claims={"roles": roles},
            )
            _write_session_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=False)
            redirect_path = compute_default_redirect(demo["role"], None, roles)
            return TokenPairResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                full_name=demo["full_name"],
                role=demo["role"],
                roles=roles,
                primary_role=roles[0],
                tenant_id=uuid.UUID("22222222-2222-2222-2222-222222222222") if demo["tenant_id"] else None,
                active_tenant=None,
                default_redirect_path=redirect_path,
            )

    if not matched_users:
        identifier_pattern = "email address" if _looks_like_email(canonical_id) else (
            "phone number" if _normalize_phone_digits(canonical_id) and len(_normalize_phone_digits(canonical_id)) >= 8 else "MDC / Council license number or staff ID"
        )
        msg = (
            f"Invalid credentials. Could not authenticate this {identifier_pattern} and password combination. "
            "Double-check your identifier, or verify the correct account type exists in the facility directory."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg,
        )

    # Multi-facility selector path
    candidates_with_valid_password: List[User] = []
    for user in matched_users:
        if verify_password(req.password, user.hashed_password):
            candidates_with_valid_password.append(user)
    if not candidates_with_valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Password does not match any active facility account for this identifier.",
        )

    # Deduplicate candidate list by tenant_id (same email + same tenant must not be possible post-migration, but guard anyway)
    seen_tenants: Dict[Any, User] = {}
    for u in candidates_with_valid_password:
        key = str(u.tenant_id) if u.tenant_id else ("GLOBAL_SUPER:" + str(u.id))
        if key not in seen_tenants:
            seen_tenants[key] = u
    final_candidates = list(seen_tenants.values())

    # Filter by requested tenant_id if provided
    if req.tenant_id and len(final_candidates) > 1:
        wanted = [u for u in final_candidates if u.tenant_id and str(u.tenant_id) == str(req.tenant_id)]
        if not wanted and UserRole.SUPER_ADMIN in normalize_roles_list([u.role for u in final_candidates if u.tenant_id is None]):
            # Fall back: caller passed tenant_id but matched user list had super_admin only
            pass
        elif not wanted:
            # Caller requested a tenant not valid for these candidates -> respond with the facility selector anyway so UI picks
            facilities = [
                MultiFacilityLoginItem(
                    id=u.tenant_id or u.id,
                    name=u.tenant.name if u.tenant else "Super Admin Console",
                    tenant_type=u.tenant.tenant_type if u.tenant else None,
                    user_roles=u.normalized_roles or ([u.role.value] if u.role else []),
                    primary_role=u.primary_role or (u.role.value if u.role else None),
                )
                for u in final_candidates
            ]
            return MultiFacilityLoginResponse(facilities=facilities)
        else:
            final_candidates = wanted

    if len(final_candidates) > 1 and not req.tenant_id:
        facilities = [
            MultiFacilityLoginItem(
                id=u.tenant_id or u.id,
                name=u.tenant.name if u.tenant else "Super Admin Console",
                tenant_type=u.tenant.tenant_type if u.tenant else None,
                user_roles=u.normalized_roles or ([u.role.value] if u.role else []),
                primary_role=u.primary_role or (u.role.value if u.role else None),
            )
            for u in final_candidates
        ]
        return MultiFacilityLoginResponse(facilities=facilities)

    user = final_candidates[0]
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive. Please contact your facility administrator or Super Admin to re-activate.",
        )

    resolved_tenant = user.tenant
    resolved_tenant_id = user.tenant_id
    slug_mismatch_warning = None

    if req.facility_slug and user.role != UserRole.SUPER_ADMIN:
        resolved_slug = resolved_tenant.slug if resolved_tenant else None
        if resolved_slug != req.facility_slug.strip():
            slug_mismatch_warning = {
                "requested": req.facility_slug.strip(),
                "resolved": resolved_slug,
            }

    user_roles = user.normalized_roles or ([user.role.value] if user.role else [])
    access_token = create_access_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=str(resolved_tenant_id) if resolved_tenant_id else None,
        extra_claims={"roles": user_roles},
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=str(resolved_tenant_id) if resolved_tenant_id else None,
        extra_claims={"roles": user_roles},
    )

    _write_session_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=False)

    active_tenant_res = None
    if resolved_tenant:
        active_tenant_res = TenantResponse.model_validate(resolved_tenant)

    redirect_path = compute_default_redirect(user.role, resolved_tenant, user_roles)

    audit_changes = {
        "identifier": canonical_id,
        "auth_mode": "identifier-password",
        "roles": user_roles,
    }
    if slug_mismatch_warning:
        audit_changes["facility_slug_mismatch"] = slug_mismatch_warning
        audit_changes["facility_slug_resolved_dynamically"] = True
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        actor_id=user.id,
        actor_role=user.primary_role or user.role.value,
        tenant_id=resolved_tenant_id,
        action="USER_LOGIN",
        resource_type="UserSession",
        resource_id=str(user.id),
        ip_address="127.0.0.1",
        user_agent="Browser Session",
        changes_json=audit_changes,
    )
    db.add(audit_entry)
    await db.commit()

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        roles=user_roles,
        primary_role=user.primary_role,
        tenant_id=resolved_tenant_id,
        active_tenant=active_tenant_res,
        default_redirect_path=redirect_path,
    )


@router.post(
    "/patient/register",
    response_model=TokenPairResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_patient(
    req: PatientRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new unified PatientAccount using national ID (Ghana Card) and mobile number.
    """
    # Check phone uniqueness
    phone_query = await db.execute(select(User).where(User.phone == req.phone))
    if phone_query.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient account with this phone number is already registered.",
        )

    # Check Ghana Card uniqueness if provided
    if req.ghana_card_id:
        card_query = await db.execute(
            select(PatientAccount).where(
                PatientAccount.ghana_card_id == req.ghana_card_id
            )
        )
        if card_query.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A patient profile with this Ghana Card ID already exists.",
            )

    user_id = uuid.uuid4()
    patient_email = req.email or f"patient_{req.phone.replace('+', '').replace(' ', '')}@medipaedia.local"

    # Create base user account
    user = User(
        id=user_id,
        email=patient_email,
        phone=req.phone,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=UserRole.PATIENT,
        is_active=True,
        is_verified=bool(req.ghana_card_id),
    )
    db.add(user)

    # Create global patient account record
    patient = PatientAccount(
        user_id=user_id,
        ghana_card_id=req.ghana_card_id,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        blood_group=req.blood_group,
        allergies=req.allergies,
        emergency_contact_name=req.emergency_contact_name,
        emergency_contact_phone=req.emergency_contact_phone,
    )
    db.add(patient)

    await db.commit()

    user_roles = user.normalized_roles or ([user.role.value] if user.role else [UserRole.PATIENT.value])
    access_token = create_access_token(
        subject=user.id,
        role=user.primary_role or UserRole.PATIENT.value,
        tenant_id=None,
        extra_claims={"roles": user_roles},
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        role=user.primary_role or UserRole.PATIENT.value,
        tenant_id=None,
        extra_claims={"roles": user_roles},
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
    )
    _write_session_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=False)

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=UserRole.PATIENT,
        roles=user_roles,
        primary_role=user.primary_role or UserRole.PATIENT.value,
        tenant_id=None,
        default_redirect_path="/dashboard",
    )


@router.post("/patient/login", response_model=TokenPairResponse)
async def login_patient(
    req: PatientLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates patients via Email, Mobile Phone Number, or Ghana Card ID.
    """
    identifier = req.identifier.strip()

    # Match User by email or phone
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.patient_profile).selectinload(
                PatientAccount.hospital_cards
            )
        )
        .where((User.email == identifier) | (User.phone == identifier))
    )
    user = result.scalars().first()

    # If not found by email or phone, check by Ghana Card ID in PatientAccount
    if not user:
        p_res = await db.execute(
            select(PatientAccount)
            .options(
                selectinload(PatientAccount.user),
                selectinload(PatientAccount.hospital_cards),
            )
            .where(PatientAccount.ghana_card_id == identifier)
        )
        patient_account = p_res.scalars().first()
    # Demo Fallback for offline development or testing
    if not user and identifier.lower() in ["0244123456", "+233244123456", "patient.kwesi@gmail.com", "gha-71298412-1"]:
        if req.password == "Medipaedia2026!":
            roles = [UserRole.PATIENT.value]
            access_token = create_access_token(
                subject="usr-patient-kwesi-01",
                role=UserRole.PATIENT.value,
                tenant_id=None,
                extra_claims={"roles": roles},
            )
            refresh_token = create_refresh_token(
                subject="usr-patient-kwesi-01",
                role=UserRole.PATIENT.value,
                tenant_id=None,
                extra_claims={"roles": roles},
            )
            _write_session_cookies(response, access_token, refresh_token, secure=False)
            return TokenPairResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user_id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
                full_name="Kwesi Mensah",
                role=UserRole.PATIENT,
                roles=roles,
                primary_role=roles[0],
                tenant_id=None,
                default_redirect_path="/dashboard",
            )

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your identifier and password.",
        )

    user_roles = user.normalized_roles or ([user.role.value] if user.role else [])
    access_token = create_access_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=None,
        extra_claims={"roles": user_roles},
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=None,
        extra_claims={"roles": user_roles},
    )

    _write_session_cookies(response, access_token, refresh_token, secure=False)

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        roles=user_roles,
        primary_role=user.primary_role,
        tenant_id=None,
        default_redirect_path="/dashboard",
    )


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_access_token(
    req: TokenRefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Rotates refresh tokens and issues a new short-lived access token.
    """
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type. Expected refresh token.",
            )
        user_id = uuid.UUID(payload.get("sub"))
        current_tenant_id = payload.get("tenant_id")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh token invalid or expired: {str(e)}",
        )

    user_result = await db.execute(
        select(User).options(selectinload(User.tenant)).where(User.id == user_id)
    )
    user = user_result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active.",
        )

    user_roles = user.normalized_roles or ([user.role.value] if user.role else [])
    # Issue new token pair
    new_access_token = create_access_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=current_tenant_id,
        extra_claims={"roles": user_roles},
    )
    new_refresh_token = create_refresh_token(
        subject=user.id,
        role=user.primary_role or user.role.value,
        tenant_id=current_tenant_id,
        extra_claims={"roles": user_roles},
    )

    _write_session_cookies(response, new_access_token, new_refresh_token, secure=False)

    active_tenant_res = None
    if user.tenant:
        active_tenant_res = TenantResponse.model_validate(user.tenant)

    return TokenPairResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        roles=user_roles,
        primary_role=user.primary_role,
        tenant_id=uuid.UUID(current_tenant_id) if current_tenant_id else None,
        active_tenant=active_tenant_res,
        default_redirect_path=compute_default_redirect(user.role, user.tenant, user_roles),
    )


@router.get("/me", response_model=AuthMeResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns authenticated user information, active tenant, and all linked facility hospital cards.
    Relationships are eagerly loaded by get_current_user to prevent greenlet lazy-load deadlocks.
    """

    def _safe_read(obj, attr, default=None):
        """Read an ORM attribute, safely swallowing DetachedInstanceError or greenlet errors."""
        try:
            val = getattr(obj, attr)
            return val
        except Exception:
            return default

    # Load tenant details if assigned (use eagerly loaded user.tenant first)
    active_tenant_res = None
    tenant = _safe_read(current_user, "tenant")
    if tenant is None and current_user.tenant_id:
        t_res = await db.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = t_res.scalars().first()
    if tenant is not None:
        try:
            active_tenant_res = TenantResponse.model_validate(tenant)
        except Exception:
            active_tenant_res = None

    # Load patient profile and cards (eagerly loaded, but guard for partially unloaded state)
    patient_res = None
    linked_cards = []
    patient_profile = _safe_read(current_user, "patient_profile")
    if patient_profile is not None:
        try:
            patient_res = PatientAccountResponse.model_validate(patient_profile)
        except Exception:
            patient_res = None
        cards = _safe_read(patient_profile, "hospital_cards", default=[]) or []
        for c in cards:
            try:
                linked_cards.append(HospitalPatientCardResponse.model_validate(c))
            except Exception:
                continue

    return AuthMeResponse(
        user_id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        role=current_user.role,
        roles=current_user.normalized_roles or ([current_user.role.value] if current_user.role else []),
        primary_role=current_user.primary_role or (current_user.role.value if current_user.role else None),
        tenant_id=current_user.tenant_id,
        active_tenant=active_tenant_res,
        patient_profile=patient_res,
        linked_facilities=linked_cards,
    )


@router.post("/patient/select-facility", response_model=TokenPairResponse)
async def select_active_facility(
    req: FacilitySelectRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows a patient to switch their active facility context to view their specific MRN
    and clinical consultations for that particular hospital or clinic.
    """
    if not user_has_role_exact(current_user, UserRole.PATIENT):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Facility context switching is for patient users.",
        )

    # Verify patient holds a card at this facility
    t_res = await db.execute(
        select(Tenant).where(Tenant.id == req.facility_id, Tenant.is_active == True)
    )
    tenant = t_res.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found.",
        )

    # Issue token with tenant context baked in
    user_roles = current_user.normalized_roles or ([current_user.role.value] if current_user.role else [UserRole.PATIENT.value])
    access_token = create_access_token(
        subject=current_user.id,
        role=current_user.primary_role or UserRole.PATIENT.value,
        tenant_id=str(req.facility_id),
        extra_claims={"roles": user_roles},
    )
    refresh_token = create_refresh_token(
        subject=current_user.id,
        role=current_user.primary_role or UserRole.PATIENT.value,
        tenant_id=str(req.facility_id),
        extra_claims={"roles": user_roles},
    )

    _write_session_cookies(response, access_token, refresh_token, secure=False)

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=current_user.id,
        full_name=current_user.full_name,
        role=UserRole.PATIENT,
        roles=user_roles,
        primary_role=current_user.primary_role or UserRole.PATIENT.value,
        tenant_id=req.facility_id,
        active_tenant=TenantResponse.model_validate(tenant),
        default_redirect_path="/dashboard",
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout_user(
    response: Response,
    token: Optional[str] = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(None, alias="access_token"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the active JWT access token in Redis with TTL, clears authentication cookies,
    and logs the sign-out security audit trail.
    """
    auth_token = token or access_token_cookie
    if auth_token:
        await revoke_token(auth_token, expires_in_seconds=86400)

    _clear_session_cookies(response)

    # Record sign-out in audit log
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        actor_id=current_user.id,
        actor_role=current_user.role.value,
        tenant_id=current_user.tenant_id,
        action="USER_LOGOUT",
        resource_type="UserSession",
        resource_id=str(current_user.id),
        ip_address="127.0.0.1",
        user_agent="Browser Session",
        changes_json={"status": "revoked", "user_email": current_user.email},
    )
    db.add(audit_entry)
    await db.commit()

    return LogoutResponse(
        success=True,
        message=f"Session for '{current_user.email}' successfully revoked.",
    )


_EMAIL_RE = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Staff password reset initiation. Always returns a generic 200 response to prevent user enumeration.
    If an active, non-patient account matches the identifier:
      - Mints a 256-bit CSPRNG reset token (15 minute expiry).
      - Persists only the SHA-256 digest of the raw token to password_reset_tokens.
      - Writes a PASSWORD_RESET_ISSUED audit log row.
      - Dispatches a branded HTML password-reset email via the active SystemSMTPConfig profile
        (Resend / SMTP / console-preview fallback) including the one-time reset link, recipient
        full name, linked facility name, and a 15-minute urgency + security banner.
      - All SMTP transport errors are swallowed internally so the caller never learns whether
        the account exists or the relay is healthy.
    """
    raw_identifier = (req.identifier or "").strip()
    matched_user: Optional[User] = None

    if raw_identifier:
        import re as _re
        looks_like_email = bool(_re.match(_EMAIL_RE, raw_identifier, _re.IGNORECASE))
        try:
            if looks_like_email:
                stmt = (
                    select(User)
                    .where(func.lower(User.email) == raw_identifier.lower())
                    .limit(10)
                )
                res = await db.execute(stmt)
                candidates = list(res.scalars().all())
                # Prefer first ACTIVE non-PATIENT row; else skip silently (patient recovery separate flow)
                for u in candidates:
                    if not u.is_active:
                        continue
                    user_primary = u.primary_role or (u.role.value if u.role else UserRole.PATIENT.value)
                    if user_primary == UserRole.PATIENT.value:
                        continue
                    matched_user = u
                    break
            else:
                # PIN / council number lookup: try StaffProfile.license_number || User.license_number
                ident_like = f"%{raw_identifier.strip()}%"
                stmt = (
                    select(User)
                    .select_from(User)
                    .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
                    .where(
                        or_(
                            func.lower(StaffProfile.license_number).like(raw_identifier.lower()),
                            func.lower(User.license_number).like(raw_identifier.lower()),
                        )
                    )
                    .limit(20)
                )
                res = await db.execute(stmt)
                candidates = list(res.scalars().all())
                for u in candidates:
                    if not u.is_active:
                        continue
                    user_primary = u.primary_role or (u.role.value if u.role else UserRole.PATIENT.value)
                    if user_primary == UserRole.PATIENT.value:
                        continue
                    matched_user = u
                    break
        except Exception as exc:  # noqa: BLE001
            # Any DB error during lookup: swallow, keep anti-enumeration guarantee
            logger.warning("forgot-password lookup exception (swallowed, anti-enumeration): %s", exc)

    # Timing side-channel hardening: ~100 ms minimum wall time regardless of match
    await asyncio.sleep(0.1)

    if matched_user is not None:
        try:
            raw_token, token_digest = generate_secure_reset_token()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            client_ip = None
            if request.client:
                client_ip = request.client.host
            ua_header = request.headers.get("user-agent")

            app_base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            reset_link = f"{app_base_url}/reset-password?token={raw_token}"

            prt = PasswordResetToken(
                id=uuid.uuid4(),
                token_hash=token_digest,
                user_id=matched_user.id,
                tenant_id=matched_user.tenant_id,
                email_address=matched_user.email,
                expires_at=expires_at,
                used=False,
                client_ip=client_ip,
                user_agent=ua_header,
            )
            db.add(prt)

            recipient_name = None
            if matched_user.full_name:
                name_stripped = str(matched_user.full_name).strip()
                if name_stripped:
                    recipient_name = name_stripped
            elif hasattr(matched_user, "first_name") or hasattr(matched_user, "last_name"):
                fn = getattr(matched_user, "first_name", None) or None
                ln = getattr(matched_user, "last_name", None) or None
                parts = [str(p).strip() for p in (fn, ln) if str(p).strip()]
                if parts:
                    recipient_name = " ".join(parts)

            facility_name = None
            try:
                if matched_user.tenant_id:
                    t_stmt = select(Tenant).where(Tenant.id == matched_user.tenant_id).limit(1)
                    t_res = await db.execute(t_stmt)
                    tenant_row = t_res.scalars().first()
                    if tenant_row and tenant_row.name:
                        facility_name = str(tenant_row.name).strip() or None
            except Exception:
                facility_name = None

            validity_hours = 0.25
            if expires_at and matched_user:
                try:
                    td = expires_at - datetime.now(timezone.utc)
                    minutes_total = max(1.0, float(td.total_seconds()) / 60.0)
                    validity_hours = max(0.25, round(minutes_total / 60.0, 2))
                except Exception:
                    validity_hours = 0.25

            subject = "Medipaedia — Password Reset Request"
            html_body = render_password_reset_email(
                reset_link=reset_link,
                validity_hours=validity_hours,
                recipient_name=recipient_name,
                facility_name=facility_name,
            )

            audit_entry = AuditLog(
                id=uuid.uuid4(),
                actor_id=matched_user.id,
                actor_role=(matched_user.role.value if matched_user.role else UserRole.PATIENT.value),
                tenant_id=matched_user.tenant_id,
                action="PASSWORD_RESET_ISSUED",
                resource_type="UserSecurity",
                resource_id=str(matched_user.id),
                ip_address=client_ip or "127.0.0.1",
                user_agent=ua_header or "Password Recovery",
                changes_json={
                    "event": "password_reset_link_dispatched",
                    "user_email": matched_user.email,
                    "reset_url": reset_link,
                    "dispatch_status": "pending",
                },
            )
            db.add(audit_entry)
            await db.commit()

            dispatch = EmailDispatchResult(
                status="error",
                via="skipped",
                error="Email dispatch block did not execute.",
            )
            try:
                dispatch = await send_system_email(
                    to_email=matched_user.email,
                    subject=subject,
                    html_body=html_body,
                    db=db,
                )
            except Exception as email_exc:  # noqa: BLE001
                logger.error(
                    "forgot-password send_system_email raised (swallowed, anti-enumeration): user_id=%s exc=%s",
                    matched_user.id,
                    email_exc,
                )
                dispatch = EmailDispatchResult(
                    status="error",
                    via="exception",
                    error=str(email_exc),
                )

            try:
                dispatch_status = getattr(dispatch, "status", "unknown")
                dispatch_via = getattr(dispatch, "via", "unknown")
                dispatch_error = getattr(dispatch, "error", None)
                dispatch_preview = getattr(dispatch, "preview_text", None)
                changes = dict(audit_entry.changes_json or {})
                changes["dispatch_status"] = dispatch_status
                changes["dispatch_via"] = dispatch_via
                if dispatch_error:
                    changes["dispatch_error"] = str(dispatch_error)[:400]
                if dispatch_status == "sent":
                    changes["message_id"] = getattr(dispatch, "message_id", None)
                    changes["config_id"] = getattr(dispatch, "config_id", None)
                if dispatch_preview and len(dispatch_preview) <= 200:
                    changes["preview"] = dispatch_preview
                audit_entry.changes_json = changes
                db.add(audit_entry)
                await db.commit()
            except Exception as audit_exc:  # noqa: BLE001
                await db.rollback()
                logger.warning(
                    "forgot-password audit dispatch status update failed (silent): %s",
                    audit_exc,
                )

            logger.info(
                "password_reset_issued user_id=%s email=%s -> via=%s status=%s link=%s (expires %s)",
                matched_user.id,
                matched_user.email,
                getattr(dispatch, "via", "unknown"),
                getattr(dispatch, "status", "unknown"),
                reset_link,
                expires_at.isoformat(),
            )
        except Exception as exc:  # noqa: BLE001
            await db.rollback()
            logger.error("forgot-password token write failed (silent to caller): %s", exc)

    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    req: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Consume a valid, unused, non-expired password reset token and set a new bcrypt password.
    - Looks up token by SHA-256 digest against the raw token.
    - Atomically updates users.hashed_password + marks token as used in one transaction.
    - Immediately revokes every active session for the affected user.
    - Writes PASSWORD_RESET_CONSUMED audit row.
    - On invalid/expired/used tokens: HTTP 400 with generic opaque error detail.
    """
    raw = (req.token or "").strip()
    if len(raw) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid or has expired. Please request a new password reset link.",
        )
    digest = hash_token(raw)
    stmt = (
        select(PasswordResetToken)
        .options(selectinload(PasswordResetToken.user))
        .where(
            (PasswordResetToken.token_hash == digest)
            & (PasswordResetToken.used.is_(False))
            & (PasswordResetToken.expires_at > func.now())
        )
        .with_for_update(skip_locked=False)
        .limit(1)
    )
    res = await db.execute(stmt)
    prt: Optional[PasswordResetToken] = res.scalars().first()

    if prt is None or prt.user is None or not prt.user.is_active:
        # Slight extra hardening: sleep to prevent 400 timing leak on invalid tokens
        await asyncio.sleep(0.05)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid or has expired. Please request a new password reset link.",
        )

    try:
        prt.user.hashed_password = get_password_hash(req.new_password)
        prt.user.updated_at = func.now()
        prt.used = True
        prt.used_at = datetime.now(timezone.utc)
        db.add(prt.user)
        db.add(prt)

        client_ip = None
        if request.client:
            client_ip = request.client.host
        ua_header = request.headers.get("user-agent")

        audit_entry = AuditLog(
            id=uuid.uuid4(),
            actor_id=prt.user.id,
            actor_role=(prt.user.role.value if prt.user.role else UserRole.PATIENT.value),
            tenant_id=prt.user.tenant_id,
            action="PASSWORD_RESET_CONSUMED",
            resource_type="UserSecurity",
            resource_id=str(prt.user.id),
            ip_address=client_ip or "127.0.0.1",
            user_agent=ua_header or "Password Recovery",
            changes_json={
                "event": "password_successfully_reset",
                "user_email": prt.user.email,
                "new_password_length": len(req.new_password),
            },
        )
        db.add(audit_entry)
        await db.commit()

        # Post-commit: invalidate all active sessions so compromised cookies can't be replayed
        try:
            await revoke_all_user_sessions(str(prt.user.id))
        except Exception as exc:  # noqa: BLE001
            logger.warning("reset-password session revocation best-effort failed: %s", exc)

        return ResetPasswordResponse()
    except Exception:
        await db.rollback()
        raise


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies current password and updates to a newly computed bcrypt hash.
    """
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed. Please enter your existing password correctly.",
        )

    current_user.hashed_password = get_password_hash(req.new_password)
    db.add(current_user)

    # Record audit entry
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        actor_id=current_user.id,
        actor_role=current_user.role.value,
        tenant_id=current_user.tenant_id,
        action="PASSWORD_CHANGED",
        resource_type="UserSecurity",
        resource_id=str(current_user.id),
        ip_address="127.0.0.1",
        user_agent="Profile Security",
        changes_json={"event": "password_updated_successfully"},
    )
    db.add(audit_entry)
    await db.commit()

    return {"success": True, "message": "Password updated successfully."}


@router.put("/profile", response_model=AuthMeResponse)
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates user personal profile attributes (name, phone, emergency contact, allergies).
    """
    if req.full_name:
        current_user.full_name = req.full_name
    if req.phone:
        current_user.phone = req.phone

    if current_user.patient_profile:
        if req.emergency_contact_name is not None:
            current_user.patient_profile.emergency_contact_name = req.emergency_contact_name
        if req.emergency_contact_phone is not None:
            current_user.patient_profile.emergency_contact_phone = req.emergency_contact_phone
        if req.allergies is not None:
            current_user.patient_profile.allergies = req.allergies
        db.add(current_user.patient_profile)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    active_tenant_res = None
    if current_user.tenant:
        active_tenant_res = TenantResponse.model_validate(current_user.tenant)

    patient_profile_res = None
    linked_cards_res = []
    if current_user.patient_profile:
        patient_profile_res = PatientAccountResponse.model_validate(current_user.patient_profile)
        linked_cards_res = [
            HospitalPatientCardResponse.model_validate(c)
            for c in current_user.patient_profile.hospital_cards
            if c.is_active
        ]

    return AuthMeResponse(
        user_id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        active_tenant=active_tenant_res,
        patient_profile=patient_profile_res,
        linked_facilities=linked_cards_res,
    )


@router.get("/sessions", response_model=List[UserSessionItem])
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the list of active user sessions from Redis.
    """
    sessions = await get_user_sessions(str(current_user.id))
    return [UserSessionItem(**s) for s in sessions]


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Terminates all active sessions across all devices for the current user.
    """
    await revoke_all_user_sessions(str(current_user.id))
    _clear_session_cookies(response)

    audit_entry = AuditLog(
        id=uuid.uuid4(),
        actor_id=current_user.id,
        actor_role=current_user.role.value,
        tenant_id=current_user.tenant_id,
        action="REVOKE_ALL_SESSIONS",
        resource_type="UserSession",
        resource_id=str(current_user.id),
        ip_address="127.0.0.1",
        changes_json={"revoked_all": True},
    )
    db.add(audit_entry)
    await db.commit()

    return {"success": True, "message": "All device sessions successfully terminated."}

