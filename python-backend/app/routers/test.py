from fastapi import APIRouter

router = APIRouter()

@router.get("/incident/{incident_id}")
async def test_incident(incident_id: str):
    """Test endpoint for incident retrieval"""
    mock_incident = {
        "id": incident_id,
        "number": f"INC{incident_id.zfill(7)}",
        "shortDescription": f"Test incident {incident_id}",
        "description": f"This is a dummy test incident with ID: {incident_id}",
        "state": "New",
        "priority": "3 - Moderate",
        "category": "Software",
        "assignedTo": "Test User",
        "createdAt": "2026-01-10T22:13:38+05:30",
        "updatedAt": "2026-01-10T22:13:38+05:30",
        "status": "open",
        "impact": "3 - Low",
        "urgency": "3 - Low"
    }
    
    return {
        "success": True,
        "incident": mock_incident,
        "message": "This is a dummy test endpoint"
    }
