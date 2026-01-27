from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.sql import User, Team
from uuid import UUID

router = APIRouter()


@router.get("")
async def get_teams(
    organization_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get teams with pagination.
    - Org admins can only see teams in their organization
    - Platform owners can see all teams or filter by organization
    """
    try:
        # Build query based on user role
        query = select(Team)
        
        if current_user.role == "org_admin":
            # Org admins can only see their own organization's teams
            if not current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not associated with an organization"
                )
            query = query.where(Team.organization_id == current_user.organization_id)
        elif organization_id:
            # Platform owners can filter by organization
            query = query.where(Team.organization_id == UUID(organization_id))
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        teams = result.scalars().all()
        
        # Get member count for each team
        teams_data = []
        for team in teams:
            # Count users in this team
            user_count_query = select(func.count()).select_from(User).where(User.team_id == team.id)
            user_count_result = await db.execute(user_count_query)
            member_count = user_count_result.scalar() or 0
            
            teams_data.append({
                "id": str(team.id),
                "name": team.name,
                "organizationId": str(team.organization_id),
                "description": None,  # Add description field to Team model if needed
                "status": "active",  # Add status field to Team model if needed
                "memberCount": member_count,
                "createdAt": team.created_at.isoformat() if team.created_at else None,
                "updatedAt": team.updated_at.isoformat() if team.updated_at else None
            })
        
        return {
            "items": teams_data,
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
            detail=f"Failed to fetch teams: {str(e)}"
        )


@router.post("")
async def create_team(
    team_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new team.
    - Org admins can create teams in their organization
    - Platform owners can create teams in any organization
    """
    try:
        # Determine organization_id
        if current_user.role == "org_admin":
            if not current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not associated with an organization"
                )
            organization_id = current_user.organization_id
        else:
            # Platform owner must specify organization_id
            if "organizationId" not in team_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="organizationId is required"
                )
            organization_id = UUID(team_data["organizationId"])
        
        # Create team
        new_team = Team(
            name=team_data["name"],
            organization_id=organization_id
        )
        
        db.add(new_team)
        await db.commit()
        await db.refresh(new_team)
        
        return {
            "success": True,
            "message": "Team created successfully",
            "data": {
                "id": str(new_team.id),
                "name": new_team.name,
                "organizationId": str(new_team.organization_id),
                "description": team_data.get("description"),
                "status": "active",
                "memberCount": 0,
                "createdAt": new_team.created_at.isoformat() if new_team.created_at else None,
                "updatedAt": new_team.updated_at.isoformat() if new_team.updated_at else None
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID format: {str(e)}"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )


@router.get("/{team_id}")
async def get_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific team by ID"""
    try:
        query = select(Team).where(Team.id == UUID(team_id))
        result = await db.execute(query)
        team = result.scalar_one_or_none()
        
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Check permissions
        if current_user.role == "org_admin" and team.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get member count
        user_count_query = select(func.count()).select_from(User).where(User.team_id == team.id)
        user_count_result = await db.execute(user_count_query)
        member_count = user_count_result.scalar() or 0
        
        return {
            "success": True,
            "data": {
                "id": str(team.id),
                "name": team.name,
                "organizationId": str(team.organization_id),
                "description": None,
                "status": "active",
                "memberCount": member_count,
                "createdAt": team.created_at.isoformat() if team.created_at else None,
                "updatedAt": team.updated_at.isoformat() if team.updated_at else None
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID format: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team: {str(e)}"
        )
