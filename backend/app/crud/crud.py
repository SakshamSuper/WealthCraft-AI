from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.models import User, MutualFund, Portfolio, Goal, AIChat, NAVHistory
from app.schemas.schemas import UserCreate, RiskProfileUpdate, PortfolioCreate, GoalCreate
from app.core.security import get_password_hash
from datetime import datetime

# --- User CRUD ---
def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_risk_profile(db: Session, user_id: int, profile: RiskProfileUpdate) -> User:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
        
    for field, val in profile.model_dump().items():
        setattr(db_user, field, val)
        
    # Calculate Risk Score (0 to 100) based on age, income, risk appetite, horizon
    # Appete: Low (10), Moderate (25), High (45)
    # Horizon: 1 Yr (5), 3 Yr (10), 5 Yr (20), 10 Yr (25), 20 Yr (30)
    # Age: Under 30 (10), 30-50 (5), Over 50 (0)
    risk_score = 0.0
    app = profile.risk_appetite.strip().lower()
    if app == "low":
        risk_score += 15.0
    elif app == "moderate":
        risk_score += 45.0
    else: # High
        risk_score += 85.0
        
    # Horizon adjustment
    hor = profile.investment_horizon.strip().lower()
    if "1 year" in hor:
        risk_score -= 10.0
    elif "3 year" in hor:
        risk_score -= 5.0
    elif "20 year" in hor or "10 year" in hor:
        risk_score += 10.0
        
    db_user.risk_score = max(5.0, min(98.0, risk_score))
    
    # Calculate diversification score
    # Number of preferred categories (out of 10)
    cats = [c.strip() for c in (profile.preferred_categories or "").split(",") if c.strip()]
    div_score = min(99.0, 40.0 + len(cats) * 12.0)
    db_user.diversification_score = div_score
    
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Mutual Fund CRUD ---
def get_mutual_funds(
    db: Session, 
    search: Optional[str] = None, 
    category: Optional[str] = None,
    risk: Optional[str] = None,
    min_rating: Optional[int] = None
) -> List[MutualFund]:
    query = db.query(MutualFund)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            MutualFund.name.like(search_term),
            MutualFund.amc.like(search_term),
            MutualFund.fund_manager.like(search_term)
        ))
        
    if category:
        query = query.filter(MutualFund.category == category)
        
    if risk:
        query = query.filter(MutualFund.risk_category == risk)
        
    if min_rating:
        query = query.filter(MutualFund.fund_rating >= min_rating)
        
    return query.all()

def get_mutual_fund_by_id(db: Session, fund_id: int) -> MutualFund:
    return db.query(MutualFund).filter(MutualFund.id == fund_id).first()

def get_nav_history(db: Session, fund_id: int) -> List[NAVHistory]:
    return db.query(NAVHistory).filter(NAVHistory.fund_id == fund_id).order_by(NAVHistory.date).all()


# --- Portfolio CRUD ---
def get_user_portfolios(db: Session, user_id: int) -> List[Portfolio]:
    return db.query(Portfolio).filter(Portfolio.user_id == user_id).all()

def add_portfolio_item(db: Session, user_id: int, item: PortfolioCreate) -> Portfolio:
    db_item = Portfolio(
        user_id=user_id,
        fund_id=item.fund_id,
        units=item.units,
        purchase_price=item.purchase_price,
        purchase_date=item.purchase_date
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def remove_portfolio_item(db: Session, user_id: int, portfolio_id: int) -> bool:
    db_item = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# --- Goals CRUD ---
def get_user_goals(db: Session, user_id: int) -> List[Goal]:
    return db.query(Goal).filter(Goal.user_id == user_id).all()

def create_user_goal(db: Session, user_id: int, goal: GoalCreate) -> Goal:
    db_goal = Goal(
        user_id=user_id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date
    )
    # Calculate monthly SIP needed to reach goal based on standard 12% CAGR
    from app.services.calculators import plan_goal
    years = max(1, int((goal.target_date - datetime.utcnow().date()).days / 365.25))
    planning = plan_goal(goal.target_amount, years, 12.0)
    
    db_goal.monthly_sip_required = planning["required_monthly_sip"]
    db_goal.success_probability = planning["success_probability"]
    
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def remove_user_goal(db: Session, user_id: int, goal_id: int) -> bool:
    db_goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if db_goal:
        db.delete(db_goal)
        db.commit()
        return True
    return False


# --- AI Chat CRUD ---
def get_user_chat_history(db: Session, user_id: int) -> List[AIChat]:
    return db.query(AIChat).filter(AIChat.user_id == user_id).order_by(AIChat.timestamp).all()

def save_chat_message(db: Session, user_id: int, role: str, content: str) -> AIChat:
    db_msg = AIChat(
        user_id=user_id,
        role=role,
        content=content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
