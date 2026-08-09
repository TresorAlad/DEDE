"""Chatbot agentic léger (function calling) basé sur le rapport d'audit."""

from __future__ import annotations

import json
import re
from typing import Any, Callable

from ai.mistral_client import chat, get_api_key


# Réponses courtes pour limiter la consommation de tokens.
CHAT_MAX_TOKENS = 280

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


SYSTEM_PROMPT = """Tu es l'assistant conversationnel de ƉEƉE.

Règles de réponse (obligatoires) :
- Français clair, net et précis.
- Réponds uniquement à la question, sans digression ni introduction longue.
- Maximum 5 phrases ou 6 lignes utiles.
- Interdit : titres # ## ###
- Interdit : séparateurs ---
- Interdit : accolades { }
- Interdit : astérisques isolés * et puces *
- Interdit : parenthèses inutiles
- Autorisé pour le gras : **mot important**
- Autorisé pour les listes : - élément
- Pour une commande shell, utilise uniquement un bloc :
```bash
commande ici
```
- Pour un lien, utilise uniquement : [texte du lien](https://exemple.com)
- Pour un plan structuré, utilise un petit tableau :
| Étape | Action | Résultat |
| --- | --- | --- |
| 1 | Faire X | Y |
- Ne invente aucune faille. Base-toi uniquement sur les outils et le rapport.
- Ne propose jamais d'attaque ou d'exploitation.
"""


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


def _clean_answer(text: str) -> str:
    """Nettoie le bruit markdown, conserve gras, liens, tableaux et blocs ```bash."""
    if not text:
        return text

    result_lines: list[str] = []
    in_code = False

    for line in text.splitlines():
        stripped = line.strip()

        if stripped.startswith("```"):
            if not in_code:
                lang = stripped[3:].strip() or "bash"
                result_lines.append(f"```{lang}")
                in_code = True
            else:
                result_lines.append("```")
                in_code = False
            continue

        if in_code:
            result_lines.append(line.rstrip())
            continue

        cleaned = line.rstrip()
        if re.fullmatch(r"\s*-{3,}\s*", cleaned):
            continue

        cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned)
        cleaned = re.sub(r"^\s*[\*•]\s+", "- ", cleaned)
        cleaned = cleaned.replace("{", "").replace("}", "")
        cleaned = re.sub(r"\(\s*\)", "", cleaned)

        # Protège le gras **...**, retire les * restants, restaure le gras
        bold_parts: list[str] = []

        def _store_bold(match: re.Match[str]) -> str:
            bold_parts.append(match.group(1))
            return f"__BOLD_{len(bold_parts) - 1}__"

        cleaned = re.sub(r"\*\*([^*]+)\*\*", _store_bold, cleaned)
        cleaned = cleaned.replace("*", "")
        for idx, inner in enumerate(bold_parts):
            cleaned = cleaned.replace(f"__BOLD_{idx}__", f"**{inner}**")

        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
        result_lines.append(cleaned)

    result = "\n".join(result_lines)
    result = re.sub(r"\n{3,}", "\n\n", result).strip()
    return result


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

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Question sur l'audit #{report_context.get('audit_id')}: {question}\n"
                f"Résumé disponible: {report_context.get('summary') or 'non généré'}\n"
                "Réponds de façon très courte et précise. Maximum 5 phrases."
            ),
        },
    ]

    for _ in range(max_steps):
        message = chat(
            messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=CHAT_MAX_TOKENS,
            temperature=0.15,
        )
        tool_calls = getattr(message, "tool_calls", None) or []

        assistant_msg: dict[str, Any] = {
            "role": "assistant",
            "content": getattr(message, "content", None),
        }
        if tool_calls:
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
            cleaned = _clean_answer(content)
            return cleaned or "Je n'ai pas pu formuler de réponse."

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

    final = chat(
        messages
        + [
            {
                "role": "user",
                "content": (
                    "Donne maintenant la réponse finale, très courte, "
                    "sans # ni * isolés. Commandes en ```bash, liens en [texte](url)."
                ),
            }
        ],
        max_tokens=CHAT_MAX_TOKENS,
        temperature=0.15,
    )
    return _clean_answer(getattr(final, "content", None) or "") or "Réponse indisponible."
