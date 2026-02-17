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
    FlashcardSet, FlashcardSession, Summary, Diagram, StudyEvent,
    UserTopicState, LearningPattern, Essay
)

from auth import get_current_user
from ml_models import generate_report_feedback

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
    total_essays: int
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
    student_profile: dict
) -> str:
    """Generate personalized AI feedback using local model."""
    try:
        return generate_report_feedback(student_profile)

    except Exception as e:
        print(f"Feedback generation error: {e}")
        # Fallback using basic stats from profile
        return generate_fallback_feedback(
            student_profile.get("average_score", 0),
            student_profile.get("total_quizzes", 0),
            student_profile.get("study_streak", 0)
        )



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


def generate_mock_progress_report() -> ProgressReport:
    """Generate a realistic mock progress report for demonstration/new users."""
    return ProgressReport(
        total_quizzes=8,
        average_score=85.5,
        total_flashcards=25,
        total_summaries=5,
        total_diagrams=2,
        total_essays=3,
        topics_studied=["Introduction to AI", "Photosynthesis", "World War II", "Algebra Basics"],
        strengths=[
            "✅ Strong performance: scored 80%+ on 6 quiz(es)",
            "✅ Consistent learner with solid understanding",
            "✅ Active engagement with practice quizzes"
        ],
        areas_for_improvement=[
            "📚 Review needed: 1 quiz(es) scored below 60%",
            "📖 Consider reviewing material before quizzes"
        ],
        ai_feedback=(
            "Based on your recent activity, you're showing great promise! "
            "Your mastery of 'Introduction to AI' is impressive with a 92% average. "
            "However, I noticed some struggle with 'Algebra Basics'. "
            "Try using the Flashcards feature to reinforce those concepts. "
            "Keep up the 5-day streak, consistency is key!"
        ),
        recommendations=[
            "🚀 Challenge yourself with more advanced Algebra topics",
            "📝 Try creating summaries for 'World War II' to deepen understanding",
            "🔥 You're on a 5-day streak! Keep it going!",
            "💡 Use the AI Tutor to ask questions about 'Algebra Basics'"
        ],
        study_streak=5,
        total_study_time=125,
        generated_at=datetime.now().isoformat()
    )


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
    # Fetch flashcard sessions (using legacy model as per flashcard_routes)
    flashcard_sessions = (
        db.query(FlashcardSession)
        .filter(FlashcardSession.user_id == user_id)
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

    # Fetch essays
    essays = (
        db.query(Essay)
        .filter(Essay.user_id == user_id)
        .all()
    )
    
    # Fetch study events
    study_events = (
        db.query(StudyEvent)
        .filter(StudyEvent.user_id == user_id)
        .order_by(desc(StudyEvent.created_at))
        .order_by(desc(StudyEvent.created_at))
        .all()
    )
    
    # Calculate statistics
    total_quizzes = len(quiz_attempts)
    
    # CHECK FOR EMPTY DATA - RETURN MOCK REPORT
    # if total_quizzes == 0 and len(study_events) == 0:
    #     return generate_mock_progress_report()
    
    # Calculate average score
    scores = [a.score for a in quiz_attempts if hasattr(a, 'score') and a.score is not None]
    average_score = sum(scores) / len(scores) if scores else 0.0
    
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
    
    # Calculate total study time (estimate)
    total_study_time = 0
    for event in study_events:
        if hasattr(event, 'duration') and event.duration:
            total_study_time += event.duration
    total_study_time += total_quizzes * 5
    
    # Analyze strengths and weaknesses
    strengths, weaknesses = analyze_strengths_weaknesses(quiz_attempts, average_score)
    
    # Find weak topics for recommendations
    weak_topics = []

    for attempt in quiz_attempts:
        if hasattr(attempt, 'score') and attempt.score and attempt.score < 60:
            if hasattr(attempt, 'quiz_set') and attempt.quiz_set:
                if hasattr(attempt.quiz_set, 'topic') and attempt.quiz_set.topic:
                    weak_topics.append(attempt.quiz_set.topic)
    weak_topics = list(set(weak_topics))[:3]

    
    # -------------------------------------------------------------------------
    # ADVANCED METRICS AGGREGATION
    # -------------------------------------------------------------------------
    
    # 1. Essay Performance
    essay_events = [e for e in study_events if e.event_type == "essay"]
    essay_scores = [e.score for e in essay_events if e.score is not None]
    avg_essay_score = sum(essay_scores) / len(essay_scores) if essay_scores else 0.0
    
    # 2. Topic Mastery (from UserTopicState)
    topic_states = db.query(UserTopicState).filter(UserTopicState.user_id == user_id).all()
    mastered_topics = [t.topic for t in topic_states if t.mastery_level >= 80]
    struggling_topics = [t.topic for t in topic_states if t.mastery_level < 50]
    
    # 3. Learning Patterns
    patterns = db.query(LearningPattern).filter(LearningPattern.user_id == user_id).all()
    detected_patterns = [p.pattern_type for p in patterns]
    
    # 4. Engagement / Effort
    interactions = db.query(Interaction).filter(Interaction.user_id == user_id).all()
    total_hints = sum([i.hints_used or 0 for i in interactions])
    
    # Construct Detailed Student Profile
    student_profile = {
        "name": current_user.name,
        "grade": current_user.grade,
        "total_quizzes": total_quizzes,
        "average_quiz_score": average_score,
        "total_essays": len(essay_events),
        "average_essay_score": avg_essay_score,
        "study_streak": study_streak,
        "topics_studied": list(topics_set),
        "mastered_topics": mastered_topics,
        "struggling_topics": struggling_topics,
        "learning_patterns": detected_patterns,
        "total_hints_used": total_hints,
        "recent_quiz_scores": scores[:5] if scores else [],
        "recent_essay_scores": essay_scores[:3] if essay_scores else []
    }

    # Generate AI feedback
    ai_feedback = await generate_ai_feedback(student_profile)

    
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
        total_flashcards=len(flashcard_sessions),
        total_summaries=len(summaries),
        total_diagrams=len(diagrams),
        total_essays=len(essays),
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
    
    flashcard_count = db.query(func.count(FlashcardSession.id)).filter(
        FlashcardSession.user_id == user_id
    ).scalar() or 0
    
    summary_count = db.query(func.count(Summary.id)).filter(
        Summary.user_id == user_id
    ).scalar() or 0
    
    diagram_count = db.query(func.count(Diagram.id)).filter(
        Diagram.user_id == user_id
    ).scalar() or 0
    
    # -------------------------------------------------------------------------
    # REAL DATA ONLY
    # -------------------------------------------------------------------------
    
    # Average quiz score
    
    # Average quiz score
    
    # Average quiz score
    avg_score = db.query(func.avg(QuizAttempt.score)).filter(
        QuizAttempt.user_id == user_id
    ).scalar() or 0
    
    # Tutor sessions (Interactions)
    tutor_sessions = db.query(func.count(Interaction.id)).filter(
        Interaction.user_id == user_id
    ).scalar() or 0

    return {
        "total_quizzes": quiz_count,
        "total_flashcards": flashcard_count,
        "total_summaries": summary_count,
        "total_diagrams": diagram_count,
        "average_score": round(float(avg_score), 1),
        "tutor_sessions": tutor_sessions
    }
