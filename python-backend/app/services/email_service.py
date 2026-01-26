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
        purpose: str = "registration",
        username: str = None
    ) -> bool:
        """
        Send verification email via SMTP
        
        Args:
            email: Recipient email
            token: Verification token
            purpose: Purpose of email
            username: User ID (optional, for registration emails)
            
        Returns:
            True if sent successfully
        """
        # Construct verification URL
        frontend_url = settings.frontend_url
        verification_url = f"{frontend_url}/verify-email?token={token}"
        
        # Email content based on purpose
        if purpose == "registration":
            subject = "Verify your email - Taigun ServiceNow AI Agent"
            
            # Include user ID in email if provided
            user_id_section = ""
            if username:
                user_id_section = f"""
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
                        <p><strong>Your User ID:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px; font-size: 18px; font-weight: bold;">{username}</code></p>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">You'll use this User ID to log in after creating your password.</p>
                    </div>
                """
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to Taigun!</h1>
                    </div>
                    <div class="content">
                        <p>Thank you for registering your organization with Taigun ServiceNow AI Agent.</p>
                        {user_id_section}
                        <p>Please verify your email address by clicking the button below:</p>
                        <p style="text-align: center;">
                            <a href="{verification_url}" class="button">Verify Email Address</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">
                            {verification_url}
                        </p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>If you didn't create this account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Taigun ServiceNow AI Agent. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        elif purpose == "invitation":
            subject = "You've been invited to join Taigun"
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📨 You've been invited!</h1>
                    </div>
                    <div class="content">
                        <p>You've been invited to join an organization on Taigun ServiceNow AI Agent.</p>
                        <p style="text-align: center;">
                            <a href="{verification_url}" class="button">Accept Invitation</a>
                        </p>
                        <p>This link will expire in 24 hours.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        else:
            subject = "Verify your email - Taigun"
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Email Verification</h2>
                <p>Please verify your email address:</p>
                <p><a href="{verification_url}" style="padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            </body>
            </html>
            """
        
        # Send email via SMTP
        return await self._send_smtp_email(
            to_email=email,
            subject=subject,
            html_body=html_body
        )
    
    async def send_welcome_email(
        self,
        email: str,
        first_name: str,
        organization_name: str,
        temporary_password: str
    ) -> bool:
        """
        Send welcome email with temporary password via SMTP
        
        Args:
            email: Recipient email
            first_name: User's first name
            organization_name: Organization name
            temporary_password: Temporary password for first login
            
        Returns:
            True if sent successfully
        """
        login_url = f"{settings.frontend_url}/login"
        
        subject = f"Welcome to {organization_name} on Taigun!"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .credentials {{ background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0; }}
                .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .warning {{ background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome, {first_name}!</h1>
                </div>
                <div class="content">
                    <p>Your email has been verified and your account is now active.</p>
                    
                    <div class="credentials">
                        <h3>Your Login Credentials:</h3>
                        <p><strong>Email:</strong> {email}</p>
                        <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">{temporary_password}</code></p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Login Now</a>
                    </p>
                    
                    <div class="warning">
                        <p><strong>⚠️ Important:</strong> You will be required to change your password on first login for security purposes.</p>
                    </div>
                    
                    <p>If you have any questions, please contact support.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email via SMTP
        return await self._send_smtp_email(
            to_email=email,
            subject=subject,
            html_body=html_body
        )
    
    async def send_welcome_email_no_password(
        self,
        email: str,
        first_name: str,
        organization_name: str,
        username: str = None
    ) -> bool:
        """
        Send welcome email WITHOUT password - user will create password on frontend
        
        Args:
            email: Recipient email
            first_name: User's first name
            organization_name: Organization name
            username: User ID (optional)
            
        Returns:
            True if sent successfully
        """
        login_url = f"{settings.frontend_url}/create-password"
        
        # Include user ID section if provided
        user_id_section = ""
        if username:
            user_id_section = f"""
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
                    <p><strong>Your User ID:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px; font-size: 18px; font-weight: bold;">{username}</code></p>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">Use this User ID along with your password to log in.</p>
                </div>
            """
        
        subject = f"Welcome to {organization_name} on Taigun!"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .info-box {{ background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome, {first_name}!</h1>
                </div>
                <div class="content">
                    <p>Your email has been verified successfully!</p>
                    {user_id_section}
                    <div class="info-box">
                        <p><strong>Next Step:</strong> Create your password to complete your account setup.</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Create Password</a>
                    </p>
                    
                    <p>Once you've created your password, you'll be able to log in and start using Taigun ServiceNow AI Agent.</p>
                    
                    <p>If you have any questions, please contact support.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email via SMTP
        return await self._send_smtp_email(
            to_email=email,
            subject=subject,
            html_body=html_body
        )
    
    async def _send_smtp_email(
        self,
        to_email: str,
        subject: str,
        html_body: str
    ) -> bool:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient email
            subject: Email subject
            html_body: HTML email body
            
        Returns:
            True if sent successfully
        """
        if not settings.smtp_enabled:
            logger.warning("SMTP is disabled. Email not sent.")
            print(f"\n📧 [SMTP DISABLED] Would send email to: {to_email}")
            print(f"Subject: {subject}\n")
            return False
        
        if not settings.smtp_username or not settings.smtp_password:
            logger.error("SMTP credentials not configured")
            print(f"\n❌ SMTP credentials missing. Please configure SMTP_USERNAME and SMTP_PASSWORD in .env")
            print(f"Email to: {to_email}")
            print(f"Subject: {subject}\n")
            return False
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg['To'] = to_email
            
            # Attach HTML body
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server
            logger.info(f"Connecting to SMTP server: {settings.smtp_host}:{settings.smtp_port}")
            
            if settings.smtp_use_tls:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port)
            
            # Login
            server.login(settings.smtp_username, settings.smtp_password)
            
            # Send email
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            print(f"\n✅ Email sent to: {to_email}")
            print(f"Subject: {subject}\n")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            print(f"\n❌ Failed to send email to: {to_email}")
            print(f"Error: {str(e)}\n")
            return False
