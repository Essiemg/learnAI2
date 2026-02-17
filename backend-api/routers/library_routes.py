"""Library routes - Aggregated user content."""
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from datetime import datetime

from db import get_db
from auth import get_current_user
from models import User, QuizSet, FlashcardSet, Summary, Essay, Diagram

router = APIRouter(prefix="/library", tags=["Library"])

class LibraryItem(BaseModel):
    id: str
    type: str  # quiz, flashcard, summary, essay, diagram
    title: str
    topic: Optional[str] = None
    created_at: datetime
    metadata: Optional[dict] = None  # Extra info like score, count, etc.

    class Config:
        from_attributes = True

@router.get("", response_model=List[LibraryItem])
async def get_library_content(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = Query(None, description="Filter by content type")
):
    """Get aggregated library content."""
    items = []
    
    # 1. Quizzes
    if not type or type == "quiz":
        quizzes = (
            db.query(QuizSet)
            .filter(QuizSet.user_id == current_user.id)
            .order_by(desc(QuizSet.created_at))
            .limit(limit)
            .all()
        )
        for q in quizzes:
            items.append(LibraryItem(
                id=str(q.id),
                type="quiz",
                title=q.title,
                topic=q.topic,
                created_at=q.created_at,
                metadata={"question_count": q.question_count}
            ))

    # 2. Flashcards
    if not type or type == "flashcard":
        flashcards = (
            db.query(FlashcardSet)
            .filter(FlashcardSet.user_id == current_user.id)
            .order_by(desc(FlashcardSet.created_at))
            .limit(limit)
            .all()
        )
        for f in flashcards:
            items.append(LibraryItem(
                id=str(f.id),
                type="flashcard",
                title=f.title,
                topic=f.topic,
                created_at=f.created_at,
                metadata={"card_count": f.card_count}
            ))

    # 3. Summaries
    if not type or type == "summary":
        summaries = (
            db.query(Summary)
            .filter(Summary.user_id == current_user.id)
            .order_by(desc(Summary.created_at))
            .limit(limit)
            .all()
        )
        for s in summaries:
            items.append(LibraryItem(
                id=str(s.id),
                type="summary",
                title=s.title or "Untitled Summary",
                topic=s.subject,
                created_at=s.created_at,
                metadata={"source_type": s.source_type}
            ))

    # 4. Essays
    if not type or type == "essay":
        essays = (
            db.query(Essay)
            .filter(Essay.user_id == current_user.id)
            .order_by(desc(Essay.created_at))
            .limit(limit)
            .all()
        )
        for e in essays:
            items.append(LibraryItem(
                id=str(e.id),
                type="essay",
                title=e.title,
                topic=e.topic,
                created_at=e.created_at,
                metadata={"score": e.score}
            ))

    # 5. Diagrams
    if not type or type == "diagram":
        diagrams = (
            db.query(Diagram)
            .filter(Diagram.user_id == current_user.id)
            .order_by(desc(Diagram.created_at))
            .limit(limit)
            .all()
        )
        for d in diagrams:
            items.append(LibraryItem(
                id=str(d.id),
                type="diagram",
                title=d.title or "Untitled Diagram",
                topic=d.topic or d.subject,
                created_at=d.created_at,
                metadata={"diagram_type": d.diagram_type}
            ))

    # Sort combined list by created_at desc
    items.sort(key=lambda x: x.created_at, reverse=True)
    
    # Apply pagination to the combined list
    # Note: efficient pagination for combined lists usually requires a Union query or separate queries with limit/offset logic.
    # For simplicity/MVP, we fetch recent items from all and slice in python, assuming user library isn't huge yet.
    # If limit is 50, we fetched 50 of EACH.
    
    start = offset
    end = offset + limit
    return items[start:end]
