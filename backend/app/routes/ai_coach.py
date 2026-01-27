import os
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.utils.security import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.goal import Goal
from groq import Groq
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
router = APIRouter(tags=["AI Coach"])

# Ensure GROQ_API_KEY is in your .env file
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    message: str

class AuditRequest(BaseModel):
    transactions: list

# --- CHAT ENDPOINT (The Coach) ---
@router.post("/chat")
async def chat_with_coach(request: ChatRequest, current_user: User = Depends(get_current_user)):
    user_message = request.message
    
    # 1. FETCH REAL FINANCIAL CONTEXT
    txs = await Transaction.find(Transaction.user_id == current_user.id).to_list()
    
    income = sum(t.amount for t in txs if t.transaction_type == 'credit')
    expenses = sum(t.amount for t in txs if t.transaction_type == 'debit')
    balance = income - expenses
    
    goals = await Goal.find(Goal.user_id == current_user.id).to_list()
    goal_summary = ", ".join([f"{g.title} (₹{g.current_amount}/₹{g.target_amount})" for g in goals])

    # 2. SYSTEM PROMPT (FRIENDLY & INDIAN CONTEXT)
    system_instruction = f"""
    You are MoneyPal, a friendly and smart financial buddy for {current_user.full_name}.
    
    REAL TIME DATA:
    - Income: ₹{income}
    - Expenses: ₹{expenses}
    - Balance: ₹{balance}
    - Goals: {goal_summary or "None"}

    STYLE GUIDE:
    1. STRICTLY USE INDIAN RUPEES (₹) for all currency. Never use $.
    2. Speak like a smart college senior, not a bank.
    3. Avoid jargon like "deficit". Say "you're running low" or "you overspent".
    4. Be encouraging but honest.
    5. Keep answers short (max 2 sentences).
    
    TRIGGER: If the user explicitly agrees to set a savings goal (e.g., "Yes, track the guitar"), 
    you MUST output a JSON object inside a code block like this:
    ```json
    {{
      "action": "create_goal",
      "title": "Goal Title",
      "target_amount": 0.0,
      "deadline_months": 3
    }}
    ```
    """

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.3-70b-versatile", 
            temperature=0.6,
        )
        
        ai_response = completion.choices[0].message.content

        # 4. PARSE FOR JSON TRIGGER (Goal Setting)
        if "```json" in ai_response:
            try:
                json_str = ai_response.split("```json")[1].split("```")[0].strip()
                data = json.loads(json_str)
                
                if data.get("action") == "create_goal":
                    months = data.get("deadline_months", 3)
                    deadline_date = datetime.now() + timedelta(days=30*months)
                    monthly = data["target_amount"] / months

                    new_goal = Goal(
                        user_id=current_user.id,
                        title=data["title"],
                        target_amount=data["target_amount"],
                        current_amount=0,
                        deadline=deadline_date,
                        category="General",
                        monthly_allocation=monthly,
                        status="active"
                    )
                    await new_goal.insert()
                    
                    return {"reply": f"Done! 🎯 I've officially created the goal '{data['title']}' on your dashboard. You need to save ₹{monthly:.0f}/month."}
            except Exception as e:
                print(f"JSON Parse Error: {e}")
                return {"reply": "I tried to create that goal, but my wiring got crossed. Please try again!"}

        return {"reply": ai_response}

    except Exception as e:
        print(f"AI Error: {e}")
        return {"reply": "My brain is offline momentarily. (Check GROQ_API_KEY in backend)"}

# --- AUDIT ENDPOINT (The Smart Analyst) ---
@router.post("/audit")
async def audit_finances(data: AuditRequest, current_user: User = Depends(get_current_user)):
    """
    Takes a list of recent transactions and gives a professional analysis.
    """
    if not data.transactions:
        return {"audit": "No transactions found! Go spend some money (or earn some) first."}

    # FIX: Added Date to the summary so AI can calculate frequency/annual cost
    tx_summary = "\n".join([f"- {t['date'][:10]}: {t['description']} - ₹{t['amount']} ({t['category']})" for t in data.transactions[:15]])
    
    # 3. AUDIT PROMPT (PROFESSIONAL & INSIGHTFUL)
    prompt = f"""
    You are MoneyPal's Senior Financial Analyst. 
    Here are {current_user.full_name}'s recent transactions (Date: Description - Amount):
    {tx_summary}

    TASK:
    1. 🔍 **Pattern Detection:** Identify one subtle spending habit that is draining money based on the frequency of dates.
    2. 📉 **The Projection:** Calculate how much this habit costs per year if unchecked. (e.g., "₹50/day = ₹18,000/year").
    3. 💡 **Strategic Move:** Give one professional, actionable step to optimize this.

    CONSTRAINTS:
    - Keep it concise (maximum 3 bullet points).
    - Use Indian Rupees (₹).
    - Tone: Professional, insightful, encouraging. 
    - No fluff. Go straight to the data.
    """

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile", 
            temperature=0.7,
        )
        return {"audit": completion.choices[0].message.content}
    except Exception as e:
        print(f"Audit AI Error: {e}")
        return {"audit": "I need more data to analyze properly! (AI Error)"}