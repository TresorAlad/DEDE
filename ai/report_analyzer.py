"""Analyse des résultats bruts d'audit via Mistral AI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai.mistral_client import chat_json, get_api_key


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _load_system_prompt() -> str:
    path = PROMPTS_DIR / "explain_findings.md"
    return path.read_text(encoding="utf-8")


def analyze(scan_json: dict[str, Any]) -> dict[str, Any]:
    """
    Transforme le JSON unifié des scanners en explications et recommandations.

    Retourne un dict avec summary, explications, findings, recommandations, plan_correction.
    """
    if not get_api_key():
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

    system_prompt = _load_system_prompt()
    user_content = (
        "Voici les résultats bruts de l'audit au format JSON. "
        "Analyse-les et réponds uniquement en JSON valide.\n\n"
        f"{json.dumps(scan_json, ensure_ascii=False)[:120000]}"
    )
    result = chat_json(system_prompt, user_content)
    # Normalise quelques clés attendues.
    result.setdefault("summary", "")
    result.setdefault("explications", "")
    result.setdefault("findings", [])
    result.setdefault("recommandations", result.get("recommendations", []))
    result.setdefault("plan_correction", [])
    return result
