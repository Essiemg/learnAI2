from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from db import get_db
from auth import get_current_user
from models import User, Summary, StudyEvent
from ml_models import generate_summary

router = APIRouter(prefix="/summaries", tags=["summaries"])


from schemas import SummaryResponse, SummaryGenerateRequest

# Removing inline class since we now use SummaryGenerateRequest from schemas


@router.get("", response_model=List[SummaryResponse])
async def get_summaries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all summaries for the current user"""
    summaries = (
        db.query(Summary)
        .filter(Summary.user_id == current_user.id)
        .order_by(desc(Summary.created_at))
        .all()
    )
    return summaries


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary_endpoint(
    request: SummaryGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a summary using AI"""
    content = request.content
    
    # Handle legacy is_base64 or new attachments
    # If is_base64 is true, treat content as a file (simple backward compat)
    attachments = request.attachments or []
    if request.is_base64 and not attachments:
        # Assuming image/png for simplicity in legacy mode, or try to detect
        attachments = [{"type": "image/png", "content": content}]
        content = "Please summarize this image."

    # Generate summary using the AI model
    summary_text = generate_summary(
        content=content,
        grade=current_user.grade,
        topic=request.topic,
        attachments=attachments
    )
    
    # Create title from first 50 chars or topic
    if request.topic:
        title = f"Summary: {request.topic}"
    else:
        title = content[:50] + ("..." if len(content) > 50 else "") if not request.is_base64 else "Document Summary"
    
    new_summary = Summary(
        user_id=current_user.id,
        title=title,
        summary_text=summary_text,
        source_content=content if not request.is_base64 else None,
        source_type="text" if not request.is_base64 else "file",
        subject=request.topic
    )
    
    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)
    
    # Log study event
    event = StudyEvent(
        user_id=current_user.id,
        event_type="summary",
        subject=request.topic,
        topic=new_summary.title,
        duration_seconds=0,
        event_data={"summary_id": str(new_summary.id)}
    )
    db.add(event)
    db.commit()
    
    # Map model fields to pydantic response
    return SummaryResponse(
        id=str(new_summary.id),
        title=new_summary.title,
        summary=new_summary.summary_text,
        source_text=new_summary.source_content,
        created_at=new_summary.created_at
    )


@router.get("/{summary_id}", response_model=SummaryResponse)
async def get_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific summary"""
    summary = (
        db.query(Summary)
        .filter(Summary.id == summary_id, Summary.user_id == current_user.id)
        .first()
    )
    
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    return SummaryResponse(
        id=str(summary.id),
        title=summary.title,
        summary=summary.summary_text,
        source_text=summary.source_content,
        created_at=summary.created_at
    )


@router.delete("/{summary_id}")
async def delete_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a summary"""
    summary = (
        db.query(Summary)
        .filter(Summary.id == summary_id, Summary.user_id == current_user.id)
        .first()
    )
    
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    db.delete(summary)
    db.commit()
    
    return {"status": "deleted"}
