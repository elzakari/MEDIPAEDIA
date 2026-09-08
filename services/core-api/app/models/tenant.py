from decimal import Decimal
import enum
from sqlalchemy import Boolean, Column, Enum, Float, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SubscriptionPlan(BaseModel):
    """
    Multi-Country SaaS Billing Plans (Ghana GHS, UEMOA XOF, USD).
    """
    __tablename__ = "subscription_plans"

    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    tier = Column(String(50), default="GROWTH", nullable=False)
    target_facility_type = Column(String(50), default="ALL", nullable=False)
    description = Column(Text, nullable=True)
    price_ghs_monthly = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_xof_monthly = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_usd_monthly = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_ghs_annual = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_xof_annual = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_usd_annual = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    trial_days = Column(Integer, default=14, nullable=False)
    max_staff_seats = Column(Integer, default=25, nullable=False)
    max_beds = Column(Integer, default=50, nullable=False)
    max_monthly_rx = Column(Integer, default=5000, nullable=False)
    max_branches = Column(Integer, default=3, nullable=False)
    feature_flags = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class SubscriptionFeatureCatalog(BaseModel):
    """
    Granular Platform Feature & Module Registry for Dynamic Capability Entitlements.
    """
    __tablename__ = "subscription_features_catalog"

    feature_key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(100), default="CLINICAL", nullable=False)
    description = Column(Text, nullable=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


# Geographic Coordinates (supports PostGIS when available or Float lat/lng)
location_column = Column(Text, nullable=True)


class TenantType(str, enum.Enum):
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    PHARMACY = "PHARMACY"


class Tenant(BaseModel):
    __tablename__ = "tenants"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    tenant_type = Column(
        Enum(TenantType, name="tenant_type_enum"),
        nullable=False,
        index=True,
    )
    license_number = Column(String(100), unique=True, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(50), default="Ghana", nullable=False)
    currency = Column(String(10), default="GHS", nullable=False)
    country_iso_alpha2 = Column(String(2), nullable=True)

    # PostGIS Geographic Coordinates (SRID 4326 - WGS 84)
    location = location_column
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Subscription Entitlements Tier (PLAN-STARTER, PLAN-GROWTH, PLAN-ENTERPRISE)
    subscription_plan_code = Column(String(50), default="PLAN-GROWTH", nullable=False)
    subscription_status = Column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    patient_cards = relationship(
        "HospitalPatientCard", back_populates="tenant", cascade="all, delete-orphan"
    )
    consultations = relationship("Consultation", back_populates="tenant")
    prescriptions = relationship("Prescription", back_populates="tenant")
    inventories = relationship(
        "PharmacyInventory", back_populates="tenant", cascade="all, delete-orphan"
    )
    orders = relationship("Order", back_populates="pharmacy_tenant")
    branches = relationship(
        "FacilityBranch", back_populates="tenant", cascade="all, delete-orphan"
    )
    ibt_transfers = relationship(
        "InterBranchTransfer", back_populates="tenant", cascade="all, delete-orphan"
    )

