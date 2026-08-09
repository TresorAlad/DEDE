import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import jwt
from sqlalchemy import text

from app.auth import create_access_token
from app.config import get_settings
from app.db import Base, engine
from app.routers import audits, auth, chatbot, platforms, reports


async def _db_keepalive(interval: int = 60) -> None:
    """Ping périodique pour empêcher la mise en veille du compute Neon (offre
    serverless) et garder au moins une connexion du pool chaude. Sans cela, la
    première requête après une pause paie un cold start de plusieurs secondes."""
    while True:
        try:
            await asyncio.sleep(interval)
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            continue


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create tables on startup for MVP simplicity.
    # TODO: replace with Alembic migrations before production.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Colonne ajoutée après le MVP initial : create_all ne fait pas d'ALTER.
            await conn.execute(
                text(
                    "ALTER TABLE audits ADD COLUMN IF NOT EXISTS progress_json JSONB"
                )
            )
    except Exception as exc:  # noqa: BLE001
        # Permet de démarrer l'API en local même si Neon n'est pas encore configuré.
        print(f"[DEDE] Avertissement DB au démarrage: {exc}")

    keepalive_task = None
    if os.getenv("DB_KEEPALIVE", "true").lower() in ("1", "true", "yes"):
        keepalive_task = asyncio.create_task(_db_keepalive())

    yield

    if keepalive_task is not None:
        keepalive_task.cancel()


settings = get_settings()
app = FastAPI(
    title="DEDE API",
    description="API d'audit cybersécurité assisté par IA",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Access-Token"],
)


@app.middleware("http")
async def sliding_session(request: Request, call_next):
    """Prolonge la session à chaque requête authentifiée réussie.

    Tant que l'utilisateur est actif (requêtes API), le jeton est renouvelé
    pour ACCESS_TOKEN_EXPIRE_MINUTES. Sans activité, le jeton expire et la
    session est clôturée.
    """
    response = await call_next(request)
    if response.status_code >= 400:
        return response

    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return response

    token = auth[7:].strip()
    if not token:
        return response

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError:
        return response

    email = payload.get("sub")
    if not email:
        return response

    uid = payload.get("uid")
    response.headers["X-Access-Token"] = create_access_token(
        email,
        uid=uid if isinstance(uid, int) else None,
    )
    return response


app.include_router(auth.router)
app.include_router(platforms.router)
app.include_router(audits.router)
app.include_router(reports.router)
app.include_router(chatbot.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dede-api"}
