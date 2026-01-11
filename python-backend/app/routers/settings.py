from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.settings_service import SettingsService
from app.models.schemas import SettingsResponse, UpdateSettingsRequest
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get application settings"""
    service = SettingsService(db)
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
    return await service.get_settings(str(current_user.organization_id))

@router.put("")
async def update_settings(
    settings_in: UpdateSettingsRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update application settings"""
    service = SettingsService(db)
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
    return await service.update_settings(settings_in, str(current_user.organization_id))
