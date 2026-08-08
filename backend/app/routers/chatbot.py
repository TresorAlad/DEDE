from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models import Audit, Platform, User
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/{audit_id}", response_model=ChatResponse)
async def ask_chatbot(
    audit_id: int,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(selectinload(Audit.scan_result), selectinload(Audit.score))
        .where(Audit.id == audit_id, Platform.owner_id == user.id)
    )
    audit = result.scalar_one_or_none()
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

    from ai.chatbot import ask_about_report

    answer = ask_about_report(payload.question, report_context)
    return ChatResponse(answer=answer)
