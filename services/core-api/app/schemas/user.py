from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator, model_validator
from app.core.email_verifier import validate_deliverable_email
from app.models.user import UserRole, normalize_roles_list


class UserBase(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    tenant_id: Optional[UUID] = None
    license_number: Optional[str] = None


class UserCreate(UserBase):
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: Optional[UUID] = None


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[str] = []
    primary_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _derive_roles_and_primary(self) -> "UserResponse":
        roles_list = normalize_roles_list(self.roles or [])
        if not roles_list and self.role:
            role_val = self.role.value if isinstance(self.role, UserRole) else str(self.role)
            roles_list = normalize_roles_list([role_val])
        self.roles = roles_list
        if not self.primary_role and roles_list:
            self.primary_role = roles_list[0]
        elif not self.primary_role and self.role:
            self.primary_role = self.role.value if isinstance(self.role, UserRole) else str(self.role)
        return self


# ============================================================================
# Admin User Management CRUD Schemas (tenant-scoped)
# ============================================================================

class AdminUserCreateRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255, description="Staff email, unique per facility")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full display name")
    password: str = Field(..., min_length=8, description="Temporary or permanent password")
    phone: Optional[str] = Field(None, max_length=30)
    roles: List[str] = Field(default_factory=list, description="Assigned role hat list e.g. ['HOSPITAL_ADMIN','DOCTOR']")
    role: Optional[UserRole] = Field(None, description="Legacy scalar role (backfilled from roles[0] if omitted)")
    license_number: Optional[str] = Field(None, max_length=64)
    is_active: bool = False

    @field_validator("email")
    @classmethod
    def validate_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)

    @model_validator(mode="after")
    def _normalize_and_backfill(self) -> "AdminUserCreateRequest":
        self.roles = normalize_roles_list(self.roles or [])
        if not self.roles and self.role is not None:
            role_val = self.role.value if isinstance(self.role, UserRole) else str(self.role)
            self.roles = normalize_roles_list([role_val])
        if self.role is None and self.roles:
            try:
                self.role = UserRole(self.roles[0])
            except ValueError:
                pass
        return self


class AdminUserPatchRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    roles: Optional[List[str]] = Field(None, description="Replacement role hats, list-only semantics")
    is_active: Optional[bool] = None
    license_number: Optional[str] = Field(None, max_length=64)

    @model_validator(mode="after")
    def _normalize_roles(self) -> "AdminUserPatchRequest":
        if self.roles is not None:
            self.roles = normalize_roles_list(self.roles)
        return self


class AdminUserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminUserDeleteResponse(BaseModel):
    success: bool
    user_id: UUID
    action: str
    message: str
