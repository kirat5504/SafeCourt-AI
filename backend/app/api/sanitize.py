import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.config import settings
from ..core.security import validate_session_id
from ..models.session import Session as SessionModel
from ..models.sanitized_output import SanitizedOutput
from ..services.sanitizer import sanitize_text_with_gemini, sanitize_pdf_with_gemini

router = APIRouter()
logger = logging.getLogger(__name__)


class SanitizeTextRequest(BaseModel):
    text: str


def get_session(session_id: str, db: Session) -> SessionModel:
    if not session_id or not validate_session_id(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(SessionModel).filter(
        SessionModel.id == uuid.UUID(session_id),
        SessionModel.status == "active",
    ).first()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return session


@router.post("/text")
async def sanitize_text(
    request_body: SanitizeTextRequest,
    x_session_id: str = Header(None, alias="X-Session-ID"),
    x_processing_id: str = Header(None, alias="X-Processing-ID"),
    db: Session = Depends(get_db),
):
    session = get_session(x_session_id, db)

    if not request_body.text or len(request_body.text) > settings.max_text_length:
        raise HTTPException(status_code=400, detail="Text is empty or too long")

    if not x_processing_id:
        x_processing_id = str(uuid.uuid4())

    try:
        sanitized_text, tokens = sanitize_text_with_gemini(request_body.text)

        if tokens:
            output = SanitizedOutput(
                id=uuid.uuid4(),
                session_id=session.id,
                processing_id=uuid.UUID(x_processing_id) if validate_session_id(x_processing_id) else uuid.uuid4(),
                input_type="text",
                tokenized_content=json.dumps(tokens),
                engine="gemini",
            )
            db.add(output)
            db.commit()

        session.last_active = datetime.now(timezone.utc)
        db.commit()

        return {
            "sanitized_text": sanitized_text,
            "tokens": tokens,
            "engine": "gemini",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text sanitization failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sanitization failed: {str(e)}")


@router.post("/pdf")
async def sanitize_pdf(
    file: UploadFile = File(...),
    x_session_id: str = Header(None, alias="X-Session-ID"),
    x_processing_id: str = Header(None, alias="X-Processing-ID"),
    db: Session = Depends(get_db),
):
    session = get_session(x_session_id, db)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    pdf_bytes = await file.read()

    if len(pdf_bytes) > settings.max_pdf_size_bytes:
        raise HTTPException(status_code=413, detail="PDF file too large")

    if not x_processing_id:
        x_processing_id = str(uuid.uuid4())

    try:
        sanitized_pdf, tokens, pages, processing_time, gemini_calls = sanitize_pdf_with_gemini(pdf_bytes)

        if tokens:
            try:
                proc_uuid = uuid.UUID(x_processing_id)
            except Exception:
                proc_uuid = uuid.uuid4()

            output = SanitizedOutput(
                id=uuid.uuid4(),
                session_id=session.id,
                processing_id=proc_uuid,
                input_type="pdf",
                tokenized_content=json.dumps(tokens),
                engine="gemini",
            )
            db.add(output)
            db.commit()

        session.last_active = datetime.now(timezone.utc)
        db.commit()

        token_ids = list(tokens.keys())

        return Response(
            content=sanitized_pdf,
            media_type="application/pdf",
            headers={
                "X-Tokens": ",".join(token_ids),
                "X-Pages": str(pages),
                "X-Processing-Time": str(round(processing_time, 3)),
                "X-Gemini-Calls": str(gemini_calls),
                "X-Processing-ID": x_processing_id,
                "Content-Disposition": f"inline; filename=sanitized_{file.filename}",
                "Access-Control-Expose-Headers": "X-Tokens,X-Pages,X-Processing-Time,X-Gemini-Calls,X-Processing-ID",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF sanitization failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")
