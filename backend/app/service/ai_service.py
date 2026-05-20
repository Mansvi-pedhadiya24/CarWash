import logging
from typing import AsyncGenerator
from groq import AsyncGroq  
from sqlalchemy.orm import Session

from app.core.config import settings
# મોડલનો સાચો પાથ આપણે શિફ્ટ કરેલી નવી સિંગલ ફાઇલ મુજબ
from app.models.chatbot_models import ChatMessage, ChatSession 

# એરર ટ્રેકિંગ માટે લોગર સેટઅપ
logger = logging.getLogger(__name__)


def _build_messages(session: ChatSession, user_message: str, db: Session) -> list[dict]:
    """Load last 20 DB messages + new user message as Groq message list."""
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
    Async generator — yields text chunks from Groq streaming API (Qwen Model).

    Usage in WebSocket handler:
        full_reply = ""
        async for chunk in stream_ai_reply(session, msg, db):
            full_reply += chunk
            await websocket.send_json({"type": "chunk", "data": chunk})
        # save full_reply to DB after loop
    """
    messages = _build_messages(session, user_message, db)

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        # AsyncGroq માં completions.create સાથે stream=True
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": settings.SYSTEM_PROMPT},
                *messages,
            ],
            max_tokens=512,
            temperature=0.7,
            stream=True,  # streaming enabled
        )

    
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content

    except Exception as e:
        logger.error(f"Error during Groq Streaming: {e}")
        print(f"Error during Groq Streaming: {e}")
        yield "Sorry, I encountered an error while processing your request. Please check connection or API key."