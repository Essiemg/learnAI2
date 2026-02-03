"""Goals routes - Learning goals management."""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import get_db
from models import User, Goal
from schemas import GoalCreate, GoalUpdate, GoalResponse
from auth import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=List[GoalResponse])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all goals for the current user."""
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id)
        .order_by(desc(Goal.created_at))
        .all()
    )
    return goals


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new learning goal."""
    goal = Goal(
        user_id=current_user.id,
        title=goal_data.title,
        description=goal_data.description,
        target_date=goal_data.target_date
    )
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    return goal


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific goal."""
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == current_user.id)
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal."""
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == current_user.id)
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    if goal_data.title is not None:
        goal.title = goal_data.title
    if goal_data.description is not None:
        goal.description = goal_data.description
    if goal_data.target_date is not None:
        goal.target_date = goal_data.target_date
    if goal_data.is_completed is not None:
        goal.is_completed = goal_data.is_completed
    
    db.commit()
    db.refresh(goal)
    
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal."""
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == current_user.id)
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    db.delete(goal)
    db.commit()
    
    return None


@router.post("/{goal_id}/toggle", response_model=GoalResponse)
async def toggle_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle goal completion status."""
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == current_user.id)
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    goal.is_completed = not goal.is_completed
    db.commit()
    db.refresh(goal)
    
    return goal
