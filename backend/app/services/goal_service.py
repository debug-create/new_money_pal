from datetime import datetime
from typing import Dict, List
from app.models.goal import Goal

class GoalService:
    async def create_goal(
        self,
        user_id: str,
        goal_data: Dict
    ) -> Goal:
        deadline = goal_data.get("deadline")
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            
        months_remaining = (deadline.year - datetime.now().year) * 12 + (deadline.month - datetime.now().month)
        months_remaining = max(1, months_remaining)
        
        target = goal_data.get("target_amount")
        monthly_required = target / months_remaining
        
        milestones = [
            {"percentage": 25, "amount": target * 0.25, "reached": False},
            {"percentage": 50, "amount": target * 0.50, "reached": False},
            {"percentage": 75, "amount": target * 0.75, "reached": False},
            {"percentage": 100, "amount": target, "reached": False}
        ]
        
        goal = Goal(
            user_id=user_id,
            title=goal_data.get("title"),
            target_amount=target,
            deadline=deadline,
            category=goal_data.get("category"),
            monthly_allocation=round(monthly_required, 2),
            milestones=milestones
        )
        await goal.insert()
        return goal

    async def update_progress(self, goal_id: str, amount_added: float) -> Goal:
        goal = await Goal.get(goal_id)
        if not goal:
            return None
            
        goal.current_amount += amount_added
        
        progress_pct = (goal.current_amount / goal.target_amount) * 100
        
        for m in goal.milestones:
            if not m["reached"] and progress_pct >= m["percentage"]:
                m["reached"] = True
                m["date"] = datetime.now()
        
        if goal.current_amount >= goal.target_amount:
            goal.status = "completed"
            
        await goal.save()
        return goal