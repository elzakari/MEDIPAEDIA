import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Medipaedia Core API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/medipaedia_db"
    )
    SYNC_DATABASE_URL: str = (
        "postgresql://postgres:postgres@localhost:5432/medipaedia_db"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & Auth
    SECRET_KEY: str = "dev_jwt_super_secret_key_medipaedia_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    PRESCRIPTION_HMAC_SECRET: str = (
        "dev_hmac_secret_for_cryptographic_prescription_signature_32chars"
    )
    ADMIN_ROOT_EMAIL: str = "elzakari@easymsdigit.com"
    ADMIN_ROOT_PASSWORD: str = "Barbie@1983#2026"
    ALLOW_DEMO_LOGIN_FALLBACK: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://localhost:8000",
    ]

    # Geolocation Defaults (Accra, Ghana standard)
    DEFAULT_LATITUDE: float = 5.6037
    DEFAULT_LONGITUDE: float = -0.1870
    DEFAULT_COUNTRY: str = "GH"
    DEFAULT_CURRENCY: str = "GHS"

    # Frontend portal URLs (override via .env for production)
    FRONTEND_URL: str = "http://localhost:3000"
    PHARMACY_POS_URL: str = "http://localhost:3001"

    # Payment Gateways (West Africa Multi-Country: Ghana GHS, Togo & Benin XOF)
    PAYSTACK_SECRET_KEY: str = "sk_test_mock_paystack_secret_key"
    PAYSTACK_PUBLIC_KEY: str = "pk_test_mock_paystack_public_key"
    FEDAPAY_SECRET_KEY: str = "sk_sandbox_fedapay_secret_key_xof"
    FEDAPAY_PUBLIC_KEY: str = "pk_sandbox_fedapay_public_key_xof"
    FEDAPAY_ENVIRONMENT: str = "sandbox"
    HUB2_SECRET_KEY: str = "hub2_secret_key_west_africa_xof"

    # LiveKit WebRTC Telemedicine Gateway
    #   Production: point LIVEKIT_URL at self-hosted or Cloud cluster
    #   (e.g. "wss://telemed.medipaedia.ai").
    #   API key/secret pair generated from LiveKit Cloud dashboard or
    #   the on-prem livekit-server yaml config.
    LIVEKIT_URL: str = "wss://telemed.medipaedia.ai"
    LIVEKIT_API_KEY: str = "dev-livekit-api-key-change-in-production"
    LIVEKIT_API_SECRET: str = "dev-livekit-api-secret-change-in-production"

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
