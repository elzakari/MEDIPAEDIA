import asyncio
from decimal import Decimal
import pytest

from app.schemas.pharmacist_operations import (
    ControlledDrugLogRequest,
    FEFODispenseItem,
    FEFODispenseRequest,
    HandoverOrderRequest,
    PackOrderRequest,
    PrescriptionSafetyCheckRequest,
    SafetyAlertSeverity,
)
from app.api.v1.endpoints.pharmacy import (
    check_prescription_safety,
    get_generic_substitutes,
    dispense_fefo_prescription,
    get_printable_rx_label,
    log_controlled_drug_dispensation,
    get_controlled_drugs_register,
    get_fulfillment_orders,
    pack_fulfillment_order,
    handover_fulfillment_order,
)


class MockPharmacistUser:
    id = "usr-pharm-01"
    email = "kojo.asante@osupharmacy.gh"
    full_name = "Pharm. Kojo Asante"
    role = type("Role", (), {"value": "PHARMACIST"})()


def test_clinical_safety_and_generic_substitutions():
    """
    Test clinical safety DDI & allergy conflict checks and generic bio-equivalent substitution lookups.
    """
    async def _test():
        user = MockPharmacistUser()

        # 1. Test Penicillin allergy detection
        pen_req = PrescriptionSafetyCheckRequest(
            patient_allergies=["Amoxicillin / Penicillin", "Peanuts"],
            medications=["Augmentin 625mg Tablets", "Paracetamol 500mg"],
        )
        pen_res = await check_prescription_safety(pen_req, current_user=user, db=None)
        assert pen_res.is_safe_to_dispense is False
        assert pen_res.has_contraindications is True
        assert any(a.severity == SafetyAlertSeverity.HIGH_CONTRAINDICATION for a in pen_res.alerts)

        # 2. Test Safe Coartem prescription with counseling
        safe_req = PrescriptionSafetyCheckRequest(
            patient_allergies=["Penicillin"],
            medications=["Coartem 20/120mg Tablets", "Paracetamol 500mg"],
        )
        safe_res = await check_prescription_safety(safe_req, current_user=user, db=None)
        assert safe_res.is_safe_to_dispense is True
        assert any(a.alert_id == "ALT-COUNSEL-COA" for a in safe_res.alerts)

        # 3. Test Generic Substitutes lookup
        subs = await get_generic_substitutes(query="Artemether", current_user=user, db=None)
        assert len(subs) >= 2
        assert any(s.is_cheaper for s in subs)

    asyncio.run(_test())


def test_fefo_dispensation_and_thermal_labels():
    """
    Test FEFO-enforced batch dispensation, 50x30mm thermal label minting, and council PIN audit.
    """
    async def _test():
        user = MockPharmacistUser()

        disp_req = FEFODispenseRequest(
            prescription_id="RX-2026-99214",
            claim_pin="849201",
            patient_name="Kwesi Mensah",
            pharmacist_name="Pharm. Kojo Asante",
            pharmacist_council_pin="PSGH/REG/89201",
            items=[
                FEFODispenseItem(
                    prescription_item_id="it-01",
                    medication_name="Coartem 20/120mg Tablets",
                    generic_name="Artemether + Lumefantrine",
                    quantity_prescribed=24,
                    batch_id="b-coa-01",
                    batch_number="LOT-COA-2026-01",
                    batch_expiry="30 Nov 2027",
                    unit_price_ghs=Decimal("45.00"),
                    total_price_ghs=Decimal("45.00"),
                    instructions="Take 4 tablets stat, then 4 tablets at 8h, 24h, 36h, 48h, 60h with meals",
                )
            ],
        )

        disp_res = await dispense_fefo_prescription(disp_req, current_user=user, db=None)
        assert disp_res.status == "DISPENSED"
        assert disp_res.total_amount_ghs == Decimal("45.00")
        assert len(disp_res.labels) == 1

        # Check thermal label formatting
        lbl = disp_res.labels[0]
        assert "PSGH/REG/89201" in lbl.dispensed_by
        assert lbl.patient_name == "Kwesi Mensah"
        assert lbl.batch_number == "LOT-COA-2026-01"

        # Direct label endpoint
        direct_lbl = await get_printable_rx_label("item-01", current_user=user, db=None)
        assert direct_lbl.pharmacy_name == "Osu Community Pharmacy, Accra"

    asyncio.run(_test())


def test_controlled_drugs_registry():
    """
    Test Dangerous Drug Book (DDB) logging with Superintendent Pharmacist sign-off.
    """
    async def _test():
        user = MockPharmacistUser()

        log_req = ControlledDrugLogRequest(
            drug_name="Pethidine 50mg/mL Ampoule",
            quantity_dispensed=5,
            batch_number="LOT-PTH-2026-02",
            patient_name="Kwesi Mensah",
            patient_ghana_card="GHA-71298412-1",
            prescribing_doctor="Dr. Afia Appiah",
            doctor_mdc_pin="MDC/RN/89124",
            diagnosis_indication="Severe Post-Operative Pain",
            superintendent_pharmacist="Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)",
            approval_pin="7749",
        )

        entry = await log_controlled_drug_dispensation(log_req, current_user=user, db=None)
        assert entry.drug_name == "Pethidine 50mg/mL Ampoule"
        assert entry.quantity_dispensed == 5
        assert entry.class_type == "CLASS_A_POM"

        # Check register list
        reg = await get_controlled_drugs_register(current_user=user, db=None)
        assert any(e.entry_id == entry.entry_id for e in reg)

    asyncio.run(_test())


def test_marketplace_order_fulfillment_and_escrow_release():
    """
    Test online order fulfillment stages (PACKING, HANDOVER) and OTP verification with Paystack escrow release.
    """
    async def _test():
        user = MockPharmacistUser()

        # 1. Fetch orders
        orders = await get_fulfillment_orders(stage=None, current_user=user, db=None)
        assert len(orders) >= 2

        # 2. Pack order
        pack_req = PackOrderRequest(order_id="ord-ful-01", batch_lot_verified=True)
        packed = await pack_fulfillment_order(pack_req, current_user=user, db=None)
        assert packed.fulfillment_stage == "PACKED"

        # 3. Handover with customer OTP
        handover_req = HandoverOrderRequest(order_id="ord-ful-01", otp_or_qr_code="491028")
        handover_res = await handover_fulfillment_order(handover_req, current_user=user, db=None)
        assert handover_res.status == "COMPLETED"
        assert handover_res.escrow_released_ghs == Decimal("65.00")
        assert handover_res.payout_status == "CREDITED_TO_PHARMACY_WALLET"

    asyncio.run(_test())
