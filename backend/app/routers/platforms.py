import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models import Platform, User
from app.schemas import PlatformCreate, PlatformOut

router = APIRouter(prefix="/platforms", tags=["platforms"])


@router.get("", response_model=list[PlatformOut])
async def list_platforms(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Platform).where(Platform.owner_id == user.id))
    return list(result.scalars().all())


@router.post("", response_model=PlatformOut, status_code=status.HTTP_201_CREATED)
async def create_platform(
    payload: PlatformCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    platform = Platform(
        owner_id=user.id,
        name=payload.name,
        domain=payload.domain.lower().strip(),
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
    user: User = Depends(get_current_user),
):
    # TODO: vérifier réellement un enregistrement DNS TXT ou un fichier déposé.
    # Pour le MVP hackathon, on marque la plateforme comme vérifiée côté propriétaire.
    result = await db.execute(
        select(Platform).where(Platform.id == platform_id, Platform.owner_id == user.id)
    )
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=404, detail="Plateforme introuvable")
    platform.verification_status = "verified"
    await db.commit()
    await db.refresh(platform)
    return platform
