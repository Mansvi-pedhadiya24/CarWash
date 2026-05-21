import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.schemas.schemas import WSClientMessage, WSServerMessage   # WSServerMessage — correct name
from app.service.auth_service import validate_token_and_origin, upsert_usage_log
from app.service.ai_service import stream_ai_reply
from app.models.chatbot_models import ChatSession, ChatMessage

router = APIRouter()


def _frame(msg_type: str, data: str = "") -> str:
    
    return WSServerMessage(type=msg_type, data=data).model_dump_json()


def _get_or_create_session(
    token_row,
    session_uuid: str,
    visitor_ip: str,
    db: Session,
) -> tuple[ChatSession, bool]:
    """
    Session UUID thi existing session dhundhe.
    Na mali to navi banave.
    Returns: (ChatSession, is_new: bool)
    """
    session = (
        db.query(ChatSession)
        .filter(ChatSession.session_uuid == session_uuid)
        .first()
    )

    if session:
        return session, False

    # Navi session banavo
    session = ChatSession(
        domain_token_id=token_row.id,
        session_uuid=session_uuid,
        visitor_ip=visitor_ip,
    )
    db.add(session)
    db.flush()
    db.refresh(session)
    db.commit()
    return session, True


@router.websocket("/api/v1/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    
    await websocket.accept()

    db: Session = SessionLocal()
    current_session: ChatSession | None = None

    try:
        
        while True:

            try:
                raw_text = await websocket.receive_text()
            except WebSocketDisconnect:
                break  
            try:
                data       = json.loads(raw_text)
                client_msg = WSClientMessage(**data)
            except Exception as e:
                await websocket.send_text(_frame("error", f"Invalid message: {e}"))
                continue  
            try:
                token_row = validate_token_and_origin(
                    token=client_msg.token,
                    origin=client_msg.origin,
                    db=db,
                )
            except Exception as auth_err:
                detail = getattr(auth_err, "detail", str(auth_err))
                await websocket.send_text(_frame("error", detail))
                await websocket.close(code=4003)  # 4003 = unauthorized
                break

            domain = token_row.domain

            # Step 4: Session resolve karo
            current_session, is_new = _get_or_create_session(
                token_row=token_row,
                session_uuid=client_msg.session_uuid,
                visitor_ip=websocket.client.host,
                db=db,
            )

            # Step 5: User message DB ma save karo
            db.add(ChatMessage(
                session_id=current_session.id,
                role="user",
                content=client_msg.message,
            ))
            db.commit()

            # Step 6: Groq thi streaming reply lo ane real-time client ne moko
            full_reply = ""

            try:
                async for chunk in stream_ai_reply(
                    session=current_session,
                    user_message=client_msg.message,
                    db=db,
                ):
                    full_reply += chunk
                    # Tatkaal chunk moko — real-time typing effect
                    await websocket.send_text(_frame("chunk", chunk))

            except Exception as ai_err:
                await websocket.send_text(_frame("error", f"AI error: {ai_err}"))
                continue

            # Step 7: "done" signal moko — reply puri thayi
            await websocket.send_text(_frame("done"))

            # Step 8: Full assistant reply DB ma save karo
            db.add(ChatMessage(
                session_id=current_session.id,
                role="assistant",
                content=full_reply,
            ))
            db.commit()

            # Step 9: Daily usage log update karo
            upsert_usage_log(
                domain_id=domain.id,
                db=db,
                sessions=1 if is_new else 0,
                messages=2,  # 1 user + 1 assistant
            )

            # Loop continue — next message wait karo

    except WebSocketDisconnect:
        pass

    except Exception as unexpected:
        try:
            await websocket.send_text(_frame("error", f"Server error: {unexpected}"))
        except Exception:
            pass

    finally:
        # Session ended_at mark karo
        if current_session:
            try:
                current_session.ended_at = datetime.utcnow()
                db.commit()
            except Exception:
                pass
        db.close()