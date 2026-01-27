from fastapi import APIRouter, Depends
from app.models.user import User
from app.utils.security import get_current_user
from pydantic import BaseModel

router = APIRouter(tags=["Users"])

class UpdateProfile(BaseModel):
    monthly_allowance: float

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "monthly_allowance": current_user.monthly_allowance,
        "safe_daily_spend": current_user.safe_daily_spend,
        "currency": "INR"
    }

@router.put("/me/budget")
async def update_budget(data: UpdateProfile, current_user: User = Depends(get_current_user)):
    current_user.monthly_allowance = data.monthly_allowance
    current_user.safe_daily_spend = round(data.monthly_allowance / 30, 2)
    await current_user.save()
    return {"message": "Budget updated!", "new_allowance": current_user.monthly_allowance}