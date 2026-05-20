from fastapi import APIRouter
from app.api.endpoints import chatbot  

api_router = APIRouter()

api_router.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])