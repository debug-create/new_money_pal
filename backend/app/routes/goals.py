from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.user import User
from app.models.goal import Goal, GoalCreate, GoalUpdate
from app.services.goal_service import GoalService
from app.utils.security import get_current_user
from beanie import PydanticObjectId

router = APIRouter(prefix="/goals", tags=["Goals"])
goal_service = GoalService()

@router.post("/create", response_model=Goal)
async def create_goal(goal_data: GoalCreate, current_user: User = Depends(get_current_user)):
    return await goal_service.create_goal(current_user.id, goal_data.model_dump())

@router.get("/list", response_model=List[Goal])
async def list_goals(current_user: User = Depends(get_current_user)):
    return await Goal.find(Goal.user_id == current_user.id).to_list()

@router.put("/{goal_id}/add", response_model=Goal)
async def add_funds(goal_id: str, update_data: GoalUpdate, current_user: User = Depends(get_current_user)):
    goal = await goal_service.update_progress(goal_id, update_data.amount_added)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

# --- THE FIX ---
@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: User = Depends(get_current_user)):
    goal = await Goal.get(PydanticObjectId(goal_id))
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await goal.delete()
    return {"message": "Deleted"}