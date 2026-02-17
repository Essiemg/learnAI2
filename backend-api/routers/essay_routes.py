"""
Essay grading and management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from db import get_db
from auth import get_current_user
from models import User, StudyEvent, Essay
from ml_models import generate_essay_feedback


router = APIRouter(prefix="/essays", tags=["essays"])


class EssayCategory(BaseModel):
    name: str
    score: int
    feedback: str


class EssayFeedback(BaseModel):
    overallScore: int
    categories: List[EssayCategory]
    strengths: List[str]
    improvements: List[str]
    detailedFeedback: str


class EssaySubmission(BaseModel):
    id: str
    title: str
    content: str
    topic: Optional[str] = None
    feedback: EssayFeedback
    created_at: str


class GradeRequest(BaseModel):
    title: str
    content: str
    topic: Optional[str] = None
    grade_level: Optional[int] = None


# In-memory storage for essays (replace with DB table if needed)
# _essay_storage: dict = {}


@router.get("", response_model=List[EssaySubmission])
async def get_essays(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all essay submissions for the current user"""
    essays = (
        db.query(Essay)
        .filter(Essay.user_id == current_user.id)
        .order_by(desc(Essay.created_at))
        .all()
    )
    
    return [
        EssaySubmission(
            id=str(e.id),
            title=e.title,
            content=e.content,
            topic=e.topic,
            feedback=EssayFeedback(**e.feedback) if e.feedback else EssayFeedback(
                overallScore=0, categories=[], strengths=[], improvements=[], detailedFeedback=""
            ),
            created_at=e.created_at.isoformat()
        )
        for e in essays
    ]


@router.post("/grade", response_model=EssaySubmission)
async def grade_essay(
    request: GradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grade an essay using AI"""
    if len(request.content.split()) < 50:
        raise HTTPException(status_code=400, detail="Essay should be at least 50 words")
    
    grade_level = request.grade_level or current_user.grade
    
    # Generate feedback using the AI model
    feedback_data = generate_essay_feedback(
        essay_content=request.content,
        title=request.title,
        grade=grade_level,
        topic=request.topic
    )
    
    # Create new Essay record
    new_essay = Essay(
        user_id=current_user.id,
        title=request.title,
        content=request.content,
        topic=request.topic,
        feedback=feedback_data,
        score=float(feedback_data.get("overallScore", 0))
    )
    
    db.add(new_essay)
    db.commit()
    db.refresh(new_essay)
    
    essay_id = str(new_essay.id)
    
    # NEW: Persist as Study Event for Analytics
    try:
        study_event = StudyEvent(
            user_id=current_user.id,
            event_type="essay",
            subject="General", # Could be inferred?
            topic=request.topic or request.title,
            score=new_essay.score,
            duration_seconds=0, # We don't track writing time yet
            event_data={
                "essay_id": essay_id,
                "title": request.title,
                "feedback": feedback_data
            }
        )
        db.add(study_event)
        db.commit()
    except Exception as e:
        print(f"Failed to log essay study event: {e}")
        # Don't fail the request if logging fails

    
    return EssaySubmission(
        id=essay_id,
        title=new_essay.title,
        content=new_essay.content,
        topic=new_essay.topic,
        feedback=EssayFeedback(**feedback_data),
        created_at=new_essay.created_at.isoformat()
    )


@router.get("/{essay_id}", response_model=EssaySubmission)
async def get_essay(
    essay_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific essay submission"""
    essay = (
        db.query(Essay)
        .filter(Essay.id == essay_id, Essay.user_id == current_user.id)
        .first()
    )
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    return EssaySubmission(
        id=str(essay.id),
        title=essay.title,
        content=essay.content,
        topic=essay.topic,
        feedback=EssayFeedback(**essay.feedback) if essay.feedback else EssayFeedback(
            overallScore=0, categories=[], strengths=[], improvements=[], detailedFeedback=""
        ),
        created_at=essay.created_at.isoformat()
    )


@router.delete("/{essay_id}")
async def delete_essay(
    essay_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an essay submission"""
    essay = (
        db.query(Essay)
        .filter(Essay.id == essay_id, Essay.user_id == current_user.id)
        .first()
    )
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    db.delete(essay)
    db.commit()
    
    return {"status": "deleted"}
