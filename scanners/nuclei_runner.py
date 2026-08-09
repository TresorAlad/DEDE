"""Wrapper Nuclei pour la détection de vulnérabilités (mode intrusif)."""

from __future__ import annotations

import json
import subprocess
from typing import Any

from scanners.tools import find_binary

# Couverture intrusive : CVE/RCE, OOB, secrets, SQLi/XSS, cloud, takeover, etc.
NUCLEI_TAGS = ",".join(
    [
        "cve",
        "rce",
        "misconfig",
        "exposure",
        "vuln",
        "sqli",
        "xss",
        "lfi",
        "rfi",
        "redirect",
        "takeover",
        "cloud",
        "s3",
        "default-login",
        "token",
        "config",
        "disclosure",
        "injection",
        "ssrf",
        "auth-bypass",
    ]
)


def _parse_nuclei_output(stdout: str) -> list[dict[str, Any]]:
    """Parse la sortie JSONL de nuclei en findings normalisés."""
    findings: list[dict[str, Any]] = []
    for line in (stdout or "").splitlines():
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
                "tags": info.get("tags") or [],
                "source": "nuclei",
            }
        )
    return findings


def run_nuclei(url: str, timeout: int = 420) -> list[dict[str, Any]]:
    """
    Lance Nuclei en mode intrusif :
    - Interactsh (OOB) activé
    - templates DAST / fuzz (SQLi, XSS génériques, etc.)
    - tags de vulnérabilités élargis

    Toujours limité aux domaines dont la propriété a été vérifiée en amont.
    """
    binary = find_binary("nuclei")
    if binary is None:
        return [
            {
                "type": "tool_unavailable",
                "tool": "nuclei",
                "severity": "info",
                "message": "Nuclei n'est pas installé sur cette machine.",
            }
        ]

    cmd = [
        binary,
        "-u",
        url,
        "-jsonl",
        "-silent",
        "-severity",
        "critical,high,medium,low",
        "-tags",
        NUCLEI_TAGS,
        "-exclude-tags",
        "dos",
        "-dast",
        "-fuzz-aggression",
        "medium",
        "-disable-update-check",
        "-timeout",
        "15",
        "-retries",
        "1",
        "-rate-limit",
        "150",
        "-concurrency",
        "50",
    ]

    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        partial = _parse_nuclei_output(exc.stdout if isinstance(exc.stdout, str) else "")
        if partial:
            return partial
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

    findings = _parse_nuclei_output(completed.stdout)

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
