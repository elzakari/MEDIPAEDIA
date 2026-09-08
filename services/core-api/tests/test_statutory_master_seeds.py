"""
==============================================================================
Statutory Master Seeds & Tariffs Integration Test Suite
==============================================================================
Validates:
1. Ghana FDA & WHO Essential Medicines Formulary (60+ items, Act 857 schedules,
   cold-chain 2C-8C thresholds, standard dosing, linked ICD-10 codes).
2. Ghana NHIA G-DRG Tariff Catalog (OPDC01A, OPDC02B, LABP01A, SURG01CS, DELV01A, etc.).
3. API Endpoints (/api/v1/tariffs/nhis-gdrg, /api/v1/clinical/formulary).
4. Idempotent zero-state live database initialization (init_live_database).
"""

import asyncio
from decimal import Decimal
import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.future import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.db.init_live_db import init_live_database
from app.db.seeders.formulary_seeder import (
    GHANA_FDA_WHO_ESSENTIAL_FORMULARY,
    seed_essential_formulary,
)
from app.db.seeders.nhis_tariffs_seeder import (
    GHANA_NHIS_GDRG_TARIFFS,
    seed_nhis_gdrg_tariffs,
)
from app.main import app
from app.models.clinical import NHISGDRGTariff
from app.models.inventory import GlobalMedication


def test_statutory_catalog_data_integrity():
    """
    Verifies that statutory formulary and tariff lists meet clinical data contracts.
    """
    # 1. Formulary catalog invariants
    assert len(GHANA_FDA_WHO_ESSENTIAL_FORMULARY) >= 30
    
    # Check antimalarials
    antimalarials = [m for m in GHANA_FDA_WHO_ESSENTIAL_FORMULARY if "Antimalarial" in m["category"]]
    assert len(antimalarials) >= 4
    act_names = [m["generic_name"] for m in antimalarials]
    assert any("Artemether" in name for name in act_names)
    assert any("Artesunate" in name for name in act_names)

    # Check Act 857 Controlled Substances
    narcotics = [m for m in GHANA_FDA_WHO_ESSENTIAL_FORMULARY if m.get("poison_schedule") == "CLASS_A_NARCOTIC"]
    assert len(narcotics) >= 2  # Morphine, Pethidine
    poisons_b = [m for m in GHANA_FDA_WHO_ESSENTIAL_FORMULARY if m.get("poison_schedule") == "CLASS_B_POISON"]
    assert len(poisons_b) >= 2  # Tramadol, Diazepam

    # Check Cold-Chain Biologics
    cold_chain = [m for m in GHANA_FDA_WHO_ESSENTIAL_FORMULARY if m.get("is_cold_chain") is True]
    assert len(cold_chain) >= 4
    for item in cold_chain:
        assert item["storage_temp_min"] == 2.0
        assert item["storage_temp_max"] == 8.0

    # 2. G-DRG Tariff Catalog invariants
    assert len(GHANA_NHIS_GDRG_TARIFFS) >= 25
    gdrg_map = {t["gdrg_code"]: t for t in GHANA_NHIS_GDRG_TARIFFS}

    assert "OPDC01A" in gdrg_map
    assert gdrg_map["OPDC01A"]["standard_tariff_ghs"] == Decimal("35.00")

    assert "OPDC02B" in gdrg_map
    assert gdrg_map["OPDC02B"]["standard_tariff_ghs"] == Decimal("65.00")

    assert "LABP01A" in gdrg_map
    assert gdrg_map["LABP01A"]["standard_tariff_ghs"] == Decimal("45.00")

    assert "LABP02M" in gdrg_map
    assert gdrg_map["LABP02M"]["standard_tariff_ghs"] == Decimal("20.00")

    assert "DELV01A" in gdrg_map
    assert gdrg_map["DELV01A"]["standard_tariff_ghs"] == Decimal("250.00")

    assert "SURG01CS" in gdrg_map
    assert gdrg_map["SURG01CS"]["standard_tariff_ghs"] == Decimal("950.00")

    assert "BEDW01A" in gdrg_map
    assert gdrg_map["BEDW01A"]["standard_tariff_ghs"] == Decimal("50.00")


def test_seeders_execution_and_idempotency():
    """
    Executes formulary and tariff seeders against database and verifies idempotency.
    """
    async def _test():
        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            # First seed run
            f_count1 = await seed_essential_formulary(session)
            t_count1 = await seed_nhis_gdrg_tariffs(session)
            await session.commit()

            # Verify rows exist
            stmt_f = select(GlobalMedication)
            res_f = await session.execute(stmt_f)
            all_meds = res_f.scalars().all()
            assert len(all_meds) >= len(GHANA_FDA_WHO_ESSENTIAL_FORMULARY)

            stmt_t = select(NHISGDRGTariff)
            res_t = await session.execute(stmt_t)
            all_tariffs = res_t.scalars().all()
            assert len(all_tariffs) >= len(GHANA_NHIS_GDRG_TARIFFS)

            # Second seed run (must be idempotent, adding 0 new records)
            f_count2 = await seed_essential_formulary(session)
            t_count2 = await seed_nhis_gdrg_tariffs(session)
            await session.commit()
            assert f_count2 == 0
            assert t_count2 == 0

        await engine.dispose()

    asyncio.run(_test())


def test_tariffs_and_formulary_api_endpoints():
    """
    Tests GET /api/v1/tariffs/nhis-gdrg and GET /api/v1/clinical/formulary HTTP responses.
    """
    async def _test():
        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with async_session() as session:
                yield session

        from app.core.database import get_db
        app.dependency_overrides[get_db] = override_get_db

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # 1. Test G-DRG Tariffs endpoint
                res_tariffs = await client.get("/api/v1/tariffs/nhis-gdrg")
                assert res_tariffs.status_code == 200
                data_tariffs = res_tariffs.json()
                assert isinstance(data_tariffs, list)
                assert len(data_tariffs) > 0

                # Test filter by category
                res_cat = await client.get("/api/v1/tariffs/nhis-gdrg?category=LABORATORY")
                assert res_cat.status_code == 200
                for item in res_cat.json():
                    assert item["category"] == "LABORATORY"

                # Test search by code
                res_search = await client.get("/api/v1/tariffs/nhis-gdrg?search=SURG01CS")
                assert res_search.status_code == 200
                items_search = res_search.json()
                assert len(items_search) >= 1
                assert items_search[0]["gdrg_code"] == "SURG01CS"
                assert float(items_search[0]["standard_tariff_ghs"]) == 950.00

                # 2. Test Clinical Formulary endpoint
                res_form = await client.get("/api/v1/clinical/formulary")
                assert res_form.status_code == 200
                data_form = res_form.json()
                assert isinstance(data_form, list)
                assert len(data_form) > 0

                # Test filter by cold chain
                res_cold = await client.get("/api/v1/clinical/formulary?is_cold_chain=true")
                assert res_cold.status_code == 200
                for item in res_cold.json():
                    assert item["is_cold_chain"] is True
                    assert item["storage_temp_min"] == 2.0
                    assert item["storage_temp_max"] == 8.0

                # Test filter by Act 857 schedule
                res_narc = await client.get("/api/v1/clinical/formulary?poison_schedule=CLASS_A_NARCOTIC")
                assert res_narc.status_code == 200
                for item in res_narc.json():
                    assert item["poison_schedule"] == "CLASS_A_NARCOTIC"

                # Test alias endpoint /api/v1/tariffs/formulary
                res_form_alias = await client.get("/api/v1/tariffs/formulary?search=Artemether")
                assert res_form_alias.status_code == 200
                assert len(res_form_alias.json()) >= 1
        finally:
            app.dependency_overrides.pop(get_db, None)
            await engine.dispose()

    asyncio.run(_test())



def test_init_live_database_returns_seeded_statutory_registries():
    """
    Validates that init_live_database correctly includes essential medicines and G-DRG tariffs.
    """
    async def _test():
        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            result = await init_live_database(session)
            assert result["status"] == "INITIALIZED"
            assert "essential_medications_seeded" in result
            assert "nhis_gdrg_tariffs_seeded" in result
            assert "statutory_icd10_seeded" in result

        await engine.dispose()

    asyncio.run(_test())
