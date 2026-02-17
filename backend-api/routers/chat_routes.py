"""Chat session routes."""
import os
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import get_db
from models import User, ChatSession
from schemas import ChatSessionCreate, ChatSessionResponse, ChatMessageAdd
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ============== HELPER FUNCTION FOR LIVE LECTURE ==============

async def generate_chat_response(
    message: str,
    grade_level: int = 5,
    education_level: str = "primary",
    field_of_study: Optional[str] = None,
    subjects: Optional[List[str]] = None,
    conversation_history: Optional[List[dict]] = None,
) -> str:
    """
    Generate a chat response for live voice lecture.
    
    This is a helper function used by the WebSocket endpoint in voice_routes_v2.
    It uses either OpenAI API or Phi-3 for response generation.
    """
    from starlette.concurrency import run_in_threadpool
    
    # Build context string
    subjects_text = ""
    if subjects:
        subjects_text = f" studying {', '.join(subjects)}"
    
    field_text = ""
    if field_of_study:
        field_text = f" in {field_of_study}"
    
    grade_context = f"Grade {grade_level}" if grade_level <= 12 else "College level"
    
    system_prompt = f"""You are Toki, a friendly AI tutor having a voice conversation with a {grade_context} student{subjects_text}{field_text}.

VOICE CONVERSATION RULES:
- Keep responses SHORT (2-3 sentences max) - this is spoken aloud!
- Be warm, encouraging, and patient
- Use simple, clear language appropriate for {grade_context}
- Ask ONE clarifying question at a time
- Guide them to answers with hints, don't just give solutions
- Celebrate effort and progress!

Remember: You're SPEAKING, not writing an essay!"""

    def _call_openai():
        import openai
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        else:
            messages.append({"role": "user", "content": message})
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()

    def _call_phi3():
        from ml_models import generate_tutor_response
        
        instruction = f"{system_prompt}\n\nPrevious context: {str(conversation_history[-3:]) if conversation_history else 'None'}"
        
        response = generate_tutor_response(
            instruction=instruction,
            question=message
        )
        
        if len(response) > 300:
            sentences = response.split('. ')
            response = '. '.join(sentences[:2]) + '.'
        
        return response

    # Try OpenAI first
    if os.getenv("OPENAI_API_KEY"):
        try:
            return await run_in_threadpool(_call_openai)
        except Exception as e:
            logger.warning(f"OpenAI failed, falling back to Phi-3: {e}")
    
    # Fallback to Phi-3
    try:
        return await run_in_threadpool(_call_phi3)
        
    except Exception as e:
        logger.error(f"Phi-3 failed: {e}")
        return "I'm here to help! Could you tell me more about what you're working on?"


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20
):
    """Get all chat sessions for the current user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(limit)
        .all()
    )
    return sessions


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session."""
    session = ChatSession(
        user_id=current_user.id,
        topic=session_data.topic,
        messages=[]
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific chat session."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    return session


@router.post("/sessions/{session_id}/messages", response_model=ChatSessionResponse)
async def add_message(
    session_id: UUID,
    message: ChatMessageAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a message to a chat session."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Add message to session
    messages = session.messages or []
    messages.append({
        "role": message.role,
        "content": message.content,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    session.messages = messages
    session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a chat session."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    db.delete(session)
    db.commit()
    
    return None
