import json
import os
import pytest
from app.core.i18n import (
    BACKEND_TRANSLATIONS,
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    resolve_locale,
    t,
)
from app.schemas.ai_clinical import (
    PrescriptionCounselingInputItem,
    SupportedCounselingLanguage,
)
from app.services.ai_copilot import generate_multilingual_counseling


def test_locale_resolution():
    """Verify Accept-Language header parsing handles regional variants correctly."""
    assert resolve_locale("fr") == "fr"
    assert resolve_locale("fr-FR") == "fr"
    assert resolve_locale("fr-TG,fr;q=0.9,en;q=0.8") == "fr"
    assert resolve_locale("fr-BJ,fr;q=0.8") == "fr"
    assert resolve_locale("en-US,en;q=0.9") == "en"
    assert resolve_locale("en-GB") == "en"
    assert resolve_locale("") == "en"
    assert resolve_locale(None) == "en"


def test_backend_translations_parity():
    """Ensure all backend translation keys have complete English and French strings."""
    for key, trans in BACKEND_TRANSLATIONS.items():
        assert "en" in trans, f"Missing English translation for {key}"
        assert "fr" in trans, f"Missing French translation for {key}"
        assert len(trans["en"]) > 0, f"Empty English translation for {key}"
        assert len(trans["fr"]) > 0, f"Empty French translation for {key}"


def test_backend_parameter_interpolation():
    """Test t() helper performs interpolation in both English and French."""
    en_queue = t("queue.audio_call", locale="en", ticket="OPD-101", clinic="Consulting Room 2")
    fr_queue = t("queue.audio_call", locale="fr", ticket="OPD-101", clinic="Salle de Consultation 2")

    assert "Ticket OPD-101" in en_queue
    assert "Consulting Room 2" in en_queue
    assert "Attention s'il vous plaît" in fr_queue
    assert "Ticket OPD-101" in fr_queue
    assert "Salle de Consultation 2" in fr_queue


def test_ui_catalog_json_parity():
    """Verify en.json and fr.json catalogs have identical schema keys."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    locales_dir = os.path.join(repo_root, "packages", "ui", "src", "locales")

    en_path = os.path.join(locales_dir, "en.json")
    fr_path = os.path.join(locales_dir, "fr.json")

    assert os.path.exists(en_path), f"en.json must exist at {en_path}"
    assert os.path.exists(fr_path), f"fr.json must exist at {fr_path}"

    with open(en_path, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    with open(fr_path, "r", encoding="utf-8") as f:
        fr_data = json.load(f)

    # Verify top-level modules
    expected_modules = [
        "common",
        "navigation",
        "doctor",
        "nurse",
        "reception",
        "finance",
        "pharmacy",
        "superintendent",
        "procurement",
        "patient",
        "superAdmin",
    ]

    for mod in expected_modules:
        assert mod in en_data, f"Module '{mod}' missing in en.json"
        assert mod in fr_data, f"Module '{mod}' missing in fr.json"

        # Verify key parity inside each module
        en_keys = set(en_data[mod].keys())
        fr_keys = set(fr_data[mod].keys())
        assert en_keys == fr_keys, f"Key mismatch in module '{mod}': diff={en_keys ^ fr_keys}"


def test_french_ai_drug_counseling():
    """Verify AI Drug Counseling generates medically accurate French counseling instructions."""
    items = [
        PrescriptionCounselingInputItem(
            medication_name="Artemether / Lumefantrine (Coartem) 20/120mg",
            dosage="4 tablets",
            frequency="Twice daily for 3 days",
            duration_days=3,
        ),
        PrescriptionCounselingInputItem(
            medication_name="Amoxicillin / Clavulanic Acid 625mg",
            dosage="1 tablet",
            frequency="Twice daily for 7 days",
            duration_days=7,
        ),
    ]

    resp = generate_multilingual_counseling(
        prescription_items=items,
        target_language=SupportedCounselingLanguage.FRENCH,
        patient_name="Amivi Koffi",
    )

    assert resp.success is True
    assert resp.language == SupportedCounselingLanguage.FRENCH
    assert "Bonjour Amivi Koffi" in resp.patient_greeting
    assert "Français" in resp.language_display_name
    assert len(resp.medications_counseling) == 2

    # Check French counseling specifics
    coartem_counseling = resp.medications_counseling[0]
    assert "gras" in coartem_counseling.meal_instructions.lower() or "lait" in coartem_counseling.meal_instructions.lower()
    assert "3 jours" in coartem_counseling.warnings_and_precautions[0]

    amox_counseling = resp.medications_counseling[1]
    assert "antibiotique" in amox_counseling.warnings_and_precautions[0].lower()
    assert "repas" in amox_counseling.meal_instructions.lower()

    # Check French SMS summary
    assert "Bonjour Amivi Koffi" in resp.sms_whatsapp_dispatch_copy
    assert "Urgence" in resp.sms_whatsapp_dispatch_copy
