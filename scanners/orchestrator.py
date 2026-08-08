"""Orchestrateur des 4 analyses d'audit (pipeline fixe, non agentic)."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from scanners.amass_runner import run_amass
from scanners.http_headers import analyze_headers
from scanners.nuclei_runner import run_nuclei
from scanners.ssl_analyzer import analyze_ssl


def _normalize_url(url: str, domain: str) -> str:
    value = (url or "").strip()
    if not value:
        return f"https://{domain}"
    if not value.startswith(("http://", "https://")):
        return f"https://{value}"
    return value


def run_all(domain: str, url: str) -> dict[str, Any]:
    """
    Exécute Amass, Nuclei, sslyze et l'analyse des en-têtes HTTP.

    Retourne un JSON unifié consommable par le scoring et le LLM.
    """
    target_url = _normalize_url(url, domain)
    parsed = urlparse(target_url)
    host = parsed.hostname or domain

    amass = run_amass(domain)
    nuclei = run_nuclei(target_url)
    ssl = analyze_ssl(host)
    headers = analyze_headers(target_url)

    return {
        "domain": domain,
        "url": target_url,
        "amass": amass,
        "nuclei": nuclei,
        "ssl": ssl,
        "headers": headers,
    }
