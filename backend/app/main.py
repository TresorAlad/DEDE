from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routers import audits, auth, chatbot, platforms, reports


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create tables on startup for MVP simplicity.
    # TODO: replace with Alembic migrations before production.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:  # noqa: BLE001
        # Permet de démarrer l'API en local même si Neon n'est pas encore configuré.
        print(f"[DEDE] Avertissement DB au démarrage: {exc}")
    yield


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
)

app.include_router(auth.router)
app.include_router(platforms.router)
app.include_router(audits.router)
app.include_router(reports.router)
app.include_router(chatbot.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dede-api"}
