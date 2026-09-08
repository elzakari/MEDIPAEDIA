"""
Pydantic v2 schemas for the LiveKit WebRTC Telemedicine module.

All payloads enforce ``extra="forbid"`` for strict early validation.
The request/response pair here is consumed directly by the LiveKit
React SDK (``@livekit/components-react``) on the Super Admin / Doctor
clinical station pages.
"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request — issued when a doctor OR patient joins a consultation room
# ---------------------------------------------------------------------------
class TelemedicineTokenRequest(BaseModel):
    """Payload for ``POST /api/v1/telemedicine/token``.

    ``room_name`` is typically ``f"consultation-{consultation_id}"`` but
    callers may supply any non-empty string so the LiveKit Server can
    be reused for ad-hoc scenarios (e.g. nursing handoff huddles).
    """

    model_config = {"extra": "forbid"}

    consultation_id: str = Field(
        ...,
        min_length=2,
        max_length=64,
        description=(
            "Consultation reference used to scope the LiveKit room name. "
            "May be a UUID (string form) or any short string identifier."
        ),
    )
    room_name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=128,
        description=(
            "Explicit LiveKit room name. When omitted, the backend derives "
            "it from ``consultation-{consultation_id}``."
        ),
    )


# ---------------------------------------------------------------------------
# Response — consumed directly by LiveKit JS / React SDK <LiveKitRoom>
# ---------------------------------------------------------------------------
class TelemedicineTokenResponse(BaseModel):
    """Signed LiveKit JWT plus the fields the client needs to connect.

    Shape mirrors the ``<LiveKitRoom token=… serverUrl=…>`` React component
    props so the frontend can destructure directly:

    .. code-block:: tsx

        const { token, server_url, room_name, participant_name, participant_identity } =
          await apiClient.getTelemedicineToken({ consultation_id });
        <LiveKitRoom
          token={token}
          serverUrl={server_url}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={() => ...} />
    """

    model_config = {"extra": "allow"}

    token: str = Field(
        ...,
        min_length=64,
        description="LiveKit-signed HS256 JWT (VideoGrants.roomJoin + publish/subscribe).",
    )
    server_url: str = Field(
        ...,
        min_length=6,
        description="WebSocket LiveKit server URL (e.g. wss://telemed.medipaedia.ai).",
    )
    room_name: str = Field(
        ...,
        min_length=2,
        max_length=128,
        description="The LiveKit room name actually joined (derived when caller left it blank).",
    )
    participant_name: str = Field(
        ...,
        min_length=1,
        max_length=160,
        description="Human-readable display name for the participant roster.",
    )
    participant_identity: str = Field(
        ...,
        min_length=4,
        max_length=128,
        description="LiveKit participant identity — always the user.id UUID string.",
    )
