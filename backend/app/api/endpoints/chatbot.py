# import json
# from fastapi import APIRouter, Depends, Security, WebSocket, WebSocketDisconnect
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from sqlalchemy.orm import Session

# from app.db.session import get_db
# from app.schemas.schemas import ValidateRequest, ValidateResponse
# from app.service.auth_service import validate_token_and_origin, get_or_create_session, save_chat_message
# from app.core.websocket_manager import manager

# router = APIRouter()
# bearer = HTTPBearer()

# @router.post("/validate", response_model=ValidateResponse)
# def validate(
#     payload: ValidateRequest,
#     credentials: HTTPAuthorizationCredentials = Security(bearer),
#     db: Session = Depends(get_db),
# ):
#     token = payload.get("token")

#     return ValidateResponse(
#         valid=True,
#         domain_name=token.domain.domain_name,
#         message="Token and domain are valid.",
#     )


# # . WEBSOCKET CHAT ENDPOINT 

# @router.websocket("/ws/chat")
# async def websocket_chat_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    
#     current_session_uuid = None
    
#     try:
#         await websocket.accept()
        
#         init_data_str = await websocket.receive_text()
#         init_data = json.loads(init_data_str)
        
#         token = init_data.get("token")
#         origin = init_data.get("origin")
#         session_uuid = init_data.get("session_uuid")
#         current_session_uuid = session_uuid
        
#         if not token or not origin or not session_uuid:
#             await websocket.send_json({"error": "Missing initial connection parameters."})
#             await websocket.close(code=4003)
#             return

#         try:
#             token_row = validate_token_and_origin(token=token, origin=origin, db=db)
#         except Exception:
            
#             await websocket.send_json({"status": "forbidden", "message": "Unauthorized domain or token."})
#             await websocket.close(code=4003)
#             return

#         manager.active_connections[session_uuid] = websocket
#         session_row = get_or_create_session(db, token_row.id, session_uuid)
        
#         await websocket.send_json({
#             "status": "connected",
#             "message": f"Welcome back! Connected to {token_row.domain.domain_name} Chatbot."
#         })

#         while True:
#             data = await websocket.receive_text()
#             message_payload = json.loads(data)
#             user_message = message_payload.get("message", "").strip()
            
#             if not user_message:
#                 continue
                
            
#             save_chat_message(db, session_row.id, role="user", content=user_message)
            
#             ai_reply = "hello,welcome to carwash chatbot. How can I assist you today?"
#             if "price" in user_message or "price" in user_message.lower():
#                 ai_reply = "carwash plan start at just 499"
#             elif "time" in user_message or "time" in user_message.lower():
#                 ai_reply = "open from 9am to 9pm, 7 days a week"

#             save_chat_message(db, session_row.id, role="assistant", content=ai_reply)
            
#             await manager.send_personal_message(
#                 {"sender": "assistant", "message": ai_reply}, 
#                 websocket
#             )

#     except WebSocketDisconnect:
#         if current_session_uuid:
#             manager.disconnect(current_session_uuid)
            
#     except Exception as e:
#         if current_session_uuid:
#             manager.disconnect(current_session_uuid)



import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.schemas.schemas import WSClientMessage, WSServerMessage
from app.service.auth_service import validate_token_and_origin, upsert_usage_log
from app.service.auth_service import validate_token_and_origin
from app.service.ai_service import stream_ai_reply
from app.models.chatbot_models import ChatSession, ChatMessage

router = APIRouter()


def _get_or_create_session(
    token_row,
    session_uuid: str,
    visitor_ip: str,
    db: Session,
) -> tuple[ChatSession, bool]:
    """Returns (session, is_new)."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.session_uuid == session_uuid)
        .first()
    )
    if session:
        return session, False

    session = ChatSession(
        domain_token_id=token_row.id,
        session_uuid=session_uuid,
        visitor_ip=visitor_ip,
    )
    db.add(session)
    db.flush()
    db.refresh(session)
    return session, True


@router.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()

    db: Session = SessionLocal()
    current_session: ChatSession | None = None

    try:
        while True:
            # ── Receive raw JSON from client ──────────────────────────────
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            # ── Parse + validate message shape ───────────────────────────
            try:
                data = json.loads(raw)
                msg  = WSClientMessage(**data)
            except Exception as e:
                await websocket.send_text(
                    WSServerMessage(type="error", data=f"Invalid message format: {e}").model_dump_json()
                )
                continue

            # ── Validate token + origin on EVERY message ──────────────────
            try:
                token_row = validate_token_and_origin(
                    token=msg.token,
                    origin=msg.origin,
                    db=db,
                )
            except Exception as e:
                await websocket.send_text(
                    WSServerMessage(type="error", data=str(e.detail if hasattr(e, "detail") else e)).model_dump_json()
                )
                await websocket.close(code=4003)
                break

            domain = token_row.domain

            # ── Resolve or create chat session ───────────────────────────
            current_session, is_new = _get_or_create_session(
                token_row=token_row,
                session_uuid=msg.session_uuid,
                visitor_ip=websocket.client.host,
                db=db,
            )

            # ── Save user message to DB ───────────────────────────────────
            db.add(ChatMessage(
                session_id=current_session.id,
                role="user",
                content=msg.message,
            ))
            db.commit()

            # ── Stream Groq reply chunk by chunk ──────────────────────────
            full_reply = ""
            try:
                async for chunk in stream_ai_reply(current_session, msg.message, db):
                    full_reply += chunk
                    await websocket.send_text(
                        WSServerMessage(type="chunk", data=chunk).model_dump_json()
                    )
            except Exception as e:
                await websocket.send_text(
                    WSServerMessage(type="error", data=f"AI error: {e}").model_dump_json()
                )
                continue

            # ── Send "done" signal ────────────────────────────────────────
            await websocket.send_text(
                WSServerMessage(type="done", data="").model_dump_json()
            )

            # ── Save full assistant reply to DB ───────────────────────────
            db.add(ChatMessage(
                session_id=current_session.id,
                role="assistant",
                content=full_reply,
            ))
            db.commit()

            # ── Update daily usage log ────────────────────────────────────
            upsert_usage_log(
                domain_id=domain.id,
                db=db,
                sessions=1 if is_new else 0,
                messages=2,
            )

    except WebSocketDisconnect:
        pass

    finally:
        # Mark session ended
        if current_session:
            current_session.ended_at = datetime.utcnow()
            db.commit()
        db.close()