"""
Essay grading and management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import uuid4
from datetime import datetime
import json

from db import get_db
from auth import get_current_user
from models import User
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
_essay_storage: dict = {}


@router.get("", response_model=List[EssaySubmission])
async def get_essays(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all essay submissions for the current user"""
    user_essays = _essay_storage.get(str(current_user.id), [])
    return user_essays


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
    
    essay_id = str(uuid4())
    submission = EssaySubmission(
        id=essay_id,
        title=request.title,
        content=request.content,
        topic=request.topic,
        feedback=EssayFeedback(**feedback_data),
        created_at=datetime.utcnow().isoformat()
    )
    
    # Store essay
    user_id = str(current_user.id)
    if user_id not in _essay_storage:
        _essay_storage[user_id] = []
    _essay_storage[user_id].insert(0, submission.model_dump())
    
    return submission


@router.get("/{essay_id}", response_model=EssaySubmission)
async def get_essay(
    essay_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific essay submission"""
    user_essays = _essay_storage.get(str(current_user.id), [])
    for essay in user_essays:
        if essay["id"] == essay_id:
            return essay
    raise HTTPException(status_code=404, detail="Essay not found")


@router.delete("/{essay_id}")
async def delete_essay(
    essay_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an essay submission"""
    user_id = str(current_user.id)
    if user_id in _essay_storage:
        _essay_storage[user_id] = [
            e for e in _essay_storage[user_id] if e["id"] != essay_id
        ]
    return {"status": "deleted"}
