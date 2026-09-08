"""
Medipaedia Core API — System Email Dispatch Engine
===================================================

Asynchronous dispatcher using standard-library smtplib wrapped inside
``asyncio.to_thread`` so the blocking SMTP calls never stall the FastAPI
event-loop.  Two branded Gmail-friendly inline-CSS HTML templates are
provided:

    * render_password_reset_email(...)   — 24h one-time reset (with 15m
      "first-fifteen" warning banner for very-short validity windows).
    * render_test_email(...)              — SMTP gateway health probe.

If no ``SystemSmtpConfig`` row is marked ``is_active=True`` the engine
drops into **console-preview mode**: a structured ``logger.info`` block
is emitted so developers can visually verify the exact email body that
*would* have been dispatched without needing a live SMTP relay.

Password-at-rest cipher
-----------------------
When ``cryptography >= 41`` is available (optional) we use Fernet with
``SECRET_KEY`` (SHA-256 derived -> 32 bytes) for SMTP credentials.  If
the package is missing the code transparently falls back to an XOR
obfuscator + base64 envelope **and logs a warning** — passwords are
never stored in the clear regardless of which cipher path is taken.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import smtplib
import socket
import ssl as ssl_module
from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.smtp_config import SystemSmtpConfig

logger = logging.getLogger("medipaedia.mailer")

# ---------------------------------------------------------------------------
# Optional Fernet cipher (cryptography >= 41) — fall back to XOR+base64.
# ---------------------------------------------------------------------------
try:  # pragma: no cover - optional dep
    from cryptography.fernet import Fernet, InvalidToken  # type: ignore

    _FERNET: Optional[Fernet] = None
    _CIPHER_AVAILABLE = True

    def _fernet() -> Fernet:
        global _FERNET
        if _FERNET is None:
            if not settings.SECRET_KEY:
                raise RuntimeError("SECRET_KEY is empty — cannot initialise Fernet mailer cipher")
            digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
            _FERNET = Fernet(base64.urlsafe_b64encode(digest))
        return _FERNET

except Exception:  # pragma: no cover - optional dep path
    _CIPHER_AVAILABLE = False
    logger.warning(
        "install cryptography>=41.0 to enable at-rest Fernet encryption of SMTP "
        "passwords; currently falling back to XOR+base64 obfuscation envelope."
    )


def _encrypt_smtp_password(cleartext: Optional[str]) -> Optional[str]:
    """Encrypt a cleartext SMTP password for storage.

    Empty/``None`` values pass through as ``None`` so callers never need
    to double-check whether the column already contains a valid ciphertext
    when the user left the secret field blank in a form.
    """
    if cleartext is None or cleartext == "":
        return None
    if _CIPHER_AVAILABLE:
        return _fernet().encrypt(cleartext.encode("utf-8")).decode("ascii")
    # --- legacy fallback: XOR mask with SECRET_KEY bytes + b64 envelope ---
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY empty — cannot encrypt SMTP password")
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    clear_bytes = cleartext.encode("utf-8")
    xored = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(clear_bytes))
    return "X1::" + base64.urlsafe_b64encode(xored).decode("ascii")


def _decrypt_smtp_password(ciphertext: Optional[str]) -> Optional[str]:
    """Inverse of :func:`_encrypt_smtp_password`; ``None`` stays ``None``."""
    if ciphertext is None or ciphertext == "":
        return None
    if ciphertext.startswith("X1::"):
        if not settings.SECRET_KEY:
            raise RuntimeError("SECRET_KEY empty — cannot decrypt legacy SMTP password")
        key_bytes = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        raw = base64.urlsafe_b64decode(ciphertext[4:])
        xored = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(raw))
        return xored.decode("utf-8")
    if _CIPHER_AVAILABLE:
        try:
            return _fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
        except Exception:
            logger.error("Fernet could not decrypt stored SMTP password — reset credentials via Super Admin UI.")
            return None
    logger.error("cryptography package not installed AND ciphertext is not legacy X1 format — cannot decrypt SMTP password")
    return None


# ---------------------------------------------------------------------------
# Structured return type
# ---------------------------------------------------------------------------
@dataclass
class EmailDispatchResult:
    """Outcome of :func:`send_system_email` (never raises)."""

    status: str                        # "sent" | "preview" | "error"
    via: str                           # "smtp" | "console_preview" | "error"
    message_id: Optional[str] = None
    preview_text: Optional[str] = None
    error: Optional[str] = None
    config_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "via": self.via,
            "message_id": self.message_id,
            "preview_text": self.preview_text,
            "error": self.error,
            "config_id": self.config_id,
        }


# ---------------------------------------------------------------------------
# HTML template renderers — 100 % inline style attributes, no <style> blocks
# so Gmail's sanitiser cannot strip branding.
# ---------------------------------------------------------------------------
_BRAND_TEAL = "#0F766E"
_BRAND_CREAM = "#FFFBF2"
_BRAND_BLACK = "#1C1917"
_BRAND_MUTED = "#57534E"
_BORDER = "#E7E5E4"


def render_password_reset_email(
    reset_link: str,
    validity_hours: int,
    recipient_name: Optional[str] = None,
    facility_name: Optional[str] = None,
) -> str:
    """Branded one-time password-reset notification (inline CSS only)."""
    salutation = f"Hi {recipient_name}," if recipient_name else "Hello,"
    facility_line = (
        f'<p style="margin:0 0 20px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:15px;line-height:1.5">'
        f'This password reset was requested by a Super Administrator for your account at <strong style="color:{_BRAND_BLACK}">{facility_name}</strong>.'
        f"</p>"
        if facility_name
        else ""
    )
    urgency_banner = ""
    if validity_hours <= 1:
        urgency_banner = (
            f'<div style="margin:0 0 20px 0;padding:12px 16px;background:#FEF3C7;border:1px solid #F59E0B;'
            f'border-radius:6px;color:#92400E;font-family:Georgia,serif;font-size:14px;line-height:1.4">'
            f'<strong>Expires within {validity_hours} hour.</strong> Please use the link below immediately — '
            f"for security reasons this single-use token will be invalidated as soon as it is consumed or the window elapses."
            f"</div>"
        )
    elif validity_hours <= 15:
        urgency_banner = (
            f'<div style="margin:0 0 20px 0;padding:12px 16px;background:#ECFDF5;border:1px solid #10B981;'
            f'border-radius:6px;color:#065F46;font-family:Georgia,serif;font-size:14px;line-height:1.4">'
            f"<strong>Security notice.</strong> The highest-risk window is the first 15 minutes after issuance. "
            f"This link will self-expire in <strong>{validity_hours} hours</strong> and can only be used once."
            f"</div>"
        )
    else:
        urgency_banner = (
            f'<div style="margin:0 0 20px 0;padding:12px 16px;background:{_BRAND_CREAM};border:1px solid {_BRAND_TEAL};'
            f'border-radius:6px;color:#115E59;font-family:Georgia,serif;font-size:14px;line-height:1.4">'
            f"<strong>Valid for {validity_hours} hours.</strong> This is a single-use, time-limited token issued from the "
            f"Medipaedia Super Admin console. If you did not request a password change please forward this email to your "
            f"system administrator and ignore the link."
            f"</div>"
        )

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAFAF9;color:{_BRAND_BLACK};font-family:Georgia,'Times New Roman',serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF9;padding:32px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FFFFFF;border:1px solid {_BORDER};border-radius:10px;overflow:hidden">
  <tr>
    <td style="background:{_BRAND_TEAL};padding:20px 28px">
      <div style="color:#FFFFFF;font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:0.3px">Medipaedia Cloud Health</div>
      <div style="color:#CCFBF1;font-family:Georgia,serif;font-size:13px;margin-top:2px">One-time password reset link</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 28px 24px 28px">
      <p style="margin:0 0 18px 0;color:{_BRAND_BLACK};font-family:Georgia,serif;font-size:16px;line-height:1.5">{salutation}</p>
      {facility_line}
      {urgency_banner}
      <p style="margin:0 0 16px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:14px;line-height:1.5">
        Click the button below to set a new password for your Medipaedia account:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0"><tr>
        <td style="border-radius:8px;background:{_BRAND_TEAL}">
          <a href="{reset_link}" style="display:inline-block;padding:14px 24px;color:#FFFFFF;font-family:Georgia,serif;font-size:15px;
             font-weight:700;text-decoration:none;letter-spacing:0.2px">Reset My Password</a>
        </td>
      </tr></table>
      <p style="margin:0 0 8px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:13px;line-height:1.5">
        Or paste this URL into your browser:
      </p>
      <div style="background:{_BRAND_CREAM};border:1px dashed {_BORDER};padding:10px 12px;border-radius:6px;word-break:break-all">
        <code style="font-family:'Courier New',monospace;font-size:12px;color:{_BRAND_BLACK}">{reset_link}</code>
      </div>
      <hr style="border:none;border-top:1px solid {_BORDER};margin:28px 0 18px 0"/>
      <p style="margin:0 0 6px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:12px;line-height:1.5">
        <strong style="color:#7F1D1D">Important security note:</strong> Medipaedia will never ask you for your password,
        reset token, or two-factor code via email.  Delete this message if you are unsure of its provenance.
      </p>
      <p style="margin:0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:12px;line-height:1.5">
        Sent by Medipaedia Cloud Health &mdash; secure platform for hospitals, pharmacies and patients.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>"""


def render_test_email(
    config_hint: str,
    sender_label: str,
    recipient_email: str,
) -> str:
    """Branded connectivity-test email sent by :meth:`POST /smtp/test`."""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAFAF9;color:{_BRAND_BLACK};font-family:Georgia,'Times New Roman',serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF9;padding:32px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FFFFFF;border:1px solid {_BORDER};border-radius:10px;overflow:hidden">
  <tr>
    <td style="background:{_BRAND_TEAL};padding:20px 28px">
      <div style="color:#FFFFFF;font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:0.3px">Medipaedia Cloud Health</div>
      <div style="color:#CCFBF1;font-family:Georgia,serif;font-size:13px;margin-top:2px">SMTP Gateway &mdash; Connection Test</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 28px 24px 28px">
      <p style="margin:0 0 18px 0;color:{_BRAND_BLACK};font-family:Georgia,serif;font-size:16px;line-height:1.5">Hello Super Admin,</p>
      <p style="margin:0 0 18px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:14px;line-height:1.5">
        This is an automated connectivity test sent from the Medipaedia Super Admin Email &amp; SMTP Gateway console.
        If you are reading this message, the configured relay is working correctly.
      </p>
      <div style="background:{_BRAND_CREAM};border:1px solid {_BORDER};border-radius:8px;padding:18px 20px;margin:0 0 22px 0">
        <p style="margin:0 0 10px 0;font-family:Georgia,serif;font-size:14px;color:{_BRAND_BLACK}">
          <strong style="color:{_BRAND_TEAL}">Gateway:</strong> {config_hint}
        </p>
        <p style="margin:0 0 10px 0;font-family:Georgia,serif;font-size:14px;color:{_BRAND_BLACK}">
          <strong style="color:{_BRAND_TEAL}">Sender:</strong> {sender_label}
        </p>
        <p style="margin:0 0 10px 0;font-family:Georgia,serif;font-size:14px;color:{_BRAND_BLACK}">
          <strong style="color:{_BRAND_TEAL}">Recipient:</strong> {recipient_email}
        </p>
        <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:{_BRAND_BLACK}">
          <strong style="color:{_BRAND_TEAL}">Sent at:</strong> {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
        </p>
      </div>
      <hr style="border:none;border-top:1px solid {_BORDER};margin:22px 0 16px 0"/>
      <p style="margin:0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:12px;line-height:1.5">
        You may safely delete this message.  It was dispatched through the SMTP profile shown above.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>"""


def render_facility_onboarding_email(
    facility_name: str,
    onboarding_link: str,
    recipient_name: Optional[str],
    admin_email: str,
) -> str:
    """Facility onboarding invitation (spec Section 2 — 2nd template)."""
    salutation = f"Hi {recipient_name}," if recipient_name else "Hello,"
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAFAF9;color:{_BRAND_BLACK};font-family:Georgia,'Times New Roman',serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF9;padding:32px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FFFFFF;border:1px solid {_BORDER};border-radius:10px;overflow:hidden">
  <tr>
    <td style="background:{_BRAND_TEAL};padding:20px 28px">
      <div style="color:#FFFFFF;font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:0.3px">Medipaedia Cloud Health</div>
      <div style="color:#CCFBF1;font-family:Georgia,serif;font-size:13px;margin-top:2px">Facility Onboarding Invitation</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 28px 24px 28px">
      <p style="margin:0 0 18px 0;color:{_BRAND_BLACK};font-family:Georgia,serif;font-size:16px;line-height:1.5">{salutation}</p>
      <p style="margin:0 0 18px 0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:14px;line-height:1.5">
        <strong style="color:{_BRAND_BLACK}">{facility_name}</strong> has been provisioned on the Medipaedia Cloud Health platform.
        Please complete your administrator onboarding by clicking the button below:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0"><tr>
        <td style="border-radius:8px;background:{_BRAND_TEAL}">
          <a href="{onboarding_link}" style="display:inline-block;padding:14px 24px;color:#FFFFFF;font-family:Georgia,serif;font-size:15px;
             font-weight:700;text-decoration:none;letter-spacing:0.2px">Complete Onboarding</a>
        </td>
      </tr></table>
      <p style="margin:0;color:{_BRAND_MUTED};font-family:Georgia,serif;font-size:13px;line-height:1.5">
        Questions?  Contact your Super Admin at
        <a href="mailto:{admin_email}" style="color:{_BRAND_TEAL};text-decoration:underline">{admin_email}</a>.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>"""


# ---------------------------------------------------------------------------
# Synchronous SMTP send helper — runs inside asyncio.to_thread(...)
# ---------------------------------------------------------------------------
def _sync_send_email(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    config: SystemSmtpConfig,
    password_clear: Optional[str],
) -> str:
    """Return message-ID; raises on any transport error."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config.from_name or 'Medipaedia Cloud Health'} <{config.from_email}>"
    msg["To"] = to_email
    msg.set_content("This message uses an HTML body — please use an email client that supports HTML viewing.")
    msg.add_alternative(html_body, subtype="html")

    host = config.smtp_host
    port = int(config.smtp_port or 587)
    username = config.username or ""
    password = password_clear or ""
    encryption = (config.encryption or "TLS").upper()

    if encryption == "SSL":
        ctx = ssl_module.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as s:
            if username:
                s.login(username, password)
            s.send_message(msg)
    elif encryption == "NONE":
        with smtplib.SMTP(host, port, timeout=30) as s:
            if username:
                s.login(username, password)
            s.send_message(msg)
    else:  # TLS (STARTTLS) default
        ctx = ssl_module.create_default_context()
        with smtplib.SMTP(host, port, timeout=30) as s:
            s.ehlo()
            s.starttls(context=ctx)
            s.ehlo()
            if username:
                s.login(username, password)
            s.send_message(msg)

    return str(msg.get("Message-ID", f"<medipaedia-{datetime.utcnow().timestamp()}-{id(msg)}@local>"))


def _render_console_preview(*, to_email: str, subject: str, html_body: str) -> str:
    """Produce a colourful terminal-friendly preview block (HTML stripped to first 500 chars)."""
    import re
    plain = re.sub(r"<[^>]+>", " ", html_body or "")
    plain = re.sub(r"\s+", " ", plain).strip()
    snippet = plain if len(plain) <= 500 else plain[:497] + "..."
    lines = [
        "",
        "=" * 72,
        "MEDIPAEDIA MAILER — CONSOLE PREVIEW (no active SMTP profile configured)",
        "-" * 72,
        f"  To:       {to_email}",
        f"  Subject:  {subject}",
        f"  Sent at:  {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "-" * 72,
        f"  Body preview ({len(plain)} chars plaintext, first 500 shown):",
        "  " + snippet,
        "=" * 72,
        "",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public async dispatch entry point
# ---------------------------------------------------------------------------
async def send_system_email(
    to_email: str,
    subject: str,
    html_body: str,
    db: AsyncSession,
    **_: Any,
) -> EmailDispatchResult:
    """Send an email using the currently-active SMTP profile (if any).

    The function **never raises** — transport errors, missing profiles,
    malformed hostnames all collapse into a structured
    :class:`EmailDispatchResult` so callers can reliably surface status to
    the Super Admin UI (see :class:`GenerateAdminResetLinkResponse` email
    dispatch union fields and the ``/smtp/test`` endpoint).
    """
    if not to_email or "@" not in to_email:
        return EmailDispatchResult(
            status="error",
            via="error",
            error=f"invalid recipient email: {to_email!r}",
        )

    # Resolve active profile — exactly 0 or 1 rows should be is_active=True.
    active_cfg: Optional[SystemSmtpConfig] = None
    try:
        stmt = select(SystemSmtpConfig).where(SystemSmtpConfig.is_active == True).limit(2)  # noqa: E712
        result = await db.execute(stmt)
        rows = list(result.scalars().all())
        if len(rows) >= 1:
            active_cfg = rows[0]
            if len(rows) > 1:
                logger.warning(
                    "Multiple system_smtp_configs rows marked is_active=True; "
                    "using id=%s. Upsert endpoints should guarantee 0-or-1.",
                    active_cfg.id,
                )
    except Exception as exc:  # pragma: no cover - DB access failure path
        logger.error("mailer: could not query active SMTP profile: %s", exc)
        active_cfg = None

    if active_cfg is None:
        preview = _render_console_preview(to_email=to_email, subject=subject, html_body=html_body)
        logger.info(preview)
        return EmailDispatchResult(
            status="preview",
            via="console_preview",
            preview_text=preview,
        )

    password_clear = _decrypt_smtp_password(active_cfg.password_ciphertext)

    try:
        message_id = await asyncio.to_thread(
            _sync_send_email,
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            config=active_cfg,
            password_clear=password_clear,
        )
        return EmailDispatchResult(
            status="sent",
            via="smtp",
            message_id=message_id,
            config_id=str(active_cfg.id),
        )
    except (socket.gaierror, TimeoutError, OSError) as exc:
        logger.error("mailer: network error sending to %s via %s:%s — %s", to_email, active_cfg.smtp_host, active_cfg.smtp_port, exc)
        return EmailDispatchResult(status="error", via="error", error=f"Network/connectivity error: {exc}", config_id=str(active_cfg.id))
    except smtplib.SMTPException as exc:
        logger.error("mailer: SMTP error sending to %s via %s:%s — %s", to_email, active_cfg.smtp_host, active_cfg.smtp_port, exc)
        return EmailDispatchResult(status="error", via="error", error=f"SMTP protocol error: {exc}", config_id=str(active_cfg.id))
    except ssl_module.SSLError as exc:
        logger.error("mailer: SSL/TLS error sending to %s via %s:%s — %s", to_email, active_cfg.smtp_host, active_cfg.smtp_port, exc)
        return EmailDispatchResult(status="error", via="error", error=f"SSL/TLS handshake error: {exc}", config_id=str(active_cfg.id))
    except Exception as exc:  # pragma: no cover - defensive catch-all
        logger.exception("mailer: unexpected failure dispatching to %s", to_email)
        return EmailDispatchResult(status="error", via="error", error=f"Unexpected error: {exc}", config_id=str(active_cfg.id))
