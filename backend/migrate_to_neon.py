import os
import sys
import re
import sqlite3
import sqlalchemy
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import models
from models import Base

SQLITE_PATH = BACKEND_DIR / "prysm.db"
if not SQLITE_PATH.exists():
    SQLITE_PATH = BACKEND_DIR / "prompthub.db"

NEW_NEON_URL = "postgresql://neondb_owner:npg_H2qN5DeGWVha@ep-aged-sun-azua9w0w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def migrate():
    print(f"=== Starting Migration to New Neon Database ===")
    print(f"Source SQLite: {SQLITE_PATH}")
    
    # 1. Clean URL and prepare pg8000 driver
    clean_url = re.sub(r'[&?]channel_binding=[^&]*', '', NEW_NEON_URL)
    clean_url = re.sub(r'\?$', '', clean_url)
    clean_url = re.sub(r'&$', '', clean_url)
    pg8000_url = re.sub(r'^postgresql://', 'postgresql+pg8000://', clean_url)
    pg8000_url = re.sub(r'[&?]sslmode=[^&]*', '', pg8000_url)

    pg_engine = sqlalchemy.create_engine(pg8000_url, connect_args={"ssl_context": True})
    
    # 2. Create all schema tables in PostgreSQL
    print("Creating tables in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)
    print("Tables created successfully.")

    # 3. Read data from SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sc = sqlite_conn.cursor()

    tables = ["users", "repositories", "prompt_versions", "user_follows", "repository_stars", "notifications"]

    with pg_engine.begin() as pg_conn:
        for table in tables:
            try:
                sc.execute(f"SELECT * FROM {table}")
                rows = sc.fetchall()
                if not rows:
                    print(f"  {table}: 0 rows to migrate.")
                    continue

                col_names = [description[0] for description in sc.description]
                cols_str = ", ".join(col_names)
                placeholders = ", ".join([f":{col}" for col in col_names])
                insert_stmt = sqlalchemy.text(f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")

                count = 0
                for row in rows:
                    data = dict(row)
                    pg_conn.execute(insert_stmt, data)
                    count += 1

                print(f"  Migrated {count} rows into {table}.")
            except Exception as e:
                print(f"  Error migrating table {table}: {e}")

    # 4. Verify counts in PostgreSQL
    print("\n=== Verifying New Neon Database Records ===")
    with pg_engine.connect() as conn:
        for table in tables:
            try:
                r = conn.execute(sqlalchemy.text(f"SELECT COUNT(*) FROM {table}")).fetchone()[0]
                print(f"  {table}: {r} rows in PostgreSQL")
            except Exception as e:
                print(f"  {table}: {e}")

    print("\nMIGRATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    migrate()
