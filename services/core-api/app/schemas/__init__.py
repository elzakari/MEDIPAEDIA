from app.schemas.health import HealthCheckResponse
from app.schemas.tenant import TenantCreate, TenantResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.schemas.auth import (
    StaffLoginRequest,
    PatientRegisterRequest,
    PatientLoginRequest,
    TokenRefreshRequest,
    FacilitySelectRequest,
    TokenPairResponse,
    AuthMeResponse,
)
from app.schemas.patient import (
    PatientAccountCreate,
    PatientAccountResponse,
    HospitalPatientCardResponse,
)
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionItemCreate,
    PrescriptionItemResponse,
    PrescriptionVerifyRequest,
)
from app.schemas.inventory import (
    GlobalMedicationResponse,
    PharmacyInventoryCreate,
    PharmacyInventoryResponse,
)
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
    VitalsCreate,
    VitalsResponse,
)

__all__ = [
    "HealthCheckResponse",
    "TenantCreate",
    "TenantResponse",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "StaffLoginRequest",
    "PatientRegisterRequest",
    "PatientLoginRequest",
    "TokenRefreshRequest",
    "FacilitySelectRequest",
    "TokenPairResponse",
    "AuthMeResponse",
    "PatientAccountCreate",
    "PatientAccountResponse",
    "HospitalPatientCardResponse",
    "PrescriptionCreate",
    "PrescriptionResponse",
    "PrescriptionItemCreate",
    "PrescriptionItemResponse",
    "PrescriptionVerifyRequest",
    "GlobalMedicationResponse",
    "PharmacyInventoryCreate",
    "PharmacyInventoryResponse",
    "OrderCreate",
    "OrderResponse",
    "OrderItemResponse",
    "ConsultationCreate",
    "ConsultationResponse",
    "VitalsCreate",
    "VitalsResponse",
]
