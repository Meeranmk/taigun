# 🚀 Quick Reference Card

## Installation & Setup

```bash
# Navigate to Python backend
cd python-backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the server
python run.py
```

## Essential Commands

```bash
# Development server with auto-reload
uvicorn main:app --reload

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Run with custom port
uvicorn main:app --port 8001

# Check Python version
python --version  # Requires Python 3.8+
```

## API Endpoints Cheat Sheet

### Public Endpoints
```
GET  /api/health                    # Health check
POST /api/chat                      # Chat with AI
POST /api/submit-problem            # Submit problem
GET  /api/test/incident/{id}        # Test endpoint
```

### Admin Endpoints
```
POST /api/admin/auth                # Login
POST /api/admin/logout              # Logout
GET  /api/admin/auth/status         # Check auth
```

### Documentation
```
GET  /docs                          # Swagger UI
GET  /redoc                         # ReDoc
GET  /openapi.json                  # OpenAPI schema
```

## Request Examples

### Chat Request
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I reset my password?"}'
```

### Submit Problem
```bash
curl -X POST http://localhost:8000/api/submit-problem \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "Cannot access VPN",
    "user_email": "user@example.com",
    "user_name": "John Doe"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:8000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## Environment Variables Quick Reference

```bash
# ServiceNow (Required)
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com/
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=your-password

# AI Provider (Choose one)
OPENAI_API_KEY=sk-...                    # OpenAI
GOOGLE_API_KEY=AIza...                   # Google AI

# Vector Database (Required)
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-api-key

# Database (Required)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Server (Optional)
API_PORT=8000
API_HOST=0.0.0.0
ENABLE_CORS=true

# Admin (Optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## File Structure Quick View

```
python-backend/
├── app/
│   ├── auth.py              # Authentication
│   ├── config.py            # Settings
│   ├── database.py          # DB connection
│   ├── models.py            # DB models
│   ├── rag_engine.py        # AI engine
│   ├── servicenow_api.py    # ServiceNow client
│   ├── types.py             # Type definitions
│   └── vector_db.py         # Vector DB
├── main.py                  # FastAPI app
├── run.py                   # Start script
└── requirements.txt         # Dependencies
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Use different port
uvicorn main:app --port 8001
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Database Connection Error
```bash
# Check DATABASE_URL format
postgresql://user:password@host:port/database
```

### Import Error
```bash
# Make sure you're in python-backend directory
cd python-backend
python run.py
```

## Testing

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Test with browser
open http://localhost:8000/docs
```

## Development Workflow

1. **Start Server**: `python run.py`
2. **Open Docs**: http://localhost:8000/docs
3. **Test Endpoints**: Use Swagger UI
4. **Check Logs**: Terminal output
5. **Make Changes**: Auto-reload enabled

## Production Deployment

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Or use uvicorn with workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Useful URLs

- **API Server**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

## Key Differences from TypeScript

| Feature | TypeScript | Python |
|---------|-----------|---------|
| Port | 3000 | 8000 |
| Auth | Session | JWT |
| Docs | Manual | Auto |
| Types | TypeScript | Pydantic |

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Start server
4. ✅ Test endpoints
5. ⬜ Add your data
6. ⬜ Deploy to production

---

**Need Help?**
- Check `README.md` for detailed setup
- See `MIGRATION_GUIDE.md` for TypeScript comparison
- Review `PROJECT_SUMMARY.md` for overview
