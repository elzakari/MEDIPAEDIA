"""
Pydantic schemas for Super Admin SMTP Gateway configuration endpoints.

All payloads are `extra="forbid"` (pydantic v2 strict) so accidental
pass-through of unknown fields is rejected early with a 422.

Passwords are **never** returned in the clear from any GET response.
The :class:`SmtpConfigResult.password_masked` field always carries
a starred string of the correct length or ``"***"`` for short secrets.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

SmtpProviderLiteral = Literal["GMAIL", "GOOGLE_WORKSPACE", "AWS_SES", "SENDGRID", "CUSTOM"]
SmtpEncryptionLiteral = Literal["TLS", "SSL", "NONE"]


def _mask_password(clear_or_cipher: Optional[str]) -> str:
    """Mask a secret for Super Admin display; never expose cleartext."""
    if clear_or_cipher is None or clear_or_cipher == "":
        return "***"
    n = len(clear_or_cipher)
    if n < 4:
        return "***"
    return "*" * (n - 2) + clear_or_cipher[-2:]


# ---------------------------------------------------------------------------
# Upsert payload (pushed by Super Admin UI form)
# ---------------------------------------------------------------------------
class SmtpConfigUpsertPayload(BaseModel):
    model_config = {"extra": "forbid"}

    provider: SmtpProviderLiteral = Field(..., description="Provider preset slug (determines port/encryption fills)")
    smtp_host: str = Field(..., min_length=3, max_length=255)
    smtp_port: int = Field(..., ge=1, le=65535)
    encryption: SmtpEncryptionLiteral = Field(default="TLS")
    username: str = Field(..., min_length=1, max_length=255, description="SMTP auth username (or SES/SendGrid access-key)")
    password_cleartext: Optional[str] = Field(
        default=None,
        min_length=0,
        max_length=4096,
        description="Plaintext password / API secret (will be Fernet/XOR-encrypted at rest). Set to null/empty-string to keep existing ciphertext when updating.",
    )
    from_email: EmailStr
    from_name: Optional[str] = Field(default=None, max_length=255)

    @field_validator("smtp_host")
    @classmethod
    def _v_host(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("smtp_host cannot be blank")
        return cleaned

    @field_validator("username", "from_name")
    @classmethod
    def _v_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        return s or None


# ---------------------------------------------------------------------------
# Super Admin-facing result (password masked)
# ---------------------------------------------------------------------------
class SmtpConfigResult(BaseModel):
    id: UUID
    is_active: bool
    provider: Optional[SmtpProviderLiteral]
    smtp_host: str
    smtp_port: int
    encryption: SmtpEncryptionLiteral
    username: str
    password_masked: str
    from_email: str
    from_name: Optional[str]
    last_tested_at: Optional[datetime]
    last_tested_recipient: Optional[str]
    last_tested_ok: Optional[bool]
    updated_at: Optional[datetime]
    updated_by_id: Optional[UUID]


# ---------------------------------------------------------------------------
# Test connection payload + result
# ---------------------------------------------------------------------------
class SmtpTestConnectionPayload(BaseModel):
    model_config = {"extra": "forbid"}

    recipient_email: EmailStr = Field(..., description="Address that should receive the test email")
    save_settings_first: bool = Field(
        default=False,
        description="If true, upsert `settings` first, then send — useful for 'test-and-save' flows in the Super Admin UI.",
    )
    settings: Optional[SmtpConfigUpsertPayload] = Field(
        default=None,
        description="When `save_settings_first` is true, these settings are persisted before dispatching the test email.",
    )


class SmtpSendResult(BaseModel):
    status: Literal["sent", "preview", "error"]
    via: Literal["smtp", "console_preview", "error"]
    message_id: Optional[str] = None
    preview_text: Optional[str] = None
    error: Optional[str] = None
    config_id: Optional[str] = None


class SmtpTestConnectionResult(BaseModel):
    config: Optional[SmtpConfigResult] = None
    dispatch: SmtpSendResult
