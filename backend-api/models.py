"""
SQLAlchemy ORM Models
=====================
This module defines all database models for the AI Tutor application.

Models are automatically created when the application starts.

Table Structure:
- users: User accounts
- sessions: Login/auth sessions
- messages: Chat messages within sessions
- interactions: Learning interaction logs for analytics
- flashcard_sets, flashcards: Flashcard study materials
- quiz_sets, quiz_questions, quiz_attempts, quiz_answers: Quiz system
- summaries: AI-generated summaries
- diagrams: AI-generated diagrams
- study_events: Study activity tracking

All tables use UUID (stored as String) primary keys for security and scalability.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime, 
    ForeignKey, Boolean, JSON, Enum, TypeDecorator
)
from sqlalchemy.orm import relationship
from db import Base


# =============================================================================
# Custom UUID Type for SQLite Compatibility
# =============================================================================
class GUID(TypeDecorator):
    """Platform-independent UUID type."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(uuid.UUID(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return value


# =============================================================================
# USER MANAGEMENT
# =============================================================================

class User(Base):
    """
    User account model.
    
    Stores user credentials and profile information.
    This is the central entity that other models reference.
    """
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    grade = Column(Integer, nullable=False, default=1)  # Education grade level
    role = Column(String(50), default="student")  # student, parent, admin
    avatar_url = Column(String(500), nullable=True)
    
    # Email verification fields
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True, index=True)
    verification_token_expires = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    flashcard_sets = relationship("FlashcardSet", back_populates="user", cascade="all, delete-orphan")
    quiz_sets = relationship("QuizSet", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="user", cascade="all, delete-orphan")
    diagrams = relationship("Diagram", back_populates="user", cascade="all, delete-orphan")
    study_events = relationship("StudyEvent", back_populates="user", cascade="all, delete-orphan")
    # Legacy compatibility relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    quiz_sessions = relationship("QuizSession", back_populates="user", cascade="all, delete-orphan")
    flashcard_sessions = relationship("FlashcardSession", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """
    User session model.
    
    Tracks login sessions and chat conversations.
    Each session can contain multiple messages.
    """
    __tablename__ = "sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)  # Optional session title
    topic = Column(String(255), nullable=True)  # Subject/topic being discussed
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    """
    Chat message model.
    
    Stores individual messages within a session.
    Each message has a role (user or assistant) and content.
    """
    __tablename__ = "messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    session_id = Column(GUID, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="messages")


# =============================================================================
# LEARNING ANALYTICS
# =============================================================================

class Interaction(Base):
    """
    Learning interaction log model.
    
    Records each tutoring interaction for analytics and ML training.
    Used by the policy model to determine optimal teaching strategies.
    """
    __tablename__ = "interactions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(100), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    mistakes = Column(Integer, default=0)
    time_spent = Column(Integer, default=0)  # Time in seconds
    frustration = Column(Integer, default=0)  # Scale 0-10
    recent_accuracy = Column(Float, default=0.0)  # 0.0 to 1.0
    strategy = Column(String(100), nullable=True)  # Teaching strategy used
    was_helpful = Column(Boolean, nullable=True)  # User feedback
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="interactions")


class Goal(Base):
    """
    Learning goal model.
    
    Stores user-defined learning goals with deadlines and completion status.
    """
    __tablename__ = "goals"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="goals")


class StudyEvent(Base):
    """
    Study activity tracking model.
    
    Logs study sessions, time spent, and activities for analytics.
    """
    __tablename__ = "study_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # quiz, flashcard, chat, summary, diagram
    subject = Column(String(100), nullable=True)
    topic = Column(String(255), nullable=True)
    duration_seconds = Column(Integer, default=0)
    score = Column(Float, nullable=True)  # Optional score if applicable
    event_data = Column(JSON, nullable=True)  # Additional event-specific data (renamed from metadata)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="study_events")


# =============================================================================
# FLASHCARD SYSTEM
# =============================================================================

class FlashcardSet(Base):
    """
    Flashcard set model.
    
    A collection of flashcards for studying a specific topic.
    """
    __tablename__ = "flashcard_sets"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    topic = Column(String(255), nullable=True)
    card_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="flashcard_sets")
    flashcards = relationship("Flashcard", back_populates="flashcard_set", cascade="all, delete-orphan")


class Flashcard(Base):
    """
    Individual flashcard model.
    
    A single flashcard with front (question) and back (answer).
    """
    __tablename__ = "flashcards"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    set_id = Column(GUID, ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False)
    front = Column(Text, nullable=False)  # Question/term
    back = Column(Text, nullable=False)   # Answer/definition
    position = Column(Integer, default=0)  # Order in the set
    times_correct = Column(Integer, default=0)
    times_incorrect = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    flashcard_set = relationship("FlashcardSet", back_populates="flashcards")


# =============================================================================
# QUIZ SYSTEM
# =============================================================================

class QuizSet(Base):
    """
    Quiz set model.
    
    A collection of quiz questions on a specific topic.
    """
    __tablename__ = "quiz_sets"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    topic = Column(String(255), nullable=True)
    question_count = Column(Integer, default=0)
    time_limit_minutes = Column(Integer, nullable=True)  # Optional time limit
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="quiz_sets")
    questions = relationship("QuizQuestion", back_populates="quiz_set", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz_set", cascade="all, delete-orphan")


class QuizQuestion(Base):
    """
    Individual quiz question model.
    
    Supports multiple choice and free-text questions.
    """
    __tablename__ = "quiz_questions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    set_id = Column(GUID, ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="multiple_choice")  # multiple_choice, true_false, short_answer
    options = Column(JSON, nullable=True)  # Array of options for multiple choice
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)  # Explanation of the answer
    points = Column(Integer, default=1)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    quiz_set = relationship("QuizSet", back_populates="questions")
    answers = relationship("QuizAnswer", back_populates="question", cascade="all, delete-orphan")


class QuizAttempt(Base):
    """
    Quiz attempt model.
    
    Records each time a user attempts a quiz.
    """
    __tablename__ = "quiz_attempts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    set_id = Column(GUID, ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=True)
    total_points = Column(Integer, default=0)
    earned_points = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, nullable=True)
    completed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    quiz_set = relationship("QuizSet", back_populates="attempts")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    """
    Quiz answer model.
    
    Records user's answer to each question in an attempt.
    """
    __tablename__ = "quiz_answers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    attempt_id = Column(GUID, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(GUID, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    answered_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion", back_populates="answers")


# =============================================================================
# AI-GENERATED CONTENT
# =============================================================================

class Summary(Base):
    """
    AI-generated summary model.
    
    Stores summaries generated from text, documents, or URLs.
    """
    __tablename__ = "summaries"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    source_type = Column(String(50), nullable=True)  # text, file, url
    source_content = Column(Text, nullable=True)  # Original content or reference
    summary_text = Column(Text, nullable=False)
    summary_length = Column(String(20), default="medium")  # short, medium, long
    subject = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="summaries")


class Diagram(Base):
    """
    AI-generated diagram model.
    
    Stores Mermaid diagrams generated from content.
    """
    __tablename__ = "diagrams"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    topic = Column(String(255), nullable=True)
    diagram_type = Column(String(50), nullable=False)  # flowchart, mindmap, sequence, etc.
    mermaid_code = Column(Text, nullable=False)
    source_content = Column(Text, nullable=True)  # Original content used to generate
    subject = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="diagrams")


# =============================================================================
# LEGACY COMPATIBILITY MODELS
# =============================================================================
# These models maintain compatibility with existing routers.
# They use JSON fields to store data in a simpler format.

class ChatSession(Base):
    """
    Chat session model (legacy compatibility).
    
    Stores chat messages as JSON array for simpler queries.
    """
    __tablename__ = "chat_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(255), nullable=True)
    messages = Column(JSON, default=list)  # Array of {role, content, timestamp}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")


class QuizSession(Base):
    """
    Quiz session model (legacy compatibility).
    
    Stores quiz data as JSON for simpler structure.
    """
    __tablename__ = "quiz_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(255), nullable=False)
    questions = Column(JSON, default=list)  # Array of question objects
    answers = Column(JSON, default=list)  # User's answers
    score = Column(Float, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="quiz_sessions")


class FlashcardSession(Base):
    """
    Flashcard session model (legacy compatibility).
    
    Stores flashcards as JSON array.
    """
    __tablename__ = "flashcard_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(255), nullable=False)
    cards = Column(JSON, default=list)  # Array of {front, back}
    current_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="flashcard_sessions")
