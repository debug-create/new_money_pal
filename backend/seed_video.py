import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.user import User
from app.models.transaction import Transaction
from datetime import datetime, timedelta

async def seed_video_data():
    uri = os.getenv("MONGODB_URI") or "mongodb+srv://debug0197_db_user:finwise123@cluster0.taer7in.mongodb.net/finwise?retryWrites=true&w=majority"
    client = AsyncIOMotorClient(uri)
    await init_beanie(database=client.finwise, document_models=[User, Transaction])

    user = await User.find_one({"email": "chiragmishra120@gmail.com"})
    if not user:
        print("❌ User not found. Run seed_user.py first!")
        return

    # Clear old transactions for a clean video start
    await Transaction.find({"user_id": user.id}).delete()

    video_data = [
        {"desc": "MIT Mess Fees", "amt": 450, "type": "debit", "cat": "Food", "days": 2},
        {"desc": "DeeTee Night Out", "amt": 85, "type": "debit", "cat": "Entertainment", "days": 3},
        {"desc": "Amazon - New Laptop Case", "amt": 25, "type": "debit", "cat": "Shopping", "days": 5},
        {"desc": "Freelance Project Pay", "amt": 1200, "type": "credit", "cat": "Income", "days": 7},
        {"desc": "Auto Rickshaw - Tiger Circle", "amt": 15, "type": "debit", "cat": "Travel", "days": 1},
    ]

    for item in video_data:
        txn = Transaction(
            user_id=user.id,
            amount=item["amt"],
            description=item["desc"],
            merchant="Manipal",
            category=item["cat"],
            transaction_type=item["type"],
            payment_method="UPI",
            date=datetime.now() - timedelta(days=item["days"])
        )
        await txn.insert()

    print("✅ Video data seeded! MoneyPal is ready for its closeup.")

if __name__ == "__main__":
    asyncio.run(seed_video_data())