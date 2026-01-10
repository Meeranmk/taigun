"""
Quick start script to run the FastAPI server
"""
import uvicorn
from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    
    print("🚀 Starting Taigun FastAPI Server...")
    print(f"📍 Server will run on http://{settings.api_host}:{settings.api_port}")
    print(f"📚 API Docs: http://{settings.api_host}:{settings.api_port}/docs")
    print("")
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info",
        access_log=True  # Enable access logging
    )
