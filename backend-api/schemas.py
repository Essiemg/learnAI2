"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# ============== Auth Schemas ==============

class UserRegister(BaseModel):
    """Schema for user registration."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    grade: int = Field(..., ge=1, le=12)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth with ID token."""
    id_token: str = Field(..., description="Google ID token from Sign-In")


class UserProfile(BaseModel):
    """Schema for user profile response."""
    id: UUID
    name: str
    email: str
    grade: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Tutor Schemas ==============

class TutorRequest(BaseModel):
    """Schema for tutor request."""
    subject: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    mistakes: int = Field(default=0, ge=0)
    time_spent: int = Field(default=0, ge=0)  # seconds
    frustration: int = Field(default=0, ge=0, le=10)
    recent_accuracy: float = Field(default=0.0, ge=0.0, le=1.0)


class TutorResponse(BaseModel):
    """Schema for tutor response."""
    strategy: str
    answer: str


# ============== Progress Schemas ==============

class SubjectStats(BaseModel):
    """Statistics for a single subject."""
    subject: str
    accuracy: float
    total_interactions: int


class ProgressResponse(BaseModel):
    """Schema for progress stats response."""
    recent_accuracy: float
    avg_time_spent: float
    total_interactions: int
    weak_subjects: List[SubjectStats]


# ============== Goals Schemas ==============

class GoalCreate(BaseModel):
    """Schema for creating a goal."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[datetime] = None


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    is_completed: Optional[bool] = None


class GoalResponse(BaseModel):
    """Schema for goal response."""
    id: UUID
    title: str
    description: Optional[str]
    target_date: Optional[datetime]
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Chat Schemas ==============

class ChatMessage(BaseModel):
    """Schema for a chat message."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatSessionCreate(BaseModel):
    """Schema for creating a chat session."""
    topic: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Schema for chat session response."""
    id: UUID
    topic: Optional[str]
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageAdd(BaseModel):
    """Schema for adding a message to chat."""
    role: str
    content: str


# ============== Quiz Schemas ==============

class QuizQuestion(BaseModel):
    """Schema for a quiz question."""
    question: str
    options: List[str]
    correct_answer: int


class QuizGenerateRequest(BaseModel):
    """Schema for generating a quiz."""
    topic: str
    num_questions: int = Field(default=5, ge=1, le=20)
    material_content: Optional[str] = Field(default=None, description="Optional study material content to base questions on")


class QuizSessionResponse(BaseModel):
    """Schema for quiz session response."""
    id: UUID
    topic: str
    questions: List[Any]
    answers: List[Any]
    score: Optional[float]
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuizSubmit(BaseModel):
    """Schema for submitting quiz answers."""
    answers: List[int]


# ============== Flashcard Schemas ==============

class Flashcard(BaseModel):
    """Schema for a flashcard."""
    front: str
    back: str


class FlashcardGenerateRequest(BaseModel):
    """Schema for generating flashcards."""
    topic: str
    num_cards: int = Field(default=10, ge=1, le=50)
    material_content: Optional[str] = Field(default=None, description="Optional study material content to base flashcards on")


class FlashcardSessionResponse(BaseModel):
    """Schema for flashcard session response."""
    id: UUID
    topic: str
    cards: List[Flashcard]
    current_index: int
    created_at: datetime

    class Config:
        from_attributes = True
