"""
Super Admin SMTP Gateway endpoints.

All routes are protected by ``require_super_admin`` (applied at the
``APIRouter`` level) so no tenant-scoped or non-admin user can reach
this area.  Routes are mounted under **both** ``/admin/smtp`` and
``/super-admin/smtp`` (see ``api/v1/router.py``) matching the dual
mount pattern already used for the existing ``admin`` package.

Security rules enforced here (AC spec §AC-U2 rubric):

    * ``password_ciphertext`` is NEVER returned; GET calls expose
      :attr:`SmtpConfigResult.password_masked` only.
    * Upsert requests :attr:`SmtpConfigUpsertPayload.password_cleartext`
      are Fernet/XOR encrypted via :mod:`app.core.mailer` helpers and
      then immediately discarded — no logs, no audit cleartext.
    * AuditLog ``changes_json`` records the password field **only** as
      ``"***"`` (masked) regardless of whether the user supplied a new
      cleartext value or omitted the field.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import get_current_user, require_super_admin
from app.core.mailer import (
    _decrypt_smtp_password,
    _encrypt_smtp_password,
    render_test_email,
    send_system_email,
)
from app.models.audit import AuditLog
from app.models.smtp_config import SystemSmtpConfig
from app.models.user import User
from app.schemas.smtp import (
    SmtpConfigResult,
    SmtpConfigUpsertPayload,
    SmtpSendResult,
    SmtpTestConnectionPayload,
    SmtpTestConnectionResult,
    _mask_password,
)


router = APIRouter(dependencies=[Depends(require_super_admin)])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _row_to_result(row: SystemSmtpConfig) -> SmtpConfigResult:
    # NOTE: we deliberately inspect the raw ciphertext length so the mask
    # reflects the *stored* secret length (not a cleartext the caller
    # never sees).  Decryption is NOT performed for GET.
    return SmtpConfigResult(
        id=row.id,
        is_active=bool(row.is_active),
        provider=row.provider,  # type: ignore[arg-type]
        smtp_host=row.smtp_host,
        smtp_port=int(row.smtp_port or 587),
        encryption=row.encryption or "TLS",  # type: ignore[return-value]
        username=row.username,
        password_masked=_mask_password(row.password_ciphertext),
        from_email=row.from_email,
        from_name=row.from_name,
        last_tested_at=row.last_tested_at,
        last_tested_recipient=row.last_tested_recipient,
        last_tested_ok=row.last_tested_ok,
        updated_at=row.updated_at,
        updated_by_id=row.updated_by_id,
    )


async def _upsert_active_profile(
    *,
    db: AsyncSession,
    payload: SmtpConfigUpsertPayload,
    current_user: User,
) -> SystemSmtpConfig:
    """Idempotent upsert: ensure at-most-one active row, encrypt password."""
    # --- existing active profile, or create fresh ---------------------------
    stmt = select(SystemSmtpConfig).where(SystemSmtpConfig.is_active == True).limit(2)  # noqa: E712
    result = await db.execute(stmt)
    active_rows = list(result.scalars().all())
    target: Optional[SystemSmtpConfig] = None
    if len(active_rows) >= 1:
        target = active_rows[0]
        # Deactivate everything else if multiple rows were flagged active.
        if len(active_rows) > 1:
            others_ids = [r.id for r in active_rows[1:]]
            await db.execute(
                sql_update(SystemSmtpConfig)
                .where(SystemSmtpConfig.id.in_(others_ids))
                .values(is_active=False, updated_at=datetime.now(timezone.utc), updated_by_id=current_user.id)
            )

    # Diff + audit changes.
    old_values: dict = {}
    if target is not None:
        old_values = {
            "provider": target.provider,
            "smtp_host": target.smtp_host,
            "smtp_port": target.smtp_port,
            "encryption": target.encryption,
            "username": target.username,
            "from_email": target.from_email,
            "from_name": target.from_name,
            # Never log clear — record mask of previously-stored cipher.
            "password_masked": _mask_password(target.password_ciphertext),
        }
    else:
        target = SystemSmtpConfig(
            id=uuid.uuid4(),
            is_active=True,
        )
        db.add(target)

    target.provider = payload.provider
    target.smtp_host = payload.smtp_host
    target.smtp_port = int(payload.smtp_port)
    target.encryption = payload.encryption
    target.username = payload.username
    target.from_email = payload.from_email
    target.from_name = payload.from_name
    target.updated_by_id = current_user.id
    target.updated_at = datetime.now(timezone.utc)

    # Only overwrite ciphertext if the caller supplied a non-empty secret.
    if payload.password_cleartext is not None and payload.password_cleartext != "":
        target.password_ciphertext = _encrypt_smtp_password(payload.password_cleartext)

    new_values: dict = {
        "provider": target.provider,
        "smtp_host": target.smtp_host,
        "smtp_port": target.smtp_port,
        "encryption": target.encryption,
        "username": target.username,
        "from_email": target.from_email,
        "from_name": target.from_name,
        # Never log clear — password field is ALWAYS starred in audit.
        "password_masked": "***",
    }

    changes_json: dict = {
        "before": old_values or None,
        "after": new_values,
    }

    audit = AuditLog(
        id=uuid.uuid4(),
        actor_id=current_user.id,
        actor_role=(current_user.role.value if current_user.role else None),
        tenant_id=None,
        action="SMTP_CONFIG_UPDATED",
        resource_type="SYSTEM_SMTP_CONFIG",
        resource_id=str(target.id),
        changes_json=changes_json,
    )
    db.add(audit)
    await db.flush()

    # --- at-most-one active invariant: flip every other row off ------------
    await db.execute(
        sql_update(SystemSmtpConfig)
        .where(SystemSmtpConfig.id != target.id, SystemSmtpConfig.is_active == True)  # noqa: E712
        .values(is_active=False, updated_at=datetime.now(timezone.utc), updated_by_id=current_user.id)
    )

    await db.commit()
    await db.refresh(target)
    return target


async def _get_active_or_404(db: AsyncSession) -> SystemSmtpConfig:
    stmt = select(SystemSmtpConfig).where(SystemSmtpConfig.is_active == True).limit(1)  # noqa: E712
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active SMTP configuration exists.")
    return row


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get(
    "/smtp",
    response_model=Optional[SmtpConfigResult],
    status_code=status.HTTP_200_OK,
    summary="Fetch the currently-active SMTP profile (password masked).",
)
async def get_active_smtp_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SystemSmtpConfig).where(SystemSmtpConfig.is_active == True).limit(1)  # noqa: E712
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row is None:
        return None
    return _row_to_result(row)


@router.post(
    "/smtp",
    response_model=SmtpConfigResult,
    status_code=status.HTTP_200_OK,
    summary="Upsert (create-or-replace) the active SMTP configuration.",
)
async def upsert_smtp_config(
    payload: SmtpConfigUpsertPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await _upsert_active_profile(db=db, payload=payload, current_user=current_user)
    return _row_to_result(row)


@router.post(
    "/smtp/test",
    response_model=SmtpTestConnectionResult,
    status_code=status.HTTP_200_OK,
    summary="Send a test email (optionally save settings first) to verify relay connectivity.",
)
async def test_smtp_connection(
    payload: SmtpTestConnectionPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg_row: Optional[SystemSmtpConfig] = None
    if payload.save_settings_first:
        if payload.settings is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="save_settings_first=true but `settings` field was not provided.",
            )
        cfg_row = await _upsert_active_profile(db=db, payload=payload.settings, current_user=current_user)
    else:
        stmt = select(SystemSmtpConfig).where(SystemSmtpConfig.is_active == True).limit(1)  # noqa: E712
        result = await db.execute(stmt)
        cfg_row = result.scalars().first()

    # Build render-friendly label (decrypt not required, host:port/encryption/provider is enough)
    if cfg_row is not None:
        hint = f"{cfg_row.provider or 'CUSTOM'} — {cfg_row.smtp_host}:{cfg_row.smtp_port} ({cfg_row.encryption})"
        sender_label = f"{cfg_row.from_name or 'Medipaedia Cloud Health'} <{cfg_row.from_email}>"
    else:
        hint = "UNCONFIGURED — console preview"
        sender_label = "Medipaedia Cloud Health <noreply@medipaedia.invalid>"

    recipient = payload.recipient_email
    html_body = render_test_email(
        config_hint=hint,
        sender_label=sender_label,
        recipient_email=recipient,
    )
    subject = "Medipaedia SMTP Gateway — connection test ✅"

    dispatch = await send_system_email(recipient, subject, html_body, db)
    send_result = SmtpSendResult(**dispatch.to_dict())

    # Update the row's health fields if we actually used a real profile (so GET /smtp shows last run).
    if cfg_row is not None:
        cfg_row.last_tested_at = datetime.now(timezone.utc)
        cfg_row.last_tested_recipient = recipient
        cfg_row.last_tested_ok = send_result.status == "sent"
        cfg_row.updated_by_id = current_user.id
        cfg_row.updated_at = datetime.now(timezone.utc)
        db.add(cfg_row)
        audit = AuditLog(
            id=uuid.uuid4(),
            actor_id=current_user.id,
            actor_role=(current_user.role.value if current_user.role else None),
            tenant_id=None,
            action="SMTP_TEST_SENT",
            resource_type="SYSTEM_SMTP_CONFIG",
            resource_id=str(cfg_row.id),
            changes_json={
                "recipient_email": recipient,
                "dispatch_status": send_result.status,
                "dispatch_via": send_result.via,
                "error": send_result.error,
                "message_id": send_result.message_id,
            },
        )
        db.add(audit)
        await db.commit()
        await db.refresh(cfg_row)

    return SmtpTestConnectionResult(
        config=_row_to_result(cfg_row) if cfg_row is not None else None,
        dispatch=send_result,
    )
