from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import get_current_user_id
from app.db import get_db, get_db_ro
from app.models import Audit, Platform
from app.progress import initial_progress
from app.queue import enqueue_audit
from app.schemas import AuditOut

router = APIRouter(prefix="/audits", tags=["audits"])


@router.get("", response_model=list[AuditOut])
async def list_audits(
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(joinedload(Audit.score))
        .where(Platform.owner_id == user_id)
        .order_by(Audit.id.desc())
    )
    audits = result.unique().scalars().all()
    out = []
    for audit in audits:
        out.append(
            AuditOut(
                id=audit.id,
                platform_id=audit.platform_id,
                status=audit.status,
                score=audit.score.global_score if audit.score else None,
                risk_level=audit.score.risk_level if audit.score else None,
                created_at=audit.created_at,
            )
        )
    return out


@router.post("/platform/{platform_id}", response_model=AuditOut, status_code=status.HTTP_201_CREATED)
async def start_audit(
    platform_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user_id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")
    if platform.verification_status != "verified":
        raise HTTPException(
            status_code=400,
            detail="Vérification de propriété requise avant de lancer un audit",
        )

    existing = await db.execute(
        select(Audit).where(
            Audit.platform_id == platform.id,
            Audit.status.in_(["queued", "running"]),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Un audit est déjà en cours pour cette plateforme.",
        )

    audit = Audit(
        platform_id=platform.id,
        status="queued",
        progress_json=initial_progress(),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    try:
        enqueue_audit(audit.id)
    except Exception as exc:  # noqa: BLE001
        audit.status = "failed"
        audit.error_message = f"Impossible de mettre en file d'attente: {exc}"
        await db.commit()
        raise HTTPException(status_code=503, detail="File d'attente indisponible (Redis ?)") from exc

    return AuditOut(
        id=audit.id,
        platform_id=audit.platform_id,
        status=audit.status,
        score=None,
        risk_level=None,
        created_at=audit.created_at,
    )
