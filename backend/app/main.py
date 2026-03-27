import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import init_db, engine
from .api import auth, health, sanitize, outputs, chat, debate, pipeline

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def migrate_db():
    """Add new columns to existing tables if they don't exist."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE sanitized_outputs ADD COLUMN IF NOT EXISTS sanitized_text TEXT"
            ))
            conn.commit()
            logger.info("DB migration: sanitized_text column ensured")
        except Exception as e:
            logger.warning(f"DB migration skipped: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VaultSim API...")
    try:
        init_db()
        logger.info("Database initialized")
        migrate_db()
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    yield
    logger.info("VaultSim API shutting down")


app = FastAPI(
    title="VaultSim API",
    description="Privacy-first tokenization platform backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Tokens",
        "X-Pages",
        "X-Processing-Time",
        "X-Gemini-Calls",
        "X-Processing-ID",
    ],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(sanitize.router, prefix="/api/sanitize", tags=["sanitize"])
app.include_router(outputs.router, prefix="/api/sanitize", tags=["outputs"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(debate.router, prefix="/api/debate", tags=["debate"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])


@app.get("/")
async def root():
    return {"message": "VaultSim API is running", "version": "1.0.0"}
