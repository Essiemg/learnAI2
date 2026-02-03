"""
Database Connection Module
==========================
This module handles the SQLite database connection using SQLAlchemy.

SQLite is a lightweight, file-based database that requires no server.
The database file is created automatically in the backend-api folder.

Usage in routes:
    from db import get_db
    from sqlalchemy.orm import Session
    
    @router.get("/items")
    def get_items(db: Session = Depends(get_db)):
        return db.query(Item).all()
"""
import os
import logging
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# Configure logging for this module
logger = logging.getLogger(__name__)

# =============================================================================
# Load Environment Variables
# =============================================================================
from config import get_settings

settings = get_settings()

# Default to SQLite if DATABASE_URL not set
DATABASE_URL = settings.DATABASE_URL or "sqlite:///./learnai.db"

# =============================================================================
# SQLAlchemy Engine Configuration
# =============================================================================
# SQLite configuration differs from PostgreSQL

# Check if using SQLite
is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # SQLite-specific settings
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # Allow multi-threaded access
        echo=settings.DEBUG,
    )
    
    # Enable foreign key support in SQLite (disabled by default)
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    logger.info(f"SQLite database: {DATABASE_URL.replace('sqlite:///', '')}")
else:
    # PostgreSQL or other databases
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,
        echo=settings.DEBUG,
    )
    logger.info(f"Database engine created for: {DATABASE_URL.split('@')[-1]}")

# =============================================================================
# Session Factory
# =============================================================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# =============================================================================
# Declarative Base
# =============================================================================
Base = declarative_base()


# =============================================================================
# Database Dependency for FastAPI
# =============================================================================
def get_db():
    """
    FastAPI dependency that provides a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# Database Initialization
# =============================================================================
def init_database():
    """
    Create all database tables.
    
    This function creates all tables defined in the models.
    Call this during application startup.
    """
    # Import all models to ensure they're registered with Base
    import models  # noqa
    
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created/verified")


# =============================================================================
# Database Connection Test
# =============================================================================
def verify_database_connection() -> bool:
    """
    Test the database connection.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("✓ Database connection verified successfully")
        return True
    except OperationalError as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected database error: {e}")
        return False

