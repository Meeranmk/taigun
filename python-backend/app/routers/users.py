from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.services.user_service import UserService
from app.models.schemas import User as UserSchema, CreateUserRequest, UpdateUserRequest
from app.core.dependencies import get_current_user
from app.models.sql import User
from uuid import UUID

router = APIRouter()

@router.get("/")
async def get_users(
    teamId: Optional[str] = Query(None),
    organizationId: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get users with optional filtering by team or organization"""
    try:
        # Build query
        query = select(User)
        
        # Apply filters
        if teamId:
            query = query.where(User.team_id == UUID(teamId))
        if organizationId:
            query = query.where(User.organization_id == UUID(organizationId))
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        users = result.scalars().all()
        
        # Convert to response format
        users_data = []
        for user in users:
            users_data.append({
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "firstName": user.first_name if hasattr(user, 'first_name') else "",
                "lastName": user.last_name if hasattr(user, 'last_name') else "",
                "role": user.role,
                "teamId": str(user.team_id) if user.team_id else None,
                "organizationId": str(user.organization_id) if user.organization_id else None,
                "status": user.status if hasattr(user, 'status') else "active",
                "lastLoginAt": user.last_login_at.isoformat() if hasattr(user, 'last_login_at') and user.last_login_at else None,
                "createdAt": user.created_at.isoformat() if user.created_at else None,
                "updatedAt": user.updated_at.isoformat() if user.updated_at else None
            })
        
        return {
            "items": users_data,
            "total": total,
            "page": page,
            "pageSize": limit,
            "totalPages": (total + limit - 1) // limit
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

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
