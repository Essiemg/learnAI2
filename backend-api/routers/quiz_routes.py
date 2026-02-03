"""Quiz routes - Quiz generation and management."""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import get_db
from models import User, QuizSession
from schemas import QuizGenerateRequest, QuizSessionResponse, QuizSubmit
from auth import get_current_user
from ml_models import generate_quiz_questions

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
    
    # Create quiz session
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
