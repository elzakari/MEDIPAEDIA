import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class SystemSmtpConfig(BaseModel):
    __tablename__ = "system_smtp_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true", index=True)
    provider = Column(String(64), nullable=True, index=True)
    smtp_host = Column(String(255), nullable=False)
    smtp_port = Column(Integer, nullable=False, default=587, server_default="587")
    encryption = Column(String(16), nullable=False, default="TLS", server_default="TLS")
    username = Column(String(255), nullable=False)
    password_ciphertext = Column(Text, nullable=True)
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=True)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    last_tested_recipient = Column(String(255), nullable=True)
    last_tested_ok = Column(Boolean, nullable=True)
    updated_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
