"""Client Mistral AI pour DEDE (modèle mistral-small-latest)."""

from __future__ import annotations

import json
import os
from typing import Any


DEFAULT_MODEL = "mistral-small-latest"


def get_api_key() -> str:
    return os.getenv("MISTRAL_API_KEY", "").strip()


def chat(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.2,
) -> Any:
    """
    Appelle l'API Mistral Chat Completions.

    Retourne l'objet message assistant du SDK (ou un dict de repli).
    """
    api_key = get_api_key()
    if not api_key:
        # Mode dégradé pour permettre le démarrage local sans clé.
        content = (
            "Clé MISTRAL_API_KEY absente. "
            "Configurez-la pour activer l'analyse IA et le chatbot."
        )
        return type("Msg", (), {"content": content, "tool_calls": None})()

    try:
        from mistralai import Mistral
    except ImportError as exc:
        raise RuntimeError(
            "Le package mistralai n'est pas installé. "
            "Installez-le via ai/requirements.txt."
        ) from exc

    client = Mistral(api_key=api_key)
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        kwargs["tools"] = tools
    if tool_choice is not None:
        kwargs["tool_choice"] = tool_choice

    response = client.chat.complete(**kwargs)
    return response.choices[0].message


def chat_json(
    system_prompt: str,
    user_content: str,
    *,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Demande une réponse JSON et tente de la parser."""
    message = chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        model=model,
    )
    content = getattr(message, "content", None) or ""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Parfois le modèle enveloppe le JSON dans un bloc markdown.
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                pass
        return {
            "summary": content[:500],
            "explications": content,
            "findings": [],
            "recommandations": [],
            "plan_correction": [],
        }
