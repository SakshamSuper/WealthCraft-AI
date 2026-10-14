from datetime import date
from typing import List, Tuple, Dict, Any
import math


def calculate_sip(monthly_sip: float, expected_cagr: float, years: int, inflation_rate: float = 6.0) -> Dict[str, Any]:
    """
    Calculates future value of SIP investments.

    Formula: FV = P * [ ( (1 + r)^n - 1 ) / r ] * (1 + r)
      P = Monthly investment
      r = Monthly rate of return (CAGR / 12 / 100)
      n = Number of months (years * 12)
    """
    P = max(0.0, monthly_sip)
    r = (max(0.0, expected_cagr) / 100.0) / 12.0
    n = max(1, years) * 12

    if r == 0:
        future_value = P * n
    else:
        future_value = P * ((math.pow(1 + r, n) - 1) / r) * (1 + r)

    total_invested = P * n
    wealth_gained = max(0.0, future_value - total_invested)

    # Inflation-adjusted future value
    inf_r = max(0.0, inflation_rate) / 100.0
    inflation_adjusted_value = future_value / math.pow(1 + inf_r, years) if years > 0 else future_value

    # Heuristic probability of success (purely illustrative — not financial advice)
    risk_factor = max(1.0, expected_cagr / 10.0)
    duration_factor = min(1.0, years / 10.0)
    base_probability = 95.0 - (risk_factor * 8.0) + (duration_factor * 15.0)
    success_probability = max(35.0, min(99.0, base_probability))

    return {
        "future_value": round(future_value, 2),
        "total_invested": round(total_invested, 2),
        "wealth_gained": round(wealth_gained, 2),
        "inflation_adjusted_value": round(inflation_adjusted_value, 2),
        "goal_completion_probability": round(success_probability, 1),
    }


def plan_goal(target_amount: float, years: int, expected_cagr: float, inflation_rate: float = 6.0) -> Dict[str, Any]:
    """
    Calculates monthly SIP needed to reach a specific financial goal,
    adjusting the target for inflation.
    """
    inf_r = max(0.0, inflation_rate) / 100.0
    future_corpus = target_amount * math.pow(1 + inf_r, max(1, years))

    r = (max(0.0, expected_cagr) / 100.0) / 12.0
    n = max(1, years) * 12

    if r == 0:
        required_monthly_sip = future_corpus / n
    else:
        # P = FV / [ ( (1 + r)^n - 1 ) / r * (1 + r) ]
        required_monthly_sip = future_corpus / (((math.pow(1 + r, n) - 1) / r) * (1 + r))

    risk_factor = max(1.0, expected_cagr / 10.0)
    duration_factor = min(1.0, years / 10.0)
    base_probability = 92.0 - (risk_factor * 7.5) + (duration_factor * 12.0)
    success_probability = max(40.0, min(99.0, base_probability))

    return {
        "future_corpus": round(future_corpus, 2),
        "required_monthly_sip": round(required_monthly_sip, 2),
        "success_probability": round(success_probability, 1),
        "investment_duration": years,
    }


def calculate_xirr(cash_flows: List[Tuple[date, float]], guess: float = 0.1) -> float:
    """
    Calculates the XIRR (Extended IRR) for a series of dated cash flows.

    Requirements:
      - At least two cash flows.
      - At least one negative (outflow / investment) and one positive (inflow / redemption).

    Uses Newton-Raphson iteration with bisection fallback.

    Formula:
      f(r) = Σ [ C_i / (1 + r)^((d_i - d_0) / 365.0) ] = 0
    """
    if len(cash_flows) < 2:
        return 0.0

    has_pos = any(cf[1] > 0 for cf in cash_flows)
    has_neg = any(cf[1] < 0 for cf in cash_flows)
    if not (has_pos and has_neg):
        return 0.0

    sorted_flows = sorted(cash_flows, key=lambda x: x[0])
    d0 = sorted_flows[0][0]
    flows = [((cf[0] - d0).days, cf[1]) for cf in sorted_flows]

    def npv(rate: float) -> float:
        total = 0.0
        for t, cf in flows:
            denom = (1.0 + rate) ** (t / 365.0)
            total += cf / denom
        return total

    def dnpv(rate: float) -> float:
        total = 0.0
        for t, cf in flows:
            exp = t / 365.0
            total += -cf * exp * (1.0 + rate) ** (-exp - 1.0)
        return total

    # Newton-Raphson
    r = guess
    for _ in range(200):
        try:
            if (1.0 + r) <= 0:
                r = 0.01
            fv = npv(r)
            if abs(fv) < 1e-7:
                return round(r * 100.0, 2)
            dfv = dnpv(r)
            if dfv == 0.0:
                break
            r_new = r - fv / dfv
            # Clamp to prevent divergence
            r_new = max(-0.999, min(r_new, 100.0))
            if abs(r_new - r) < 1e-9:
                return round(r_new * 100.0, 2)
            r = r_new
        except Exception:
            break

    # Bisection fallback: bracket [lo, hi] and narrow
    try:
        lo, hi = -0.9, 10.0
        f_lo = npv(lo)
        f_hi = npv(hi)
        if f_lo * f_hi > 0:
            # Try a different bracket
            for candidate in [0.0, 0.05, 0.15, 0.5, 2.0, 5.0]:
                f_c = npv(candidate)
                if f_lo * f_c < 0:
                    hi = candidate
                    f_hi = f_c
                    break
                elif f_hi * f_c < 0:
                    lo = candidate
                    f_lo = f_c
                    break

        for _ in range(100):
            mid = (lo + hi) / 2.0
            f_mid = npv(mid)
            if abs(f_mid) < 1e-7 or (hi - lo) < 1e-9:
                return round(mid * 100.0, 2)
            if f_lo * f_mid < 0:
                hi = mid
                f_hi = f_mid
            else:
                lo = mid
                f_lo = f_mid
        return round((lo + hi) / 2.0 * 100.0, 2)
    except Exception:
        return 0.0


def calculate_cagr(initial_value: float, final_value: float, years: float) -> float:
    """
    Calculate Compound Annual Growth Rate.
    Returns 0.0 on invalid input.
    """
    if initial_value <= 0 or final_value <= 0 or years <= 0:
        return 0.0
    try:
        return round((math.pow(final_value / initial_value, 1.0 / years) - 1.0) * 100.0, 2)
    except Exception:
        return 0.0
