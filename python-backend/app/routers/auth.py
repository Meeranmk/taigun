from fastapi import APIRouter, HTTPException, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import LoginRequest
from app.core.security import create_access_token, verify_password
from app.core.database import get_db
from app.services.user_service import UserService
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Swagger/OAuth2 compatible login endpoint
    """
    user_service = UserService(db)
    user = await user_service.get_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

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
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "role": user.role,
            "status": user.status,
            "organizationId": str(user.organization_id) if user.organization_id else None,
            "teamId": str(user.team_id) if user.team_id else None,
            "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "updatedAt": user.updated_at.isoformat() if user.updated_at else None
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
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
            "firstName": current_user.first_name,
            "lastName": current_user.last_name,
            "role": current_user.role,
            "status": current_user.status,
            "organizationId": str(current_user.organization_id) if current_user.organization_id else None,
            "teamId": str(current_user.team_id) if current_user.team_id else None,
            "lastLoginAt": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
            "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
            "updatedAt": current_user.updated_at.isoformat() if current_user.updated_at else None
        }
    }
