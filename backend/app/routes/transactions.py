from fastapi import APIRouter, Depends
from typing import List, Dict
from datetime import datetime, timedelta
from app.models.user import User
from app.models.transaction import Transaction, TransactionCreate, TransactionResponse
from app.utils.security import get_current_user
from app.services.categorization_service import TransactionCategorizer

router = APIRouter(prefix="/transactions", tags=["Transactions"])
categorizer = TransactionCategorizer()

@router.post("/add", response_model=TransactionResponse)
async def add_transaction(txn_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Smart Categorization
    cat_result = categorizer.categorize(txn_data.description, txn_data.merchant)
    
    transaction = Transaction(
        user_id=current_user.id,
        amount=txn_data.amount,
        description=txn_data.description,
        merchant=txn_data.merchant or "Unknown",
        category=cat_result["category"],
        transaction_type=txn_data.transaction_type,
        payment_method=txn_data.payment_method or "Cash",
        date=txn_data.date or datetime.now()
    )
    await transaction.insert()
    
    return TransactionResponse(
        id=transaction.id,
        amount=transaction.amount,
        category=transaction.category,
        description=transaction.description,
        date=transaction.date,
        category_confidence=cat_result["confidence"]
    )

@router.get("/", response_model=List[Transaction])
async def get_transactions(limit: int = 50, current_user: User = Depends(get_current_user)):
    # Returns recent transactions sorted by date
    return await Transaction.find(Transaction.user_id == current_user.id).sort("-date").limit(limit).to_list()

# --- THE FIX: Python-Based Aggregation (No more Database Crashes) ---
@router.get("/chart-data")
async def get_dashboard_chart(current_user: User = Depends(get_current_user)):
    """
    Fetches raw transactions and calculates daily totals in Python.
    """
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    # 1. Fetch raw documents using standard query
    txs = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "debit",
        Transaction.date >= seven_days_ago
    ).to_list()
    
    # 2. Calculate totals in Python
    daily_totals = {}
    for t in txs:
        # Handle date format safely
        if isinstance(t.date, str):
            d_str = t.date[:10]
        else:
            d_str = t.date.strftime("%Y-%m-%d")
            
        daily_totals[d_str] = daily_totals.get(d_str, 0) + t.amount
        
    # 3. Format for Frontend (Ensure all 7 days exist on the X-Axis)
    formatted_data = []
    for i in range(8): # Last 7 days + today
        d = seven_days_ago + timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        
        # Key: Month-Day (e.g., "12-01") for the X-Axis
        display_key = d_str[5:] 
        total = daily_totals.get(d_str, 0)
        
        formatted_data.append({"name": display_key, "amount": total})
        
    return formatted_data