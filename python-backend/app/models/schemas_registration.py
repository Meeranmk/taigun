"""
Registration-specific Pydantic schemas
"""
from typing import Optional
from pydantic import BaseModel, Field


class OrganizationRegistrationRequest(BaseModel):
    """Complete registration request matching frontend OrganizationRegistration interface"""
    # Step 1: Organization Information
    organizationName: str = Field(..., min_length=2)
    organizationEmail: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    website: Optional[str] = None
    industry: str = Field(..., min_length=1)
    size: str = Field(..., pattern=r'^(1-10|11-50|51-200|201-500|500\+)$')
    country: str = Field(..., min_length=1)
    timezone: str = Field(..., min_length=1)
    
    # Step 2: Team Admin Information
    adminFirstName: str = Field(..., min_length=2)
    adminLastName: str = Field(..., min_length=2)
    adminEmail: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    adminPhone: Optional[str] = None
    initialTeamName: str = Field(..., min_length=2)
    
    # Step 3: Initial Settings
    serviceNowInstanceUrl: str = Field(..., pattern=r'^https?://.+')
    serviceNowUsername: str = Field(..., min_length=1)
    serviceNowPassword: str = Field(..., min_length=1)
    authMethod: str = Field(..., pattern=r'^(oauth|api_key)$')
    googleApiKey: Optional[str] = None
    openaiApiKey: Optional[str] = None
    defaultLanguage: str = Field(..., min_length=1)
    dataRetentionPolicy: str = Field(..., min_length=1)
    acceptedTerms: bool = Field(..., description="Must be true")
    
    class Config:
        json_schema_extra = {
            "example": {
                "organizationName": "Acme Corporation",
                "organizationEmail": "contact@acme.com",
                "website": "https://acme.com",
                "industry": "Technology",
                "size": "11-50",
                "country": "United States",
                "timezone": "America/New_York",
                "adminFirstName": "John",
                "adminLastName": "Doe",
                "adminEmail": "john.doe@acme.com",
                "adminPhone": "+1 (555) 123-4567",
                "initialTeamName": "Default Team",
                "serviceNowInstanceUrl": "https://dev123.service-now.com",
                "serviceNowUsername": "admin",
                "serviceNowPassword": "password123",
                "authMethod": "api_key",
                "googleApiKey": "AIza...",
                "openaiApiKey": "sk-...",
                "defaultLanguage": "English",
                "dataRetentionPolicy": "90 days",
                "acceptedTerms": True
            }
        }


class OrganizationResponse(BaseModel):
    """Organization response matching frontend Organization interface"""
    id: str
    name: str
    email: str
    website: Optional[str] = None
    industry: str
    size: str
    country: str
    timezone: str
    status: str
    createdAt: str
    updatedAt: str
    totalTeams: int = 0
    totalUsers: int = 0
    
    class Config:
        from_attributes = True


class EmailVerificationResponse(BaseModel):
    """Response after sending verification email"""
    success: bool
    message: str
    email: str
    expiresIn: int  # minutes


class VerifyEmailRequest(BaseModel):
    """Request to verify email with token"""
    token: str = Field(..., min_length=1)


class VerifyEmailResponse(BaseModel):
    """Response after email verification"""
    success: bool
    message: str
    organizationId: Optional[str] = None
    userId: Optional[str] = None
    temporaryPassword: Optional[str] = None  # Only for organization registration
