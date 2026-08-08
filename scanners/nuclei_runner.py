"""Wrapper Nuclei pour la détection de vulnérabilités et mauvaises configurations."""

from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any


def run_nuclei(url: str, timeout: int = 300) -> list[dict[str, Any]]:
    """
    Lance `nuclei -u <url> -jsonl` et parse les findings.

    Retourne une liste de dictionnaires normalisés.
    """
    if shutil.which("nuclei") is None:
        return [
            {
                "type": "tool_unavailable",
                "tool": "nuclei",
                "severity": "info",
                "message": "Nuclei n'est pas installé sur cette machine.",
            }
        ]

    try:
        completed = subprocess.run(
            [
                "nuclei",
                "-u",
                url,
                "-jsonl",
                "-silent",
                "-severity",
                "critical,high,medium,low,info",
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return [
            {
                "type": "timeout",
                "tool": "nuclei",
                "severity": "medium",
                "message": f"Nuclei a dépassé le délai de {timeout}s.",
            }
        ]
    except OSError as exc:
        return [
            {
                "type": "error",
                "tool": "nuclei",
                "severity": "medium",
                "message": str(exc),
            }
        ]

    findings: list[dict[str, Any]] = []
    for line in completed.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        info = item.get("info") or {}
        findings.append(
            {
                "type": "vulnerability",
                "title": info.get("name") or item.get("template-id") or "Finding Nuclei",
                "severity": (info.get("severity") or "info").lower(),
                "template_id": item.get("template-id"),
                "matched_at": item.get("matched-at") or item.get("host"),
                "description": info.get("description") or "",
                "source": "nuclei",
            }
        )

    if completed.returncode != 0 and not findings:
        return [
            {
                "type": "error",
                "tool": "nuclei",
                "severity": "medium",
                "message": completed.stderr.strip() or "Nuclei a échoué sans sortie.",
            }
        ]

    return findings
