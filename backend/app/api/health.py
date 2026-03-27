from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.claude import is_claude_available
from ..core.redis_client import get_redis

router = APIRouter()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    checks = {}

    try:
        db.execute(__import__('sqlalchemy').text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    try:
        redis = get_redis()
        if redis:
            redis.ping()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "unavailable (using in-memory fallback)"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    checks["claude"] = "configured" if is_claude_available() else "not configured"

    overall = "ok" if checks.get("database") == "ok" else "degraded"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }
