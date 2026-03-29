"""
Full pipeline endpoint: Upload PDF/text → Sanitize → Debate → Verdict
"""
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from ..core.database import get_db
from ..core.security import validate_session_id
from ..models.session import Session as SessionModel
from ..models.sanitized_output import SanitizedOutput
from ..models.debate import Debate
from ..services.sanitizer import sanitize_text_with_claude, sanitize_pdf_with_gemini
from ..services.debate import run_security_debate
from ..core.claude import get_claude_client, is_claude_available, CLAUDE_MODEL

router = APIRouter()
logger = logging.getLogger(__name__)


class PipelineTextRequest(BaseModel):
    text: str


class SimplifyRequest(BaseModel):
    text: str


def _get_session(session_id: str, db: DBSession) -> SessionModel:
    if not session_id or not validate_session_id(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = db.query(SessionModel).filter(
        SessionModel.id == uuid.UUID(session_id),
        SessionModel.status == "active",
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session


@router.post("/run/text")
async def pipeline_text(
    request_body: PipelineTextRequest,
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: DBSession = Depends(get_db),
):
    """Sanitize text then immediately run debate on the sanitized content."""
    session = _get_session(x_session_id, db)
    processing_id = uuid.uuid4()

    try:
        sanitized_text, tokens = sanitize_text_with_claude(request_body.text)

        output = SanitizedOutput(
            id=uuid.uuid4(),
            session_id=session.id,
            processing_id=processing_id,
            input_type="text",
            tokenized_content=json.dumps(tokens),
            sanitized_text=sanitized_text,
            engine="claude",
        )
        db.add(output)
        db.commit()

        transcript, _ = run_security_debate(
            session_id=str(session.id),
            sanitized_text=sanitized_text,
        )

        debate_record = Debate(
            id=uuid.uuid4(),
            session_id=session.id,
            transcript=transcript,
        )
        db.add(debate_record)
        session.last_active = datetime.now(timezone.utc)
        db.commit()

        return {
            "original_text": request_body.text,
            "sanitized_text": sanitized_text,
            "token_map": tokens,
            "debate_transcript": transcript,
            "processing_id": str(processing_id),
            "engine": "claude",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline (text) failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@router.post("/run/pdf")
async def pipeline_pdf(
    file: UploadFile = File(...),
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: DBSession = Depends(get_db),
):
    """Sanitize PDF then immediately run debate on the sanitized content."""
    session = _get_session(x_session_id, db)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF file too large (max 10MB)")

    processing_id = uuid.uuid4()

    try:
        sanitized_pdf, tokens, pages, processing_time, claude_calls, extracted_text = sanitize_pdf_with_gemini(pdf_bytes)

        output = SanitizedOutput(
            id=uuid.uuid4(),
            session_id=session.id,
            processing_id=processing_id,
            input_type="pdf",
            tokenized_content=json.dumps(tokens),
            sanitized_text=extracted_text,
            engine="claude",
        )
        db.add(output)
        db.commit()

        transcript, _ = run_security_debate(
            session_id=str(session.id),
            sanitized_text=extracted_text,
        )

        debate_record = Debate(
            id=uuid.uuid4(),
            session_id=session.id,
            transcript=transcript,
        )
        db.add(debate_record)
        session.last_active = datetime.now(timezone.utc)
        db.commit()

        return {
            "filename": file.filename,
            "pages": pages,
            "processing_time_sec": round(processing_time, 3),
            "sanitized_text": extracted_text,
            "token_map": tokens,
            "debate_transcript": transcript,
            "processing_id": str(processing_id),
            "engine": "claude",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline (PDF) failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@router.post("/simplify-verdict")
async def simplify_verdict(
    request_body: SimplifyRequest,
    x_session_id: str = Header(None, alias="X-Session-ID"),
    db: DBSession = Depends(get_db),
):
    """Convert a legal verdict into plain English while preserving meaning."""
    _get_session(x_session_id, db)

    if not is_claude_available():
        raise HTTPException(status_code=503, detail="AI service unavailable")

    if not request_body.text or not request_body.text.strip():
        raise HTTPException(status_code=400, detail="No verdict text provided")

    client = get_claude_client()

    system_prompt = (
        "You are a legal translator for non-lawyers. Convert legal verdicts into plain English.\n"
        "RULES:\n"
        "1. Keep the identical meaning — do NOT change who wins, who loses, or why.\n"
        "2. Replace legal jargon with everyday words (e.g. 'prima facie' → 'enough initial evidence').\n"
        "3. Use short, clear sentences. No lists. Continuous prose only.\n"
        "4. Match the original word count as closely as possible (50–70 words).\n"
        "5. Do NOT add new information, opinions, or explanations not in the original.\n"
        "6. Output ONLY the simplified verdict text — nothing else."
    )

    user_prompt = (
        f"Simplify this legal verdict into plain English:\n\n{request_body.text}"
    )

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        simplified = response.content[0].text.strip()
        return {"simplified": simplified}
    except Exception as e:
        logger.error(f"Simplify verdict failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simplification failed: {str(e)}")
