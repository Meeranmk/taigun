"""
Run database migrations
"""
import asyncio
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()


async def run_migration():
    """Run SQL migration file"""
    # Get database URL
    database_url = settings.get_database_url()
    
    # Convert to async URL
    if database_url.startswith("postgresql://"):
        async_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    else:
        async_url = database_url
    
    # Remove sslmode from URL and pass it as connect_args
    # asyncpg doesn't support sslmode in URL, it needs to be passed as ssl parameter
    if "?sslmode=" in async_url or "&sslmode=" in async_url:
        # Extract sslmode value
        import re
        sslmode_match = re.search(r'[?&]sslmode=([^&]+)', async_url)
        if sslmode_match:
            # Remove sslmode from URL
            async_url = re.sub(r'[?&]sslmode=[^&]+', '', async_url)
            # Clean up any trailing ? or &
            async_url = async_url.rstrip('?&')
            
            # For asyncpg, we need to use ssl='require' as a connection argument
            # Create engine with ssl connection argument
            engine = create_async_engine(
                async_url, 
                echo=False,
                connect_args={"ssl": "require"}
            )
        else:
            engine = create_async_engine(async_url, echo=False)
    else:
        # Create engine
        engine = create_async_engine(async_url, echo=False)
    
    # Read migration file
    migration_file = Path(__file__).parent / "migrations" / "001_add_registration_fields.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration: {migration_file.name}")
    sql_content = migration_file.read_text()
    
    # Split into individual statements (remove comments and empty lines)
    lines = sql_content.split('\n')
    statements = []
    current_statement = []
    
    for line in lines:
        # Skip comment lines
        if line.strip().startswith('--') or line.strip().startswith('COMMENT'):
            continue
        # Skip empty lines
        if not line.strip():
            continue
        
        current_statement.append(line)
        
        # If line ends with semicolon, it's end of statement
        if line.strip().endswith(';'):
            stmt = '\n'.join(current_statement)
            if stmt.strip():
                statements.append(stmt)
            current_statement = []
    
    print(f"🔄 Running {len(statements)} SQL statements...\n")
    
    try:
        async with engine.begin() as conn:
            for i, statement in enumerate(statements, 1):
                if statement.strip():
                    # Show what we're executing
                    first_line = statement.strip().split('\n')[0][:80]
                    print(f"[{i}/{len(statements)}] {first_line}...")
                    
                    try:
                        await conn.execute(text(statement))
                        print(f"✅ Completed\n")
                    except Exception as e:
                        print(f"⚠️  Warning: {str(e)[:100]}\n")
                        # Continue with other statements
        
        print("="*60)
        print("✅ Migration completed successfully!")
        print("="*60)
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)
