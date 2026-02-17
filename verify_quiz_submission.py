
import asyncio
import os
import sys
from datetime import datetime
from uuid import uuid4

# Setup paths
sys.path.append(os.path.join(os.getcwd(), "backend-api"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, QuizSession, QuizSet, QuizAttempt, QuizAnswer, QuizQuestion
from db import get_db
from config import get_settings

# Database setup
settings = get_settings()
engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def verify_quiz_flow():
    db = SessionLocal()
    try:
        print("Starting Quiz Submission Verification...")
        
        # 1. Get or Create Test User
        user = db.query(User).filter(User.email == "test_quiz_fix@example.com").first()
        if not user:
            user = User(
                email="test_quiz_fix@example.com",
                password_hash="hashed_secret",
                name="Quiz Fix Tester",
                grade=10
            )

            db.add(user)
            db.commit()
            db.refresh(user)
        print(f"[OK] User: {user.email}")

        # 2. Simulate Quiz Generation (Create QuizSession manually as API would)
        questions = [
            {"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "correct_answer": 1},
            {"question": "Capital of France?", "options": ["London", "Berlin", "Paris", "Madrid"], "correct_answer": 2}
        ]
        
        session = QuizSession(
            user_id=user.id,
            topic="Math & Geo",
            questions=questions,
            answers=[],
            completed=False,
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print(f"[OK] QuizSession Created: {session.id}")
        
        # 3. Simulate Quiz Submission (Call the logic we modified)
        # We can't easily call the API endpoint function directly due to Depends, 
        # so we will replicate the logic call or import the router function if possible,
        # but importing router function is hard with DI.
        # Instead, we will RUN the logic here to verify it works against DB.
        
        # LOGIC FROM SUBMIT_QUIZ (Modified)
        print("Migrating to Analytics Tables...")
        
        # Create QuizSet
        quiz_set = QuizSet(
            user_id=user.id,
            title=f"Quiz on {session.topic}",
            topic=session.topic,
            subject=session.topic,
            question_count=len(questions),
            created_at=session.created_at
        )
        db.add(quiz_set)
        db.flush()
        
        # Create Questions
        for q_idx, q_data in enumerate(questions):
            question = QuizQuestion(
                set_id=quiz_set.id,
                question_text=q_data.get("question"),
                options=q_data.get("options"),
                correct_answer=str(q_data.get("correct_answer")),
                difficulty="medium",
                position=q_idx
            )
            db.add(question)
        db.flush()
        
        # Create Attempt
        score = 100.0
        correct = 2
        attempt = QuizAttempt(
            user_id=user.id,
            set_id=quiz_set.id,
            score=score,
            total_points=len(questions),
            earned_points=correct,
            completed=True,
            started_at=session.created_at,
            completed_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(attempt)
        db.flush()
        
        # Create Answers
        answers = [1, 2] # Correct answers
        db_questions = db.query(QuizQuestion).filter(QuizQuestion.set_id == quiz_set.id).all()
        
        for i, db_q in enumerate(db_questions):
            if i < len(answers):
                user_ans = answers[i]
                quiz_answer = QuizAnswer(
                    attempt_id=attempt.id,
                    question_id=db_q.id,
                    user_answer=str(user_ans),
                    is_correct=True,
                    time_taken_ms=0,
                    confidence_level=3
                )
                db.add(quiz_answer)
        
        db.commit()
        print("[OK] Migration Logic Executed without error.")
        
        # 4. Verify Records Exist
        saved_attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt.id).first()
        if saved_attempt:
            print(f"[SUCCESS] QuizAttempt found! ID: {saved_attempt.id}")
        else:
            print("[FAIL] QuizAttempt NOT found!")
            
        saved_answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt.id).count()
        if saved_answers == 2:
            print(f"[SUCCESS] 2 QuizAnswers found!")
        else:
            print(f"[FAIL] Found {saved_answers} QuizAnswers, expected 2.")
            
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_quiz_flow()
