import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, Union
import jwt
from jwt.exceptions import PyJWTError, ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext
from app.core.config import settings

# Password Context supporting bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

REFRESH_TOKEN_EXPIRE_DAYS = 7
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_token(raw_token: str) -> str:
    """
    SHA-256 hash a raw password-reset token for secure storage.
    Case-insensitive: the raw token is always hex so case doesn't matter,
    but we strip + lowercase the input defensively before digesting.
    """
    cleaned = (raw_token or "").strip().lower()
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()


def generate_secure_reset_token() -> Tuple[str, str]:
    """
    Generate a 256-bit CSPRNG reset token (64 hex chars).
    Returns (raw_token, sha256_digest). Only raw is delivered once in the reset URL;
    only digest is persisted to DB.
    """
    raw = secrets.token_hex(32)
    return raw, hash_token(raw)


def clamp_reset_validity_hours(requested: Optional[int]) -> int:
    """
    Clamp requested reset-token validity hours to the [1..72] hour window.
    Default = 24 (Super Admin drawer default per spec).
    """
    if requested is None:
        return 24
    try:
        n = int(requested)
    except (TypeError, ValueError):
        return 24
    if n < 1:
        return 1
    if n > 72:
        return 72
    return n


def create_access_token(
    subject: Union[str, Any],
    role: str,
    tenant_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Creates a cryptographically signed short-lived JWT Access Token (default 60 mins) using PyJWT.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "type": "access",
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        for k, v in extra_claims.items():
            if v is None or (isinstance(v, list) and len(v) == 0):
                continue
            to_encode.setdefault(k, v)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: Union[str, Any],
    role: str,
    tenant_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Creates a long-lived JWT Refresh Token (default 7 days) for rotating access tokens using PyJWT.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        for k, v in extra_claims.items():
            if v is None or (isinstance(v, list) and len(v) == 0):
                continue
            to_encode.setdefault(k, v)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT token payload against the secret key using PyJWT.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except PyJWTError as e:
        raise ValueError(f"Invalid or expired token: {str(e)}")


def generate_prescription_signature(
    prescription_id: str,
    patient_id: str,
    doctor_id: str,
    tenant_id: str,
    items: list,
    timestamp: str,
) -> str:
    """
    Computes an immutable HMAC-SHA256 verification hash across prescription attributes.
    """
    canonical_payload = {
        "prescription_id": str(prescription_id),
        "patient_id": str(patient_id),
        "doctor_id": str(doctor_id),
        "tenant_id": str(tenant_id),
        "items": sorted(
            [
                {
                    "medication": item.get("medication_name"),
                    "dosage": item.get("dosage"),
                    "quantity": item.get("quantity_prescribed"),
                }
                for item in items
            ],
            key=lambda x: str(x.get("medication")),
        ),
        "timestamp": timestamp,
    }

    serialized = json.dumps(canonical_payload, sort_keys=True)
    signature = hmac.new(
        settings.PRESCRIPTION_HMAC_SECRET.encode("utf-8"),
        serialized.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return signature


def verify_prescription_signature(
    signature: str,
    prescription_id: str,
    patient_id: str,
    doctor_id: str,
    tenant_id: str,
    items: list,
    timestamp: str,
) -> bool:
    expected_signature = generate_prescription_signature(
        prescription_id=prescription_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=items,
        timestamp=timestamp,
    )
    return hmac.compare_digest(signature, expected_signature)
