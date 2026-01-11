"""
Database Models using SQLAlchemy
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, Text, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False) # e.g. 'free', 'pro'
    features = Column(JSONB, default={})
    price = Column(Numeric, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    contact_email = Column(String)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class OrganizationSetting(Base):
    __tablename__ = "organization_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    key = Column(String, nullable=False, index=True)
    value = Column(Text) # Can store JSON string if needed
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('organization_id', 'key', name='uix_org_key'),
    )


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user") # platform_owner, org_admin, team_admin, user
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True) # Nullable for Platform Owner potentially, or just map them to a "System Org"
    team_id = Column(UUID(as_uuid=True), nullable=True) # Nullable now
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True) # Added for multi-tenancy
    problem = Column(Text, nullable=False)
    solution = Column(JSONB, nullable=False)
    category = Column(String, nullable=False, index=True)
    tags = Column(ARRAY(String), default=[])
    priority = Column(String, default="medium")
    created_by = Column(String) 
    usage_count = Column(Integer, default=0)
    effectiveness = Column(Numeric, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ProcessedTicket(Base):
    __tablename__ = "processed_tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True) # Added for multi-tenancy
    ticket_sys_id = Column(String, unique=True, nullable=False, index=True)
    ticket_number = Column(String)
    solution_provided = Column(Text)
    confidence_score = Column(Numeric)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
