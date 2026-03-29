import hashlib
from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from ..core.database import get_db
from ..models.verdict import Verdict

router = APIRouter()


class VerdictCreate(BaseModel):
    summary: str
    session_id: str | None = None


def _fmt(dt) -> str | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).isoformat()


def _preview(summary: str, n: int = 10) -> str:
    words = summary.split()
    return ' '.join(words[:n]) + ('...' if len(words) > n else '')


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
async def get_verdicts(
    limit: int = Query(default=5, le=100),
    db: DBSession = Depends(get_db),
):
    verdicts = (
        db.query(Verdict)
        .order_by(Verdict.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for v in verdicts:
        result.append({
            "id": str(v.id),
            "summary": v.summary,
            "preview": _preview(v.summary),
            "created_at": _fmt(v.created_at),
            "session_id_hash": v.session_id_hash,
        })
    return {"verdicts": result}


@router.get("/verdicts/{verdict_id}")
async def get_verdict(verdict_id: str, db: DBSession = Depends(get_db)):
    verdict = db.query(Verdict).filter(Verdict.id == verdict_id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict not found")
    return {
        "id": str(verdict.id),
        "summary": verdict.summary,
        "preview": _preview(verdict.summary),
        "created_at": _fmt(verdict.created_at),
        "session_id_hash": verdict.session_id_hash,
    }
