"""RQ worker tasks for DEDE audits.

Run with (from repository root, PYTHONPATH including backend and repo root):

  cd backend
  PYTHONPATH=..:. rq worker audits --url $REDIS_URL
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def run_audit(audit_id: int) -> None:
    asyncio.run(_run_audit_async(audit_id))


async def _run_audit_async(audit_id: int) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.db import SessionLocal
    from app.models import Audit, Platform, ScanResult, Score
    from scanners.orchestrator import run_all
    from scanners.scoring import compute_score
    from ai.report_analyzer import analyze

    async with SessionLocal() as db:
        result = await db.execute(
            select(Audit)
            .options(selectinload(Audit.platform))
            .where(Audit.id == audit_id)
        )
        audit = result.scalar_one_or_none()
        if audit is None:
            return

        platform: Platform = audit.platform
        audit.status = "running"
        audit.started_at = datetime.now(timezone.utc)
        await db.commit()

        try:
            raw = run_all(domain=platform.domain, url=platform.url)
            score_data = compute_score(raw)
            analysis = analyze(raw)

            scan = ScanResult(
                audit_id=audit.id,
                raw_json=raw,
                analysis_json=analysis,
                summary=analysis.get("summary") or analysis.get("explications", ""),
            )
            score = Score(
                audit_id=audit.id,
                global_score=score_data["global_score"],
                risk_level=score_data["risk_level"],
                categories=score_data["categories"],
            )
            db.add(scan)
            db.add(score)
            audit.status = "completed"
            audit.finished_at = datetime.now(timezone.utc)
            audit.error_message = None
            await db.commit()
        except Exception as exc:  # noqa: BLE001
            audit.status = "failed"
            audit.error_message = str(exc)
            audit.finished_at = datetime.now(timezone.utc)
            await db.commit()
            raise
