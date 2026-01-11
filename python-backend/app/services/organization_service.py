"""
Organization Service
Handles database operations for organizations and subscription plans
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
from datetime import datetime

from app.models.sql import Organization, SubscriptionPlan, OrganizationSetting
from app.models.schemas import OrganizationCreate, OrganizationResponse

class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_plan_by_code(self, code: str) -> Optional[SubscriptionPlan]:
        result = await self.db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == code))
        return result.scalars().first()

    async def create_organization(self, org_in: OrganizationCreate) -> Organization:
        # Resolve plan
        plan = await self.get_plan_by_code(org_in.plan_code)
        if not plan:
            # Fallback to basic if requested plan not found
            plan = await self.get_plan_by_code("basic")
            if not plan:
                 raise ValueError("Default 'basic' plan not found. System not initialized correctly.")

        org = Organization(
            id=uuid.uuid4(),
            name=org_in.name,
            contact_email=org_in.contact_email,
            plan_id=plan.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(org)
        await self.db.commit()
        await self.db.refresh(org)
        
        # Initialize default settings for the organization (optional, but good practice)
        # e.g. empty servicenow credentials
        
        return org

    async def get_organization(self, org_id: str) -> Optional[Organization]:
        result = await self.db.execute(select(Organization).where(Organization.id == org_id))
        return result.scalars().first()

    async def get_all_organizations(self) -> List[Organization]:
        result = await self.db.execute(select(Organization))
        return result.scalars().all()
