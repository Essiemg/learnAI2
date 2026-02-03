"""
Summary generation and management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import uuid4
from datetime import datetime

from db import get_db
from auth import get_current_user
from models import User
from ml_models import generate_summary

router = APIRouter(prefix="/summaries", tags=["summaries"])


class Summary(BaseModel):
    id: str
    title: str
    summary: str
    source_text: Optional[str] = None
    created_at: str


class GenerateRequest(BaseModel):
    content: str
    is_base64: bool = False
    topic: Optional[str] = None


# In-memory storage for summaries (replace with DB table if needed)
_summary_storage: dict = {}


@router.get("", response_model=List[Summary])
async def get_summaries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all summaries for the current user"""
    user_summaries = _summary_storage.get(str(current_user.id), [])
    return user_summaries


@router.post("/generate", response_model=Summary)
async def generate_summary_endpoint(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a summary using AI"""
    content = request.content
    
    # If base64, we'd normally decode the file here
    if request.is_base64:
        # In a real implementation, decode and extract text from PDF/image
        summary_text = "This document has been received. To generate a detailed summary, please provide the text content directly."
    else:
        # Generate summary using the AI model
        summary_text = generate_summary(
            content=content,
            grade=current_user.grade,
            topic=request.topic
        )
    
    # Create title from first 50 chars or topic
    if request.topic:
        title = f"Summary: {request.topic}"
    else:
        title = content[:50] + ("..." if len(content) > 50 else "") if not request.is_base64 else "Document Summary"
    
    summary_id = str(uuid4())
    summary = Summary(
        id=summary_id,
        title=title,
        summary=summary_text,
        source_text=content if not request.is_base64 else None,
        created_at=datetime.utcnow().isoformat()
    )
    
    # Store summary
    user_id = str(current_user.id)
    if user_id not in _summary_storage:
        _summary_storage[user_id] = []
    _summary_storage[user_id].insert(0, summary.model_dump())
    
    return summary


@router.get("/{summary_id}", response_model=Summary)
async def get_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific summary"""
    user_summaries = _summary_storage.get(str(current_user.id), [])
    for summary in user_summaries:
        if summary["id"] == summary_id:
            return summary
    raise HTTPException(status_code=404, detail="Summary not found")


@router.delete("/{summary_id}")
async def delete_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a summary"""
    user_id = str(current_user.id)
    if user_id in _summary_storage:
        _summary_storage[user_id] = [
            s for s in _summary_storage[user_id] if s["id"] != summary_id
        ]
    return {"status": "deleted"}
