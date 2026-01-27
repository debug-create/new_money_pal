from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
import os
from dotenv import load_dotenv
from datetime import datetime
import calendar

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_USERNAME"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_budget_alert(email: EmailStr, user_name: str, spent: float, limit: float):
    if limit == 0: return

    percent = (spent / limit) * 100
    
    # --- PREDICTIVE LOGIC ---
    today = datetime.now()
    _, last_day = calendar.monthrange(today.year, today.month)
    days_left = last_day - today.day
    
    # Logic: If > 80% used AND more than 7 days left -> High Danger
    status = "Warning"
    color = "#f59e0b" # Orange
    advice = "Try to cut down on dining out for a few days."

    if percent > 90 and days_left > 5:
        status = "CRITICAL PREDICTION"
        color = "#dc2626" # Red
        advice = f"⚠️ At this rate, you will run out of money by {today.strftime('%b')} {today.day + 2}th!"
    elif percent < 75:
        return # Don't spam if they are safe

    html = f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: {color}; margin-top: 0;">{status}: Budget Risk</h2>
        <p style="font-size: 16px; color: #334155;">Hi <b>{user_name}</b>,</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid {color};">
            <p style="margin: 5px 0; font-size: 18px;">🔥 <b>Used:</b> {percent:.1f}%</p>
            <p style="margin: 5px 0; color: #64748b;">(₹{spent:,.0f} of ₹{limit:,.0f})</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="margin: 0; font-weight: bold; color: {color};">{advice}</p>
        </div>

        <p style="font-size: 14px; color: #94a3b8;">MoneyPal AI Coach • Automated Alert system</p>
    </div>
    """

    message = MessageSchema(
        subject=f"⚠️ MoneyPal Alert: {status}",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f"📧 Alert sent to {email}")
    except Exception as e:
        print(f"❌ Email Failed: {e}")