"""Tutor routes - AI tutoring with ML strategy prediction."""
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from db import get_db
from models import User, Interaction
from schemas import TutorRequest, TutorResponse
from auth import get_current_user
from ml_models import predict_strategy, generate_tutor_response, generate_tutor_response_stream

router = APIRouter(prefix="/tutor", tags=["Tutoring"])


@router.post("", response_model=TutorResponse)
async def tutor(
    request: TutorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI tutoring response with adaptive strategy.
    
    The endpoint:
    1. Uses ML model to predict optimal teaching strategy
    2. Generates a response using fine-tuned Phi-3
    3. Logs the interaction for analytics
    
    **Request body:**
    - subject: Topic being studied
    - question: Student's question or problem
    - mistakes: Number of mistakes made on current problem
    - time_spent: Seconds spent on current problem
    - frustration: Frustration level (0-10)
    - recent_accuracy: Recent accuracy rate (0.0-1.0)
    
    **Returns:**
    - strategy: Predicted teaching strategy
    - answer: AI tutor response
    """
    # Get user's grade from database (don't trust client)
    grade = current_user.grade
    
    # Predict strategy using ML model
    strategy = predict_strategy(
        grade=grade,
        mistakes=request.mistakes,
        time_spent=request.time_spent,
        frustration=request.frustration,
        recent_accuracy=request.recent_accuracy
    )
    
    # Build instruction for the tutor (anti-leakage measures are in ml_models.py)
    instruction = f"""You are tutoring a Grade {grade} student.
Subject: {request.subject}
Teaching strategy: {strategy}

IMPORTANT RULES:
- Do NOT show your thinking process or reasoning steps
- Do NOT use tags like <thought> or prefixes like "Thought:"
- ONLY provide the direct, helpful response
- Do not give final answers directly - ask guiding questions
- Keep explanations appropriate for Grade {grade}
- Be encouraging and supportive
- Apply the {strategy} teaching strategy"""
    
    # Generate response using Phi-3
    answer = generate_tutor_response(
        instruction=instruction,
        question=request.question
    )
    
    # Log interaction to database
    interaction = Interaction(
        user_id=current_user.id,
        subject=request.subject,
        question=request.question,
        answer=answer,
        mistakes=request.mistakes,
        time_spent=request.time_spent,
        frustration=request.frustration,
        recent_accuracy=request.recent_accuracy,
        strategy=strategy,
        created_at=datetime.utcnow()
    )
    
    db.add(interaction)
    db.commit()
    
    return TutorResponse(strategy=strategy, answer=answer)


@router.post("/chat")
async def tutor_chat(
    request: TutorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alternative chat endpoint that returns a streaming-style response.
    For compatibility with existing frontend chat components.
    """
    response = await tutor(request, current_user, db)
    
    return {
        "message": {
            "role": "assistant",
            "content": response.answer
        },
        "strategy": response.strategy
    }


@router.post("/stream")
async def tutor_stream(
    request: TutorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Streaming tutor endpoint for real-time response display.
    Returns Server-Sent Events (SSE) for faster perceived response time.
    
    The response starts appearing immediately as tokens are generated,
    rather than waiting for the full response.
    """
    grade = current_user.grade
    
    # Predict strategy (fast, no streaming needed)
    strategy = predict_strategy(
        grade=grade,
        mistakes=request.mistakes,
        time_spent=request.time_spent,
        frustration=request.frustration,
        recent_accuracy=request.recent_accuracy
    )
    
    instruction = f"""You are tutoring a Grade {grade} student.
Subject: {request.subject}
Teaching strategy: {strategy}

IMPORTANT RULES:
- Do NOT show your thinking process or reasoning steps
- ONLY provide the direct, helpful response
- Keep explanations appropriate for Grade {grade}
- Be encouraging and supportive"""
    
    async def generate_stream():
        full_response = ""
        
        # Send strategy first
        yield f"data: {json.dumps({'type': 'strategy', 'content': strategy})}\n\n"
        
        # Stream tokens
        for token in generate_tutor_response_stream(instruction, request.question):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        
        # Signal completion
        yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"
        
        # Log interaction after completion
        interaction = Interaction(
            user_id=current_user.id,
            subject=request.subject,
            question=request.question,
            answer=full_response,
            mistakes=request.mistakes,
            time_spent=request.time_spent,
            frustration=request.frustration,
            recent_accuracy=request.recent_accuracy,
            strategy=strategy,
            created_at=datetime.utcnow()
        )
        db.add(interaction)
        db.commit()
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
