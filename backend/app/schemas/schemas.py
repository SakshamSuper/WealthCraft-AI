from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None

# --- User Profile & Questionnaire ---
class RiskProfileUpdate(BaseModel):
    age: int
    income: float
    occupation: str
    monthly_savings: float
    current_investments: float
    investment_goal: str  # Retirement, Wealth Creation, Tax Saving, Emergency Fund, Child Education, Buying House
    investment_horizon: str  # 1 Year, 3 Years, 5 Years, 10 Years, 20 Years
    risk_appetite: str  # Low, Moderate, High
    preferred_categories: str  # Comma separated, e.g. "Large Cap,Mid Cap"
    liquidity_needs: str
    sip_amount: float
    lumpsum_amount: float

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    age: Optional[int] = None
    income: Optional[float] = None
    occupation: Optional[str] = None
    monthly_savings: Optional[float] = None
    current_investments: Optional[float] = None
    investment_goal: Optional[str] = None
    investment_horizon: Optional[str] = None
    risk_appetite: Optional[str] = None
    preferred_categories: Optional[str] = None
    liquidity_needs: Optional[str] = None
    sip_amount: Optional[float] = None
    lumpsum_amount: Optional[float] = None
    risk_score: float
    diversification_score: float

    class Config:
        from_attributes = True

# --- Mutual Fund Schemas ---
class MutualFundResponse(BaseModel):
    id: int
    name: str
    amc: str
    category: str
    risk_category: str
    expense_ratio: float
    fund_rating: int
    aum: float
    fund_manager: Optional[str] = None
    manager_tenure: Optional[float] = None
    exit_load: Optional[str] = None
    lock_in_period: Optional[str] = None
    min_sip: float
    min_lumpsum: float
    sharpe_ratio: float
    sortino_ratio: float
    alpha: float
    beta: float
    standard_deviation: float
    treynor_ratio: float
    upside_capture: float
    downside_capture: float
    portfolio_turnover: float
    consistency_score: float
    drawdown: float
    benchmark_outperformance: float
    taxation: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    target_benchmark: str
    morningstar_rating: int
    crisil_rating: int
    ticker: Optional[str] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    sector: Optional[str] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None

    class Config:
        from_attributes = True

class MutualFundSearchResponse(BaseModel):
    id: int
    name: str
    amc: str
    category: str
    fund_rating: int
    expense_ratio: float
    aum: float
    risk_category: str
    is_custom: bool = False
    ticker: Optional[str] = None
    pe_ratio: Optional[float] = None
    sector: Optional[str] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None

class FundResolve(BaseModel):
    scheme_code: int
    name: str
    ticker: Optional[str] = None

class NAVHistoryResponse(BaseModel):
    date: date
    nav: float

    class Config:
        from_attributes = True

# --- Portfolio Schemas ---
class PortfolioCreate(BaseModel):
    fund_id: int
    units: float
    purchase_price: float
    purchase_date: date
    fund_name: Optional[str] = None

class PortfolioResponse(BaseModel):
    id: int
    fund_id: int
    fund_name: str
    fund_category: str
    units: float
    purchase_price: float
    purchase_date: date
    current_nav: float
    current_value: float
    absolute_return: float
    absolute_return_pct: float
    cagr: float
    xirr: float

    class Config:
        from_attributes = True

# --- Goal Schemas ---
class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    target_date: date

class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: date
    monthly_sip_required: float
    success_probability: float

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatCreate(BaseModel):
    content: str

class ChatResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True
