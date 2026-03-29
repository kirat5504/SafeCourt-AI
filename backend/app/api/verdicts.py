import hashlib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from ..core.database import get_db
from ..models.verdict import Verdict

router = APIRouter()


class VerdictCreate(BaseModel):
    summary: str
    session_id: str | None = None


@router.post("/verdicts")
async def save_verdict(body: VerdictCreate, db: DBSession = Depends(get_db)):
    words = body.summary.strip().split()
    if len(words) < 10:
        raise HTTPException(status_code=422, detail="Verdict too short")
    if len(words) > 200:
        raise HTTPException(status_code=422, detail="Verdict too long")

    session_id_hash = None
    if body.session_id:
        session_id_hash = hashlib.sha256(body.session_id.encode()).hexdigest()[:16]

    verdict = Verdict(
        summary=body.summary.strip(),
        session_id_hash=session_id_hash,
    )
    db.add(verdict)
    db.commit()
    db.refresh(verdict)

    return {"id": str(verdict.id), "saved": True}


@router.get("/verdicts")
async def get_verdicts(db: DBSession = Depends(get_db)):
    verdicts = db.query(Verdict).order_by(Verdict.created_at.desc()).limit(10).all()
    result = []
    for v in verdicts:
        words = v.summary.split()
        preview = ' '.join(words[:10]) + ('...' if len(words) > 10 else '')
        result.append({
            "id": str(v.id),
            "summary": v.summary,
            "preview": preview,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        })
    return {"verdicts": result}
