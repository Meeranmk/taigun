"""
Vector Database Client for Qdrant
"""
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter
from app.config import get_settings
from app.types import KnowledgeBaseEntry
import uuid

settings = get_settings()


class VectorDB:
    def __init__(self):
        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key
        )
        self.kb_collection = f"{settings.qdrant_collection_prefix}knowledge_base"
        self.tickets_collection = f"{settings.qdrant_collection_prefix}servicenow_tickets"
        self.vector_size = 1536  # Default for OpenAI, will be updated
    
    async def initialize(self, vector_size: int = 1536):
        """Initialize Qdrant collections"""
        self.vector_size = vector_size
        
        # Create knowledge base collection if it doesn't exist
        collections = self.client.get_collections().collections
        collection_names = [col.name for col in collections]
        
        if self.kb_collection not in collection_names:
            self.client.create_collection(
                collection_name=self.kb_collection,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE
                )
            )
            print(f"✅ Created Qdrant collection: {self.kb_collection}")
        
        if self.tickets_collection not in collection_names:
            self.client.create_collection(
                collection_name=self.tickets_collection,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE
                )
            )
            print(f"✅ Created Qdrant collection: {self.tickets_collection}")
    
    async def add_kb_entry(self, entry: KnowledgeBaseEntry, embedding: List[float]):
        """Add a knowledge base entry to vector database"""
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "entry_id": entry.id,
                "problem": entry.problem,
                "category": entry.category,
                "tags": entry.tags,
                "priority": entry.priority
            }
        )
        
        self.client.upsert(
            collection_name=self.kb_collection,
            points=[point]
        )
    
    async def update_kb_entry(self, entry: KnowledgeBaseEntry, embedding: List[float]):
        """Update a knowledge base entry in vector database"""
        # Delete old entry
        await self.delete_kb_entry(entry.id)
        # Add new entry
        await self.add_kb_entry(entry, embedding)
    
    async def delete_kb_entry(self, entry_id: str):
        """Delete a knowledge base entry from vector database"""
        self.client.delete(
            collection_name=self.kb_collection,
            points_selector=Filter(
                must=[
                    {"key": "entry_id", "match": {"value": entry_id}}
                ]
            )
        )
    
    async def search_similar_kb(
        self, 
        query_embedding: List[float], 
        limit: int = 5,
        score_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar knowledge base entries"""
        results = self.client.search(
            collection_name=self.kb_collection,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold
        )
        
        return [
            {
                "entry_id": result.payload.get("entry_id"),
                "problem": result.payload.get("problem"),
                "category": result.payload.get("category"),
                "similarity": result.score
            }
            for result in results
        ]
    
    async def add_ticket(self, ticket_id: str, embedding: List[float], metadata: Dict[str, Any]):
        """Add a ServiceNow ticket to vector database"""
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "ticket_id": ticket_id,
                **metadata
            }
        )
        
        self.client.upsert(
            collection_name=self.tickets_collection,
            points=[point]
        )
    
    async def search_similar_tickets(
        self,
        query_embedding: List[float],
        limit: int = 5,
        score_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar tickets"""
        results = self.client.search(
            collection_name=self.tickets_collection,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold
        )
        
        return [
            {
                "ticket_id": result.payload.get("ticket_id"),
                "similarity": result.score,
                **result.payload
            }
            for result in results
        ]
