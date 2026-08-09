"""Garde-fou anti-SSRF.

Un outil d'audit qui accepte un domaine fourni par l'utilisateur et va ensuite
faire des requêtes HTTP / lancer des scans vers ce domaine est, par nature,
un vecteur SSRF classique : rien n'empêche un utilisateur malveillant de
déclarer "domaine" = une IP privée, `localhost`, ou l'endpoint de métadonnées
cloud (169.254.169.254) pour faire scanner le réseau interne par le serveur.

Ce module centralise la validation : avant toute connexion sortante vers une
cible fournie par l'utilisateur, on résout le nom d'hôte et on vérifie que
*toutes* les adresses IP obtenues sont publiques et routables.

Limite connue : il reste une fenêtre TOCTOU (DNS rebinding) entre la
vérification et la connexion réelle faite par des binaires externes (Amass,
Nuclei) que nous ne contrôlons pas au niveau socket. On limite ce risque en
revalidant juste avant chaque appel. Pour les requêtes HTTP internes
(`http_headers.py`), `safe_get` revalide aussi chaque redirection.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
}

ALLOWED_SCHEMES = {"http", "https"}
MAX_REDIRECTS = 5


class UnsafeTargetError(ValueError):
    """Levée quand une cible ne peut pas être auditée en sécurité (privée, interne, invalide)."""


def _is_unsafe_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def assert_public_host(hostname: str) -> None:
    """Résout `hostname` et lève UnsafeTargetError si une IP obtenue n'est pas publique."""
    host = (hostname or "").strip().lower().rstrip(".")
    if not host:
        raise UnsafeTargetError("Nom d'hôte vide.")
    if host in BLOCKED_HOSTNAMES:
        raise UnsafeTargetError(f"Cible non autorisée : {host}")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise UnsafeTargetError(f"Impossible de résoudre {host} : {exc}") from exc

    for info in infos:
        ip_str = info[4][0]
        if _is_unsafe_ip(ip_str):
            raise UnsafeTargetError(
                f"{host} résout vers une adresse non publique ({ip_str}). Cible refusée."
            )


def assert_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise UnsafeTargetError(f"Schéma non autorisé : {parsed.scheme or '(vide)'}")
    assert_public_host(parsed.hostname or "")


def safe_get(url: str, timeout: int = 10):
    """GET protégé contre le SSRF : valide l'hôte de l'URL et de chaque redirection.

    Les redirections sont suivies manuellement (au lieu de allow_redirects=True)
    pour empêcher qu'une cible publique redirige vers une adresse interne.
    """
    import requests

    current_url = url
    with requests.Session() as session:
        for _ in range(MAX_REDIRECTS):
            assert_public_url(current_url)
            response = session.get(current_url, timeout=timeout, allow_redirects=False)
            if response.is_redirect or response.is_permanent_redirect:
                location = response.headers.get("Location")
                if not location:
                    return response
                current_url = urljoin(current_url, location)
                continue
            return response
    raise UnsafeTargetError("Trop de redirections.")
