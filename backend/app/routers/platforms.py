import secrets
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_id
from app.config import get_settings
from app.db import get_db, get_db_ro
from app.models import Audit, Platform, ScanResult, Score
from app.schemas import PlatformCreate, PlatformOut, PlatformUpdate
from scanners.ssrf_guard import (
    UnresolvableTargetError,
    UnsafeTargetError,
    assert_public_host,
)

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
        # La résolution DNS est bloquante : on la sort de la boucle d'événements.
        await run_in_threadpool(assert_public_host, domain)
    except UnresolvableTargetError:
        # Un domaine momentanément irrésoluble n'est pas une cible dangereuse :
        # on autorise l'enregistrement. La cible est revalidée avant la
        # vérification de propriété et avant chaque audit.
        pass
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


async def _get_owned_platform(
    db: AsyncSession, platform_id: int, user_id: int
) -> Platform:
    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user_id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")
    return platform


@router.patch("/{platform_id}", response_model=PlatformOut)
async def update_platform(
    platform_id: int,
    payload: PlatformUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    platform = await _get_owned_platform(db, platform_id, user_id)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Aucune modification fournie.")

    new_name = data.get("name")
    new_domain = data.get("domain")
    new_url = data.get("url")

    if new_domain is not None:
        domain = new_domain.lower().strip()
        try:
            await run_in_threadpool(assert_public_host, domain)
        except UnresolvableTargetError:
            pass
        except UnsafeTargetError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if domain != platform.domain:
            platform.domain = domain
            # Changement de domaine : la preuve de propriété n'est plus valable.
            platform.verification_status = "pending"
            platform.verification_token = secrets.token_urlsafe(16)

    if new_url is not None:
        url = new_url.strip()
        if url != platform.url:
            platform.url = url
            # Une nouvelle URL cible doit aussi être revalidée.
            if platform.verification_status == "verified":
                platform.verification_status = "pending"
                platform.verification_token = (
                    platform.verification_token or secrets.token_urlsafe(16)
                )

    if new_name is not None:
        platform.name = new_name.strip()

    await db.commit()
    await db.refresh(platform)
    return platform


@router.delete("/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platform(
    platform_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    platform = await _get_owned_platform(db, platform_id, user_id)

    audits_result = await db.execute(
        select(Audit).where(Audit.platform_id == platform.id)
    )
    audits = list(audits_result.scalars().all())
    audit_ids = [a.id for a in audits]

    if audit_ids:
        for model in (ScanResult, Score):
            rows = await db.execute(select(model).where(model.audit_id.in_(audit_ids)))
            for row in rows.scalars().all():
                await db.delete(row)
        for audit in audits:
            await db.delete(audit)

    await db.delete(platform)
    await db.commit()
    return None


@router.post("/{platform_id}/verify", response_model=PlatformOut)
async def verify_platform(
    platform_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    platform = await _get_owned_platform(db, platform_id, user_id)

    if platform.verification_status == "verified":
        return platform

    if settings.allow_dev_auto_verify:
        # Bascule de démo locale uniquement (voir ALLOW_DEV_AUTO_VERIFY).
        platform.verification_status = "verified"
        await db.commit()
        await db.refresh(platform)
        return platform

    try:
        await run_in_threadpool(assert_public_host, platform.domain)
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
