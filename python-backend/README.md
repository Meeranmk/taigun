# Python Backend for Taigun - ServiceNow AI Agent

This is a Python FastAPI conversion of the TypeScript backend.

## Features

- ✅ FastAPI REST API server
- ✅ PostgreSQL database with SQLAlchemy
- ✅ Qdrant vector database for embeddings
- ✅ RAG (Retrieval-Augmented Generation) engine
- ✅ OpenAI and Google AI support
- ✅ ServiceNow API integration
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Async/await support throughout

## Setup

### 1. Install Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
- ServiceNow instance URL, username, password
- OpenAI or Google API key
- Qdrant URL and API key
- PostgreSQL database URL

### 3. Run the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/chat` - Chat with AI assistant
- `POST /api/submit-problem` - Submit a problem and get solution
- `GET /api/test/incident/{id}` - Test endpoint

### Admin Endpoints

- `POST /api/admin/auth` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/auth/status` - Check auth status

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
python-backend/
├── app/
│   ├── __init__.py
│   ├── auth.py              # Authentication utilities
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection
│   ├── rag_engine.py        # RAG engine for AI solutions
│   ├── servicenow_api.py    # ServiceNow API client
│   ├── types.py             # Pydantic models
│   └── vector_db.py         # Qdrant vector database
├── main.py                  # FastAPI application
├── requirements.txt         # Python dependencies
└── .env.example            # Environment variables template
```

## Key Differences from TypeScript Version

1. **Async/Await**: Uses Python's native async/await with `asyncio`
2. **Type Safety**: Pydantic models for request/response validation
3. **Database**: SQLAlchemy with async support instead of direct PostgreSQL client
4. **Authentication**: JWT tokens instead of express-session
5. **HTTP Client**: httpx for async HTTP requests instead of axios
6. **Vector DB**: Direct qdrant-client integration

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black .
isort .
```

### Type Checking

```bash
mypy .
```

## Production Deployment

For production deployment:

1. Set `API_HOST=0.0.0.0` in `.env`
2. Use a production WSGI server like Gunicorn:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

3. Set up proper PostgreSQL and Qdrant instances
4. Configure proper secrets and API keys
5. Enable HTTPS with a reverse proxy (nginx/caddy)

## License

ISC
