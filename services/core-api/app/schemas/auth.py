from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from app.models.tenant import TenantType
from app.models.user import UserRole, normalize_roles_list
from app.schemas.patient import HospitalPatientCardResponse, PatientAccountResponse
from app.schemas.tenant import TenantResponse


class StaffLoginRequest(BaseModel):
    email: Optional[EmailStr] = Field(
        None, description="Staff email address (preferred identifier)"
    )
    identifier: Optional[str] = Field(
        None,
        description="Flexible staff identifier: email, phone, MDC/Pharmacy Council license number, or MDC practitioner ID",
        min_length=2,
        max_length=255,
    )
    password: str
    facility_slug: Optional[str] = Field(
        None, description="Optional facility slug for staff login validation"
    )
    tenant_id: Optional[UUID] = Field(
        None,
        description="Optional tenant_id to disambiguate when the same email exists across multiple facilities",
    )

    @property
    def canonical_identifier(self) -> str:
        raw = self.identifier or self.email or ""
        return raw.strip()


class PatientRegisterRequest(BaseModel):
    full_name: str
    phone: str
    password: str
    email: Optional[EmailStr] = None
    ghana_card_id: Optional[str] = Field(
        None, description="National Identity number e.g. GHA-712345678-9"
    )
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientLoginRequest(BaseModel):
    identifier: str = Field(
        ...,
        description="Patient email, phone number, or Ghana Card ID",
    )
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class FacilitySelectRequest(BaseModel):
    facility_id: UUID


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user_id: UUID
    full_name: str
    role: UserRole
    roles: List[str] = []
    primary_role: Optional[str] = None
    tenant_id: Optional[UUID] = None
    active_tenant: Optional[TenantResponse] = None
    default_redirect_path: str = "/"

    @model_validator(mode="after")
    def _derive_roles_and_primary(self) -> "TokenPairResponse":
        roles_list = normalize_roles_list(self.roles or [])
        if not roles_list and self.role:
            try:
                roles_list = [self.role.value]
            except Exception:
                roles_list = [str(self.role)]
        object.__setattr__(self, "roles", roles_list)
        object.__setattr__(self, "primary_role", roles_list[0] if roles_list else None)
        if roles_list and (not self.role):
            try:
                object.__setattr__(self, "role", UserRole(roles_list[0]))
            except ValueError:
                pass
        return self


class AuthMeResponse(BaseModel):
    user_id: UUID
    email: str
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    roles: List[str] = []
    primary_role: Optional[str] = None
    tenant_id: Optional[UUID] = None
    active_tenant: Optional[TenantResponse] = None
    patient_profile: Optional[PatientAccountResponse] = None
    linked_facilities: List[HospitalPatientCardResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _derive_roles_and_primary_me(self) -> "AuthMeResponse":
        roles_list = normalize_roles_list(self.roles or [])
        if not roles_list and self.role:
            try:
                roles_list = [self.role.value]
            except Exception:
                roles_list = [str(self.role)]
        object.__setattr__(self, "roles", roles_list)
        object.__setattr__(self, "primary_role", roles_list[0] if roles_list else None)
        return self


class MultiFacilityLoginItem(BaseModel):
    id: UUID
    name: str
    tenant_type: Optional[TenantType] = None
    user_roles: List[str] = []
    primary_role: Optional[str] = None


class MultiFacilityLoginResponse(BaseModel):
    multiple_facilities: bool = True
    facilities: List[MultiFacilityLoginItem] = []


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Staff email address OR council / license PIN used to sign in.",
    )


class ForgotPasswordResponse(BaseModel):
    sent: bool = True
    message: str = (
        "If a matching account exists, a password reset link has been dispatched."
    )


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        ...,
        min_length=16,
        max_length=256,
        description="Raw reset token extracted from the ?token=... query parameter of the reset URL.",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=255,
        description="New password. Frontend enforces uppercase, digit, and symbol rules; backend enforces min_length=8.",
    )


class ResetPasswordResponse(BaseModel):
    success: bool = True
    message: str = (
        "Your password has been updated. Sign in with your new credentials."
    )


class UserSessionItem(BaseModel):
    session_id: str
    ip_address: str
    user_agent: str
    device_name: str
    created_at: float
    last_active: float
    is_current: bool = False


class LogoutResponse(BaseModel):
    success: bool = True
    message: str = "Successfully logged out and session revoked."

