import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import get_current_user_id
from app.db import get_db
from app.models import Audit, Platform
from app.schemas import ChatRequest, ChatResponse

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/{audit_id}", response_model=ChatResponse)
async def ask_chatbot(
    audit_id: int,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(joinedload(Audit.scan_result), joinedload(Audit.score))
        .where(Audit.id == audit_id, Platform.owner_id == user_id)
    )
    audit = result.unique().scalar_one_or_none()
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit introuvable")
    if audit.status != "completed" or audit.scan_result is None:
        raise HTTPException(status_code=400, detail="Le rapport n'est pas encore disponible")

    report_context = {
        "audit_id": audit.id,
        "score": audit.score.global_score if audit.score else None,
        "risk_level": audit.score.risk_level if audit.score else None,
        "categories": audit.score.categories if audit.score else {},
        "summary": audit.scan_result.summary,
        "analysis": audit.scan_result.analysis_json or {},
        "raw": audit.scan_result.raw_json or {},
    }

    try:
        from ai.chatbot import ask_about_report

        answer = ask_about_report(payload.question, report_context)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"Assistant indisponible pour le moment : {exc}",
        ) from exc

    return ChatResponse(answer=answer)
