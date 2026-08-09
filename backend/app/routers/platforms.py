import secrets
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_id
from app.config import get_settings
from app.db import get_db, get_db_ro
from app.models import Platform
from app.schemas import PlatformCreate, PlatformOut
from scanners.ssrf_guard import UnsafeTargetError, assert_public_host

router = APIRouter(prefix="/platforms", tags=["platforms"])
settings = get_settings()

VERIFICATION_PATH = "/.well-known/dede-verification.txt"


@router.get("", response_model=list[PlatformOut])
async def list_platforms(
    db: AsyncSession = Depends(get_db_ro),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(select(Platform).where(Platform.owner_id == user_id))
    return list(result.scalars().all())


@router.post("", response_model=PlatformOut, status_code=status.HTTP_201_CREATED)
async def create_platform(
    payload: PlatformCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    domain = payload.domain.lower().strip()
    try:
        assert_public_host(domain)
    except UnsafeTargetError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    platform = Platform(
        owner_id=user_id,
        name=payload.name,
        domain=domain,
        url=payload.url.strip(),
        verification_status="pending",
        verification_token=secrets.token_urlsafe(16),
    )
    db.add(platform)
    await db.commit()
    await db.refresh(platform)
    return platform


@router.post("/{platform_id}/verify", response_model=PlatformOut)
async def verify_platform(
    platform_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user_id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")

    if platform.verification_status == "verified":
        return platform

    if settings.allow_dev_auto_verify:
        # Bascule de démo locale uniquement (voir ALLOW_DEV_AUTO_VERIFY).
        platform.verification_status = "verified"
        await db.commit()
        await db.refresh(platform)
        return platform

    try:
        assert_public_host(platform.domain)
    except UnsafeTargetError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    check_url = f"https://{platform.domain}{VERIFICATION_PATH}"
    body = None
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(check_url)
            if response.status_code < 400:
                body = response.text
    except httpx.HTTPError:
        body = None

    if body is None:
        # Retente en HTTP simple si le HTTPS n'est pas disponible sur le domaine.
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                response = await client.get(f"http://{platform.domain}{VERIFICATION_PATH}")
                if response.status_code < 400:
                    body = response.text
        except httpx.HTTPError:
            body = None

    if body is None or platform.verification_token not in body:
        raise HTTPException(
            status_code=400,
            detail=(
                "Preuve de propriété introuvable. Déposez un fichier accessible à "
                f"https://{platform.domain}{VERIFICATION_PATH} contenant exactement : "
                f"{platform.verification_token}"
            ),
        )

    platform.verification_status = "verified"
    await db.commit()
    await db.refresh(platform)
    return platform
