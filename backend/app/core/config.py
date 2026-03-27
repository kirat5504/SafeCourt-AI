import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/vaultsim")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    session_ttl_seconds: int = int(os.getenv("SESSION_TTL_SECONDS", "1800"))
    rate_limit_requests_per_minute: int = int(os.getenv("RATE_LIMIT_RPM", "60"))
    max_text_length: int = int(os.getenv("MAX_TEXT_LENGTH", "100000"))
    max_pdf_size_bytes: int = int(os.getenv("MAX_PDF_SIZE_BYTES", str(10 * 1024 * 1024)))
    allowed_origins: list[str] = ["*"]
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
