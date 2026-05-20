# from pydantic import BaseModel
# from typing import Optional

# class ValidateRequest(BaseModel):
#     origin: str

# class ValidateResponse(BaseModel):
#     valid: bool
#     domain_name: str
#     message: str

# class ChatMessageIn(BaseModel):
#     token: str
#     session_uuid: str
#     message: str

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── HTTP: Validate ────────────────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    origin: str = Field(..., description="window.location.hostname")


class ValidateResponse(BaseModel):
    valid: bool
    domain_name: Optional[str] = None
    message: str = ""


# ── WebSocket message types ───────────────────────────────────────────────────
#
#  CLIENT  →  SERVER  (client sends this JSON over WS)
#  {
#    "token":        "Bearer token string",
#    "origin":       "mycarwash.com",
#    "session_uuid": "uuid-v4",
#    "message":      "user text"
#  }
#
#  SERVER  →  CLIENT  (server streams these JSON frames)
#
#  During streaming:
#    { "type": "chunk",  "data": "partial text" }
#
#  When done:
#    { "type": "done",   "data": "" }
#
#  On error:
#    { "type": "error",  "data": "error message" }

class WSClientMessage(BaseModel):
    """Validated shape of every message the client sends over WebSocket."""
    token:        str = Field(..., min_length=1)
    origin:       str = Field(..., min_length=1)
    session_uuid: str = Field(..., min_length=36, max_length=36)
    message:      str = Field(..., min_length=1, max_length=2000)


class WSServerMessage(BaseModel):
    """Shape of every frame the server sends back over WebSocket."""
    type: Literal["chunk", "done", "error"]
    data: str = ""


# ── Admin ─────────────────────────────────────────────────────────────────────

class DomainCreate(BaseModel):
    domain_name:   str
    contact_email: str
    expires_at:    Optional[datetime] = None


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