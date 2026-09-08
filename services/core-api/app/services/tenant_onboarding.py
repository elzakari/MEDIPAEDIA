from datetime import datetime, timedelta, timezone
import logging
import re
import secrets
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.models.audit import AuditLog
from app.models.branch import BranchType, FacilityBranch
from app.models.invitation import InvitationStatus, TenantOnboardingInvitation
from app.models.tenant import SubscriptionPlan, Tenant, TenantType
from app.models.user import User, UserRole
from app.schemas.onboarding import (
    CompanyInvitationCreateRequest,
    CompanyInvitationResponse,
    CompanyOnboardingCompletionRequest,
    CompanyOnboardingCompletionResponse,
    CompanyVerificationResponse,
)

logger = logging.getLogger("medipaedia.onboarding.tenant")


def safe_uuid(val: Any) -> Optional[uuid.UUID]:
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


def generate_slug(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return slug or "facility"


class TenantOnboardingService:
    @staticmethod
    async def create_company_invitation(
        req: CompanyInvitationCreateRequest,
        invited_by: Optional[User],
        db: AsyncSession,
    ) -> CompanyInvitationResponse:
        """
        Creates a 72-hour cryptographically secure invitation for a new facility.
        Guarantees safe UUID coercion and plan resolution without throwing unhandled 500 errors.
        """
        try:
            # 1. Check if facility with this admin email is already active
            existing_tenant = await db.execute(select(Tenant).where(Tenant.email == req.admin_email))
            if existing_tenant.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A healthcare facility is already registered under email '{req.admin_email}'.",
                )

            # 2. Safe plan resolution (fallback to PLAN-GROWTH if plan not found)
            plan_code = (req.assigned_plan_code or "PLAN-GROWTH").strip()
            plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == plan_code))
            if not plan_res.scalars().first():
                # Allow default tier codes
                if plan_code not in ["PLAN-STARTER", "PLAN-GROWTH", "PLAN-ENTERPRISE"]:
                    plan_code = "PLAN-GROWTH"

            # 3. Resolve invited_by_user_id safely
            invited_by_id = safe_uuid(getattr(invited_by, "id", None))
            if invited_by_id:
                u_check = await db.execute(select(User.id).where(User.id == invited_by_id))
                if not u_check.scalar():
                    invited_by_id = None

            # 4. Check if a pending valid invitation already exists for this email
            stmt = select(TenantOnboardingInvitation).where(
                (TenantOnboardingInvitation.admin_email == req.admin_email)
                & (TenantOnboardingInvitation.status == InvitationStatus.PENDING)
            )
            res = await db.execute(stmt)
            existing = res.scalars().first()

            if existing and existing.expires_at > datetime.now(timezone.utc):
                invitation = existing
            else:
                token = secrets.token_urlsafe(32)
                expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
                invitation = TenantOnboardingInvitation(
                    token=token,
                    company_name=req.company_name.strip(),
                    admin_email=req.admin_email.strip().lower(),
                    tenant_type=req.tenant_type,
                    country=req.country or "Ghana",
                    currency=req.currency or "GHS",
                    assigned_plan_code=plan_code,
                    status=InvitationStatus.PENDING,
                    expires_at=expires_at,
                    invited_by_user_id=invited_by_id,
                )
                db.add(invitation)
                await db.commit()
                await db.refresh(invitation)

            # Company onboarding always resolves to the hospital-web portal
            base_url = settings.FRONTEND_URL or "http://localhost:3000"
            onboarding_url = f"{base_url}/onboard/company?token={invitation.token}"

            return CompanyInvitationResponse(
                id=invitation.id,
                token=invitation.token,
                company_name=invitation.company_name,
                admin_email=invitation.admin_email,
                tenant_type=invitation.tenant_type.value if hasattr(invitation.tenant_type, "value") else str(invitation.tenant_type),
                country=invitation.country,
                currency=invitation.currency,
                assigned_plan_code=invitation.assigned_plan_code,
                status=invitation.status.value if hasattr(invitation.status, "value") else str(invitation.status),
                expires_at=invitation.expires_at,
                onboarding_url=onboarding_url,
                created_at=invitation.created_at,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating company invitation for {req.admin_email}: {e}", exc_info=True)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to generate facility invitation: {str(e)}",
            )

    @staticmethod
    async def list_company_invitations(db: AsyncSession) -> List[CompanyInvitationResponse]:
        stmt = select(TenantOnboardingInvitation).order_by(desc(TenantOnboardingInvitation.created_at))
        res = await db.execute(stmt)
        invitations = res.scalars().all()

        results = []
        for inv in invitations:
            base_url = settings.FRONTEND_URL or "http://localhost:3000"
            onboarding_url = f"{base_url}/onboard/company?token={inv.token}"
            results.append(
                CompanyInvitationResponse(
                    id=inv.id,
                    token=inv.token,
                    company_name=inv.company_name,
                    admin_email=inv.admin_email,
                    tenant_type=inv.tenant_type.value if hasattr(inv.tenant_type, "value") else str(inv.tenant_type),
                    country=inv.country,
                    currency=inv.currency,
                    assigned_plan_code=inv.assigned_plan_code,
                    status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
                    expires_at=inv.expires_at,
                    onboarding_url=onboarding_url,
                    created_at=inv.created_at,
                )
            )
        return results

    @staticmethod
    async def verify_company_invitation_token(token: str, db: AsyncSession) -> CompanyVerificationResponse:
        stmt = select(TenantOnboardingInvitation).where(TenantOnboardingInvitation.token == token)
        res = await db.execute(stmt)
        invitation = res.scalars().first()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation link is invalid or does not exist.",
            )

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This invitation has already been {invitation.status.value.lower()}.",
            )

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This invitation link has expired. Please contact support for a renewed invite.",
            )

        return CompanyVerificationResponse(
            valid=True,
            token=invitation.token,
            company_name=invitation.company_name,
            admin_email=invitation.admin_email,
            tenant_type=invitation.tenant_type.value if hasattr(invitation.tenant_type, "value") else str(invitation.tenant_type),
            country=invitation.country,
            currency=invitation.currency,
            assigned_plan_code=invitation.assigned_plan_code,
            expires_at=invitation.expires_at,
        )

    @staticmethod
    async def complete_company_onboarding(
        req: CompanyOnboardingCompletionRequest,
        db: AsyncSession,
    ) -> CompanyOnboardingCompletionResponse:
        """
        Atomically provisions Tenant, Primary Branch, Root Admin User, and activates subscription.
        """
        try:
            # 1. Verify invitation token
            stmt = select(TenantOnboardingInvitation).where(TenantOnboardingInvitation.token == req.token)
            res = await db.execute(stmt)
            invitation = res.scalars().first()

            if not invitation or invitation.status != InvitationStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or already consumed invitation token.",
                )

            if invitation.expires_at < datetime.now(timezone.utc):
                invitation.status = InvitationStatus.EXPIRED
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="Invitation token expired.",
                )

            # 2. Check if admin user email already exists
            user_check = await db.execute(select(User).where(User.email == invitation.admin_email))
            if user_check.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with email '{invitation.admin_email}' is already registered.",
                )

            # 3. Create Tenant
            base_slug = generate_slug(invitation.company_name)
            slug = base_slug
            counter = 1
            while True:
                slug_res = await db.execute(select(Tenant).where(Tenant.slug == slug))
                if not slug_res.scalars().first():
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1

            tenant = Tenant(
                name=invitation.company_name,
                slug=slug,
                tenant_type=invitation.tenant_type,
                license_number=req.registration_number,
                phone=req.phone_number,
                email=invitation.admin_email,
                address=req.physical_address or req.digital_address,
                city=req.city or "Accra",
                country=invitation.country,
                is_verified=True,
                is_active=True,
                subscription_plan_code=invitation.assigned_plan_code,
                subscription_status="ACTIVE",
            )
            db.add(tenant)
            await db.flush()

            # 4. Create Main Facility Branch
            branch_display_name = (
                getattr(req, "facility_name", None)
                or invitation.company_name
                or tenant.name
                or "Healthcare Facility"
            )
            primary_branch = FacilityBranch(
                tenant_id=tenant.id,
                name=f"{branch_display_name} - Main Hub",
                code="MAIN-01",
                branch_type=BranchType.MAIN_HUB,
                is_main_hub=True,
                address=req.physical_address,
                city=req.city or "Accra",
                phone=req.phone_number,
                email=invitation.admin_email,
                is_active=True,
            )
            db.add(primary_branch)
            await db.flush()

            # 5. Create Root Admin User
            admin_role = (
                UserRole.PHARMACY_ADMIN
                if invitation.tenant_type == TenantType.PHARMACY
                else UserRole.HOSPITAL_ADMIN
            )
            root_user = User(
                email=invitation.admin_email,
                phone=req.phone_number,
                hashed_password=get_password_hash(req.password),
                full_name=req.admin_full_name,
                role=admin_role,
                tenant_id=tenant.id,
                license_number=req.registration_number,
                is_active=True,
                is_verified=True,
            )
            db.add(root_user)
            await db.flush()

            # 6. Mark Invitation Accepted
            invitation.status = InvitationStatus.ACCEPTED
            invitation.accepted_at = datetime.now(timezone.utc)
            invitation.created_tenant_id = tenant.id

            # 7. Audit Log
            audit = AuditLog(
                tenant_id=tenant.id,
                actor_id=root_user.id,
                actor_role=root_user.role.value if hasattr(root_user.role, "value") else str(root_user.role),
                action="TENANT_ONBOARDING_COMPLETED",
                resource_type="TENANT",
                resource_id=str(tenant.id),
                changes_json={
                    "company_name": tenant.name,
                    "tenant_type": str(tenant.tenant_type),
                    "plan": tenant.subscription_plan_code,
                    "admin_email": root_user.email,
                },
            )
            db.add(audit)
            await db.commit()
            await db.refresh(tenant)
            await db.refresh(root_user)

            # 8. Mint JWT Tokens
            user_role_str = root_user.role.value if hasattr(root_user.role, "value") else str(root_user.role)
            user_roles = root_user.normalized_roles or [user_role_str]
            access_token = create_access_token(
                subject=str(root_user.id),
                role=user_role_str,
                tenant_id=str(tenant.id),
                extra_claims={"roles": user_roles},
            )
            refresh_token = create_refresh_token(
                subject=str(root_user.id),
                role=user_role_str,
                tenant_id=str(tenant.id),
                extra_claims={"roles": user_roles},
            )

            default_redirect = "/pharmacy-admin" if invitation.tenant_type == TenantType.PHARMACY else "/hospital-admin"

            return CompanyOnboardingCompletionResponse(
                success=True,
                message=f"Welcome to Medipaedia! {tenant.name} has been successfully provisioned on the {tenant.subscription_plan_code} tier.",
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                tenant_id=tenant.id,
                tenant_name=tenant.name,
                tenant_slug=tenant.slug,
                tenant_type=tenant.tenant_type.value if hasattr(tenant.tenant_type, "value") else str(tenant.tenant_type),
                user_id=root_user.id,
                user_email=root_user.email,
                user_role=user_role_str,
                roles=user_roles,
                primary_role=user_roles[0] if user_roles else user_role_str,
                default_redirect_path=default_redirect,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error completing company onboarding: {e}", exc_info=True)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to complete facility onboarding: {str(e)}",
            )
