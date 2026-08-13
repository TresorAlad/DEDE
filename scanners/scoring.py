"""Calcul rigoureux du score de sécurité à partir du JSON unifié des scanners.

Principes de notation (volontairement stricts) :

1. Une catégorie qui n'a pas réellement pu être analysée n'est JAMAIS notée 100.
   Elle est marquée "non évaluée" (None) : on ne certifie pas ce qu'on n'a pas vérifié.
2. Tant qu'un risque est confirmé, le score est plafonné selon la sévérité la plus
   grave rencontrée. Le plafond s'applique d'abord à la catégorie qui porte la faille
   (une faille haute en « Sécurité Web » fait chuter cette catégorie), puis au score
   global. Ainsi la catégorie fautive explique visiblement le score global, au lieu
   de rester proche de 100 pendant que le global s'effondre.
3. Le score global est pondéré par le taux de couverture de l'audit : si seule une
   partie de la surface a pu être analysée, la note maximale atteignable baisse.
4. Les seuils de risque sont exigeants : "Faible" demande un score très élevé.
"""

from __future__ import annotations

from typing import Any

# Pénalités par occurrence de faille (cumulatives, volontairement sévères).
SEVERITY_PENALTY = {
    "critical": 45.0,
    "high": 28.0,
    "medium": 14.0,
    "low": 6.0,
    "info": 0.0,
}

# Plafond du score global selon la pire sévérité confirmée.
SEVERITY_CAP = {
    "critical": 35.0,
    "high": 55.0,
    "medium": 78.0,
    "low": 92.0,
}

SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"]

# Types de "findings" qui traduisent un échec d'analyse, pas une faille.
FAILURE_TYPES = {"tool_unavailable", "timeout", "error", "blocked_target"}

CATEGORIES = [
    "Configuration",
    "Exposition réseau",
    "Sécurité Web",
    "Gestion des accès",
    "Protection des données",
]

# Outil dont dépend l'évaluation de chaque catégorie.
CATEGORY_SOURCE = {
    "Configuration": "nuclei",
    "Gestion des accès": "nuclei",
    "Exposition réseau": "amass",
    "Sécurité Web": "headers",
    "Protection des données": "ssl",
}


def _tool_findings(scan_json: dict[str, Any], tool: str) -> list[dict[str, Any]]:
    if tool == "ssl":
        ssl = scan_json.get("ssl") or {}
        value = ssl.get("findings", []) if isinstance(ssl, dict) else []
    else:
        value = scan_json.get(tool) or []
    if not isinstance(value, list):
        return []
    return [f for f in value if isinstance(f, dict)]


def _is_failure(finding: dict[str, Any]) -> bool:
    return (finding.get("type") or "").lower() in FAILURE_TYPES


def _tool_succeeded(findings: list[dict[str, Any]]) -> bool:
    """Un outil est considéré exploitable s'il a produit au moins un résultat réel,
    ou s'il s'est exécuté sans rien trouver. Il est en échec si tous ses retours
    sont des erreurs / timeouts / indisponibilités."""
    if not findings:
        return True
    return any(not _is_failure(f) for f in findings)


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


def _worst_severity(current: str | None, candidate: str) -> str | None:
    if candidate not in SEVERITY_ORDER or candidate == "info":
        return current
    if current is None:
        return candidate
    return candidate if SEVERITY_ORDER.index(candidate) > SEVERITY_ORDER.index(current) else current


def compute_score(scan_json: dict[str, Any]) -> dict[str, Any]:
    targets = scan_json.get("targets_scanned")
    globally_blocked = isinstance(targets, list) and not targets

    tools = ("amass", "nuclei", "headers", "ssl")
    findings_by_tool = {tool: _tool_findings(scan_json, tool) for tool in tools}
    tool_ok = {
        tool: (not globally_blocked) and _tool_succeeded(items)
        for tool, items in findings_by_tool.items()
    }

    # Sonde de disponibilité : le module en-têtes tente une vraie connexion
    # HTTP(S). S'il échoue, la cible web est injoignable et un résultat nuclei
    # vide ne prouve rien (« 0 vulnérabilité » != « site sûr »). On refuse alors
    # de créditer les catégories dépendant du HTTP pour rester honnête.
    http_reachable = tool_ok.get("headers", False)
    nuclei_has_real = any(not _is_failure(f) for f in findings_by_tool["nuclei"])
    target_unreachable = (not globally_blocked) and (not http_reachable) and (not nuclei_has_real)
    if target_unreachable:
        tool_ok["nuclei"] = False

    # Une catégorie démarre à 100 uniquement si son outil a pu travailler.
    scores: dict[str, float | None] = {
        category: (100.0 if tool_ok.get(CATEGORY_SOURCE[category], False) else None)
        for category in CATEGORIES
    }

    worst_severity: str | None = None
    # Pire sévérité rencontrée dans chaque catégorie, pour lui appliquer le
    # même plafond que le score global.
    category_worst: dict[str, str | None] = {category: None for category in CATEGORIES}
    counts = {level: 0 for level in SEVERITY_ORDER}

    for items in findings_by_tool.values():
        for finding in items:
            if _is_failure(finding):
                continue
            severity = str(finding.get("severity") or "info").lower()
            counts[severity] = counts.get(severity, 0) + 1
            worst_severity = _worst_severity(worst_severity, severity)

            category = _category_for(finding)
            if category not in scores:
                continue
            # Un résultat exploitable prouve que la catégorie a bien été analysée.
            if scores[category] is None:
                scores[category] = 100.0
            scores[category] = max(0.0, scores[category] - SEVERITY_PENALTY.get(severity, 0.0))
            category_worst[category] = _worst_severity(category_worst[category], severity)

    # Une surface d'exposition large est un risque en soi.
    subdomains = sum(
        1 for f in findings_by_tool["amass"] if f.get("type") == "subdomain"
    )
    if scores.get("Exposition réseau") is not None:
        if subdomains > 20:
            scores["Exposition réseau"] = max(0.0, scores["Exposition réseau"] - 15)
        elif subdomains > 10:
            scores["Exposition réseau"] = max(0.0, scores["Exposition réseau"] - 8)

    # Plafond de sévérité appliqué à la catégorie porteuse de la faille : une
    # catégorie où subsiste un risque grave ne peut pas afficher un bon score,
    # exactement comme le global. La catégorie fautive rejoint ainsi le niveau du
    # score global au lieu de le contredire.
    for category, value in scores.items():
        if value is None:
            continue
        worst = category_worst.get(category)
        if worst:
            scores[category] = min(value, SEVERITY_CAP.get(worst, 100.0))

    assessed = [value for value in scores.values() if value is not None]
    coverage = len(assessed) / len(CATEGORIES)

    if not assessed:
        return {
            "global_score": 0.0,
            "risk_level": "Indéterminé",
            "categories": {category: None for category in CATEGORIES},
            "coverage": 0.0,
            "findings_count": counts,
            "note": (
                "Aucune analyse exploitable n'a pu être réalisée : cible injoignable "
                "ou outils indisponibles. Le score ne peut pas être calculé."
            ),
        }

    global_score = sum(assessed) / len(assessed)

    # Plafond lié à la pire faille confirmée : pas de 100 % tant qu'un risque existe.
    if worst_severity:
        global_score = min(global_score, SEVERITY_CAP.get(worst_severity, 100.0))

    # On ne peut pas garantir ce qui n'a pas été vérifié.
    global_score *= coverage
    global_score = round(max(0.0, min(100.0, global_score)), 1)

    if global_score >= 90:
        risk = "Faible"
    elif global_score >= 75:
        risk = "Modéré"
    elif global_score >= 50:
        risk = "Élevé"
    else:
        risk = "Critique"

    result: dict[str, Any] = {
        "global_score": global_score,
        "risk_level": risk,
        "categories": {
            category: (round(value, 1) if value is not None else None)
            for category, value in scores.items()
        },
        "coverage": round(coverage, 2),
        "findings_count": counts,
    }

    if 0 < coverage < 0.5:
        assessed_labels = [name for name, value in scores.items() if value is not None]
        result["note"] = (
            f"Audit partiel ({len(assessed)}/{len(CATEGORIES)} catégories évaluées : "
            f"{', '.join(assessed_labels)}). "
            "Les autres catégories restent non évaluées car les outils associés n'ont pas "
            "pu joindre la cible ou ont échoué."
        )
    if target_unreachable:
        result["note"] = (
            "La cible web n'a pas répondu (connexion HTTP(S) impossible) : "
            "seules les vérifications ne dépendant pas d'une connexion applicative "
            "ont pu être menées. Vérifiez que le site est bien en ligne et accessible, "
            "puis relancez l'audit."
        )
    return result
