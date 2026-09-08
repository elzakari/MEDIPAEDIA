import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, event, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, Mapper
from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    # Tier 0 Platform Governance
    SUPER_ADMIN = "SUPER_ADMIN"

    # Hospital Clinical & Administrative Roles
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    HOSPITAL_FINANCE = "HOSPITAL_FINANCE"
    RECORD_CLERK = "RECORD_CLERK"

    # Pharmacy & Dispensary Roles
    PHARMACY_ADMIN = "PHARMACY_ADMIN"
    PHARMACY_FINANCE = "PHARMACY_FINANCE"
    SUPERINTENDENT_PHARMACIST = "SUPERINTENDENT_PHARMACIST"
    PHARMACIST = "PHARMACIST"

    # Legacy & General Roles
    TENANT_ADMIN = "TENANT_ADMIN"
    PATIENT = "PATIENT"


_VALID_USER_ROLE_VALUES = {role.value for role in UserRole}


def normalize_roles_list(roles: object) -> List[str]:
    if roles is None:
        return []
    if isinstance(roles, list):
        cleaned: List[str] = []
        seen = set()
        for r in roles:
            s = r.value if isinstance(r, UserRole) else (str(r).strip() if r is not None else "")
            if s and s in _VALID_USER_ROLE_VALUES and s not in seen:
                cleaned.append(s)
                seen.add(s)
        return cleaned
    if isinstance(roles, UserRole):
        return [roles.value]
    s = str(roles).strip()
    return [s] if s in _VALID_USER_ROLE_VALUES else []


class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_tenant_user_email"),
    )

    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role_enum", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        default=UserRole.PATIENT,
        index=True,
    )
    roles = Column(
        ARRAY(String(64)),
        nullable=False,
        default=list,
        server_default="ARRAY[]::TEXT[]",
    )

    # Optional Tenant assignment (Null for SUPER_ADMIN and pure PATIENT users)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    license_number = Column(String(100), nullable=True)  # MDCN, GMC, or Pharmacy Council ID
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    patient_profile = relationship(
        "PatientAccount", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    staff_profile = relationship(
        "StaffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    consultations = relationship(
        "Consultation",
        back_populates="doctor",
        foreign_keys="[Consultation.doctor_id]",
    )
    prescriptions_authored = relationship(
        "Prescription",
        back_populates="doctor",
        foreign_keys="[Prescription.doctor_id]",
    )
    vitals_recorded = relationship(
        "Vitals",
        back_populates="recorded_by_nurse",
        foreign_keys="[Vitals.recorded_by_nurse_id]",
    )
    password_resets = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    @property
    def normalized_roles(self) -> List[str]:
        return normalize_roles_list(self.roles)

    @property
    def primary_role(self) -> Optional[str]:
        roles = self.normalized_roles
        if roles:
            return roles[0]
        if self.role:
            return self.role.value if isinstance(self.role, UserRole) else str(self.role)
        return None


@event.listens_for(User, "before_insert")
@event.listens_for(User, "before_update")
def _sync_user_role_and_roles(mapper: Mapper, connection, target: User) -> None:
    """
    Bidirectional sync between legacy scalar `role` column (nullable Enum) and new `roles` list.
    - Empty roles list is back-filled from legacy scalar `role`
    - Scalar role is always kept in sync with roles[0] (when non-empty) for backwards-compat queries.
    - Validates every element in roles is a valid UserRole value and deduplicates.
    """
    normalized = normalize_roles_list(target.roles)
    if not normalized and target.role:
        role_value = target.role.value if isinstance(target.role, UserRole) else str(target.role)
        if role_value in _VALID_USER_ROLE_VALUES:
            normalized = [role_value]
    target.roles = normalized
    if normalized:
        try:
            target.role = UserRole(normalized[0])
        except ValueError:
            target.role = target.role if target.role is not None else UserRole.PATIENT
    elif target.role is None:
        target.role = UserRole.PATIENT


class PasswordResetToken(BaseModel):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    email_address = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    used = Column(Boolean, nullable=False, default=False, server_default="false")
    used_at = Column(DateTime(timezone=True), nullable=True)
    client_ip = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)

    user = relationship("User", back_populates="password_resets")
    tenant = relationship("Tenant")

