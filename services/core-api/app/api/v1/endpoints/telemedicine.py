"""
LiveKit WebRTC Telemedicine endpoints.

Exposes a single authenticated route for issuing per-user, per-room
LiveKit access tokens. The token grants:

* ``room_join=True`` scoped to the requested room
* ``can_publish=True`` + ``can_subscribe=True`` + ``can_publish_data=True``
  (audio/video/screen + data channel for in-room chat signals)

Tokens are short-lived (default 6 hours) and include a ``metadata`` JSON
string carrying ``user_id``, ``role``, and ``consultation_id`` so the
LiveKit webhook events (participant joined/left) can be reconciled back
to the Medipaedia consultation record.

Env-var contract (all overridable from ``services/core-api/.env``):

* ``LIVEKIT_URL``        — WebSocket URL of the LiveKit cluster
* ``LIVEKIT_API_KEY``    — API key from the dashboard / on-prem yaml
* ``LIVEKIT_API_SECRET`` — paired API secret for HS256 signing
"""
from __future__ import annotations

import json
import logging
import os
from datetime import timedelta
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from livekit.api import AccessToken, VideoGrants
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.telemedicine import (
    TelemedicineTokenRequest,
    TelemedicineTokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_livekit_env(key: str, fallback: str) -> str:
    """Return an env variable with explicit fallback to Settings.

    The user-facing spec states values are read from environment variables
    first, with an ``app settings`` fallback — this helper enforces that
    order so a fresh container with empty env strings still boots using
    the development defaults declared in :class:`app.core.config.Settings`.
    Empty-string env values are treated as unset so the ``Settings``
    default wins.
    """
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return fallback
    return raw


def _participant_display_name(user: User) -> str:
    """Return the roster-ready display label for a participant."""
    first = getattr(user, "first_name", None) or None
    last = getattr(user, "last_name", None) or None
    if first or last:
        full = " ".join(part for part in [first, last] if part).strip()
        if full:
            return full
    email = getattr(user, "email", None)
    if email:
        return email
    return f"user-{str(user.id)[:8]}"


def _role_slug(user: User) -> str:
    role_enum = getattr(user, "role", None)
    if role_enum is None:
        return "GUEST"
    # UserRole is a str, enum.Enum — both support .value and str coercion.
    if isinstance(role_enum, str):
        return role_enum
    if hasattr(role_enum, "value"):
        try:
            return str(role_enum.value)
        except Exception:  # pragma: no cover - defensive
            return str(role_enum)
    return str(role_enum)


def _build_room_name(payload_room: Optional[str], consultation_id: str) -> str:
    """Derive the LiveKit room name when caller leaves it blank."""
    if payload_room and payload_room.strip() != "":
        return payload_room.strip()
    return f"consultation-{consultation_id}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/token", response_model=TelemedicineTokenResponse, tags=["Telemedicine"])
async def issue_telemedicine_token(
    payload: TelemedicineTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TelemedicineTokenResponse:
    """Issue a signed LiveKit JWT for the authenticated participant.

    **Scopes**: ``room_join`` (scoped) + ``can_publish`` + ``can_subscribe``
    + ``can_publish_data``.

    **Identity**: ``str(current_user.id)`` — the caller's User UUID string,
    which guarantees LiveKit webhook events reconcile back to Medipaedia
    users 1:1 without collisions.

    **Metadata** (JSON string embedded in the JWT, readable by LiveKit
    server-side hooks and client SDK roster callbacks):

    .. code-block:: json

       {
         "user_id": "<uuid>",
         "role": "DOCTOR" | "PHARMACIST_ADMIN" | "SUPER_ADMIN" | "PATIENT" | …,
         "consultation_id": "<consultation_id from request>"
       }
    """
    # --- LiveKit connection parameters -----------------------------------
    lk_url = _resolve_livekit_env("LIVEKIT_URL", settings.LIVEKIT_URL)
    lk_key = _resolve_livekit_env("LIVEKIT_API_KEY", settings.LIVEKIT_API_KEY)
    lk_secret = _resolve_livekit_env("LIVEKIT_API_SECRET", settings.LIVEKIT_API_SECRET)

    if (
        not lk_url
        or not lk_key
        or not lk_secret
        or lk_key.startswith("dev-livekit-")
        or lk_secret.startswith("dev-livekit-")
    ):
        # In dev we still issue tokens so the UI can be worked on; the
        # LiveKit Server will simply reject any connection attempt until
        # real credentials are supplied. Warn once so operators can see.
        logger.warning(
            "telemedicine/token: Using placeholder LIVEKIT_API_KEY/SECRET. "
            "Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET env vars "
            "for production WebRTC connections."
        )

    # --- Resolve room + participant identity ------------------------------
    room_name = _build_room_name(payload.room_name, payload.consultation_id)
    participant_identity = str(current_user.id)
    participant_name = _participant_display_name(current_user)
    role_slug = _role_slug(current_user)

    metadata_payload: dict[str, Any] = {
        "user_id": str(current_user.id),
        "role": role_slug,
        "consultation_id": payload.consultation_id,
    }
    try:
        metadata_json = json.dumps(metadata_payload, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serialize participant metadata: {exc}",
        ) from exc

    # --- Build + sign JWT -------------------------------------------------
    try:
        at = (
            AccessToken(lk_key, lk_secret)
            .with_identity(participant_identity)
            .with_name(participant_name)
            .with_metadata(metadata_json)
            .with_ttl(timedelta(seconds=21600))  # 6 hours — long enough for multi-day
                              # observation sessions; short enough that
                              # leaked tokens are not catastrophic.
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_subscribe=True,
                    can_publish_data=True,
                )
            )
        )
        signed_jwt = at.to_jwt()
    except Exception as exc:  # pragma: no cover - defensive (crypto failures)
        logger.exception("telemedicine/token: LiveKit AccessToken signing failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LiveKit token signing failed: {exc}",
        ) from exc

    return TelemedicineTokenResponse(
        token=signed_jwt,
        server_url=lk_url,
        room_name=room_name,
        participant_name=participant_name,
        participant_identity=participant_identity,
    )
