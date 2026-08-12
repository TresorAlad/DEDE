from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import get_current_user, get_current_user_id
from app.config import get_settings
from app.db import get_db, get_db_ro
from app.models import Audit, Platform, ScanResult, Score, User
from app.privileges import user_can_bypass_ownership
from app.progress import initial_progress, mark_cancelled
from app.queue import cancel_queued_audit, enqueue_audit
from app.schemas import AuditOut, StartAuditRequest

router = APIRouter(prefix="/audits", tags=["audits"])
settings = get_settings()


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
                engine=audit.engine or "scanners",
                score=audit.score.global_score if audit.score else None,
                risk_level=audit.score.risk_level if audit.score else None,
                created_at=audit.created_at,
            )
        )
    return out


@router.post("/platform/{platform_id}", response_model=AuditOut, status_code=status.HTTP_201_CREATED)
async def start_audit(
    platform_id: int,
    payload: StartAuditRequest = StartAuditRequest(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Accepte { "engine": "scanners"|"agents" } depuis le front /launch.
    engine = (payload.engine or "scanners").strip().lower()
    if engine not in settings.audit_engines_list:
        raise HTTPException(
            status_code=400,
            detail=f"Moteur d'audit inconnu « {engine} ». Valeurs possibles : {', '.join(settings.audit_engines_list)}.",
        )

    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user.id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")

    bypass = await user_can_bypass_ownership(db, user)
    if platform.verification_status != "verified":
        if bypass:
            # Équipe : autorise l'audit et marque la plateforme comme vérifiée (interne).
            platform.verification_status = "verified"
            await db.commit()
            await db.refresh(platform)
        else:
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
        engine=engine,
        progress_json=initial_progress(engine),
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
        engine=engine,
        score=None,
        risk_level=None,
        created_at=audit.created_at,
    )


@router.post("/{audit_id}/cancel", response_model=AuditOut)
async def cancel_audit(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(joinedload(Audit.score))
        .where(Audit.id == audit_id, Platform.owner_id == user_id)
    )
    audit = result.unique().scalar_one_or_none()
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit introuvable")

    if audit.status not in {"queued", "running"}:
        raise HTTPException(
            status_code=400,
            detail="Seuls les audits en file ou en cours peuvent être annulés.",
        )

    audit.status = "cancelled"
    audit.finished_at = datetime.now(timezone.utc)
    audit.error_message = "Annulé par l'utilisateur"
    audit.progress_json = mark_cancelled(audit.progress_json, engine=audit.engine or "scanners")
    await db.commit()
    await db.refresh(audit)

    cancel_queued_audit(audit.id)
    try:
        if (audit.engine or "scanners") == "agents":
            from app.clients.dede_agent_client import get_dede_agent_client

            if audit.agent_run_name:
                get_dede_agent_client().cancel_audit(audit.agent_run_name)
        else:
            from app.clients.engine_client import get_engine_client

            get_engine_client().cancel_scan(audit.id)
    except Exception as exc:  # noqa: BLE001
        # L'audit est déjà annulé en base : le worker s'arrêtera au prochain contrôle.
        print(f"[DEDE] Annulation partielle (audit {audit.id}): {exc}")

    return AuditOut(
        id=audit.id,
        platform_id=audit.platform_id,
        status=audit.status,
        engine=audit.engine or "scanners",
        score=audit.score.global_score if audit.score else None,
        risk_level=audit.score.risk_level if audit.score else None,
        created_at=audit.created_at,
    )


async def _cancel_running_audit(audit: Audit) -> None:
    if audit.status not in {"queued", "running"}:
        return

    audit.status = "cancelled"
    audit.finished_at = datetime.now(timezone.utc)
    audit.error_message = "Annulé par l'utilisateur"
    audit.progress_json = mark_cancelled(audit.progress_json, engine=audit.engine or "scanners")

    cancel_queued_audit(audit.id)
    try:
        if (audit.engine or "scanners") == "agents":
            from app.clients.dede_agent_client import get_dede_agent_client

            if audit.agent_run_name:
                get_dede_agent_client().cancel_audit(audit.agent_run_name)
        else:
            from app.clients.engine_client import get_engine_client

            get_engine_client().cancel_scan(audit.id)
    except Exception as exc:  # noqa: BLE001
        print(f"[DEDE] Annulation partielle (audit {audit.id}): {exc}")


@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(joinedload(Audit.score), joinedload(Audit.scan_result))
        .where(Audit.id == audit_id, Platform.owner_id == user_id)
    )
    audit = result.unique().scalar_one_or_none()
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit introuvable")

    if audit.status in {"queued", "running"}:
        await _cancel_running_audit(audit)

    for model in (ScanResult, Score):
        rows = await db.execute(select(model).where(model.audit_id == audit.id))
        for row in rows.scalars().all():
            await db.delete(row)

    await db.delete(audit)
    await db.commit()
    return None
