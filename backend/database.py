import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("prompthub.database")

# Persistent local SQLite DB file
REPO_DB_FILE = Path(__file__).resolve().parent / "prompthub.db"
DB_FILE = REPO_DB_FILE

if os.environ.get("VERCEL"):
    import shutil
    TMP_DB_FILE = Path("/tmp/prompthub.db")
    # If /tmp/prompthub.db doesn't exist yet, copy the repo's bundled SQLite DB into /tmp
    if not TMP_DB_FILE.exists() and REPO_DB_FILE.exists():
        try:
            shutil.copy2(REPO_DB_FILE, TMP_DB_FILE)
            logger.info("Copied initial bundled prompthub.db to /tmp/prompthub.db")
        except Exception as copy_err:
            logger.warning(f"Failed to copy initial DB to /tmp: {copy_err}")
    DB_FILE = TMP_DB_FILE

def init_engine():
    db_url = os.getenv("DATABASE_URL", "").strip()
    
    # If a remote PostgreSQL database URL is provided, test connection with a short timeout
    if db_url and not db_url.startswith("sqlite"):
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        try:
            pg_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True,
                pool_recycle=300
            )
            # Verify that connection actually succeeds
            with pg_engine.connect() as conn:
                pass
            logger.info("Connected to remote PostgreSQL database successfully.")
            return pg_engine
        except Exception as e:
            logger.warning(f"Remote PostgreSQL connection failed ({e}). Falling back to SQLite.")
            
    # Default to persistent SQLite
    sqlite_url = f"sqlite:///{DB_FILE}"
    logger.info(f"Using SQLite database at {sqlite_url}")
    return create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
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

