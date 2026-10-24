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
        logger.info("Connecting to PostgreSQL (with Neon wake-up retry support)...")

        # Strategy 1: pg8000 pure-Python driver (100% reliable on Linux/Render, no missing libpq)
        try:
            pg8000_url = re.sub(r'^postgresql://', 'postgresql+pg8000://', clean_url)
            pg8000_url = re.sub(r'[&?]sslmode=[^&]*', '', pg8000_url)
            pg8000_url = re.sub(r'\?$', '', pg8000_url)
            eng = _try_connect(pg8000_url, connect_args={"ssl_context": True}, retries=5, delay=4)
            logger.info("Connected to PostgreSQL via pg8000 successfully.")
            return eng
        except Exception as e:
            _last_pg_error = f"pg8000: {str(e)[:300]}"
            logger.warning(f"pg8000 attempt failed: {_last_pg_error}")

        # Strategy 2: psycopg2 fallback
        try:
            eng = _try_connect(clean_url, retries=3, delay=4)
            logger.info("Connected to PostgreSQL via psycopg2.")
            return eng
        except Exception as e:
            _last_pg_error = f"psycopg2: {str(e)[:300]}"
            logger.warning(f"psycopg2 attempt failed: {_last_pg_error}")

        # In production (Render/Vercel) or when DATABASE_URL is set, NEVER fall back to ephemeral SQLite!
        # Falling back to SQLite would cause accounts to be wiped when Render container spins down on idle.
        is_cloud = bool(os.environ.get("RENDER") or os.environ.get("VERCEL") or os.environ.get("PORT"))
        if is_cloud:
            logger.critical(
                f"FATAL: Could not connect to PostgreSQL database: {_last_pg_error}. "
                "Refusing to fall back to SQLite in cloud environment to prevent account loss!"
            )
            raise RuntimeError(f"Database connection failed: {_last_pg_error}")

        logger.error(
            f"Local dev notice: PostgreSQL failed ({_last_pg_error}). Falling back to local SQLite."
        )

    # SQLite fallback — ONLY for local offline development when DATABASE_URL is unset
    sqlite_url = f"sqlite:///{DB_FILE}"
    logger.info(f"Using local SQLite at {sqlite_url}")
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
