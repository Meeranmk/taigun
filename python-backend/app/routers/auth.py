from fastapi import APIRouter, HTTPException, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import LoginRequest
from app.core.security import create_access_token, verify_password
from app.core.database import get_db
from app.services.user_service import UserService
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.post("/auth")
async def admin_login(
    request: LoginRequest, 
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint"""
    user_service = UserService(db)
    user = await user_service.get_by_username(request.username)
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role
        }
    )
    
    # Set HTTP-only cookie for frontend compatibility
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=1440 * 60, # 24 hours
        path="/",  # Make cookie available for all paths
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {
        "success": True,
        "message": "Logged in successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role
        }
    }

@router.post("/logout")
async def admin_logout(response: Response):
    """Logout endpoint"""
    response.delete_cookie("access_token", path="/")
    return {"success": True}

@router.get("/auth/status")
async def auth_status(current_user: User = Depends(get_current_user)):
    """Check authentication status"""
    return {
        "isAuthenticated": True,
        "username": current_user.username,
        "role": current_user.role
    }
