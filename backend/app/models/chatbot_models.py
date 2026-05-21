from __future__ import annotations
import datetime
from typing import List, Optional
from sqlalchemy import (
    Integer, String, SmallInteger, DateTime, Date,
    ForeignKey, Enum, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


# ─────────────────────────────────────────────────────────
# TABLE 1: domains

class Domain(Base):
    __tablename__ = "domains"

    id:            Mapped[int]                       = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_name:   Mapped[str]                       = mapped_column(String(255), unique=True, nullable=False)
    contact_email: Mapped[str]                       = mapped_column(String(255), nullable=False)
    is_active:     Mapped[int]                       = mapped_column(SmallInteger, nullable=False, default=1)
    created_at:    Mapped[datetime.datetime]         = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True, default=None)

    tokens:     Mapped[List[DomainToken]] = relationship("DomainToken", back_populates="domain",     cascade="all, delete-orphan")
    usage_logs: Mapped[List[UsageLog]]   = relationship("UsageLog",    back_populates="domain",     cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_domain", "domain_name"),
        Index("idx_active", "is_active"),
    )


# ─────────────────────────────────────────────────────────
# TABLE 2: domain_tokens

class DomainToken(Base):
    __tablename__ = "domain_tokens"

    id:           Mapped[int]                        = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_id:    Mapped[int]                        = mapped_column(Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    token:        Mapped[str]                        = mapped_column(String(64), unique=True, nullable=False)
    is_active:    Mapped[int]                        = mapped_column(SmallInteger, nullable=False, default=1)
    created_at:   Mapped[datetime.datetime]          = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    last_used_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    domain:   Mapped[Domain]           = relationship("Domain",      back_populates="tokens")
    sessions: Mapped[List[ChatSession]] = relationship("ChatSession", back_populates="domain_token", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_token",   "token"),
        Index("idx_dom_act", "domain_id", "is_active"),
    )


# ─────────────────────────────────────────────────────────
# TABLE 3: chat_sessions

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id:              Mapped[int]                        = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_token_id: Mapped[int]                        = mapped_column(Integer, ForeignKey("domain_tokens.id", ondelete="CASCADE"), nullable=False)
    session_uuid:    Mapped[str]                        = mapped_column(String(36), unique=True, nullable=False)
    visitor_ip:      Mapped[Optional[str]]              = mapped_column(String(45), nullable=True)
    started_at:      Mapped[datetime.datetime]          = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    ended_at:        Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    domain_token: Mapped[DomainToken]     = relationship("DomainToken", back_populates="sessions")
    messages:     Mapped[List[ChatMessage]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_uuid",    "session_uuid"),
        Index("idx_started", "started_at"),
    )


# ─────────────────────────────────────────────────────────
# TABLE 4: chat_messages

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id:         Mapped[int]              = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int]              = mapped_column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role:       Mapped[str]              = mapped_column(Enum("user", "assistant", name="chat_role_enum"), nullable=False)
    content:    Mapped[str]              = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)

    session: Mapped[ChatSession] = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("idx_session_time", "session_id", "created_at"),
    )


# ─────────────────────────────────────────────────────────
# TABLE 5: usage_logs

class UsageLog(Base):
    __tablename__ = "usage_logs"

    id:             Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    log_date:       Mapped[datetime.date] = mapped_column(Date, nullable=False)
    total_sessions: Mapped[int]           = mapped_column(Integer, nullable=False, default=0)
    total_messages: Mapped[int]           = mapped_column(Integer, nullable=False, default=0)

    domain: Mapped[Domain] = relationship("Domain", back_populates="usage_logs")

    __table_args__ = (
        UniqueConstraint("domain_id", "log_date", name="uq_domain_date"),
    )