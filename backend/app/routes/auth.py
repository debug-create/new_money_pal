from fastapi import APIRouter, HTTPException, status
from app.models.user import User, UserRegister
from app.utils.security import hash_password, verify_password, create_access_token
from app.config import settings
from datetime import timedelta
from pydantic import BaseModel

router = APIRouter(tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserRegister):
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    hashed_pw = hash_password(user_data.password)
    
    # Create user with DEFAULTS for financial info
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pw,
        full_name=user_data.full_name,
        monthly_allowance=0.0, # Default
        safe_daily_spend=0.0   # Default
    )
    
    await new_user.insert()
    return {"message": "Account created successfully!"}

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = await User.find_one(User.email == login_data.username)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": user.full_name if user.full_name else "User"
    }