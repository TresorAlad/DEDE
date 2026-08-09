"""Suivi d'audit étape par étape (bande de suivi UI)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

PROGRESS_STEPS: list[dict[str, str]] = [
    {"key": "queued", "label": "Reçu"},
    {"key": "surface", "label": "Surface DNS"},
    {"key": "nuclei", "label": "Vulnérabilités"},
    {"key": "ssl", "label": "SSL / TLS"},
    {"key": "headers", "label": "En-têtes HTTP"},
    {"key": "score", "label": "Score"},
    {"key": "ai", "label": "Analyse IA"},
    {"key": "done", "label": "Terminé"},
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def initial_progress() -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    for index, meta in enumerate(PROGRESS_STEPS):
        status = "done" if index == 0 else "pending"
        steps.append(
            {
                "key": meta["key"],
                "label": meta["label"],
                "status": status,
                "at": _now_iso() if index == 0 else None,
                "detail": "Audit mis en file" if index == 0 else None,
            }
        )
    return steps


def progress_current_key(steps: list[dict[str, Any]]) -> str:
    for step in reversed(steps):
        if step.get("status") in {"active", "done", "failed"}:
            return str(step.get("key") or "surface")
    return "surface"


def mark_step(
    steps: list[dict[str, Any]],
    key: str,
    status: str,
    detail: str | None = None,
) -> list[dict[str, Any]]:
    """Met à jour une étape et marque les précédentes comme terminées."""
    updated: list[dict[str, Any]] = []
    found = False
    for step in steps:
        item = dict(step)
        if item["key"] == key:
            found = True
            item["status"] = status
            item["at"] = _now_iso()
            if detail is not None:
                item["detail"] = detail
        elif not found:
            if item["status"] not in {"done", "failed"}:
                item["status"] = "done"
                item["at"] = item.get("at") or _now_iso()
        elif item["status"] == "active" and status == "active":
            item["status"] = "pending"
        updated.append(item)
    return updated
