"""Wrapper Amass (mode passif) pour la découverte de sous-domaines."""

from __future__ import annotations

import shutil
import subprocess
from typing import Any


def run_amass(domain: str, timeout: int = 180) -> list[dict[str, Any]]:
    """
    Lance `amass enum -passive -d <domain>` et retourne une liste de sous-domaines.

    Si Amass n'est pas installé, retourne une structure d'erreur contrôlée
    pour ne pas faire planter tout le pipeline MVP.
    """
    if shutil.which("amass") is None:
        return [
            {
                "type": "tool_unavailable",
                "tool": "amass",
                "severity": "info",
                "message": "Amass n'est pas installé sur cette machine.",
            }
        ]

    try:
        completed = subprocess.run(
            ["amass", "enum", "-passive", "-d", domain, "-timeout", "2"],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return [
            {
                "type": "timeout",
                "tool": "amass",
                "severity": "medium",
                "message": f"Amass a dépassé le délai de {timeout}s.",
            }
        ]
    except OSError as exc:
        return [
            {
                "type": "error",
                "tool": "amass",
                "severity": "medium",
                "message": str(exc),
            }
        ]

    lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    findings = [
        {
            "type": "subdomain",
            "host": host,
            "severity": "info",
            "source": "amass",
        }
        for host in sorted(set(lines))
    ]

    if completed.returncode != 0 and not findings:
        return [
            {
                "type": "error",
                "tool": "amass",
                "severity": "medium",
                "message": completed.stderr.strip() or "Amass a échoué sans sortie.",
            }
        ]

    return findings
