import asyncio
from app.core.database import engine, Base
# Import all models to ensure metadata is registered
from app.models.sql import User, Team, Organization, SubscriptionPlan, OrganizationSetting, KnowledgeBase, ProcessedTicket

async def reset_admin():
    async with engine.begin() as conn:
        print("🗑️ Dropping all tables with CASCADE...")
        tables = [
            "processed_tickets", 
            "knowledge_base", 
            "organization_settings", 
            "users", 
            "teams", 
            "organizations", 
            "subscription_plans",
            "settings" # Old table
        ]
        from sqlalchemy import text
        for table in tables:
            await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            
        print("✅ All tables dropped.")
        
        print("🔧 Recreating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables recreated.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
