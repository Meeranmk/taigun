# Taigun - A ServiceNow AI Agent

AI-powered ServiceNow ticket automation and knowledge management system built with **Python FastAPI**.

## 🚀 Features

- **AI-Powered Solutions**: Automatically generate solutions using RAG (Retrieval-Augmented Generation)
- **ServiceNow Integration**: Seamless integration with ServiceNow for ticket management
- **Vector Database**: Qdrant for semantic search and similarity matching
- **Knowledge Base**: Store and retrieve solutions from past tickets
- **Multi-LLM Support**: Works with OpenAI and Google AI
- **RESTful API**: FastAPI backend with automatic documentation
- **Admin Portal**: Web-based admin interface for managing knowledge base

## 📁 Project Structure

```
servicenow-mcp-agent/
├── python-backend/          # Python FastAPI backend
│   ├── app/                # Application modules
│   ├── main.py            # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── README.md          # Backend documentation
└── frontend/               # Next.js frontend
```

**Note:** All data is now stored in cloud services:
- **PostgreSQL** - User data, teams, knowledge base metadata
- **Qdrant Cloud** - Vector embeddings for semantic search

## 🛠️ Quick Start

### Backend Setup (Python FastAPI)

```bash
# Navigate to backend
cd python-backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the server
python run.py
```

The API server will start at http://localhost:8000

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will start at http://localhost:3000

## 🔧 Configuration

Create a `.env` file in the `python-backend` directory with:

```bash
# ServiceNow Configuration
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com/
SERVICENOW_USERNAME=your-username
SERVICENOW_PASSWORD=your-password

# AI Provider (choose one)
OPENAI_API_KEY=sk-your-openai-key
# OR
GOOGLE_API_KEY=your-google-api-key

# Vector Database
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/servicenow_db

# API Server
API_PORT=8000
API_HOST=0.0.0.0
```

## 📚 Documentation

- **Backend Documentation**: See [python-backend/README.md](python-backend/README.md)
- **Migration Guide**: See [python-backend/MIGRATION_GUIDE.md](python-backend/MIGRATION_GUIDE.md)
- **Quick Reference**: See [python-backend/QUICK_REFERENCE.md](python-backend/QUICK_REFERENCE.md)
- **API Documentation**: http://localhost:8000/docs (when server is running)

## 🎯 Key Endpoints

### Public API
- `POST /api/chat` - Chat with AI assistant
- `POST /api/submit-problem` - Submit a problem for AI solution
- `GET /api/health` - Health check

### Admin API
- `POST /api/admin/auth` - Admin login
- `GET /api/admin/knowledge-base` - Get knowledge base entries
- `POST /api/admin/knowledge-base` - Add knowledge base entry

## 🏗️ Architecture

### Backend (Python FastAPI)
- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: Async ORM for PostgreSQL
- **Qdrant**: Vector database for embeddings
- **OpenAI/Google AI**: LLM providers for AI solutions
- **JWT**: Token-based authentication

### Frontend (React)
- **React**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

### Databases
- **PostgreSQL**: Relational data (users, teams, knowledge base)
- **Qdrant**: Vector embeddings for semantic search

## 🔐 Default Credentials

**Admin Portal:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change these credentials after first login!

## 🚀 Deployment

### Backend Deployment

```bash
# Using Gunicorn (production)
cd python-backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or using Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend Deployment

```bash
cd frontend
npm run build
# Deploy the 'dist' folder to your hosting service
```

## 📊 Features

- ✅ AI-powered ticket resolution
- ✅ Knowledge base management
- ✅ ServiceNow integration
- ✅ Vector similarity search
- ✅ Multi-LLM support (OpenAI, Google AI)
- ✅ RESTful API with auto-generated docs
- ✅ JWT authentication
- ✅ Admin dashboard
- ✅ Ticket monitoring
- ✅ Email notifications

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC

## 🆘 Support

For detailed setup instructions and troubleshooting:
- Check [python-backend/README.md](python-backend/README.md)
- Review [python-backend/QUICK_REFERENCE.md](python-backend/QUICK_REFERENCE.md)
- Visit the API docs at http://localhost:8000/docs

## 🎉 What's New

**Version 2.0 - Python FastAPI Backend**
- Migrated from TypeScript/Node.js to Python/FastAPI
- Improved performance with async operations
- Automatic API documentation
- Better type safety with Pydantic
- Enhanced AI/ML integration

---

**Built with ❤️ using Python FastAPI**
