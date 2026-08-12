"""Analyse des résultats bruts d'audit via Mistral AI."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from ai.mistral_client import chat_json, get_api_key


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _load_system_prompt(engine: str = "scanners") -> str:
    if engine == "agents":
        path = PROMPTS_DIR / "explain_agent_report.md"
    else:
        path = PROMPTS_DIR / "explain_findings.md"
    return path.read_text(encoding="utf-8")


def _normalize_result(result: dict[str, Any]) -> dict[str, Any]:
    result.setdefault("summary", "")
    result.setdefault("explications", "")
    result.setdefault("findings", [])
    result.setdefault("recommandations", result.get("recommendations", []))
    result.setdefault("plan_correction", [])
    return result


def _try_parse_embedded_json(value: str) -> dict[str, Any] | None:
    """Si une chaîne contient un objet JSON, le retourne (réponses LLM imbriquées)."""
    stripped = value.strip()
    if not stripped.startswith("{"):
        return None
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def coerce_analysis_result(result: dict[str, Any]) -> dict[str, Any]:
    """Normalise les réponses LLM parfois double-encodées (summary = JSON string)."""
    if not isinstance(result, dict):
        return _normalize_result({"summary": str(result)})

    merged = dict(result)

    for key in ("summary", "explications"):
        nested = _try_parse_embedded_json(str(merged.get(key) or ""))
        if nested:
            for field, value in nested.items():
                if field not in merged or not merged[field]:
                    merged[field] = value
                elif field in ("findings", "recommandations", "recommendations", "plan_correction"):
                    if not merged[field] and value:
                        merged[field] = value

    # Certains modèles renvoient le JSON complet dans explications.
    nested = _try_parse_embedded_json(str(merged.get("explications") or ""))
    if nested and not merged.get("findings") and nested.get("findings"):
        merged.update({k: v for k, v in nested.items() if v})

    if isinstance(merged.get("summary"), dict):
        inner = merged["summary"]
        merged["summary"] = inner.get("summary") or inner.get("explications") or json.dumps(
            inner, ensure_ascii=False
        )

    for key in ("summary", "explications"):
        value = merged.get(key)
        if isinstance(value, str) and value.strip().startswith("{") and not _try_parse_embedded_json(value):
            match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"', value)
            if match:
                merged[key] = match.group(1).replace('\\"', '"').replace("\\n", "\n")
        elif not isinstance(value, str):
            merged[key] = str(value or "")

    return _normalize_result(merged)


def _unavailable_payload(*, for_agents: bool) -> dict[str, Any]:
    if for_agents:
        return {
            "summary": "Analyse IA indisponible (MISTRAL_API_KEY absente).",
            "explications": (
                "Le rapport agent brut est disponible. "
                "Configurez MISTRAL_API_KEY pour générer la synthèse en français."
            ),
            "findings": [],
            "recommandations": [
                "Configurer MISTRAL_API_KEY pour activer la transcription en français."
            ],
            "plan_correction": [],
        }
    return {
        "summary": "Analyse IA indisponible (MISTRAL_API_KEY absente).",
        "explications": (
            "Les résultats bruts des scanners sont disponibles. "
            "Configurez MISTRAL_API_KEY pour générer les explications."
        ),
        "findings": [],
        "recommandations": [
            "Configurer MISTRAL_API_KEY pour activer l'analyse intelligente."
        ],
        "plan_correction": [],
    }


def analyze(scan_json: dict[str, Any]) -> dict[str, Any]:
    """
    Transforme les résultats bruts en explications et recommandations.

    - engine scanners (défaut) : prompt explain_findings.md
    - engine agents : prompt explain_agent_report.md (traduction FR du MD anglais)
    """
    engine = str(scan_json.get("engine") or "scanners")
    for_agents = engine == "agents"

    if not get_api_key():
        return _unavailable_payload(for_agents=for_agents)

    system_prompt = _load_system_prompt(engine if for_agents else "scanners")

    if for_agents:
        # Payload compact : MD anglais + vulnérabilités (évite le bruit du graphe).
        payload = {
            "engine": "agents",
            "run_name": scan_json.get("run_name"),
            "report_markdown": scan_json.get("report_markdown") or "",
            "vulnerabilities": scan_json.get("vulnerabilities") or [],
            "surface_hosts": scan_json.get("surface_hosts") or [],
        }
        user_content = (
            "Voici le rapport d'audit par agents IA (markdown en anglais) "
            "et la liste des vulnérabilités. "
            "Traduis et analyse pour un client francophone. "
            "Réponds uniquement en JSON valide.\n\n"
            f"{json.dumps(payload, ensure_ascii=False)[:120000]}"
        )
    else:
        user_content = (
            "Voici les résultats bruts de l'audit au format JSON. "
            "Analyse-les et réponds uniquement en JSON valide.\n\n"
            f"{json.dumps(scan_json, ensure_ascii=False)[:120000]}"
        )

    result = chat_json(
        system_prompt,
        user_content,
        max_tokens=8000 if for_agents else 4000,
    )
    return coerce_analysis_result(result)


def analyze_agent_export(payload: dict[str, Any]) -> dict[str, Any]:
    """Point d'entrée explicite pour un export agent (ZIP / legacy)."""
    data = dict(payload or {})
    data["engine"] = "agents"
    return analyze(data)
