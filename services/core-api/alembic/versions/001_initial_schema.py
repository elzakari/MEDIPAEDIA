"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-16 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # 1. Tenants table
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("tenant_type", sa.Enum("HOSPITAL", "CLINIC", "PHARMACY", name="tenant_type_enum"), nullable=False),
        sa.Column("license_number", sa.String(100), unique=True, nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("country", sa.String(50), server_default="Ghana", nullable=False),
        sa.Column("location", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])
    op.create_index("ix_tenants_tenant_type", "tenants", ["tenant_type"])

    # 2. Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("phone", sa.String(50), unique=True, nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("SUPER_ADMIN", "TENANT_ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT", name="user_role_enum"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
        sa.Column("license_number", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    # 3. Patient Accounts table
    op.create_table(
        "patient_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("ghana_card_id", sa.String(50), unique=True, nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("blood_group", sa.String(10), nullable=True),
        sa.Column("allergies", sa.Text(), nullable=True),
        sa.Column("emergency_contact_name", sa.String(255), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_patient_accounts_ghana_card_id", "patient_accounts", ["ghana_card_id"])

    # 4. Hospital Patient Cards table
    op.create_table(
        "hospital_patient_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("patient_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patient_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mrn", sa.String(100), nullable=False),
        sa.Column("qr_token", sa.String(255), unique=True, nullable=False),
        sa.Column("registration_fee_paid", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_hospital_patient_cards_mrn", "hospital_patient_cards", ["mrn"])
    op.create_index("ix_hospital_patient_cards_qr_token", "hospital_patient_cards", ["qr_token"])

    # 5. Consultations table
    op.create_table(
        "consultations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("hospital_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hospital_patient_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("chief_complaint", sa.Text(), nullable=False),
        sa.Column("history_of_present_illness", sa.Text(), nullable=True),
        sa.Column("examination_findings", sa.Text(), nullable=True),
        sa.Column("clinical_notes", sa.Text(), nullable=True),
        sa.Column("icd10_diagnosis_code", sa.String(20), nullable=True),
        sa.Column("diagnosis_description", sa.String(255), nullable=True),
        sa.Column("consultation_status", sa.Enum("IN_PROGRESS", "COMPLETED", "REFERRED", "CANCELLED", name="consultation_status_enum"), server_default="IN_PROGRESS", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 6. Vitals table
    op.create_table(
        "vitals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("patient_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patient_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recorded_by_nurse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("systolic_bp", sa.Integer(), nullable=True),
        sa.Column("diastolic_bp", sa.Integer(), nullable=True),
        sa.Column("heart_rate", sa.Integer(), nullable=True),
        sa.Column("respiratory_rate", sa.Integer(), nullable=True),
        sa.Column("spo2", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("bmi", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 7. Prescriptions table
    op.create_table(
        "prescriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("prescription_number", sa.String(100), unique=True, nullable=False),
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("patient_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patient_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("verification_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("access_code", sa.String(20), unique=True, nullable=False),
        sa.Column("status", sa.Enum("PENDING", "PARTIALLY_DISPENSED", "DISPENSED", "CANCELLED", "EXPIRED", name="prescription_status_enum"), server_default="PENDING", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_prescriptions_prescription_number", "prescriptions", ["prescription_number"])
    op.create_index("ix_prescriptions_verification_hash", "prescriptions", ["verification_hash"])
    op.create_index("ix_prescriptions_access_code", "prescriptions", ["access_code"])

    # 8. Prescription Items table
    op.create_table(
        "prescription_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("medication_name", sa.String(255), nullable=False),
        sa.Column("dosage", sa.String(100), nullable=False),
        sa.Column("frequency", sa.String(100), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("quantity_prescribed", sa.Integer(), nullable=False),
        sa.Column("quantity_dispensed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 9. Global Medications table
    op.create_table(
        "global_medications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("generic_name", sa.String(255), nullable=False),
        sa.Column("brand_name", sa.String(255), nullable=False),
        sa.Column("dosage_form", sa.String(100), nullable=False),
        sa.Column("strength", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("nafdac_fda_number", sa.String(100), unique=True, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_global_medications_generic_name", "global_medications", ["generic_name"])
    op.create_index("ix_global_medications_brand_name", "global_medications", ["brand_name"])

    # 10. Pharmacy Inventories table
    op.create_table(
        "pharmacy_inventories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("global_medication_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("global_medications.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("batch_number", sa.String(100), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("cost_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("quantity_available", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("location", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_available_for_marketplace", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("requires_prescription", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_pharmacy_inventories_sku", "pharmacy_inventories", ["sku"])
    op.create_index("ix_pharmacy_inventories_batch_number", "pharmacy_inventories", ["batch_number"])

    # 11. Orders table
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("order_number", sa.String(100), unique=True, nullable=False),
        sa.Column("patient_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patient_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pharmacy_tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("escrow_status", sa.Enum("HELD", "RELEASED", "REFUNDED", name="escrow_status_enum"), server_default="HELD", nullable=False),
        sa.Column("payment_status", sa.Enum("PENDING", "PAID", "FAILED", "REFUNDED", name="payment_status_enum"), server_default="PENDING", nullable=False),
        sa.Column("fulfillment_type", sa.Enum("PICKUP", "DELIVERY", name="fulfillment_type_enum"), server_default="PICKUP", nullable=False),
        sa.Column("paystack_reference", sa.String(255), unique=True, nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("delivery_location", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True),
        sa.Column("delivery_latitude", sa.Float(), nullable=True),
        sa.Column("delivery_longitude", sa.Float(), nullable=True),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("escrow_fee", sa.Numeric(12, 2), server_default=sa.text("0.00"), nullable=False),
        sa.Column("delivery_fee", sa.Numeric(12, 2), server_default=sa.text("0.00"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_orders_order_number", "orders", ["order_number"])
    op.create_index("ix_orders_paystack_reference", "orders", ["paystack_reference"])

    # 12. Order Items table
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pharmacy_inventories.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 13. Audit Logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_role", sa.String(50), nullable=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("changes_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_logs_action_resource", "audit_logs", ["action", "resource_type"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("pharmacy_inventories")
    op.drop_table("global_medications")
    op.drop_table("prescription_items")
    op.drop_table("prescriptions")
    op.drop_table("vitals")
    op.drop_table("consultations")
    op.drop_table("hospital_patient_cards")
    op.drop_table("patient_accounts")
    op.drop_table("users")
    op.drop_table("tenants")
    op.execute("DROP TYPE IF EXISTS fulfillment_type_enum")
    op.execute("DROP TYPE IF EXISTS payment_status_enum")
    op.execute("DROP TYPE IF EXISTS escrow_status_enum")
    op.execute("DROP TYPE IF EXISTS prescription_status_enum")
    op.execute("DROP TYPE IF EXISTS consultation_status_enum")
    op.execute("DROP TYPE IF EXISTS user_role_enum")
    op.execute("DROP TYPE IF EXISTS tenant_type_enum")
