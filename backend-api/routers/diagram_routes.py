"""
Diagram generation and management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Literal
from uuid import uuid4
from datetime import datetime
import re

from db import get_db
from auth import get_current_user
from models import User
from ml_models import generate_diagram_mermaid

router = APIRouter(prefix="/diagrams", tags=["diagrams"])


class Diagram(BaseModel):
    id: str
    title: str
    mermaid_code: str
    diagram_type: Literal["flowchart", "mindmap"]
    source_text: Optional[str] = None
    created_at: str


class GenerateRequest(BaseModel):
    content: str
    diagram_type: Literal["flowchart", "mindmap"]
    is_base64: bool = False


# In-memory storage for diagrams (replace with DB table if needed)
_diagram_storage: dict = {}


@router.get("", response_model=List[Diagram])
async def get_diagrams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all diagrams for the current user"""
    user_diagrams = _diagram_storage.get(str(current_user.id), [])
    return user_diagrams


@router.post("/generate", response_model=Diagram)
async def generate_diagram(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a diagram using AI"""
    content = request.content
    diagram_type = request.diagram_type
    
    # Generate mermaid code using the AI model
    mermaid_code = generate_diagram_mermaid(
        content=content,
        diagram_type=diagram_type,
        grade=current_user.grade
    )
    
    # Create title from first 50 chars
    title = content[:50] + ("..." if len(content) > 50 else "") if not request.is_base64 else "Document Diagram"
    
    diagram_id = str(uuid4())
    diagram = Diagram(
        id=diagram_id,
        title=title,
        mermaid_code=mermaid_code,
        diagram_type=diagram_type,
        source_text=content if not request.is_base64 else None,
        created_at=datetime.utcnow().isoformat()
    )
    
    # Store diagram
    user_id = str(current_user.id)
    if user_id not in _diagram_storage:
        _diagram_storage[user_id] = []
    _diagram_storage[user_id].insert(0, diagram.model_dump())
    
    return diagram


@router.get("/{diagram_id}", response_model=Diagram)
async def get_diagram(
    diagram_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific diagram"""
    user_diagrams = _diagram_storage.get(str(current_user.id), [])
    for diagram in user_diagrams:
        if diagram["id"] == diagram_id:
            return diagram
    raise HTTPException(status_code=404, detail="Diagram not found")


@router.delete("/{diagram_id}")
async def delete_diagram(
    diagram_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a diagram"""
    user_id = str(current_user.id)
    if user_id in _diagram_storage:
        _diagram_storage[user_id] = [
            d for d in _diagram_storage[user_id] if d["id"] != diagram_id
        ]
    return {"status": "deleted"}
