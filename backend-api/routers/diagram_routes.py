from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime

from db import get_db
from auth import get_current_user
from models import User, Diagram
from ml_models import generate_diagram_mermaid

router = APIRouter(prefix="/diagrams", tags=["diagrams"])


class DiagramResponse(BaseModel):
    id: str
    title: str
    mermaid_code: str
    diagram_type: str
    source_text: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    content: str
    diagram_type: Literal["flowchart", "mindmap"]
    is_base64: bool = False


@router.get("", response_model=List[DiagramResponse])
async def get_diagrams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all diagrams for the current user"""
    diagrams = (
        db.query(Diagram)
        .filter(Diagram.user_id == current_user.id)
        .order_by(desc(Diagram.created_at))
        .all()
    )
    return diagrams


@router.post("/generate", response_model=DiagramResponse)
async def generate_diagram(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a diagram using AI"""
    content = request.content
    diagram_type = request.diagram_type
    
    # Generate mermaid code using the AI model
    if request.is_base64:
        # TODO: Implement multimodal diagram generation
        mermaid_code = "graph TD;\n    A[Document Uploaded] --> B[Processing...];\n    B --> C[Details Coming Soon];"
    else:
        mermaid_code = generate_diagram_mermaid(
            content=content,
            diagram_type=diagram_type,
            grade=current_user.grade
        )
    
    # Create title from first 50 chars
    title = content[:50] + ("..." if len(content) > 50 else "") if not request.is_base64 else "Document Diagram"
    
    new_diagram = Diagram(
        user_id=current_user.id,
        title=title,
        mermaid_code=mermaid_code,
        diagram_type=diagram_type,
        source_content=content if not request.is_base64 else None,
        subject="General" # Default subject
    )
    
    db.add(new_diagram)
    db.commit()
    db.refresh(new_diagram)
    
    return DiagramResponse(
        id=str(new_diagram.id),
        title=new_diagram.title,
        mermaid_code=new_diagram.mermaid_code,
        diagram_type=new_diagram.diagram_type,
        source_text=new_diagram.source_content,
        created_at=new_diagram.created_at
    )


@router.get("/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(
    diagram_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific diagram"""
    diagram = (
        db.query(Diagram)
        .filter(Diagram.id == diagram_id, Diagram.user_id == current_user.id)
        .first()
    )
    
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
        
    return DiagramResponse(
        id=str(diagram.id),
        title=diagram.title,
        mermaid_code=diagram.mermaid_code,
        diagram_type=diagram.diagram_type,
        source_text=diagram.source_content,
        created_at=diagram.created_at
    )


@router.delete("/{diagram_id}")
async def delete_diagram(
    diagram_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a diagram"""
    diagram = (
        db.query(Diagram)
        .filter(Diagram.id == diagram_id, Diagram.user_id == current_user.id)
        .first()
    )
    
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
        
    db.delete(diagram)
    db.commit()
    
    return {"status": "deleted"}
