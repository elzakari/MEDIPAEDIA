from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

# Geographic Coordinates (supports PostGIS when available or Float lat/lng)
location_column = Column(Text, nullable=True)


class GlobalMedication(BaseModel):
    """
    Standardized global pharmaceutical registry.
    """
    __tablename__ = "global_medications"

    generic_name = Column(String(255), index=True, nullable=False)
    brand_name = Column(String(255), index=True, nullable=False)
    dosage_form = Column(String(100), nullable=False)  # Tablet, Syrup, Injection, Capsule
    strength = Column(String(100), nullable=False)  # 500mg, 250mg/5ml
    category = Column(String(100), nullable=True)  # Antibiotics, Analgesics, Antihypertensives
    nafdac_fda_number = Column(String(100), unique=True, nullable=True)  # Regulatory drug registry
    description = Column(Text, nullable=True)
    therapeutic_class = Column(String(150), nullable=True)
    poison_schedule = Column(String(50), default="OTC", nullable=True)  # OTC, PRESCRIPTION_ONLY, CLASS_A_NARCOTIC, CLASS_B_POISON
    standard_dosing = Column(String(255), nullable=True)
    is_cold_chain = Column(Boolean, default=False, nullable=False)
    storage_temp_min = Column(Float, nullable=True)  # e.g. 2.0 C
    storage_temp_max = Column(Float, nullable=True)  # e.g. 8.0 C
    linked_icd10_codes = Column(String(255), nullable=True)

    # Relationships
    inventories = relationship("PharmacyInventory", back_populates="medication")



class PharmacyInventory(BaseModel):
    """
    Tenant-specific stock and inventory with live pricing and physical coordinates.
    """
    __tablename__ = "pharmacy_inventories"

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    global_medication_id = Column(
        UUID(as_uuid=True),
        ForeignKey("global_medications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    sku = Column(String(100), nullable=False)
    batch_number = Column(String(100), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)  # Local currency, e.g. GHS 12.50
    quantity_available = Column(Integer, default=0, nullable=False)
    reorder_threshold = Column(Integer, default=10, nullable=False)
    expiry_date = Column(Date, nullable=False)
    is_available_for_marketplace = Column(Boolean, default=True, nullable=False)

    # Geo-point replicated from Tenant for fast spatial distance calculations
    location = location_column
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="inventories")
    medication = relationship("GlobalMedication", back_populates="inventories")
    order_items = relationship("OrderItem", back_populates="inventory")
