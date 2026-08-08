"""Analyse SSL/TLS via sslyze (ou fallback contrôlé si indisponible)."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse


def _hostname_from_target(target: str) -> str:
    if "://" in target:
        return urlparse(target).hostname or target
    return target.split(":")[0]


def analyze_ssl(hostname_or_url: str, port: int = 443) -> dict[str, Any]:
    """
    Analyse le certificat et les protocoles TLS acceptés.

    Retourne `{ "findings": [...], "hostname": "..." }`.
    """
    hostname = _hostname_from_target(hostname_or_url)
    findings: list[dict[str, Any]] = []

    try:
        from sslyze import (
            Scanner,
            ServerNetworkLocation,
            ServerScanRequest,
            ScanCommand,
        )
    except ImportError:
        return {
            "hostname": hostname,
            "findings": [
                {
                    "type": "tool_unavailable",
                    "tool": "sslyze",
                    "severity": "info",
                    "message": "sslyze n'est pas installé dans l'environnement Python.",
                }
            ],
        }

    try:
        server_location = ServerNetworkLocation(hostname=hostname, port=port)
        scanner = Scanner()
        scan_request = ServerScanRequest(
            server_location=server_location,
            scan_commands={
                ScanCommand.CERTIFICATE_INFO,
                ScanCommand.SSL_2_0_CIPHER_SUITES,
                ScanCommand.SSL_3_0_CIPHER_SUITES,
                ScanCommand.TLS_1_0_CIPHER_SUITES,
                ScanCommand.TLS_1_1_CIPHER_SUITES,
                ScanCommand.TLS_1_2_CIPHER_SUITES,
                ScanCommand.TLS_1_3_CIPHER_SUITES,
            },
        )
        scanner.queue_scans([scan_request])

        for result in scanner.get_results():
            if result.scan_result is None:
                findings.append(
                    {
                        "type": "error",
                        "tool": "sslyze",
                        "severity": "medium",
                        "message": f"Impossible d'analyser {hostname}:{port}",
                    }
                )
                continue

            # Certificat
            cert_attempt = result.scan_result.certificate_info
            if cert_attempt and cert_attempt.status.name == "COMPLETED":
                cert_result = cert_attempt.result
                for dep in cert_result.certificate_deployments:
                    leaf = dep.received_certificate_chain[0]
                    not_after = leaf.not_valid_after
                    findings.append(
                        {
                            "type": "certificate_info",
                            "severity": "info",
                            "title": "Certificat SSL/TLS",
                            "subject": str(leaf.subject),
                            "not_valid_after": not_after.isoformat(),
                            "source": "sslyze",
                        }
                    )

            # Protocoles obsolètes
            for cmd_name, attr in [
                ("SSLv2", "ssl_2_0_cipher_suites"),
                ("SSLv3", "ssl_3_0_cipher_suites"),
                ("TLS 1.0", "tls_1_0_cipher_suites"),
                ("TLS 1.1", "tls_1_1_cipher_suites"),
            ]:
                attempt = getattr(result.scan_result, attr, None)
                if attempt and attempt.status.name == "COMPLETED":
                    accepted = attempt.result.accepted_cipher_suites
                    if accepted:
                        findings.append(
                            {
                                "type": "weak_protocol",
                                "severity": "high",
                                "title": f"Protocole obsolète accepté : {cmd_name}",
                                "risk": (
                                    f"Le serveur accepte encore {cmd_name}, "
                                    "ce qui affaiblit le chiffrement des communications."
                                ),
                                "source": "sslyze",
                            }
                        )
    except Exception as exc:  # noqa: BLE001
        findings.append(
            {
                "type": "error",
                "tool": "sslyze",
                "severity": "medium",
                "message": str(exc),
            }
        )

    return {"hostname": hostname, "findings": findings}
