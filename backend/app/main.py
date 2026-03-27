import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import init_db
from .api import auth, health, sanitize, outputs, chat, debate

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VaultSim API...")
    try:
        init_db()
        logger.info("Database initialized")
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


@app.get("/")
async def root():
    return {"message": "VaultSim API is running", "version": "1.0.0"}
