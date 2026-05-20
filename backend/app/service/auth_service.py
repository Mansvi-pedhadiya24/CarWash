# import datetime
# from sqlalchemy.orm import Session
# from fastapi import HTTPException, status
# from app.models.chatbot_models import DomainToken, ChatSession, ChatMessage


# def validate_token_and_origin(token: str, origin: str, db: Session) -> DomainToken:
#     clean_origin = origin.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]

#     token_row = db.query(DomainToken).filter(
#         DomainToken.token == token,
#         DomainToken.is_active == 1
#     ).first()

#     if not token_row or token_row.domain.is_active == 0:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, 
#             detail="Invalid or inactive token."
#         )

#     if token_row.domain.domain_name != clean_origin:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, 
#             detail=f"Unauthorized domain origin: {clean_origin}"
#         )

#     token_row.last_used_at = datetime.datetime.utcnow()
#     db.commit()

#     return token_row


# def get_or_create_session(db: Session, token_id: int, session_uuid: str) -> ChatSession:
    
#     session_row = db.query(ChatSession).filter(ChatSession.session_uuid == session_uuid).first()
#     if not session_row:
#         session_row = ChatSession(
#             domain_token_id=token_id,
#             session_uuid=session_uuid
#         )
#         db.add(session_row)
#         db.commit()
#         db.refresh(session_row)
#     return session_row


# def save_chat_message(db: Session, session_id: int, role: str, content: str):
    
#     new_msg = ChatMessage(
#         session_id=session_id,
#         role=role,
#         content=content
#     )
#     db.add(new_msg)
#     db.commit()

from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.chatbot_models import DomainToken, Domain, UsageLog

bearer_scheme = HTTPBearer()


def _clean_origin(origin: str) -> str:
    return (
        origin
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0]
        .split(":")[0]
        .strip()
        .lower()
    )


def validate_token_and_origin(token: str, origin: str, db: Session) -> DomainToken:
    """
    Validates Bearer token + origin domain.
    Used by both HTTP endpoints and WebSocket handler.
    Raises HTTP 403 on failure.
    """
    clean = _clean_origin(origin)

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

    if not domain.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Domain is suspended.",
        )

    if domain.expires_at and datetime.utcnow() > domain.expires_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Domain subscription has expired.",
        )

    registered = domain.domain_name.lower().lstrip("www.")
    incoming   = clean.lstrip("www.")

    if incoming != registered and not incoming.endswith("." + registered):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Origin '{clean}' is not authorised for this token.",
        )

    token_row.last_used_at = datetime.utcnow()
    db.commit()

    return token_row


def upsert_usage_log(domain_id: int, db: Session, sessions: int = 0, messages: int = 0):
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