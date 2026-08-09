"""RQ worker tasks for DEDE audits.

Run with (from repository root, PYTHONPATH including backend and repo root):

  cd backend
  PYTHONPATH=..:. rq worker audits --url $REDIS_URL
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@lru_cache
def _sync_session_factory() -> sessionmaker[Session]:
    """Session synchrone pour publier le suivi pendant le scan (thread bloqué)."""
    from app.config import get_settings
    from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

    raw = get_settings().database_url.replace("postgresql+asyncpg://", "postgresql://")
    # asyncpg accepte `ssl=require` ; psycopg2 exige `sslmode=require`.
    parsed = urlparse(raw)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "ssl" in query and "sslmode" not in query:
        query["sslmode"] = query.pop("ssl")
    elif "ssl" in query:
        query.pop("ssl", None)
    # channel_binding n'est pas toujours supporté par psycopg2 selon la version.
    query.pop("channel_binding", None)
    url = urlunparse(parsed._replace(query=urlencode(query)))
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=180)
    return sessionmaker(engine, expire_on_commit=False)


def _save_progress_sync(audit_id: int, steps: list[dict[str, Any]]) -> None:
    """Persiste le suivi. Ne doit jamais faire échouer l'audit."""
    from app.models import Audit

    try:
        SessionLocal = _sync_session_factory()
        with SessionLocal() as db:
            audit = db.get(Audit, audit_id)
            if audit is None:
                return
            audit.progress_json = steps
            db.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[DEDE] Suivi non enregistré (audit {audit_id}): {exc}")


def run_audit(audit_id: int) -> None:
    asyncio.run(_run_audit_async(audit_id))


async def _run_audit_async(audit_id: int) -> None:
    from sqlalchemy.orm import selectinload

    from app.db import SessionLocal
    from app.models import Audit, ScanResult, Score
    from app.progress import initial_progress, mark_step, progress_current_key
    from scanners.orchestrator import run_all
    from scanners.scoring import compute_score
    from ai.report_analyzer import analyze

    progress = initial_progress()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Audit)
            .options(selectinload(Audit.platform))
            .where(Audit.id == audit_id)
        )
        audit = result.scalar_one_or_none()
        if audit is None:
            return

        domain = audit.platform.domain
        url = audit.platform.url
        audit.status = "running"
        audit.started_at = datetime.now(timezone.utc)
        audit.error_message = None
        progress = mark_step(progress, "surface", "active", "Démarrage de l'analyse")
        audit.progress_json = progress
        await db.commit()

    def on_progress(step: str, detail: str | None = None) -> None:
        nonlocal progress
        if step == "failed":
            progress = mark_step(
                progress,
                progress_current_key(progress),
                "failed",
                detail,
            )
        else:
            progress = mark_step(progress, step, "active", detail)
        _save_progress_sync(audit_id, progress)

    try:
        raw = run_all(domain=domain, url=url, on_progress=on_progress)

        progress = mark_step(progress, "score", "active", "Calcul du score de sécurité")
        _save_progress_sync(audit_id, progress)
        score_data = compute_score(raw)

        progress = mark_step(progress, "ai", "active", "Explications et recommandations")
        _save_progress_sync(audit_id, progress)
        analysis = analyze(raw)
    except Exception as exc:  # noqa: BLE001
        progress = mark_step(
            progress,
            progress_current_key(progress),
            "failed",
            str(exc)[:240],
        )
        async with SessionLocal() as db:
            result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = result.scalar_one_or_none()
            if audit is not None:
                audit.status = "failed"
                audit.error_message = str(exc)
                audit.finished_at = datetime.now(timezone.utc)
                audit.progress_json = progress
                await db.commit()
        raise

    async with SessionLocal() as db:
        result = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = result.scalar_one_or_none()
        if audit is None:
            return

        existing_scan = await db.execute(
            select(ScanResult).where(ScanResult.audit_id == audit_id)
        )
        if existing_scan.scalar_one_or_none() is None:
            db.add(
                ScanResult(
                    audit_id=audit.id,
                    raw_json=raw,
                    analysis_json=analysis,
                    summary=analysis.get("summary") or analysis.get("explications", ""),
                )
            )

        existing_score = await db.execute(select(Score).where(Score.audit_id == audit_id))
        if existing_score.scalar_one_or_none() is None:
            db.add(
                Score(
                    audit_id=audit.id,
                    global_score=score_data["global_score"],
                    risk_level=score_data["risk_level"],
                    categories=score_data["categories"],
                )
            )

        progress = mark_step(progress, "done", "done", "Rapport prêt")
        audit.status = "completed"
        audit.finished_at = datetime.now(timezone.utc)
        audit.error_message = None
        audit.progress_json = progress
        await db.commit()
