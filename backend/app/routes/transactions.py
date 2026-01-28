from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime, timedelta
from app.models.user import User
from app.models.transaction import Transaction, TransactionCreate, TransactionResponse
from app.utils.security import get_current_user
from app.services.categorization_service import TransactionCategorizer
from pydantic import BaseModel
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/transactions", tags=["Transactions"])
categorizer = TransactionCategorizer()

# --- MAGIC ADD LOGIC ---
class MagicRequest(BaseModel):
    text: str

@router.post("/magic-parse")
async def magic_parse_transaction(request: MagicRequest):
    """AI converts 'Spent 500 on dinner' -> JSON"""
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = f"""
    Extract transaction from: "{request.text}"
    Return JSON with: amount (number), description (string), category (Food & Dining, Transport, Shopping, etc)
    """
    completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    content = completion.choices[0].message.content
    # Simple cleaner to get JSON part
    if "```json" in content: content = content.split("```json")[1].split("```")[0]
    elif "```" in content: content = content.split("```")[1].split("```")[0]
    return json.loads(content)

# --- STANDARD ADD (With Smart Category) ---
@router.post("/add", response_model=TransactionResponse)
async def add_transaction(txn_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Here is where the new categorization happens
    cat_result = categorizer.categorize(txn_data.description, txn_data.merchant)
    
    transaction = Transaction(
        user_id=current_user.id,
        amount=txn_data.amount,
        description=txn_data.description,
        merchant=txn_data.merchant or "Unknown",
        category=cat_result["category"], # AI or Keyword Category
        transaction_type=txn_data.transaction_type,
        payment_method=txn_data.payment_method or "Cash",
        date=txn_data.date or datetime.now()
    )
    await transaction.insert()
    return TransactionResponse(
        id=transaction.id, amount=transaction.amount, category=transaction.category,
        description=transaction.description, date=transaction.date, category_confidence=cat_result["confidence"]
    )

@router.get("/", response_model=List[Transaction])
async def get_transactions(limit: int = 50, current_user: User = Depends(get_current_user)):
    return await Transaction.find(Transaction.user_id == current_user.id).sort("-date").limit(limit).to_list()

@router.get("/chart-data")
async def get_dashboard_chart(current_user: User = Depends(get_current_user)):
    seven_days_ago = datetime.now() - timedelta(days=7)
    txs = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "debit",
        Transaction.date >= seven_days_ago
    ).to_list()
    
    daily_totals = {}
    for t in txs:
        d_str = t.date[:10] if isinstance(t.date, str) else t.date.strftime("%Y-%m-%d")
        daily_totals[d_str] = daily_totals.get(d_str, 0) + t.amount
        
    formatted_data = []
    for i in range(8):
        d = seven_days_ago + timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        formatted_data.append({"name": d_str[5:], "amount": daily_totals.get(d_str, 0)})
    return formatted_data