import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import generate_session_id, generate_challenge, validate_session_id
from ..core.config import settings
from ..models.session import Session as SessionModel

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/session")
async def create_session(request: Request, db: Session = Depends(get_db)):
    try:
        session_id = generate_session_id()
        challenge = generate_challenge()
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        db_session = SessionModel(
            id=uuid.UUID(session_id),
            challenge=challenge,
            ip_address=client_ip,
            user_agent=user_agent,
            status="active",
        )
        db.add(db_session)
        db.commit()

        logger.info(f"Session created: {session_id[:8]}...")

        return {
            "session_id": session_id,
            "challenge": challenge,
            "expires_in": settings.session_ttl_seconds,
        }
    except Exception as e:
        logger.error(f"Session creation failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/session")
async def get_session_status(
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    if not x_session_id or not validate_session_id(x_session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    try:
        session = db.query(SessionModel).filter(
            SessionModel.id == uuid.UUID(x_session_id),
            SessionModel.status == "active",
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        now = datetime.now(timezone.utc)
        created_naive = session.created_at.replace(tzinfo=None) if session.created_at.tzinfo else session.created_at
        created_aware = session.created_at if session.created_at.tzinfo else session.created_at.replace(tzinfo=timezone.utc)
        last_active_aware = session.last_active if session.last_active.tzinfo else session.last_active.replace(tzinfo=timezone.utc)

        ttl = settings.session_ttl_seconds - int((now - created_aware).total_seconds())

        return {
            "session_id": x_session_id,
            "session_data": {
                "created_at": session.created_at.isoformat(),
                "last_active": session.last_active.isoformat(),
                "requests": 0,
            },
            "pipeline_status": "idle",
            "ttl_seconds": max(0, ttl),
            "active": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve session")


@router.delete("/session")
async def terminate_session(
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    if not x_session_id or not validate_session_id(x_session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    try:
        session = db.query(SessionModel).filter(
            SessionModel.id == uuid.UUID(x_session_id)
        ).first()

        if session:
            session.status = "terminated"
            session.terminated_at = datetime.now(timezone.utc)
            db.commit()

        return {"message": "Session terminated"}
    except Exception as e:
        logger.error(f"Session termination failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to terminate session")
