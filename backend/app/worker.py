"""RQ worker tasks for DEDE audits.

Le worker orchestre le moteur d'audit choisi au lancement :
  - ``scanners`` : microservice engine (Amass/Nuclei/SSL/headers + IA Mistral) ;
  - ``agents``   : microservice agent-service (dede-agent multi-agents IA) avec
                   graphe d'orchestration des agents.

Run with (from application/backend):

  cd application/backend
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

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class AuditCancelled(Exception):
    """L'audit a été annulé pendant son exécution."""


@lru_cache
def _sync_session_factory() -> sessionmaker[Session]:
    """Session synchrone pour publier le suivi pendant le scan (thread bloqué)."""
    from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

    from app.config import get_settings

    raw = get_settings().database_url
    # SQLite local / docker : le worker utilise le driver synchrone (pysqlite),
    # pas aiosqlite qui est réservé au moteur asyncio du serveur.
    if raw.startswith("sqlite+aiosqlite:"):
        raw = "sqlite:" + raw[len("sqlite+aiosqlite:") :]
    raw = raw.replace("postgresql+asyncpg://", "postgresql://")
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
            if audit is None or audit.status == "cancelled":
                return
            audit.progress_json = steps
            db.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[DEDE] Suivi non enregistré (audit {audit_id}): {exc}")


def _is_cancelled_sync(audit_id: int) -> bool:
    from app.models import Audit

    try:
        SessionLocal = _sync_session_factory()
        with SessionLocal() as db:
            audit = db.get(Audit, audit_id)
            return audit is not None and audit.status == "cancelled"
    except Exception as exc:  # noqa: BLE001
        print(f"[DEDE] Contrôle d'annulation impossible (audit {audit_id}): {exc}")
        return False


def run_audit(audit_id: int) -> None:
    asyncio.run(_run_audit_async(audit_id))


def _build_agents_score(vulns: list[Any]) -> dict[str, Any]:
    """Score dérivé des vulnérabilités dede-agent (sévérité -> note /100)."""
    penalties = {"critical": 25, "high": 15, "medium": 8, "low": 3}
    total = 0
    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for vuln in vulns:
        if not isinstance(vuln, dict):
            continue
        sev = str(vuln.get("severity") or "low").lower().strip()
        if sev not in by_severity:
            sev = "low"
        by_severity[sev] += 1
        total += penalties[sev]

    global_score = max(0, min(100, 100 - total))
    if global_score >= 75:
        risk_level = "Faible"
    elif global_score >= 50:
        risk_level = "Modéré"
    elif global_score >= 25:
        risk_level = "Élevé"
    else:
        risk_level = "Critique"

    categories = {k: v for k, v in by_severity.items() if v > 0}
    return {
        "global_score": global_score,
        "risk_level": risk_level,
        "categories": categories,
    }


def _agents_analysis(vulns: list[Any], markdown: str) -> dict[str, Any]:
    """Fallback sans Mistral : findings + résumé (recommandations vides)."""
    findings: list[dict[str, Any]] = []
    for index, vuln in enumerate(vulns):
        if not isinstance(vuln, dict):
            continue
        findings.append(
            {
                "id": vuln.get("id") or f"VULN-{index + 1}",
                "title": vuln.get("title") or vuln.get("name") or "Vulnérabilité détectée",
                "severity": vuln.get("severity") or "low",
                "cvss": vuln.get("cvss"),
                "description": vuln.get("description") or "",
                "remediation_steps": vuln.get("remediation_steps") or "",
                "fix_command": vuln.get("fix_command")
                or vuln.get("commande")
                or vuln.get("remediation_steps")
                or "",
            }
        )

    # Résumé : premier paragraphe substantiel du rapport markdown.
    summary = ""
    for line in (markdown or "").splitlines():
        line = line.strip()
        if line and not line.startswith(("#", "-", "*", "|")):
            summary = line[:600]
            break
    if not summary:
        summary = (
            f"{len(findings)} vulnérabilité(s) identifiée(s) par l'équipe d'agents IA."
            if findings
            else "Aucune vulnérabilité détectée lors de l'audit."
        )

    return {
        "findings": findings,
        "summary": summary,
        "explications": summary,
        "recommandations": [],
        "plan_correction": [],
    }


async def _run_agents_audit(audit_id: int, progress: list[dict[str, Any]]) -> None:
    """Exécute un audit via le microservice agent-service (dede-agent)."""
    from sqlalchemy.orm import selectinload

    from app.clients.dede_agent_client import (
        AgentServiceCancelled,
        AgentServiceError,
        get_dede_agent_client,
    )
    from app.db import SessionLocal
    from app.models import Audit, ScanResult, Score
    from app.progress import mark_step, progress_current_key

    agent = get_dede_agent_client()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Audit)
            .options(selectinload(Audit.platform))
            .where(Audit.id == audit_id)
        )
        audit = result.scalar_one_or_none()
        if audit is None or audit.status == "cancelled":
            return
        domain = audit.platform.domain
        url = audit.platform.url
        audit.status = "running"
        audit.started_at = datetime.now(timezone.utc)
        audit.error_message = None
        progress = mark_step(progress, "orchestration", "active", "Démarrage des agents IA")
        audit.progress_json = progress
        await db.commit()

    def on_progress(step: str, detail: str | None = None) -> None:
        nonlocal progress
        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()
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

    run_name: str | None = None
    try:
        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()

        progress = mark_step(progress, "agents", "active", "Agents IA en orchestration")
        _save_progress_sync(audit_id, progress)

        run_name, _pid = await asyncio.to_thread(
            agent.start_audit,
            target=url,
            scan_mode="standard",
            auth_token="",
            run_name=f"audit-{audit_id}",
            audit_id=audit_id,
        )

        # Persist du nom de run immédiatement (utile pour l'annulation et le live).
        async with SessionLocal() as db:
            row = await db.get(Audit, audit_id)
            if row is not None:
                row.agent_run_name = run_name
                await db.commit()

        status_payload = await asyncio.to_thread(
            agent.wait_audit,
            run_name,
            on_progress=on_progress,
            max_wait_seconds=7200.0,
        )

        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()

        progress = mark_step(progress, "report", "active", "Collecte du rapport ZIP")
        _save_progress_sync(audit_id, progress)

        transcript = await asyncio.to_thread(agent.get_transcript, run_name)
        export = await asyncio.to_thread(agent.get_export, run_name)
        vulns = export.get("vulnerabilities") or []
        markdown = export.get("markdown") or ""

        raw = {
            "engine": "agents",
            "run_name": run_name,
            "status": status_payload.get("status"),
            "vulnerabilities": vulns,
            "surface_hosts": [status_payload.get("target")] if status_payload.get("target") else [],
            "report_markdown": markdown,
            "export_source": export.get("source"),
            "zip_name": export.get("zip_name"),
        }

        progress = mark_step(progress, "ai", "active", "Traduction et recommandations en français")
        _save_progress_sync(audit_id, progress)

        # Même contrat que le scanner : Mistral produit summary/findings/recommandations/plan.
        # Fallback déterministe si la clé IA est absente ou si l'appel échoue.
        analysis: dict[str, Any] | None = None
        try:
            from app.clients.engine_client import get_engine_client

            analysis = await asyncio.to_thread(get_engine_client().analyze, raw)
            from ai.report_analyzer import coerce_analysis_result

            analysis = coerce_analysis_result(analysis or {})
            # Si Mistral indisponible, analyze renvoie findings vides + message clé absente.
            if not analysis.get("findings") and (
                "MISTRAL_API_KEY" in (analysis.get("summary") or "")
                or "MISTRAL_API_KEY" in (analysis.get("explications") or "")
            ):
                fallback = _agents_analysis(vulns, markdown)
                analysis = {
                    **fallback,
                    **{k: v for k, v in analysis.items() if v},
                    "summary": fallback["summary"],
                    "explications": analysis.get("explications") or fallback.get("summary", ""),
                }
            elif not analysis.get("findings") and vulns:
                fallback = _agents_analysis(vulns, markdown)
                analysis["findings"] = fallback["findings"]
                if not analysis.get("summary") or str(analysis.get("summary", "")).strip().startswith("{"):
                    analysis["summary"] = fallback["summary"]
                    if not analysis.get("explications"):
                        analysis["explications"] = fallback["summary"]
        except Exception as analyze_exc:  # noqa: BLE001
            print(f"[DEDE] Analyse agent via Mistral échouée (audit {audit_id}): {analyze_exc}")
            analysis = _agents_analysis(vulns, markdown)

        score_data = _build_agents_score(vulns)
    except AuditCancelled:
        return
    except AgentServiceCancelled:
        return
    except Exception as exc:  # noqa: BLE001
        if _is_cancelled_sync(audit_id):
            return
        message = str(exc)
        if isinstance(exc, AgentServiceError):
            message = f"Dede-agent : {exc}"
        progress = mark_step(
            progress,
            progress_current_key(progress),
            "failed",
            message[:240],
        )
        async with SessionLocal() as db:
            audit = await db.get(Audit, audit_id)
            if audit is not None and audit.status != "cancelled":
                audit.status = "failed"
                audit.error_message = message
                audit.finished_at = datetime.now(timezone.utc)
                audit.progress_json = progress
                await db.commit()
        raise

    if _is_cancelled_sync(audit_id):
        return

    async with SessionLocal() as db:
        audit = await db.get(Audit, audit_id)
        if audit is None or audit.status == "cancelled":
            return

        existing_scan = await db.execute(select(ScanResult).where(ScanResult.audit_id == audit_id))
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

        audit.agent_graph = transcript
        progress = mark_step(progress, "done", "done", "Rapport prêt")
        audit.status = "completed"
        audit.finished_at = datetime.now(timezone.utc)
        audit.error_message = None
        audit.progress_json = progress
        await db.commit()


async def _run_audit_async(audit_id: int) -> None:
    from sqlalchemy.orm import selectinload

    from app.db import SessionLocal
    from app.models import Audit
    from app.progress import initial_progress

    async with SessionLocal() as db:
        result = await db.execute(
            select(Audit)
            .options(selectinload(Audit.platform))
            .where(Audit.id == audit_id)
        )
        audit = result.scalar_one_or_none()
        if audit is None or audit.status == "cancelled":
            return
        engine = audit.engine or "scanners"

    progress = initial_progress(engine)

    if engine == "agents":
        await _run_agents_audit(audit_id, progress)
        return

    # ---- Moteur par défaut : scanners (engine) ----
    from app.clients.engine_client import EngineCancelled, EngineError, get_engine_client
    from app.models import ScanResult, Score
    from app.progress import mark_step, progress_current_key

    engine_client = get_engine_client()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Audit).options(selectinload(Audit.platform)).where(Audit.id == audit_id)
        )
        audit = result.scalar_one_or_none()
        if audit is None or audit.status == "cancelled":
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
        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()
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
        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()

        job_id = await asyncio.to_thread(engine_client.start_scan, audit_id, domain, url)
        raw = await asyncio.to_thread(
            engine_client.wait_scan,
            job_id,
            on_progress=on_progress,
            max_wait_seconds=7200.0,
        )

        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()

        progress = mark_step(progress, "score", "active", "Calcul du score de sécurité")
        _save_progress_sync(audit_id, progress)
        score_data = await asyncio.to_thread(engine_client.score, raw)

        if _is_cancelled_sync(audit_id):
            raise AuditCancelled()

        progress = mark_step(progress, "ai", "active", "Explications et recommandations")
        _save_progress_sync(audit_id, progress)
        analysis = await asyncio.to_thread(engine_client.analyze, raw)
    except AuditCancelled:
        return
    except EngineCancelled:
        return
    except Exception as exc:  # noqa: BLE001
        if _is_cancelled_sync(audit_id):
            return
        message = str(exc)
        if isinstance(exc, EngineError):
            message = f"Engine : {exc}"
        progress = mark_step(
            progress,
            progress_current_key(progress),
            "failed",
            message[:240],
        )
        async with SessionLocal() as db:
            result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = result.scalar_one_or_none()
            if audit is not None and audit.status != "cancelled":
                audit.status = "failed"
                audit.error_message = message
                audit.finished_at = datetime.now(timezone.utc)
                audit.progress_json = progress
                await db.commit()
        raise

    if _is_cancelled_sync(audit_id):
        return

    async with SessionLocal() as db:
        result = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = result.scalar_one_or_none()
        if audit is None or audit.status == "cancelled":
            return

        existing_scan = await db.execute(select(ScanResult).where(ScanResult.audit_id == audit_id))
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
