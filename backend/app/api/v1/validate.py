"""
POST /api/v1/validate
Header: Authorization: Bearer <token>
Body:   { "origin": "window.location.hostname" }

Called by the React/Vite frontend on page load.
Returns { valid: true } → show chatbot popup
Returns 403            → hide chatbot popup
"""
from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import ValidateRequest, ValidateResponse
from app.service.auth_service import validate_token_and_origin

router = APIRouter()
bearer = HTTPBearer()


@router.post("/validate", response_model=ValidateResponse)
def validate(
    payload: ValidateRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer),
    db: Session = Depends(get_db),
):
    token_row = validate_token_and_origin(
        token=credentials.credentials,
        origin=payload.origin,
        db=db,
    )
    return ValidateResponse(
        valid=True,
        domain_name=token_row.domain.domain_name,
        message="Token and domain are valid.",
    )