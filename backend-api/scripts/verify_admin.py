import sys
import os
import requests
import json
from datetime import datetime

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal
from models import User, StudyEvent

API_URL = "http://localhost:8000/api"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_admin_user():
    print("Setting up admin user...")
    db = next(get_db())
    # clear existing admin if any or just pick one
    user = db.query(User).first()
    if not user:
        print("No users found! Please run the app and register a user first.")
        sys.exit(1)
    
    user.role = "admin"
    db.commit()
    print(f"Promoted user {user.email} to admin.")
    return user.email

def verify_endpoints(email):
    # Login to get token
    # We need a password... this is tricky without known credentials.
    # Alternative: Generate a token manually using backend code.
    from auth import create_access_token
    
    db = next(get_db())
    user = db.query(User).filter(User.email == email).first()
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\nVerifying endpoints with token for {email}...")
    
    # 1. Get Stats
    print("\n1. Testing GET /admin/stats...")
    try:
        res = requests.get(f"{API_URL}/admin/stats", headers=headers)
        if res.status_code == 200:
            print("[OK] Success!")
            print(json.dumps(res.json(), indent=2))
        else:
            print(f"[FAIL] Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[FAIL] Error: {e}")

    # 2. Get Activity Log
    print("\n2. Testing GET /admin/activity...")
    try:
        res = requests.get(f"{API_URL}/admin/activity", headers=headers)
        if res.status_code == 200:
            print("[OK] Success!")
            data = res.json()
            print(f"Retrieved {len(data)} activity logs.")
            if len(data) > 0:
                print("Latest:", data[0])
        else:
            print(f"[FAIL] Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[FAIL] Error: {e}")

if __name__ == "__main__":
    admin_email = setup_admin_user()
    # Note: This script assumes the server is running on localhost:8000
    # If not, it will fail to connect but the DB part will work.
    try:
        verify_endpoints(admin_email)
    except Exception as e:
        print(f"Verification failed (is the server running?): {e}")
