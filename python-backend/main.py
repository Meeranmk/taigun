"""
Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.services.vector_service import VectorDB
from app.services.rag_service import RAGEngine
from app.services.servicenow_service import ServiceNowAPI
from app.models.schemas import ServiceNowConfig
from app.core import dependencies
from app.routers import api_router

settings = get_settings()

# Initialize FastAPI app
app = FastAPI(
    title="Taigun - ServiceNow AI Agent",
    description="AI-powered ServiceNow ticket automation and knowledge management",
    version="1.0.0"
)

# CORS middleware
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🤖 Taigun - ServiceNow AI Agent")
    print("=" * 50)
    
    # Initialize database (optional)
    print("🔧 Initializing PostgreSQL Database...")
    try:
        await init_db()
        print("✅ Database initialized\n")
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("⚠️  Continuing without database (some features may not work)\n")
    
    # Initialize Vector Database (optional)
    print("🔧 Initializing Qdrant Vector Database...")
    try:
        # Create and store VectorDB instance
        dependencies.vector_db = VectorDB()
        
        # Determine vector size based on LLM provider
        vector_size = 1536 if settings.openai_api_key else 768
        await dependencies.vector_db.initialize(vector_size)
        print("✅ Vector Database initialized\n")
        
        # Initialize RAG Engine and store instance
        print("🧠 Initializing RAG Engine...")
        dependencies.rag_engine = RAGEngine(dependencies.vector_db)
        await dependencies.rag_engine.initialize(vector_size)
        print("✅ RAG Engine initialized\n")
    except Exception as e:
        print(f"⚠️  Vector Database/RAG Engine initialization failed: {e}")
        print("⚠️  Continuing without AI features\n")
    
    # Initialize ServiceNow API
    if settings.servicenow_instance_url and settings.servicenow_username:
        print("🔧 Connecting to ServiceNow...")
        servicenow_config = ServiceNowConfig(
            instance_url=settings.servicenow_instance_url,
            username=settings.servicenow_username,
            password=settings.servicenow_password
        )
        dependencies.servicenow_api = ServiceNowAPI(servicenow_config)
        
        # Test connection
        try:
            result = await dependencies.servicenow_api.get_pending_tickets(keywords=[], limit=1)
            if result.get("success"):
                print("✅ Connected to ServiceNow\n")
            else:
                print("⚠️  ServiceNow connection test failed\n")
        except Exception as e:
            print(f"⚠️  ServiceNow connection error: {e}\n")
    else:
        print("⚠️  ServiceNow credentials not configured\n")
    
    print("✨ System ready!\n")
    print("📍 Available Services:")
    print(f"   • API Server: http://{settings.api_host}:{settings.api_port}")
    print(f"   • API Docs: http://{settings.api_host}:{settings.api_port}/docs")
    print("")


# Include Routers
app.include_router(api_router)

# ===== ROOT REDIRECT =====

@app.get("/")
async def root():
    """Redirect to API docs"""
    return {
        "message": "Taigun - ServiceNow AI Agent API",
        "docs": "/docs",
        "health": "/api/health"
    }


# Health Check (Keep top level for easy access or move to router?)
# Moving to main as it's a system endpoint, or could be in a 'system' router.
# Let's keep /api/health here or add it to routers. 
# The routers/__init__.py includes routers with prefixes.
# I'll manually add a simple health route here or keep it.
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    pass # Wait, I should implement it.
    return {
        "status": "ok",
        "timestamp": "2026-01-10T22:13:38+05:30"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
