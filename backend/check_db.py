from dotenv import load_dotenv
load_dotenv('.env')
from database import engine, Base
import models, sqlalchemy

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    result = conn.execute(sqlalchemy.text(sql))
    tables = [r[0] for r in result.fetchall()]
    print('Tables in Neon PostgreSQL:', tables)

    result2 = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM users"))
    print('Total users:', result2.fetchone()[0])

    result3 = conn.execute(sqlalchemy.text("SELECT username, email, created_at FROM users ORDER BY created_at DESC LIMIT 20"))
    rows = result3.fetchall()
    print('All users:')
    for r in rows:
        print(f'  @{r[0]} | {r[1]} | {r[2]}')
