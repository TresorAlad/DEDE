"""Wrapper Amass (mode actif / intrusif) pour la découverte de sous-domaines."""

from __future__ import annotations

import os
import signal
import subprocess
from pathlib import Path
from typing import Any

from scanners.tools import find_binary

AMASS_DIR = Path(__file__).resolve().parent / "amass"
AMASS_ENV = AMASS_DIR / ".env"
AMASS_DATASOURCES = AMASS_DIR / "datasources.yaml"


def _load_amass_env() -> dict[str, str]:
    """Charge scanners/amass/.env (source unique des clés API)."""
    values: dict[str, str] = {}
    if not AMASS_ENV.exists():
        return values
    for raw in AMASS_ENV.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip().lower()] = value.strip().strip("\"'")
    return values


def sync_datasources_from_env() -> Path | None:
    """Écrit datasources.yaml à partir de .env pour qu'Amass utilise les clés."""
    env = _load_amass_env()
    if not env:
        return AMASS_DATASOURCES if AMASS_DATASOURCES.exists() else None

    blocks: list[str] = [
        "# Généré automatiquement depuis scanners/amass/.env - ne pas committer.",
        "global_options:",
        "  minimum_ttl: 1440",
        "",
        "datasources:",
    ]

    mapping = [
        ("virustotal_api_key", "VirusTotal", 10080, "account"),
        ("otx_api_key", "AlienVault", None, "account"),
        ("urlscan_api_key", "URLScan", None, "account"),
        ("github_token", "GitHub", 4320, "accountname"),
        ("securitytrails_api_key", "SecurityTrails", 1440, "account"),
        ("shodan_api_key", "Shodan", 10080, "account"),
    ]

    added = 0
    for env_key, source_name, ttl, cred_name in mapping:
        api_key = env.get(env_key)
        if not api_key or api_key.startswith("REMAPLACER"):
            continue
        added += 1
        blocks.append(f"  - name: {source_name}")
        if ttl is not None:
            blocks.append(f"    ttl: {ttl}")
        blocks.append("    creds:")
        blocks.append(f"      {cred_name}:")
        blocks.append(f"        apikey: {api_key}")
        blocks.append("")

    if added == 0:
        return AMASS_DATASOURCES if AMASS_DATASOURCES.exists() else None

    AMASS_DIR.mkdir(parents=True, exist_ok=True)
    content = "\n".join(blocks).rstrip() + "\n"
    AMASS_DATASOURCES.write_text(content, encoding="utf-8")

    # Amass lit aussi la config utilisateur par défaut.
    user_cfg = Path.home() / ".config" / "amass"
    try:
        user_cfg.mkdir(parents=True, exist_ok=True)
        (user_cfg / "datasources.yaml").write_text(content, encoding="utf-8")
    except OSError:
        pass

    return AMASS_DATASOURCES


def _hosts_to_findings(stdout: str, domain: str) -> list[dict[str, Any]]:
    """Transforme la sortie amass en findings de sous-domaines dédupliqués."""
    hosts = set()
    for line in (stdout or "").splitlines():
        host = line.strip().lower()
        # amass -passive imprime un hôte par ligne ; on garde ce qui ressemble
        # à un sous-domaine du domaine ciblé.
        if host and (host == domain or host.endswith("." + domain)):
            hosts.add(host)
    return [
        {
            "type": "subdomain",
            "host": host,
            "severity": "info",
            "source": "amass",
        }
        for host in sorted(hosts)
    ]


def run_amass(domain: str, timeout: int = 180) -> list[dict[str, Any]]:
    """
    Lance Amass en mode **actif / intrusif** :
    - requêtes DNS actives
    - brute-force de sous-domaines
    - alterations de noms découverts

    Les clés API (VirusTotal, OTX, URLScan, GitHub, etc.) restent utilisées
    en complément pour enrichir la surface.
    """
    binary = find_binary("amass")
    if binary is None:
        return [
            {
                "type": "tool_unavailable",
                "tool": "amass",
                "severity": "info",
                "message": "Amass n'est pas installé sur cette machine.",
            }
        ]

    sync_datasources_from_env()
    engine_pids_before = _amass_engine_pids()

    wordlist = Path(__file__).resolve().parent / "data" / "subdomains-top5000.txt"
    alterations = AMASS_DIR / "alterations.txt"

    cmd = [
        binary,
        "enum",
        "-active",
        "-brute",
        "-alts",
        "-d",
        domain,
        "-timeout",
        "5",
        "-nocolor",
    ]
    if wordlist.is_file():
        cmd.extend(["-w", str(wordlist)])
    if alterations.is_file():
        cmd.extend(["-aw", str(alterations)])
    # Oriente Amass vers le dossier projet (sortie + config locale si présente).
    if AMASS_DIR.is_dir():
        cmd.extend(["-dir", str(AMASS_DIR)])

    # amass v4 lance un sous-processus « engine » qui survit si on ne tue que le
    # processus direct : on l'isole dans son propre groupe de processus pour
    # pouvoir terminer tout l'arbre en cas de timeout et éviter les orphelins.
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
    except OSError as exc:
        return [
            {
                "type": "error",
                "tool": "amass",
                "severity": "medium",
                "message": str(exc),
            }
        ]

    timed_out = False
    try:
        stdout, stderr = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        _kill_process_group(proc)
        stdout, stderr = proc.communicate()
    finally:
        _stop_new_amass_engines(engine_pids_before)

    if timed_out:
        partial = _hosts_to_findings(stdout, domain)
        if partial:
            return partial
        return [
            {
                "type": "timeout",
                "tool": "amass",
                "severity": "medium",
                "message": f"Amass a dépassé le délai de {timeout}s.",
            }
        ]

    findings = _hosts_to_findings(stdout, domain)

    if proc.returncode != 0 and not findings:
        return [
            {
                "type": "error",
                "tool": "amass",
                "severity": "medium",
                "message": (stderr or "").strip() or "Amass a échoué sans sortie.",
            }
        ]

    return findings


def _amass_engine_pids() -> set[int]:
    """Retourne les PID des moteurs Amass présents sur la machine."""
    pids: set[int] = set()
    try:
        entries = os.listdir("/proc")
    except OSError:
        return pids
    for entry in entries:
        if not entry.isdigit():
            continue
        try:
            with open(f"/proc/{entry}/cmdline", "rb") as cmdline_file:
                command = cmdline_file.read().replace(b"\x00", b" ").decode(
                    errors="ignore"
                )
        except OSError:
            continue
        if command.endswith("amass engine ") or "/amass engine " in command:
            pids.add(int(entry))
    return pids


def _stop_new_amass_engines(previous_pids: set[int]) -> None:
    """Arrête uniquement les moteurs créés par l'appel courant."""
    for pid in _amass_engine_pids() - previous_pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            continue


def _kill_process_group(proc: subprocess.Popen) -> None:
    """Termine tout l'arbre de processus (amass + engine) via son groupe."""
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        return
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass
