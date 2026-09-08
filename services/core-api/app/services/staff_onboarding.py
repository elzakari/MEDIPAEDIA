from datetime import datetime, timedelta, timezone
import logging
import secrets
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.entitlements import get_tenant_plan_details, verify_seat_limit
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.models.audit import AuditLog
from app.models.branch import FacilityBranch
from app.models.invitation import InvitationStatus, StaffOnboardingInvitation
from app.models.staff_profile import StaffProfile
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.onboarding import (
    StaffInvitationCreateRequest,
    StaffInvitationResponse,
    StaffOnboardingCompletionRequest,
    StaffOnboardingCompletionResponse,
    StaffSeatQuotaSummary,
    StaffVerificationResponse,
)

logger = logging.getLogger("medipaedia.onboarding.staff")


class StaffOnboardingService:
    @staticmethod
    async def get_seat_quota_summary(tenant_id: uuid.UUID, db: AsyncSession) -> StaffSeatQuotaSummary:
        """
        Returns seat usage and quota limits for the tenant.
        """
        plan_details = await get_tenant_plan_details(tenant_id, db)
        limits = plan_details["limits"]
        max_seats = limits.get("max_staff_seats", 25)

        # Count active staff users
        count_stmt = select(User).where((User.tenant_id == tenant_id) & (User.is_active == True))
        res = await db.execute(count_stmt)
        active_seats = len(res.scalars().all())

        return StaffSeatQuotaSummary(
            active_seats=active_seats,
            max_seats=max_seats,
            seats_remaining=max(0, max_seats - active_seats),
            plan_name=plan_details["plan_name"],
            tier=plan_details["tier"],
        )

    @staticmethod
    async def create_staff_invitation(
        req: StaffInvitationCreateRequest,
        tenant_id: uuid.UUID,
        invited_by: User,
        db: AsyncSession,
    ) -> StaffInvitationResponse:
        """
        Validates seat quota and creates a 48-hour secure staff invitation.
        """
        # 1. Enforce seat limit quota barrier
        await verify_seat_limit(tenant_id, db)

        # 2. Check if user already exists
        existing_user = await db.execute(select(User).where(User.email == req.email))
        if existing_user.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{req.email}' is already registered on the platform.",
            )

        # 3. Check for existing pending invitation
        stmt = select(StaffOnboardingInvitation).where(
            (StaffOnboardingInvitation.tenant_id == tenant_id)
            & (StaffOnboardingInvitation.email == req.email)
            & (StaffOnboardingInvitation.status == InvitationStatus.PENDING)
        )
        res = await db.execute(stmt)
        existing_inv = res.scalars().first()

        if existing_inv and existing_inv.expires_at > datetime.now(timezone.utc):
            invitation = existing_inv
        else:
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
            invitation = StaffOnboardingInvitation(
                token=token,
                tenant_id=tenant_id,
                email=req.email,
                first_name=req.first_name,
                last_name=req.last_name,
                role=req.role,
                branch_id=req.branch_id,
                status=InvitationStatus.PENDING,
                expires_at=expires_at,
                invited_by_user_id=invited_by.id,
            )
            db.add(invitation)
            await db.commit()
            await db.refresh(invitation)

        # Fetch tenant to determine appropriate portal URL
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_res.scalars().first()
        is_pharmacy = tenant is not None and tenant.tenant_type == TenantType.PHARMACY
        base_url = (settings.PHARMACY_POS_URL if is_pharmacy else settings.FRONTEND_URL) or "http://localhost:3000"
        invitation_url = f"{base_url}/onboard/staff?token={invitation.token}"

        return StaffInvitationResponse(
            id=invitation.id,
            token=invitation.token,
            tenant_id=invitation.tenant_id,
            email=invitation.email,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            role=invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role),
            branch_id=invitation.branch_id,
            status=invitation.status.value if hasattr(invitation.status, "value") else str(invitation.status),
            expires_at=invitation.expires_at,
            invitation_url=invitation_url,
            created_at=invitation.created_at,
        )

    @staticmethod
    async def list_staff_invitations(tenant_id: uuid.UUID, db: AsyncSession) -> List[StaffInvitationResponse]:
        stmt = (
            select(StaffOnboardingInvitation)
            .where(StaffOnboardingInvitation.tenant_id == tenant_id)
            .order_by(desc(StaffOnboardingInvitation.created_at))
        )
        res = await db.execute(stmt)
        invitations = res.scalars().all()

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_res.scalars().first()
        is_pharmacy = tenant is not None and tenant.tenant_type == TenantType.PHARMACY
        base_url = (settings.PHARMACY_POS_URL if is_pharmacy else settings.FRONTEND_URL) or "http://localhost:3000"

        results = []
        for inv in invitations:
            results.append(
                StaffInvitationResponse(
                    id=inv.id,
                    token=inv.token,
                    tenant_id=inv.tenant_id,
                    email=inv.email,
                    first_name=inv.first_name,
                    last_name=inv.last_name,
                    role=inv.role.value if hasattr(inv.role, "value") else str(inv.role),
                    branch_id=inv.branch_id,
                    status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
                    expires_at=inv.expires_at,
                    invitation_url=f"{base_url}/onboard/staff?token={inv.token}",
                    created_at=inv.created_at,
                )
            )
        return results

    @staticmethod
    async def verify_staff_invitation_token(token: str, db: AsyncSession) -> StaffVerificationResponse:
        stmt = select(StaffOnboardingInvitation).where(StaffOnboardingInvitation.token == token)
        res = await db.execute(stmt)
        invitation = res.scalars().first()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff invitation link is invalid or does not exist.",
            )

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This staff invitation has already been {invitation.status.value.lower()}.",
            )

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This staff invitation link has expired. Please request a new invite from your facility administrator.",
            )

        # Get tenant and optional branch
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == invitation.tenant_id))
        tenant = tenant_res.scalars().first()
        facility_name = tenant.name if tenant else "Medipaedia Facility"
        tenant_type = tenant.tenant_type.value if tenant and hasattr(tenant.tenant_type, "value") else "HOSPITAL"

        branch_name = None
        if invitation.branch_id:
            branch_res = await db.execute(select(FacilityBranch).where(FacilityBranch.id == invitation.branch_id))
            branch = branch_res.scalars().first()
            if branch:
                branch_name = branch.name

        return StaffVerificationResponse(
            valid=True,
            token=invitation.token,
            email=invitation.email,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            role=invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role),
            facility_name=facility_name,
            tenant_type=tenant_type,
            branch_name=branch_name,
            expires_at=invitation.expires_at,
        )

    @staticmethod
    async def complete_staff_onboarding(
        req: StaffOnboardingCompletionRequest,
        db: AsyncSession,
    ) -> StaffOnboardingCompletionResponse:
        """
        Creates user record, assigns staff profile, binds tenant/branch, and marks invitation ACCEPTED.
        """
        # 1. Verify invitation
        stmt = select(StaffOnboardingInvitation).where(StaffOnboardingInvitation.token == req.token)
        res = await db.execute(stmt)
        invitation = res.scalars().first()

        if not invitation or invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or consumed staff invitation token.",
            )

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Invitation link expired.",
            )

        # 2. Re-verify seat quota
        await verify_seat_limit(invitation.tenant_id, db)

        # 3. Check for existing user
        user_check = await db.execute(select(User).where(User.email == invitation.email))
        if user_check.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{invitation.email}' is already registered.",
            )

        full_name = f"{invitation.first_name} {invitation.last_name}".strip()

        # 4. Create User
        user = User(
            email=invitation.email,
            phone=req.phone_number,
            hashed_password=get_password_hash(req.password),
            full_name=full_name,
            role=invitation.role,
            tenant_id=invitation.tenant_id,
            license_number=req.license_number,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        # 5. Create Staff Profile
        department = (
            "Clinical Services"
            if invitation.role in [UserRole.DOCTOR, UserRole.NURSE]
            else "Dispensary"
            if invitation.role in [UserRole.PHARMACIST, UserRole.SUPERINTENDENT_PHARMACIST]
            else "Administration & Finance"
        )
        staff_profile = StaffProfile(
            user_id=user.id,
            tenant_id=invitation.tenant_id,
            department=department,
            specialization=invitation.role.value if hasattr(invitation.role, "value") else str(invitation.role),
            license_number=req.license_number,
            licensing_body="MDC / NMC / Pharmacy Council",
            can_prescribe_narcotics=invitation.role in [UserRole.DOCTOR, UserRole.SUPERINTENDENT_PHARMACIST],
            can_authorize_quarantine=invitation.role in [UserRole.SUPERINTENDENT_PHARMACIST, UserRole.HOSPITAL_ADMIN, UserRole.PHARMACY_ADMIN],
            can_collect_cash=invitation.role in [UserRole.HOSPITAL_FINANCE, UserRole.PHARMACY_FINANCE],
            is_active=True,
        )
        db.add(staff_profile)
        await db.flush()

        # 6. Mark Invitation Accepted
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        invitation.created_user_id = user.id

        # 7. Audit Log
        audit = AuditLog(
            tenant_id=invitation.tenant_id,
            actor_id=user.id,
            actor_role=user.role.value if hasattr(user.role, "value") else str(user.role),
            action="STAFF_ONBOARDING_COMPLETED",
            resource_type="USER",
            resource_id=str(user.id),
            changes_json={
                "email": user.email,
                "role": str(user.role),
                "full_name": user.full_name,
            },
        )
        db.add(audit)
        await db.commit()
        await db.refresh(user)

        # 8. Mint Tokens
        user_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        user_roles = user.normalized_roles or [user_role_str]
        access_token = create_access_token(
            subject=str(user.id),
            role=user_role_str,
            tenant_id=str(invitation.tenant_id),
            extra_claims={"roles": user_roles},
        )
        refresh_token = create_refresh_token(
            subject=str(user.id),
            role=user_role_str,
            tenant_id=str(invitation.tenant_id),
            extra_claims={"roles": user_roles},
        )

        # Default redirect path based on role
        redirect_map = {
            UserRole.DOCTOR: "/doctor",
            UserRole.NURSE: "/nurse",
            UserRole.RECORD_CLERK: "/reception",
            UserRole.HOSPITAL_FINANCE: "/hospital-finance",
            UserRole.HOSPITAL_ADMIN: "/hospital-admin",
            UserRole.PHARMACIST: "/dispensary",
            UserRole.SUPERINTENDENT_PHARMACIST: "/superintendent",
            UserRole.PHARMACY_FINANCE: "/pharmacy-finance",
            UserRole.PHARMACY_ADMIN: "/pharmacy-admin",
        }
        default_redirect = redirect_map.get(user.role, "/doctor")

        return StaffOnboardingCompletionResponse(
            success=True,
            message=f"Welcome {user.full_name}! Your staff profile has been activated.",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user_role_str,
            roles=user_roles,
            primary_role=user_roles[0] if user_roles else user_role_str,
            tenant_id=invitation.tenant_id,
            default_redirect_path=default_redirect,
        )

    @staticmethod
    async def resend_staff_invitation(
        invitation_id: uuid.UUID,
        tenant_id: uuid.UUID,
        db: AsyncSession,
    ) -> StaffInvitationResponse:
        stmt = select(StaffOnboardingInvitation).where(
            (StaffOnboardingInvitation.id == invitation_id)
            & (StaffOnboardingInvitation.tenant_id == tenant_id)
        )
        res = await db.execute(stmt)
        inv = res.scalars().first()

        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff invitation not found.",
            )

        inv.token = secrets.token_urlsafe(32)
        inv.expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
        inv.status = InvitationStatus.PENDING
        await db.commit()
        await db.refresh(inv)

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_res.scalars().first()
        base_url = "http://localhost:3000" if tenant and tenant.tenant_type != TenantType.PHARMACY else "http://localhost:3001"

        return StaffInvitationResponse(
            id=inv.id,
            token=inv.token,
            tenant_id=inv.tenant_id,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            role=inv.role.value if hasattr(inv.role, "value") else str(inv.role),
            branch_id=inv.branch_id,
            status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            expires_at=inv.expires_at,
            invitation_url=f"{base_url}/onboard/staff?token={inv.token}",
            created_at=inv.created_at,
        )
