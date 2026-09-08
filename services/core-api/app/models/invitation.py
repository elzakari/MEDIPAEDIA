from datetime import datetime, timezone
import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.tenant import TenantType
from app.models.user import UserRole


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class TenantOnboardingInvitation(BaseModel):
    """
    Super Admin invitation for hospital, clinic, or pharmacy company onboarding.
    Token validity: 72 hours.
    """
    __tablename__ = "tenant_onboarding_invitations"

    token = Column(String(100), unique=True, index=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    admin_email = Column(String(255), index=True, nullable=False)
    tenant_type = Column(
        Enum(TenantType, name="tenant_type_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=TenantType.HOSPITAL,
        nullable=False,
    )
    country = Column(String(100), default="Ghana", nullable=False)
    currency = Column(String(10), default="GHS", nullable=False)
    assigned_plan_code = Column(String(50), default="PLAN-GROWTH", nullable=False)
    
    status = Column(
        Enum(InvitationStatus, name="invitation_status_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=InvitationStatus.PENDING,
        nullable=False,
        index=True,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    created_tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
    )
    invited_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_tenant = relationship("Tenant", foreign_keys=[created_tenant_id])
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])


class StaffOnboardingInvitation(BaseModel):
    """
    Tenant Admin invitation for clinical, dispensary, and administrative staff.
    Token validity: 48 hours.
    """
    __tablename__ = "staff_onboarding_invitations"

    token = Column(String(100), unique=True, index=True, nullable=False)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email = Column(String(255), index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    branch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facility_branches.id", ondelete="SET NULL"),
        nullable=True,
    )

    status = Column(
        Enum(InvitationStatus, name="invitation_status_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=InvitationStatus.PENDING,
        nullable=False,
        index=True,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    created_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    invited_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    branch = relationship("FacilityBranch", foreign_keys=[branch_id])
    created_user = relationship("User", foreign_keys=[created_user_id])
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
