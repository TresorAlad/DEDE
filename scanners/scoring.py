"""Calcul d'un score de sécurité simple à partir du JSON unifié des scanners."""

from __future__ import annotations

from typing import Any


SEVERITY_PENALTY = {
    "critical": 25,
    "high": 15,
    "medium": 8,
    "low": 3,
    "info": 0,
}


def _iter_findings(scan_json: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for key in ("amass", "nuclei", "headers"):
        value = scan_json.get(key) or []
        if isinstance(value, list):
            findings.extend([f for f in value if isinstance(f, dict)])
    ssl = scan_json.get("ssl") or {}
    if isinstance(ssl, dict):
        findings.extend([f for f in ssl.get("findings", []) if isinstance(f, dict)])
    return findings


def _category_for(finding: dict[str, Any]) -> str:
    ftype = (finding.get("type") or "").lower()
    source = (finding.get("source") or "").lower()
    if ftype == "subdomain" or source == "amass":
        return "Exposition réseau"
    if source == "sslyze" or ftype in {"weak_protocol", "certificate_info"}:
        return "Protection des données"
    if source == "http_headers" or ftype in {"missing_header", "info_disclosure"}:
        return "Sécurité Web"
    if "auth" in ftype or "access" in ftype:
        return "Gestion des accès"
    return "Configuration"


def compute_score(scan_json: dict[str, Any]) -> dict[str, Any]:
    categories = {
        "Configuration": 100.0,
        "Exposition réseau": 100.0,
        "Sécurité Web": 100.0,
        "Gestion des accès": 100.0,
        "Protection des données": 100.0,
    }

    for finding in _iter_findings(scan_json):
        if finding.get("type") in {"tool_unavailable", "timeout", "error"}:
            continue
        severity = (finding.get("severity") or "info").lower()
        penalty = SEVERITY_PENALTY.get(severity, 0)
        category = _category_for(finding)
        categories[category] = max(0.0, categories[category] - penalty)

    # Bonus: beaucoup de sous-domaines = surface plus large.
    amass = scan_json.get("amass") or []
    subdomain_count = sum(1 for f in amass if isinstance(f, dict) and f.get("type") == "subdomain")
    if subdomain_count > 20:
        categories["Exposition réseau"] = max(0.0, categories["Exposition réseau"] - 10)
    elif subdomain_count > 10:
        categories["Exposition réseau"] = max(0.0, categories["Exposition réseau"] - 5)

    global_score = round(sum(categories.values()) / len(categories), 1)
    if global_score >= 80:
        risk = "Faible"
    elif global_score >= 50:
        risk = "Moyen"
    else:
        risk = "Élevé"

    return {
        "global_score": global_score,
        "risk_level": risk,
        "categories": {k: round(v, 1) for k, v in categories.items()},
    }
