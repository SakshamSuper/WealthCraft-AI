import os
import sys
from datetime import datetime, timedelta
import random
import math
import json
import re

# Add backend directory to PYTHONPATH
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(root_dir, "backend"))

from app.core.database import Base, engine, SessionLocal
from app.models.models import MutualFund, NAVHistory, User
from app.core.security import get_password_hash

def parse_mcap(mcap_str):
    if not mcap_str:
        return 50000.0
    cleaned = re.sub(r'[^\d.]', '', str(mcap_str))
    try:
        return float(cleaned)
    except Exception:
        return 50000.0

def generate_calibrated_52w_history(ltp, low_52w, high_52w):
    """
    Generate 53 weekly price points strictly bounded by low_52w and high_52w,
    ending exactly at ltp (today).
    """
    low_52w = min(low_52w, ltp * 0.98)
    high_52w = max(high_52w, ltp * 1.02)
    
    low_week = random.randint(8, 26)
    high_week = random.randint(28, 48) if low_week < 26 else random.randint(5, 20)
    
    prices = [0.0] * 53
    prices[52] = round(ltp, 2)
    prices[low_week] = round(low_52w, 2)
    prices[high_week] = round(high_52w, 2)
    
    prices[0] = round(low_52w + (high_52w - low_52w) * random.uniform(0.3, 0.7), 2)
    
    key_points = sorted([(0, prices[0]), (low_week, low_52w), (high_week, high_52w), (52, ltp)], key=lambda x: x[0])
    
    for i in range(len(key_points) - 1):
        w_start, p_start = key_points[i]
        w_end, p_end = key_points[i+1]
        span = w_end - w_start
        for step in range(1, span):
            w = w_start + step
            base = p_start + (p_end - p_start) * (step / span)
            noise_scale = (high_52w - low_52w) * 0.04
            noise = random.normalvariate(0, noise_scale)
            val = round(max(low_52w, min(high_52w, base + noise)), 2)
            prices[w] = val

    prices[52] = round(ltp, 2)
    return prices

def get_master_market_catalog():
    catalog = []

    # 1. MUTUAL FUNDS CATALOG
    mf_raw = [
        # Large Cap Funds
        ("HDFC Top 100 Fund", "HDFC Mutual Fund", "Large Cap", 0.011, 28450.0, "Rahul Baijal", 650.0),
        ("SBI Bluechip Fund", "SBI Mutual Fund", "Large Cap", 0.009, 41200.0, "Sohini Andani", 55.0),
        ("ICICI Prudential Bluechip Fund", "ICICI Prudential Mutual Fund", "Large Cap", 0.0092, 52100.0, "Anish Tawakley", 85.0),
        ("Nippon India Large Cap Fund", "Nippon India Mutual Fund", "Large Cap", 0.0085, 24500.0, "Sailesh Raj Bhan", 78.0),
        ("Kotak Bluechip Fund", "Kotak Mahindra Mutual Fund", "Large Cap", 0.0088, 8900.0, "Harish Krishnan", 48.0),
        ("Axis Bluechip Fund", "Axis Mutual Fund", "Large Cap", 0.0105, 31200.0, "Shreyash Devalkar", 52.0),
        ("Mirae Asset Large Cap Fund", "Mirae Asset Mutual Fund", "Large Cap", 0.0055, 36800.0, "Gaurav Misra", 92.0),
        ("Canara Robeco Bluechip Equity Fund", "Canara Robeco Mutual Fund", "Large Cap", 0.0048, 12400.0, "Shridatta Bhandwaldar", 58.0),
        ("UTI Mastershare Unit Scheme", "UTI Mutual Fund", "Large Cap", 0.0102, 11500.0, "Karthikraj Lakshmanan", 240.0),
        ("Tata Large Cap Fund", "Tata Mutual Fund", "Large Cap", 0.0095, 2100.0, "Abhinav Sharma", 42.0),
        ("Aditya Birla Sun Life Frontline Equity", "Aditya Birla Sun Life Mutual Fund", "Large Cap", 0.0098, 25400.0, "Mahesh Patil", 380.0),
        ("DSP Top 100 Equity Fund", "DSP Mutual Fund", "Large Cap", 0.0112, 3400.0, "Charanjit Singh", 310.0),

        # Mid Cap Funds
        ("Axis Midcap Fund", "Axis Mutual Fund", "Mid Cap", 0.0085, 22400.0, "Shreyash Devalkar", 50.0),
        ("Kotak Emerging Equity Fund", "Kotak Mahindra Mutual Fund", "Mid Cap", 0.0055, 39500.0, "Harsha Upadhyaya", 60.0),
        ("HDFC Mid-Cap Opportunities Fund", "HDFC Mutual Fund", "Mid Cap", 0.0082, 64200.0, "Chirag Setalvad", 145.0),
        ("Nippon India Growth Fund", "Nippon India Mutual Fund", "Mid Cap", 0.0095, 28900.0, "Manish Gunwani", 320.0),
        ("SBI Magnum Midcap Fund", "SBI Mutual Fund", "Mid Cap", 0.0098, 18500.0, "Bhavin Vithlani", 195.0),
        ("ICICI Prudential Midcap Fund", "ICICI Prudential Mutual Fund", "Mid Cap", 0.0088, 5800.0, "Prakash Gaurav Goel", 240.0),
        ("Motilal Oswal Midcap Fund", "Motilal Oswal Mutual Fund", "Mid Cap", 0.0068, 14200.0, "Niket Shah", 82.0),
        ("Quant Mid Cap Fund", "Quant Mutual Fund", "Mid Cap", 0.0072, 8900.0, "Sanjeev Sharma", 210.0),
        ("Mirae Asset Midcap Fund", "Mirae Asset Mutual Fund", "Mid Cap", 0.0062, 15400.0, "Ankit Jain", 38.0),
        ("DSP Midcap Fund", "DSP Mutual Fund", "Mid Cap", 0.0085, 16800.0, "Vinit Sambre", 112.0),
        ("PGIM India Midcap Opportunities", "PGIM India Mutual Fund", "Mid Cap", 0.0078, 9800.0, "Vinay Paharia", 54.0),
        ("Tata Midcap Growth Fund", "Tata Mutual Fund", "Mid Cap", 0.0085, 4100.0, "Satish Chandra Mishra", 310.0),

        # Small Cap Funds
        ("Nippon India Small Cap Fund", "Nippon India Mutual Fund", "Small Cap", 0.007, 46800.0, "Samir Rachh", 80.0),
        ("Tata Small Cap Fund", "Tata Mutual Fund", "Small Cap", 0.0062, 6800.0, "Chandraprakash Padiyar", 20.0),
        ("Quant Small Cap Fund", "Quant Mutual Fund", "Small Cap", 0.0065, 21400.0, "Sanjeev Sharma", 260.0),
        ("SBI Small Cap Fund", "SBI Mutual Fund", "Small Cap", 0.0072, 28500.0, "R. Srinivasan", 165.0),
        ("HDFC Small Cap Fund", "HDFC Mutual Fund", "Small Cap", 0.0078, 29800.0, "Chirag Setalvad", 128.0),
        ("Axis Small Cap Fund", "Axis Mutual Fund", "Small Cap", 0.0055, 2100.0, "Mayank Hyanki", 94.0),
        ("ICICI Prudential Smallcap Fund", "ICICI Prudential Mutual Fund", "Small Cap", 0.0072, 7900.0, "Sankaran Naren", 72.0),
        ("Kotak Small Cap Fund", "Kotak Mahindra Mutual Fund", "Small Cap", 0.0058, 14500.0, "Pankaj Tibrewal", 220.0),
        ("Invesco India Smallcap Fund", "Invesco Mutual Fund", "Small Cap", 0.0065, 4200.0, "Taher Badshah", 34.0),
        ("Canara Robeco Small Cap Fund", "Canara Robeco Mutual Fund", "Small Cap", 0.0048, 11200.0, "Shridatta Bhandwaldar", 32.0),

        # Flexi Cap Funds
        ("Parag Parikh Flexi Cap Fund", "PPFAS Mutual Fund", "Flexi Cap", 0.007, 58600.0, "Rajeev Thakkar", 40.0),
        ("Quant Active Fund", "Quant Mutual Fund", "Flexi Cap", 0.0075, 9800.0, "Sanjeev Sharma", 350.0),
        ("HDFC Flexi Cap Fund", "HDFC Mutual Fund", "Flexi Cap", 0.0082, 54200.0, "Roshi Jain", 1680.0),
        ("ICICI Prudential Flexicap Fund", "ICICI Prudential Mutual Fund", "Flexi Cap", 0.0102, 14200.0, "Rajat Chandak", 28.0),
        ("PGIM India Flexi Cap Fund", "PGIM India Mutual Fund", "Flexi Cap", 0.0085, 5400.0, "Vinay Paharia", 32.0),
        ("Canara Robeco Flexi Cap Fund", "Canara Robeco Mutual Fund", "Flexi Cap", 0.0055, 11800.0, "Shridatta Bhandwaldar", 285.0),
        ("Kotak Flexi Cap Fund", "Kotak Mahindra Mutual Fund", "Flexi Cap", 0.0062, 48200.0, "Harsha Upadhyaya", 72.0),
        ("UTI Flexi Cap Fund", "UTI Mutual Fund", "Flexi Cap", 0.0092, 24100.0, "Ajay Tyagi", 260.0),

        # ELSS Tax Saver Funds
        ("Mirae Asset Tax Saver Fund", "Mirae Asset Mutual Fund", "ELSS", 0.006, 19200.0, "Neelesh Surana", 25.0),
        ("Bandhan Tax Saver Fund", "Bandhan Mutual Fund", "ELSS", 0.0072, 5400.0, "Daylynn Pinto", 70.0),
        ("SBI Long Term Equity Fund", "SBI Mutual Fund", "ELSS", 0.0092, 23500.0, "Dinesh Balachandran", 380.0),
        ("Quant ELSS Tax Saver Fund", "Quant Mutual Fund", "ELSS", 0.0075, 9800.0, "Sanjeev Sharma", 380.0),
        ("DSP Tax Saver Fund", "DSP Mutual Fund", "ELSS", 0.0078, 14200.0, "Rohit Singhania", 112.0),
        ("Axis Long Term Equity Fund", "Axis Mutual Fund", "ELSS", 0.0088, 28900.0, "Shreyash Devalkar", 85.0),
        ("Kotak Tax Saver Fund", "Kotak Mahindra Mutual Fund", "ELSS", 0.0062, 5200.0, "Harsha Upadhyaya", 92.0),

        # Index Funds
        ("UTI Nifty 50 Index Fund", "UTI Mutual Fund", "Index", 0.002, 15800.0, "Sharwan Kumar Goyal", 90.0),
        ("ICICI Prudential Sensex Index Fund", "ICICI Prudential Mutual Fund", "Index", 0.0017, 7200.0, "Anish Tawakley", 120.0),
        ("HDFC Nifty 50 Index Fund", "HDFC Mutual Fund", "Index", 0.002, 14200.0, "Nirman Morakhia", 210.0),
        ("SBI Nifty Index Fund", "SBI Mutual Fund", "Index", 0.0018, 7800.0, "Raviprakash Sharma", 185.0),
        ("Nippon India Nifty 50 Index Fund", "Nippon India Mutual Fund", "Index", 0.002, 5400.0, "Himanshu Mange", 35.0),
        ("Motilal Oswal Nifty 500 Index Fund", "Motilal Oswal Mutual Fund", "Index", 0.0035, 4200.0, "Swapnil Mayekar", 24.0),

        # Sectoral & Thematic Funds
        ("ICICI Prudential Technology Fund", "ICICI Prudential Mutual Fund", "Sectoral", 0.0088, 11800.0, "Vaibhav Dusad", 195.0),
        ("SBI Banking & Financial Services Fund", "SBI Mutual Fund", "Sectoral", 0.0085, 5400.0, "Milind Agrawal", 32.0),
        ("Tata Digital India Fund", "Tata Mutual Fund", "Sectoral", 0.0078, 9200.0, "Meeta Shetty", 48.0),
        ("Nippon India Pharma Fund", "Nippon India Mutual Fund", "Sectoral", 0.0102, 6800.0, "Sailesh Raj Bhan", 420.0),
        ("ICICI Prudential Commodities Fund", "ICICI Prudential Mutual Fund", "Sectoral", 0.0092, 2100.0, "Lalit Kumar", 38.0),

        # Hybrid & Debt Funds
        ("SBI Equity Hybrid Fund", "SBI Mutual Fund", "Hybrid", 0.008, 62300.0, "R. Srinivasan", 180.0),
        ("ICICI Prudential Asset Allocator Fund", "ICICI Prudential Mutual Fund", "Hybrid", 0.0068, 21800.0, "Sankaran Naren", 85.0),
        ("HDFC Balanced Advantage Fund", "HDFC Mutual Fund", "Hybrid", 0.0085, 86500.0, "Prashant Jain", 410.0),
        ("Aditya Birla Sun Life Medium Term Plan", "Aditya Birla Sun Life Mutual Fund", "Debt", 0.005, 3400.0, "Sunaina da Cunha", 15.0),
        ("SBI Savings Fund", "SBI Mutual Fund", "Debt", 0.003, 24000.0, "Raju Sharma", 32.0),
        ("Nippon India Liquid Fund", "Nippon India Mutual Fund", "Debt", 0.0025, 32000.0, "Anju Chhajer", 5400.0)
    ]

    for name, amc, cat, exp, aum, mgr, nav in mf_raw:
        catalog.append({
            "name": name,
            "amc": amc,
            "category": cat,
            "risk_category": "Very High" if cat in ["Small Cap", "Mid Cap", "Flexi Cap", "Sectoral"] else "High" if cat in ["Large Cap", "ELSS", "Index"] else "Moderate",
            "expense_ratio": exp,
            "fund_rating": random.choice([4, 5]),
            "aum": aum,
            "fund_manager": mgr,
            "manager_tenure": round(random.uniform(4.0, 12.0), 1),
            "exit_load": "1.00% if redeemed within 1 year" if cat != "Index" else "Nil",
            "lock_in_period": "3 Years" if cat == "ELSS" else "None",
            "min_sip": 500.0,
            "min_lumpsum": 5000.0,
            "sharpe_ratio": round(random.uniform(1.2, 1.85), 2),
            "sortino_ratio": round(random.uniform(1.4, 2.25), 2),
            "alpha": round(random.uniform(1.5, 8.2), 1),
            "beta": round(random.uniform(0.8, 1.1), 2),
            "standard_deviation": round(random.uniform(13.0, 19.5), 1),
            "treynor_ratio": round(random.uniform(14.0, 25.0), 1),
            "upside_capture": round(random.uniform(95.0, 120.0), 1),
            "downside_capture": round(random.uniform(70.0, 90.0), 1),
            "portfolio_turnover": round(random.uniform(0.08, 0.45), 2),
            "consistency_score": round(random.uniform(80.0, 98.0), 1),
            "drawdown": round(random.uniform(0.12, 0.22), 2),
            "benchmark_outperformance": round(random.uniform(1.2, 6.5), 1),
            "taxation": "Equity: 15% STCG. 12.5% LTCG above INR 1.25 Lakh.",
            "pros": f"Top performing fund in {cat} category;Low downside capture",
            "cons": "Exposed to broader equity market volatility",
            "target_benchmark": f"NIFTY {cat.upper()} TRI",
            "initial_nav": nav,
            "annual_return": round(random.uniform(0.13, 0.23), 3),
            "volatility": round(random.uniform(0.11, 0.18), 2),
            "ticker": None,
            "pe_ratio": round(random.uniform(18.0, 32.0), 1),
            "pb_ratio": round(random.uniform(2.5, 4.5), 1),
            "dividend_yield": 1.2,
            "sector": f"Mutual Fund - {cat}",
            "high_52w": round(nav * 1.15, 2),
            "low_52w": round(nav * 0.82, 2),
            "is_stock": False
        })

    # 2. ETFS CATALOG
    etfs_raw = [
        ("NIFTYBEES.NS", "Nippon India ETF Nifty BeES", "Nippon India Mutual Fund", 265.0, 28500.0),
        ("BANKBEES.NS", "Nippon India ETF Bank BeES", "Nippon India Mutual Fund", 578.0, 14200.0),
        ("GOLDBEES.NS", "Nippon India ETF Gold BeES", "Nippon India Mutual Fund", 68.50, 11500.0),
        ("JUNIORBEES.NS", "Nippon India ETF Junior BeES", "Nippon India Mutual Fund", 680.0, 4200.0),
        ("ITBEES.NS", "ICICI Prudential IT ETF", "ICICI Prudential Mutual Fund", 41.50, 3100.0),
        ("LIQUIDBEES.NS", "Nippon India ETF Liquid BeES", "Nippon India Mutual Fund", 1000.0, 15400.0),
        ("MON100.NS", "Motilal Oswal S&P 500 Index ETF", "Motilal Oswal Mutual Fund", 75.0, 4200.0),
        ("MONASDAQ.NS", "Motilal Oswal Nasdaq 100 ETF", "Motilal Oswal Mutual Fund", 145.0, 6800.0),
        ("MAFANG.NS", "Mirae Asset NYSE FANG+ ETF", "Mirae Asset Mutual Fund", 92.0, 2400.0),
        ("SILVERBEES.NS", "Nippon India ETF Silver BeES", "Nippon India Mutual Fund", 88.0, 3800.0),
        ("CPSEETF.NS", "CPSE ETF", "Nippon India Mutual Fund", 94.0, 31200.0),
        ("BHARAT22.NS", "Bharat 22 ETF", "ICICI Prudential Mutual Fund", 112.0, 18500.0),
        ("HEALTHIETF.NS", "ICICI Prudential Nifty Healthcare ETF", "ICICI Prudential Mutual Fund", 124.0, 1500.0),
        ("AUTOIETF.NS", "ICICI Prudential Nifty Auto ETF", "ICICI Prudential Mutual Fund", 240.0, 1900.0),
        ("FMCGIETF.NS", "ICICI Prudential Nifty FMCG ETF", "ICICI Prudential Mutual Fund", 58.0, 1200.0),
        ("FINANCIAL.NS", "Mirae Asset Nifty Financial Services ETF", "Mirae Asset Mutual Fund", 24.0, 980.0),
        ("PSUBANK.NS", "Kotak Nifty PSU Bank ETF", "Kotak Mahindra Mutual Fund", 74.0, 2800.0),
        ("PVTBANK.NS", "SBI Nifty Private Bank ETF", "SBI Mutual Fund", 260.0, 1400.0),
        ("LOWVOLIETF.NS", "Nippon India ETF Nifty 100 Low Volatility 30", "Nippon India Mutual Fund", 210.0, 2200.0),
        ("MOMENTUM.NS", "ICICI Prudential Nifty 200 Momentum 30 ETF", "ICICI Prudential Mutual Fund", 310.0, 3400.0),
        ("ALPHA.NS", "Tata Nifty Alpha 50 ETF", "Tata Mutual Fund", 52.0, 1100.0),
        ("EQUAL50.NS", "HDFC Nifty 100 Equal Weight ETF", "HDFC Mutual Fund", 185.0, 2500.0),
        ("UTIBANK.NS", "UTI Nifty Bank ETF", "UTI Mutual Fund", 578.0, 3100.0),
        ("AXISIT.NS", "Axis Nifty IT ETF", "Axis Mutual Fund", 41.20, 850.0),
        ("MAKEINDIA.NS", "Mirae Asset Nifty India Manufacturing ETF", "Mirae Asset Mutual Fund", 38.0, 1400.0),
        ("DSPEQUAL.NS", "DSP Nifty 50 Equal Weight ETF", "DSP Mutual Fund", 265.0, 1900.0),
        ("EDELPSU.NS", "Edelweiss Nifty PSU Bank ETF", "Edelweiss Mutual Fund", 74.0, 890.0),
        ("MOGOLD.NS", "Motilal Oswal Gold ETF", "Motilal Oswal Mutual Fund", 68.0, 1200.0),
        ("HDFCSILVER.NS", "HDFC Silver ETF", "HDFC Mutual Fund", 88.50, 2100.0),
        ("ICICISILVER.NS", "ICICI Prudential Silver ETF", "ICICI Prudential Mutual Fund", 88.20, 2400.0)
    ]

    for sym, name, amc, price, aum in etfs_raw:
        catalog.append({
            "name": name,
            "amc": amc,
            "category": "ETF",
            "risk_category": "Very High" if "MOMENTUM" in sym or "ALPHA" in sym else "High" if "BEES" in sym else "Moderate",
            "expense_ratio": 0.0005 if "BEES" in sym else 0.0015,
            "fund_rating": 5,
            "aum": aum,
            "fund_manager": "ETF Index Desk",
            "manager_tenure": 7.0,
            "exit_load": "Nil",
            "lock_in_period": "None",
            "min_sip": 1.0,
            "min_lumpsum": price,
            "sharpe_ratio": 1.25,
            "sortino_ratio": 1.45,
            "alpha": 0.0,
            "beta": 1.00,
            "standard_deviation": 14.1,
            "treynor_ratio": 14.6,
            "upside_capture": 100.0,
            "downside_capture": 100.0,
            "portfolio_turnover": 0.02,
            "consistency_score": 100.0,
            "drawdown": 0.16,
            "benchmark_outperformance": 0.0,
            "taxation": "Equity ETF: 15% STCG. 12.5% LTCG.",
            "pros": "Instant market exchange liquidity & lowest tracking error",
            "cons": "Exact benchmark replication",
            "target_benchmark": "NIFTY INDEX",
            "initial_nav": price,
            "annual_return": 0.14,
            "volatility": 0.13,
            "ticker": sym,
            "pe_ratio": 22.0,
            "pb_ratio": 3.2,
            "dividend_yield": 1.35,
            "sector": "Index ETF",
            "high_52w": round(price * 1.18, 2),
            "low_52w": round(price * 0.85, 2),
            "is_stock": False
        })

    # 3. OFFICIAL DHAN NIFTY 50 CONSTITUENT STOCKS
    dhan_mapping = {
        "RELIANCEIN.NS": ("RELIANCE.NS", "Reliance Industries Ltd", "Oil, Gas & Energy", "Market leader in telecom, retail & green energy;High operating cash flow", "Capex cycle and exposure to crude margins"),
        "BHARTIAIRT.NS": ("BHARTIARTL.NS", "Bharti Airtel Ltd", "Telecommunications", "Rapid ARPU expansion and high 5G market share;Dominant Africa presence", "Intense telecom rivalry and regulatory fees"),
        "HDFCBANK.NS": ("HDFCBANK.NS", "HDFC Bank Ltd", "Banking & Finance", "India's largest private bank with premier asset quality;Massive branch reach", "Post-merger loan-to-deposit ratio digestion"),
        "ICICIBANK.NS": ("ICICIBANK.NS", "ICICI Bank Ltd", "Banking & Finance", "Best-in-class return on equity;Strong retail underwriting and digital banking", "Vulnerability to macro lending slowdown"),
        "STATEBANKO.NS": ("SBIN.NS", "State Bank of India", "Banking & Finance", "Nationwide systemic deposit moat;Strong corporate loan pipeline", "Higher PSU operating overhead and priority sector burdens"),
        "TATACONSUL.NS": ("TCS.NS", "Tata Consultancy Services Ltd", "Information Technology", "Industry-leading operating margins;Massive enterprise client retention", "Global corporate tech discretionary spend cuts"),
        "BAJAJFINAN.NS": ("BAJFINANCE.NS", "Bajaj Finance Ltd", "Banking & Finance", "Pioneer in omnichannel consumer credit and cross-sell;High ROA", "Rising unsecured personal loan default risks"),
        "LARSENTOUB.NS": ("LT.NS", "Larsen & Toubro Ltd", "Infrastructure & Capital Goods", "Multi-trillion rupee order book in India & Middle East;Hydrocarbon/defense play", "Execution delays and raw material inflationary pressures"),
        "HINDUSTANU.NS": ("HINDUNILVR.NS", "Hindustan Unilever Ltd", "FMCG & Consumer Goods", "Household staple brands present in 9 out of 10 Indian homes;High ROCE", "Rural consumption demand sensitivity and local brand competition"),
        "SUNPHARMAC.NS": ("SUNPHARMA.NS", "Sun Pharmaceutical Industries Ltd", "Pharmaceuticals & Healthcare", "Global specialty drug momentum;Strong domestic formulations market share", "US FDA regulatory inspection findings"),
        "INFOSYS.NS": ("INFY.NS", "Infosys Ltd", "Information Technology", "Top generative AI & digital transformation deals;Attractive free cash dividend payout", "Subdued banking and telecom client tech spend in North America"),
        "MARUTISUZU.NS": ("MARUTI.NS", "Maruti Suzuki India Ltd", "Automobile", "Unmatched domestic dealership and service network;Dominant passenger car share", "Slower rollout in pure electric vehicle segment"),
        "ADANIPORTS.NS": ("ADANIPORTS.NS", "Adani Ports & Special Economic Zone", "Infrastructure & Capital Goods", "Strategic commercial port locations across both coastlines;High EBITDA margins", "Geopolitical maritime transit risks"),
        "TITAN.NS": ("TITAN.NS", "Titan Company Ltd", "FMCG & Consumer Goods", "Tanishq brand loyalty and formalization of Indian jewellery;High luxury retail moat", "Gold price volatility and customs duty adjustments"),
        "ADANIENTER.NS": ("ADANIENT.NS", "Adani Enterprises Ltd", "Infrastructure & Capital Goods", "Incubator of flagship infrastructure assets (airports, roads, green hydrogen)", "Substantial consolidated leverage and project gestation"),
        "MAHINDRAMA.NS": ("M&M.NS", "Mahindra & Mahindra Ltd", "Automobile", "Unchallenged leader in SUVs and agricultural tractors;Fast EV transition", "Semiconductor component bottlenecks and cyclical farm income"),
        "AXISBANK.NS": ("AXISBANK.NS", "Axis Bank Ltd", "Banking & Finance", "High retail credit card engagement;Improved NIM and Citi India portfolio synergies", "Competition in wholesale deposit repricing"),
        "KOTAKBANK.NS": ("KOTAKBANK.NS", "Kotak Mahindra Bank Ltd", "Banking & Finance", "High CASA ratio and fortress balance sheet;Low net NPA profile", "Leadership transition and RBI compliance audits"),
        "ULTRATECHC.NS": ("ULTRACEMCO.NS", "UltraTech Cement Ltd", "Infrastructure & Capital Goods", "Largest cement manufacturer in India with rapid pan-India capacity expansion", "Energy and petcoke freight cost spikes"),
        "ITC.NS": ("ITC.NS", "ITC Ltd", "FMCG & Consumer Goods", "Near-monopoly cigarette cash generator powering FMCG & hotel demergers;High dividend yield", "Tobacco taxation risks and long FMCG margin gestation"),
        "NTPC.NS": ("NTPC.NS", "NTPC Ltd", "Power & Green Energy", "India's largest thermal power producer ramping up gigawatt green energy pipeline", "Coal linkage logistics and transition capex burden"),
        "HCLTECHNOL.NS": ("HCLTECH.NS", "HCL Technologies Ltd", "Information Technology", "Strong engineering R&D and proprietary software product portfolio;Resilient margins", "High attrition and client concentration in telecommunications"),
        "OILNATURAL.NS": ("ONGC.NS", "Oil & Natural Gas Corporation Ltd", "Oil, Gas & Energy", "Dominant upstream crude and gas producer;High dividend yield and sovereign backing", "Windfall taxes and crude price cyclicality"),
        "JSWSTEEL.NS": ("JSWSTEEL.NS", "JSW Steel Ltd", "Metals & Mining", "Cost-efficient steel mills with rapid domestic brownfield capacity additions", "Global steel dumping from China and raw material coking coal price shifts"),
        "BAJAJFINSE.NS": ("BAJAJFINSV.NS", "Bajaj Finserv Ltd", "Banking & Finance", "Holding company over consumer finance, life insurance, and general insurance leaders", "Regulatory tightening in credit insurance commissions"),
        "BHARATELEC.NS": ("BEL.NS", "Bharat Electronics Ltd", "Defense & Aerospace", "Dominant electronics supplier for Indian military;Government indigenization push", "Single client (Ministry of Defence) order release timelines"),
        "BAJAJAUTO.NS": ("BAJAJ-AUTO.NS", "Bajaj Auto Ltd", "Automobile", "Global export footprint in two-wheelers and three-wheelers;High EV Chetak momentum", "Foreign exchange constraints in emerging export markets (Africa, LATAM)"),
        "NESTLE.NS": ("NESTLEIND.NS", "Nestle India Ltd", "FMCG & Consumer Goods", "Unrivaled brand equity with Maggi, Nescafe and Cerelac;High return on capital", "Raw cocoa, milk and agricultural commodity cost inflation"),
        "ETERNAL.NS": ("ZOMATO.NS", "Zomato Ltd (Eternal)", "Technology & Internet", "Blinkit quick-commerce hyper-growth and restaurant delivery duopoly;Turned net profitable", "Intense quick-commerce dark store wars with Zepto and Swiggy"),
        "POWERGRIDC.NS": ("POWERGRID.NS", "Power Grid Corporation of India", "Power & Green Energy", "Monopoly interstate power transmission grid;Guaranteed return on equity model", "Grid integration challenges with intermittent renewable projects"),
        "COALINDIA.NS": ("COALINDIA.NS", "Coal India Ltd", "Metals & Mining", "Monopoly coal miner supplying ~70% of India's electricity generation;Huge dividends", "Environmental carbon phase-down targets and wage negotiations"),
        "ASIANPAINT.NS": ("ASIANPAINT.NS", "Asian Paints Ltd", "FMCG & Consumer Goods", "Dominant decorative paint distribution network with vast dealer tints;High ROCE", "New competitive entrants (Birla Opus) putting pressure on market share"),
        "SHRIRAMFIN.NS": ("SHRIRAMFIN.NS", "Shriram Finance Ltd", "Banking & Finance", "Leading pre-owned commercial vehicle financier;High net interest margins", "Sensitivity to diesel fuel prices and small fleet operator distress"),
        "TATASTEEL.NS": ("TATASTEEL.NS", "Tata Steel Ltd", "Metals & Mining", "Integrated low-cost iron ore mines in India;High value-added automotive flat products", "Loss-making European steel plants in UK and Netherlands"),
        "GRASIMINDU.NS": ("GRASIM.NS", "Grasim Industries Ltd", "Infrastructure & Capital Goods", "Viscose staple fiber global leader and aggressive paints venture Birla Opus", "High capital expenditure in new paints venture with upfront marketing drag"),
        "HINDALCOIN.NS": ("HINDALCO.NS", "Hindalco Industries Ltd", "Metals & Mining", "Novelis subsidiary leadership in beverage cans;Low-cost upstream aluminium smelters", "Recessionary automotive demand in North America affecting Novelis margins"),
        "EICHERMOTO.NS": ("EICHERMOT.NS", "Eicher Motors Ltd", "Automobile", "Iconic Royal Enfield brand premiumization and middleweight motorcycling dominance", "Competitive cruiser launches from Triumph and Harley-Davidson"),
        "INTERGLOBE.NS": ("INDIGO.NS", "InterGlobe Aviation Ltd (IndiGo)", "Aviation & Logistics", "Domestic airline monopoly with ~63% market share and lowest cost per seat-kilometer", "Aviation turbine fuel price volatility and Pratt & Whitney engine groundings"),
        "WIPRO.NS": ("WIPRO.NS", "Wipro Ltd", "Information Technology", "Enterprise cloud migrations and strategic consulting;Capco digital synergies", "Slower organic revenue growth than peers during technology downcycles"),
        "SBILIFEINS.NS": ("SBILIFE.NS", "SBI Life Insurance Company", "Banking & Finance", "Access to SBI's unmatched 22,000+ branch bancassurance distribution channel", "Surrender charge regulatory policy updates by IRDAI"),
        "JIOFINANCI.NS": ("JIOFIN.NS", "Jio Financial Services Ltd", "Banking & Finance", "Massive digital data distribution scale and BlackRock AMC joint venture", "Early stage rollout with nascent credit balance sheet track record"),
        "TECHMAHIND.NS": ("TECHM.NS", "Tech Mahindra Ltd", "Information Technology", "Core telecom 5G engineering focus and enterprise turnaround strategy", "Subdued capital expenditure by global telecom network carriers"),
        "TRENT.NS": ("TRENT.NS", "Trent Ltd", "FMCG & Consumer Goods", "Zudio fast-fashion phenomenon driving stellar same-store sales growth;Tata governance", "Aggressive store expansion carrying rental commitments during consumer slowdowns"),
        "APOLLOHOSP.NS": ("APOLLOHOSP.NS", "Apollo Hospitals Enterprise", "Pharmaceuticals & Healthcare", "Premier tertiary healthcare hospital chain and 24/7 digital pharmacy network", "Operating losses in Apollo 24/7 digital health platform"),
        "TATAMOTORS.NS": ("TATAMOTORS.NS", "Tata Motors Ltd", "Automobile", "Jaguar Land Rover premium turnaround;Domestic leader in passenger electric cars", "Geopolitical slowdown in European luxury vehicle sales and heavy debt history"),
        "HDFCLIFEIN.NS": ("HDFCLIFE.NS", "HDFC Life Insurance Company", "Banking & Finance", "Industry-leading product innovation in non-par and protection;HDFC brand trust", "High cost of acquisition in competitive agency channels"),
        "CIPLA.NS": ("CIPLA.NS", "Cipla Ltd", "Pharmaceuticals & Healthcare", "Market leader in respiratory medicine;Strong South Africa and domestic portfolio", "US generic drug price deflation and regulatory inspections"),
        "MAXHEALTHC.NS": ("MAXHEALTH.NS", "Max Healthcare Institute", "Pharmaceuticals & Healthcare", "High average revenue per occupied bed (ARPOB) in affluent urban centers (NCR, Mumbai)", "High capital cost of hospital brownfield bed additions"),
        "TATACONSUM.NS": ("TATACONSUM.NS", "Tata Consumer Products Ltd", "FMCG & Consumer Goods", "Tata Tea, Tata Salt, and fast-growing Sampann and Soulfull packaged food brands", "Intense FMCG competition and raw tea price commodity fluctuations"),
        "DRREDDYSLA.NS": ("DRREDDY.NS", "Dr. Reddy's Laboratories Ltd", "Pharmaceuticals & Healthcare", "Strong biosimilars pipeline and resilient global generic formulations", "Generic Revlimid cliff and regulatory compliance observations")
    }

    dhan_json_path = os.path.join(root_dir, 'nifty_50_dhan.json')
    dhan_items = []
    if os.path.exists(dhan_json_path):
        with open(dhan_json_path, 'r', encoding='utf-8') as f:
            dhan_items = json.load(f)

    for item in dhan_items:
        raw_sym = item.get("symbol")
        if raw_sym in dhan_mapping:
            clean_ticker, company_name, sector, pros_str, cons_str = dhan_mapping[raw_sym]
            ltp = float(item.get("price", 100.0))
            low_52w = float(item.get("low52w", ltp * 0.75))
            high_52w = float(item.get("high52w", ltp * 1.30))
            pe_val = float(item.get("peRatio", 24.5)) if item.get("peRatio") else 24.5
            mcap_val = parse_mcap(item.get("marketCap"))
            weight = float(item.get("weightPct", 2.0))

            catalog.append({
                "name": company_name,
                "amc": f"NSE: {clean_ticker}",
                "category": "Listed Stock",
                "risk_category": "High" if mcap_val > 100000 else "Very High",
                "expense_ratio": 0.0,
                "fund_rating": 5 if weight >= 2.5 or mcap_val > 300000 else 4,
                "aum": mcap_val,
                "fund_manager": "Board of Directors & Management",
                "manager_tenure": 8.5,
                "exit_load": "Nil (Equity delivery)",
                "lock_in_period": "None",
                "min_sip": 1.0,
                "min_lumpsum": ltp,
                "sharpe_ratio": round(random.uniform(1.2, 2.3), 2),
                "sortino_ratio": round(random.uniform(1.4, 2.8), 2),
                "alpha": round(random.uniform(1.5, 9.5), 1),
                "beta": round(random.uniform(0.75, 1.25), 2),
                "standard_deviation": round(random.uniform(13.0, 24.0), 1),
                "treynor_ratio": round(random.uniform(14.0, 28.0), 1),
                "upside_capture": round(random.uniform(92.0, 138.0), 1),
                "downside_capture": round(random.uniform(65.0, 95.0), 1),
                "portfolio_turnover": 0.0,
                "consistency_score": round(random.uniform(82.0, 98.0), 1),
                "drawdown": round(random.uniform(0.10, 0.22), 2),
                "benchmark_outperformance": round(random.uniform(1.0, 7.5), 1),
                "taxation": "Equity Stock: 15% STCG. 12.5% LTCG above INR 1.25 Lakh.",
                "pros": pros_str,
                "cons": cons_str,
                "target_benchmark": f"NIFTY {sector.upper().split('&')[0].strip()}",
                "initial_nav": ltp,
                "annual_return": round(random.uniform(0.12, 0.28), 3),
                "volatility": round(random.uniform(0.12, 0.22), 2),
                "ticker": clean_ticker,
                "pe_ratio": pe_val,
                "pb_ratio": round(random.uniform(2.1, 7.8), 1),
                "dividend_yield": round(random.uniform(0.6, 3.4), 2),
                "sector": sector,
                "high_52w": high_52w,
                "low_52w": low_52w,
                "is_stock": True
            })

    # 4. TOP NIFTY NEXT 50 & HIGH-MOMENTUM MIDCAP STOCKS
    midcaps_raw = [
        ("HAL.NS", "Hindustan Aeronautics Ltd", "Defense & Aerospace", 4581.70, 305000.0, 38.5, 5675.0, 3010.0, "Monopoly fighter jet and helicopter manufacturer;Surging defense exports"),
        ("VBL.NS", "Varun Beverages Ltd", "FMCG & Consumer Goods", 640.0, 208000.0, 68.2, 685.0, 410.0, "Key PepsiCo global bottler with rapid Africa and Indian territory expansion"),
        ("DMART.NS", "Avenue Supermarts Ltd (DMart)", "FMCG & Consumer Goods", 4650.0, 302000.0, 98.4, 5484.0, 3660.0, "Lowest cost grocery retailer with owned real estate store model"),
        ("POLYCAB.NS", "Polycab India Ltd", "Infrastructure & Capital Goods", 6850.0, 103000.0, 48.2, 7350.0, 4600.0, "Dominant market share in cables & wires benefitting from real estate upcycle"),
        ("DLF.NS", "DLF Ltd", "Real Estate", 860.0, 212000.0, 62.0, 967.0, 680.0, "Super-luxury residential pre-sales in NCR;Huge commercial rental portfolio"),
        ("MAZDOCK.NS", "Mazagon Dock Shipbuilders Ltd", "Defense & Aerospace", 4420.0, 89000.0, 34.5, 5860.0, 2100.0, "Submarine and stealth frigate construction backlog with Indian Navy"),
        ("PERSISTENT.NS", "Persistent Systems Ltd", "Information Technology", 5420.0, 83000.0, 52.1, 6150.0, 3600.0, "Leader in cloud and AI software engineering with double-digit growth"),
        ("COFORGE.NS", "Coforge Ltd", "Information Technology", 6980.0, 46000.0, 42.0, 7800.0, 4400.0, "Deep domain expertise in travel, transportation and insurance IT"),
        ("SUZLON.NS", "Suzlon Energy Ltd", "Power & Green Energy", 82.0, 111000.0, 65.4, 86.0, 38.0, "Turnaround story with debt-free balance sheet;Surging wind turbine orderbook"),
        ("RVNL.NS", "Rail Vikas Nigam Ltd", "Infrastructure & Capital Goods", 580.0, 121000.0, 54.0, 647.0, 210.0, "Ministry of Railways turnkey infrastructure delivery with high execution rate"),
        ("IRFC.NS", "Indian Railway Finance Corporation", "Banking & Finance", 178.0, 232000.0, 32.5, 229.0, 125.0, "Pure sovereign railway asset financing with near-zero non-performing assets"),
        ("BHEL.NS", "Bharat Heavy Electricals Ltd", "Infrastructure & Capital Goods", 310.0, 107000.0, 95.0, 335.0, 185.0, "Thermal power plant turbine revival and Vande Bharat train manufacturing"),
        ("CGPOWER.NS", "CG Power & Industrial Solutions", "Infrastructure & Capital Goods", 740.0, 113000.0, 72.0, 790.0, 430.0, "High-voltage industrial motors and upcoming semiconductor packaging plant"),
        ("TVSMOTOR.NS", "TVS Motor Company Ltd", "Automobile", 3792.0, 180000.0, 58.0, 3950.0, 2100.0, "Rapid market share gain in premium two-wheelers and EV scooters"),
        ("MUTHOOTFIN.NS", "Muthoot Finance Ltd", "Banking & Finance", 3079.0, 120000.0, 18.5, 3200.0, 1380.0, "India's largest gold loan NBFC benefitting from soaring gold collateral value"),
        ("DIXON.NS", "Dixon Technologies India", "Infrastructure & Capital Goods", 12400.0, 74000.0, 92.0, 13900.0, 5800.0, "Primary electronics manufacturing services player for global smartphone brands"),
        ("PIDILITIND.NS", "Pidilite Industries Ltd", "FMCG & Consumer Goods", 3120.0, 158000.0, 74.0, 3300.0, 2500.0, "Unchallenged consumer monopoly in adhesives (Fevicol) and construction chemicals"),
        ("HINDZINC.NS", "Hindustan Zinc Ltd", "Metals & Mining", 534.4, 225000.0, 24.5, 807.0, 285.0, "World's second-largest zinc producer with top-tier cost of production"),
        ("PAYTM.NS", "One97 Communications (Paytm)", "Technology & Internet", 720.0, 45000.0, 35.0, 950.0, 310.0, "Massive merchant soundbox deployment base and core payments turnaround"),
        ("CONCOR.NS", "Container Corporation of India", "Aviation & Logistics", 980.0, 59000.0, 38.0, 1180.0, 790.0, "Dominant multimodal container logistics network connected to dedicated freight corridor"),
        ("CUMMINSIND.NS", "Cummins India Ltd", "Infrastructure & Capital Goods", 3890.0, 107000.0, 54.0, 4150.0, 2200.0, "Leading manufacturer of industrial power gensets and green hydrogen electrolyzers"),
        ("DABUR.NS", "Dabur India Ltd", "FMCG & Consumer Goods", 610.0, 108000.0, 46.0, 672.0, 490.0, "Ayurvedic and natural healthcare product leader with deep rural brand trust"),
        ("GODREJCP.NS", "Godrej Consumer Products", "FMCG & Consumer Goods", 1480.0, 151000.0, 56.0, 1530.0, 1100.0, "Market leader in household insecticides and personal wash across India & Indonesia"),
        ("HAVELLS.NS", "Havells India Ltd", "FMCG & Consumer Goods", 1920.0, 120000.0, 68.0, 2100.0, 1300.0, "Fast-moving electrical goods powerhouse across wires, switches and Lloyd cooling"),
        ("INDIHOTEL.NS", "Indian Hotels Company Ltd", "FMCG & Consumer Goods", 680.0, 96000.0, 64.0, 720.0, 420.0, "Taj brand luxury hospitality leader riding record domestic leisure & corporate tourism"),
        ("IOC.NS", "Indian Oil Corporation Ltd", "Oil, Gas & Energy", 175.0, 247000.0, 8.2, 196.0, 118.0, "India's largest petroleum refiner and fuel marketing network;High dividend payout"),
        ("IRCTC.NS", "Indian Railway Catering & Tourism", "Aviation & Logistics", 940.0, 75000.0, 58.0, 1140.0, 760.0, "Exclusive online ticketing and catering monopoly for Indian Railways"),
        ("JSWENERGY.NS", "JSW Energy Ltd", "Power & Green Energy", 740.0, 129000.0, 58.0, 785.0, 420.0, "Rapidly scaling green energy independent power producer with storage projects"),
        ("LTIM.NS", "LTIMindtree Ltd", "Information Technology", 5890.0, 174000.0, 34.0, 6450.0, 4500.0, "Tier-1 IT services provider with strong presence in banking and insurance domains"),
        ("LUPIN.NS", "Lupin Ltd", "Pharmaceuticals & Healthcare", 2180.0, 99000.0, 36.0, 2300.0, 1250.0, "Leading global producer of generic anti-TB, cardiovascular and respiratory formulations"),
        ("MPHASIS.NS", "Mphasis Ltd", "Information Technology", 3120.0, 58000.0, 32.0, 3350.0, 2150.0, "Specialized IT solutions provider with concentrated banking & financial services deals"),
        ("MRF.NS", "MRF Ltd", "Automobile", 138000.0, 58000.0, 28.0, 151000.0, 115000.0, "Highest-priced Indian stock with gold-standard tyre brand recall across all vehicles"),
        ("NAUKRI.NS", "Info Edge (India) Ltd (Naukri)", "Technology & Internet", 8250.0, 106000.0, 82.0, 8900.0, 4800.0, "Monopoly white-collar recruitment portal Naukri.com with early stakes in top unicorns"),
        ("PFC.NS", "Power Finance Corporation", "Banking & Finance", 520.0, 171000.0, 7.8, 580.0, 360.0, "Key lender to state electricity boards and renewable projects;Generous dividend yield"),
        ("RECLTD.NS", "REC Ltd", "Banking & Finance", 610.0, 160000.0, 8.4, 655.0, 410.0, "Infrastructure finance company powering transmission and distribution modernization"),
        ("SIEMENS.NS", "Siemens Ltd", "Infrastructure & Capital Goods", 7850.0, 279000.0, 85.0, 8200.0, 4400.0, "Global engineering giant driving factory automation, grid infrastructure and rail mobility"),
        ("TATAPOWER.NS", "Tata Power Company Ltd", "Power & Green Energy", 440.0, 140000.0, 36.0, 495.0, 310.0, "Pioneer in rooftop solar, EV charging networks, and renewable capacity buildout"),
        ("TORNTPOWER.NS", "Torrent Power Ltd", "Power & Green Energy", 1890.0, 90000.0, 38.0, 2050.0, 1100.0, "Highly efficient private power distribution licensee in Gujarat, Maharashtra and UP"),
        ("VEDL.NS", "Vedanta Ltd", "Metals & Mining", 460.0, 178000.0, 12.0, 525.0, 250.0, "Diversified natural resources conglomerate spanning zinc, aluminium, oil and power"),
        ("ZYDUSLIFE.NS", "Zydus Lifesciences Ltd", "Pharmaceuticals & Healthcare", 1180.0, 118000.0, 26.0, 1320.0, 750.0, "Formulation and API leader with high market share in US generic launches"),
        ("BANKBARODA.NS", "Bank of Baroda", "Banking & Finance", 260.0, 134000.0, 6.8, 298.0, 205.0, "Second-largest public sector bank with clean asset quality and rising retail book"),
        ("PNB.NS", "Punjab National Bank", "Banking & Finance", 124.0, 136000.0, 8.2, 142.0, 85.0, "Systemic public sector lender showing substantial reduction in gross NPAs"),
        ("CANBK.NS", "Canara Bank", "Banking & Finance", 112.0, 101000.0, 6.2, 128.0, 82.0, "Strong commercial credit growth and high return on equity among PSU banks"),
        ("IDFCFIRSTB.NS", "IDFC First Bank Ltd", "Banking & Finance", 78.0, 55000.0, 18.0, 92.0, 68.0, "Retail-focused private bank with high customer satisfaction and CASA growth"),
        ("FEDERALBNK.NS", "Federal Bank Ltd", "Banking & Finance", 195.0, 47000.0, 11.2, 215.0, 142.0, "Southern private lender with solid fintech partnerships and NRI remittance flow"),
        ("YESBANK.NS", "Yes Bank Ltd", "Banking & Finance", 24.5, 76000.0, 42.0, 32.8, 19.5, "Reconstructed private bank rebuilding its retail deposit franchise"),
        ("INDUSINDBK.NS", "IndusInd Bank Ltd", "Banking & Finance", 1380.0, 107000.0, 11.5, 1690.0, 1240.0, "Strong commercial vehicle lending and microfinance franchise"),
        ("DIVISLAB.NS", "Divi's Laboratories Ltd", "Pharmaceuticals & Healthcare", 5210.0, 138000.0, 72.0, 5800.0, 3400.0, "World leader in active pharmaceutical ingredients (APIs) and custom synthesis"),
        ("AUROPHARMA.NS", "Aurobindo Pharma Ltd", "Pharmaceuticals & Healthcare", 1480.0, 86000.0, 21.0, 1590.0, 940.0, "Extensive global generic portfolio with low manufacturing cost structure"),
        ("JUBLFOOD.NS", "Jubilant FoodWorks Ltd", "FMCG & Consumer Goods", 620.0, 40000.0, 95.0, 690.0, 420.0, "Domino's Pizza master franchisee and pioneer in food delivery technology"),
        ("BHARATFORG.NS", "Bharat Forge Ltd", "Infrastructure & Capital Goods", 1580.0, 73000.0, 44.0, 1820.0, 1050.0, "Global leader in automotive forgings and rapidly growing artillery defense maker"),
        ("APOLOTYRE.NS", "Apollo Tyres Ltd", "Automobile", 510.0, 32000.0, 18.0, 585.0, 440.0, "Strong presence in Indian commercial vehicle tyres and European passenger cars"),
        ("ASHOKLEY.NS", "Ashok Leyland Ltd", "Automobile", 245.0, 72000.0, 24.0, 264.0, 165.0, "Flagship Hinduja group company holding second spot in Indian medium/heavy trucks"),
        ("CHOLAFIN.NS", "Cholamandalam Investment & Finance", "Banking & Finance", 1420.0, 119000.0, 32.0, 1650.0, 1050.0, "Premier vehicle and home loan non-bank lender with low bad debts"),
        ("AMBUJACEM.NS", "Ambuja Cements Ltd", "Infrastructure & Capital Goods", 640.0, 157000.0, 45.0, 706.0, 490.0, "Adani group cement arm with massive logistics and brownfield expansion plans"),
        ("NMDC.NS", "NMDC Ltd", "Metals & Mining", 245.0, 71000.0, 12.0, 286.0, 175.0, "India's largest iron ore miner with low extraction costs and high dividends"),
        ("SAIL.NS", "Steel Authority of India Ltd", "Metals & Mining", 148.0, 61000.0, 22.0, 175.0, 110.0, "Major public sector steel maker supplying rails and plates for national infrastructure"),
        ("GAIL.NS", "GAIL (India) Ltd", "Oil, Gas & Energy", 230.0, 151000.0, 14.0, 246.0, 155.0, "Monopoly natural gas pipeline operator driving India's gas-based economy transition")
    ]

    for sym, name, sector, price, mcap, pe, high, low, pros in midcaps_raw:
        catalog.append({
            "name": name,
            "amc": f"NSE: {sym}",
            "category": "Listed Stock",
            "risk_category": "High" if mcap > 100000 else "Very High",
            "expense_ratio": 0.0,
            "fund_rating": 5 if mcap > 150000 else 4,
            "aum": mcap,
            "fund_manager": "Board of Directors & Management",
            "manager_tenure": 7.0,
            "exit_load": "Nil (Equity delivery)",
            "lock_in_period": "None",
            "min_sip": 1.0,
            "min_lumpsum": price,
            "sharpe_ratio": round(random.uniform(1.2, 2.2), 2),
            "sortino_ratio": round(random.uniform(1.4, 2.6), 2),
            "alpha": round(random.uniform(2.0, 11.0), 1),
            "beta": round(random.uniform(0.8, 1.3), 2),
            "standard_deviation": round(random.uniform(14.0, 26.0), 1),
            "treynor_ratio": round(random.uniform(14.0, 28.0), 1),
            "upside_capture": round(random.uniform(90.0, 140.0), 1),
            "downside_capture": round(random.uniform(65.0, 95.0), 1),
            "portfolio_turnover": 0.0,
            "consistency_score": round(random.uniform(80.0, 96.0), 1),
            "drawdown": round(random.uniform(0.12, 0.25), 2),
            "benchmark_outperformance": round(random.uniform(1.5, 8.0), 1),
            "taxation": "Equity Stock: 15% STCG. 12.5% LTCG above INR 1.25 Lakh.",
            "pros": pros,
            "cons": "Exposed to broader market cycles and interest rate shifts",
            "target_benchmark": f"NIFTY {sector.upper().split('&')[0].strip()}",
            "initial_nav": price,
            "annual_return": round(random.uniform(0.14, 0.32), 3),
            "volatility": round(random.uniform(0.14, 0.25), 2),
            "ticker": sym,
            "pe_ratio": pe,
            "pb_ratio": round(random.uniform(2.5, 8.5), 1),
            "dividend_yield": round(random.uniform(0.5, 3.2), 2),
            "sector": sector,
            "high_52w": high,
            "low_52w": low,
            "is_stock": True
        })

    return catalog

def seed_db():
    print("Connecting to database and executing full market asset seeding...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding default investor profile...")
        demo_user = User(
            email="demo@wealthcraft.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Demo Investor",
            is_active=True,
            is_superuser=False,
            age=32,
            income=1800000.0,
            occupation="Software Engineer",
            monthly_savings=50000.0,
            current_investments=350000.0,
            investment_goal="Wealth Creation",
            investment_horizon="10 Years",
            risk_appetite="High",
            preferred_categories="Large Cap,Mid Cap,Small Cap,Flexi Cap,Listed Stock,ETF",
            liquidity_needs="Low",
            sip_amount=15000.0,
            lumpsum_amount=50000.0,
            risk_score=75.0,
            diversification_score=65.0
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        master_catalog = get_master_market_catalog()
        print(f"Seeding total of {len(master_catalog)} master market assets into SQLite...")
        
        today = datetime.utcnow().date()
        start_date = today - timedelta(weeks=52)

        for temp in master_catalog:
            fund = MutualFund(
                name=temp["name"],
                amc=temp["amc"],
                category=temp["category"],
                risk_category=temp["risk_category"],
                expense_ratio=temp["expense_ratio"],
                fund_rating=temp["fund_rating"],
                aum=temp["aum"],
                fund_manager=temp["fund_manager"],
                manager_tenure=temp["manager_tenure"],
                exit_load=temp["exit_load"],
                lock_in_period=temp["lock_in_period"],
                min_sip=temp["min_sip"],
                min_lumpsum=temp["min_lumpsum"],
                sharpe_ratio=temp["sharpe_ratio"],
                sortino_ratio=temp["sortino_ratio"],
                alpha=temp["alpha"],
                beta=temp["beta"],
                standard_deviation=temp["standard_deviation"],
                treynor_ratio=temp["treynor_ratio"],
                upside_capture=temp["upside_capture"],
                downside_capture=temp["downside_capture"],
                portfolio_turnover=temp["portfolio_turnover"],
                consistency_score=temp["consistency_score"],
                drawdown=temp["drawdown"],
                benchmark_outperformance=temp["benchmark_outperformance"],
                taxation=temp["taxation"],
                pros=temp["pros"],
                cons=temp["cons"],
                target_benchmark=temp["target_benchmark"],
                morningstar_rating=temp.get("fund_rating", 4),
                crisil_rating=temp.get("fund_rating", 4),
                ticker=temp.get("ticker", None),
                pe_ratio=temp.get("pe_ratio", None),
                pb_ratio=temp.get("pb_ratio", None),
                dividend_yield=temp.get("dividend_yield", None),
                sector=temp.get("sector", None),
                high_52w=temp.get("high_52w", None),
                low_52w=temp.get("low_52w", None)
            )
            db.add(fund)
            db.commit()
            db.refresh(fund)
            
            nav_values = []
            
            if temp.get("is_stock") and temp.get("high_52w") and temp.get("low_52w"):
                calibrated_prices = generate_calibrated_52w_history(temp["initial_nav"], temp["low_52w"], temp["high_52w"])
                for w in range(53):
                    date = start_date + timedelta(weeks=w)
                    nav_values.append(NAVHistory(fund_id=fund.id, date=date, nav=calibrated_prices[w]))
            else:
                cur_price = temp["initial_nav"]
                for w in range(53):
                    date = start_date + timedelta(weeks=w)
                    growth = (temp["annual_return"] - 0.5 * temp["volatility"]**2) * (1.0/52.0) + temp["volatility"] * random.normalvariate(0, 1) * (1.0/52.0)**0.5
                    cur_price = max(1.0, cur_price * math.exp(growth))
                    nav_values.append(NAVHistory(fund_id=fund.id, date=date, nav=round(cur_price, 2)))
                
            db.bulk_save_objects(nav_values)
            db.commit()
            
        print(f"Successfully seeded ALL {len(master_catalog)} stocks, mutual funds, and ETFs!")
    except Exception as e:
        print(f"Error seeding market catalog: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
