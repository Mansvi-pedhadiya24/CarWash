from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # ── MySQL (phpMyAdmin) ──────────────────────────────
    DB_HOST:     str = "localhost"
    DB_PORT:     int = 3306
    DB_USER:     str = "root"
    DB_PASSWORD: str = ""          
    DB_NAME:     str = "carwash"    
    # ── Groq ────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL:   str = "qwen-2.5-32b"  

    # ── AI System Prompt ────────────────────────────────
    SYSTEM_PROMPT: str = (
        "You are a helpful AI assistant for a professional car wash business. "
        "Help customers with services, pricing, booking appointments, and general queries. "
        "Keep responses concise, friendly, and professional."
    )

    # ── MySQL connection URL ─────────────────────────────
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"


settings = Settings()