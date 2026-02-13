
import sys
import os

# Add parent directory to path
sys.path.append(os.getcwd())

from config import get_settings
from sqlalchemy import create_engine, text

def check_connection():
    settings = get_settings()
    print(f"Testing connection to: {settings.DB_HOST}:{settings.DB_PORT} as {settings.DB_USER}")
    print(f"Database: {settings.DB_NAME}")
    
    url = settings.SQLALCHEMY_DATABASE_URL
    # Mask password for printing
    print(f"URL: {url.replace(settings.DB_PASSWORD, '******')}")
    
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("Connection successful!")
            return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

if __name__ == "__main__":
    if check_connection():
        sys.exit(0)
    else:
        sys.exit(1)
