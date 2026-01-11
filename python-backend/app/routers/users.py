from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.user_service import UserService
from app.models.schemas import User as UserSchema, CreateUserRequest, UpdateUserRequest
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.get("/")
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users"""
    service = UserService(db)
    users = await service.get_all()
    
    # Convert UUID fields to strings
    result = []
    for user in users:
        user_dict = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "team_id": str(user.team_id),
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
        result.append(user_dict)
    
    # Return in format expected by frontend
    return {
        "success": True,
        "users": result
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: CreateUserRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user"""
    service = UserService(db)
    try:
        user = await service.create(user_in)
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "team_id": str(user.team_id),
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}")
async def get_user(
    user_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "team_id": str(user.team_id),
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }

@router.put("/{user_id}")
async def update_user(
    user_id: str, 
    user_in: UpdateUserRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user"""
    service = UserService(db)
    user = await service.update(user_id, user_in)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "team_id": str(user.team_id),
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user"""
    service = UserService(db)
    success = await service.delete(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return None
