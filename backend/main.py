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

def purge_demo_accounts():
    """Permanently delete demo accounts (alex-chen, sarah-dev, prompt-masters) so only real users remain."""
    try:
        from database import SessionLocal
        db = SessionLocal()
        demo_usernames = ["alex-chen", "sarah-dev", "prompt-masters", "alex", "sarah"]
        demo_ids = ["usr_alex_01", "usr_sarah_01", "usr_promptmasters_01"]
        demos = db.query(models.User).filter(
            (models.User.username.in_(demo_usernames)) | (models.User.id.in_(demo_ids))
        ).all()
        if demos:
            count = len(demos)
            for d in demos:
                db.delete(d)
            db.commit()
            print(f"Purged {count} demo accounts permanently.")
    except Exception as e:
        print(f"Demo purge note: {e}")
    finally:
        db.close()

try:
    purge_demo_accounts()
except Exception:
    pass

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

@app.api_route("/api/admin/purge-demos", methods=["GET", "POST"])
def admin_purge_demos():
    from database import SessionLocal
    db = SessionLocal()
    try:
        demo_usernames = ["alex-chen", "sarah-dev", "prompt-masters", "alex", "sarah"]
        demo_ids = ["usr_alex_01", "usr_sarah_01", "usr_promptmasters_01"]
        demos = db.query(models.User).filter(
            (models.User.username.in_(demo_usernames)) | (models.User.id.in_(demo_ids))
        ).all()
        purged = [d.username for d in demos]
        for d in demos:
            db.delete(d)
        db.commit()
        return {"status": "success", "purged": purged, "count": len(purged)}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
