"""Report routes - AI-powered progress reports and feedback."""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
import os

from db import get_db
from models import (
    User, Interaction, QuizAttempt, QuizAnswer, 
    FlashcardSet, Summary, Diagram, StudyEvent
)
from auth import get_current_user

# Try to import Gemini, fallback if not available
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
except ImportError:
    GEMINI_AVAILABLE = False

router = APIRouter(prefix="/reports", tags=["Reports"])


# =============================================================================
# Response Schemas
# =============================================================================

class TopicProgress(BaseModel):
    """Progress for a specific topic."""
    topic: str
    score: float
    attempts: int


class ProgressReport(BaseModel):
    """Complete progress report response."""
    total_quizzes: int
    average_score: float
    total_flashcards: int
    total_summaries: int
    total_diagrams: int
    topics_studied: List[str]
    strengths: List[str]
    areas_for_improvement: List[str]
    ai_feedback: str
    recommendations: List[str]
    study_streak: int
    total_study_time: int  # in minutes
    generated_at: str


# =============================================================================
# Helper Functions
# =============================================================================

def calculate_study_streak(study_events: List, quiz_attempts: List) -> int:
    """Calculate consecutive days of study activity."""
    # Combine dates from both sources
    all_dates = set()
    
    for event in study_events:
        if hasattr(event, 'created_at') and event.created_at:
            all_dates.add(event.created_at.date())
    
    for attempt in quiz_attempts:
        if hasattr(attempt, 'created_at') and attempt.created_at:
            all_dates.add(attempt.created_at.date())
    
    if not all_dates:
        return 0
    
    sorted_dates = sorted(all_dates, reverse=True)
    today = datetime.now().date()
    
    # Check if there's activity today or yesterday
    if sorted_dates[0] < today - timedelta(days=1):
        return 0
    
    streak = 1
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i-1] - sorted_dates[i] == timedelta(days=1):
            streak += 1
        else:
            break
    
    return streak


async def generate_ai_feedback(
    total_quizzes: int,
    average_score: float,
    topics: List[str],
    recent_scores: List[float],
    study_streak: int
) -> str:
    """Generate personalized AI feedback using Gemini."""
    if not GEMINI_AVAILABLE or not os.getenv("GEMINI_API_KEY"):
        # Fallback feedback if Gemini is not available
        return generate_fallback_feedback(average_score, total_quizzes, study_streak)
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""You are Toki, an encouraging AI tutor. Generate a brief, personalized feedback message (2-3 sentences) for a student with these stats:

- Total quizzes completed: {total_quizzes}
- Average score: {average_score:.1f}%
- Topics studied: {', '.join(topics[:5]) if topics else 'None yet'}
- Recent scores: {recent_scores[:5] if recent_scores else 'No recent quizzes'}
- Current study streak: {study_streak} days

Be encouraging, friendly, and give specific, actionable advice. Keep it concise. Use emoji sparingly (1-2 max)."""

        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        return generate_fallback_feedback(average_score, total_quizzes, study_streak)


def generate_fallback_feedback(average_score: float, total_quizzes: int, study_streak: int) -> str:
    """Generate fallback feedback when AI is not available."""
    if total_quizzes == 0:
        return "Welcome! 🎉 Start your learning journey by taking your first quiz. I'm here to help you every step of the way!"
    
    if average_score >= 80:
        return f"Excellent work! 🌟 You're mastering the material with an {average_score:.0f}% average. Keep challenging yourself with new topics!"
    elif average_score >= 60:
        return f"Good progress! You're on the right track with a {average_score:.0f}% average. Focus on reviewing topics where you scored lower to boost your understanding."
    else:
        return f"Keep practicing! Every quiz helps you learn. Try reviewing the material before retaking quizzes, and don't hesitate to ask me questions!"


def generate_recommendations(
    average_score: float,
    total_quizzes: int,
    study_streak: int,
    weak_topics: List[str]
) -> List[str]:
    """Generate personalized study recommendations."""
    recommendations = []
    
    if total_quizzes == 0:
        recommendations.append("📚 Upload a document and take your first quiz to get started!")
        recommendations.append("🎯 Set a goal to complete at least one quiz per day")
        recommendations.append("💡 Use the AI Tutor to ask questions about any topic")
    elif total_quizzes < 5:
        recommendations.append("📈 Take more quizzes to build a reliable performance profile")
        recommendations.append("🔄 Try using flashcards to reinforce what you learn")
    
    if average_score < 60 and total_quizzes > 0:
        recommendations.append("📖 Review the material before retaking quizzes")
        recommendations.append("🔄 Use the AI Tutor to ask questions about confusing topics")
        if weak_topics:
            recommendations.append(f"🎯 Focus on improving: {', '.join(weak_topics[:2])}")
    elif average_score < 80 and total_quizzes > 0:
        recommendations.append("🎯 Focus on topics where you scored below 70%")
        recommendations.append("💡 Try explaining concepts in your own words to the AI Tutor")
    elif total_quizzes > 0:
        recommendations.append("🚀 Challenge yourself with more advanced topics")
        recommendations.append("📝 Try creating summaries to deepen understanding")
    
    if study_streak == 0:
        recommendations.append("🔥 Start a study streak by studying every day!")
    elif study_streak < 7:
        recommendations.append(f"🔥 You're on a {study_streak}-day streak! Keep it going!")
    else:
        recommendations.append(f"🏆 Amazing {study_streak}-day streak! You're building great habits!")
    
    return recommendations[:5]


def analyze_strengths_weaknesses(quiz_attempts: List, average_score: float) -> tuple:
    """Analyze user's strengths and areas for improvement."""
    strengths = []
    weaknesses = []
    
    if not quiz_attempts:
        return ["Take your first quiz to discover your strengths!"], ["Start learning to identify areas to focus on"]
    
    # Count high and low scores
    high_scores = [a for a in quiz_attempts if hasattr(a, 'score') and a.score and a.score >= 80]
    low_scores = [a for a in quiz_attempts if hasattr(a, 'score') and a.score and a.score < 60]
    
    if len(high_scores) > 0:
        strengths.append(f"✅ Strong performance: scored 80%+ on {len(high_scores)} quiz(es)")
    
    if average_score >= 70:
        strengths.append("✅ Consistent learner with solid understanding")
    
    if len(quiz_attempts) >= 5:
        strengths.append("✅ Active engagement with practice quizzes")
    
    if len(low_scores) > 0:
        weaknesses.append(f"📚 Review needed: {len(low_scores)} quiz(es) scored below 60%")
    
    if average_score < 60 and len(quiz_attempts) >= 3:
        weaknesses.append("📖 Consider reviewing material before quizzes")
    
    if not strengths:
        strengths = ["Keep taking quizzes to identify your strengths!"]
    
    if not weaknesses:
        weaknesses = ["Great job! Keep up the excellent work!"]
    
    return strengths, weaknesses


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/progress", response_model=ProgressReport)
async def generate_progress_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a comprehensive AI-powered progress report.
    
    Returns detailed statistics, AI feedback, and personalized recommendations.
    """
    user_id = current_user.id
    
    # Fetch quiz attempts
    quiz_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(desc(QuizAttempt.created_at))
        .all()
    )
    
    # Fetch flashcard sets
    flashcard_sets = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.user_id == user_id)
        .all()
    )
    
    # Fetch summaries
    summaries = (
        db.query(Summary)
        .filter(Summary.user_id == user_id)
        .all()
    )
    
    # Fetch diagrams
    diagrams = (
        db.query(Diagram)
        .filter(Diagram.user_id == user_id)
        .all()
    )
    
    # Fetch study events
    study_events = (
        db.query(StudyEvent)
        .filter(StudyEvent.user_id == user_id)
        .order_by(desc(StudyEvent.created_at))
        .all()
    )
    
    # Calculate statistics
    total_quizzes = len(quiz_attempts)
    
    # Calculate average score
    scores = [a.score for a in quiz_attempts if hasattr(a, 'score') and a.score is not None]
    average_score = sum(scores) / len(scores) if scores else 0.0
    
    # Get recent scores for AI feedback
    recent_scores = scores[:10] if scores else []
    
    # Extract topics
    topics_set = set()
    for attempt in quiz_attempts:
        if hasattr(attempt, 'quiz_set') and attempt.quiz_set:
            if hasattr(attempt.quiz_set, 'topic') and attempt.quiz_set.topic:
                topics_set.add(attempt.quiz_set.topic)
            if hasattr(attempt.quiz_set, 'title') and attempt.quiz_set.title:
                topics_set.add(attempt.quiz_set.title)
    
    topics_studied = list(topics_set)[:10]
    
    # Calculate study streak
    study_streak = calculate_study_streak(study_events, quiz_attempts)
    
    # Calculate total study time (estimate from quiz attempts and study events)
    total_study_time = 0
    for event in study_events:
        if hasattr(event, 'duration') and event.duration:
            total_study_time += event.duration
    # Add estimated time per quiz (5 mins average)
    total_study_time += total_quizzes * 5
    
    # Analyze strengths and weaknesses
    strengths, weaknesses = analyze_strengths_weaknesses(quiz_attempts, average_score)
    
    # Find weak topics
    weak_topics = []
    for attempt in quiz_attempts:
        if hasattr(attempt, 'score') and attempt.score and attempt.score < 60:
            if hasattr(attempt, 'quiz_set') and attempt.quiz_set:
                if hasattr(attempt.quiz_set, 'topic') and attempt.quiz_set.topic:
                    weak_topics.append(attempt.quiz_set.topic)
    weak_topics = list(set(weak_topics))[:3]
    
    # Generate AI feedback
    ai_feedback = await generate_ai_feedback(
        total_quizzes=total_quizzes,
        average_score=average_score,
        topics=topics_studied,
        recent_scores=recent_scores,
        study_streak=study_streak
    )
    
    # Generate recommendations
    recommendations = generate_recommendations(
        average_score=average_score,
        total_quizzes=total_quizzes,
        study_streak=study_streak,
        weak_topics=weak_topics
    )
    
    return ProgressReport(
        total_quizzes=total_quizzes,
        average_score=round(average_score, 1),
        total_flashcards=len(flashcard_sets),
        total_summaries=len(summaries),
        total_diagrams=len(diagrams),
        topics_studied=topics_studied,
        strengths=strengths,
        areas_for_improvement=weaknesses,
        ai_feedback=ai_feedback,
        recommendations=recommendations,
        study_streak=study_streak,
        total_study_time=total_study_time,
        generated_at=datetime.now().isoformat()
    )


@router.get("/summary")
async def get_quick_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a quick summary of user's learning stats."""
    user_id = current_user.id
    
    # Quick counts
    quiz_count = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.user_id == user_id
    ).scalar() or 0
    
    flashcard_count = db.query(func.count(FlashcardSet.id)).filter(
        FlashcardSet.user_id == user_id
    ).scalar() or 0
    
    summary_count = db.query(func.count(Summary.id)).filter(
        Summary.user_id == user_id
    ).scalar() or 0
    
    diagram_count = db.query(func.count(Diagram.id)).filter(
        Diagram.user_id == user_id
    ).scalar() or 0
    
    # Average quiz score
    avg_score = db.query(func.avg(QuizAttempt.score)).filter(
        QuizAttempt.user_id == user_id
    ).scalar() or 0
    
    return {
        "total_quizzes": quiz_count,
        "total_flashcards": flashcard_count,
        "total_summaries": summary_count,
        "total_diagrams": diagram_count,
        "average_score": round(float(avg_score), 1)
    }
