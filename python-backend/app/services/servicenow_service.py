"""
ServiceNow API Client
"""
import httpx
from typing import List, Dict, Any, Optional
from app.models.schemas import ServiceNowConfig


class ServiceNowAPI:
    def __init__(self, config: ServiceNowConfig):
        self.base_url = f"{config.instance_url}/api/now"
        self.auth = (config.username, config.password)
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def get_pending_tickets(
        self, 
        keywords: Optional[List[str]] = None, 
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get pending tickets from ServiceNow"""
        query = "state=1^ORstate=2"
        
        if keywords:
            keyword_query = "^OR".join([
                f"short_descriptionLIKE{kw}^ORdescriptionLIKE{kw}"
                for kw in keywords
            ])
            query += f"^{keyword_query}"
        
        params = {
            "sysparm_query": query,
            "sysparm_limit": limit,
            "sysparm_fields": "sys_id,number,short_description,description,state,priority,caller_id,sys_created_on,close_notes"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/table/incident",
                    params=params,
                    auth=self.auth,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                if not data or "result" not in data:
                    return {
                        "success": False,
                        "data": [],
                        "count": 0,
                        "error": "Invalid response from ServiceNow API"
                    }
                
                return {
                    "success": True,
                    "data": data["result"],
                    "count": len(data["result"])
                }
            except Exception as e:
                return {
                    "success": False,
                    "data": [],
                    "count": 0,
                    "error": str(e)
                }
    
    async def get_ticket_details(self, sys_id: str) -> Dict[str, Any]:
        """Get ticket details by sys_id"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/table/incident/{sys_id}",
                    auth=self.auth,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "data": data.get("result", {})
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def update_ticket(
        self,
        sys_id: str,
        comments: Optional[str] = None,
        work_notes: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update a ticket"""
        update_data = {}
        if comments:
            update_data["comments"] = comments
        if work_notes:
            update_data["work_notes"] = work_notes
        if state:
            update_data["state"] = state
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.patch(
                    f"{self.base_url}/table/incident/{sys_id}",
                    json=update_data,
                    auth=self.auth,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "data": data.get("result", {}),
                    "message": "Ticket updated successfully"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def add_work_note(self, sys_id: str, note: str) -> Dict[str, Any]:
        """Add a work note to a ticket"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.patch(
                    f"{self.base_url}/table/incident/{sys_id}",
                    json={"work_notes": note},
                    auth=self.auth,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "data": data.get("result", {}),
                    "message": "Work note added successfully"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
