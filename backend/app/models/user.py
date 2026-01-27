from beanie import Document
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class User(Document):
    email: EmailStr
    hashed_password: str
    full_name: Optional[str] = None
    monthly_allowance: float = Field(default=0.0) 
    safe_daily_spend: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "users"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str