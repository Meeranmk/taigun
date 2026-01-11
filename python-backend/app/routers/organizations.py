from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schemas import OrganizationCreate, OrganizationResponse, SubscriptionPlanResponse, User
from app.services.organization_service import OrganizationService

router = APIRouter(
    prefix="/api/admin/organizations",
    tags=["Organizations"],
    responses={404: {"description": "Not found"}},
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
