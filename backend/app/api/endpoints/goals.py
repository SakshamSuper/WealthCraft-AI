from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas
from app.models.models import User
from app.api import deps
from app.services.calculators import calculate_sip, plan_goal
from typing import List, Any

router = APIRouter()

@router.get("/", response_model=List[schemas.GoalResponse])
def read_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get all financial goals for the current user.
    """
    return crud.get_user_goals(db, user_id=current_user.id)

@router.post("/", response_model=schemas.GoalResponse)
def create_goal(
    goal_in: schemas.GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Create a new financial goal and calculate required SIP.
    """
    return crud.create_user_goal(db, user_id=current_user.id, goal=goal_in)

@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Delete a financial goal.
    """
    success = crud.remove_user_goal(db, user_id=current_user.id, goal_id=goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted successfully"}

@router.get("/simulate-sip")
def simulate_sip(
    monthly_sip: float = Query(5000.0),
    expected_cagr: float = Query(12.0),
    years: int = Query(10),
    inflation_rate: float = Query(6.0)
) -> Any:
    """
    Simulate SIP compounding values for sliders.
    """
    return calculate_sip(
        monthly_sip=monthly_sip,
        expected_cagr=expected_cagr,
        years=years,
        inflation_rate=inflation_rate
    )
