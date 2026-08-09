from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    accepted_terms: bool

    @field_validator("accepted_terms")
    @classmethod
    def must_accept_terms(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Vous devez accepter les CGU et la politique de confidentialité pour créer un compte.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    organization_name: str
    full_name: str
    email: EmailStr

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


DOMAIN_RE = r"^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63}(?<!-))+$"


class PlatformCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    domain: str = Field(min_length=3, max_length=255)
    url: str = Field(min_length=3, max_length=512)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str) -> str:
        import re

        cleaned = value.strip().lower()
        if not re.match(DOMAIN_RE, cleaned):
            raise ValueError("Domaine invalide. Exemple attendu : exemple.com")
        return cleaned

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.lower().startswith(("http://", "https://")):
            raise ValueError("L'URL doit commencer par http:// ou https://")
        return cleaned


class PlatformUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    domain: str | None = Field(default=None, min_length=3, max_length=255)
    url: str | None = Field(default=None, min_length=3, max_length=512)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str | None) -> str | None:
        if value is None:
            return value
        import re

        cleaned = value.strip().lower()
        if not re.match(DOMAIN_RE, cleaned):
            raise ValueError("Domaine invalide. Exemple attendu : exemple.com")
        return cleaned

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned.lower().startswith(("http://", "https://")):
            raise ValueError("L'URL doit commencer par http:// ou https://")
        return cleaned


class PlatformOut(BaseModel):
    id: int
    name: str
    domain: str
    url: str
    verification_status: str
    verification_token: str | None = None

    model_config = {"from_attributes": True}


class AuditOut(BaseModel):
    id: int
    platform_id: int
    status: str
    score: float | None = None
    risk_level: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ReportOut(BaseModel):
    audit_id: int
    status: str
    score: float | None = None
    risk_level: str | None = None
    categories: dict[str, Any] = {}
    coverage: float | None = None
    note: str | None = None
    summary: str | None = None
    findings: list[Any] = []
    recommendations: list[Any] = []
    plan_correction: list[Any] = []
    surface_hosts: list[Any] = []
    progress: list[Any] = []
    created_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
