from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.models.tenant import TenantType
from app.models.user import UserRole, normalize_roles_list


# ============================================================================
# Company / Facility Onboarding Schemas (Super Admin -> Facility Owner)
# ============================================================================

class CompanyInvitationCreateRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255, example="Korle Bu Teaching Hospital")
    admin_email: EmailStr = Field(..., example="admin@korlebu.gov.gh")
    tenant_type: TenantType = Field(default=TenantType.HOSPITAL)
    country: str = Field(default="Ghana", example="Ghana")
    currency: str = Field(default="GHS", example="GHS")
    assigned_plan_code: str = Field(default="PLAN-GROWTH", example="PLAN-GROWTH")


class CompanyInviteSubmissionRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255, example="Korle Bu Teaching Hospital")
    admin_email: EmailStr = Field(..., example="admin@korlebu.gov.gh")
    admin_phone: str = Field(..., min_length=9, max_length=30, example="+233244123456")
    tenant_type: TenantType = Field(default=TenantType.HOSPITAL)
    city: str = Field(default="Accra", example="Accra")
    country: str = Field(default="Ghana", example="Ghana")
    currency: str = Field(default="GHS", example="GHS")
    note: Optional[str] = Field(None, max_length=500, example="We are a 200-bed municipal hospital seeking accreditation.")


class CompanyInvitationResponse(BaseModel):
    id: uuid.UUID
    token: str
    company_name: str
    admin_email: str
    tenant_type: str
    country: str
    currency: str
    assigned_plan_code: str
    status: str
    expires_at: datetime
    onboarding_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyVerificationResponse(BaseModel):
    valid: bool
    token: str
    company_name: str
    admin_email: str
    tenant_type: str
    country: str
    currency: str
    assigned_plan_code: str
    expires_at: datetime


class CompanyOnboardingCompletionRequest(BaseModel):
    token: str = Field(..., description="Invitation token from onboarding link")
    admin_full_name: str = Field(..., min_length=2, max_length=255, example="Dr. Kwesi Appiah")
    password: str = Field(..., min_length=8, example="SecureHospitalPass@2026")
    phone_number: str = Field(..., min_length=8, max_length=30, example="+233244123456")
    registration_number: Optional[str] = Field(None, example="HeFRA/GAR/HOS/2026/042")
    physical_address: Optional[str] = Field(None, example="Giffard Road, Cantonments, Accra")
    digital_address: Optional[str] = Field(None, example="GA-102-4921")
    city: Optional[str] = Field("Accra", example="Accra")
    facility_name: Optional[str] = Field(None, min_length=2, max_length=255, example="Korle Bu Main Facility")


class CompanyOnboardingCompletionResponse(BaseModel):
    success: bool
    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    tenant_id: uuid.UUID
    tenant_name: str
    tenant_slug: str
    tenant_type: str
    user_id: uuid.UUID
    user_email: str
    user_role: str
    roles: List[str] = []
    primary_role: Optional[str] = None
    default_redirect_path: str

    @model_validator(mode="after")
    def _derive_roles_and_primary(self) -> "CompanyOnboardingCompletionResponse":
        roles_list = normalize_roles_list(self.roles or [])
        if not roles_list and self.user_role:
            roles_list = normalize_roles_list([self.user_role])
        self.roles = roles_list
        if not self.primary_role and roles_list:
            self.primary_role = roles_list[0]
        elif not self.primary_role and self.user_role:
            self.primary_role = self.user_role
        return self


# ============================================================================
# Staff Onboarding Schemas (Tenant Admin -> Doctor/Nurse/Pharmacist)
# ============================================================================

class StaffInvitationCreateRequest(BaseModel):
    email: EmailStr = Field(..., example="nurse.abena@ridgehospital.gov.gh")
    first_name: str = Field(..., min_length=1, max_length=100, example="Abena")
    last_name: str = Field(..., min_length=1, max_length=100, example="Osei")
    role: UserRole = Field(..., example=UserRole.NURSE)
    branch_id: Optional[uuid.UUID] = Field(None, description="Optional facility branch UUID")


class StaffInvitationResponse(BaseModel):
    id: uuid.UUID
    token: str
    tenant_id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    branch_id: Optional[uuid.UUID] = None
    status: str
    expires_at: datetime
    invitation_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class StaffVerificationResponse(BaseModel):
    valid: bool
    token: str
    email: str
    first_name: str
    last_name: str
    role: str
    facility_name: str
    tenant_type: str
    branch_name: Optional[str] = None
    expires_at: datetime


class StaffOnboardingCompletionRequest(BaseModel):
    token: str = Field(..., description="Invitation token from email link")
    password: str = Field(..., min_length=8, example="StaffClinical@2026")
    phone_number: Optional[str] = Field(None, example="+233201928374")
    license_number: Optional[str] = Field(None, example="MDC/RN/2024/9182")
    license_expiry: Optional[str] = Field(None, example="2027-12-31")


class StaffOnboardingCompletionResponse(BaseModel):
    success: bool
    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    email: str
    full_name: str
    role: str
    roles: List[str] = []
    primary_role: Optional[str] = None
    tenant_id: uuid.UUID
    default_redirect_path: str

    @model_validator(mode="after")
    def _derive_roles_and_primary(self) -> "StaffOnboardingCompletionResponse":
        roles_list = normalize_roles_list(self.roles or [])
        if not roles_list and self.role:
            roles_list = normalize_roles_list([self.role])
        self.roles = roles_list
        if not self.primary_role and roles_list:
            self.primary_role = roles_list[0]
        elif not self.primary_role and self.role:
            self.primary_role = self.role
        return self


class StaffSeatQuotaSummary(BaseModel):
    active_seats: int
    max_seats: int
    seats_remaining: int
    plan_name: str
    tier: str
