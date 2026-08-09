"""Analyse des en-têtes de sécurité HTTP (module interne)."""

from __future__ import annotations

from typing import Any

import requests

from scanners.ssrf_guard import UnsafeTargetError, safe_get


SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "severity": "high",
        "risk": "Sans HSTS, un attaquant peut forcer une connexion en HTTP non chiffré.",
        "solution": "Ajouter l'en-tête Strict-Transport-Security avec max-age >= 31536000.",
        "fix_command": 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
    },
    "Content-Security-Policy": {
        "severity": "high",
        "risk": "Sans CSP, le site est plus vulnérable aux attaques XSS.",
        "solution": "Définir une politique CSP restrictive adaptée aux ressources utilisées.",
        "fix_command": 'add_header Content-Security-Policy "default-src \'self\';" always;',
    },
    "X-Frame-Options": {
        "severity": "medium",
        "risk": "Le site peut être intégré dans une iframe malveillante (clickjacking).",
        "solution": "Ajouter X-Frame-Options: DENY ou SAMEORIGIN.",
        "fix_command": "add_header X-Frame-Options SAMEORIGIN always;",
    },
    "X-Content-Type-Options": {
        "severity": "medium",
        "risk": "Le navigateur peut interpréter incorrectement le type MIME d'une ressource.",
        "solution": "Ajouter X-Content-Type-Options: nosniff.",
        "fix_command": "add_header X-Content-Type-Options nosniff always;",
    },
    "Referrer-Policy": {
        "severity": "low",
        "risk": "Des informations d'URL sensibles peuvent fuiter via l'en-tête Referer.",
        "solution": "Ajouter Referrer-Policy: no-referrer ou strict-origin-when-cross-origin.",
        "fix_command": "add_header Referrer-Policy strict-origin-when-cross-origin always;",
    },
}


def analyze_headers(url: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    try:
        response = safe_get(url, timeout=10)
    except UnsafeTargetError as exc:
        return [
            {
                "type": "blocked_target",
                "tool": "http_headers",
                "severity": "info",
                "message": f"Cible ignorée par sécurité : {exc}",
            }
        ]
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
                    "fix_command": details.get("fix_command"),
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
                "fix_command": "server_tokens off;",
                "source": "http_headers",
            }
        )

    return findings
