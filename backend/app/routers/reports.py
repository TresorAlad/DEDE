from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models import Audit, Platform, User
from app.schemas import ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{audit_id}", response_model=ReportOut)
async def get_report(
    audit_id: int,
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
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    analysis = (audit.scan_result.analysis_json if audit.scan_result else None) or {}
    raw = (audit.scan_result.raw_json if audit.scan_result else None) or {}

    findings = analysis.get("findings") or []
    if not findings:
        for key in ("nuclei", "headers", "ssl"):
            value = raw.get(key)
            if isinstance(value, list):
                findings.extend(value)
            elif isinstance(value, dict) and value.get("findings"):
                findings.extend(value["findings"])

    return ReportOut(
        audit_id=audit.id,
        status=audit.status,
        score=audit.score.global_score if audit.score else None,
        risk_level=audit.score.risk_level if audit.score else None,
        categories=audit.score.categories if audit.score else {},
        summary=audit.scan_result.summary if audit.scan_result else None,
        findings=findings,
        recommendations=analysis.get("recommandations") or analysis.get("recommendations") or [],
        plan_correction=analysis.get("plan_correction") or [],
    )
