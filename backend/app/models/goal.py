from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel

class Goal(Document):
    user_id: PydanticObjectId
    title: str
    target_amount: float
    current_amount: float = 0.0
    deadline: datetime
    category: str
    monthly_allocation: float
    status: str = "active"
    milestones: List[Dict] = []
    created_at: datetime = datetime.now()

    class Settings:
        name = "goals"

class GoalCreate(BaseModel):
    title: str
    target_amount: float
    deadline: datetime
    category: str = "general"

class GoalUpdate(BaseModel):
    amount_added: float