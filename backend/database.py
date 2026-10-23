import os
import re
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("prompthub.database")

# Persistent local SQLite DB file (only used if no DATABASE_URL is configured)
REPO_DB_FILE = Path(__file__).resolve().parent / "prompthub.db"
DB_FILE = REPO_DB_FILE

# Only fall back to /tmp SQLite on Vercel if there is NO DATABASE_URL set.
# If DATABASE_URL is set (PostgreSQL), skip this entirely — /tmp is ephemeral
# and gets wiped every ~10-15 minutes when the Vercel serverless container restarts.
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
    """
    Strip URL query parameters that psycopg2 doesn't support
    (e.g. channel_binding=require from Neon connection strings).
    Also normalize postgres:// -> postgresql://
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    # Remove channel_binding param which psycopg2 cannot handle
    db_url = re.sub(r'[&?]channel_binding=[^&]*', '', db_url)
    # Clean up trailing ? or & left over
    db_url = re.sub(r'\?$', '', db_url)
    db_url = re.sub(r'&$', '', db_url)
    return db_url


def init_engine():
    db_url = os.environ.get("DATABASE_URL", "").strip()

    # Use PostgreSQL / any remote DB if DATABASE_URL is provided
    if db_url and not db_url.startswith("sqlite"):
        clean_url = _clean_pg_url(db_url)
        logger.info("Attempting PostgreSQL connection...")

        # Try multiple SSL modes — Neon requires SSL but psycopg2 connect_args must be compatible
        for attempt_args in [
            {},                       # Use URL params as-is (sslmode=require already in URL)
            {"sslmode": "require"},   # Force SSL explicitly
            {"sslmode": "prefer"},    # Prefer SSL
        ]:
            try:
                pg_engine = create_engine(
                    clean_url,
                    connect_args=attempt_args,
                    pool_pre_ping=True,
                    pool_recycle=300,
                    pool_size=5,
                    max_overflow=10,
                )
                with pg_engine.connect() as _conn:
                    pass
                logger.info(f"Connected to PostgreSQL successfully (connect_args={attempt_args}).")
                return pg_engine
            except Exception as e:
                logger.warning(f"PostgreSQL attempt failed (connect_args={attempt_args}): {e}")
                continue

        logger.error(
            "CRITICAL: All PostgreSQL connection attempts failed. "
            "Falling back to local SQLite — data will NOT persist on Render/Vercel!"
        )

    # Local SQLite fallback (works for local dev; ephemeral on cloud servers)
    sqlite_url = f"sqlite:///{DB_FILE}"
    logger.info(f"Using SQLite database at {sqlite_url}")
    return create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
    )


engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
