from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.kb_service import KBService
from typing import Dict, Any
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.get("")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get knowledge base analytics"""
    service = KBService(db)
    return await service.get_analytics()
