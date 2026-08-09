"""Résolution des binaires d'audit (Amass, Nuclei).

Se reposer uniquement sur le PATH rend l'audit fragile : selon la façon dont le
worker est lancé (service systemd, cron, conteneur), `~/go/bin` peut être absent
du PATH et un outil pourtant installé serait déclaré « indisponible ».

On cherche donc le binaire dans le PATH, puis dans les emplacements
d'installation habituels, et on renvoie un chemin absolu exploitable.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

# Emplacements d'installation courants (Go, paquets système, installations manuelles).
EXTRA_BIN_DIRS = [
    Path.home() / "go" / "bin",
    Path("/usr/local/go/bin"),
    Path("/usr/local/bin"),
    Path("/usr/bin"),
    Path("/opt/bin"),
    Path("/snap/bin"),
]


def find_binary(name: str) -> str | None:
    """Retourne le chemin absolu du binaire `name`, ou None s'il est introuvable."""
    found = shutil.which(name)
    if found:
        return found

    # Le PATH peut avoir été enrichi après l'import : on relit l'environnement.
    env_path = os.environ.get("PATH", "")
    for directory in env_path.split(os.pathsep):
        if not directory:
            continue
        candidate = Path(directory) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)

    for directory in EXTRA_BIN_DIRS:
        candidate = directory / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)

    return None
