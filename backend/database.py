import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DEFAULT_POSTGRES_URL = "postgresql://neondb_owner:npg_0ArFKD6IPkBl@ep-flat-pond-azd31apc.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

DATABASE_URL = os.getenv("DATABASE_URL") or DEFAULT_POSTGRES_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    connect_args = {}
    if "sqlite" in DATABASE_URL:
        connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300
    )
except Exception as e:
    logging.error(f"Failed to initialize database engine for {DATABASE_URL}: {e}")
    db_path = Path("/tmp/prompthub.db") if os.environ.get("VERCEL") else (Path(__file__).resolve().parent / "prompthub.db")
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
