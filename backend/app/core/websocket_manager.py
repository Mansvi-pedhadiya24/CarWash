from fastapi import WebSocket
from typing import Dict


class ConnectionManager:
    """Active WebSocket connections track kare."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_uuid: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_uuid] = websocket

    def disconnect(self, session_uuid: str):
        if session_uuid in self.active_connections:
            del self.active_connections[session_uuid]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()