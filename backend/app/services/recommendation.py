from typing import Dict, Any, List
import openai
from app.models.models import MutualFund, User
from app.core.config import settings

def calculate_recommendation_score(fund: MutualFund, user: User) -> float:
    """
    Computes a weighted scoring algorithm (out of 100) comparing a mutual fund to a user profile.
    
    Weights:
    - 25% Risk Profile Match
    - 20% Historical Consistency
    - 15% Benchmark Outperformance
    - 15% Expense Ratio Efficiency
    - 10% Fund Rating (Morningstar/CRISIL)
    - 5% AUM Stability
    - 5% Fund Manager Quality / Tenure
    - 5% Recent Momentum (Sharpe/Sortino proxies)
    """
    
    # 1. Risk Profile Match (25%)
    risk_match_score = 0.0
    u_risk = (user.risk_appetite or "Moderate").strip().lower()
    f_risk = (fund.risk_category or "Moderate").strip().lower()
    
    if u_risk == "low":
        if "low" in f_risk:
            risk_match_score = 100.0
        elif "moderate" in f_risk and "high" not in f_risk:
            risk_match_score = 75.0
        elif "moderate" in f_risk:
            risk_match_score = 50.0
        else: # High or Very High
            risk_match_score = 15.0
    elif u_risk == "moderate":
        if "moderate" in f_risk and "low" not in f_risk:
            risk_match_score = 100.0
        elif "low" in f_risk or "moderately high" in f_risk:
            risk_match_score = 80.0
        elif "high" in f_risk:
            risk_match_score = 60.0
        else: # Very High
            risk_match_score = 40.0
    else: # High risk appetite
        if f_risk in ["very high", "high", "moderately high"]:
            risk_match_score = 100.0
        elif "moderate" in f_risk:
            risk_match_score = 70.0
        else: # Low
            risk_match_score = 30.0

    # 2. Historical Consistency (20%)
    consistency = fund.consistency_score or 50.0
    
    # 3. Benchmark Outperformance (15%)
    # Outperformance typically ranges from -2.0% to +8.0%
    outperform = fund.benchmark_outperformance or 0.0
    if outperform >= 5.0:
        outperform_score = 100.0
    elif outperform >= 2.0:
        outperform_score = 85.0
    elif outperform >= 0.0:
        outperform_score = 70.0
    elif outperform >= -2.0:
        outperform_score = 45.0
    else:
        outperform_score = 20.0
        
    # 4. Expense Ratio Efficiency (15%)
    # Ratios are values like 0.005 (0.5%) up to 0.025 (2.5%)
    exp = fund.expense_ratio or 0.015
    expense_score = max(10.0, min(100.0, 100.0 - (exp * 3000)))
    
    # 5. Fund Rating (10%)
    rating = fund.fund_rating or 3
    rating_score = rating * 20.0  # 5 stars = 100, 3 stars = 60, etc.
    
    # 6. AUM Stability (5%)
    aum = fund.aum or 1000.0
    if aum >= 20000.0:
        aum_score = 100.0
    elif aum >= 10000.0:
        aum_score = 90.0
    elif aum >= 2000.0:
        aum_score = 80.0
    else:
        aum_score = 60.0
        
    # 7. Fund Manager Quality & Tenure (5%)
    tenure = fund.manager_tenure or 3.0
    manager_score = min(100.0, tenure * 10.0 + 30.0) # 7 years = 100, 3 years = 60
    
    # 8. Recent Momentum (5%)
    # Sharpe ratio ranges from 0.5 to 2.5
    sharpe = fund.sharpe_ratio or 1.0
    momentum_score = min(100.0, max(20.0, sharpe * 50.0))
    
    # Weighted Sum
    total_score = (
        0.25 * risk_match_score +
        0.20 * consistency +
        0.15 * outperform_score +
        0.15 * expense_score +
        0.10 * rating_score +
        0.05 * aum_score +
        0.05 * manager_score +
        0.05 * momentum_score
    )
    
    return round(total_score, 1)


def generate_recommendation_explanation(fund: MutualFund, user: User, score: float) -> Dict[str, Any]:
    """
    Generates a professional explanation for the recommended mutual fund.
    Checks if OpenAI key is present; otherwise falls back to a high-quality rule-based engine.
    """
    
    # Format pros & cons
    pros_list = [p.strip() for p in (fund.pros or "").split(";") if p.strip()]
    cons_list = [c.strip() for c in (fund.cons or "").split(";") if c.strip()]
    
    # Build standard response values
    holding_period = "3-5 Years"
    if "Small Cap" in fund.category or "Mid Cap" in fund.category:
        holding_period = "5-7 Years"
    elif "Debt" in fund.category:
        holding_period = "1-3 Years"
        
    investor_type = "Conservative / Income Seeking"
    if user.risk_appetite == "High":
        investor_type = "Aggressive / Growth Seeking"
    elif user.risk_appetite == "Moderate":
        investor_type = "Balanced / Compound Accumulation"
        
    risk_level = fund.risk_category or "High"
    
    # Template fallback
    reason = (
        f"This fund matches your {user.risk_appetite.lower()} risk profile because it maintains a "
        f"volatility profile well-aligned with your preferences while targeting {fund.category} opportunities. "
        f"With an expense ratio of {fund.expense_ratio * 100:.2f}%, and a rating of {fund.fund_rating} stars, "
        f"it offers strong historical consistency (Score: {fund.consistency_score:.0f}/100) under manager "
        f"{fund.fund_manager} (Tenure: {fund.manager_tenure:.1f} years)."
    )
    
    potential = "High potential to outpace long-term inflation and generate premium compounding returns."
    if "Debt" in fund.category:
        potential = "Moderate potential, aiming to outpace traditional bank fixed deposits with capital safety."
    
    # Try calling OpenAI if API key exists
    if settings.OPENAI_API_KEY:
        try:
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = (
                f"You are a Senior Wealth Advisor. Generate a highly professional, 2-sentence investment fit summary "
                f"for the fund '{fund.name}' (Category: {fund.category}, Sharpe: {fund.sharpe_ratio}, Expense Ratio: {fund.expense_ratio*100}%) "
                f"recommending it to a user who is {user.age} years old, has a {user.risk_appetite} risk appetite and "
                f"an investment goal of '{user.investment_goal}'. Keep it analytical and avoid generic fluff."
            )
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.3
            )
            reason = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI call failed in recommendation explanation: {e}. Using rule-based fallback.")
            
    return {
        "score": score,
        "explanation": reason,
        "pros": pros_list,
        "cons": cons_list,
        "expected_risk": risk_level,
        "ideal_holding_period": holding_period,
        "future_potential": potential,
        "suitable_investor_type": investor_type
    }
