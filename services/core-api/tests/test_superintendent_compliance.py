import asyncio
from decimal import Decimal
import pytest

from app.schemas.superintendent import (
    ADRReactionSeverity,
    AuthorizeNarcoticsRequest,
    CompoundingLogItem,
    FileADRRequest,
    FreezeBatchRequest,
    LogTemperatureRequest,
    PoisonClassType,
    QuarantineReason,
    QuarantineResolution,
    ResolveQuarantineRequest,
    TemperatureExcursionLevel,
)
from app.api.v1.endpoints.superintendent import (
    get_narcotics_register,
    authorize_narcotics_dispense,
    export_narcotics_report,
    freeze_batch_quarantine,
    get_quarantined_batches,
    resolve_quarantined_batch,
    get_cold_chain_logs,
    log_cold_chain_temperature,
    get_adr_reports,
    file_adr_report,
    get_compounding_logs,
    record_compounding_log,
)


class MockSuperintendentUser:
    id = "usr-super-01"
    email = "superintendent.kojo@osupharmacy.gh"
    full_name = "Pharm. Kojo Asante"
    role = type("Role", (), {"value": "SUPERINTENDENT_PHARMACIST"})()


def test_statutory_narcotics_and_authorization():
    """
    Test Dangerous Drugs Book (Act 857) running balance calculations and Superintendent PIN authorization.
    """
    async def _test():
        user = MockSuperintendentUser()

        # 1. Fetch initial register
        initial_reg = await get_narcotics_register(current_user=user, db=None)
        assert len(initial_reg) >= 2

        # 2. Authorize new narcotic dispensation
        auth_req = AuthorizeNarcoticsRequest(
            substance_name="Morphine Sulfate 10mg Tablets",
            quantity=10,
            batch_number="LOT-MS-2026-01",
            patient_name="Kwesi Mensah",
            patient_ghana_card="GHA-71298412-1",
            prescribing_doctor="Dr. Afia Appiah",
            doctor_mdc_pin="MDC/RN/89124",
            clinical_indication="Severe Post-Operative Pain",
            superintendent_pin="7749",
        )
        entry = await authorize_narcotics_dispense(auth_req, current_user=user, db=None)
        assert entry.substance_name == "Morphine Sulfate 10mg Tablets"
        assert entry.quantity_dispensed == 10
        assert entry.running_balance == 76  # 86 - 10 = 76
        assert entry.is_authorized is True

        # 3. Export report
        export_res = await export_narcotics_report(export_format="PDF", current_user=user, db=None)
        assert "EXP-NAR-" in export_res.export_id
        assert export_res.export_format == "PDF"

    asyncio.run(_test())


def test_batch_quarantine_and_resolution():
    """
    Test freezing a compromised inventory batch and resolving it via supplier return.
    """
    async def _test():
        user = MockSuperintendentUser()

        # 1. Freeze compromised batch
        freeze_req = FreezeBatchRequest(
            batch_number="LOT-IBU-2026-04",
            medication_name="Ibuprofen 400mg Tablets",
            quantity=30,
            reason=QuarantineReason.QUALITY_DEFECT,
            supplier_name="Tobbinco Pharmaceuticals Ltd",
            notes="Cracked packaging detected on arrival.",
            superintendent_pin="7749",
        )
        q_batch = await freeze_batch_quarantine(freeze_req, current_user=user, db=None)
        assert q_batch.status == "QUARANTINED_LOCKED"
        assert q_batch.batch_number == "LOT-IBU-2026-04"

        # 2. Get active quarantined batches
        active_list = await get_quarantined_batches(current_user=user, db=None)
        assert any(b.quarantine_id == q_batch.quarantine_id for b in active_list)

        # 3. Resolve quarantine via return to supplier
        resolve_req = ResolveQuarantineRequest(
            quarantine_id=q_batch.quarantine_id,
            resolution=QuarantineResolution.RETURN_TO_SUPPLIER,
            debit_note_reference="DN-TOB-2026-991",
            superintendent_pin="7749",
        )
        resolved = await resolve_quarantined_batch(resolve_req, current_user=user, db=None)
        assert resolved.status == "RESOLVED"
        assert resolved.resolution == QuarantineResolution.RETURN_TO_SUPPLIER
        assert resolved.supplier_debit_note == "DN-TOB-2026-991"

    asyncio.run(_test())


def test_cold_chain_monitoring_and_excursion_alerts():
    """
    Test daily cold chain fridge temperature logging and automatic excursion status evaluation.
    """
    async def _test():
        user = MockSuperintendentUser()

        # 1. Normal temperature (4.2°C)
        normal_req = LogTemperatureRequest(
            unit_name="Main Vaccine & Biologics Refrigerator #1",
            shift="MORNING",
            temperature_celsius=4.2,
            min_24h_celsius=3.8,
            max_24h_celsius=5.1,
        )
        normal_log = await log_cold_chain_temperature(normal_req, current_user=user, db=None)
        assert normal_log.excursion_status == TemperatureExcursionLevel.NORMAL

        # 2. High Excursion temperature (9.5°C)
        high_req = LogTemperatureRequest(
            unit_name="Insulin Storage Unit #2",
            shift="EVENING",
            temperature_celsius=9.5,
            min_24h_celsius=4.0,
            max_24h_celsius=9.8,
            corrective_action="Gasket cleaned and compressor serviced.",
        )
        high_log = await log_cold_chain_temperature(high_req, current_user=user, db=None)
        assert high_log.excursion_status == TemperatureExcursionLevel.WARNING_HIGH

        # 3. Critical Excursion temperature (13.5°C)
        crit_req = LogTemperatureRequest(
            unit_name="Vaccine Storage Unit #3",
            shift="MORNING",
            temperature_celsius=13.5,
            min_24h_celsius=5.0,
            max_24h_celsius=14.0,
            corrective_action="Power outage backup failure; biologics relocated to cold box.",
        )
        crit_log = await log_cold_chain_temperature(crit_req, current_user=user, db=None)
        assert crit_log.excursion_status == TemperatureExcursionLevel.CRITICAL_EXCURSION

    asyncio.run(_test())


def test_pharmacovigilance_and_compounding():
    """
    Test Adverse Drug Reaction filing (FDA Yellow Form) and extemporaneous master compounding formula logging.
    """
    async def _test():
        user = MockSuperintendentUser()

        # 1. File ADR Yellow Form report
        adr_req = FileADRRequest(
            patient_identifier="PAT-GHA-71298412-1",
            patient_age=34,
            patient_gender="Male",
            suspected_drug="Ciprofloxacin 500mg Tablets",
            brand_name="Ciprobid (Zydus)",
            batch_number="LOT-CIP-2026-04",
            adverse_reaction_description="Maculopapular cutaneous rash with Achilles tendon tenderness",
            severity=ADRReactionSeverity.MODERATE,
            onset_date="15 Aug 2026",
            outcome="RECOVERING",
        )
        adr_entry = await file_adr_report(adr_req, current_user=user, db=None)
        assert adr_entry.fda_yellow_form_synced is True
        assert adr_entry.severity == ADRReactionSeverity.MODERATE

        # 2. Record compounding formula
        cmp_req = CompoundingLogItem(
            compound_id="CMP-2026-99",
            formula_name="Salicylic Acid 2% Ointment",
            active_ingredients=["Salicylic Acid BP 2g", "White Soft Paraffin 98g"],
            batch_quantity_prepared="100 g",
            prepared_date="19 Aug 2026",
            beyond_use_date="19 Nov 2026 (90 Days BUD)",
            pharmacist_compiler="Pharm. Efua Danso",
            superintendent_verifier="Pharm. Kojo Asante (FPCPharm)",
            storage_conditions="Store below 25°C in opaque jar.",
        )
        cmp_entry = await record_compounding_log(cmp_req, current_user=user, db=None)
        assert cmp_entry.compound_id == "CMP-2026-99"
        assert "90 Days BUD" in cmp_entry.beyond_use_date

    asyncio.run(_test())
