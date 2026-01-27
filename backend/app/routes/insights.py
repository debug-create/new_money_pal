from fastapi import APIRouter, Depends
from app.models.user import User
from app.models.transaction import Transaction
from app.services.prediction_service import SpendingPredictor
from app.utils.auth import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights"])
predictor = SpendingPredictor()

@router.get("/forecast")
async def get_forecast(current_user: User = Depends(get_current_user)):
    transactions = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "debit"
    ).to_list()
    
    prediction = predictor.predict_monthly_spending(transactions)
    
    budget = current_user.profile.monthly_income if current_user.profile else 0
    
    status = "safe"
    if prediction["predicted_total"] > budget:
        status = "danger"
    elif prediction["predicted_total"] > (budget * 0.9):
        status = "warning"
        
    return {
        "forecast": prediction,
        "budget_status": status,
        "budget": budget
    }