"""
Database connection and management using SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import get_settings

settings = get_settings()

# Get database URL and convert to asyncpg format
database_url = settings.get_database_url()

# Remove sslmode parameter from URL and use connect_args instead
if "?sslmode=require" in database_url:
    database_url = database_url.replace("?sslmode=require", "")
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Create async engine with SSL in connect_args
    engine = create_async_engine(
        database_url, 
        echo=False,
        connect_args={"ssl": "require"}
    )
else:
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(database_url, echo=False)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and create default admin if needed"""
    from app.models.sql import User, Team, Base, Organization, SubscriptionPlan, OrganizationSetting
    from app.core.security import get_password_hash
    from sqlalchemy import select
    import uuid
    from datetime import datetime
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        # 1. Bootstrap Subscription Plan
        result = await session.execute(select(SubscriptionPlan).filter_by(code='basic'))
        plan = result.scalars().first()
        if not plan:
            print("🚀 Bootstrapping Basic Subscription Plan...")
            plan = SubscriptionPlan(
                id=uuid.uuid4(),
                name="Basic Plan",
                code="basic",
                price=0.0,
                features={"max_users": 5, "max_teams": 1},
                is_active=True
            )
            session.add(plan)
            await session.commit()
            await session.refresh(plan)
            print(f"✅ Created plan: {plan.name}")

        # 2. Bootstrap Organization
        result = await session.execute(select(Organization).filter_by(name='Default Organization'))
        org = result.scalars().first()
        if not org:
            print("🚀 Bootstrapping Default Organization...")
            org = Organization(
                id=uuid.uuid4(),
                name="Default Organization",
                contact_email=f"admin@{settings.admin_username}.com",
                plan_id=plan.id
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            print(f"✅ Created organization: {org.name}")

            # 3. Bootstrap Organization Settings
            print("🚀 Bootstrapping Organization Settings...")
            default_settings = [
                OrganizationSetting(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    key="servicenow_url",
                    value="https://instance.service-now.com"
                ),
                OrganizationSetting(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    key="servicenow_username",
                    value="admin"
                ),
                OrganizationSetting(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    key="servicenow_password_encrypted",
                    value="dummy_encrypted_value",
                    is_encrypted=True
                )
            ]
            session.add_all(default_settings)
            await session.commit()
            print("✅ Created organization settings")

        # 4. Bootstrap Team
        result = await session.execute(select(Team).filter_by(organization_id=org.id).limit(1))
        team = result.scalars().first()
        if not team:
            print("🚀 Bootstrapping default team...")
            team = Team(
                id=uuid.uuid4(),
                name="Default Team",
                organization_id=org.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(team)
            await session.commit()
            await session.refresh(team)
            print(f"✅ Created default team: {team.id}")
        
        # 5. Bootstrap Admin User
        result = await session.execute(select(User).limit(1))
        if not result.scalars().first():
            print("🚀 Bootstrapping initial admin user...")
            admin_user = User(
                id=uuid.uuid4(),
                username=settings.admin_username,
                email=f"{settings.admin_username}@example.com",
                password_hash=get_password_hash(settings.admin_password),
                role="platform_owner", # Top level role
                organization_id=org.id,
                team_id=team.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(admin_user)
            await session.commit()
            print(f"✅ Created admin user: {settings.admin_username}")
