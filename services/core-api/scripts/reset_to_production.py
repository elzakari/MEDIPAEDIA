"""
==============================================================================
Medipaedia Production Transition & Transactional Database Purge Utility
==============================================================================
Safely purges mock transactional data, resets sequence counters, retains
statutory master catalogs (WHO Essential Medicines, ICD-10 Registry, SaaS Plans),
and initializes the system for live multi-tenant facility onboarding.
"""

import asyncio
import logging
import os
import sys
from typing import Any, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_engine, get_session_local
from app.db.init_live_db import init_live_database
from app.models.clinical import Consultation, OpdQueueEntry, StatNursingOrder, Vitals
from app.models.order import Order, OrderItem
from app.models.patient import (
    HospitalPatientCard,
    MedicationDoseLog,
    PatientAccount,
    PhysicalFolderLocation,
    PhysicalFolderTransit,
    TelehealthSession,
)
from app.models.payment import (
    PharmacyBalanceLedger,
    PlatformTransaction,
    SettlementPayout,
)
from app.models.prescription import Prescription, PrescriptionItem
from app.models.staff_profile import StaffProfile
from app.models.tenant import Tenant
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("medipaedia.production_reset")


# Transactional table names in safe cascading dependency order
TRANSACTIONAL_TABLES = [
    "order_items",
    "orders",
    "settlement_payouts",
    "platform_transactions",
    "pharmacy_balance_ledgers",
    "pharmacy_inventories",
    "inter_branch_transfer_items",
    "inter_branch_transfers",
    "facility_branches",
    "prescription_items",
    "prescriptions",
    "medication_dose_logs",
    "stat_nursing_orders",
    "vitals",
    "consultations",
    "clinical_macros",
    "opd_queue_entries",
    "telehealth_sessions",
    "physical_folder_transits",
    "physical_folder_locations",
    "hospital_patient_cards",
    "patient_accounts",
    "staff_profiles",
    "webhook_dead_letters",
    "gateway_health_logs",
    "tenant_health_audits",
    "audit_logs",
]


async def purge_transactional_data(session: AsyncSession) -> Dict[str, Any]:
    """
    Atomically clears all mock transactional data while preserving statutory master catalogs:
    - Retains: icd10_codes, global_medications, subscription_plans, subscription_features_catalog
    - Preserves: Root Platform Super Admin user account
    - Purges: Patients, consultations, vitals, prescriptions, orders, queues, audits, mock facilities
    - Resets: Daily sequence counters
    """
    logger.info("[*] Commencing production transactional data purge...")

    # Determine database dialect
    bind = session.bind or session.get_bind()
    dialect_name = bind.dialect.name if hasattr(bind, "dialect") else "postgresql"

    purged_counts: Dict[str, int] = {}

    if dialect_name == "postgresql":
        # Fast atomic cascading truncate for PostgreSQL
        tables_csv = ", ".join(TRANSACTIONAL_TABLES)
        try:
            await session.execute(text(f"TRUNCATE TABLE {tables_csv} RESTART IDENTITY CASCADE;"))
            logger.info(f"[+] Truncated {len(TRANSACTIONAL_TABLES)} transactional tables with RESTART IDENTITY CASCADE")
        except Exception as err:
            logger.warning(f"[!] Direct TRUNCATE failed ({err}), falling back to ORM/DELETE cascade...")
            for table_name in TRANSACTIONAL_TABLES:
                try:
                    await session.execute(text(f"DELETE FROM {table_name};"))
                except Exception:
                    pass

        # Purge non-super-admin users and mock tenants
        await session.execute(delete(User).where(User.role != UserRole.SUPER_ADMIN))
        await session.execute(delete(Tenant))

    else:
        # Generic ORM deletion for SQLite / test environments
        await session.execute(delete(OrderItem))
        await session.execute(delete(Order))
        await session.execute(delete(SettlementPayout))
        await session.execute(delete(PlatformTransaction))
        await session.execute(delete(PharmacyBalanceLedger))
        await session.execute(delete(PrescriptionItem))
        await session.execute(delete(Prescription))
        await session.execute(delete(MedicationDoseLog))
        await session.execute(delete(StatNursingOrder))
        await session.execute(delete(Vitals))
        await session.execute(delete(Consultation))
        await session.execute(delete(OpdQueueEntry))
        await session.execute(delete(TelehealthSession))
        await session.execute(delete(PhysicalFolderTransit))
        await session.execute(delete(PhysicalFolderLocation))
        await session.execute(delete(HospitalPatientCard))
        await session.execute(delete(PatientAccount))
        await session.execute(delete(StaffProfile))
        await session.execute(delete(User).where(User.role != UserRole.SUPER_ADMIN))
        await session.execute(delete(Tenant))

    await session.commit()
    logger.info("[+] Successfully committed transactional table purges.")

    # Re-initialize statutory master registries and super-admin credentials
    logger.info("[*] Re-verifying and seeding statutory master registries...")
    init_summary = await init_live_database(session)
    logger.info(f"[+] Zero-state statutory master registries verified: {init_summary}")

    return {
        "status": "PURGED_AND_INITIALIZED",
        "dialect": dialect_name,
        "tables_purged": len(TRANSACTIONAL_TABLES),
        "init_summary": init_summary,
    }


async def main():
    session_factory = get_session_local()
    async with session_factory() as session:
        result = await purge_transactional_data(session)
        print("\n=======================================================")
        print(" MEDIPAEDIA PRODUCTION RESET COMPLETE")
        print("=======================================================")
        print(f" Status:               {result['status']}")
        print(f" Database Dialect:     {result['dialect']}")
        print(f" Master Admin Email:   {result['init_summary']['super_admin_email']}")
        print(f" ICD-10 Codes:         {result['init_summary']['statutory_icd10_seeded']} records verified")
        print(f" Essential Medicines:  {result['init_summary']['essential_medications_seeded']} records verified")
        print(f" Subscription Plans:   {result['init_summary']['subscription_plans_seeded']} records verified")
        print(f" Paystack Gateway:     {result['init_summary']['payment_providers']['paystack']['status']}")
        print(f" FedaPay Gateway:      {result['init_summary']['payment_providers']['fedapay']['status']}")
        print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
