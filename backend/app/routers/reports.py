import secrets

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import get_current_user_id
from app.clients.engine_client import EngineError, get_engine_client
from app.db import get_db, get_db_ro
from app.models import Audit, Platform
from app.schemas import PolicyOut, ReportOut, ShareResponse
from app.services.pdf_report import build_report_pdf
from app.services.policy_generator import generate_pssi_markdown
from app.services.redaction import redact
from ai.report_analyzer import coerce_analysis_result

router = APIRouter(prefix="/reports", tags=["reports"])


async def _load_audit(audit_id: int, db: AsyncSession, user_id: int) -> Audit:
    result = await db.execute(
        select(Audit)
        .join(Platform)
        .options(
            joinedload(Audit.scan_result),
            joinedload(Audit.score),
            joinedload(Audit.platform),
        )
        .where(Audit.id == audit_id, Platform.owner_id == user_id)
    )
    audit = result.unique().scalar_one_or_none()
    if audit is None:
        raise HTTPException(status_code=404, detail="Rapport introuvable")
    return audit


def _build_report_payload(audit: Audit) -> dict:
    analysis = (audit.scan_result.analysis_json if audit.scan_result else None) or {}
    if analysis:
        analysis = coerce_analysis_result(analysis)
    raw = (audit.scan_result.raw_json if audit.scan_result else None) or {}
    engine = audit.engine or "scanners"
    agent_graph = None

    if engine == "agents":
        # Graphe d'orchestration : snapshot stocké en fin de run, sinon lecture live.
        agent_graph = audit.agent_graph
        if agent_graph is None and audit.agent_run_name:
            try:
                from app.clients.dede_agent_client import get_dede_agent_client

                live = get_dede_agent_client().get_transcript(audit.agent_run_name)
                if live.get("agents"):
                    agent_graph = live
            except Exception:
                agent_graph = None

    findings = list(analysis.get("findings") or [])
    if not findings:
        for key in ("nuclei", "headers", "ssl"):
            value = raw.get(key)
            if isinstance(value, list):
                findings.extend(value)
            elif isinstance(value, dict) and value.get("findings"):
                findings.extend(value["findings"])

    coverage = None
    note = None
    # Score coverage/note : uniquement pertinent pour le moteur scanners.
    if raw and engine != "agents":
        try:
            score_data = get_engine_client().score(raw)
            coverage = score_data.get("coverage")
            note = score_data.get("note")
        except Exception:
            coverage = None
            note = None

    return {
        "audit_id": audit.id,
        "status": audit.status,
        "engine": engine,
        "agent_graph": agent_graph,
        "agent_run_name": audit.agent_run_name,
        "target": audit.platform.domain if audit.platform else None,
        "public_token": audit.public_token,
        "score": audit.score.global_score if audit.score else None,
        "risk_level": audit.score.risk_level if audit.score else None,
        "categories": audit.score.categories if audit.score else {},
        "coverage": coverage,
        "note": note,
        "summary": redact(audit.scan_result.summary if audit.scan_result else None),
        "findings": redact(findings),
        "recommendations": redact(
            analysis.get("recommandations") or analysis.get("recommendations") or []
        ),
        "plan_correction": redact(analysis.get("plan_correction") or []),
        "surface_hosts": raw.get("surface_hosts") or [],
        "progress": audit.progress_json or [],
        "created_at": audit.created_at,
        "started_at": audit.started_at,
        "finished_at": audit.finished_at,
    }


@router.get("/public/{token}", response_model=ReportOut)
async def get_public_report(
    token: str,
    db: AsyncSession = Depends(get_db_ro),
):
    """Consultation publique d'un rapport partagé via lien sécurisé (lecture seule)."""
    result = await db.execute(
        select(Audit)
        .options(
            joinedload(Audit.scan_result),
            joinedload(Audit.score),
            joinedload(Audit.platform),
        )
        .where(Audit.public_token == token)
    )
    audit = result.unique().scalar_one_or_none()
    if audit is None or audit.status != "completed":
        raise HTTPException(status_code=404, detail="Rapport public introuvable ou non disponible")

    payload = await run_in_threadpool(_build_report_payload, audit)
    return ReportOut(**payload)


@router.get("/{audit_id}", response_model=ReportOut)
async def get_report(
    audit_id: int,
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    audit = await _load_audit(audit_id, db, user_id)
    payload = await run_in_threadpool(_build_report_payload, audit)
    return ReportOut(**payload)


@router.post("/{audit_id}/share", response_model=ShareResponse)
async def share_report(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Génère un lien public de partage en lecture seule pour le jury ou la direction."""
    audit = await _load_audit(audit_id, db, user_id)
    if audit.status != "completed":
        raise HTTPException(status_code=400, detail="Seul un audit terminé peut être partagé")

    if not audit.public_token:
        audit.public_token = secrets.token_urlsafe(20)
        await db.commit()
        await db.refresh(audit)

    return ShareResponse(
        audit_id=audit.id,
        public_token=audit.public_token,
        public_url=f"/reports/public/{audit.public_token}",
    )


@router.get("/{audit_id}/policy", response_model=PolicyOut)
@router.get("/{audit_id}/politique", response_model=PolicyOut)
async def get_report_policy(
    audit_id: int,
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    """Génère la Politique de Sécurité des Systèmes d'Information (PSSI) en Markdown."""
    audit = await _load_audit(audit_id, db, user_id)
    if audit.status != "completed" or audit.scan_result is None:
        raise HTTPException(status_code=400, detail="L'audit doit être terminé pour générer la politique")

    payload = await run_in_threadpool(_build_report_payload, audit)
    score_val = audit.score.global_score if audit.score else 50.0
    findings = payload.get("findings") or []

    pssi_md = generate_pssi_markdown(
        platform_name=audit.platform.name,
        domain=audit.platform.domain,
        score=score_val,
        findings=findings,
    )

    return PolicyOut(
        audit_id=audit.id,
        platform_name=audit.platform.name,
        domain=audit.platform.domain,
        score=score_val,
        pssi_markdown=pssi_md,
    )


@router.post("/{audit_id}/reanalyze", response_model=ReportOut)
async def reanalyze_report(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Régénère l'analyse IA à partir des données de scan déjà stockées."""
    audit = await _load_audit(audit_id, db, user_id)
    if audit.scan_result is None or not audit.scan_result.raw_json:
        raise HTTPException(status_code=400, detail="Aucune donnée de scan à ré-analyser")

    raw = audit.scan_result.raw_json or {}
    try:
        analysis = await run_in_threadpool(get_engine_client().analyze, raw)
    except EngineError as exc:
        raise HTTPException(status_code=503, detail=f"Analyse indisponible : {exc}") from exc

    analysis = coerce_analysis_result(analysis or {})
    if not analysis.get("findings") and raw.get("vulnerabilities"):
        for index, vuln in enumerate(raw.get("vulnerabilities") or []):
            if not isinstance(vuln, dict):
                continue
            analysis.setdefault("findings", []).append(
                {
                    "title": vuln.get("title") or vuln.get("name") or f"Vulnérabilité {index + 1}",
                    "severity": vuln.get("severity") or "low",
                    "description": vuln.get("description") or "",
                }
            )

    audit.scan_result.analysis_json = analysis
    audit.scan_result.summary = analysis.get("summary") or analysis.get("explications", "")
    await db.commit()
    await db.refresh(audit)
    payload = await run_in_threadpool(_build_report_payload, audit)
    return ReportOut(**payload)


@router.get("/{audit_id}/pdf")
async def get_report_pdf(
    audit_id: int,
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    audit = await _load_audit(audit_id, db, user_id)
    if audit.status != "completed" or audit.scan_result is None:
        raise HTTPException(status_code=400, detail="Le rapport n'est pas encore disponible")

    payload = await run_in_threadpool(_build_report_payload, audit)
    payload["platform"] = {
        "name": audit.platform.name,
        "domain": audit.platform.domain,
        "url": audit.platform.url,
    }
    pdf_bytes = build_report_pdf(payload)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dedefia-rapport-audit-{audit_id}.pdf"'
        },
    )

