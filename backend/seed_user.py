import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# We use 'bcrypt' scheme specifically
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_user():
    uri = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(uri)
    db = client.finwise 
    
    test_email = "chiragmishra120@gmail.com"
    test_password = "password123"
    
    # FIX: Hash the password string
    hashed_password = pwd_context.hash(test_password)
    
    user_data = {
        "email": test_email,
        "username": test_email,
        "hashed_password": hashed_password,
        "is_active": True
    }
    
    try:
        # Clear any existing bad data for this user first
        await db.users.delete_many({"email": test_email})
        
        await db.users.insert_one(user_data)
        print(f"✅ Successfully created test user!")
        print(f"Login Email: {test_email}")
        print(f"Login Password: {test_password}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())