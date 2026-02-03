"""Fix users table columns."""
import psycopg2
import sys
sys.path.insert(0, '..')
from config import get_settings

settings = get_settings()
conn = psycopg2.connect(settings.DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# Add role column
try:
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student'")
    print("✓ Added role column")
except Exception as e:
    print(f"Role column: {e}")

# Add avatar_url column  
try:
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")
    print("✓ Added avatar_url column")
except Exception as e:
    print(f"Avatar column: {e}")

# Add updated_at column
try:
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    print("✓ Added updated_at column")
except Exception as e:
    print(f"Updated_at column: {e}")

# Verify columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
print("\nUsers table columns:")
for col in cur.fetchall():
    print(f"  - {col[0]}")

cur.close()
conn.close()
print("\nDone!")
