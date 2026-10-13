from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Risk Profile / Questionnaire columns
    age = Column(Integer, nullable=True)
    income = Column(Float, nullable=True)
    occupation = Column(String, nullable=True)
    monthly_savings = Column(Float, nullable=True)
    current_investments = Column(Float, nullable=True)
    investment_goal = Column(String, nullable=True)  # Retirement, Wealth Creation, Tax Saving, Emergency Fund, Child Education, Buying House
    investment_horizon = Column(String, nullable=True)  # 1 Year, 3 Years, 5 Years, 10 Years, 20 Years
    risk_appetite = Column(String, nullable=True)  # Low, Moderate, High
    preferred_categories = Column(String, nullable=True)  # Comma separated: e.g. "Large Cap,Mid Cap,Flexi Cap"
    liquidity_needs = Column(String, nullable=True)
    sip_amount = Column(Float, nullable=True)
    lumpsum_amount = Column(Float, nullable=True)
    
    # Pre-calculated scores
    risk_score = Column(Float, default=0.0)  # Calculated score from profile: 0 to 100
    diversification_score = Column(Float, default=0.0)  # 0 to 100

    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("AIChat", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")


class MutualFund(Base):
    __tablename__ = "mutual_funds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    amc = Column(String, index=True, nullable=False)  # Asset Management Company (e.g. SBI Mutual Fund)
    category = Column(String, index=True, nullable=False)  # Large Cap, Mid Cap, Small Cap, Flexi Cap, Index, ELSS, Debt, Hybrid, International, Sectoral
    risk_category = Column(String, nullable=False)  # Low, Low to Moderate, Moderate, Moderately High, High, Very High
    expense_ratio = Column(Float, nullable=False)  # e.g., 0.0075 for 0.75%
    fund_rating = Column(Integer, default=3)  # Morningstar/CRISIL style rating: 1 to 5
    aum = Column(Float, nullable=False)  # Asset Under Management (in Crores INR)
    fund_manager = Column(String, nullable=True)
    manager_tenure = Column(Float, nullable=True)  # in years
    exit_load = Column(String, nullable=True)
    lock_in_period = Column(String, nullable=True)  # e.g. "None", "3 Years"
    min_sip = Column(Float, default=500.0)
    min_lumpsum = Column(Float, default=5000.0)
    
    # Financial/Risk Ratios
    sharpe_ratio = Column(Float, default=0.0)
    sortino_ratio = Column(Float, default=0.0)
    alpha = Column(Float, default=0.0)
    beta = Column(Float, default=1.0)
    standard_deviation = Column(Float, default=0.0)
    treynor_ratio = Column(Float, default=0.0)
    upside_capture = Column(Float, default=100.0)
    downside_capture = Column(Float, default=100.0)
    portfolio_turnover = Column(Float, default=0.0)
    consistency_score = Column(Float, default=50.0)  # out of 100
    drawdown = Column(Float, default=0.0)  # Max Drawdown decimal (e.g., 0.15 for -15%)
    benchmark_outperformance = Column(Float, default=0.0)  # Percentage outperformance over benchmark
    
    # Taxonomy and descriptions
    taxation = Column(Text, nullable=True)
    pros = Column(Text, nullable=True)  # Semi-colon separated strings
    cons = Column(Text, nullable=True)  # Semi-colon separated strings
    target_benchmark = Column(String, default="NIFTY 50 TRI")
    morningstar_rating = Column(Integer, default=3)
    crisil_rating = Column(Integer, default=3)
    ticker = Column(String, nullable=True)
    
    # Relationships
    nav_history = relationship("NAVHistory", back_populates="fund", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="fund")
    recommendations = relationship("Recommendation", back_populates="fund", cascade="all, delete-orphan")


class NAVHistory(Base):
    __tablename__ = "nav_history"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("mutual_funds.id"), nullable=False)
    date = Column(Date, nullable=False)
    nav = Column(Float, nullable=False)

    fund = relationship("MutualFund", back_populates="nav_history")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fund_id = Column(Integer, ForeignKey("mutual_funds.id"), nullable=False)
    units = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=False)  # The average NAV price at purchase
    purchase_date = Column(Date, default=datetime.utcnow().date)

    user = relationship("User", back_populates="portfolios")
    fund = relationship("MutualFund", back_populates="portfolios")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(Date, nullable=False)
    monthly_sip_required = Column(Float, default=0.0)
    success_probability = Column(Float, default=0.0)  # Percentage e.g. 85.5%

    user = relationship("User", back_populates="goals")


class AIChat(Base):
    __tablename__ = "ai_chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fund_id = Column(Integer, ForeignKey("mutual_funds.id"), nullable=False)
    score = Column(Float, nullable=False)  # Overall match score (0 to 100)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendations")
    fund = relationship("MutualFund", back_populates="recommendations")
