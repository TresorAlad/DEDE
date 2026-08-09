import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import get_current_user_id
from app.db import get_db, get_db_ro
from app.models import Audit, Platform
from app.schemas import ReportOut
from app.services.pdf_report import build_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


async def _load_audit(audit_id: int, db: AsyncSession, user_id: int) -> Audit:
    # joinedload : tout est récupéré en une seule requête SQL (relations 1-1 /
    # n-1), au lieu d'un aller-retour réseau par relation.
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
    raw = (audit.scan_result.raw_json if audit.scan_result else None) or {}

    findings = list(analysis.get("findings") or [])
    if not findings:
        for key in ("nuclei", "headers", "ssl"):
            value = raw.get(key)
            if isinstance(value, list):
                findings.extend(value)
            elif isinstance(value, dict) and value.get("findings"):
                findings.extend(value["findings"])

    # On recalcule la couverture et la note explicative à partir du scan brut
    # (source de vérité unique du scoring), sans écraser le score stocké.
    coverage = None
    note = None
    if raw:
        from scanners.scoring import compute_score

        score_data = compute_score(raw)
        coverage = score_data.get("coverage")
        note = score_data.get("note")

    return {
        "audit_id": audit.id,
        "status": audit.status,
        "score": audit.score.global_score if audit.score else None,
        "risk_level": audit.score.risk_level if audit.score else None,
        "categories": audit.score.categories if audit.score else {},
        "coverage": coverage,
        "note": note,
        "summary": audit.scan_result.summary if audit.scan_result else None,
        "findings": findings,
        "recommendations": analysis.get("recommandations") or analysis.get("recommendations") or [],
        "plan_correction": analysis.get("plan_correction") or [],
        "surface_hosts": raw.get("surface_hosts") or [],
        "progress": audit.progress_json or [],
        "created_at": audit.created_at,
        "started_at": audit.started_at,
        "finished_at": audit.finished_at,
    }


@router.get("/{audit_id}", response_model=ReportOut)
async def get_report(
    audit_id: int,
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    audit = await _load_audit(audit_id, db, user_id)
    return ReportOut(**_build_report_payload(audit))


@router.post("/{audit_id}/reanalyze", response_model=ReportOut)
async def reanalyze_report(
    audit_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Régénère l'analyse IA (résumé, recommandations, plan détaillé) à partir
    des données de scan déjà stockées, sans relancer les scanners."""
    audit = await _load_audit(audit_id, db, user_id)
    if audit.scan_result is None or not audit.scan_result.raw_json:
        raise HTTPException(status_code=400, detail="Aucune donnée de scan à ré-analyser")

    from ai.report_analyzer import analyze

    raw = audit.scan_result.raw_json or {}
    try:
        analysis = analyze(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Analyse indisponible : {exc}") from exc

    audit.scan_result.analysis_json = analysis
    audit.scan_result.summary = analysis.get("summary") or analysis.get("explications", "")
    await db.commit()
    await db.refresh(audit)
    return ReportOut(**_build_report_payload(audit))


@router.get("/{audit_id}/pdf")
async def get_report_pdf(
    audit_id: int,
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    audit = await _load_audit(audit_id, db, user_id)
    if audit.status != "completed" or audit.scan_result is None:
        raise HTTPException(status_code=400, detail="Le rapport n'est pas encore disponible")

    payload = _build_report_payload(audit)
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
            "Content-Disposition": f'attachment; filename="dede-rapport-audit-{audit_id}.pdf"'
        },
    )
