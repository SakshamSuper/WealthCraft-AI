from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import security
from app.crud import crud
from app.schemas import schemas
from app.api import deps
from datetime import timedelta
from typing import Any

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Register a new user.
    """
    user = crud.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    return crud.create_user(db, user_in=user_in)

@router.post("/login", response_model=schemas.Token)
def login(
    user_in: schemas.UserLogin,
    db: Session = Depends(get_db)
) -> Any:
    """
    Standard JSON login for Next.js frontend.
    """
    user = crud.get_user_by_email(db, email=user_in.email)
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    access_token_expires = timedelta(minutes=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/login/oauth", response_model=schemas.Token)
def login_oauth(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, for Swagger UI auth.
    """
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    access_token_expires = timedelta(minutes=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(
    current_user: schemas.UserResponse = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user profile.
    """
    return current_user

@router.put("/risk-profile", response_model=schemas.UserResponse)
def update_risk_profile(
    profile_in: schemas.RiskProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update user risk questionnaire.
    """
    updated_user = crud.update_user_risk_profile(db, user_id=current_user.id, profile=profile_in)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user
