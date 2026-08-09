"""Client Mistral AI pour DEDE (modèle mistral-small-latest)."""

from __future__ import annotations

import json
import os
from typing import Any


DEFAULT_MODEL = "mistral-small-latest"
DEFAULT_MAX_TOKENS = 450


def get_api_key() -> str:
    return os.getenv("MISTRAL_API_KEY", "").strip()


def chat(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.2,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    response_format: dict[str, Any] | None = None,
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
        "max_tokens": max_tokens,
    }
    if tools:
        kwargs["tools"] = tools
    if tool_choice is not None:
        kwargs["tool_choice"] = tool_choice
    if response_format is not None:
        kwargs["response_format"] = response_format

    response = client.chat.complete(**kwargs)
    return response.choices[0].message


def _strip_json_fences(text: str) -> str:
    """Retire un éventuel encadrement markdown ```json ... ``` autour du JSON."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3]
    return cleaned.strip()


def chat_json(
    system_prompt: str,
    user_content: str,
    *,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 4000,
) -> dict[str, Any]:
    """Demande une réponse JSON et tente de la parser.

    On force le mode JSON de Mistral (response_format) pour éviter les blocs
    markdown, et on laisse une marge de tokens suffisante car l'analyse
    détaillée (recommandations + plan pas à pas) est volumineuse.
    """
    message = chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        model=model,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = getattr(message, "content", None) or ""
    for candidate in (content, _strip_json_fences(content)):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    # Dernier recours : extraire le plus grand objet {...}.
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
