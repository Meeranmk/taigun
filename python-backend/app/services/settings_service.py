"""
Settings Service
Handles database operations for application settings (encryption/decryption)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.sql import OrganizationSetting
from app.models.schemas import UpdateSettingsRequest, SettingsResponse
from app.core.crypto import encrypt, decrypt
import uuid
from datetime import datetime

class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, organization_id: str) -> SettingsResponse:
        """Get settings for an organization"""
        if not organization_id:
            raise ValueError("Organization ID is required")
            
        result = await self.db.execute(select(OrganizationSetting).where(OrganizationSetting.organization_id == organization_id))
        rows = result.scalars().all()
        
        settings_dict = {row.key: row.value for row in rows}
        
        return SettingsResponse(
            id=str(organization_id),
            key="org_settings",
            servicenow_url=settings_dict.get("servicenow_url"),
            servicenow_username=settings_dict.get("servicenow_username"),
            ticket_check_interval=int(settings_dict.get("ticket_check_interval", 60000)),
            enable_ticket_monitor=settings_dict.get("enable_ticket_monitor") == "true",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

    async def update_settings(self, settings_in: UpdateSettingsRequest, organization_id: str) -> SettingsResponse:
        if not organization_id:
             raise ValueError("Organization ID is required")

        update_data = settings_in.dict(exclude_unset=True)
        
        # Helper to upsert
        async def upsert_setting(key, value, encrypted=False):
            # Check if exists
            result = await self.db.execute(
                select(OrganizationSetting).where(
                    OrganizationSetting.organization_id == organization_id,
                    OrganizationSetting.key == key
                )
            )
            setting = result.scalars().first()
            
            if not setting:
                setting = OrganizationSetting(
                    id=uuid.uuid4(),
                    organization_id=organization_id,
                    key=key,
                    created_at=datetime.utcnow()
                )
                self.db.add(setting)
            
            setting.value = str(value) if value is not None else None
            setting.is_encrypted = encrypted
            setting.updated_at = datetime.utcnow()

        # Handle explicit fields
        if "servicenow_url" in update_data:
            await upsert_setting("servicenow_url", update_data["servicenow_url"])
            
        if "servicenow_username" in update_data:
            await upsert_setting("servicenow_username", update_data["servicenow_username"])

        if "servicenow_password" in update_data:
            encrypted = encrypt(update_data["servicenow_password"])
            await upsert_setting("servicenow_password_encrypted", encrypted, encrypted=True)
            
        if "google_api_key" in update_data:
            encrypted = encrypt(update_data["google_api_key"])
            await upsert_setting("google_api_key_encrypted", encrypted, encrypted=True)
            
        if "openai_api_key" in update_data:
            encrypted = encrypt(update_data["openai_api_key"])
            await upsert_setting("openai_api_key_encrypted", encrypted, encrypted=True)
            
        if "ticket_check_interval" in update_data:
            await upsert_setting("ticket_check_interval", update_data["ticket_check_interval"])
            
        if "enable_ticket_monitor" in update_data:
             await upsert_setting("enable_ticket_monitor", str(update_data["enable_ticket_monitor"]).lower())

        await self.db.commit()
        return await self.get_settings(organization_id)
    
    async def get_decrypted_settings(self, organization_id: str) -> dict:
        """Get settings with decrypted values (internal use only)"""
        if not organization_id:
             return {}

        result = await self.db.execute(select(OrganizationSetting).where(OrganizationSetting.organization_id == organization_id))
        rows = result.scalars().all()
        settings_dict = {row.key: row for row in rows}
        
        def get_val(key):
            row = settings_dict.get(key)
            if not row: return None
            return row.value

        def get_decrypted(key):
            row = settings_dict.get(key)
            if not row: return None
            if row.is_encrypted and row.value:
                try:
                    return decrypt(row.value)
                except:
                    return None
            return row.value

        return {
            "servicenow_url": get_val("servicenow_url"),
            "servicenow_username": get_val("servicenow_username"),
            "servicenow_password": get_decrypted("servicenow_password_encrypted"),
            "google_api_key": get_decrypted("google_api_key_encrypted"),
            "openai_api_key": get_decrypted("openai_api_key_encrypted"),
        }
