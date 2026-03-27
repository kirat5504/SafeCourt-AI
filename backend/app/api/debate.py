import uuid
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import validate_session_id
from ..models.session import Session as SessionModel
from ..models.sanitized_output import SanitizedOutput
from ..models.debate import Debate
from ..services.debate import run_security_debate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run/{session_id}")
async def run_debate(
    session_id: str,
    db: Session = Depends(get_db),
):
    if not validate_session_id(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(SessionModel).filter(
        SessionModel.id == uuid.UUID(session_id),
        SessionModel.status == "active",
    ).first()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    recent_output = db.query(SanitizedOutput).filter(
        SanitizedOutput.session_id == uuid.UUID(session_id),
        SanitizedOutput.sanitized_text.isnot(None),
    ).order_by(SanitizedOutput.created_at.desc()).first()

    sanitized_text = None
    if recent_output and recent_output.sanitized_text:
        sanitized_text = recent_output.sanitized_text

    recent_debates = db.query(Debate).filter(
        Debate.session_id == uuid.UUID(session_id)
    ).order_by(Debate.created_at.desc()).limit(2).all()

    debate_history: list[dict] = []
    for d in reversed(recent_debates):
        debate_history.extend(d.transcript or [])

    if not sanitized_text:
        return {
            "session_id": session_id,
            "transcript": [
                {
                    "agent": "SYSTEM",
                    "text": "No case document found for this session. Please upload a case document via 'Upload Case' first."
                }
            ],
            "masked_content": None,
        }

    try:
        transcript, masked_content = run_security_debate(
            session_id=session_id,
            sanitized_text=sanitized_text,
            debate_history=debate_history,
        )

        debate = Debate(
            id=uuid.uuid4(),
            session_id=uuid.UUID(session_id),
            transcript=transcript,
        )
        db.add(debate)
        db.commit()

        return {
            "session_id": session_id,
            "transcript": transcript,
            "masked_content": masked_content,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debate failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Debate failed: {str(e)}")


@router.get("/session/{session_id}")
async def get_debate_history(
    session_id: str,
    db: Session = Depends(get_db),
):
    if not validate_session_id(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    debates = db.query(Debate).filter(
        Debate.session_id == uuid.UUID(session_id)
    ).order_by(Debate.created_at.desc()).all()

    return {
        "session_id": session_id,
        "debates": [
            {
                "id": str(d.id),
                "session_id": str(d.session_id),
                "transcript": d.transcript,
                "created_at": d.created_at.isoformat(),
            }
            for d in debates
        ],
    }
