"""
Analytics Service
================
Handles calculation of learning metrics including:
- Concept Mastery Levels (0-100%)
- Retention Scores (Spaced Repetition Decay)
- Learning Pattern Detection
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
import math

from models import (
    User, UserTopicState, QuizAttempt, StudyEvent, 
    Interaction, LearningPattern, QuizAnswer
)

# Constants for Spaced Repetition (SuperMemo-2 inspired)
MIN_RETENTION_SCORE = 0.0
MAX_RETENTION_SCORE = 1.0
DECAY_RATE_INITIAL = 0.90  # Daily retention multiplier for new items


def update_mastery_from_quiz(
    db: Session, 
    user_id: str, 
    subject: str, 
    topic: str, 
    score_percent: float,
    difficulty: str = "medium"
):
    """
    Update topic mastery level based on a new quiz score.
    Uses a moving average weighted by difficulty.
    """
    topic_state = db.query(UserTopicState).filter(
        UserTopicState.user_id == user_id,
        UserTopicState.subject == subject,
        UserTopicState.topic == topic
    ).first()

    if not topic_state:
        topic_state = UserTopicState(
            user_id=user_id,
            subject=subject,
            topic=topic,
            mastery_level=50.0 # Start neutral
        )
        db.add(topic_state)

    # Weight factors
    difficulty_weight = {
        "easy": 0.8,
        "medium": 1.0, 
        "hard": 1.2
    }.get(difficulty, 1.0)
    
    # Calculate impact
    # If score is higher than current mastery, boost it
    # If score is lower, reduce it
    current_mastery = topic_state.mastery_level
    
    # Simple learning rate for updates (higher for lower mastery)
    learning_rate = 0.2 if current_mastery < 80 else 0.1
    
    target_score = score_percent * difficulty_weight
    
    # Cap target score at 100
    if target_score > 100: target_score = 100
    
    new_mastery = current_mastery + learning_rate * (target_score - current_mastery)
    
    # Ensure bounds
    topic_state.mastery_level = max(0.0, min(100.0, new_mastery))
    topic_state.last_assessed_at = datetime.utcnow()
    
    # Update retention (reset decay on practice)
    update_retention(topic_state, score_percent)
    
    db.commit()
    db.refresh(topic_state)
    return topic_state


def update_retention(topic_state: UserTopicState, performance_quality: float):
    """
    Update retention score and schedule next review.
    Performance quality: 0-100 score on assessment.
    """
    # Simply reset retention to 1.0 on recent practice
    # Real Spaced Repetition would be more complex (setting next_review_at)
    topic_state.retention_score = 1.0
    
    # Schedule next review based on mastery
    # Higher mastery = longer interval
    interval_days = 1
    if topic_state.mastery_level > 80:
        interval_days = 7
    elif topic_state.mastery_level > 60:
        interval_days = 3
    else:
        interval_days = 1
        
    topic_state.next_review_at = datetime.utcnow() + timedelta(days=interval_days)


def calculate_retention_decay(db: Session, user_id: str):
    """
    Batch update retention scores based on time elapsed since last assessment.
    Should be called periodically or before generating reports.
    """
    states = db.query(UserTopicState).filter(
        UserTopicState.user_id == user_id
    ).all()
    
    now = datetime.utcnow()
    
    for state in states:
        if not state.last_assessed_at:
            continue
            
        days_elapsed = (now - state.last_assessed_at).days
        if days_elapsed > 0:
            # Simple exponential decay
            # Retention = Initial * (DecayRate ^ Days)
            # High mastery decays slower (e.g., 0.98) vs low mastery (0.90)
            
            decay_rate = 0.90 + (state.mastery_level / 1000.0) # 0.90 to 1.0
            new_retention = 1.0 * (decay_rate ** days_elapsed)
            state.retention_score = max(0.0, new_retention)
            
    db.commit()


def analyze_learning_patterns(db: Session, user_id: str):
    """
    Detect leaning style patterns based on interactions and event data.
    """
    # 1. Check for "Visual Learner"
    # Logic: High engagement/scores with Diagrams vs Text
    diagram_events = db.query(StudyEvent).filter(
        StudyEvent.user_id == user_id,
        StudyEvent.event_type == "diagram"
    ).count()
    
    if diagram_events > 5:
        # Check if we already tagged this
        existing = db.query(LearningPattern).filter(
            LearningPattern.user_id == user_id,
            LearningPattern.pattern_type == "VisualLearner"
        ).first()
        
        if not existing:
            new_pattern = LearningPattern(
                user_id=user_id,
                pattern_type="VisualLearner",
                confidence_score=0.7,
                evidence_data={"diagram_count": diagram_events}
            )
            db.add(new_pattern)
            
    # 2. Check for "Fast Paced"
    # Logic: Average time taken per quiz question is low but accuracy is high
    # (Simplified placeholder logic)
    
    db.commit()
