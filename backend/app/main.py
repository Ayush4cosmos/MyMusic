import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app.db.base import Base
from app.db.session import engine
from app.api.routes.router import router

# -------------------------------------------------
# Environment
# -------------------------------------------------
load_dotenv()

# -------------------------------------------------
# Logging
# -------------------------------------------------
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# -------------------------------------------------
# App
# -------------------------------------------------
app = FastAPI(title="Raish Backend")

# -------------------------------------------------
# CORS (allow browser JS → API)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ✅ static HTML has no origin during dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Database
# -------------------------------------------------
Base.metadata.create_all(bind=engine)

# -------------------------------------------------
# API Routes
# -------------------------------------------------
app.include_router(router)

# -------------------------------------------------
# Static Frontend (DEV)
# -------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

if STATIC_DIR.exists():
    app.mount(
        "/",   # 👈 serve index.html at root
        StaticFiles(directory=STATIC_DIR, html=True),
        name="static",
    )

# -------------------------------------------------
# Health
# -------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}