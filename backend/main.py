import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend directory is in sys.path and .env is loaded
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from seed import seed_data
from api import repositories, prompts, optimizer, auth, chat, notifications

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PromptHub API",
    description="Backend API for PromptHub - GitHub for AI Prompts",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(repositories.router)
app.include_router(prompts.router)
app.include_router(optimizer.router)
app.include_router(chat.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "app": "PromptHub API",
        "tagline": "Version. Improve. Ship better prompts.",
        "status": "healthy"
    }

@app.get("/debug/db")
def debug_db():
    import os
    from database import _last_pg_error
    db_url_raw = os.environ.get("DATABASE_URL", "")
    driver = str(engine.url.drivername)
    db_url_masked = (db_url_raw[:35] + "...") if db_url_raw else "NOT SET"
    return {
        "engine_driver": driver,
        "database_url_set": bool(db_url_raw),
        "database_url_preview": db_url_masked,
        "using_postgresql": driver.startswith("postgresql"),
        "using_sqlite": "sqlite" in driver,
        "last_pg_error": _last_pg_error or "none",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
