"""
Database connection and management using SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.config import get_settings

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
        echo=True,
        connect_args={"ssl": "require"}
    )
else:
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(database_url, echo=True)

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
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
