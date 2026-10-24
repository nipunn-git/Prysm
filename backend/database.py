import os
import re
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

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


# Store last connection error for diagnostics
_last_pg_error: str = ""


def init_engine():
    global _last_pg_error
    db_url = os.environ.get("DATABASE_URL", "").strip()

    # Use PostgreSQL / any remote DB if DATABASE_URL is provided
    if db_url and not db_url.startswith("sqlite"):
        clean_url = _clean_pg_url(db_url)
        logger.info("Attempting PostgreSQL connection...")

        # --- Attempt 1: psycopg2 with NullPool (no pooling, safest for serverless) ---
        try:
            from sqlalchemy.pool import NullPool
            pg_engine = create_engine(clean_url, poolclass=NullPool)
            with pg_engine.connect() as _conn:
                _conn.execute(text("SELECT 1"))
            logger.info("Connected to PostgreSQL via psycopg2 NullPool.")
            return pg_engine
        except Exception as e:
            _last_pg_error = f"psycopg2-nullpool: {e}"
            logger.warning(f"PostgreSQL psycopg2 NullPool failed: {e}")

        # --- Attempt 2: psycopg2 with explicit sslmode=require ---
        try:
            from sqlalchemy.pool import NullPool
            pg_engine = create_engine(
                clean_url,
                connect_args={"sslmode": "require"},
                poolclass=NullPool,
            )
            with pg_engine.connect() as _conn:
                _conn.execute(text("SELECT 1"))
            logger.info("Connected to PostgreSQL via psycopg2 + sslmode=require.")
            return pg_engine
        except Exception as e:
            _last_pg_error = f"psycopg2-ssl: {e}"
            logger.warning(f"PostgreSQL psycopg2 ssl attempt failed: {e}")

        # --- Attempt 3: pg8000 (pure-Python driver, no native SSL deps) ---
        try:
            from sqlalchemy.pool import NullPool
            # Build pg8000 URL: postgresql+pg8000://user:pass@host/db
            pg8000_url = re.sub(r'^postgresql://', 'postgresql+pg8000://', clean_url)
            # pg8000 needs ssl=True in connect_args, not in URL
            pg8000_url_clean = re.sub(r'[&?]sslmode=[^&]*', '', pg8000_url)
            pg8000_url_clean = re.sub(r'\?$', '', pg8000_url_clean)
            pg_engine = create_engine(
                pg8000_url_clean,
                connect_args={"ssl_context": True},
                poolclass=NullPool,
            )
            with pg_engine.connect() as _conn:
                _conn.execute(text("SELECT 1"))
            logger.info("Connected to PostgreSQL via pg8000.")
            return pg_engine
        except Exception as e:
            _last_pg_error = f"pg8000: {e}"
            logger.warning(f"PostgreSQL pg8000 attempt failed: {e}")

        logger.error(
            f"CRITICAL: All PostgreSQL connection attempts failed (last error: {_last_pg_error}). "
            "Falling back to local SQLite — data will NOT persist on Render!"
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
