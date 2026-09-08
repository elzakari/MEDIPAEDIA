"""
==============================================================================
Medipaedia Core API Internationalization & Bilingual Support (en/fr)
==============================================================================
Provides locale resolution from Accept-Language headers and localized system
messages for Ghana, Togo, Benin, and UEMOA clinical deployments.
"""

from typing import Any, Dict, Optional
from fastapi import Header, Request

SUPPORTED_LOCALES = ["en", "fr"]
DEFAULT_LOCALE = "en"

BACKEND_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # System & Authentication
    "auth.unauthorized": {
        "en": "Authentication required. Please sign in with valid credentials.",
        "fr": "Authentification requise. Veuillez vous connecter avec des identifiants valides.",
    },
    "auth.forbidden": {
        "en": "Access denied. Insufficient role permissions for this operation.",
        "fr": "Accès refusé. Autorisations insuffisantes pour cette opération.",
    },
    "auth.token_expired": {
        "en": "Session token has expired. Please refresh or re-authenticate.",
        "fr": "Le jeton de session a expiré. Veuillez réactualiser votre connexion.",
    },
    "auth.seat_limit_exceeded": {
        "en": "Facility staff seat limit exceeded. Please upgrade subscription plan.",
        "fr": "Quota d'utilisateurs soignants dépassé. Veuillez mettre à niveau votre abonnement.",
    },
    "auth.branch_limit_exceeded": {
        "en": "Branch pavilion limit exceeded. Upgrade to Enterprise to add more branches.",
        "fr": "Nombre maximal de succursales atteint. Passez à l'abonnement Entreprise pour ajouter des sites.",
    },

    # Clinical & Patients
    "patient.not_found": {
        "en": "Patient record not found in registry.",
        "fr": "Dossier patient introuvable dans le répertoire.",
    },
    "consultation.not_found": {
        "en": "Consultation record not found.",
        "fr": "Dossier de consultation médicale introuvable.",
    },
    "vitals.saved": {
        "en": "Patient vital signs recorded and validated successfully.",
        "fr": "Constantes vitales du patient enregistrées et validées avec succès.",
    },
    "triage.esi_critical": {
        "en": "CRITICAL ALERT: Patient categorized as ESI Level 1/2. Immediate resuscitation bay dispatch required.",
        "fr": "ALERTE CRITIQUE : Patient classé ESI Niveau 1/2. Transfert immédiat en salle de déchocage requis.",
    },

    # Pharmacy & Dispensary
    "prescription.not_found": {
        "en": "Prescription claim PIN not found or expired.",
        "fr": "Code PIN d'ordonnance introuvable ou expiré.",
    },
    "prescription.already_dispensed": {
        "en": "Prescription has already been fully dispensed.",
        "fr": "Cette ordonnance a déjà été entièrement délivrée.",
    },
    "inventory.insufficient_stock": {
        "en": "Insufficient FEFO physical stock on hand for selected medication.",
        "fr": "Stock physique PEPS disponible insuffisant pour ce médicament.",
    },
    "narcotics.authorization_required": {
        "en": "Dispensing Act 857 Class A/B controlled substances requires superintendent authorization.",
        "fr": "La délivrance de substances vénéneuses Tableaux A/B nécessite l'autorisation du pharmacien responsable.",
    },
    "quarantine.frozen": {
        "en": "Batch is quarantined and frozen. Dispensing is legally prohibited.",
        "fr": "Ce lot est sous séquestre/quarantaine. La délivrance est formellement interdite par la loi.",
    },

    # Finance & Revenue Cycle
    "billing.invoice_generated": {
        "en": "Consolidated patient invoice generated successfully.",
        "fr": "Facture patient consolidée générée avec succès.",
    },
    "billing.momo_push_initiated": {
        "en": "USSD Mobile Money push request dispatched to subscriber phone.",
        "fr": "Demande de paiement Push Mobile Money envoyée sur le mobile de l'abonné.",
    },
    "billing.payment_received": {
        "en": "Payment successfully confirmed and receipt recorded.",
        "fr": "Paiement validé avec succès et reçu fiscal émis.",
    },

    # Reception & Queue Announcements
    "queue.audio_call": {
        "en": "Attention please. Ticket {ticket}, please proceed to {clinic}.",
        "fr": "Attention s'il vous plaît. Ticket {ticket}, veuillez vous présenter à la {clinic}.",
    },
    "queue.ticket_issued": {
        "en": "Queue ticket {ticket} issued for triage intake.",
        "fr": "Ticket de file d'attente {ticket} émis pour le poste de triage.",
    },

    # Multilingual SMS / WhatsApp Notifications
    "sms.rx_counseling": {
        "en": "Hello {name}, your Medipaedia prescription instructions: {instructions}. Take with water after meals. Emergency: {phone}",
        "fr": "Bonjour {name}, vos consignes de prescription Medipaedia: {instructions}. Prendre avec de l'eau après les repas. Urgence: {phone}",
    },
    "sms.appointment_reminder": {
        "en": "Reminder: Your clinical appointment at {facility} is scheduled for {time}.",
        "fr": "Rappel: Votre rendez-vous médical à {facility} est prévu pour {time}.",
    },
}


def resolve_locale(accept_language: Optional[str] = None) -> str:
    """
    Parses Accept-Language header string and resolves to 'fr' or 'en'.
    Examples: 'fr-FR,fr;q=0.9,en;q=0.8' -> 'fr'
              'en-US,en;q=0.9' -> 'en'
    """
    if not accept_language:
        return DEFAULT_LOCALE

    lower = accept_language.lower()
    # Check if french is prioritized or present
    if "fr" in lower:
        # Check relative positioning if both en and fr are present
        en_pos = lower.find("en")
        fr_pos = lower.find("fr")
        if en_pos == -1 or fr_pos < en_pos:
            return "fr"
        # If en is listed first, verify q weights if present
        if "fr;" in lower or lower.startswith("fr"):
            return "fr"
    return "en"


def get_request_locale(
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
) -> str:
    """
    FastAPI dependency for locale extraction from HTTP request headers.
    """
    return resolve_locale(accept_language)


def t(key: str, locale: str = "en", **kwargs: Any) -> str:
    """
    Translates a backend dictionary key to target locale with parameter interpolation.
    """
    loc = "fr" if str(locale).lower().startswith("fr") else "en"
    entry = BACKEND_TRANSLATIONS.get(key)
    if not entry:
        return key

    text_template = entry.get(loc) or entry.get("en") or key
    if kwargs:
        try:
            return text_template.format(**kwargs)
        except Exception:
            return text_template
    return text_template
