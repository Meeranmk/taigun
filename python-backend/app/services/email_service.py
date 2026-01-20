"""
Email Service for sending verification and notification emails
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.sql import EmailVerificationToken
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailService:
    """Reusable email service for verification and notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_verification_token(
        self,
        email: str,
        entity_type: str,
        entity_id: str,
        purpose: str = "registration",
        expires_in_hours: int = 24
    ) -> str:
        """
        Create a verification token for email verification
        
        Args:
            email: Email address to verify
            entity_type: Type of entity ('organization', 'user', 'team')
            entity_id: ID of the entity
            purpose: Purpose of verification ('registration', 'email_change', 'invitation')
            expires_in_hours: Token expiration time in hours
            
        Returns:
            Generated token string
        """
        # Generate secure random token
        token = secrets.token_urlsafe(32)
        
        # Create expiration time
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        
        # Create token record
        verification_token = EmailVerificationToken(
            token=token,
            email=email,
            entity_type=entity_type,
            entity_id=entity_id,
            purpose=purpose,
            expires_at=expires_at
        )
        
        self.db.add(verification_token)
        await self.db.commit()
        
        logger.info(f"Created verification token for {email} ({entity_type}:{entity_id})")
        return token
    
    async def verify_token(self, token: str) -> Optional[EmailVerificationToken]:
        """
        Verify a token and mark it as verified
        
        Args:
            token: Token string to verify
            
        Returns:
            EmailVerificationToken if valid, None otherwise
        """
        stmt = select(EmailVerificationToken).where(
            and_(
                EmailVerificationToken.token == token,
                EmailVerificationToken.verified_at.is_(None),
                EmailVerificationToken.expires_at > datetime.utcnow()
            )
        )
        
        result = await self.db.execute(stmt)
        verification = result.scalars().first()
        
        if verification:
            verification.verified_at = datetime.utcnow()
            await self.db.commit()
            logger.info(f"Token verified for {verification.email}")
            return verification
        
        logger.warning(f"Invalid or expired token: {token[:10]}...")
        return None
    
    async def send_verification_email(
        self,
        email: str,
        token: str,
        purpose: str = "registration"
    ) -> bool:
        """
        Send verification email
        
        Note: This is a placeholder. In production, integrate with:
        - SendGrid
        - AWS SES
        - Mailgun
        - SMTP server
        
        Args:
            email: Recipient email
            token: Verification token
            purpose: Purpose of email
            
        Returns:
            True if sent successfully
        """
        # Construct verification URL
        frontend_url = settings.frontend_url if hasattr(settings, 'frontend_url') else "http://localhost:3000"
        verification_url = f"{frontend_url}/verify-email?token={token}"
        
        # Email content based on purpose
        if purpose == "registration":
            subject = "Verify your email - Taigun ServiceNow AI Agent"
            body = f"""
            <html>
            <body>
                <h2>Welcome to Taigun!</h2>
                <p>Thank you for registering your organization.</p>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_url}">Verify Email Address</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <br>
                <p>If you didn't create this account, please ignore this email.</p>
            </body>
            </html>
            """
        elif purpose == "invitation":
            subject = "You've been invited to join Taigun"
            body = f"""
            <html>
            <body>
                <h2>You've been invited!</h2>
                <p>You've been invited to join an organization on Taigun.</p>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_url}">Accept Invitation</a></p>
                <p>This link will expire in 24 hours.</p>
            </body>
            </html>
            """
        else:
            subject = "Verify your email"
            body = f"""
            <html>
            <body>
                <h2>Email Verification</h2>
                <p>Please verify your email address:</p>
                <p><a href="{verification_url}">Verify Email</a></p>
            </body>
            </html>
            """
        
        # TODO: Integrate with actual email service
        # For now, just log the email
        logger.info(f"📧 Verification email to {email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Verification URL: {verification_url}")
        
        # In development, print to console
        print(f"\n{'='*60}")
        print(f"📧 EMAIL VERIFICATION")
        print(f"{'='*60}")
        print(f"To: {email}")
        print(f"Subject: {subject}")
        print(f"Verification URL: {verification_url}")
        print(f"{'='*60}\n")
        
        return True
    
    async def send_welcome_email(
        self,
        email: str,
        first_name: str,
        organization_name: str,
        temporary_password: str
    ) -> bool:
        """
        Send welcome email with temporary password
        
        Args:
            email: Recipient email
            first_name: User's first name
            organization_name: Organization name
            temporary_password: Temporary password for first login
            
        Returns:
            True if sent successfully
        """
        frontend_url = settings.frontend_url if hasattr(settings, 'frontend_url') else "http://localhost:3000"
        login_url = f"{frontend_url}/login"
        
        subject = f"Welcome to {organization_name} on Taigun!"
        body = f"""
        <html>
        <body>
            <h2>Welcome, {first_name}!</h2>
            <p>Your email has been verified and your account is now active.</p>
            
            <h3>Login Credentials:</h3>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Temporary Password:</strong> {temporary_password}</p>
            
            <p><a href="{login_url}">Login Now</a></p>
            
            <p><strong>Important:</strong> You will be required to change your password on first login.</p>
            
            <br>
            <p>If you have any questions, please contact support.</p>
        </body>
        </html>
        """
        
        # TODO: Integrate with actual email service
        logger.info(f"📧 Welcome email to {email}")
        
        # In development, print to console
        print(f"\n{'='*60}")
        print(f"📧 WELCOME EMAIL")
        print(f"{'='*60}")
        print(f"To: {email}")
        print(f"Subject: {subject}")
        print(f"Temporary Password: {temporary_password}")
        print(f"Login URL: {login_url}")
        print(f"{'='*60}\n")
        
        return True
