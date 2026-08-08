from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    organization_name: str
    email: EmailStr

    model_config = {"from_attributes": True}


class PlatformCreate(BaseModel):
    name: str
    domain: str
    url: str


class PlatformOut(BaseModel):
    id: int
    name: str
    domain: str
    url: str
    verification_status: str

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
    summary: str | None = None
    findings: list[Any] = []
    recommendations: list[Any] = []
    plan_correction: list[Any] = []


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
