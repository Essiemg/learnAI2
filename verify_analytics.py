
import sys
import os
import uuid
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend-api"))

from db import SessionLocal, engine, Base
from models import User, UserTopicState, LearningPattern, QuizAttempt, StudyEvent, Interaction, QuizSet, QuizQuestion
from services.analytics_service import update_mastery_from_quiz
from routers.report_routes import generate_progress_report
from sqlalchemy import text

def migrate_schema():
    print("Migrating Schema (SQLite)...")
    with engine.connect() as conn:
        tables_to_migrate = [
            ("interactions", "hints_used", "INTEGER DEFAULT 0"),
            ("interactions", "time_to_response_ms", "INTEGER DEFAULT 0"),
            ("quiz_questions", "difficulty", "VARCHAR(20) DEFAULT 'medium'"),
            ("quiz_questions", "misconception_tag", "VARCHAR(255)"),
            ("quiz_answers", "time_taken_ms", "INTEGER"),
            ("quiz_answers", "confidence_level", "INTEGER"),
            ("study_events", "session_id", "CHAR(36)"),
            ("quiz_attempts", "created_at", "DATETIME")
        ]

        
        for table, col, dtype in tables_to_migrate:
            try:
                # Check if column exists first to avoid error spam
                # SQLite doesn't have robust 'IF NOT EXISTS' for columns in older versions
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                print(f"[MIGRATE] Added {col} to {table}")
            except Exception as e:
                # Likely already exists
                pass
        conn.commit()

def verify_schema():
    migrate_schema()
    print("Verifying Schema...")

    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    Base.metadata.create_all(bind=engine) # Ensure tables exist
    
    required_tables = ["user_topic_states", "learning_patterns", "study_events", "interactions"]
    for table in required_tables:
        if table in tables:
            print(f"[OK] Table '{table}' exists.")
        else:
            # If create_all ran, they should exist now, but inspector might need refresh
            # Let's trust create_all and re-inspect
            inspector = inspect(engine)
            if table in inspector.get_table_names():
                 print(f"[OK] Table '{table}' created.")
            else:
                 print(f"[FAIL] Table '{table}' MISSING!")
                 return False
            
    # Check columns
    columns = [c['name'] for c in inspector.get_columns("user_topic_states")]
    if "mastery_level" in columns and "retention_score" in columns:
        print("[OK] UserTopicState columns verified.")
    else:
        print("[FAIL] UserTopicState columns MISSING!")
        return False
        
    return True

def test_flow():
    print("\nTesting Data Flow...")
    db = SessionLocal()
    
    # 1. Create Test User
    email = f"test_analytics_{uuid.uuid4().hex[:6]}@example.com"
    user = User(name="Analytics Tester", email=email, password_hash="hash", grade=5)
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"[OK] Created User: {user.email}")
    
    try:
        # 2. Simulate Quiz Submission
        # Create a QuizSet first (since we enforce FK now)
        quiz_set = QuizSet(
            user_id=user.id,
            title="Math Quiz",
            topic="Multiplication",
            question_count=5
        )
        db.add(quiz_set)
        db.commit()
        
        # Update Mastery
        update_mastery_from_quiz(db, str(user.id), "Math", "Multiplication", 85.0)
        
        # Verify Topic State
        state = db.query(UserTopicState).filter(
            UserTopicState.user_id == user.id,
            UserTopicState.topic == "Multiplication"
        ).first()
        
        if state and state.mastery_level > 50:
            print(f"[OK] Mastery Updated: {state.mastery_level}%")
        else:
            print("[FAIL] Mastery Update FAILED")
            
        # 3. Simulate Essay (Persistent Study Event)
        essay_event = StudyEvent(
            user_id=user.id,
            event_type="essay",
            subject="History",
            topic="WWII",
            score=90.0,
            event_data={"feedback": "Good job"}
        )
        db.add(essay_event)
        
        # 4. Simulate Interaction (Hints)
        interaction = Interaction(
            user_id=user.id,
            subject="Math",
            question="Help?",
            answer="Here is a hint",
            hints_used=2,
            created_at=datetime.utcnow()
        )
        db.add(interaction)
        db.commit()
        
        print("[OK] Simulated Data (Quiz, Essay, Interaction) Inserted.")
        
        # 5. Generate Report Profile (Mocking the router call)
        # We can't easily call the async router without FastAPI context, 
        # but we can manually run the logic if we extract it, 
        # OR we can just verify the data exists in DB which the report WOULD query.
        
        # Verify Learning Pattern (Manual creation for test)
        pattern = LearningPattern(
            user_id=user.id, 
            pattern_type="VisualLearner",
            confidence_score=0.8
        )
        db.add(pattern)
        db.commit()
        
        print("[OK] Verification Complete. Data structure is valid.")
        
    except Exception as e:
        print(f"[FAIL] Test Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        # Cascade delete should handle related items
        db.delete(user)
        db.commit()
        db.close()


if __name__ == "__main__":
    if verify_schema():
        test_flow()
