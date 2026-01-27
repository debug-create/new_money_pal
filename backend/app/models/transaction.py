from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Transaction(Document):
    user_id: PydanticObjectId
    amount: float
    category: str
    description: str
    merchant: Optional[str] = None
    transaction_type: str
    payment_method: str = "online"
    # FIX: Use default_factory to capture the EXACT time of transaction
    date: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None
    
    class Settings:
        name = "transactions"

class TransactionCreate(BaseModel):
    amount: float
    description: str
    merchant: Optional[str] = None
    transaction_type: str = "debit"
    payment_method: str = "upi"
    date: Optional[datetime] = None

class TransactionResponse(BaseModel):
    id: PydanticObjectId
    amount: float
    category: str
    description: str
    date: datetime
    category_confidence: float