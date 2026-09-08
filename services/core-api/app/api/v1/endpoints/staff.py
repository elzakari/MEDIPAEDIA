import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, user_has_any_role, user_has_role_exact
from app.models.user import User, UserRole
from app.schemas.onboarding import (
    StaffInvitationCreateRequest,
    StaffInvitationResponse,
    StaffSeatQuotaSummary,
)
from app.services.staff_onboarding import StaffOnboardingService

router = APIRouter()


@router.get(
    "/quota",
    response_model=StaffSeatQuotaSummary,
    summary="Get Staff Seat Utilization & Tier Quota",
)
async def get_staff_seat_quota(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a facility tenant.",
        )
    return await StaffOnboardingService.get_seat_quota_summary(current_user.tenant_id, db)


@router.post(
    "/invite",
    response_model=StaffInvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite Clinical or Dispensary Staff Member",
)
async def invite_staff_member(
    req: StaffInvitationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enforces seat quota barriers. Generates 48-hour secure invitation token.
    Allowed for HOSPITAL_ADMIN, PHARMACY_ADMIN, SUPER_ADMIN.
    """
    if not user_has_any_role(
        current_user,
        UserRole.HOSPITAL_ADMIN,
        UserRole.PHARMACY_ADMIN,
        UserRole.SUPERINTENDENT_PHARMACIST,
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only facility administrators can invite staff.",
        )

    if not current_user.tenant_id and not user_has_role_exact(current_user, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID required for staff invitation.",
        )

    tenant_id = current_user.tenant_id
    return await StaffOnboardingService.create_staff_invitation(req, tenant_id, current_user, db)


@router.get(
    "/invitations",
    response_model=List[StaffInvitationResponse],
    summary="List Staff Invitations",
)
async def list_staff_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID required.",
        )
    return await StaffOnboardingService.list_staff_invitations(current_user.tenant_id, db)


@router.post(
    "/invitations/{invitation_id}/resend",
    response_model=StaffInvitationResponse,
    summary="Resend Staff Invitation Link",
)
async def resend_staff_invitation(
    invitation_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID required.",
        )
    return await StaffOnboardingService.resend_staff_invitation(invitation_id, current_user.tenant_id, db)
