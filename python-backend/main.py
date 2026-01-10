"""
Main FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import timedelta

from app.config import get_settings
from app.types import (
    LoginRequest,
    CreateUserRequest,
    ChangePasswordRequest,
    ProblemSubmission,
    ChatRequest,
    ChatResponse
)
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)
from app.database import init_db
from app.vector_db import VectorDB
from app.rag_engine import RAGEngine
from app.servicenow_api import ServiceNowAPI
from app.types import ServiceNowConfig

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

# Global instances (will be initialized on startup)
vector_db: Optional[VectorDB] = None
rag_engine: Optional[RAGEngine] = None
servicenow_api: Optional[ServiceNowAPI] = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global vector_db, rag_engine, servicenow_api
    
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
        vector_db = VectorDB()
        
        # Determine vector size based on LLM provider
        vector_size = 1536 if settings.openai_api_key else 768
        await vector_db.initialize(vector_size)
        print("✅ Vector Database initialized\n")
        
        # Initialize RAG Engine
        print("🧠 Initializing RAG Engine...")
        rag_engine = RAGEngine(vector_db)
        await rag_engine.initialize(vector_size)
        print("✅ RAG Engine initialized\n")
    except Exception as e:
        print(f"⚠️  Vector Database/RAG Engine initialization failed: {e}")
        print("⚠️  Continuing without AI features\n")
    print("✅ RAG Engine initialized\n")
    
    # Initialize ServiceNow API
    if settings.servicenow_instance_url and settings.servicenow_username:
        print("🔧 Connecting to ServiceNow...")
        servicenow_config = ServiceNowConfig(
            instance_url=settings.servicenow_instance_url,
            username=settings.servicenow_username,
            password=settings.servicenow_password
        )
        servicenow_api = ServiceNowAPI(servicenow_config)
        
        # Test connection
        try:
            result = await servicenow_api.get_pending_tickets(keywords=[], limit=1)
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


# ===== HEALTH CHECK =====

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": "2026-01-10T22:13:38+05:30"
    }


# ===== USER ENDPOINTS =====

@app.post("/api/submit-problem")
async def submit_problem(submission: ProblemSubmission):
    """Submit a problem and get AI-generated solution"""
    if not rag_engine:
        raise HTTPException(
            status_code=500,
            detail="RAG engine not initialized"
        )
    
    try:
        solution = await rag_engine.generate_solution(
            submission,
            servicenow_api
        )
        
        return {
            "success": True,
            "solution": solution.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate solution: {str(e)}"
        )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Public chat endpoint for getting AI answers"""
    if not rag_engine:
        raise HTTPException(
            status_code=500,
            detail="RAG engine not initialized"
        )
    
    try:
        # Use RAG engine to find answer
        result = await rag_engine.generate_solution(
            ProblemSubmission(problem=request.question)
        )
        
        # Extract sources from similar cases
        sources = [
            case.problem
            for case in result.similar_cases
            if case.similarity > 0.7
        ][:3]
        
        # Format steps into readable text
        answer = "No solution found."
        if result.steps:
            answer = "\n\n".join([
                step.description.lstrip("0123456789. ")
                for step in result.steps
            ])
        
        return ChatResponse(
            answer=answer,
            confidence=result.confidence,
            sources=sources if sources else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}"
        )


# ===== ADMIN ENDPOINTS =====

@app.post("/api/admin/auth")
async def admin_login(request: LoginRequest):
    """Admin login endpoint"""
    # For now, use environment variables for admin auth
    # In production, this should check against database
    if (request.username == settings.admin_username and 
        request.password == settings.admin_password):
        
        access_token = create_access_token(
            data={
                "sub": request.username,
                "role": "admin"
            }
        )
        
        return {
            "success": True,
            "message": "Logged in successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": request.username,
                "role": "admin"
            }
        }
    
    raise HTTPException(
        status_code=401,
        detail="Invalid credentials"
    )


@app.post("/api/admin/logout")
async def admin_logout():
    """Admin logout endpoint"""
    return {"success": True}


@app.get("/api/admin/auth/status")
async def auth_status():
    """Check authentication status"""
    # This would need to verify JWT token in production
    return {
        "isAuthenticated": True,
        "username": "admin",
        "role": "admin"
    }


# ===== TEST ENDPOINTS =====

@app.get("/api/test/incident/{incident_id}")
async def test_incident(incident_id: str):
    """Test endpoint for incident retrieval"""
    mock_incident = {
        "id": incident_id,
        "number": f"INC{incident_id.zfill(7)}",
        "shortDescription": f"Test incident {incident_id}",
        "description": f"This is a dummy test incident with ID: {incident_id}",
        "state": "New",
        "priority": "3 - Moderate",
        "category": "Software",
        "assignedTo": "Test User",
        "createdAt": "2026-01-10T22:13:38+05:30",
        "updatedAt": "2026-01-10T22:13:38+05:30",
        "status": "open",
        "impact": "3 - Low",
        "urgency": "3 - Low"
    }
    
    return {
        "success": True,
        "incident": mock_incident,
        "message": "This is a dummy test endpoint"
    }


# ===== ROOT REDIRECT =====

@app.get("/")
async def root():
    """Redirect to API docs"""
    return {
        "message": "Taigun - ServiceNow AI Agent API",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
