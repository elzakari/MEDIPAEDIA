from datetime import datetime
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    status: str = Field(..., example="ok")
    timestamp: datetime
    version: str
    environment: str
    database: str = Field(..., example="connected")
    redis: str = Field(..., example="connected")
    postgis_version: str = Field(..., example="3.4")
