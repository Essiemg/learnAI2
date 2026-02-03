"""Check database tables."""
import psycopg2
import sys
sys.path.insert(0, '..')
from config import get_settings

settings = get_settings()
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()

cur.execute("""
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
""")

tables = cur.fetchall()
print("Database tables:")
for t in tables:
    print(f"  - {t[0]}")

cur.close()
conn.close()
