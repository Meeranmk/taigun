"""
RAG (Retrieval-Augmented Generation) Engine
"""
from typing import List, Dict, Any, Optional
import openai
from google import genai
from google.genai import types
from app.models.schemas import (
    ProblemSubmission, 
    GeneratedSolution, 
    SimilarCase, 
    SolutionStep
)
from app.services.vector_service import VectorDB
from app.core.config import get_settings
import numpy as np
import re

settings = get_settings()


class RAGEngine:
    def __init__(self, vector_db: VectorDB):
        self.vector_db = vector_db
        self.similarity_threshold = settings.rag_similarity_threshold
        self.max_similar_cases = settings.rag_max_similar_cases
        
        # Initialize LLM provider
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            self.llm_provider = "openai"
            self.embedding_model = "text-embedding-3-small"
            self.vector_size = 1536
        elif settings.google_api_key:
            self.client = genai.Client(api_key=settings.google_api_key)
            self.llm_provider = "google"
            self.embedding_model = "text-embedding-004"
            self.vector_size = 768
        else:
            self.llm_provider = None
            print("⚠️  No LLM API key configured")
    
    async def initialize(self, vector_size: Optional[int] = None):
        """Initialize the RAG engine"""
        if vector_size:
            self.vector_size = vector_size
        await self.vector_db.initialize(self.vector_size)
        print("✅ RAG Engine initialized")
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text"""
        if not self.llm_provider:
            raise Exception("No LLM API key configured")
        
        if self.llm_provider == "openai":
            response = openai.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        
        elif self.llm_provider == "google":
            result = self.client.models.embed_content(
                model=self.embedding_model,
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            # Handle potential different response structures
            return result.embeddings[0].values
        
        raise Exception("Invalid LLM provider")
    
    def cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        a_np = np.array(a)
        b_np = np.array(b)
        
        dot_product = np.dot(a_np, b_np)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(dot_product / (norm_a * norm_b))
    
    async def find_similar_kb_cases(
        self, 
        problem_embedding: List[float], 
        limit: int = 5
    ) -> List[SimilarCase]:
        """Find similar cases from knowledge base"""
        results = await self.vector_db.search_similar_kb(
            query_embedding=problem_embedding,
            limit=limit,
            score_threshold=self.similarity_threshold
        )
        
        similar_cases = []
        for result in results:
            # You'll need to fetch full entry details from database
            similar_case = SimilarCase(
                problem=result["problem"],
                solution=[],  # Fetch from database
                similarity=result["similarity"],
                source="knowledge_base",
                category=result.get("category")
            )
            similar_cases.append(similar_case)
        
        return similar_cases
    
    async def generate_solution(
        self,
        submission: ProblemSubmission,
        servicenow_api: Optional[Any] = None
    ) -> GeneratedSolution:
        """Generate solution using RAG"""
        problem = submission.problem
        
        # Generate embedding for the problem
        try:
            problem_embedding = await self.embed_text(problem)
        except Exception as e:
            print(f"⚠️  Embedding failed: {e}")
            # Fallback to text-based matching
            return await self.generate_fallback_solution(problem)
        
        # Find similar cases from knowledge base
        similar_cases = await self.find_similar_kb_cases(
            problem_embedding,
            limit=self.max_similar_cases
        )
        
        # Generate AI solution based on similar cases
        if similar_cases:
            ai_solution = await self.generate_ai_solution(problem, similar_cases)
            
            return GeneratedSolution(
                problem=problem,
                steps=ai_solution["steps"],
                confidence=ai_solution["confidence"],
                similar_cases=similar_cases,
                category=similar_cases[0].category if similar_cases else None
            )
        
        # No similar cases found
        return GeneratedSolution(
            problem=problem,
            steps=[
                SolutionStep(
                    step_number=1,
                    description="No similar cases found in knowledge base. Please contact support for assistance."
                )
            ],
            confidence=0.0,
            similar_cases=[],
            category=None
        )
    
    async def generate_ai_solution(
        self,
        problem: str,
        similar_cases: List[SimilarCase]
    ) -> Dict[str, Any]:
        """Use LLM to generate solution based on similar cases"""
        if not self.llm_provider:
            raise Exception("No LLM API key configured")
        
        # Build context from similar cases
        context = "Similar resolved cases:\n\n"
        for i, case in enumerate(similar_cases[:3], 1):
            context += f"{i}. Problem: {case.problem}\n"
            context += f"   Similarity: {case.similarity:.2%}\n\n"
        
        prompt = f"""You are an IT support assistant. Based on the following similar cases and the new problem, provide a step-by-step solution.

{context}

New Problem: {problem}

Provide a clear, step-by-step solution. Format your response as numbered steps."""
        
        solution_text = ""
        
        if self.llm_provider == "openai":
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful IT support assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            solution_text = response.choices[0].message.content
        
        elif self.llm_provider == "google":
            response = self.client.models.generate_content(
                model='gemini-2.0-flash', 
                contents=prompt
            )
            solution_text = response.text
        
        # Parse solution into steps
        steps = self.parse_solution_steps(solution_text)
        
        # Calculate confidence based on similarity scores
        avg_similarity = sum(case.similarity for case in similar_cases) / len(similar_cases)
        confidence = min(avg_similarity * 1.2, 1.0)  # Boost slightly but cap at 1.0
        
        return {
            "steps": steps,
            "confidence": confidence
        }
    
    def parse_solution_steps(self, solution_text: str) -> List[SolutionStep]:
        """Parse solution text into structured steps"""
        lines = solution_text.strip().split('\n')
        steps = []
        step_number = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Remove leading numbers and dots
            cleaned_line = re.sub(r'^\d+\.\s*', '', line)
            
            if cleaned_line:
                steps.append(SolutionStep(
                    step_number=step_number,
                    description=cleaned_line
                ))
                step_number += 1
        
        return steps if steps else [
            SolutionStep(
                step_number=1,
                description=solution_text
            )
        ]
    
    async def generate_fallback_solution(self, problem: str) -> GeneratedSolution:
        """Fallback solution when embeddings fail"""
        return GeneratedSolution(
            problem=problem,
            steps=[
                SolutionStep(
                    step_number=1,
                    description="Unable to generate AI solution. Please contact support."
                )
            ],
            confidence=0.0,
            similar_cases=[],
            category=None
        )
