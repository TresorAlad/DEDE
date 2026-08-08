"""Chatbot agentic léger (function calling) basé sur le rapport d'audit."""

from __future__ import annotations

import json
from typing import Any, Callable

from ai.mistral_client import chat, get_api_key


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_score",
            "description": "Récupère le score global et le niveau de risque de l'audit.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_vulnerabilites",
            "description": (
                "Récupère les vulnérabilités / findings, éventuellement filtrés "
                "par catégorie (Configuration, Exposition réseau, Sécurité Web, "
                "Gestion des accès, Protection des données)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "categorie": {
                        "type": "string",
                        "description": "Catégorie optionnelle pour filtrer les résultats.",
                    }
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recommandation",
            "description": "Récupère une recommandation précise par index (0-based).",
            "parameters": {
                "type": "object",
                "properties": {
                    "index": {
                        "type": "integer",
                        "description": "Index de la recommandation dans la liste.",
                    }
                },
                "required": ["index"],
                "additionalProperties": False,
            },
        },
    },
]


def _tool_get_score(report: dict[str, Any], _args: dict[str, Any]) -> dict[str, Any]:
    return {
        "score": report.get("score"),
        "risk_level": report.get("risk_level"),
        "categories": report.get("categories") or {},
    }


def _tool_get_vulnerabilites(report: dict[str, Any], args: dict[str, Any]) -> dict[str, Any]:
    analysis = report.get("analysis") or {}
    findings = list(analysis.get("findings") or [])
    if not findings:
        raw = report.get("raw") or {}
        for key in ("nuclei", "headers"):
            value = raw.get(key)
            if isinstance(value, list):
                findings.extend(value)
        ssl = raw.get("ssl") or {}
        if isinstance(ssl, dict):
            findings.extend(ssl.get("findings") or [])

    categorie = (args.get("categorie") or "").strip().lower()
    if categorie:
        filtered = []
        for item in findings:
            blob = json.dumps(item, ensure_ascii=False).lower()
            if categorie in blob:
                filtered.append(item)
        findings = filtered

    return {"count": len(findings), "findings": findings[:30]}


def _tool_get_recommandation(report: dict[str, Any], args: dict[str, Any]) -> dict[str, Any]:
    analysis = report.get("analysis") or {}
    recommendations = analysis.get("recommandations") or analysis.get("recommendations") or []
    try:
        index = int(args.get("index", 0))
    except (TypeError, ValueError):
        return {"error": "Index invalide"}
    if index < 0 or index >= len(recommendations):
        return {
            "error": "Index hors limites",
            "count": len(recommendations),
        }
    return {"index": index, "recommendation": recommendations[index]}


TOOL_HANDLERS: dict[str, Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]] = {
    "get_score": _tool_get_score,
    "get_vulnerabilites": _tool_get_vulnerabilites,
    "get_recommandation": _tool_get_recommandation,
}


def ask_about_report(question: str, report_context: dict[str, Any], max_steps: int = 4) -> str:
    """
    Boucle agentic légère : le LLM peut appeler get_score / get_vulnerabilites / get_recommandation
    avant de répondre. Les données restent limitées au rapport de l'utilisateur.
    """
    if not get_api_key():
        score = report_context.get("score")
        risk = report_context.get("risk_level")
        return (
            "Le chatbot IA n'est pas configuré (MISTRAL_API_KEY absente). "
            f"Score actuel : {score}/100, risque : {risk}. "
            "Ajoutez la clé API pour obtenir des réponses conversationnelles."
        )

    system = (
        "Tu es l'assistant conversationnel DEDE. "
        "Tu réponds en français, de façon claire et concrète. "
        "Tu t'appuies uniquement sur les outils fournis et sur le rapport de l'utilisateur. "
        "Tu ne inventes pas de failles. Tu ne proposes pas d'attaque."
    )
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                f"Question sur l'audit #{report_context.get('audit_id')}: {question}\n"
                f"Résumé disponible: {report_context.get('summary') or 'non généré'}"
            ),
        },
    ]

    for _ in range(max_steps):
        message = chat(messages, tools=TOOLS, tool_choice="auto")
        tool_calls = getattr(message, "tool_calls", None) or []

        # Append assistant turn
        assistant_msg: dict[str, Any] = {"role": "assistant", "content": getattr(message, "content", None)}
        if tool_calls:
            # Convert SDK tool_calls to serializable structure for the next round.
            serialized = []
            for call in tool_calls:
                serialized.append(
                    {
                        "id": getattr(call, "id", None),
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                )
            assistant_msg["tool_calls"] = serialized
        messages.append(assistant_msg)

        if not tool_calls:
            content = getattr(message, "content", None) or ""
            return content.strip() or "Je n'ai pas pu formuler de réponse."

        for call in tool_calls:
            name = call.function.name
            try:
                args = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            handler = TOOL_HANDLERS.get(name)
            if handler is None:
                result = {"error": f"Outil inconnu: {name}"}
            else:
                result = handler(report_context, args)
            messages.append(
                {
                    "role": "tool",
                    "name": name,
                    "tool_call_id": getattr(call, "id", name),
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )

    # Dernier appel forcé sans outils si la boucle n'a pas conclu.
    final = chat(messages + [{"role": "user", "content": "Donne maintenant la réponse finale."}])
    return (getattr(final, "content", None) or "").strip() or "Réponse indisponible."
