"""
==============================================================================
Medipaedia Production Live Database Initializer & Statutory Seed Verifier
==============================================================================
Ensures zero-state production onboarding readiness:
1. Super Admin platform master account provisioning.
2. Statutory WHO & Ghana FDA essential medicine registry (GlobalMedication).
3. Statutory ICD-10 diagnostic master database (ICD10Code).
4. Statutory multi-country subscription plans & feature entitlements catalog.
5. Live payment gateway provider configuration validation.
"""

from decimal import Decimal
import logging
import os
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.clinical import ICD10Code, NHISGDRGTariff
from app.models.inventory import GlobalMedication
from app.models.tenant import SubscriptionFeatureCatalog, SubscriptionPlan
from app.models.user import User, UserRole

from app.db.seeders import (
    seed_essential_formulary,
    seed_nhis_gdrg_tariffs,
    GHANA_FDA_WHO_ESSENTIAL_FORMULARY,
    GHANA_NHIS_GDRG_TARIFFS,
)

logger = logging.getLogger("medipaedia.db.init")


# ==============================================================================
# 1. Statutory WHO / Ghana FDA Essential Molecules (West Africa Drug Master)
# ==============================================================================
WHO_WEST_AFRICA_ESSENTIAL_DRUGS: List[Dict[str, Any]] = [
    {
        "generic_name": "Artemether + Lumefantrine",
        "brand_name": "Coartem / Artefan",
        "dosage_form": "Tablet",
        "strength": "20mg/120mg",
        "category": "Antimalarial (ACT)",
        "nafdac_fda_number": "FDA/SD.24-0012",
        "description": "First-line Artemisinin-based Combination Therapy for uncomplicated Plasmodium falciparum malaria in West Africa.",
    },
    {
        "generic_name": "Amoxicillin + Clavulanic Acid",
        "brand_name": "Augmentin / AmoxClav",
        "dosage_form": "Tablet",
        "strength": "625mg",
        "category": "Broad-Spectrum Antibiotic",
        "nafdac_fda_number": "FDA/SD.24-0045",
        "description": "Beta-lactam and beta-lactamase inhibitor for respiratory, ENT, and soft tissue bacterial infections.",
    },
    {
        "generic_name": "Paracetamol (Acetaminophen)",
        "brand_name": "Panadol / Para-Denk",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "category": "Analgesic & Antipyretic",
        "nafdac_fda_number": "FDA/SD.24-0089",
        "description": "First-line non-opioid pain relief and fever reducer for outpatient and clinical wards.",
    },
    {
        "generic_name": "Ciprofloxacin Hydrochloride",
        "brand_name": "Cipro / Cipro-Denk",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "category": "Fluoroquinolone Antibiotic",
        "nafdac_fda_number": "FDA/SD.24-0102",
        "description": "Broad-spectrum antimicrobial indicated for enteric fever (Typhoid), complicated UTIs, and bacterial diarrhea.",
    },
    {
        "generic_name": "Metformin Hydrochloride",
        "brand_name": "Glucophage",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "category": "Oral Antidiabetic (Biguanide)",
        "nafdac_fda_number": "FDA/SD.24-0125",
        "description": "First-line pharmacotherapy for Type 2 Diabetes Mellitus management and glycemic control.",
    },
    {
        "generic_name": "Amlodipine Besylate",
        "brand_name": "Norvasc / Amlod",
        "dosage_form": "Tablet",
        "strength": "10mg",
        "category": "Antihypertensive (Calcium Channel Blocker)",
        "nafdac_fda_number": "FDA/SD.24-0156",
        "description": "Dihydropyridine CCB for essential hypertension and chronic stable angina management.",
    },
    {
        "generic_name": "Omeprazole",
        "brand_name": "Losec / Ocid",
        "dosage_form": "Capsule (Enteric Coated)",
        "strength": "20mg",
        "category": "Proton Pump Inhibitor (PPI)",
        "nafdac_fda_number": "FDA/SD.24-0178",
        "description": "Suppresses gastric acid secretion; indicated for peptic ulcer disease and GERD.",
    },
    {
        "generic_name": "Oral Rehydration Salts (ORS)",
        "brand_name": "WHO Low-Osmolarity ORS",
        "dosage_form": "Sachet Powder",
        "strength": "20.5g/L",
        "category": "Electrolyte & Fluid Replacement",
        "nafdac_fda_number": "FDA/SD.24-0199",
        "description": "Low-osmolarity formula for oral management of diarrheal dehydration in pediatric and adult patients.",
    },
    {
        "generic_name": "Azithromycin",
        "brand_name": "Zithromax",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "category": "Macrolide Antibiotic",
        "nafdac_fda_number": "FDA/SD.24-0210",
        "description": "Macrolide for atypical pneumonias, urethritis, and soft tissue bacterial infections.",
    },
    {
        "generic_name": "Losartan Potassium",
        "brand_name": "Cozaar",
        "dosage_form": "Tablet",
        "strength": "50mg",
        "category": "Antihypertensive (ARB)",
        "nafdac_fda_number": "FDA/SD.24-0234",
        "description": "Angiotensin II Receptor Blocker for hypertension and diabetic nephropathy protection.",
    },
    {
        "generic_name": "Zinc Sulphate",
        "brand_name": "ZincKid / Zincol",
        "dosage_form": "Dispersible Tablet",
        "strength": "20mg",
        "category": "Essential Mineral & Antidiarrheal",
        "nafdac_fda_number": "FDA/SD.24-0255",
        "description": "Adjunctive micronutrient therapy with ORS for acute childhood diarrhea duration reduction.",
    },
    {
        "generic_name": "Salbutamol (Albuterol)",
        "brand_name": "Ventolin Inhaler",
        "dosage_form": "Metered Dose Inhaler",
        "strength": "100mcg/puff",
        "category": "Short-Acting Beta-2 Agonist (SABA)",
        "nafdac_fda_number": "FDA/SD.24-0280",
        "description": "Rapid bronchodilator for acute asthma exacerbation and bronchospasm relief.",
    },
]


# ==============================================================================
# 2. Statutory ICD-10 Diagnostic Master Registry
# ==============================================================================
STATUTORY_ICD10_REGISTRY: List[Dict[str, Any]] = [
    {
        "code": "B50.9",
        "title": "Plasmodium falciparum malaria, unspecified",
        "category": "Infectious & Parasitic Diseases",
        "is_common_tropical": True,
    },
    {
        "code": "I10",
        "title": "Essential (primary) hypertension",
        "category": "Diseases of the Circulatory System",
        "is_common_tropical": False,
    },
    {
        "code": "J06.9",
        "title": "Acute upper respiratory infection, unspecified",
        "category": "Diseases of the Respiratory System",
        "is_common_tropical": False,
    },
    {
        "code": "A09",
        "title": "Infectious gastroenteritis and colitis, unspecified",
        "category": "Infectious Gastrointestinal Diseases",
        "is_common_tropical": True,
    },
    {
        "code": "E11.9",
        "title": "Type 2 diabetes mellitus without complications",
        "category": "Endocrine, Nutritional and Metabolic Diseases",
        "is_common_tropical": False,
    },
    {
        "code": "K27.9",
        "title": "Peptic ulcer, site unspecified, unspecified as acute or chronic",
        "category": "Diseases of the Digestive System",
        "is_common_tropical": False,
    },
    {
        "code": "N39.0",
        "title": "Urinary tract infection, site not specified",
        "category": "Diseases of the Genitourinary System",
        "is_common_tropical": False,
    },
    {
        "code": "A01.0",
        "title": "Typhoid fever",
        "category": "Infectious & Parasitic Diseases",
        "is_common_tropical": True,
    },
    {
        "code": "O80",
        "title": "Encounter for full-term uncomplicated delivery",
        "category": "Pregnancy, Childbirth and the Puerperium",
        "is_common_tropical": False,
    },
    {
        "code": "R69",
        "title": "Illness, unspecified / General Malaise",
        "category": "Symptoms, Signs and Abnormal Clinical Findings",
        "is_common_tropical": False,
    },
]


# ==============================================================================
# 3. Multi-Country SaaS Subscription Plans & Feature Catalog
# ==============================================================================
STATUTORY_SUBSCRIPTION_PLANS: List[Dict[str, Any]] = [
    {
        "code": "PLAN-STARTER",
        "name": "Community Health Starter",
        "tier": "STARTER",
        "target_facility_type": "ALL",
        "description": "Ideal for single-dispensary pharmacies and private outpatient primary clinics.",
        "price_ghs_monthly": Decimal("500.00"),
        "price_xof_monthly": Decimal("25000.00"),
        "price_usd_monthly": Decimal("45.00"),
        "price_ghs_annual": Decimal("5000.00"),
        "price_xof_annual": Decimal("250000.00"),
        "price_usd_annual": Decimal("450.00"),
        "trial_days": 14,
        "max_staff_seats": 5,
        "max_beds": 10,
        "max_monthly_rx": 1000,
        "max_branches": 1,
        "feature_flags": {
            "enable_cpoe": False,
            "enable_emar": False,
            "enable_controlled_drugs": False,
            "enable_multibranch": False,
            "enable_telemetry": False,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": False,
            "enable_custom_tariffs": False,
            "enable_api_access": False,
        },

    },
    {
        "code": "PLAN-GROWTH",
        "name": "Clinic & Hospital Growth",
        "tier": "GROWTH",
        "target_facility_type": "HOSPITAL",
        "description": "Full-scale EHR and dispensary operations for secondary hospitals and clinical centers.",
        "price_ghs_monthly": Decimal("1500.00"),
        "price_xof_monthly": Decimal("75000.00"),
        "price_usd_monthly": Decimal("125.00"),
        "price_ghs_annual": Decimal("15000.00"),
        "price_xof_annual": Decimal("750000.00"),
        "price_usd_annual": Decimal("1250.00"),
        "trial_days": 14,
        "max_staff_seats": 25,
        "max_beds": 50,
        "max_monthly_rx": 5000,
        "max_branches": 3,
        "feature_flags": {
            "enable_cpoe": True,
            "enable_emar": True,
            "enable_controlled_drugs": True,
            "enable_multibranch": True,
            "enable_telemetry": True,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": False,
            "enable_custom_tariffs": True,
            "enable_api_access": False,
        },
    },
    {
        "code": "PLAN-ENTERPRISE",
        "name": "National Hospital & Pharmacy Network",
        "tier": "ENTERPRISE",
        "target_facility_type": "ALL",
        "description": "Multi-facility health systems, tertiary teaching hospitals, and retail pharmacy chains.",
        "price_ghs_monthly": Decimal("4500.00"),
        "price_xof_monthly": Decimal("225000.00"),
        "price_usd_monthly": Decimal("380.00"),
        "price_ghs_annual": Decimal("45000.00"),
        "price_xof_annual": Decimal("2250000.00"),
        "price_usd_annual": Decimal("3800.00"),
        "trial_days": 30,
        "max_staff_seats": 200,
        "max_beds": 500,
        "max_monthly_rx": 50000,
        "max_branches": 20,
        "feature_flags": {
            "enable_cpoe": True,
            "enable_emar": True,
            "enable_controlled_drugs": True,
            "enable_multibranch": True,
            "enable_telemetry": True,
            "enable_escrow": True,
            "enable_insurance_rcm": True,
            "enable_cold_chain_iot": True,
            "enable_custom_tariffs": True,
            "enable_api_access": True,
        },
    },
]


# ==============================================================================
# Core Seeding & Verification Functions
# ==============================================================================

async def seed_super_admin(session: AsyncSession) -> User:
    """
    Provisions or verifies the Platform Super Admin account with secure environment credentials.
    """
    root_email = getattr(settings, "ADMIN_ROOT_EMAIL", None) or os.getenv("ADMIN_ROOT_EMAIL", "elzakari@easymsdigit.com")
    root_email = root_email.strip().lower()
    root_password = getattr(settings, "ADMIN_ROOT_PASSWORD", None) or os.getenv("ADMIN_ROOT_PASSWORD", "Barbie@1983#2026")

    # 1. Lookup by exact root email first
    stmt = select(User).where(User.email == root_email)
    res = await session.execute(stmt)
    admin_user = res.scalars().first()

    # 2. If not found by email, lookup by SUPER_ADMIN role to repurpose legacy admin
    if not admin_user:
        stmt_role = select(User).where(User.role == UserRole.SUPER_ADMIN)
        res_role = await session.execute(stmt_role)
        admin_user = res_role.scalars().first()

    if not admin_user:
        admin_user = User(
            id=uuid.uuid4(),
            email=root_email,
            phone="+233200000001",
            hashed_password=get_password_hash(root_password),
            full_name="Platform Super Administrator",
            role=UserRole.SUPER_ADMIN,
            tenant_id=None,
            is_active=True,
            is_verified=True,
        )
        session.add(admin_user)
        await session.flush()
        logger.info(f"[+] Provisioned Platform Super Admin: {root_email}")
    else:
        # Ensure email, role, active status, and password are up to date
        admin_user.email = root_email
        admin_user.role = UserRole.SUPER_ADMIN
        admin_user.hashed_password = get_password_hash(root_password)
        admin_user.is_active = True
        admin_user.is_verified = True
        await session.flush()
        logger.info(f"[*] Verified and updated Platform Super Admin: {root_email}")

    return admin_user



async def seed_statutory_icd10_catalog(session: AsyncSession) -> int:
    """
    Seeds the statutory ICD-10 diagnostic master catalog.
    """
    count = 0
    for item in STATUTORY_ICD10_REGISTRY:
        stmt = select(ICD10Code).where(ICD10Code.code == item["code"])
        res = await session.execute(stmt)
        existing = res.scalars().first()
        if not existing:
            icd_entry = ICD10Code(
                id=uuid.uuid4(),
                code=item["code"],
                title=item["title"],
                category=item["category"],
                is_common_tropical=item["is_common_tropical"],
                is_active=True,
            )
            session.add(icd_entry)
            count += 1

    await session.flush()
    logger.info(f"[+] Seeded {count} statutory ICD-10 diagnostic codes")
    return count


async def seed_west_africa_essential_drugs(session: AsyncSession) -> int:
    """
    Seeds WHO & Ghana FDA essential molecules in the GlobalMedication registry.
    """
    count = 0
    for med in WHO_WEST_AFRICA_ESSENTIAL_DRUGS:
        stmt = select(GlobalMedication).where(
            (GlobalMedication.generic_name == med["generic_name"]) &
            (GlobalMedication.strength == med["strength"])
        )
        res = await session.execute(stmt)
        existing = res.scalars().first()
        if not existing:
            global_med = GlobalMedication(
                id=uuid.uuid4(),
                generic_name=med["generic_name"],
                brand_name=med["brand_name"],
                dosage_form=med["dosage_form"],
                strength=med["strength"],
                category=med["category"],
                nafdac_fda_number=med["nafdac_fda_number"],
                description=med["description"],
            )
            session.add(global_med)
            count += 1

    await session.flush()
    logger.info(f"[+] Seeded {count} WHO / Ghana FDA essential medicines")
    return count


async def seed_subscription_catalogs(session: AsyncSession) -> int:
    """
    Seeds standard SaaS multi-country tier subscription plans.
    """
    count = 0
    for plan in STATUTORY_SUBSCRIPTION_PLANS:
        stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == plan["code"])
        res = await session.execute(stmt)
        existing = res.scalars().first()
        if not existing:
            sub_plan = SubscriptionPlan(
                id=uuid.uuid4(),
                code=plan["code"],
                name=plan["name"],
                tier=plan["tier"],
                target_facility_type=plan["target_facility_type"],
                description=plan["description"],
                price_ghs_monthly=plan["price_ghs_monthly"],
                price_xof_monthly=plan["price_xof_monthly"],
                price_usd_monthly=plan["price_usd_monthly"],
                price_ghs_annual=plan["price_ghs_annual"],
                price_xof_annual=plan["price_xof_annual"],
                price_usd_annual=plan["price_usd_annual"],
                trial_days=plan["trial_days"],
                max_staff_seats=plan["max_staff_seats"],
                max_beds=plan["max_beds"],
                max_monthly_rx=plan["max_monthly_rx"],
                max_branches=plan["max_branches"],
                feature_flags=plan["feature_flags"],
                is_active=True,
            )
            session.add(sub_plan)
            count += 1

    await session.flush()
    logger.info(f"[+] Seeded {count} statutory subscription plans")
    return count


def verify_live_payment_providers() -> Dict[str, Any]:
    """
    Verifies that all payment gateways default to live credentials or safe fallback modes.
    """
    paystack_key = settings.PAYSTACK_SECRET_KEY
    fedapay_key = settings.FEDAPAY_SECRET_KEY
    hub2_key = settings.HUB2_SECRET_KEY

    is_paystack_live = paystack_key.startswith("sk_live_")
    is_fedapay_live = fedapay_key.startswith("sk_live_") or settings.FEDAPAY_ENVIRONMENT == "live"
    is_hub2_configured = bool(hub2_key and "mock" not in hub2_key.lower())

    results = {
        "paystack": {
            "provider": "Paystack Ghana (GHS/NGN)",
            "is_live_key": is_paystack_live,
            "status": "LIVE" if is_paystack_live else "TEST_OR_MOCK",
        },
        "fedapay": {
            "provider": "FedaPay UEMOA (Benin/Togo XOF)",
            "is_live_key": is_fedapay_live,
            "status": "LIVE" if is_fedapay_live else "SANDBOX",
        },
        "hub2": {
            "provider": "Hub2 Francophone West Africa",
            "is_configured": is_hub2_configured,
            "status": "CONFIGURED" if is_hub2_configured else "DEFAULT",
        },
    }
    return results


async def _apply_roles_multi_tenant_user_patch(session: AsyncSession) -> None:
    """
    Additive-only idempotent migration for multi-role users + per-tenant email uniqueness.
    Drops global unique email constraint, adds roles TEXT[] column, back-fills from legacy role,
    creates composite unique index on (tenant_id, email).
    """
    try:
        await session.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
        await session.execute(text("DROP INDEX IF EXISTS ix_users_email"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[]"))
        await session.execute(
            text(
                """
                UPDATE users
                SET roles = CASE
                    WHEN role IS NOT NULL THEN ARRAY[role::TEXT]
                    ELSE ARRAY[]::TEXT[]
                END
                WHERE roles IS NULL OR array_length(roles, 1) IS NULL OR array_length(roles, 1) = 0
                """
            )
        )
        await session.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_user_email ON users(tenant_id, email)"
            )
        )
        await session.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)"
            )
        )
    except Exception as exc:
        logger.warning("roles/multi-tenant user patch skipped (non-fatal, re-run on next boot): %s", exc)
        raise


async def _apply_password_reset_tokens_patch(session: AsyncSession) -> None:
    """
    Additive-only idempotent migration for secure password reset tokens.
    Creates password_reset_tokens table with 15-minute expiry default,
    SHA-256 token_hash (UNIQUE), plus covering indexes. Never drops columns.
    """
    try:
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id UUID PRIMARY KEY,
                    token_hash VARCHAR(128) NOT NULL,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
                    email_address VARCHAR(255) NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    used BOOLEAN NOT NULL DEFAULT FALSE,
                    used_at TIMESTAMPTZ NULL,
                    client_ip VARCHAR(64) NULL,
                    user_agent TEXT NULL
                )
                """
            )
        )
        await session.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_tokens_hash "
                "ON password_reset_tokens(token_hash)"
            )
        )
        await session.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id "
                "ON password_reset_tokens(user_id)"
            )
        )
        await session.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_email "
                "ON password_reset_tokens(email_address)"
            )
        )
        # Add expires_at default if not present on existing rows (idempotent, no-op for new tables)
        await session.execute(
            text(
                "ALTER TABLE password_reset_tokens ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '15 minutes'"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE password_reset_tokens ALTER COLUMN created_at SET DEFAULT NOW()"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE password_reset_tokens ALTER COLUMN used SET DEFAULT FALSE"
            )
        )
    except Exception as exc:
        logger.warning("password_reset_tokens patch skipped (non-fatal, re-run on next boot): %s", exc)
        raise


async def _apply_tenant_currency_patch(session: AsyncSession) -> None:
    """
    Additive, IF-NOT-EXISTS column patch for tenants.currency.
    New Super Admin Manage Drawer uses PATCH /admin/facilities/{tenant_id}
    to persist billing currency per tenant (GHS / XOF / USD).
    """
    try:
        await session.execute(text(
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'GHS'"
        ))
        await session.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_tenants_currency ON tenants(currency)"
        ))
        await session.execute(text(
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_iso_alpha2 VARCHAR(2) DEFAULT NULL"
        ))
    except Exception as exc:
        logger.warning("tenants.currency patch skipped (non-fatal, re-run on next boot): %s", exc)
        raise


async def _apply_system_smtp_configs_patch(session: AsyncSession) -> None:
    """
    Additive, IF-NOT-EXISTS table creation for system_smtp_configs.
    Stores SUPER_ADMIN-configured SMTP credentials (host/port/TLS/SSL,
    username, encrypted password, from address). Password is stored
    as ciphertext only — NEVER cleartext.
    """
    try:
        await session.execute(text(
            """
            CREATE TABLE IF NOT EXISTS system_smtp_configs (
                id UUID PRIMARY KEY,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                provider VARCHAR(64),
                smtp_host VARCHAR(255) NOT NULL,
                smtp_port INTEGER NOT NULL DEFAULT 587,
                encryption VARCHAR(16) NOT NULL DEFAULT 'TLS',
                username VARCHAR(255) NOT NULL,
                password_ciphertext TEXT,
                from_email VARCHAR(255) NOT NULL,
                from_name VARCHAR(255),
                last_tested_at TIMESTAMPTZ,
                last_tested_recipient VARCHAR(255),
                last_tested_ok BOOLEAN,
                updated_by_id UUID REFERENCES users.id ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            )
            """
        ))
        await session.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_system_smtp_configs_active ON system_smtp_configs(is_active)"
        ))
        await session.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_system_smtp_configs_provider ON system_smtp_configs(provider)"
        ))
        await session.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_system_smtp_configs_updated_by ON system_smtp_configs(updated_by_id)"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS provider VARCHAR(64)"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255) NOT NULL DEFAULT 'localhost'"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS smtp_port INTEGER NOT NULL DEFAULT 587"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS encryption VARCHAR(16) NOT NULL DEFAULT 'TLS'"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS username VARCHAR(255) NOT NULL DEFAULT 'noreply'"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS password_ciphertext TEXT"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS from_email VARCHAR(255) NOT NULL DEFAULT 'noreply@medipaedia.health'"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS from_name VARCHAR(255)"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS last_tested_recipient VARCHAR(255)"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS last_tested_ok BOOLEAN"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES users.id ON DELETE SET NULL"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
        ))
        await session.execute(text(
            "ALTER TABLE system_smtp_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ"
        ))
    except Exception as exc:
        logger.warning("system_smtp_configs patch skipped (non-fatal, re-run on next boot): %s", exc)
        raise


async def _apply_hospital_opd_card_patch(session: AsyncSession) -> None:
    """
    Additive, idempotent patch for the OPD Card issuance engine.

    Creates (if missing):
    1. Global Postgres ``opd_card_seq`` sequence used by the deterministic
       OPD number generator (``{tenant_code}-{YYYY}-{nextval(...)}``).
    2. 3 Postgres ENUM types (``opd_intake_track_enum``,
       ``opd_billing_status_enum``, ``opd_triage_status_enum``) matching
       the SQLAlchemy enums in ``models/patient.py``. Creating them up-front
       (instead of relying on the ORM CREATE TABLE) prevents the classic
       PostgreSQL "type XXX already exists" races on first migration.
    3. HospitalPatientCard additive columns (CREATE TABLE IF NOT EXISTS for
       the whole table first — keeps zero-state safe, then ALTER TABLE
       IF NOT EXISTS ADD COLUMN for every new column).
    """
    try:
        # ---- 1. Sequence: OPD number generator ----------------------------
        await session.execute(text(
            "CREATE SEQUENCE IF NOT EXISTS opd_card_seq "
            "INCREMENT 1 START WITH 1 MINVALUE 1 "
            "MAXVALUE 999999999 CACHE 20"
        ))

        # ---- 2. PostgreSQL ENUM types -------------------------------------
        try:
            await session.execute(text(
                "DO $$ BEGIN "
                "CREATE TYPE opd_intake_track_enum AS ENUM "
                "('STANDARD', 'CORPORATE_INSURANCE', 'EMERGENCY'); "
                "EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;"
            ))
        except Exception:
            pass
        try:
            await session.execute(text(
                "DO $$ BEGIN "
                "CREATE TYPE opd_billing_status_enum AS ENUM "
                "('PENDING_REGISTRATION_PAYMENT', 'BILL_TO_PAYER', 'PAID', 'DEFERRED_EMERGENCY'); "
                "EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;"
            ))
        except Exception:
            pass
        try:
            await session.execute(text(
                "DO $$ BEGIN "
                "CREATE TYPE opd_triage_status_enum AS ENUM "
                "('NOT_QUEUED', 'QUEUED_FOR_TRIAGE', 'IN_TRIAGE', 'AWAITING_DOCTOR', 'DISCHARGED'); "
                "EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$;"
            ))
        except Exception:
            pass

        # ---- 3. HospitalPatientCard TABLE + 10 additive column guards ----
        await session.execute(text(
            """
            CREATE TABLE IF NOT EXISTS hospital_patient_cards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ,
                patient_account_id UUID NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
                tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                mrn VARCHAR(100) NOT NULL,
                qr_token VARCHAR(255) NOT NULL UNIQUE,
                registration_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                physical_folder_rack VARCHAR(50) DEFAULT 'Rack-A1',
                physical_folder_shelf VARCHAR(50) DEFAULT 'Shelf-01',
                folder_status VARCHAR(50) DEFAULT 'IN_ARCHIVE'
            )
            """
        ))

        additive_columns = [
            "card_number VARCHAR(40) UNIQUE",
            "intake_type opd_intake_track_enum NOT NULL DEFAULT 'STANDARD'",
            "billing_status opd_billing_status_enum NOT NULL DEFAULT 'PENDING_REGISTRATION_PAYMENT'",
            "emergency_deferred BOOLEAN NOT NULL DEFAULT FALSE",
            "triage_status opd_triage_status_enum NOT NULL DEFAULT 'NOT_QUEUED'",
            "queued_at TIMESTAMPTZ",
            "hospital_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE",  # legacy alias if needed
            "patient_id UUID REFERENCES patient_accounts(id) ON DELETE CASCADE",  # legacy alias if needed
            "tenant_code VARCHAR(10)",
            "qr_payload_hash VARCHAR(128)",
        ]
        for col_sql in additive_columns:
            try:
                await session.execute(text(
                    f"ALTER TABLE hospital_patient_cards ADD COLUMN IF NOT EXISTS {col_sql}"
                ))
            except Exception as exc:
                logger.debug(
                    "hospital_patient_cards add column skipped (non-fatal): %s -> %s",
                    col_sql,
                    exc,
                )

        # ---- 4. Index guards ---------------------------------------------
        index_stmts = [
            (
                "idx_hospital_patient_cards_tenant",
                "CREATE INDEX IF NOT EXISTS idx_hospital_patient_cards_tenant "
                "ON hospital_patient_cards(tenant_id)",
            ),
            (
                "idx_hospital_patient_cards_card_number",
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_patient_cards_card_number "
                "ON hospital_patient_cards(card_number) WHERE card_number IS NOT NULL",
            ),
            (
                "idx_hospital_patient_cards_intake_type",
                "CREATE INDEX IF NOT EXISTS idx_hospital_patient_cards_intake_type "
                "ON hospital_patient_cards(intake_type)",
            ),
            (
                "idx_hospital_patient_cards_billing_status",
                "CREATE INDEX IF NOT EXISTS idx_hospital_patient_cards_billing_status "
                "ON hospital_patient_cards(billing_status)",
            ),
            (
                "idx_hospital_patient_cards_triage_status",
                "CREATE INDEX IF NOT EXISTS idx_hospital_patient_cards_triage_status "
                "ON hospital_patient_cards(triage_status)",
            ),
            (
                "idx_hospital_patient_cards_mrn",
                "CREATE INDEX IF NOT EXISTS idx_hospital_patient_cards_mrn "
                "ON hospital_patient_cards(mrn)",
            ),
        ]
        for _, ddl in index_stmts:
            try:
                await session.execute(text(ddl))
            except Exception as exc:
                logger.debug("OPD index guard skip (non-fatal): %s", exc)
    except Exception as exc:
        logger.warning(
            "hospital_opd_card patch skipped (non-fatal — re-run on next boot): %s",
            exc,
        )
        raise


async def init_live_database(session: AsyncSession) -> Dict[str, Any]:
    """
    Master idempotent zero-state initialization routine.
    """
    await _apply_roles_multi_tenant_user_patch(session)
    await _apply_password_reset_tokens_patch(session)
    await _apply_tenant_currency_patch(session)
    await _apply_system_smtp_configs_patch(session)
    await _apply_hospital_opd_card_patch(session)
    admin_user = await seed_super_admin(session)
    icd10_count = await seed_statutory_icd10_catalog(session)
    med_count = await seed_essential_formulary(session)
    tariff_count = await seed_nhis_gdrg_tariffs(session)
    plan_count = await seed_subscription_catalogs(session)
    payment_status = verify_live_payment_providers()

    await session.commit()

    return {
        "status": "INITIALIZED",
        "super_admin_email": admin_user.email,
        "statutory_icd10_seeded": icd10_count,
        "essential_medications_seeded": med_count,
        "nhis_gdrg_tariffs_seeded": tariff_count,
        "subscription_plans_seeded": plan_count,
        "payment_providers": payment_status,
    }

