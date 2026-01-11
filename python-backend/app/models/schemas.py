"""
Type definitions for ServiceNow FastAPI Application
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ServiceNowConfig(BaseModel):
    instance_url: str
    username: str
    password: str


class ServiceNowTicket(BaseModel):
    sys_id: str
    number: str
    short_description: str
    description: str
    state: str
    priority: str
    caller_id: str
    assigned_to: Optional[str] = None
    work_notes: Optional[str] = None
    comments: Optional[str] = None
    sys_created_on: str
    sys_updated_on: str


class TicketQueryParams(BaseModel):
    state: Optional[str] = None
    keywords: Optional[List[str]] = None
    limit: Optional[int] = 10


class TicketUpdateParams(BaseModel):
    sys_id: str
    state: Optional[str] = None
    work_notes: Optional[str] = None
    comments: Optional[str] = None
    assigned_to: Optional[str] = None


class IssueCategory(BaseModel):
    id: str
    name: str
    keywords: List[str]
    description: str
    resolution_template: str


class AgentConfig(BaseModel):
    check_interval: int
    auto_resolve: bool
    categories: List[IssueCategory]
    default_category: str


class TicketState(str, Enum):
    NEW = "1"
    IN_PROGRESS = "2"
    ON_HOLD = "3"
    RESOLVED = "6"
    CLOSED = "7"
    CANCELED = "8"


class ProblemSubmission(BaseModel):
    problem: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None


class SolutionStep(BaseModel):
    step_number: int = Field(alias="stepNumber")
    type: Optional[str] = None
    description: str
    command: Optional[str] = None
    expected_outcome: Optional[str] = None
    
    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase


class SimilarCase(BaseModel):
    problem: str
    solution: List[SolutionStep]
    similarity: float
    source: str
    category: Optional[str] = None


class GeneratedSolution(BaseModel):
    problem: str
    steps: List[SolutionStep]
    confidence: float
    similar_cases: List[SimilarCase]
    category: Optional[str] = None


class KnowledgeBaseEntry(BaseModel):
    id: str
    problem: str
    solution: List[SolutionStep]
    category: str
    tags: List[str]
    priority: str = Field(default="medium")
    created_by: str
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    effectiveness: float = 0.0
    
    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    code: str
    features: Dict[str, Any]
    price: float
    is_active: bool
    
    class Config:
        from_attributes = True


class OrganizationCreate(BaseModel):
    name: str
    contact_email: str
    plan_code: str = "basic"


class OrganizationResponse(BaseModel):
    id: str
    name: str
    contact_email: Optional[str]
    plan_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class User(BaseModel):
    id: str
    username: str
    email: str
    role: str
    organization_id: Optional[str]
    team_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Team(BaseModel):
    id: str
    name: str
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"
    organization_id: Optional[str] = None
    team_id: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    sources: Optional[List[str]] = None


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    team_id: Optional[str] = None
    password: Optional[str] = None


class CreateKBRequest(BaseModel):
    problem: str
    solution: List[SolutionStep]
    category: str
    tags: List[str] = []
    priority: str = "medium"
    created_by: str


class UpdateKBRequest(BaseModel):
    problem: Optional[str] = None
    solution: Optional[List[SolutionStep]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[str] = None
    usage_count: Optional[int] = None
    effectiveness: Optional[float] = None


class SettingsResponse(BaseModel):
    id: str
    key: Optional[str] = None
    servicenow_url: Optional[str] = None
    servicenow_username: Optional[str] = None
    # ticket_check_interval and enable_ticket_monitor are now in Team model
    # but we can keep them here as optional if the frontend still expects them
    ticket_check_interval: Optional[int] = None
    enable_ticket_monitor: Optional[bool] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class UpdateSettingsRequest(BaseModel):
    servicenow_url: Optional[str] = None
    servicenow_username: Optional[str] = None
    servicenow_password: Optional[str] = None # Input only
    google_api_key: Optional[str] = None       # Input only
    openai_api_key: Optional[str] = None       # Input only
    ticket_check_interval: Optional[int] = None
    enable_ticket_monitor: Optional[bool] = None



