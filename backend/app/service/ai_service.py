import logging
from typing import AsyncGenerator

from groq import AsyncGroq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chatbot_models import ChatMessage, ChatSession

logger = logging.getLogger(__name__)


def _build_messages(session: ChatSession, user_message: str, db: Session) -> list[dict]:
    try:
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(20)
            .all()
        )
        messages = [{"role": m.role, "content": m.content} for m in history]
        messages.append({"role": "user", "content": user_message})
        return messages
    except Exception as e:
        logger.error(f"Error building chat history: {e}")
        return [{"role": "user", "content": user_message}]


async def stream_ai_reply(
    session: ChatSession,
    user_message: str,
    db: Session,
) -> AsyncGenerator[str, None]:
    """
    Async generator — Groq AsyncGroq thi streaming chunks yield kare.

    WebSocket handler aa rite use kare:
        full_reply = ""
        async for chunk in stream_ai_reply(session, message, db):
            full_reply += chunk
            await websocket.send_text(WSServerMessage(type="chunk", data=chunk).model_dump_json())
    """
    messages = _build_messages(session, user_message, db)

    try:
        # AsyncGroq — truly async, WebSocket event loop block nahi kare
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": settings.SYSTEM_PROMPT},
                *messages,
            ],
            max_tokens=512,
            temperature=0.7,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"Groq streaming error: {e}")
        yield "Sorry, I encountered an error. Please try again."