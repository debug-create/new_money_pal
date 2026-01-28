import os
import json
import io
import pypdf
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
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

class AuditRequest(BaseModel):
    transactions: list

# --- CHAT ENDPOINT (With Language Support) ---
@router.post("/chat")
async def chat_with_coach(
    message: str = Form(...),
    language: str = Form("English"), # <--- IMPORTANT: Accepts language from frontend
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    # 1. READ FILE (IF UPLOADED)
    file_context = ""
    has_file = False
    if file:
        try:
            content = await file.read()
            if file.filename.endswith(".pdf"):
                pdf = pypdf.PdfReader(io.BytesIO(content))
                # Read first 5 pages for better context
                text = "".join([page.extract_text() for page in pdf.pages[:5]])
                file_context = f"--- START OF USER UPLOADED PDF ({file.filename}) ---\n{text}\n--- END OF PDF ---\n"
                has_file = True
            elif file.filename.endswith(".csv"):
                file_context = f"--- START OF USER UPLOADED CSV ({file.filename}) ---\n{content.decode('utf-8')[:3000]}\n--- END OF CSV ---\n"
                has_file = True
        except Exception as e:
            file_context = f"\n[System Error: Could not read file: {str(e)}]\n"

    # 2. FETCH REAL FINANCIAL CONTEXT (Database)
    txs = await Transaction.find(Transaction.user_id == current_user.id).to_list()
    income = sum(t.amount for t in txs if t.transaction_type == 'credit')
    expenses = sum(t.amount for t in txs if t.transaction_type == 'debit')
    balance = income - expenses
    
    goals = await Goal.find(Goal.user_id == current_user.id).to_list()
    goal_summary = ", ".join([f"{g.title} (₹{g.current_amount}/₹{g.target_amount})" for g in goals])

    # 3. SYSTEM PROMPT (With Language Injection)
    system_instruction = f"""
    You are MoneyPal, an empathetic, professional, and clear financial coach for {current_user.full_name}.
    
    [DATA SOURCE 1: APP DATABASE (Real-time)]
    - Current App Balance: ₹{balance} (Income: ₹{income}, Expenses: ₹{expenses})
    - Active Goals: {goal_summary or "None"}
    
    [DATA SOURCE 2: USER UPLOADED FILE]
    {file_context if has_file else "No file uploaded in this turn."}

    INSTRUCTIONS:
    1. OUTPUT LANGUAGE: Strictly reply in {language}.
    2. PRIORITY RULE: If [DATA SOURCE 2] exists, your answer must be based 90% on that file.
    3. TONE: Be helpful, positive, and clear.
    4. CURRENCY: Strictly use Indian Rupees (₹).
    
    [MAGIC TRIGGER - IMPORTANT]
    Even if you reply in {language}, if the user sets a goal, you MUST output the JSON block in ENGLISH standard format:
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
                {"role": "user", "content": message}
            ],
            model="llama-3.3-70b-versatile", 
            temperature=0.5, 
        )
        
        ai_response = completion.choices[0].message.content

        # 4. PARSE FOR JSON TRIGGER (Magic Goal Logic)
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
                    
                    return {"reply": f"Done! 🎯 (Goal Created: {data['title']})"}
            except Exception as e:
                print(f"JSON Parse Error: {e}")
                return {"reply": ai_response}

        return {"reply": ai_response}

    except Exception as e:
        print(f"AI Error: {e}")
        return {"reply": "I'm having trouble analyzing that right now. Please check your internet connection."}

# --- AUDIT ENDPOINT (Unchanged) ---
@router.post("/audit")
async def audit_finances(data: AuditRequest, current_user: User = Depends(get_current_user)):
    if not data.transactions:
        return {"audit": "No transactions found! Add some expenses first."}

    tx_summary = "\n".join([f"- {t['date'][:10]}: {t['description']} - ₹{t['amount']} ({t['category']})" for t in data.transactions[:15]])
    
    prompt = f"""
    You are MoneyPal's Senior Financial Analyst. 
    Here are {current_user.full_name}'s recent transactions:
    {tx_summary}

    TASK:
    1. Identify one spending habit to improve.
    2. Calculate the yearly cost of this habit.
    3. Suggest one easy fix.

    Keep it professional and encouraging. Use Indian Rupees (₹).
    """

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile", 
            temperature=0.7,
        )
        return {"audit": completion.choices[0].message.content}
    except Exception as e:
        return {"audit": "I need more data to analyze properly!"}