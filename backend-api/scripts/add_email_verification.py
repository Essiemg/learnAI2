"""
Add email verification columns to users table.

Run this script to add the new columns for email verification:
    python scripts/add_email_verification.py
"""
import sqlite3
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings

settings = get_settings()

def get_db_path():
    """Extract SQLite database file path from DATABASE_URL."""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return "learnai.db"


def add_columns():
    """Add email verification columns to users table."""
    db_path = get_db_path()
    print(f"Connecting to database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Existing columns: {columns}")
    
    # Add email_verified column if not exists
    if "email_verified" not in columns:
        print("Adding email_verified column...")
        cursor.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0")
        print("✓ Added email_verified column")
    else:
        print("✓ email_verified column already exists")
    
    # Add verification_token column if not exists
    if "verification_token" not in columns:
        print("Adding verification_token column...")
        cursor.execute("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)")
        print("✓ Added verification_token column")
    else:
        print("✓ verification_token column already exists")
    
    # Add verification_token_expires column if not exists
    if "verification_token_expires" not in columns:
        print("Adding verification_token_expires column...")
        cursor.execute("ALTER TABLE users ADD COLUMN verification_token_expires DATETIME")
        print("✓ Added verification_token_expires column")
    else:
        print("✓ verification_token_expires column already exists")
    
    # Set existing users as verified (so they can still log in)
    print("\nSetting existing users as verified...")
    cursor.execute("UPDATE users SET email_verified = 1 WHERE email_verified IS NULL OR email_verified = 0")
    affected = cursor.rowcount
    print(f"✓ Updated {affected} existing users to verified status")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration complete!")


if __name__ == "__main__":
    add_columns()
