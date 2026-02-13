import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import URL

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from models import Base

def init_mysql_db():
    settings = get_settings()
    
    print("Initializing Database...")
    print(f"Host: {settings.DB_HOST}")
    print(f"User: {settings.DB_USER}")
    print(f"Database: {settings.DB_NAME}")
    
    # Step 1: Connect to MySQL Server (no database) to create DB if needed
    try:
        # Create URL without database
        server_url = URL.create(
            "mysql+mysqlconnector",
            username=settings.DB_USER,
            password=settings.DB_PASSWORD,
            host=settings.DB_HOST,
            port=settings.DB_PORT
        )
        
        server_engine = create_engine(server_url)
        with server_engine.connect() as connection:
            print(f"Checking if database '{settings.DB_NAME}' exists...")
            connection.execute(text(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME}"))
            print(f"[OK] Database '{settings.DB_NAME}' ensured.")
            
    except Exception as e:
        print(f"[FAIL] Failed to connect to MySQL server: {e}")
        return

    # Step 2: Connect to the specific database and create tables
    try:
        db_url = settings.SQLALCHEMY_DATABASE_URL
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            print(f"Connected to database '{settings.DB_NAME}'.")
            
            print("Creating/Verifying tables...")
            Base.metadata.create_all(bind=engine)
            print("[OK] Tables created successfully.")
            
    except Exception as e:
        print(f"[FAIL] Failed to initialize tables: {e}")

if __name__ == "__main__":
    init_mysql_db()
