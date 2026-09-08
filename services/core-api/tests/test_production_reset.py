"""
==============================================================================
Production Reset & Statutory Master Registry Verification Tests
==============================================================================
"""

import asyncio
import os
import sys
import uuid
import pytest
from sqlalchemy import func
from sqlalchemy.future import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_engine, get_session_local
from app.db.init_live_db import (
    init_live_database,
    verify_live_payment_providers,
    WHO_WEST_AFRICA_ESSENTIAL_DRUGS,
    STATUTORY_ICD10_REGISTRY,
    STATUTORY_SUBSCRIPTION_PLANS,
)
from app.models.base import Base
from app.models.clinical import Consultation, ICD10Code, OpdQueueEntry, Vitals
from app.models.inventory import GlobalMedication
from app.models.patient import HospitalPatientCard, PatientAccount
from app.models.tenant import SubscriptionPlan, Tenant, TenantType
from app.models.user import User, UserRole
from scripts.reset_to_production import purge_transactional_data


def test_payment_providers_validation():
    """Verify payment gateway live/production status helper."""
    res = verify_live_payment_providers()
    assert "paystack" in res
    assert "fedapay" in res
    assert "hub2" in res
    assert res["paystack"]["status"] in ("LIVE", "TEST_OR_MOCK")
    assert res["fedapay"]["status"] in ("LIVE", "SANDBOX")


def test_statutory_catalog_constants():
    """Verify that statutory master registries contain mandatory WHO and ICD-10 data."""
    assert len(WHO_WEST_AFRICA_ESSENTIAL_DRUGS) >= 10
    assert any(m["generic_name"].startswith("Artemether") for m in WHO_WEST_AFRICA_ESSENTIAL_DRUGS)
    assert any(m["generic_name"].startswith("Amoxicillin") for m in WHO_WEST_AFRICA_ESSENTIAL_DRUGS)
    assert any(m["generic_name"].startswith("Paracetamol") for m in WHO_WEST_AFRICA_ESSENTIAL_DRUGS)
    assert any(m["generic_name"].startswith("Metformin") for m in WHO_WEST_AFRICA_ESSENTIAL_DRUGS)

    assert len(STATUTORY_ICD10_REGISTRY) >= 8
    assert any(c["code"] == "B50.9" for c in STATUTORY_ICD10_REGISTRY)
    assert any(c["code"] == "I10" for c in STATUTORY_ICD10_REGISTRY)
    assert any(c["code"] == "J06.9" for c in STATUTORY_ICD10_REGISTRY)
    assert any(c["code"] == "A09" for c in STATUTORY_ICD10_REGISTRY)

    assert len(STATUTORY_SUBSCRIPTION_PLANS) >= 3
    assert any(p["code"] == "PLAN-STARTER" for p in STATUTORY_SUBSCRIPTION_PLANS)
    assert any(p["code"] == "PLAN-GROWTH" for p in STATUTORY_SUBSCRIPTION_PLANS)
    assert any(p["code"] == "PLAN-ENTERPRISE" for p in STATUTORY_SUBSCRIPTION_PLANS)


def test_production_reset_and_zero_state_purge():
    """
    Simulates seeding mock transactional records, running the production purge,
    and verifying zero patient/consultation records alongside intact statutory catalogs.
    """
    async def _test():
        engine = get_engine()
        session_factory = get_session_local()

        # Ensure schema tables are created in the test database
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            # If database is offline or in mock test mode, pass with graceful logging
            pytest.skip(f"Database unavailable for live purge integration test: {e}")
            return

        async with session_factory() as session:
            # 1. Seed a mock tenant, user, patient and consultation
            mock_tenant = Tenant(
                id=uuid.uuid4(),
                name="Mock Facility for Purge Test",
                slug=f"mock-facility-{uuid.uuid4().hex[:6]}",
                tenant_type=TenantType.HOSPITAL,
            )
            session.add(mock_tenant)

            mock_user = User(
                id=uuid.uuid4(),
                email=f"mock.doctor.{uuid.uuid4().hex[:6]}@example.com",
                hashed_password="mock_hashed_password",
                full_name="Mock Doctor",
                role=UserRole.DOCTOR,
                tenant_id=mock_tenant.id,
            )
            session.add(mock_user)

            mock_patient = PatientAccount(
                id=uuid.uuid4(),
                user_id=mock_user.id,
                ghana_card_id=f"GHA-{uuid.uuid4().hex[:8].upper()}-1",
            )
            session.add(mock_patient)
            await session.flush()

            mock_card = HospitalPatientCard(
                id=uuid.uuid4(),
                patient_account_id=mock_patient.id,
                tenant_id=mock_tenant.id,
                mrn=f"MOCK-MRN-{uuid.uuid4().hex[:6]}",
                qr_token=f"TOKEN-{uuid.uuid4().hex[:8]}",
            )
            session.add(mock_card)
            await session.flush()

            mock_consultation = Consultation(
                id=uuid.uuid4(),
                hospital_card_id=mock_card.id,
                tenant_id=mock_tenant.id,
                doctor_id=mock_user.id,
                chief_complaint="Fever and chills",
            )
            session.add(mock_consultation)

            mock_queue = OpdQueueEntry(
                id=uuid.uuid4(),
                tenant_id=mock_tenant.id,
                patient_account_id=mock_patient.id,
                hospital_card_id=mock_card.id,
                queue_number="OPD-999",
            )
            session.add(mock_queue)
            await session.commit()

            # 2. Run the production purge utility
            result = await purge_transactional_data(session)
            assert result["status"] == "PURGED_AND_INITIALIZED"

            # 3. Assert all transactional tables report exactly 0 records
            patient_count = (await session.execute(select(func.count(PatientAccount.id)))).scalar_one()
            consultation_count = (await session.execute(select(func.count(Consultation.id)))).scalar_one()
            queue_count = (await session.execute(select(func.count(OpdQueueEntry.id)))).scalar_one()

            assert patient_count == 0, f"Expected 0 patients, found {patient_count}"
            assert consultation_count == 0, f"Expected 0 consultations, found {consultation_count}"
            assert queue_count == 0, f"Expected 0 queue entries, found {queue_count}"

            # 4. Assert statutory master registries remain intact
            icd10_count = (await session.execute(select(func.count(ICD10Code.id)))).scalar_one()
            meds_count = (await session.execute(select(func.count(GlobalMedication.id)))).scalar_one()
            plans_count = (await session.execute(select(func.count(SubscriptionPlan.id)))).scalar_one()

            assert icd10_count >= len(STATUTORY_ICD10_REGISTRY)
            assert meds_count >= len(WHO_WEST_AFRICA_ESSENTIAL_DRUGS)
            assert plans_count >= len(STATUTORY_SUBSCRIPTION_PLANS)

            # 5. Assert Super Admin exists
            admin_stmt = select(User).where(User.role == UserRole.SUPER_ADMIN)
            super_admin = (await session.execute(admin_stmt)).scalars().first()
            assert super_admin is not None
            assert super_admin.is_active is True

    asyncio.run(_test())
