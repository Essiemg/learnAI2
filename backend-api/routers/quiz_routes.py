"""Quiz routes - Quiz generation and management."""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import get_db
from db import get_db
from models import (
    User, QuizSession, StudyEvent, 
    QuizSet, QuizQuestion, QuizAttempt, QuizAnswer
)
from schemas import QuizGenerateRequest, QuizSessionResponse, QuizSubmit, QuizProgressUpdate
from auth import get_current_user
from ml_models import generate_quiz_questions
from services.analytics_service import update_mastery_from_quiz


router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.get("", response_model=List[QuizSessionResponse])
async def get_quiz_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20
):
    """Get all quiz sessions for the current user."""
    sessions = (
        db.query(QuizSession)
        .filter(QuizSession.user_id == current_user.id)
        .order_by(desc(QuizSession.created_at))
        .limit(limit)
        .all()
    )
    return sessions


@router.post("/generate", response_model=QuizSessionResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new quiz on a topic."""
    # Generate questions using AI (with optional material content)
    questions = generate_quiz_questions(
        topic=request.topic,
        num_questions=request.num_questions,
        grade=current_user.grade,
        material_content=request.material_content
    )
    
    # Create quiz session (Legacy/Session tracking)
    session = QuizSession(
        user_id=current_user.id,
        topic=request.topic,
        questions=questions,
        answers=[],
        completed=False
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # NEW: Create persistent QuizSet immediately so it appears in Library
    try:
        quiz_set = QuizSet(
            user_id=current_user.id,
            title=f"Quiz on {request.topic}" if request.topic else "General Quiz",
            description=f"AI generated quiz for {request.topic}",
            topic=request.topic or "General",
            subject=request.topic or "General", 
            question_count=len(questions),
            created_at=session.created_at 
        )
        db.add(quiz_set)
        db.flush() 

        # Create Questions for this set
        for q_idx, q_data in enumerate(questions):
            question = QuizQuestion(
                set_id=quiz_set.id,
                question_text=q_data.get("question", "Question Text"),
                options=q_data.get("options", []),
                correct_answer=str(q_data.get("correct_answer", "")),
                difficulty="medium", 
                position=q_idx
            )
            db.add(question)
        
        # We can link the session to the set if needed, but for now we just ensure existence
        # Could add set_id to QuizSession if we modify model, but let's keep loosely coupled for now
        
        db.commit()
    except Exception as e:
        print(f"Error creating QuizSet persistence: {e}")
        # Non-blocking, but good to know
    
    return session


@router.get("/{quiz_id}", response_model=QuizSessionResponse)
async def get_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific quiz session."""
    session = (
        db.query(QuizSession)
        .filter(QuizSession.id == quiz_id, QuizSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    return session
    
    
@router.put("/{quiz_id}/progress", response_model=QuizSessionResponse)
async def update_quiz_progress(
    quiz_id: UUID,
    update: QuizProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update quiz progress (answers) without submitting."""
    session = (
        db.query(QuizSession)
        .filter(QuizSession.id == quiz_id, QuizSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if session.completed:
        raise HTTPException(status_code=400, detail="Quiz already submitted")
        
    # Update answers (partial or full list state)
    session.answers = update.answers
    # Could also update current_index if we tracked it in DB, but frontend handles that via answers length usually
    
    db.commit()
    db.refresh(session)
    return session


@router.post("/{quiz_id}/submit", response_model=QuizSessionResponse)
async def submit_quiz(
    quiz_id: UUID,
    submission: QuizSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit answers for a quiz."""
    session = (
        db.query(QuizSession)
        .filter(QuizSession.id == quiz_id, QuizSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    if session.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz already submitted"
        )
    
    # Calculate score
    questions = session.questions or []
    answers = submission.answers
    
    if len(answers) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected {len(questions)} answers, got {len(answers)}"
        )
    
    correct = 0
    for i, question in enumerate(questions):
        if i < len(answers) and answers[i] == question.get("correct_answer"):
            correct += 1
    
    score = (correct / len(questions)) * 100 if questions else 0
    
    
    # Update session
    session.answers = answers
    session.score = score
    session.completed = True
    
    db.commit()
    db.refresh(session)
    
    # Log study event
    event = StudyEvent(
        user_id=current_user.id,
        event_type="quiz_completion",
        subject=session.topic or session.title,  # Using topic as subject
        topic=session.topic,
        duration_seconds=0,  # Could calculate if we tracked start time in request
        score=score,
        event_data={
            "quiz_id": str(quiz_id),
            "total_questions": len(questions),
            "correct_answers": correct
        }
    )
    db.add(event)
    db.commit()

    # -------------------------------------------------------------------------
    # ANALYTICS & REPORTING MIGRATION
    # -------------------------------------------------------------------------
    try:
        # Check if QuizSet exists (match by created_at which was synced during generate)
        quiz_set = (
            db.query(QuizSet)
            .filter(
                QuizSet.user_id == current_user.id,
                QuizSet.created_at == session.created_at
            )
            .first()
        )

        if not quiz_set:
            # Fallback: Create new QuizSet if not found (e.g. legacy session)
            quiz_set = QuizSet(
                user_id=current_user.id,
                title=f"Quiz on {session.topic}" if session.topic else "General Quiz",
                topic=session.topic or "General",
                subject=session.topic or "General", 
                question_count=len(questions),
                created_at=session.created_at 
            )
            db.add(quiz_set)
            db.flush() 

            # Create Questions for this set
            for q_idx, q_data in enumerate(questions):
                question = QuizQuestion(
                    set_id=quiz_set.id,
                    question_text=q_data.get("question", "Question Text"),
                    options=q_data.get("options", []),
                    correct_answer=str(q_data.get("correct_answer", "")),
                    difficulty="medium", 
                    position=q_idx
                )
                db.add(question)
            db.flush()
        
        # 2. Create QuizAttempt
        attempt = QuizAttempt(
            user_id=current_user.id,
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

        # 3. Create QuizAnswers
        # Retrieve the questions we just created (ordered by position/insertion to match answers)
        db_questions = db.query(QuizQuestion).filter(QuizQuestion.set_id == quiz_set.id).all()
        # Ensure we sort by ID or insert order if position isn't reliable, but flush should keep order
        
        for i, db_q in enumerate(db_questions):
            if i < len(answers):
                user_ans = answers[i]
                
                is_correct = False
                try:
                    if str(user_ans) == str(db_q.correct_answer):
                        is_correct = True
                except:
                    pass

                quiz_answer = QuizAnswer(
                    attempt_id=attempt.id,
                    question_id=db_q.id,
                    user_answer=str(user_ans),
                    is_correct=is_correct,
                    # NEW ANALYTICS FIELDS
                    time_taken_ms=0, # Frontend doesn't send this yet
                    confidence_level=3 # Neutral default
                )
                db.add(quiz_answer)

        # 4. Update Mastery
        update_mastery_from_quiz(
            db=db,
            user_id=current_user.id,
            subject=session.topic, # Using topic as subject proxy
            topic=session.topic,
            score_percent=score
        )
        
        db.commit()

    except Exception as e:
        import traceback
        print(f"Error migrating quiz to analytics tables: {e}")
        traceback.print_exc()
        # We generally want to ensure the session is saved even if analytics fail,
        # but since Dashboard relies on Analytics, this is critical.
        # Consider logging effectively.
        # db.rollback() # Logic above committed earlier partials? No.
        
    return session




@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a quiz session."""
    session = (
        db.query(QuizSession)
        .filter(QuizSession.id == quiz_id, QuizSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    db.delete(session)
    db.commit()
    
    return None
