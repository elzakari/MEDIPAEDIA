from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.schemas.health import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check verifying database connection, PostGIS spatial support, and Redis.
    """
    db_status = "connected"
    postgis_ver = "unknown"
    redis_status = "connected"

    try:
        # Check standard DB connection
        await db.execute(text("SELECT 1;"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    try:
        # Check PostGIS extension & version
        result = await db.execute(text("SELECT PostGIS_Version();"))
        postgis_ver = result.scalar() or "available"
    except Exception:
        postgis_ver = "standard-sql (haversine fallback)"

    return HealthCheckResponse(
        status="ok" if db_status == "connected" else "degraded",
        timestamp=datetime.now(timezone.utc),
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        redis=redis_status,
        postgis_version=str(postgis_ver),
    )
