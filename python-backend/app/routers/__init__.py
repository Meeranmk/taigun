from fastapi import APIRouter
from app.routers import auth, chat, admin, test, users, knowledge_base, analytics, settings, organizations, tickets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/api/admin", tags=["auth"])
api_router.include_router(chat.router, prefix="/api", tags=["chat"])
api_router.include_router(admin.router, prefix="/api/admin", tags=["admin"])
api_router.include_router(test.router, prefix="/api/test", tags=["test"])
api_router.include_router(users.router, prefix="/api/admin/users", tags=["users"])
api_router.include_router(knowledge_base.router, prefix="/api/admin/knowledge-base", tags=["knowledge-base"])
api_router.include_router(analytics.router, prefix="/api/admin/analytics", tags=["analytics"])
api_router.include_router(settings.router, prefix="/api/admin/settings", tags=["settings"])
api_router.include_router(organizations.router)
api_router.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
