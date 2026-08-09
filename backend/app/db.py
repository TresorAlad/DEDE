from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


settings = get_settings()
# Neon (serverless) coupe les connexions inactives. `pool_pre_ping` réglait le
# problème mais ajoutait un aller-retour réseau (SELECT 1) AVANT chaque requête,
# ce qui, vers une base distante, doublait la latence perçue.
#
# On le remplace par `pool_recycle` court (180 s) : toute connexion plus vieille
# que 180 s est recyclée au checkout. Cela couvre à la fois l'API (inactive
# entre deux requêtes) et le worker (inactif pendant un scan de plusieurs
# minutes), sans le coût d'un ping à chaque requête.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_recycle=180,
    pool_size=10,
    max_overflow=20,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Moteur en AUTOCOMMIT (même pool de connexions) pour les endpoints en lecture
# seule : évite les allers-retours réseau BEGIN + ROLLBACK émis par défaut
# autour de chaque requête, ce qui divise ~par deux la latence des GET.
read_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
ReadSessionLocal = async_sessionmaker(read_engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def get_db_ro() -> AsyncGenerator[AsyncSession, None]:
    """Session en lecture seule (AUTOCOMMIT) pour les endpoints GET."""
    async with ReadSessionLocal() as session:
        yield session
