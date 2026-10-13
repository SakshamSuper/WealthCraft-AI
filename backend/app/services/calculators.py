from datetime import date
from typing import List, Tuple, Dict
import math

def calculate_sip(monthly_sip: float, expected_cagr: float, years: int, inflation_rate: float = 6.0) -> Dict[str, Any]:
    """
    Calculates future value of SIP investments.
    
    Formula:
    FV = P * [ ( (1 + r)^n - 1 ) / r ] * (1 + r)
    where:
    P = Monthly investment
    r = Monthly rate of return (CAGR / 12 / 100)
    n = Number of months (years * 12)
    """
    P = monthly_sip
    r = (expected_cagr / 100.0) / 12.0
    n = years * 12
    
    if r == 0:
        future_value = P * n
    else:
        future_value = P * ((math.pow(1 + r, n) - 1) / r) * (1 + r)
        
    total_invested = P * n
    wealth_gained = max(0.0, future_value - total_invested)
    
    # Inflation adjusted future value
    inf_r = inflation_rate / 100.0
    inflation_adjusted_value = future_value / math.pow(1 + inf_r, years)
    
    # Heuristic probability of success based on target return and holding period
    # Higher expected CAGR and shorter duration reduce probability of achieving target.
    # Long duration (> 10 years) with moderate return increases probability.
    risk_factor = max(1.0, expected_cagr / 10.0)
    duration_factor = min(1.0, years / 10.0)
    base_probability = 95.0 - (risk_factor * 8.0) + (duration_factor * 15.0)
    success_probability = max(35.0, min(99.0, base_probability))
    
    return {
        "future_value": round(future_value, 2),
        "total_invested": round(total_invested, 2),
        "wealth_gained": round(wealth_gained, 2),
        "inflation_adjusted_value": round(inflation_adjusted_value, 2),
        "goal_completion_probability": round(success_probability, 1)
    }


def plan_goal(target_amount: float, years: int, expected_cagr: float, inflation_rate: float = 6.0) -> Dict[str, Any]:
    """
    Calculates monthly SIP needed to reach a specific financial goal.
    """
    # 1. Adjust target for inflation
    inf_r = inflation_rate / 100.0
    future_corpus = target_amount * math.pow(1 + inf_r, years)
    
    # 2. Calculate required SIP
    r = (expected_cagr / 100.0) / 12.0
    n = years * 12
    
    if r == 0:
        required_monthly_sip = future_corpus / n
    else:
        # P = FV / [ ( (1 + r)^n - 1 ) / r * (1 + r) ]
        required_monthly_sip = future_corpus / (((math.pow(1 + r, n) - 1) / r) * (1 + r))
        
    # Heuristic success probability
    risk_factor = max(1.0, expected_cagr / 10.0)
    duration_factor = min(1.0, years / 10.0)
    base_probability = 92.0 - (risk_factor * 7.5) + (duration_factor * 12.0)
    success_probability = max(40.0, min(99.0, base_probability))
    
    return {
        "future_corpus": round(future_corpus, 2),
        "required_monthly_sip": round(required_monthly_sip, 2),
        "success_probability": round(success_probability, 1),
        "investment_duration": years
    }


def calculate_xirr(cash_flows: List[Tuple[date, float]], guess: float = 0.1) -> float:
    """
    Calculates the Internal Rate of Return (XIRR) for a series of cash flows on specific dates.
    Cash flows must contain at least one negative (investment) and one positive (current value/redeem) flow.
    Uses the Newton-Raphson iterative method.
    
    Formula:
    f(r) = Sum [ C_i / (1 + r) ^ ((d_i - d_0) / 365.0) ] = 0
    f'(r) = Sum [ -C_i * ((d_i - d_0) / 365.0) * (1 + r) ^ (-((d_i - d_0) / 365.0) - 1) ]
    """
    if len(cash_flows) < 2:
        return 0.0
        
    # Ensure there's both a positive and negative cash flow
    has_pos = any(cf[1] > 0 for cf in cash_flows)
    has_neg = any(cf[1] < 0 for cf in cash_flows)
    if not (has_pos and has_neg):
        return 0.0
        
    # Sort cash flows by date
    sorted_flows = sorted(cash_flows, key=lambda x: x[0])
    d0 = sorted_flows[0][0]
    
    # Map dates to days from d0
    flows = [((cf[0] - d0).days, cf[1]) for cf in sorted_flows]
    
    r = guess
    max_iterations = 100
    precision = 1e-6
    
    for _ in range(max_iterations):
        f_val = 0.0
        df_val = 0.0
        
        for t, cf in flows:
            # Prevent division by zero if (1 + r) <= 0
            if (1 + r) <= 0:
                r = 0.01  # reset to small positive rate
                break
                
            fraction = t / 365.0
            term = math.pow(1 + r, fraction)
            f_val += cf / term
            df_val += -cf * fraction / (term * (1 + r))
            
        if abs(f_val) < precision:
            return round(r * 100.0, 2)
            
        if df_val == 0.0:
            break
            
        r_new = r - f_val / df_val
        
        # Guard against absurd updates
        if abs(r_new - r) > 2.0:
            r_new = r + (0.1 if r_new > r else -0.1)
            
        r = r_new
        
    return round(r * 100.0, 2)
