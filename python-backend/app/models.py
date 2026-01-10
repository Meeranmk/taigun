"""
Database Models using SQLAlchemy
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    team_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    service_now_url = Column(String)
    service_now_username = Column(String)
    service_now_password_encrypted = Column(String)
    settings = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    problem = Column(Text, nullable=False)
    solution = Column(JSON, nullable=False)
    category = Column(String, nullable=False, index=True)
    tags = Column(JSON, default=[])
    priority = Column(String, default="medium")
    created_by = Column(String)
    usage_count = Column(Integer, default=0)
    effectiveness = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ProcessedTicket(Base):
    __tablename__ = "processed_tickets"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, unique=True, nullable=False, index=True)
    ticket_number = Column(String)
    problem = Column(Text)
    solution = Column(JSON)
    confidence = Column(Float)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())


class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    service_now_url = Column(String)
    service_now_username = Column(String)
    service_now_password_encrypted = Column(String)
    google_api_key_encrypted = Column(String)
    openai_api_key_encrypted = Column(String)
    ticket_check_interval = Column(Integer, default=60000)
    enable_ticket_monitor = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
