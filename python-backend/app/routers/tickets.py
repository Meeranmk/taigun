
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.sql import User
from app.services.ticket_agent_service import TicketAgentService
from app.services.settings_service import SettingsService
from app.models.schemas import UpdateSettingsRequest

router = APIRouter(prefix="/tickets", tags=["tickets"])

class MonitorConfig(BaseModel):
    enabled: bool
    interval_seconds: Optional[int] = 300

@router.post("/{sys_id}/solve")
async def solve_ticket(
    sys_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger AI resolution for a specific ticket.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    service = TicketAgentService(db)
    result = await service.process_ticket(sys_id, str(current_user.organization_id))
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
        
    return result

@router.get("/monitor/config")
async def get_monitor_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ticket monitor configuration for current organization"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    settings_service = SettingsService(db)
    settings = await settings_service.get_settings(str(current_user.organization_id))
    
    return {
        "enabled": settings.enable_ticket_monitor,
        "interval_seconds": settings.ticket_check_interval
    }

@router.post("/monitor/config")
async def update_monitor_config(
    config: MonitorConfig,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update ticket monitor configuration"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    settings_service = SettingsService(db)
    
    # We update via the generic update_settings logic by constructing the partial request
    # Or strict update. The `UpdateSettingsRequest` schema has these fields as optional.
    
    update_data = UpdateSettingsRequest(
        enable_ticket_monitor=config.enabled,
        ticket_check_interval=config.interval_seconds
    )
    
    await settings_service.update_settings(update_data, str(current_user.organization_id))
    
    return {"success": True, "message": "Monitor configuration updated"}
