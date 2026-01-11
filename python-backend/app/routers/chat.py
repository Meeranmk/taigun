from fastapi import APIRouter, HTTPException
from app.models.schemas import ProblemSubmission, ChatRequest, ChatResponse
from app.core import dependencies

router = APIRouter()

@router.post("/submit-problem")
async def submit_problem(submission: ProblemSubmission):
    """Submit a problem and get AI-generated solution"""
    rag_engine = dependencies.get_rag_engine()
    servicenow_api = dependencies.get_servicenow_api()
    
    if not rag_engine:
        raise HTTPException(
            status_code=500,
            detail="RAG engine not initialized"
        )
    
    try:
        solution = await rag_engine.generate_solution(
            submission,
            servicenow_api
        )
        
        return {
            "success": True,
            "solution": solution.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate solution: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Public chat endpoint for getting AI answers"""
    rag_engine = dependencies.get_rag_engine()
    
    if not rag_engine:
        raise HTTPException(
            status_code=500,
            detail="RAG engine not initialized"
        )
    
    try:
        # Use RAG engine to find answer
        result = await rag_engine.generate_solution(
            ProblemSubmission(problem=request.question)
        )
        
        # Extract sources from similar cases
        sources = [
            case.problem
            for case in result.similar_cases
            if case.similarity > 0.7
        ][:3]
        
        # Format steps into readable text
        answer = "No solution found."
        if result.steps:
            answer = "\n\n".join([
                step.description.lstrip("0123456789. ")
                for step in result.steps
            ])
        
        return ChatResponse(
            answer=answer,
            confidence=result.confidence,
            sources=sources if sources else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}"
        )
