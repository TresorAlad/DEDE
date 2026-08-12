from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/dede"
    redis_url: str = "redis://127.0.0.1:6379/0"
    mistral_api_key: str = ""
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    # Session utilisateur : expiration après N minutes d'inactivité.
    # Le middleware prolonge le jeton à chaque requête authentifiée (fenêtre glissante).
    access_token_expire_minutes: int = 15
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Profil d'exécution. L'auto-vérification n'est autorisée qu'en development.
    environment: str = "production"
    # Bascule de démo locale uniquement : valider une plateforme sans preuve.
    # Ignorée si environment != development.
    allow_dev_auto_verify: bool = False
    # Emails de l'équipe ƉEƉE autorisés à contourner la preuve de propriété.
    team_ownership_bypass_emails: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment.strip().lower() in {"development", "dev", "local"}

    @property
    def team_bypass_email_set(self) -> set[str]:
        return {
            email.strip().lower()
            for email in self.team_ownership_bypass_emails.split(",")
            if email.strip()
        }

    @property
    def auto_verify_enabled(self) -> bool:
        """Auto-vérification de propriété : strictement réservée au développement local."""
        return self.is_development and self.allow_dev_auto_verify


@lru_cache
def get_settings() -> Settings:
    return Settings()
