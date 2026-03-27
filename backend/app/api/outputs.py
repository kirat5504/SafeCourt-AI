import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import validate_session_id
from ..models.sanitized_output import SanitizedOutput

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/outputs/{processing_id}")
async def get_outputs_by_processing_id(
    processing_id: str,
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    try:
        proc_uuid = uuid.UUID(processing_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid processing ID format")

    query = db.query(SanitizedOutput).filter(
        SanitizedOutput.processing_id == proc_uuid
    )

    if x_session_id and validate_session_id(x_session_id):
        query = query.filter(SanitizedOutput.session_id == uuid.UUID(x_session_id))

    outputs = query.all()

    return {
        "processing_id": processing_id,
        "outputs": [
            {
                "session_id": str(o.session_id),
                "input_type": o.input_type,
                "tokenized_content": o.tokenized_content,
                "engine": o.engine,
                "created_at": o.created_at.isoformat(),
            }
            for o in outputs
        ],
    }


@router.get("/outputs")
async def get_outputs_by_session(
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    if not x_session_id or not validate_session_id(x_session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    outputs = db.query(SanitizedOutput).filter(
        SanitizedOutput.session_id == uuid.UUID(x_session_id)
    ).order_by(SanitizedOutput.created_at.desc()).limit(100).all()

    return {
        "session_id": x_session_id,
        "outputs": [
            {
                "session_id": str(o.session_id),
                "input_type": o.input_type,
                "tokenized_content": o.tokenized_content,
                "engine": o.engine,
                "created_at": o.created_at.isoformat(),
            }
            for o in outputs
        ],
    }
