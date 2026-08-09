"""Découverte de sous-domaines multi-sources (mode intrusif) pour l'audit ƉEƉE.

Combine sources OSINT et techniques actives pour remonter aussi les noms
personnalisés :

1. Amass actif (DNS actif + brute + alterations)
2. Certificate Transparency (crt.sh, Cert Spotter)
3. Brute-force DNS large (wordlist complète)
4. Permutations des noms déjà découverts (dev-, staging-, -api, etc.)

Chaque candidat est validé par résolution DNS. Un audit n'est lancé que sur
des plateformes dont la propriété a été vérifiée.
"""

from __future__ import annotations

import json
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from uuid import uuid4

from scanners.amass_runner import run_amass

COMMON_SUBDOMAINS = [
    "www", "api", "app", "admin", "portal", "dashboard", "mail", "webmail",
    "smtp", "imap", "pop", "ns1", "ns2", "dev", "staging", "test", "preprod",
    "uat", "demo", "blog", "shop", "store", "cdn", "static", "assets", "media",
    "img", "images", "docs", "doc", "help", "support", "status", "vpn", "remote",
    "git", "gitlab", "jenkins", "ci", "grafana", "kibana", "monitor", "auth",
    "login", "sso", "account", "accounts", "m", "mobile", "beta", "internal",
    "intranet", "cpanel", "webdisk", "autodiscover", "secure", "payment", "pay",
    "send", "resend", "mx", "mx1", "mx2", "email", "mailer", "newsletter",
    "mailgun", "mg", "smtp2", "relay",
]

# Préfixes / suffixes pour permuter les noms découverts (ex. api -> staging-api).
PERMUTATION_AFFIXES = [
    "dev", "staging", "test", "prod", "uat", "qa", "beta", "old", "new",
    "v1", "v2", "api", "app", "admin", "internal", "secure", "backup",
]

CRTSH_TIMEOUT = 20
CRTSH_RETRIES = 2
CERTSPOTTER_TIMEOUT = 20
MAX_HOSTS = 100
DNS_RESOLVE_TIMEOUT = 1.0
DNS_WORKERS = 120
WORDLIST_MAX_NAMES = 5000
WORDLIST_PATH = Path(__file__).with_name("data") / "subdomains-top5000.txt"
_DNS_LOCAL = threading.local()


def _clean_host(name: str, domain: str) -> str | None:
    """Normalise un nom et le garde s'il appartient au domaine ciblé."""
    host = (name or "").strip().lower().lstrip("*.").rstrip(".")
    if not host or " " in host:
        return None
    if host == domain or host.endswith("." + domain):
        return host
    return None


def _from_amass(domain: str) -> set[str]:
    # Mode actif : Amass a besoin de davantage de temps (brute + alterations).
    hosts: set[str] = set()
    for finding in run_amass(domain, timeout=120):
        if finding.get("type") == "subdomain":
            cleaned = _clean_host(str(finding.get("host") or ""), domain)
            if cleaned:
                hosts.add(cleaned)
    return hosts


def _from_crtsh(domain: str) -> set[str]:
    """Interroge crt.sh (Certificate Transparency). Tolérant aux erreurs 5xx."""
    import requests

    hosts: set[str] = set()
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    for _ in range(CRTSH_RETRIES):
        try:
            resp = requests.get(url, timeout=CRTSH_TIMEOUT)
        except requests.RequestException:
            continue
        if resp.status_code != 200 or not resp.text.strip():
            continue
        try:
            data = json.loads(resp.text)
        except json.JSONDecodeError:
            continue
        for entry in data:
            for name in str(entry.get("name_value") or "").splitlines():
                cleaned = _clean_host(name, domain)
                if cleaned:
                    hosts.add(cleaned)
        break
    return hosts


def _from_certspotter(domain: str) -> set[str]:
    """Interroge Cert Spotter lorsque crt.sh est indisponible ou incomplet."""
    import requests

    url = (
        "https://api.certspotter.com/v1/issuances"
        f"?domain={domain}&include_subdomains=true&expand=dns_names"
    )
    try:
        resp = requests.get(url, timeout=CERTSPOTTER_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError):
        return set()

    hosts: set[str] = set()
    for entry in data:
        for name in entry.get("dns_names") or []:
            cleaned = _clean_host(str(name), domain)
            if cleaned:
                hosts.add(cleaned)
    return hosts


def _dns_candidates(domain: str) -> set[str]:
    labels = set(COMMON_SUBDOMAINS)
    try:
        lines = WORDLIST_PATH.read_text(encoding="utf-8").splitlines()
        for line in lines[:WORDLIST_MAX_NAMES]:
            label = line.strip().lower()
            if label and not label.startswith("#"):
                labels.add(label)
    except OSError:
        pass
    return {f"{label}.{domain}" for label in labels}


def _permutation_candidates(known_hosts: set[str], domain: str) -> set[str]:
    """Génère des variantes autour des sous-domaines déjà trouvés."""
    candidates: set[str] = set()
    suffix = "." + domain
    for host in known_hosts:
        if host == domain or not host.endswith(suffix):
            continue
        label = host[: -len(suffix)]
        if not label or "." in label:
            # On ne permute que le premier niveau pour limiter l'explosion.
            continue
        for affix in PERMUTATION_AFFIXES:
            candidates.add(f"{affix}-{label}.{domain}")
            candidates.add(f"{label}-{affix}.{domain}")
            candidates.add(f"{affix}{label}.{domain}")
            candidates.add(f"{label}{affix}.{domain}")
            candidates.add(f"{affix}.{label}.{domain}")
    return candidates


def _has_wildcard_dns(domain: str) -> bool:
    """Détecte un wildcard DNS pour éviter des milliers de faux positifs."""
    probes = [f"dede-{uuid4().hex}.{domain}" for _ in range(2)]
    return all(_resolves(host) for host in probes)


def _get_resolver():
    import dns.resolver

    resolver = getattr(_DNS_LOCAL, "resolver", None)
    if resolver is None:
        resolver = dns.resolver.Resolver(configure=True)
        resolver.timeout = 0.5
        resolver.lifetime = DNS_RESOLVE_TIMEOUT
        _DNS_LOCAL.resolver = resolver
    return resolver


def _resolves(host: str) -> bool:
    """Vrai si l'hôte possède un enregistrement A ou AAAA (hôte web/joignable)."""
    import dns.exception

    resolver = _get_resolver()
    try:
        resolver.resolve(host, "A", search=False)
        return True
    except dns.exception.DNSException:
        pass
    try:
        resolver.resolve(host, "AAAA", search=False)
        return True
    except dns.exception.DNSException:
        return False


def _classify(host: str) -> str | None:
    """Classe un hôte : 'web' (A/AAAA/CNAME), 'mail' (MX seul) ou None (inexistant)."""
    import dns.exception
    import dns.resolver

    resolver = _get_resolver()
    for record_type in ("A", "AAAA", "CNAME"):
        try:
            resolver.resolve(host, record_type, search=False)
            return "web"
        except dns.resolver.NoAnswer:
            continue
        except dns.resolver.NXDOMAIN:
            return None
        except dns.exception.DNSException:
            continue
    try:
        resolver.resolve(host, "MX", search=False)
        return "mail"
    except dns.exception.DNSException:
        return None


def _resolved_hosts(candidates: set[str], workers: int) -> set[str]:
    ordered = sorted(candidates)
    if not ordered:
        return set()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        flags = list(pool.map(_resolves, ordered))
    return {host for host, ok in zip(ordered, flags) if ok}


def _classified_hosts(candidates: set[str], workers: int) -> dict[str, str]:
    ordered = sorted(candidates)
    if not ordered:
        return {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        kinds = list(pool.map(_classify, ordered))
    return {host: kind for host, kind in zip(ordered, kinds) if kind}


def discover_subdomains(domain: str) -> list[dict[str, Any]]:
    """Découvre et valide les sous-domaines du domaine ciblé (mode intrusif)."""
    domain = (domain or "").strip().lower().rstrip(".")
    if not domain:
        return []

    passive_candidates: set[str] = {domain}
    with ThreadPoolExecutor(max_workers=3) as sources_pool:
        source_results = sources_pool.map(
            lambda source: source(domain),
            (_from_crtsh, _from_certspotter, _from_amass),
        )
        for discovered in source_results:
            passive_candidates |= discovered

    common = {f"{label}.{domain}" for label in COMMON_SUBDOMAINS}
    kinds = _classified_hosts(passive_candidates | common, workers=30)

    if not _has_wildcard_dns(domain):
        already = set(kinds) | passive_candidates | common
        brute_candidates = _dns_candidates(domain) - already
        for host in _resolved_hosts(brute_candidates, workers=DNS_WORKERS):
            kinds.setdefault(host, "web")

        # Permutations autour des noms déjà trouvés (noms custom proches).
        perm_candidates = _permutation_candidates(set(kinds) | passive_candidates, domain)
        perm_candidates -= set(kinds)
        for host in _resolved_hosts(perm_candidates, workers=DNS_WORKERS):
            kinds.setdefault(host, "web")

    hosts = sorted(kinds)[:MAX_HOSTS]

    if not hosts:
        return [
            {
                "type": "error",
                "tool": "amass",
                "severity": "medium",
                "message": (
                    f"Aucun enregistrement DNS trouvé pour {domain} : "
                    "le domaine n'existe pas ou son DNS est injoignable."
                ),
            }
        ]

    return [
        {
            "type": "subdomain",
            "host": host,
            "severity": "info",
            "source": "amass",
            "record": kinds[host],
            "web": kinds[host] == "web",
        }
        for host in hosts
    ]
