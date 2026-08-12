"""Privilèges équipe : bypass de la preuve de propriété.

En production, seuls les emails listés dans TEAM_OWNERSHIP_BYPASS_EMAILS
peuvent contourner la vérification. Les autres comptes doivent déposer
le fichier /.well-known/dede-verification.txt.
"""

from __future__ import annotations

from app.config import get_settings
from app.models import User


def email_is_team_member(email: str | None) -> bool:
    if not email:
        return False
    allowlist = get_settings().team_bypass_email_set
    if not allowlist:
        return False
    return email.strip().lower() in allowlist


def user_can_bypass_ownership(user: User) -> bool:
    """True uniquement pour un membre de l'équipe ƉEƉE configuré."""
    return email_is_team_member(getattr(user, "email", None))
