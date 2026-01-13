
import asyncio
import logging
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import get_settings
from app.models.sql import Organization, OrganizationSetting, ProcessedTicket, KnowledgeBase
from app.services.servicenow_service import ServiceNowAPI
from app.services.rag_service import RAGEngine
from app.services.vector_service import VectorDB
from app.core.database import AsyncSessionLocal
from app.models.schemas import ServiceNowConfig, ProblemSubmission

settings = get_settings()
logger = logging.getLogger(__name__)

class TicketAgentService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        # We need to initialize RAG Engine with VectorDB
        # In a real app, these might be singletons or injected
        self.vector_db = VectorDB()
        self.rag_engine = RAGEngine(self.vector_db)
        # ServiceNowAPI is instantiated per-org usually, or re-instantiated with org creds

    async def _get_org_settings(self, org_id: str) -> Dict[str, Any]:
        """Fetch settings for an organization"""
        stmt = select(OrganizationSetting).where(OrganizationSetting.organization_id == org_id)
        result = await self.db.execute(stmt)
        settings_list = result.scalars().all()
        
        return {s.key: s.value for s in settings_list}

    async def _get_servicenow_client(self, org_settings: Dict[str, Any]) -> Optional[ServiceNowAPI]:
        """Create ServiceNow client from org settings"""
        url = org_settings.get("servicenow_instance_url") or settings.servicenow_instance_url
        username = org_settings.get("servicenow_username") or settings.servicenow_username
        password = org_settings.get("servicenow_password") or settings.servicenow_password # In real app, decrypt this

        if not url or not username or not password:
            return None

        config = ServiceNowConfig(
            instance_url=url,
            username=username,
            password=password
        )
        return ServiceNowAPI(config)

    async def process_ticket(self, sys_id: str, org_id: str) -> Dict[str, Any]:
        """
        Manually trigger AI resolution for a specific ticket.
        """
        # 1. Get Org Settings & Client
        org_settings = await self._get_org_settings(org_id)
        client = await self._get_servicenow_client(org_settings)
        
        if not client:
            return {"success": False, "error": "ServiceNow credentials not configured for this organization"}

        # 2. Fetch Ticket Details
        # Check if input is a ticket number (starts with INC) or a sys_id
        if sys_id.upper().startswith("INC"):
            ticket_result = await client.get_ticket_by_number(sys_id)
        else:
            ticket_result = await client.get_ticket_details(sys_id)

        if not ticket_result.get("success"):
            return {"success": False, "error": f"Failed to fetch ticket: {ticket_result.get('error')}"}
        
        ticket = ticket_result["data"]
        ticket_number = ticket.get("number", "Unknown")
        description = ticket.get("description") or ticket.get("short_description")

        if not description:
            return {"success": False, "error": "Ticket has no description"}

        # 3. Check if already processed (optional, but good practice)
        # For manual trigger, we might want to allow re-processing or check force flag
        # Let's skip check for manual trigger to allow "retry"

        # 4. Generate Solution via RAG
        # Ensure RAG is initialized
        await self.rag_engine.initialize()

        # Extract caller name robustly
        caller_id = ticket.get("caller_id")
        user_name = "Unknown"
        
        if isinstance(caller_id, dict):
            user_name = caller_id.get("display_value") or caller_id.get("name") or "Unknown"
        elif isinstance(caller_id, str):
            user_name = caller_id

        submission = ProblemSubmission(
            problem=description,
            user_name=user_name
        )
        
        # Get org-specific API key for AI generation
        org_api_key = org_settings.get("google_api_key") or org_settings.get("openai_api_key")
        
        solution = await self.rag_engine.generate_solution(submission, org_api_key=org_api_key)

        # 5. Format Solution
        solution_text = self._format_solution_text(solution)
        
        # 6. Post Comment to ServiceNow
        # Use the actual sys_id from the fetched ticket (in case we looked up by number)
        real_sys_id = ticket.get("sys_id")
        
        update_result = await client.update_ticket(
            sys_id=real_sys_id,
            comments=solution_text,
            work_notes=f"AI-generated solution triggered manually. Confidence: {solution.confidence:.2%}"
        )

        if not update_result.get("success"):
            return {"success": False, "error": f"Failed to update ticket: {update_result.get('error')}"}

        # 7. Record in DB (check for duplicates first)
        real_sys_id = ticket.get("sys_id")
        stmt = select(ProcessedTicket).where(
            and_(
                ProcessedTicket.ticket_sys_id == real_sys_id,
                ProcessedTicket.organization_id == org_id
            )
        )
        existing = await self.db.execute(stmt)
        if not existing.scalar_one_or_none():
            await self._record_processed_ticket(org_id, ticket, solution_text, solution.confidence)

        logger.info(f"✅ Ticket {ticket_number} solved successfully via AI (Manual Trigger)")

        return {
            "success": True, 
            "message": f"Ticket {ticket_number} processed successfully",
            "solution": solution
        }

    async def _record_processed_ticket(self, org_id: str, ticket: Dict, solution_text: str, confidence: float):
        """Save processed ticket record to DB"""
        new_record = ProcessedTicket(
            organization_id=org_id,
            ticket_sys_id=ticket.get("sys_id"),
            ticket_number=ticket.get("number"),
            solution_provided=solution_text,
            confidence_score=confidence
        )
        self.db.add(new_record)
        await self.db.commit()

    def _format_solution_text(self, solution) -> str:
        """Format the RAG solution for ServiceNow comments"""
        text = "🤖 AI-Generated Solution\n\n"
        text += f"Problem: {solution.problem}\n\n"
        
        if solution.similar_cases:
             text += f"Based on {len(solution.similar_cases)} similar case(s).\n\n"
        
        text += "SOLUTION STEPS:\n"
        for step in solution.steps:
            text += f"{step.step_number}. {step.description}\n"
            
        text += "\n---\n"
        text += "Please verify if this resolves the issue."
        return text

    # --- Background Monitoring Loop ---

    @classmethod
    async def run_monitoring_loop(cls):
        """
        Continuous background task to monitor tickets for all organizations.
        """
        logger.info("🚀 Starting Ticket Monitoring Loop")
        
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    service = cls(db)
                    await service._check_all_organizations()
            except Exception as e:
                logger.error(f"❌ Error in monitoring loop: {e}")
            
            # Sleep for configured interval (default 10 minutes)
            interval = settings.ticket_monitor_interval_seconds
            await asyncio.sleep(interval)

    async def _check_all_organizations(self):
        """Iterate all orgs and check if they need ticket processing"""
        result = await self.db.execute(select(Organization))
        orgs = result.scalars().all()

        for org in orgs:
            try:
                settings = await self._get_org_settings(org.id)
                
                # Check if monitoring is enabled
                is_enabled = str(settings.get("enable_ticket_monitor", "false")).lower() == "true"
                logger.info(f"Org {org.name} ({org.id}): enable_ticket_monitor={is_enabled}")
                
                if not is_enabled:
                    continue
                
                # Only process if monitoring is enabled for this org
                await self._monitor_org(str(org.id), settings)

            except Exception as e:
                logger.error(f"Error processing org {org.name}: {e}")

    async def _monitor_org(self, org_id: str, settings: Dict[str, Any]):
        """Check tickets for a single org"""
        client = await self._get_servicenow_client(settings)
        if not client:
            return

        # 1. Init RAG (only when actually needed)
        await self.rag_engine.initialize()

        # 2. Get Pending Tickets
        tickets_result = await client.get_pending_tickets(limit=10)
        if not tickets_result.get("success"):
            return
        
        tickets = tickets_result["data"]
        
        for ticket in tickets:
            sys_id = ticket.get("sys_id")
            
            # Check if already processed
            stmt = select(ProcessedTicket).where(
                and_(
                    ProcessedTicket.ticket_sys_id == sys_id,
                    ProcessedTicket.organization_id == org_id
                )
            )
            existing = await self.db.execute(stmt)
            if existing.scalar_one_or_none():
                continue

            # Process Ticket
            ticket_number = ticket.get('number', 'Unknown')
            short_desc = ticket.get('short_description', 'No description')
            logger.info(f"🔄 Processing ticket {ticket_number} - {short_desc[:50]}...")
            
            # Re-using the manual process logic or similar
            # Since self.process_ticket handles getting client/settings again, we can streamline
            # Or just duplicate specific logic to avoid DB hits. 
            # Let's call a private _process_single_ticket that takes client & RAG ready.
            
            await self._process_single_ticket(client, ticket, org_id)


    async def _process_single_ticket(self, client: ServiceNowAPI, ticket: Dict, org_id: str):
        """Process a single ticket given an active client"""
        try:
             # Basic logic similar to process_ticket but optimized for loop
            description = ticket.get("description") or ticket.get("short_description")
            if not description:
                return

            # Extract caller name robustly
            caller_id = ticket.get("caller_id")
            user_name = "Unknown"
            
            if isinstance(caller_id, dict):
                user_name = caller_id.get("display_value") or caller_id.get("name") or "Unknown"
            elif isinstance(caller_id, str):
                user_name = caller_id

            submission = ProblemSubmission(
                problem=description,
                user_name=user_name
            )
            
            # Get org-specific API key from settings
            org_settings = await self._get_org_settings(org_id)
            org_api_key = org_settings.get("google_api_key") or org_settings.get("openai_api_key")
            
            solution = await self.rag_engine.generate_solution(submission, org_api_key=org_api_key)
            solution_text = self._format_solution_text(solution)

            # Post to ServiceNow
            await client.update_ticket(
                sys_id=ticket["sys_id"],
                comments=solution_text,
                work_notes=f"Auto-processed by TicketAgent. Confidence: {solution.confidence:.2%}"
            )
            
            # Save to DB
            await self._record_processed_ticket(org_id, ticket, solution_text, solution.confidence)
            
            logger.info(f"✅ Ticket {ticket.get('number')} solved successfully via AI (Background Job)")
            
        except Exception as e:
            logger.error(f"Failed to process ticket {ticket.get('number')}: {e}")
