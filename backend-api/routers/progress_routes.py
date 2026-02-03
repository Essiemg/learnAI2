"""Progress routes - Learning analytics and stats."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from db import get_db
from models import User, Interaction
from schemas import ProgressResponse, SubjectStats
from auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("", response_model=ProgressResponse)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50  # Number of recent interactions to consider
):
    """
    Get learning progress statistics.
    
    Returns:
    - recent_accuracy: Average accuracy from last N interactions
    - avg_time_spent: Average time spent per interaction (seconds)
    - total_interactions: Total number of tutoring interactions
    - weak_subjects: Subjects with lowest accuracy
    """
    # Get recent interactions for this user
    recent_interactions = (
        db.query(Interaction)
        .filter(Interaction.user_id == current_user.id)
        .order_by(desc(Interaction.created_at))
        .limit(limit)
        .all()
    )
    
    if not recent_interactions:
        return ProgressResponse(
            recent_accuracy=0.0,
            avg_time_spent=0.0,
            total_interactions=0,
            weak_subjects=[]
        )
    
    # Calculate overall stats
    total_accuracy = sum(i.recent_accuracy for i in recent_interactions)
    total_time = sum(i.time_spent for i in recent_interactions)
    count = len(recent_interactions)
    
    recent_accuracy = total_accuracy / count if count > 0 else 0.0
    avg_time_spent = total_time / count if count > 0 else 0.0
    
    # Get total interactions count
    total_interactions = (
        db.query(func.count(Interaction.id))
        .filter(Interaction.user_id == current_user.id)
        .scalar()
    )
    
    # Get per-subject stats
    subject_stats = (
        db.query(
            Interaction.subject,
            func.avg(Interaction.recent_accuracy).label("accuracy"),
            func.count(Interaction.id).label("total")
        )
        .filter(Interaction.user_id == current_user.id)
        .group_by(Interaction.subject)
        .all()
    )
    
    # Find weak subjects (lowest accuracy)
    weak_subjects: List[SubjectStats] = []
    for stat in sorted(subject_stats, key=lambda x: x.accuracy or 0):
        weak_subjects.append(SubjectStats(
            subject=stat.subject,
            accuracy=float(stat.accuracy or 0),
            total_interactions=stat.total
        ))
    
    # Return only bottom 5 weak subjects
    weak_subjects = weak_subjects[:5]
    
    return ProgressResponse(
        recent_accuracy=recent_accuracy,
        avg_time_spent=avg_time_spent,
        total_interactions=total_interactions,
        weak_subjects=weak_subjects
    )


@router.get("/subjects")
async def get_subject_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed breakdown by subject."""
    subject_stats = (
        db.query(
            Interaction.subject,
            func.avg(Interaction.recent_accuracy).label("accuracy"),
            func.avg(Interaction.time_spent).label("avg_time"),
            func.avg(Interaction.mistakes).label("avg_mistakes"),
            func.count(Interaction.id).label("total")
        )
        .filter(Interaction.user_id == current_user.id)
        .group_by(Interaction.subject)
        .all()
    )
    
    return [
        {
            "subject": stat.subject,
            "accuracy": float(stat.accuracy or 0),
            "avg_time": float(stat.avg_time or 0),
            "avg_mistakes": float(stat.avg_mistakes or 0),
            "total_interactions": stat.total
        }
        for stat in subject_stats
    ]


@router.get("/history")
async def get_interaction_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    """Get paginated interaction history."""
    interactions = (
        db.query(Interaction)
        .filter(Interaction.user_id == current_user.id)
        .order_by(desc(Interaction.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": str(i.id),
            "subject": i.subject,
            "question": i.question[:100] + "..." if len(i.question) > 100 else i.question,
            "strategy": i.strategy,
            "accuracy": i.recent_accuracy,
            "created_at": i.created_at.isoformat()
        }
        for i in interactions
    ]
