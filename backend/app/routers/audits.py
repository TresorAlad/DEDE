from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models import Audit, Platform, User
from app.queue import enqueue_audit
from app.schemas import AuditOut

router = APIRouter(prefix="/audits", tags=["audits"])


@router.get("", response_model=list[AuditOut])
async def list_audits(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(selectinload(Audit.score))
        .where(Platform.owner_id == user.id)
        .order_by(Audit.id.desc())
    )
    audits = result.scalars().all()
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
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user.id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")
    if platform.verification_status != "verified":
        raise HTTPException(
            status_code=400,
            detail="Vérification de propriété requise avant de lancer un audit",
        )

    audit = Audit(platform_id=platform.id, status="queued")
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
