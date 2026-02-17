"""Admin routes - System administration and analytics."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from db import get_db
from models import User, StudyEvent, Interaction, QuizAttempt, FlashcardSet, Session as UserSession
from auth import get_current_user, require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# =============================================================================
# Response Schemas
# =============================================================================

class SystemStats(BaseModel):
    total_users: int
    active_users_24h: int
    total_quizzes: int
    total_flashcards: int
    total_interactions: int
    total_study_time_hours: float

class UserSummary(BaseModel):
    id: str
    name: str
    email: str
    role: str
    grade: int
    created_at: datetime
    last_active: Optional[datetime]
    stats: dict

class ActivityLog(BaseModel):
    id: str
    user_name: str
    event_type: str
    details: str
    created_at: datetime


# =============================================================================
# Routes
# =============================================================================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get overall system statistics."""
    
    # User stats
    total_users = db.query(User).count()
    
    yesterday = datetime.utcnow() - timedelta(days=1)
    active_users = db.query(UserSession.user_id).filter(
        UserSession.started_at >= yesterday
    ).distinct().count() or 0
    
    # Activity stats
    total_quizzes = db.query(QuizAttempt).count()
    total_flashcards = db.query(FlashcardSet).count()
    total_interactions = db.query(Interaction).count()
    
    # Study time
    total_seconds = db.query(func.sum(StudyEvent.duration_seconds)).scalar() or 0
    total_hours = round(total_seconds / 3600, 1)
    
    return SystemStats(
        total_users=total_users,
        active_users_24h=active_users,
        total_quizzes=total_quizzes,
        total_flashcards=total_flashcards,
        total_interactions=total_interactions,
        total_study_time_hours=total_hours
    )

@router.get("/users", response_model=List[UserSummary])
async def get_users_list(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get list of users with summary stats."""
    users = db.query(User).order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    
    result = []
    for user in users:
        # Get last activity
        last_event = db.query(StudyEvent).filter(
            StudyEvent.user_id == user.id
        ).order_by(desc(StudyEvent.created_at)).first()
        
        last_active = last_event.created_at if last_event else user.created_at
        
        # User stats
        quiz_count = db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id).count()
        flashcard_count = db.query(FlashcardSet).filter(FlashcardSet.user_id == user.id).count()
        
        result.append(UserSummary(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role or "student",
            grade=user.grade,
            created_at=user.created_at,
            last_active=last_active,
            stats={
                "quizzes": quiz_count,
                "flashcards": flashcard_count
            }
        ))
        
    return result

@router.get("/activity", response_model=List[ActivityLog])
async def get_activity_log(
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get global activity log."""
    events = db.query(StudyEvent).order_by(desc(StudyEvent.created_at)).limit(limit).all()
    
    result = []
    for event in events:
        user_name = event.user.name if event.user else "Unknown"
        details = ""
        
        if event.event_type == "quiz_completion":
            details = f"Score: {event.score}%" if event.score is not None else "Completed"
        elif event.event_type == "flashcard_generation":
            details = f"Topic: {event.topic}"
        elif event.event_type == "chat_session":
            details = "Chatted with AI Tutor"
        else:
            details = event.topic or event.subject or ""
            
        result.append(ActivityLog(
            id=str(event.id),
            user_name=user_name,
            event_type=event.event_type,
            details=details,
            created_at=event.created_at
        ))
        
    
    return result

@router.get("/export-report")
async def export_report(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Generate and export a CSV report of user activity.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    # Query all users with their stats
    users = db.query(User).all()
    
    # Prepare CSV data in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["User ID", "Name", "Email", "Role", "Grade", "Joined Date", "Total Quizzes", "Total Flashcards", "Last Active"])
    
    for user in users:
        # Get counts
        quiz_count = db.query(StudyEvent).filter(
            StudyEvent.user_id == user.id, 
            StudyEvent.event_type == "quiz_completion"
        ).count()
        
        flashcard_count = db.query(StudyEvent).filter(
            StudyEvent.user_id == user.id, 
            StudyEvent.event_type == "flashcard_generation"
        ).count()
        
        # Get last active date
        last_event = db.query(StudyEvent).filter(
            StudyEvent.user_id == user.id
        ).order_by(StudyEvent.created_at.desc()).first()
        
        last_active = last_event.created_at.strftime("%Y-%m-%d %H:%M:%S") if last_event else "Never"
        
        writer.writerow([
            str(user.id),
            user.name,
            user.email,
            user.role,
            user.grade,
            user.created_at.strftime("%Y-%m-%d"),
            quiz_count,
            flashcard_count,
            last_active
        ])
    
    output.seek(0)
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=user_activity_report.csv"
    
    return response


# =============================================================================
# Analytics Routes
# =============================================================================

@router.get("/stats/trends")
async def get_activity_trends(
    days: int = 7,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get activity trends for the last N days.
    Returns daily counts of quizzes, flashcards, and interactions.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Fetching activity trends for last {days} days")
    
    trends = []
    end_date = datetime.utcnow()
    
    for i in range(days):
        # Calculate start and end of the day (going backwards)
        current_day = end_date - timedelta(days=days - 1 - i)
        day_start = current_day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = current_day.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Count quizzes
        quizzes = db.query(QuizAttempt).filter(
            QuizAttempt.started_at >= day_start,
            QuizAttempt.started_at <= day_end
        ).count()
        
        # Count flashcards
        flashcards = db.query(FlashcardSet).filter(
            FlashcardSet.created_at >= day_start,
            FlashcardSet.created_at <= day_end
        ).count()
        
        # Count interactions (chat, etc.)
        interactions = db.query(Interaction).filter(
            Interaction.created_at >= day_start,
            Interaction.created_at <= day_end
        ).count()
        
        trends.append({
            "name": current_day.strftime("%a"), # Mon, Tue, etc.
            "date": current_day.strftime("%Y-%m-%d"),
            "quizzes": quizzes,
            "flashcards": flashcards,
            "interactions": interactions
        })
        
    return trends


@router.get("/stats/roles")
async def get_role_distribution(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get distribution of users by role.
    """
    from sqlalchemy import func
    
    # Query count by role
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Fetching role distribution")
    
    results = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    logger.info(f"Role distribution results: {results}")
    
    # Format for frontend
    distribution = []
    colors = {
        "student": "#0088FE",
        "parent": "#00C49F",
        "admin": "#FFBB28",
        "teacher": "#FF8042"
    }
    
    for role, count in results:
        role_name = role or "student" # Default to student if None
        distribution.append({
            "name": role_name.capitalize() + "s",
            "value": count,
            "color": colors.get(role_name, "#8884d8")
        })
        
    return distribution
