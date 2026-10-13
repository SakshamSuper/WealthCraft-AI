from app.services.recommendation import calculate_recommendation_score
from app.models.models import MutualFund, User
import pytest

def test_risk_matching_logic():
    """
    Verify that weighted recommendation score correctly penalizes mismatching risks.
    """
    # Low risk user
    user_low = User(risk_appetite="Low", preferred_categories="Debt")
    # High risk user
    user_high = User(risk_appetite="High", preferred_categories="Small Cap")
    
    # Debt fund (Low risk)
    debt_fund = MutualFund(
        category="Debt",
        risk_category="Low to Moderate",
        consistency_score=80.0,
        expense_ratio=0.005,
        fund_rating=4,
        aum=10000.0,
        manager_tenure=5.0,
        sharpe_ratio=1.0,
        benchmark_outperformance=0.5
    )
    
    # Small Cap fund (Very High risk)
    small_cap_fund = MutualFund(
        category="Small Cap",
        risk_category="Very High",
        consistency_score=85.0,
        expense_ratio=0.007,
        fund_rating=5,
        aum=12000.0,
        manager_tenure=6.0,
        sharpe_ratio=1.5,
        benchmark_outperformance=4.5
    )
    
    score_low_user_debt = calculate_recommendation_score(debt_fund, user_low)
    score_low_user_small = calculate_recommendation_score(small_cap_fund, user_low)
    score_high_user_debt = calculate_recommendation_score(debt_fund, user_high)
    score_high_user_small = calculate_recommendation_score(small_cap_fund, user_high)
    
    # Low-risk user should get a high score for debt, and very low score for high-risk small cap
    assert score_low_user_debt > 70.0
    assert score_low_user_small < 70.0
    
    # High-risk user should get a premium score for small cap compared to low-risk user
    assert score_high_user_small > 80.0
    assert score_high_user_small > score_high_user_debt
