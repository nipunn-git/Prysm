import os
import re
import time
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

logger = logging.getLogger("prompthub.database")

# Persistent local SQLite DB file (only used if no DATABASE_URL is configured)
REPO_DB_FILE = Path(__file__).resolve().parent / "prompthub.db"
DB_FILE = REPO_DB_FILE

# Only fall back to /tmp SQLite on Vercel if there is NO DATABASE_URL set.
_db_url_env = os.environ.get("DATABASE_URL", "").strip()
if os.environ.get("VERCEL") and not _db_url_env:
    import shutil
    TMP_DB_FILE = Path("/tmp/prompthub.db")
    if not TMP_DB_FILE.exists() and REPO_DB_FILE.exists():
        try:
            shutil.copy2(REPO_DB_FILE, TMP_DB_FILE)
            logger.info("Copied initial bundled prompthub.db to /tmp/prompthub.db")
        except Exception as copy_err:
            logger.warning(f"Failed to copy initial DB to /tmp: {copy_err}")
    DB_FILE = TMP_DB_FILE


def _clean_pg_url(db_url: str) -> str:
    """Strip params psycopg2 can't handle and normalize the scheme."""
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    db_url = re.sub(r'[&?]channel_binding=[^&]*', '', db_url)
    db_url = re.sub(r'\?$', '', db_url)
    db_url = re.sub(r'&$', '', db_url)
    return db_url


# Store last connection error for diagnostics
_last_pg_error: str = ""


def _try_connect(url: str, connect_args: dict = None, retries: int = 3, delay: int = 6) -> object:
    """
    Try to connect with retries.
    Neon free tier HIBERNATES and can take 5-10s to wake up.
    We retry to give it time to come online.
    """
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            kwargs = {"poolclass": NullPool}
            if connect_args:
                kwargs["connect_args"] = connect_args
            eng = create_engine(url, **kwargs)
            with eng.connect() as c:
                c.execute(text("SELECT 1"))
            return eng
        except Exception as e:
            last_err = e
            logger.warning(f"PG connect attempt {attempt}/{retries} failed: {type(e).__name__}: {str(e)[:200]}")
            if attempt < retries:
                logger.info(f"Waiting {delay}s before retry (Neon may be waking from hibernation)...")
                time.sleep(delay)
    raise last_err


def init_engine():
    global _last_pg_error
    db_url = os.environ.get("DATABASE_URL", "").strip()

    if db_url and not db_url.startswith("sqlite"):
        clean_url = _clean_pg_url(db_url)
        logger.info("Attempting PostgreSQL connection (with Neon wake-up retries)...")

        # Strategy 1: psycopg2 with NullPool (sslmode already in URL)
        try:
            eng = _try_connect(clean_url)
            logger.info("Connected to PostgreSQL via psycopg2.")
            return eng
        except Exception as e:
            _last_pg_error = f"psycopg2: {str(e)[:300]}"
            logger.warning(f"psycopg2 failed after retries.")

        # Strategy 2: pg8000 pure-Python driver (no native SSL compilation needed)
        try:
            pg8000_url = re.sub(r'^postgresql://', 'postgresql+pg8000://', clean_url)
            pg8000_url = re.sub(r'[&?]sslmode=[^&]*', '', pg8000_url)
            pg8000_url = re.sub(r'\?$', '', pg8000_url)
            eng = _try_connect(pg8000_url, connect_args={"ssl_context": True})
            logger.info("Connected to PostgreSQL via pg8000.")
            return eng
        except Exception as e:
            _last_pg_error = f"pg8000: {str(e)[:300]}"
            logger.warning(f"pg8000 failed after retries.")

        logger.error(
            f"CRITICAL: All PostgreSQL attempts failed. Last error: {_last_pg_error}. "
            "Falling back to SQLite — accounts will reset on Render restart!"
        )

    # SQLite fallback — fine for local dev, but ephemeral on Render/Vercel
    sqlite_url = f"sqlite:///{DB_FILE}"
    logger.info(f"Using SQLite at {sqlite_url}")
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
