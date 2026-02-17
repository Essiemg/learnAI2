
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from models import User
from auth import hash_password

def reset_and_seed_admin():
    settings = get_settings()
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        print("WARNING: This will delete ALL users.")
        
        # Delete all existing users
        num_deleted = db.query(User).delete()
        print(f"Deleted {num_deleted} existing users.")
        
        # Create new admin user
        print("Creating new admin user...")
        new_user = User(
            name="Admin User",
            email="esthermuthoni3001@gmail.com",
            password_hash=hash_password("Usecase2004"),
            role="admin",
            grade=12,
            email_verified=True
        )
        
        db.add(new_user)
        db.commit()
        print(f"[OK] Created admin: esthermuthoni3001@gmail.com / Usecase2004")
        
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_admin()
