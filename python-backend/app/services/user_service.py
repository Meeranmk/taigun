"""
User Service
Handles all database operations for users (Replicating User Repository)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.models.sql import User, Team
from app.models.schemas import CreateUserRequest, UpdateUserRequest
from app.core.security import get_password_hash
import uuid
from datetime import datetime

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_in: CreateUserRequest) -> User:
        org_id = user_in.organization_id
        team_id = user_in.team_id

        # Fallback to default team if no context provided (e.g. initial setup behavior)
        if not org_id and not team_id:
            result = await self.db.execute(select(Team).limit(1))
            team = result.scalars().first()
            if not team:
                # Should not happen as we bootstrap it, but safe fallback logic
                raise ValueError("No default team found. System initialization incomplete.")
            team_id = team.id
            org_id = team.organization_id

        user = User(
            id=str(uuid.uuid4()),
            username=user_in.username,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            role=user_in.role,
            organization_id=org_id,
            team_id=team_id, 
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(user)
        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Username or email already exists")

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_username(self, username_or_email: str) -> Optional[User]:
        """
        Get user by username OR email (flexible login)
        
        Args:
            username_or_email: Can be either username (user ID) or email address
            
        Returns:
            User if found, None otherwise
        """
        from sqlalchemy import or_
        
        result = await self.db.execute(
            select(User).where(
                or_(
                    User.username == username_or_email,
                    User.email == username_or_email
                )
            )
        )
        return result.scalars().first()
    
    async def get_all(self) -> List[User]:
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def update(self, user_id: str, user_in: UpdateUserRequest) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        update_data = user_in.dict(exclude_unset=True)
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            setattr(user, key, value)
            
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete(self, user_id: str) -> bool:
        user = await self.get_by_id(user_id)
        if not user:
            return False
        
        await self.db.delete(user)
        await self.db.commit()
        return True
