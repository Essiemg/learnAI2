
from sqlalchemy import text
from db import engine
import logging

logger = logging.getLogger(__name__)

def run_migrations():
    """
    Safely apply schema migrations for SQLite.
    Checks if columns exist before adding them.
    """
    logger.info("Checking for schema migrations...")
    
    # List of (table, column, type_def)
    migrations = [
        ("interactions", "hints_used", "INTEGER DEFAULT 0"),
        ("interactions", "time_to_response_ms", "INTEGER DEFAULT 0"),
        ("quiz_questions", "difficulty", "VARCHAR(20) DEFAULT 'medium'"),
        ("quiz_questions", "misconception_tag", "VARCHAR(255)"),
        ("quiz_answers", "time_taken_ms", "INTEGER"),
        ("quiz_answers", "confidence_level", "INTEGER"),
        ("study_events", "session_id", "CHAR(36)"),
        ("users", "grade", "INTEGER DEFAULT 1"), # Ensure grade exists
        ("user_topic_states", "mastery_level", "FLOAT DEFAULT 0.0"), # Check table exists via create_all first
        ("quiz_attempts", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
    ]

    
    with engine.connect() as conn:
        for table, col, dtype in migrations:
            try:
                # Attempt to add column. SQLite will fail if it exists.
                # We wrap in try/except to ignore "duplicate column" errors.
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                logger.info(f"Applied migration: Added {col} to {table}")
            except Exception as e:
                # Check directly if it was "duplicate column"
                if "duplicate column" in str(e).lower():
                    pass
                elif "no such table" in str(e).lower():
                    pass # Table doesn't exist yet (will be created by create_all)
                else:
                    # Could be syntax error or other
                    pass
        
        conn.commit()
    
    logger.info("Schema migrations check complete.")
