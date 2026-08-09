"""Orchestrateur des analyses d'audit (pipeline fixe, non agentic)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

from scanners.http_headers import analyze_headers
from scanners.nuclei_runner import run_nuclei
from scanners.ssl_analyzer import analyze_ssl
from scanners.ssrf_guard import UnsafeTargetError, assert_public_host
from scanners.subdomain_discovery import discover_subdomains

# Mode intrusif : on couvre davantage de sous-domaines découverts.
MAX_EXTRA_HOSTS = 10
MAX_EXTRA_SSL_HEADERS = 10

ProgressCallback = Callable[[str, str | None], None]


def _normalize_url(url: str, domain: str) -> str:
    value = (url or "").strip()
    if not value:
        return f"https://{domain}"
    if not value.startswith(("http://", "https://")):
        return f"https://{value}"
    return value


def _collect_surface_hosts(domain: str, amass_findings: list[dict[str, Any]]) -> list[str]:
    """Construit la liste de la surface d'attaque : domaine racine + sous-domaines."""
    hosts: list[str] = []
    seen: set[str] = set()

    apex = domain.lower().strip().rstrip(".")
    if apex:
        hosts.append(apex)
        seen.add(apex)

    for finding in amass_findings:
        if finding.get("type") != "subdomain":
            continue
        host = str(finding.get("host") or "").lower().strip().rstrip(".")
        if not host or host in seen:
            continue
        seen.add(host)
        hosts.append(host)

    return hosts


def _notify(on_progress: ProgressCallback | None, step: str, detail: str | None = None) -> None:
    if on_progress is None:
        return
    try:
        on_progress(step, detail)
    except Exception:  # noqa: BLE001
        # Le suivi ne doit jamais faire échouer l'audit.
        pass


def run_all(
    domain: str,
    url: str,
    on_progress: ProgressCallback | None = None,
) -> dict[str, Any]:
    """
    Exécute la découverte de surface, Nuclei (CVE/RCE/OOB), sslyze et les en-têtes.

    `on_progress(step_key, detail)` est appelé à chaque étape pour alimenter
    la bande de suivi côté interface.
    """
    target_url = _normalize_url(url, domain)
    parsed = urlparse(target_url)
    primary_host = (parsed.hostname or domain).lower().strip().rstrip(".")

    blocked_hosts: list[dict[str, Any]] = []

    try:
        assert_public_host(primary_host)
    except UnsafeTargetError as exc:
        _notify(on_progress, "failed", str(exc))
        return {
            "domain": domain,
            "url": target_url,
            "surface_hosts": [],
            "targets_scanned": [],
            "amass": [],
            "nuclei": [],
            "ssl": {"findings": []},
            "headers": [
                {
                    "type": "blocked_target",
                    "tool": "orchestrator",
                    "severity": "info",
                    "message": f"Audit refusé : {exc}",
                }
            ],
        }

    _notify(on_progress, "surface", "Découverte active DNS / Amass / certificats")
    amass = discover_subdomains(domain)
    surface_hosts = _collect_surface_hosts(domain, amass)
    web_hosts = {
        str(f.get("host") or "").lower().rstrip(".")
        for f in amass
        if f.get("type") == "subdomain" and f.get("web", True)
    }
    _notify(
        on_progress,
        "surface",
        f"{len(surface_hosts)} hôte(s) découvert(s)",
    )

    _notify(
        on_progress,
        "nuclei",
        "Scan intrusif : CVE, RCE, OOB, DAST (SQLi/XSS)",
    )
    nuclei = run_nuclei(target_url, timeout=420)

    _notify(on_progress, "ssl", f"Analyse SSL/TLS de {primary_host}")
    ssl = analyze_ssl(primary_host)

    _notify(on_progress, "headers", "En-têtes HTTP de sécurité")
    headers = analyze_headers(target_url)

    targets_scanned = [target_url]
    extra_hosts = []
    for host in surface_hosts:
        if host == primary_host:
            continue
        if host not in web_hosts:
            continue
        try:
            assert_public_host(host)
        except UnsafeTargetError as exc:
            blocked_hosts.append(
                {
                    "type": "blocked_target",
                    "tool": "orchestrator",
                    "severity": "info",
                    "host": host,
                    "message": f"Sous-domaine ignoré par sécurité : {exc}",
                }
            )
            continue
        extra_hosts.append(host)

    if extra_hosts[:MAX_EXTRA_HOSTS]:
        _notify(
            on_progress,
            "nuclei",
            f"Scan des sous-domaines ({min(len(extra_hosts), MAX_EXTRA_HOSTS)})",
        )
    for host in extra_hosts[:MAX_EXTRA_HOSTS]:
        extra_url = f"https://{host}"
        targets_scanned.append(extra_url)
        for finding in run_nuclei(extra_url, timeout=240):
            if isinstance(finding, dict):
                finding.setdefault("host", host)
            nuclei.append(finding)

    if extra_hosts[:MAX_EXTRA_SSL_HEADERS]:
        _notify(on_progress, "ssl", "SSL / en-têtes des sous-domaines")
    for host in extra_hosts[:MAX_EXTRA_SSL_HEADERS]:
        ssl_extra = analyze_ssl(host)
        for finding in ssl_extra.get("findings", []):
            if isinstance(finding, dict):
                finding.setdefault("host", host)
            ssl.setdefault("findings", []).append(finding)

        for finding in analyze_headers(f"https://{host}"):
            if isinstance(finding, dict):
                finding.setdefault("host", host)
            headers.append(finding)

    headers.extend(blocked_hosts)

    return {
        "domain": domain,
        "url": target_url,
        "surface_hosts": surface_hosts,
        "targets_scanned": targets_scanned,
        "amass": amass,
        "nuclei": nuclei,
        "ssl": ssl,
        "headers": headers,
    }
