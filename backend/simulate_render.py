"""
This script starts the backend locally with DATABASE_URL set,
and captures what database.py actually does — to simulate what Render sees.
"""
import os
import sys

# Simulate exactly what Render sees (only DATABASE_URL set, no .env file)
os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_H2qN5DeGWVha@ep-aged-sun-azua9w0w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Enable logging so we can see what's happening
import logging
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

print("=== Simulating Render environment (no .env, only DATABASE_URL env var) ===")
print(f"DATABASE_URL set: {bool(os.environ.get('DATABASE_URL'))}")
print()

from database import engine
print()
print("=== Result ===")
print("Engine driver:", engine.url.drivername)
print("Engine URL:", str(engine.url)[:60])

import sqlalchemy
with engine.connect() as c:
    r = c.execute(sqlalchemy.text("SELECT COUNT(*) FROM users"))
    print("Users in DB:", r.fetchone()[0])

print("\nSUCCESS - Using:", engine.url.drivername.upper())
