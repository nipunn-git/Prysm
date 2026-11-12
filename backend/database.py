import os
import re
import time
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

logger = logging.getLogger("prysm.database")

# Persistent local SQLite DB file (only used if no DATABASE_URL is configured)
REPO_DB_FILE = Path(__file__).resolve().parent / "prysm.db"
if not REPO_DB_FILE.exists():
    OLD_DB_FILE = Path(__file__).resolve().parent / "prompthub.db"
    if OLD_DB_FILE.exists():
        REPO_DB_FILE = OLD_DB_FILE
DB_FILE = REPO_DB_FILE

# Only fall back to /tmp SQLite on Vercel if there is NO DATABASE_URL set.
_db_url_env = os.environ.get("DATABASE_URL", "").strip()
if os.environ.get("VERCEL") and not _db_url_env:
    import shutil
    TMP_DB_FILE = Path("/tmp/prysm.db")
    if not TMP_DB_FILE.exists() and REPO_DB_FILE.exists():
        try:
            shutil.copy2(REPO_DB_FILE, TMP_DB_FILE)
            logger.info("Copied initial bundled prysm.db to /tmp/prysm.db")
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
            kwargs = {
                "pool_pre_ping": True,
                "pool_recycle": 300,
                "pool_size": 10,
                "max_overflow": 20
            }
            if connect_args:
                kwargs["connect_args"] = connect_args
            eng = create_engine(url, **kwargs)
            with eng.connect() as c:
                c.execute(text("SELECT 1"))
            return eng
        except Exception as e:
            last_err = e
            logger.warning(f"PG connect attempt {attempt}/{retries} failed: {type(e).__name__}: {str(e)[:200]}")
            if "exceeded the quota" in str(e).lower() or "53000" in str(e):
                logger.error("Database provider quota exceeded. Skipping remaining retries.")
                break
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

        # In production (Render/Vercel), if PG fails (e.g. Neon quota exceeded or downtime),
        # fall back to SQLite so the server stays healthy (200 OK) instead of crashing with exit status 1.
        logger.error(
            f"PostgreSQL connection failed ({_last_pg_error}). "
            "Falling back to local SQLite to ensure the backend server stays online and operational."
        )

    # SQLite fallback — keeps the server alive even if remote PostgreSQL has quota or network issues
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
