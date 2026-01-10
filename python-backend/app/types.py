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
    step_number: int
    description: str
    command: Optional[str] = None
    expected_outcome: Optional[str] = None


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


class User(BaseModel):
    id: str
    username: str
    email: str
    role: str
    team_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class Team(BaseModel):
    id: str
    name: str
    service_now_url: str
    service_now_username: str
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    sources: Optional[List[str]] = None
