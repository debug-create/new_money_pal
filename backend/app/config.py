from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URI: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GROQ_API_KEY: str  # <--- Added this line

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"  # <--- This prevents crashing on extra fields
    )

settings = Settings()