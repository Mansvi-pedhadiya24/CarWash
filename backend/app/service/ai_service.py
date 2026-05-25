import asyncio
import logging
from typing import AsyncGenerator
from groq import AsyncGroq
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.chatbot_models import ChatMessage, ChatSession

logger = logging.getLogger(__name__)

BOOKING_SESSIONS: dict = {}

# SERVICES / LOCATIONS / VEHICLES DATA

SERVICES = {
    "1": {"name": "Basic Wash",         "price": "₹299",  "duration": "30 min"},
    "2": {"name": "Premium Detail",     "price": "₹799",  "duration": "90 min"},
    "3": {"name": "Ceramic Coating",    "price": "₹4999", "duration": "4-5 hrs"},
    "4": {"name": "Paint Protection",   "price": "₹2499", "duration": "2-3 hrs"},
}

LOCATIONS = {
    "1": "Kalawad Road Branch",
    "2": "150 Feet Ring Road Branch",
    "3": "Gondal Road Branch",
}

VEHICLES = {
    "1": "Hatchback (Alto, Swift, i20)",
    "2": "Sedan (City, Verna, Dzire)",
    "3": "SUV (Creta, Brezza, Fortuner)",
    "4": "Luxury / Premium Car",
}

TIME_SLOTS = {
    "1": "9:00 AM",
    "2": "10:00 AM",
    "3": "11:00 AM",
    "4": "12:00 PM",
    "5": "2:00 PM",
    "6": "3:00 PM",
    "7": "4:00 PM",
    "8": "5:00 PM",
}

# INTENT DETECTION — only for fresh messages

def is_booking_intent(message: str) -> bool:
    keywords = [
        "book", "booking", "appointment", "schedule", "fix appointment",
        "reserve", "slot","appoint",
        "book an", "i want to book", "i need a", "i want a", "i want to schedule",
        "car wash", "wash my car", "clean my car", "car cleaning",
    ]
    msg = message.lower().strip()
    return any(k in msg for k in keywords)


# ─────────────────────────────────────────────────────────
# FRESH STATE

def fresh_state() -> dict:
    return {
        "active": True,
        "step": "ask_service",   # current step
        "service": None,
        "location": None,
        "vehicle": None,
        "date": None,
        "time": None,
        "name": None,
        "phone": None,
    }

# EXTRACT USER ANSWER PER STEP

def extract_service(msg: str):
    msg = msg.lower().strip()
    if msg in SERVICES:
        return msg
    if any(k in msg for k in ["basic", "1", "simple", "exterior", "bahar"]):
        return "1"
    if any(k in msg for k in ["premium", "2", "interior", "detail", "steam"]):
        return "2"
    if any(k in msg for k in ["ceramic", "3", "coat", "coating"]):
        return "3"
    if any(k in msg for k in ["paint", "4", "ppf", "film", "protection"]):
        return "4"
    return None


def extract_location(msg: str):
    msg = msg.lower().strip()
    if msg in LOCATIONS:
        return msg
    if any(k in msg for k in ["kalawad", "1"]):
        return "1"
    if any(k in msg for k in ["150", "ring", "2"]):
        return "2"
    if any(k in msg for k in ["gondal", "3"]):
        return "3"
    return None


def extract_vehicle(msg: str):
    msg = msg.lower().strip()
    if msg in VEHICLES:
        return msg
    if any(k in msg for k in ["hatchback", "alto", "swift", "i20", "1", "choti"]):
        return "1"
    if any(k in msg for k in ["sedan", "city", "verna", "dzire", "2"]):
        return "2"
    if any(k in msg for k in ["suv", "creta", "brezza", "fortuner", "3", "moti"]):
        return "3"
    if any(k in msg for k in ["luxury", "bmw", "mercedes", "audi", "4"]):
        return "4"
    return None


def extract_time(msg: str):
    msg = msg.lower().strip()
    if msg in TIME_SLOTS:
        return TIME_SLOTS[msg]
    for slot in TIME_SLOTS.values():
        if slot.lower() in msg:
            return slot
    if any(k in msg for k in ["morning", "subah"]):
        return "9:00 AM"
    if any(k in msg for k in ["afternoon", "dopahar", "noon"]):
        return "12:00 PM"
    if any(k in msg for k in ["evening", "sanj"]):
        return "4:00 PM"
    return None


def extract_date(msg: str):
    # Accept almost anything as a date if it's not a number choice
    msg = msg.strip()
    if len(msg) >= 3 and not msg.isdigit():
        return msg
    return None


def extract_phone(msg: str):
    digits = ''.join(filter(str.isdigit, msg))
    if len(digits) >= 10:
        return digits[-10:]
    return None


def extract_name(msg: str):
    msg = msg.strip()
    # Reject if it looks like a number or very short
    if len(msg) >= 2 and not msg.isdigit():
        return msg.title()
    return None

def ask_service_msg() -> str:
    return (
        "🚗 **Booking Started! Which service do you need?**\n\n"
        "1️⃣ **Basic Wash** — ₹299 | 30 min\n"
        "2️⃣ **Premium Detail** — ₹799 | 90 min\n"
        "3️⃣ **Ceramic Coating** — ₹4999 | 4-5 hrs\n"
        "4️⃣ **Paint Protection (PPF)** — ₹2499 | 2-3 hrs\n\n"
        "👉 Reply with 1, 2, 3, or 4"
    )


def ask_location_msg(state: dict) -> str:
    svc = SERVICES[state["service"]]
    return (
        f"✅ **{svc['name']}** selected — {svc['price']} | {svc['duration']}\n\n"
        "📍 **Choose your branch:**\n\n"
        "1️⃣ Kalawad Road Branch\n"
        "2️⃣ 150 Feet Ring Road Branch\n"
        "3️⃣ Gondal Road Branch\n\n"
        "👉 Reply with 1, 2, or 3"
    )


def ask_vehicle_msg(state: dict) -> str:
    loc = LOCATIONS[state["location"]]
    return (
        f"✅ **{loc}** selected!\n\n"
        "🚘 **Vehicle type?**\n\n"
        "1️⃣ Hatchback (Alto, Swift, i20)\n"
        "2️⃣ Sedan (City, Verna, Dzire)\n"
        "3️⃣ SUV (Creta, Brezza, Fortuner)\n"
        "4️⃣ Luxury / Premium Car\n\n"
        "👉 Reply with 1, 2, 3, or 4"
    )


def ask_date_msg(state: dict) -> str:
    veh = VEHICLES[state["vehicle"]]
    return (
        f"✅ **{veh}** selected!\n\n"
        "📅 **Preferred date?**\n"
        "We are open Mon–Sat, 9 AM – 6 PM.\n\n"
        "👉 Example: *tomorrow*, *Saturday*, *25 May*"
    )


def ask_time_msg(state: dict) -> str:
    return (
        f"✅ Date: **{state['date']}**\n\n"
        "🕐 **Choose a time slot:**\n\n"
        "1️⃣ 9:00 AM   2️⃣ 10:00 AM\n"
        "3️⃣ 11:00 AM  4️⃣ 12:00 PM\n"
        "5️⃣ 2:00 PM   6️⃣ 3:00 PM\n"
        "7️⃣ 4:00 PM   8️⃣ 5:00 PM\n\n"
        "👉 Reply with 1–8 or the time"
    )


def ask_name_msg(state: dict) -> str:
    return (
        f"✅ Time: **{state['time']}** confirmed!\n\n"
        "👤 **Your full name please?**\n\n"
        "👉 Example: *Raj Patel*"
    )


def ask_phone_msg(state: dict) -> str:
    return (
        f"✅ Hello **{state['name']}**!\n\n"
        "📱 **Your mobile number?**\n"
        "(For booking confirmation SMS)\n\n"
        "👉 Example: *9876543210*"
    )


def confirm_msg(state: dict) -> str:
    svc = SERVICES[state["service"]]
    loc = LOCATIONS[state["location"]]
    veh = VEHICLES[state["vehicle"]]
    return (
        "🎉 **Booking Confirmed!**\n\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"📋 Service : {svc['name']}\n"
        f"💰 Price   : {svc['price']}\n"
        f"📍 Branch  : {loc}\n"
        f"🚘 Vehicle : {veh}\n"
        f"📅 Date    : {state['date']}\n"
        f"🕐 Time    : {state['time']}\n"
        f"👤 Name    : {state['name']}\n"
        f"📱 Phone   : {state['phone']}\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "✅ Our team will call you to confirm.\n"
        "Thank you for choosing **CarWash Express!** 🚗✨\n\n"
        "Need anything else? Just ask!"
    )


def invalid_msg(step: str) -> str:
    hints = {
        "ask_service":  "Please reply with **1, 2, 3, or 4** to choose a service.",
        "ask_location": "Please reply with **1, 2, or 3** to choose a branch.",
        "ask_vehicle":  "Please reply with **1, 2, 3, or 4** for your vehicle type.",
        "ask_date":     "Please tell me a date like *tomorrow*, *Saturday*, or *25 May*.",
        "ask_time":     "Please reply with **1–8** or the time like *10:00 AM*.",
        "ask_name":     "Please tell me your full name.",
        "ask_phone":    "Please share a valid **10-digit mobile number**.",
    }
    return f"⚠️ {hints.get(step, 'Please try again.')}"


# MAIN BOOKING HANDLER — step machine

def process_booking_step(session_uuid: str, user_message: str) -> str | None:
    """
    Returns a reply string if in booking flow, else None (→ use AI).
    Maintains state in BOOKING_SESSIONS dict.
    """
    msg = user_message.strip()

    # ── Not in booking yet — check intent 
    if session_uuid not in BOOKING_SESSIONS:
        if is_booking_intent(msg):
            BOOKING_SESSIONS[session_uuid] = fresh_state()
            return ask_service_msg()
        return None  # not a booking message → send to AI

    # ── Already in booking flow 
    state = BOOKING_SESSIONS[session_uuid]
    step  = state["step"]

    # ── Step: ask_service 
    if step == "ask_service":
        val = extract_service(msg)
        if not val:
            return invalid_msg(step)
        state["service"] = val
        state["step"] = "ask_location"
        return ask_location_msg(state)

    # ── Step: ask_location 
    elif step == "ask_location":
        val = extract_location(msg)
        if not val:
            return invalid_msg(step)
        state["location"] = val
        state["step"] = "ask_vehicle"
        return ask_vehicle_msg(state)

    # ── Step: ask_vehicle 
    elif step == "ask_vehicle":
        val = extract_vehicle(msg)
        if not val:
            return invalid_msg(step)
        state["vehicle"] = val
        state["step"] = "ask_date"
        return ask_date_msg(state)

    # ── Step: ask_date 
    elif step == "ask_date":
        val = extract_date(msg)
        if not val:
            return invalid_msg(step)
        state["date"] = val
        state["step"] = "ask_time"
        return ask_time_msg(state)

    # ── Step: ask_time 
    elif step == "ask_time":
        val = extract_time(msg)
        if not val:
            return invalid_msg(step)
        state["time"] = val
        state["step"] = "ask_name"
        return ask_name_msg(state)

    # ── Step: ask_name 
    elif step == "ask_name":
        val = extract_name(msg)
        if not val:
            return invalid_msg(step)
        state["name"] = val
        state["step"] = "ask_phone"
        return ask_phone_msg(state)

    # ── Step: ask_phone 
    elif step == "ask_phone":
        val = extract_phone(msg)
        if not val:
            return invalid_msg(step)
        state["phone"] = val
        state["step"] = "done"
        reply = confirm_msg(state)
        # Clear booking state after confirmation
        del BOOKING_SESSIONS[session_uuid]
        return reply

    return None


# BUILD AI MESSAGES

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


# ─────────────────────────────────────────────────────────
# MAIN ENTRY — called from chatbot.py websocket handler
# ─────────────────────────────────────────────────────────
async def stream_ai_reply(
    session: ChatSession,
    user_message: str,
    db: Session,
) -> AsyncGenerator[str, None]:
    """
    Main entry point for streaming AI replies.
    Handles booking flow first, then falls back to Groq AI.
    """
    session_uuid = session.session_uuid

    # 1. Try booking flow first
    booking_reply = process_booking_step(session_uuid, user_message)

    if booking_reply is not None:
        # Stream booking reply character by character for smooth typing effect
        # Add small delays to simulate natural typing
        for i, char in enumerate(booking_reply):
            yield char
            # Small delay for natural typing effect (except for newlines and spaces)
            if char == '\n':
                await asyncio.sleep(0.02)
            elif i % 10 == 0:  # Every 10 characters
                await asyncio.sleep(0.005)
        return

    # 2. Not booking → Groq AI
    if not settings.GROQ_API_KEY:
        error_msg = "⚠️ AI service is not configured. Please contact support."
        for char in error_msg:
            yield char
            await asyncio.sleep(0.01)
        return

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        messages = _build_messages(session, user_message, db)

        # Create system prompt with booking context
        system_prompt = settings.SYSTEM_PROMPT + """
        
You are a helpful car wash assistant. Keep responses:
- Concise and friendly
- Use emojis occasionally
- Maximum 2-3 sentences unless asking for booking details
- Always offer to help with bookings
"""

        # Call Groq API with streaming
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=512,
            temperature=0.7,
            stream=True,
            timeout=30.0,  # 30 second timeout
        )

        # Stream the response chunk by chunk
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                yield content
                # Small delay for natural streaming effect
                await asyncio.sleep(0.003)

    except asyncio.TimeoutError:
        logger.error(f"Groq API timeout for session {session_uuid}")
        error_msg = "⏰ I'm taking too long to respond. Please try again in a moment."
        for char in error_msg:
            yield char
            await asyncio.sleep(0.01)
            
    except Exception as e:
        logger.error(f"Streaming error for session {session_uuid}: {e}")
        error_msg = f"❌ I encountered an error: {str(e)}. Please try again."
        for char in error_msg:
            yield char
            await asyncio.sleep(0.01)