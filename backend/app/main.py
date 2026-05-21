from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base           # models import + register
from app.db.session import engine      # DB engine

from app.api.v1 import admin, validate
from app.api.endpoints.chatbot import router as ws_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Car Wash AI Chatbot API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(validate.router, prefix="/api/v1",       tags=["Validation"])
app.include_router(admin.router,    prefix="/api/v1/admin", tags=["Admin"])

app.include_router(ws_router)


@app.get("/", tags=["Health"])
def health():
    return {
        "status":  "running",
        "version": "2.0.0",
        "docs":    "/docs",
    }