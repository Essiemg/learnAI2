import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from models import User
from auth import hash_password

def seed_admin_user():
    settings = get_settings()
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Check if any user exists
        user = db.query(User).filter(User.email == "admin@learnai.com").first()
        
        if user:
            print(f"[OK] User 'admin@learnai.com' already exists.")
            if user.role != "admin":
                user.role = "admin"
                db.commit()
                print(f"[OK] Updated role to admin.")
            return

        # Create new admin user
        print("Creating seed admin user...")
        new_user = User(
            name="Admin User",
            email="admin@learnai.com",
            password_hash=hash_password("admin123"),
            role="admin",
            grade=12,
            email_verified=True
        )
        
        db.add(new_user)
        db.commit()
        print(f"[OK] Created user: admin@learnai.com / admin123")
        
    except Exception as e:
        print(f"[FAIL] Error seeding admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_user()
