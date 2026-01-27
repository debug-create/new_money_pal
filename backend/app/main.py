import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import certifi # Keep this if you are using the certifi fix, otherwise remove

# Import models
from app.models.user import User
from app.models.transaction import Transaction
from app.models.goal import Goal

# Import routes
from app.routes import ai_coach, auth, transactions, goals, users # <--- Added 'users'

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    uri = os.getenv("MONGODB_URI")
    try:
        # Standard connection (using tlsAllowInvalidCertificates for your network)
        client = AsyncIOMotorClient(
            uri,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        
        await client.admin.command('ping')
        
        # Initialize Beanie with ALL models
        await init_beanie(database=client.finwise, document_models=[User, Transaction, Goal])
        
        print("✅ MoneyPal Backend Connected & Initialized")
        yield
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        raise e

app = FastAPI(title="MoneyPal AI API", lifespan=lifespan)

# CORS (Frontend access)
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REGISTER ROUTERS
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"]) # <--- NEW: Connected the User Profile route
app.include_router(ai_coach.router, prefix="/api", tags=["AI Coach"])
app.include_router(transactions.router, prefix="/api", tags=["Transactions"])
app.include_router(goals.router, prefix="/api", tags=["Goals"])

@app.get("/")
def read_root():
    return {"message": "MoneyPal Backend Logic is LIVE 🚀"}