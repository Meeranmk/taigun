"""
Configuration and Settings Management
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ServiceNow Configuration
    servicenow_instance_url: str = ""
    servicenow_username: str = ""
    servicenow_password: str = ""
    
    # LLM Provider
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    
    # SSO Configuration
    sso_signin_url: str = "https://your-sso-portal.com/login"
    
    # Agent Configuration
    ticket_check_interval: int = 300000
    auto_resolve_tickets: bool = False
    access_keywords: str = "access,login,sign in,authentication,SSO,password,credentials"
    
    # RAG Configuration
    rag_enabled: bool = True
    rag_similarity_threshold: float = 0.7
    rag_max_similar_cases: int = 5
    rag_embedding_model: str = "text-embedding-3-small"
    
    # API Server
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    enable_cors: bool = True
    frontend_url: str = "http://localhost:3000"  # Frontend URL for email links
    
    # SMTP Email Configuration
    smtp_enabled: bool = True
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@taigun.com"
    smtp_from_name: str = "Taigun ServiceNow AI"
    smtp_use_tls: bool = True
    
    # Admin Authentication
    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_session_secret: str = "change-this-to-a-random-secret-in-production"
    
    # Knowledge Base
    kb_priority_weight: float = 2.0
    
    # ServiceNow Ticket Monitor
    ticket_monitor_enabled: bool = True
    ticket_monitor_interval_seconds: int = 600  # 10 minutes default
    
    # Vector Database - Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection_prefix: str = ""
    vector_db_batch_size: int = 50
    enable_servicenow_embedding: bool = True
    
    # PostgreSQL Database - Individual fields
    pg_host: Optional[str] = None
    pg_name: Optional[str] = None
    pg_port: Optional[int] = None
    pg_user: Optional[str] = None
    pg_password: Optional[str] = None
    
    def get_database_url(self) -> str:
        """Get database URL from individual PostgreSQL fields"""
        if all([self.pg_host, self.pg_name, self.pg_port, self.pg_user, self.pg_password]):
            # Use psycopg2 with sslmode=require for Aiven
            return f"postgresql://{self.pg_user}:{self.pg_password}@{self.pg_host}:{self.pg_port}/{self.pg_name}?sslmode=require"
        
        # Default fallback
        return "postgresql://user:password@localhost:5432/servicenow_db"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
