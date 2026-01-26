"""
Registration Service for handling organization registration
"""
import secrets
import string
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.sql import Organization, User, Team, OrganizationSetting
from app.models.schemas_registration import OrganizationRegistrationRequest
from app.services.email_service import EmailService
from app.core.config import get_settings
from app.core.security import get_password_hash

settings = get_settings()
logger = logging.getLogger(__name__)



class RegistrationService:
    """Service for handling organization registration"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService(db)
    
    def _generate_temporary_password(self, length: int = 12) -> str:
        """Generate a secure temporary password"""
        characters = string.ascii_letters + string.digits + string.punctuation
        password = ''.join(secrets.choice(characters) for _ in range(length))
        return password
    
    def _generate_username(self, first_name: str, last_name: str, email: str) -> str:
        """Generate a unique user ID from initials + 3 random digits (e.g., SV343)"""
        # Get first letter of first name and last name
        first_initial = first_name[0].upper() if first_name else 'U'
        last_initial = last_name[0].upper() if last_name else 'X'
        
        # Generate 3 random digits
        random_digits = ''.join(str(secrets.randbelow(10)) for _ in range(3))
        
        # Combine: FirstInitial + LastInitial + 3Digits
        user_id = f"{first_initial}{last_initial}{random_digits}"
        
        return user_id
    
    async def _check_email_exists(self, email: str) -> bool:
        """Check if email already exists in organizations or users"""
        # Check organizations
        org_stmt = select(Organization).where(Organization.contact_email == email)
        org_result = await self.db.execute(org_stmt)
        if org_result.scalars().first():
            return True
        
        # Check users
        user_stmt = select(User).where(User.email == email)
        user_result = await self.db.execute(user_stmt)
        if user_result.scalars().first():
            return True
        
        return False
    
    async def _encrypt_value(self, value: str) -> str:
        """Encrypt sensitive values (placeholder - implement proper encryption)"""
        # TODO: Implement proper encryption using cryptography library
        # For now, just return the value (NOT SECURE - IMPLEMENT ENCRYPTION)
        return value
    
    async def _store_organization_settings(
        self,
        org_id: str,
        registration: OrganizationRegistrationRequest
    ):
        """Store organization settings"""
        settings_to_store = [
            # ServiceNow settings
            ("servicenow_instance_url", registration.serviceNowInstanceUrl, False),
            ("servicenow_username", registration.serviceNowUsername, False),
            ("servicenow_password", await self._encrypt_value(registration.serviceNowPassword), True),
            ("servicenow_auth_method", registration.authMethod, False),
            
            # General settings
            ("default_language", registration.defaultLanguage, False),
            ("data_retention_policy", registration.dataRetentionPolicy, False),
        ]
        
        # Add AI API keys if provided
        if registration.googleApiKey:
            settings_to_store.append(
                ("google_api_key", await self._encrypt_value(registration.googleApiKey), True)
            )
        
        if registration.openaiApiKey:
            settings_to_store.append(
                ("openai_api_key", await self._encrypt_value(registration.openaiApiKey), True)
            )
        
        # Create setting records
        for key, value, is_encrypted in settings_to_store:
            setting = OrganizationSetting(
                organization_id=org_id,
                key=key,
                value=value,
                is_encrypted=is_encrypted
            )
            self.db.add(setting)
        
        await self.db.commit()
        logger.info(f"Stored {len(settings_to_store)} settings for organization {org_id}")
    
    async def register_organization(
        self,
        registration: OrganizationRegistrationRequest
    ) -> Dict[str, Any]:
        """
        Register a new organization with admin user and initial team
        
        Flow:
        1. Validate emails don't exist
        2. Create organization (status='pending')
        3. Create admin user (status='pending', requires_password_change=True)
        4. Create initial team
        5. Store settings
        6. Send verification email
        
        Returns:
            Dict with success status and organization data
        """
        # Validate terms acceptance
        if not registration.acceptedTerms:
            raise ValueError("Terms and conditions must be accepted")
        
        # Check if organization email already exists
        if await self._check_email_exists(registration.organizationEmail):
            raise ValueError(f"Organization email {registration.organizationEmail} is already registered")
        
        # Check if admin email already exists
        if await self._check_email_exists(registration.adminEmail):
            raise ValueError(f"Admin email {registration.adminEmail} is already registered")
        
        try:
            # 1. Create Organization (pending status)
            organization = Organization(
                name=registration.organizationName,
                contact_email=registration.organizationEmail,
                website=registration.website,
                industry=registration.industry,
                size=registration.size,
                country=registration.country,
                timezone=registration.timezone,
                status="pending",  # Will be activated after email verification
                email_verified=False
            )
            self.db.add(organization)
            await self.db.flush()  # Get the org ID
            
            logger.info(f"Created organization: {organization.name} (ID: {organization.id})")
            
            # 2. Create Initial Team
            team = Team(
                name=registration.initialTeamName,
                organization_id=organization.id
            )
            self.db.add(team)
            await self.db.flush()  # Get the team ID
            
            logger.info(f"Created team: {team.name} (ID: {team.id})")
            
            # 3. Create Admin User WITHOUT password (will be set after email verification)
            username = self._generate_username(
                registration.adminFirstName,
                registration.adminLastName,
                registration.adminEmail
            )
            
            admin_user = User(
                username=username,
                email=registration.adminEmail,
                first_name=registration.adminFirstName,
                last_name=registration.adminLastName,
                phone=registration.adminPhone,
                password_hash="",  # Empty - user will set password after verification
                role="org_admin",
                status="pending",  # Will be activated after email verification
                email_verified=False,
                requires_password_change=False,  # Not needed since they'll create their own
                organization_id=organization.id,
                team_id=team.id
            )
            self.db.add(admin_user)
            await self.db.flush()
            
            logger.info(f"Created admin user: {admin_user.email} (ID: {admin_user.id})")
            
            # 5. Store organization settings
            await self._store_organization_settings(str(organization.id), registration)
            
            # 6. Create verification token and send email
            token = await self.email_service.create_verification_token(
                email=registration.organizationEmail,
                entity_type="organization",
                entity_id=str(organization.id),
                purpose="registration",
                expires_in_hours=24
            )
            
            # Send verification email with admin username (user ID)
            await self.email_service.send_verification_email(
                email=registration.organizationEmail,
                token=token,
                purpose="registration",
                username=username  # Pass the generated user ID
            )
            
            # Commit all changes
            await self.db.commit()
            
            logger.info(f"✅ Registration completed for {organization.name}")
            
            return {
                "success": True,
                "message": "Registration successful. Please check your email to verify your account.",
                "organization_id": str(organization.id),
                "admin_email": registration.adminEmail,
                "verification_sent_to": registration.organizationEmail
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Registration failed: {str(e)}")
            raise
    
    async def verify_organization_email(self, token: str) -> Dict[str, Any]:
        """
        Verify organization email and activate account
        
        Args:
            token: Verification token
            
        Returns:
            Dict with verification result and temporary password
        """
        # Verify token
        verification = await self.email_service.verify_token(token)
        
        if not verification:
            return {
                "success": False,
                "message": "Invalid or expired verification token"
            }
        
        if verification.entity_type != "organization":
            return {
                "success": False,
                "message": "Invalid verification token type"
            }
        
        try:
            # Get organization
            org_stmt = select(Organization).where(Organization.id == verification.entity_id)
            org_result = await self.db.execute(org_stmt)
            organization = org_result.scalars().first()
            
            if not organization:
                return {
                    "success": False,
                    "message": "Organization not found"
                }
            
            # Activate organization
            organization.status = "active"
            organization.email_verified = True
            
            # Get and activate admin user
            user_stmt = select(User).where(
                User.organization_id == organization.id,
                User.role == "org_admin"
            )
            user_result = await self.db.execute(user_stmt)
            admin_user = user_result.scalars().first()
            
            if admin_user:
                admin_user.status = "active"
                admin_user.email_verified = True
                # Password remains empty - user will create it on frontend
                
                # Send welcome email WITHOUT password but WITH user ID
                await self.email_service.send_welcome_email_no_password(
                    email=admin_user.email,
                    first_name=admin_user.first_name or "User",
                    organization_name=organization.name,
                    username=admin_user.username  # Pass the user ID
                )
            
            await self.db.commit()
            
            logger.info(f"✅ Organization {organization.name} verified and activated")
            
            return {
                "success": True,
                "message": "Email verified successfully. Please create your password to continue.",
                "organizationId": str(organization.id),
                "userId": str(admin_user.id) if admin_user else None,
                "needsPassword": True  # Frontend should show password creation form
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Email verification failed: {str(e)}")
            raise
    
    async def create_user_password(self, user_id: str, password: str) -> Dict[str, Any]:
        """
        Create password for user after email verification
        
        Args:
            user_id: User ID
            password: New password
            
        Returns:
            Dict with success status
        """
        try:
            # Get user
            user_stmt = select(User).where(User.id == user_id)
            user_result = await self.db.execute(user_stmt)
            user = user_result.scalars().first()
            
            if not user:
                return {
                    "success": False,
                    "message": "User not found"
                }
            
            # Check if user is verified
            if not user.email_verified:
                return {
                    "success": False,
                    "message": "Email not verified. Please verify your email first."
                }
            
            # Check if password is already set
            if user.password_hash and user.password_hash != "":
                return {
                    "success": False,
                    "message": "Password already set. Please use login page."
                }
            
            # Set password
            user.password_hash = get_password_hash(password)
            await self.db.commit()
            
            logger.info(f"✅ Password created for user {user.email}")
            
            return {
                "success": True,
                "message": "Password created successfully. You can now log in."
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Password creation failed: {str(e)}")
            raise
    
    async def resend_verification_email(self, email: str, entity_type: str) -> Dict[str, Any]:
        """
        Resend verification email if original expired or was lost
        
        Args:
            email: Email address
            entity_type: 'organization' or 'user'
            
        Returns:
            Dict with success status
        """
        try:
            if entity_type == "organization":
                # Find organization by email
                org_stmt = select(Organization).where(Organization.contact_email == email)
                org_result = await self.db.execute(org_stmt)
                organization = org_result.scalars().first()
                
                if not organization:
                    return {
                        "success": False,
                        "message": "Organization not found with this email"
                    }
                
                # Check if already verified
                if organization.email_verified:
                    return {
                        "success": False,
                        "message": "Email already verified. Please proceed to login."
                    }
                
                # Create new verification token
                token = await self.email_service.create_verification_token(
                    email=email,
                    entity_type="organization",
                    entity_id=str(organization.id),
                    purpose="registration",
                    expires_in_hours=24
                )
                
                # Send verification email
                await self.email_service.send_verification_email(
                    email=email,
                    token=token,
                    purpose="registration"
                )
                
                logger.info(f"✅ Resent verification email to {email}")
                
                return {
                    "success": True,
                    "message": "Verification email has been resent. Please check your inbox.",
                    "email": email,
                    "expiresIn": 24 * 60  # 24 hours in minutes
                }
                
            else:  # user
                # Find user by email
                user_stmt = select(User).where(User.email == email)
                user_result = await self.db.execute(user_stmt)
                user = user_result.scalars().first()
                
                if not user:
                    return {
                        "success": False,
                        "message": "User not found with this email"
                    }
                
                # Check if already verified
                if user.email_verified:
                    return {
                        "success": False,
                        "message": "Email already verified. Please proceed to login."
                    }
                
                # Create new verification token
                token = await self.email_service.create_verification_token(
                    email=email,
                    entity_type="user",
                    entity_id=str(user.id),
                    purpose="registration",
                    expires_in_hours=24
                )
                
                # Send verification email
                await self.email_service.send_verification_email(
                    email=email,
                    token=token,
                    purpose="registration"
                )
                
                logger.info(f"✅ Resent verification email to {email}")
                
                return {
                    "success": True,
                    "message": "Verification email has been resent. Please check your inbox.",
                    "email": email,
                    "expiresIn": 24 * 60
                }
                
        except Exception as e:
            logger.error(f"Resend verification failed: {str(e)}")
            raise
