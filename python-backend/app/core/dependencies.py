from typing import Optional
from app.services.vector_service import VectorDB
from app.services.rag_service import RAGEngine
from app.services.servicenow_service import ServiceNowAPI

# Global instances
vector_db: Optional[VectorDB] = None
rag_engine: Optional[RAGEngine] = None
servicenow_api: Optional[ServiceNowAPI] = None

def get_rag_engine() -> Optional[RAGEngine]:
    return rag_engine

def get_servicenow_api() -> Optional[ServiceNowAPI]:
    return servicenow_api

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import oauth2_scheme, decode_access_token
from app.services.user_service import UserService

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # If token not in Authorization header, check cookies
    if not token:
        token = request.cookies.get("access_token")
        
    if not token:
        raise credentials_exception
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
        
    user_service = UserService(db)
    user = await user_service.get_by_username(username)
    
    if user is None:
        raise credentials_exception
        
    return user
