from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── HTTP: /api/v1/validate ────────────────────────────────────────────────────
class ValidateRequest(BaseModel):
    origin: str = Field(..., description="window.location.hostname")


class ValidateResponse(BaseModel):
    valid:       bool
    domain_name: Optional[str] = None
    message:     str = ""


# ── WebSocket Messages ────────────────────────────────────────────────────────
class WSClientMessage(BaseModel):
    token:        str = Field(..., min_length=1)
    origin:       str = Field(..., min_length=1)
    session_uuid: str = Field(..., min_length=36, max_length=36)
    message:      str = Field(..., min_length=1, max_length=2000)


class WSServerMessage(BaseModel):
    type: Literal["chunk", "done", "error"]
    data: str = ""


# ── Admin Schemas ─────────────────────────────────────────────────────────────
class DomainCreate(BaseModel):
    domain_name:   str
    contact_email: str
    # expires_at INTENTIONALLY removed from request schema —
    # user thi set na thay, hamesha NULL (never expire) rahe
    # Future ma admin panel thi manually set kari shakashe


class DomainOut(BaseModel):
    id:            int
    domain_name:   str
    contact_email: str
    is_active:     int
    created_at:    datetime
    expires_at:    Optional[datetime]

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    id:           int
    domain_id:    int
    token:        str
    is_active:    int
    created_at:   datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True