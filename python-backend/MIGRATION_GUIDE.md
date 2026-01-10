# TypeScript to Python FastAPI Migration Guide

## Overview

This document outlines the conversion from the TypeScript/Node.js backend to Python/FastAPI.

## Architecture Comparison

### TypeScript Backend
- **Framework**: Express.js
- **Runtime**: Node.js
- **Type System**: TypeScript
- **Database**: PostgreSQL with pg client
- **ORM**: Custom SQL queries
- **Session**: express-session
- **Auth**: Session-based with bcrypt
- **Vector DB**: Qdrant client
- **AI**: Vercel AI SDK

### Python Backend
- **Framework**: FastAPI
- **Runtime**: Python 3.8+
- **Type System**: Python with Pydantic
- **Database**: PostgreSQL with asyncpg
- **ORM**: SQLAlchemy (async)
- **Session**: JWT tokens
- **Auth**: JWT with passlib/bcrypt
- **Vector DB**: qdrant-client
- **AI**: OpenAI SDK, Google GenerativeAI

## Key Conversions

### 1. Type Definitions

**TypeScript:**
```typescript
export interface ServiceNowConfig {
    instanceUrl: string;
    username: string;
    password: string;
}
```

**Python:**
```python
class ServiceNowConfig(BaseModel):
    instance_url: str
    username: str
    password: str
```

### 2. Async/Await

**TypeScript:**
```typescript
async function getData(): Promise<Data> {
    const result = await fetchData();
    return result;
}
```

**Python:**
```python
async def get_data() -> Data:
    result = await fetch_data()
    return result
```

### 3. HTTP Requests

**TypeScript (axios):**
```typescript
const response = await axios.get(url, {
    auth: { username, password },
    headers: { 'Content-Type': 'application/json' }
});
```

**Python (httpx):**
```python
async with httpx.AsyncClient() as client:
    response = await client.get(
        url,
        auth=(username, password),
        headers={'Content-Type': 'application/json'}
    )
```

### 4. API Routes

**TypeScript (Express):**
```typescript
app.post('/api/submit-problem', async (req, res) => {
    const { problem } = req.body;
    const solution = await generateSolution(problem);
    res.json({ success: true, solution });
});
```

**Python (FastAPI):**
```python
@app.post("/api/submit-problem")
async def submit_problem(submission: ProblemSubmission):
    solution = await generate_solution(submission.problem)
    return {"success": True, "solution": solution}
```

### 5. Environment Variables

**TypeScript:**
```typescript
const apiKey = process.env.OPENAI_API_KEY || '';
```

**Python:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"
```

### 6. Database Queries

**TypeScript:**
```typescript
const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
);
```

**Python (SQLAlchemy):**
```python
from sqlalchemy import select

async with AsyncSessionLocal() as session:
    result = await session.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()
```

### 7. Authentication

**TypeScript (Session-based):**
```typescript
req.session.isAuthenticated = true;
req.session.username = user.username;
```

**Python (JWT-based):**
```python
access_token = create_access_token(
    data={"sub": user.username, "role": user.role}
)
return {"access_token": access_token, "token_type": "bearer"}
```

## File Structure Mapping

| TypeScript | Python |
|------------|--------|
| `src/index.ts` | `main.py` |
| `src/types.ts` | `app/types.py` |
| `src/api/api-server.ts` | `main.py` (routes) |
| `src/rag/rag-engine.ts` | `app/rag_engine.py` |
| `src/rag/vector-db.ts` | `app/vector_db.py` |
| `src/auth/user-manager.ts` | `app/auth.py` |
| `src/config/settings-manager.ts` | `app/config.py` |
| `src/database/postgres-client.ts` | `app/database.py` |
| `package.json` | `requirements.txt` |

## Dependencies Mapping

| TypeScript Package | Python Package |
|-------------------|----------------|
| `express` | `fastapi` |
| `axios` | `httpx` |
| `bcrypt` | `passlib[bcrypt]` |
| `dotenv` | `python-dotenv` |
| `@qdrant/js-client-rest` | `qdrant-client` |
| `ai` (Vercel AI SDK) | `openai`, `google-generativeai` |
| `express-session` | `python-jose` (JWT) |
| `pg` | `asyncpg`, `sqlalchemy` |
| `uuid` | `uuid` (built-in) |
| `zod` | `pydantic` |

## Running the Application

### TypeScript
```bash
npm install
npm run dev
```

### Python
```bash
pip install -r requirements.txt
python main.py
# or
uvicorn main:app --reload
```

## API Compatibility

The Python FastAPI backend maintains the same API endpoints as the TypeScript version:

- ✅ `GET /api/health`
- ✅ `POST /api/submit-problem`
- ✅ `POST /api/chat`
- ✅ `POST /api/admin/auth`
- ✅ `POST /api/admin/logout`
- ✅ `GET /api/admin/auth/status`
- ✅ `GET /api/test/incident/:id`

## Advantages of Python/FastAPI

1. **Automatic API Documentation**: Built-in Swagger UI and ReDoc
2. **Type Validation**: Pydantic models validate request/response automatically
3. **Performance**: FastAPI is one of the fastest Python frameworks
4. **Async Support**: Native async/await throughout
5. **Dependency Injection**: Built-in DI system
6. **Better AI/ML Ecosystem**: Direct access to Python ML libraries

## Migration Checklist

- [x] Core types and models
- [x] Configuration management
- [x] Database connection
- [x] Authentication system
- [x] ServiceNow API client
- [x] Vector database integration
- [x] RAG engine
- [x] API routes
- [ ] User management endpoints
- [ ] Knowledge base CRUD operations
- [ ] Settings management
- [ ] Ticket monitoring
- [ ] Email notifications
- [ ] Teams integration

## Next Steps

1. Implement remaining admin endpoints (knowledge base, users, settings)
2. Add database repositories for CRUD operations
3. Implement ticket monitoring background task
4. Add comprehensive error handling
5. Write unit tests
6. Set up CI/CD pipeline
7. Create Docker configuration
8. Add logging and monitoring

## Notes

- The Python version uses JWT tokens instead of sessions for better scalability
- All database operations are async for better performance
- Pydantic provides automatic request/response validation
- FastAPI generates OpenAPI documentation automatically
- The vector database and RAG engine logic remain largely the same
