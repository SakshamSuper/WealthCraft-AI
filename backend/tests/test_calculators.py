from app.services.calculators import calculate_sip, plan_goal, calculate_xirr
from datetime import date, timedelta
import pytest

def test_sip_calculation():
    """
    Test standard SIP compounding calculations.
    """
    res = calculate_sip(monthly_sip=10000.0, expected_cagr=12.0, years=10, inflation_rate=6.0)
    
    # 10,000 * 12 * 10 = 12 Lakhs invested
    assert res["total_invested"] == 1200000.0
    assert res["future_value"] > 1200000.0
    assert res["wealth_gained"] > 0
    assert res["inflation_adjusted_value"] < res["future_value"]
    assert 30.0 <= res["goal_completion_probability"] <= 99.0

def test_goal_planning():
    """
    Test Goal planning needed monthly SIP output.
    """
    res = plan_goal(target_amount=5000000.0, years=10, expected_cagr=12.0, inflation_rate=6.0)
    
    # Target adjusted for inflation must be greater than target amount
    assert res["future_corpus"] > 5000000.0
    assert res["required_monthly_sip"] > 0
    assert res["investment_duration"] == 10

def test_xirr_solver():
    """
    Test the custom XIRR solver on exact CAGR values.
    """
    # Simple transaction: -100 invested on Day 0, +112 returned on Day 365 (exactly 12% growth)
    d0 = date(2023, 1, 1)
    d1 = date(2024, 1, 1)
    cash_flows = [
        (d0, -100.0),
        (d1, 112.0)
    ]
    
    xirr = calculate_xirr(cash_flows)
    # Allow small precision range around 12%
    assert abs(xirr - 12.0) < 0.1
