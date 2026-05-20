# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.db.base import Base
# from app.db.session import engine

# from app.api.router import api_router  

# app = FastAPI(title="Carwash Backend")

# Base.metadata.create_all(bind=engine)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(api_router)

# @app.get("/")
# def root():
#     return {"message": "Server is running!"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine

from app.api.v1 import admin
from app.api.v1 import validate
from app.api.endpoints.chatbot import router as ws_chat_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Car Wash AI Chatbot API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(validate.router, prefix="/api/v1", tags=["Validation"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

app.include_router(ws_chat_router, tags=["WebSocket Chat"])


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "Car Wash Chatbot API v2 (WebSocket)"}