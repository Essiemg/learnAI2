"""Flashcard routes - Flashcard generation and management."""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import get_db
from models import User, FlashcardSession
from schemas import FlashcardGenerateRequest, FlashcardSessionResponse
from auth import get_current_user
from ml_models import generate_flashcards

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.get("", response_model=List[FlashcardSessionResponse])
async def get_flashcard_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20
):
    """Get all flashcard sessions for the current user."""
    sessions = (
        db.query(FlashcardSession)
        .filter(FlashcardSession.user_id == current_user.id)
        .order_by(desc(FlashcardSession.created_at))
        .limit(limit)
        .all()
    )
    return sessions


@router.post("/generate", response_model=FlashcardSessionResponse, status_code=status.HTTP_201_CREATED)
async def generate_flashcard_session(
    request: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards on a topic."""
    # Generate flashcards using AI (with optional material content)
    cards = generate_flashcards(
        topic=request.topic,
        num_cards=request.num_cards,
        grade=current_user.grade,
        material_content=request.material_content
    )
    
    # Create flashcard session
    session = FlashcardSession(
        user_id=current_user.id,
        topic=request.topic,
        cards=cards,
        current_index=0
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


@router.get("/{session_id}", response_model=FlashcardSessionResponse)
async def get_flashcard_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific flashcard session."""
    session = (
        db.query(FlashcardSession)
        .filter(FlashcardSession.id == session_id, FlashcardSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard session not found"
        )
    
    return session


@router.put("/{session_id}/index")
async def update_flashcard_index(
    session_id: UUID,
    index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current card index."""
    session = (
        db.query(FlashcardSession)
        .filter(FlashcardSession.id == session_id, FlashcardSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard session not found"
        )
    
    cards = session.cards or []
    if index < 0 or index >= len(cards):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid card index"
        )
    
    session.current_index = index
    db.commit()
    
    return {"current_index": index}


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a flashcard session."""
    session = (
        db.query(FlashcardSession)
        .filter(FlashcardSession.id == session_id, FlashcardSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard session not found"
        )
    
    db.delete(session)
    db.commit()
    
    return None
