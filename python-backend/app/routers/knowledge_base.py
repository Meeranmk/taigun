from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.kb_service import KBService
from app.models.schemas import KnowledgeBaseEntry, CreateKBRequest, UpdateKBRequest
from app.services.vector_service import VectorDB
from app.core import dependencies
from app.core.dependencies import get_current_user
from app.models.sql import User

router = APIRouter()

@router.get("/")
async def get_entries(
    page: int = 1, 
    limit: int = 10, 
    query: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all knowledge base entries with filtering"""
    service = KBService(db)
    all_entries = await service.get_all(category=category, search_query=query)
    
    # Calculate pagination
    total = len(all_entries)
    total_pages = (total + limit - 1) // limit  # Ceiling division
    start = (page - 1) * limit
    end = start + limit
    paginated = all_entries[start:end]
    
    # Convert UUID to string manually
    result = []
    for entry in paginated:
        entry_dict = {
            "id": str(entry.id),
            "problem": entry.problem,
            "solution": entry.solution,
            "category": entry.category,
            "tags": entry.tags,
            "priority": entry.priority,
            "created_by": entry.created_by,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
            "usage_count": entry.usage_count,
            "effectiveness": entry.effectiveness
        }
        result.append(entry_dict)
    
    # Return paginated response format expected by frontend
    return {
        "data": result,
        "page": page,
        "totalPages": total_pages,
        "total": total
    }

@router.post("/", response_model=KnowledgeBaseEntry)
async def create_entry(
    entry_in: CreateKBRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new knowledge base entry"""
    # Inject VectorDB if available
    vector_db = dependencies.vector_db
    service = KBService(db, vector_db)
    
    # Note: Embedding generation and syncing is currently a TODO in implementation plan
    # This will save to Postgres only for now
    return await service.create(entry_in)

@router.get("/{entry_id}", response_model=KnowledgeBaseEntry)
async def get_entry(
    entry_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get IB entry by ID"""
    service = KBService(db)
    entry = await service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.put("/{entry_id}", response_model=KnowledgeBaseEntry)
async def update_entry(
    entry_id: str, 
    entry_in: UpdateKBRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update KB entry"""
    vector_db = dependencies.vector_db
    service = KBService(db, vector_db)
    entry = await service.update(entry_id, entry_in)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete KB entry"""
    vector_db = dependencies.vector_db
    service = KBService(db, vector_db)
    success = await service.delete(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return None
