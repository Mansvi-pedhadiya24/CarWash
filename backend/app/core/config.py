from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    GROQ_API_KEY: str
    GROQ_MODEL: str = "qwen-2.5-32b"
    SYSTEM_PROMPT: str = "You are a helpful assistant."

    class Config:
        env_file = ".env"

settings = Settings()