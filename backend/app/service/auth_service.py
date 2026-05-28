from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.chatbot_models import DomainToken, Domain, UsageLog

LOCALHOST_ALIASES = {"localhost", "127.0.0.1:8000", "0.0.0.0", "::1","127.0.0.1:8001","192.168.0.199:9001"}


def _clean_origin(origin: str) -> str:
    """
    Origin string clean kare.
    "https://www.mycarwash.com:5173/page" → "mycarwash.com"
    "127.0.0.1:8001" → "127.0.0.1"
    "localhost:3000" → "localhost"
    """
    cleaned = (
        origin
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0] 
        .split(":")[0]   
        .strip()
        .lower()
        .lstrip("www.")
    )
    return cleaned


def _normalize_origin(origin: str) -> str:
    
    if origin in LOCALHOST_ALIASES:
        return "localhost"
    return origin


def validate_token_and_origin(token: str, origin: str, db: Session) -> DomainToken:
    
    clean     = _clean_origin(origin)
    normalized = _normalize_origin(clean)

    # Token DB ma check karo
    token_row: DomainToken | None = (
        db.query(DomainToken)
        .filter(DomainToken.token == token, DomainToken.is_active == 1)
        .first()
    )

    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive token.",
        )

    domain: Domain = token_row.domain

    # Domain active che?
    if not int(domain.is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Domain is suspended.",
        )

    # Domain expire thi gayi?
    if domain.expires_at and datetime.utcnow() > domain.expires_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Domain subscription has expired.",
        )

    # Registered domain normalize karo
    registered = _normalize_origin(domain.domain_name.lower().lstrip("www."))

    # Origin match check
    if normalized != registered and not normalized.endswith("." + registered):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Origin '{clean}' is not authorised for this token.",
        )

    # Validation pass!
    token_row.last_used_at = datetime.utcnow()
    db.commit()

    return token_row


def upsert_usage_log(domain_id: int, db: Session, sessions: int = 0, messages: int = 0):
    """Daily usage log update kare."""
    today = date.today()

    log = db.query(UsageLog).filter(
        UsageLog.domain_id == domain_id,
        UsageLog.log_date  == today,
    ).first()

    if log:
        log.total_sessions += sessions
        log.total_messages += messages
    else:
        log = UsageLog(
            domain_id=domain_id,
            log_date=today,
            total_sessions=sessions,
            total_messages=messages,
        )
        db.add(log)

    db.commit()