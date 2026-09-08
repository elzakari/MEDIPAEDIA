from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import get_session_local
from app.db.init_live_db import init_live_database

logger = logging.getLogger("medipaedia.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks (e.g. init connection pools, Redis channels, statutory seed data)
    print(f"[*] Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    try:
        session_factory = get_session_local()
        async with session_factory() as session:
            init_result = await init_live_database(session)
            print(f"[*] Live DB initialized: super_admin={init_result['super_admin_email']}, icd10={init_result['statutory_icd10_seeded']}, meds={init_result['essential_medications_seeded']}, tariffs={init_result['nhis_gdrg_tariffs_seeded']}, plans={init_result['subscription_plans_seeded']}")
    except Exception as exc:
        logger.error(f"Lifespan statutory seeding failed: {exc}", exc_info=True)
        print(f"[!] Statutory seed skipped (non-fatal): {exc}")
    yield
    # Shutdown tasks
    print(f"[*] Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# CORS middleware configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

for origin in settings.BACKEND_CORS_ORIGINS:
    if origin not in origins:
        origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url}: {exc}", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )
    origin = request.headers.get("origin")
    if origin in origins or "*" in origins:
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# Include master API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
