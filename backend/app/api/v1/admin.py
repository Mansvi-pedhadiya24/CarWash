import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.chatbot_models import Domain, DomainToken, UsageLog
from app.schemas.schemas import DomainCreate, DomainOut, TokenOut

router = APIRouter()


# ── DOMAIN ENDPOINTS 

@router.post("/domains", response_model=DomainOut, status_code=201)
def create_domain(payload: DomainCreate, db: Session = Depends(get_db)):
    if db.query(Domain).filter(Domain.domain_name == payload.domain_name).first():
        raise HTTPException(status_code=400, detail="Domain already registered.")

    domain = Domain(
        domain_name=payload.domain_name,
        contact_email=payload.contact_email,
        is_active=1,       
        expires_at=None,   
    )
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain


@router.get("/domains", response_model=list[DomainOut])
def list_domains(db: Session = Depends(get_db)):
    return db.query(Domain).order_by(Domain.created_at.desc()).all()


@router.patch("/domains/{domain_id}/toggle")
def toggle_domain(domain_id: int, db: Session = Depends(get_db)):
    
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")

    current = int(domain.is_active)
    domain.is_active = 1 
    db.commit()
    db.refresh(domain)  

    status_text = "activated" if int(domain.is_active) == 1 else "suspended"
    return {
        "domain_id": domain_id,
        "is_active": int(domain.is_active),
        "message":   f"Domain {status_text}.",
    }


# ── TOKEN ENDPOINTS 

@router.post("/domains/{domain_id}/tokens", response_model=TokenOut, status_code=201)
def generate_token(domain_id: int, db: Session = Depends(get_db)):
    if not db.query(Domain).filter(Domain.id == domain_id).first():
        raise HTTPException(status_code=404, detail="Domain not found.")
    token_row = DomainToken(
        domain_id=domain_id,
        token=secrets.token_hex(32),
        is_active=1,  # explicitly active
    )
    db.add(token_row)
    db.commit()
    db.refresh(token_row)
    return token_row


@router.get("/domains/{domain_id}/tokens", response_model=list[TokenOut])
def list_tokens(domain_id: int, db: Session = Depends(get_db)):
    return (
        db.query(DomainToken)
        .filter(DomainToken.domain_id == domain_id)
        .order_by(DomainToken.created_at.desc())
        .all()
    )


@router.delete("/tokens/{token_id}")
def revoke_token(token_id: int, db: Session = Depends(get_db)):
    
    token_row = db.query(DomainToken).filter(DomainToken.id == token_id).first()
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found.")
    token_row.is_active = 0
    db.commit()
    return {"message": "Token revoked.", "token_id": token_id}


# ── USAGE STATS 

@router.get("/domains/{domain_id}/usage")
def domain_usage(domain_id: int, db: Session = Depends(get_db)):
    if not db.query(Domain).filter(Domain.id == domain_id).first():
        raise HTTPException(status_code=404, detail="Domain not found.")
    logs = (
        db.query(UsageLog)
        .filter(UsageLog.domain_id == domain_id)
        .order_by(UsageLog.log_date.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "date":           str(log.log_date),
            "total_sessions": log.total_sessions,
            "total_messages": log.total_messages,
        }
        for log in logs
    ]