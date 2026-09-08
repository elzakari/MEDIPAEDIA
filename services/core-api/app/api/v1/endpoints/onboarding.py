from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.onboarding import (
    CompanyInviteSubmissionRequest,
    CompanyInvitationCreateRequest,
    CompanyInvitationResponse,
    CompanyOnboardingCompletionRequest,
    CompanyOnboardingCompletionResponse,
    CompanyVerificationResponse,
    StaffOnboardingCompletionRequest,
    StaffOnboardingCompletionResponse,
    StaffVerificationResponse,
)
from app.services.staff_onboarding import StaffOnboardingService
from app.services.tenant_onboarding import TenantOnboardingService
from app.core.config import settings
from app.api.v1.endpoints.auth import _write_session_cookies
import logging

logger = logging.getLogger("medipaedia.onboarding")
router = APIRouter()


# ============================================================================
# Company / Facility Onboarding Flow
# ============================================================================

@router.post(
    "/company/request-invite",
    response_model=CompanyInvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Facility Onboarding Invite Request (Public)",
)
async def request_company_invitation(
    req: CompanyInviteSubmissionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public (unauthenticated) endpoint for prospective hospitals, clinics, and pharmacies
    to submit a request for a Medipaedia facility onboarding invitation.

    - Creates a 72-hour pending invitation token
    - Guarantees one valid pending invitation per admin_email (duplicate guard)
    - Rejects submissions for admin emails that already own an active tenant
    - Returns signed onboarding_url with magic link for immediate completion flow

    Performance: endpoint is lightweight — no heavy prefetch; email uniqueness
    guard is indexed and leverages existing pending dedupe in TenantOnboardingService.
    """
    logger.info(
        "Public facility invite requested: company=%s, admin_email=%s, tenant_type=%s, phone=%s, city=%s",
        req.company_name,
        req.admin_email,
        req.tenant_type.value if hasattr(req.tenant_type, "value") else str(req.tenant_type),
        req.admin_phone,
        req.city,
    )
    if req.note:
        logger.info("Invite request note (admin_email=%s): %s", req.admin_email, req.note)

    create_req = CompanyInvitationCreateRequest(
        company_name=req.company_name,
        admin_email=req.admin_email,
        tenant_type=req.tenant_type,
        country=req.country or settings.DEFAULT_COUNTRY or "Ghana",
        currency=req.currency or settings.DEFAULT_CURRENCY or "GHS",
        assigned_plan_code="PLAN-GROWTH",
    )
    return await TenantOnboardingService.create_company_invitation(create_req, None, db)


@router.get(
    "/company/verify",
    response_model=CompanyVerificationResponse,
    summary="Validate Company Invitation Token",
)
async def verify_company_invitation(
    token: str = Query(..., description="Invitation token from onboarding link"),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates company invitation token existence, expiration, and PENDING status.
    Returns pre-populated metadata (facility name, plan code, country, currency).
    """
    return await TenantOnboardingService.verify_company_invitation_token(token, db)


@router.post(
    "/company/complete",
    response_model=CompanyOnboardingCompletionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Complete Facility Provisioning",
)
async def complete_company_onboarding(
    req: CompanyOnboardingCompletionRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Atomically provisions Tenant, Primary Branch, Root Admin User, and assigns subscription.
    Returns JWT authentication tokens for immediate login into the facility console.
    """
    payload = await TenantOnboardingService.complete_company_onboarding(req, db)
    access = getattr(payload, "access_token", None)
    refresh = getattr(payload, "refresh_token", None)
    if access:
        _write_session_cookies(response, access, refresh, secure=False)
    return payload


# ============================================================================
# Staff Onboarding Flow
# ============================================================================

@router.get(
    "/staff/verify",
    response_model=StaffVerificationResponse,
    summary="Validate Staff Invitation Token",
)
async def verify_staff_invitation(
    token: str = Query(..., description="Invitation token from email link"),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates staff invitation token, returns assigned role, facility name, and optional branch.
    """
    return await StaffOnboardingService.verify_staff_invitation_token(token, db)


@router.post(
    "/staff/complete",
    response_model=StaffOnboardingCompletionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Complete Staff Profile & Set Password",
)
async def complete_staff_onboarding(
    req: StaffOnboardingCompletionRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Activates staff account, creates user profile, binds to tenant/branch, and returns JWT tokens.
    """
    payload = await StaffOnboardingService.complete_staff_onboarding(req, db)
    access = getattr(payload, "access_token", None)
    refresh = getattr(payload, "refresh_token", None)
    if access:
        _write_session_cookies(response, access, refresh, secure=False)
    return payload
