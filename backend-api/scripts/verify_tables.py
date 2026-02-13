import sys
import os
from sqlalchemy import create_engine, inspect

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings

def verify_tables():
    settings = get_settings()
    db_url = settings.SQLALCHEMY_DATABASE_URL
    
    print(f"Connecting to database: {settings.DB_NAME}")
    
    try:
        engine = create_engine(db_url)
        inspector = inspect(engine)
        
        tables = inspector.get_table_names()
        
        print("\n[OK] Connected successfully.")
        print(f"Found {len(tables)} tables:")
        
        for table in sorted(tables):
            print(f" - {table}")
            
        expected_tables = [
            "users", "sessions", "messages", "interactions", "goals", "study_events",
            "flashcard_sets", "flashcards", "quiz_sets", "quiz_questions", 
            "quiz_attempts", "quiz_answers", "summaries", "diagrams",
            "chat_sessions", "quiz_sessions", "flashcard_sessions"
        ]
        
        missing = [t for t in expected_tables if t not in tables]
        
        if missing:
            print(f"\n[FAIL] Missing tables: {missing}")
        else:
            print("\n[OK] All expected tables are present.")
            
    except Exception as e:
        print(f"\n[FAIL] Error verifying tables: {e}")

if __name__ == "__main__":
    verify_tables()
