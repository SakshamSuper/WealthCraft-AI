from fastapi import APIRouter
from app.api.endpoints import auth, funds, portfolio, goals, chat, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(funds.router, prefix="/funds", tags=["Mutual Funds"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(goals.router, prefix="/goals", tags=["Goal Planner"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Advisor Chatbot"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
