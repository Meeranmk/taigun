from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schemas import OrganizationCreate, OrganizationResponse, SubscriptionPlanResponse, User
from app.models.schemas_registration import (
    OrganizationRegistrationRequest,
    EmailVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    CreatePasswordRequest,
    CreatePasswordResponse,
    ResendVerificationRequest
)
from app.services.organization_service import OrganizationService
from app.services.registration_service import RegistrationService

router = APIRouter(
    prefix="/api/organizations",
    tags=["Organizations"],
    responses={404: {"description": "Not found"}},
)


# ==================== Public Registration Endpoints ====================

@router.post("/register", response_model=EmailVerificationResponse)
async def register_organization(
    registration: OrganizationRegistrationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new organization (PUBLIC - No authentication required)
    
    This endpoint:
    1. Creates organization with status='pending'
    2. Creates admin user with temporary password
    3. Creates initial team
    4. Stores all settings
    5. Sends verification email
    
    The organization will be activated after email verification.
    """
    try:
        service = RegistrationService(db)
        result = await service.register_organization(registration)
        
        return EmailVerificationResponse(
            success=True,
            message=result["message"],
            email=result["verification_sent_to"],
            expiresIn=24 * 60  # 24 hours in minutes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email address using token (PUBLIC - No authentication required)
    
    This endpoint:
    1. Validates the verification token
    2. Activates the organization
    3. Activates the admin user
    4. Sends welcome email directing user to create password
    """
    try:
        service = RegistrationService(db)
        result = await service.verify_organization_email(request.token)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return VerifyEmailResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )


@router.post("/create-password", response_model=CreatePasswordResponse)
async def create_password(
    request: CreatePasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create password after email verification (PUBLIC - No authentication required)
    
    This endpoint:
    1. Validates that passwords match
    2. Sets the user's password
    3. Marks account as ready for login
    """
    # Validate passwords match
    if not request.validate_passwords_match():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    try:
        service = RegistrationService(db)
        result = await service.create_user_password(request.userId, request.password)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return CreatePasswordResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password creation failed: {str(e)}"
        )


@router.post("/resend-verification", response_model=EmailVerificationResponse)
async def resend_verification(
    request: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resend verification email if original expired (PUBLIC - No authentication required)
    
    This endpoint:
    1. Checks if email exists and is not yet verified
    2. Creates a new verification token
    3. Sends a new verification email
    
    Use this when the original 24-hour verification link expires.
    """
    try:
        service = RegistrationService(db)
        result = await service.resend_verification_email(
            email=request.email,
            entity_type=request.entityType
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return EmailVerificationResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resend verification failed: {str(e)}"
        )

@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new organization.
    Only accessible by Platform Owner.
    """
    if current_user.role != "platform_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Platform Owners can create organizations"
        )
    
    service = OrganizationService(db)
    return await service.create_organization(org_in)

@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all organizations.
    Only accessible by Platform Owner.
    """
    if current_user.role != "platform_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Platform Owners can view all organizations"
        )
        
    service = OrganizationService(db)
    return await service.get_all_organizations()

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List available subscription plans.
    Accessible by any authenticated user.
    """
    from sqlalchemy.future import select
    from app.models.sql import SubscriptionPlan
    
    result = await db.execute(select(SubscriptionPlan))
    return result.scalars().all()

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get organization details.
    Accessible by Platform Owner or Admin of the specific Organization.
    """
    # 1. Platform Owner can see any
    # 2. Org Admin can see their own
    if current_user.role != "platform_owner":
        if str(current_user.organization_id) != org_id:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this organization"
            )

    service = OrganizationService(db)
    org = await service.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org
