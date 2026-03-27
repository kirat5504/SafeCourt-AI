import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from typing import Optional, List
from ..core.database import get_db
from ..core.security import validate_session_id
from ..core.claude import get_claude_client, is_claude_available, CLAUDE_MODEL, CLAUDE_MAX_TOKENS
from ..models.session import Session as SessionModel
from ..models.sanitized_output import SanitizedOutput
from ..services.sanitizer import sanitize_text_with_claude

router = APIRouter()
logger = logging.getLogger(__name__)


class ConversationMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ConversationMessage]] = []


@router.post("/chat")
async def send_chat(
    request_body: ChatRequest,
    x_session_id: str = Header(None, alias="X-Session-ID"),
    x_processing_id: str = Header(None, alias="X-Processing-ID"),
    db: DBSession = Depends(get_db),
):
    if not x_session_id or not validate_session_id(x_session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(SessionModel).filter(
        SessionModel.id == uuid.UUID(x_session_id),
        SessionModel.status == "active",
    ).first()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not request_body.message:
        raise HTTPException(status_code=400, detail="Message is required")

    if not x_processing_id:
        x_processing_id = str(uuid.uuid4())

    if not is_claude_available():
        return {
            "response": "Claude API not configured. Please check Replit Anthropic integration setup.",
            "sanitized_response": "Claude API not configured. Please check Replit Anthropic integration setup.",
            "tokens": {},
            "engine": "none",
        }

    try:
        client = get_claude_client()

        previous_outputs = db.query(SanitizedOutput).filter(
            SanitizedOutput.session_id == uuid.UUID(x_session_id)
        ).order_by(SanitizedOutput.created_at.desc()).limit(5).all()

        context_hint = ""
        if previous_outputs:
            context_hint = "\n\nNote: This user has previously processed sensitive documents. Respond helpfully about privacy and security topics."

        sanitized_user_msg, user_tokens = sanitize_text_with_claude(request_body.message)

        system_prompt = f"""You are a privacy-aware AI assistant for VaultSim, a tokenization security platform.
You help users understand:
- How tokenization protects their sensitive data
- How the AES-256-GCM vault secures tokens client-side
- Security best practices for handling PII
- How to interpret sanitized outputs and debate results

Be helpful, concise, and security-focused.{context_hint}"""

        messages = []
        if request_body.conversation_history:
            for msg in request_body.conversation_history[-10:]:
                role = "user" if msg.role == "user" else "assistant"
                messages.append({"role": role, "content": msg.content})

        messages.append({"role": "user", "content": sanitized_user_msg})

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=CLAUDE_MAX_TOKENS,
            system=system_prompt,
            messages=messages,
        )

        ai_response = response.content[0].text.strip()
        sanitized_response, response_tokens = sanitize_text_with_claude(ai_response)
        all_tokens = {**user_tokens, **response_tokens}

        if all_tokens:
            try:
                proc_uuid = uuid.UUID(x_processing_id)
            except Exception:
                proc_uuid = uuid.uuid4()

            output = SanitizedOutput(
                id=uuid.uuid4(),
                session_id=session.id,
                processing_id=proc_uuid,
                input_type="text",
                tokenized_content=json.dumps(all_tokens),
                engine="claude",
            )
            db.add(output)

        session.last_active = datetime.now(timezone.utc)
        db.commit()

        return {
            "response": ai_response,
            "sanitized_response": sanitized_response,
            "tokens": all_tokens,
            "engine": "claude",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
