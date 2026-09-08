from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class StaffProfile(BaseModel):
    __tablename__ = "staff_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Regulatory Credentials & Licensing
    license_number = Column(String(100), nullable=True, index=True)  # MDC / Pharmacy Council PIN
    licensing_body = Column(String(150), nullable=True)  # e.g. Medical and Dental Council (MDC Ghana)
    department = Column(String(100), nullable=True)  # OPD, Triage, Dispensary, Finance
    specialization = Column(String(150), nullable=True)  # e.g. General Medicine, Critical Care, Pharmacotherapy

    # Clinical & Governance Capability Flags
    can_prescribe_narcotics = Column(Boolean, default=False, nullable=False)
    can_authorize_quarantine = Column(Boolean, default=False, nullable=False)
    can_collect_cash = Column(Boolean, default=False, nullable=False)
    can_initiate_payout = Column(Boolean, default=False, nullable=False)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="staff_profile")
    tenant = relationship("Tenant")
