from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.chatbot_models import DomainToken, Domain, UsageLog

# These all normalize to "localhost"
LOCALHOST_ALIASES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "192.168.0.245",   # your local network IP
    "192.168.0.199",   # add any other local IPs here
}


def _clean_origin(origin: str) -> str:
    """
    Strip scheme, port, path — return bare hostname/IP only.
    "https://www.mycarwash.com:5173/page" → "mycarwash.com"
    "http://192.168.0.245:5173"           → "192.168.0.245"
    "localhost:3000"                       → "localhost"
    """
    cleaned = (
        origin
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0]   # remove path
        .split(":")[0]   # remove port  ← THIS WAS MISSING IN YOUR VERSION
        .strip()
        .lower()
        .lstrip("www.")
    )
    return cleaned


def _normalize_origin(origin: str) -> str:
    """Map any local/dev IP to 'localhost' for DB comparison."""
    if origin in LOCALHOST_ALIASES:
        return "localhost"
    return origin


def validate_token_and_origin(token: str, origin: str, db: Session) -> DomainToken:

    clean      = _clean_origin(origin)       # "192.168.0.245"
    normalized = _normalize_origin(clean)    # "localhost"

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

    # Registered domain normalize karo (DB value also goes through same pipeline)
    registered = _normalize_origin(
        domain.domain_name.lower().lstrip("www.").split(":")[0]
    )

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