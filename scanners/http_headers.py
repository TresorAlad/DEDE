"""Analyse des en-têtes de sécurité HTTP (module interne)."""

from __future__ import annotations

from typing import Any

import requests


SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "severity": "high",
        "risk": "Sans HSTS, un attaquant peut forcer une connexion en HTTP non chiffré.",
        "solution": "Ajouter l'en-tête Strict-Transport-Security avec max-age >= 31536000.",
    },
    "Content-Security-Policy": {
        "severity": "high",
        "risk": "Sans CSP, le site est plus vulnérable aux attaques XSS.",
        "solution": "Définir une politique CSP restrictive adaptée aux ressources utilisées.",
    },
    "X-Frame-Options": {
        "severity": "medium",
        "risk": "Le site peut être intégré dans une iframe malveillante (clickjacking).",
        "solution": "Ajouter X-Frame-Options: DENY ou SAMEORIGIN.",
    },
    "X-Content-Type-Options": {
        "severity": "medium",
        "risk": "Le navigateur peut interpréter incorrectement le type MIME d'une ressource.",
        "solution": "Ajouter X-Content-Type-Options: nosniff.",
    },
    "Referrer-Policy": {
        "severity": "low",
        "risk": "Des informations d'URL sensibles peuvent fuiter via l'en-tête Referer.",
        "solution": "Ajouter Referrer-Policy: no-referrer ou strict-origin-when-cross-origin.",
    },
}


def analyze_headers(url: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
    except requests.RequestException as exc:
        return [
            {
                "type": "error",
                "tool": "http_headers",
                "severity": "medium",
                "message": f"Impossible de joindre {url} : {exc}",
            }
        ]

    headers = response.headers

    for header_name, details in SECURITY_HEADERS.items():
        if header_name not in headers:
            findings.append(
                {
                    "type": "missing_header",
                    "header": header_name,
                    "title": f"En-tête manquant : {header_name}",
                    "severity": details["severity"],
                    "risk": details["risk"],
                    "solution": details["solution"],
                    "source": "http_headers",
                }
            )

    server = headers.get("Server")
    if server:
        findings.append(
            {
                "type": "info_disclosure",
                "header": "Server",
                "value": server,
                "title": "Divulgation d'information via Server",
                "severity": "low",
                "risk": (
                    "La version du serveur est visible, "
                    "ce qui facilite le ciblage d'attaques connues."
                ),
                "solution": "Masquer ou généraliser l'en-tête Server.",
                "source": "http_headers",
            }
        )

    return findings
