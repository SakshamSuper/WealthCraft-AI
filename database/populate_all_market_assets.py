import os
import sys
from datetime import datetime, timedelta
import random
import math

# Add backend directory to PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base, engine, SessionLocal
from app.models.models import MutualFund, NAVHistory, User
from app.core.security import get_password_hash

def get_master_market_catalog():
    catalog = []

    # 1. MUTUAL FUNDS CATALOG (100+ Mutual Funds across all AMCs & Categories)
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
            "ticker": None
        })

    # 2. ETFS CATALOG (35+ Exchange Traded Funds)
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
            "ticker": sym
        })

    # 3. LISTED STOCKS CATALOG (120+ Nifty 500 & Midcap Equities)
    stocks_raw = [
        ("RELIANCE.NS", "Reliance Industries Ltd", "Energy", 2980.0, 1950000.0),
        ("TCS.NS", "Tata Consultancy Services Ltd", "IT", 4250.0, 1420000.0),
        ("HDFCBANK.NS", "HDFC Bank Ltd", "Banking", 1640.0, 1280000.0),
        ("ICICIBANK.NS", "ICICI Bank Ltd", "Banking", 1210.0, 840000.0),
        ("BHARTIARTL.NS", "Bharti Airtel Ltd", "Telecom", 1580.0, 890000.0),
        ("INFY.NS", "Infosys Ltd", "IT", 1820.0, 760000.0),
        ("SBIN.NS", "State Bank of India", "Banking", 840.0, 720000.0),
        ("LTC.NS", "ITC Ltd", "FMCG", 490.0, 610000.0),
        ("LT.NS", "Larsen & Toubro Ltd", "Infrastructure", 3650.0, 510000.0),
        ("KOTAKBANK.NS", "Kotak Mahindra Bank Ltd", "Banking", 1780.0, 350000.0),
        ("AXISBANK.NS", "Axis Bank Ltd", "Banking", 1258.0, 391000.0),
        ("BAJFINANCE.NS", "Bajaj Finance Ltd", "Finance", 7250.0, 420000.0),
        ("HCLTECH.NS", "HCL Technologies Ltd", "IT", 1780.0, 480000.0),
        ("MARUTI.NS", "Maruti Suzuki India Ltd", "Auto", 12400.0, 390000.0),
        ("SUNPHARMA.NS", "Sun Pharmaceutical Industries", "Pharma", 1890.0, 450000.0),
        ("NTPC.NS", "NTPC Ltd", "Power", 412.0, 399000.0),
        ("POWERGRID.NS", "Power Grid Corporation of India", "Power", 345.0, 320000.0),
        ("TATAMOTORS.NS", "Tata Motors Ltd", "Auto", 980.0, 340000.0),
        ("TATASTEEL.NS", "Tata Steel Ltd", "Metals", 168.0, 210000.0),
        ("ASIANPAINT.NS", "Asian Paints Ltd", "Consumer", 2890.0, 277000.0),
        ("TITAN.NS", "Titan Company Ltd", "Consumer", 3480.0, 308000.0),
        ("ULTRACEMCO.NS", "UltraTech Cement Ltd", "Cement", 11200.0, 323000.0),
        ("COALINDIA.NS", "Coal India Ltd", "Mining", 485.0, 298000.0),
        ("M&M.NS", "Mahindra & Mahindra Ltd", "Auto", 3120.0, 387000.0),
        ("BAJAJFINSV.NS", "Bajaj Finserv Ltd", "Financial Services", 1900.0, 302000.0),
        ("HINDALCO.NS", "Hindalco Industries Ltd", "Metals", 685.0, 153000.0),
        ("GRASIM.NS", "Grasim Industries Ltd", "Materials", 2680.0, 178000.0),
        ("NESTLEIND.NS", "Nestle India Ltd", "FMCG", 2520.0, 243000.0),
        ("TECHM.NS", "Tech Mahindra Ltd", "IT", 1620.0, 158000.0),
        ("INDUSINDBK.NS", "IndusInd Bank Ltd", "Banking", 1380.0, 107000.0),
        ("ADANIPORTS.NS", "Adani Ports & Special Economic Zone", "Infrastructure", 1480.0, 319000.0),
        ("ADANIENT.NS", "Adani Enterprises Ltd", "Conglomerate", 3120.0, 355000.0),
        ("EICHERMOT.NS", "Eicher Motors Ltd", "Auto", 4890.0, 134000.0),
        ("CIPLA.NS", "Cipla Ltd", "Pharma", 1580.0, 127000.0),
        ("DRREDDY.NS", "Dr. Reddy's Laboratories Ltd", "Pharma", 6840.0, 114000.0),
        ("BAJAJ-AUTO.NS", "Bajaj Auto Ltd", "Auto", 9850.0, 276000.0),
        ("DIVISLAB.NS", "Divi's Laboratories Ltd", "Pharma", 5210.0, 138000.0),
        ("HEROMOTOCO.NS", "Hero MotoCorp Ltd", "Auto", 5480.0, 109000.0),
        ("APOLLOHOSP.NS", "Apollo Hospitals Enterprise", "Healthcare", 6950.0, 99000.0),
        ("SBILIFE.NS", "SBI Life Insurance Company", "Insurance", 1820.0, 182000.0),
        ("HDFCLIFE.NS", "HDFC Life Insurance Company", "Insurance", 740.0, 159000.0),
        ("BRITANNIA.NS", "Britannia Industries Ltd", "FMCG", 5890.0, 141000.0),
        ("TRENT.NS", "Trent Ltd", "Retail", 7120.0, 280000.0),
        ("ZOMATO.NS", "Zomato Ltd", "Tech", 265.0, 240000.0),
        ("JIOFIN.NS", "Jio Financial Services Ltd", "Finance", 345.0, 219000.0),
        ("PAYTM.NS", "One97 Communications (Paytm)", "Tech", 720.0, 45000.0),
        ("VBL.NS", "Varun Beverages Ltd", "FMCG", 640.0, 208000.0),
        ("DLF.NS", "DLF Ltd", "Real Estate", 860.0, 212000.0),
        ("BEL.NS", "Bharat Electronics Ltd", "Defense", 295.0, 215000.0),
        ("HAL.NS", "Hindustan Aeronautics Ltd", "Defense", 4581.70, 305000.0),
        ("MAZDOCK.NS", "Mazagon Dock Shipbuilders Ltd", "Defense", 4420.0, 89000.0),
        ("POLYCAB.NS", "Polycab India Ltd", "Cables", 6850.0, 103000.0),
        ("PERSISTENT.NS", "Persistent Systems Ltd", "IT", 5420.0, 83000.0),
        ("COFORGE.NS", "Coforge Ltd", "IT", 6980.0, 46000.0),
        ("TVSMOTOR.NS", "TVS Motor Company Ltd", "Auto", 3792.0, 180000.0),
        ("MUTHOOTFIN.NS", "Muthoot Finance Ltd", "Finance", 3079.0, 120000.0),
        ("SHRIRAMFIN.NS", "Shriram Finance Ltd", "Finance", 1061.5, 142000.0),
        ("HINDZINC.NS", "Hindustan Zinc Ltd", "Metals", 534.4, 225000.0),
        ("ABB.NS", "ABB India Ltd", "Capital Goods", 8120.0, 172000.0),
        ("ADANIENSOL.NS", "Adani Energy Solutions", "Power", 1040.0, 116000.0),
        ("ADANIGREEN.NS", "Adani Green Energy Ltd", "Power", 1780.0, 281000.0),
        ("ADANIPOWER.NS", "Adani Power Ltd", "Power", 670.0, 258000.0),
        ("AMBUJACEM.NS", "Ambuja Cements Ltd", "Cement", 640.0, 157000.0),
        ("APOLOTYRE.NS", "Apollo Tyres Ltd", "Auto Ancillary", 510.0, 32000.0),
        ("ASHOKLEY.NS", "Ashok Leyland Ltd", "Auto", 245.0, 72000.0),
        ("AUROPHARMA.NS", "Aurobindo Pharma Ltd", "Pharma", 1480.0, 86000.0),
        ("BANKBARODA.NS", "Bank of Baroda", "Banking", 260.0, 134000.0),
        ("BHARATFORG.NS", "Bharat Forge Ltd", "Industrial", 1580.0, 73000.0),
        ("BHEL.NS", "Bharat Heavy Electricals Ltd", "Capital Goods", 310.0, 107000.0),
        ("CANBK.NS", "Canara Bank", "Banking", 112.0, 101000.0),
        ("CGPOWER.NS", "CG Power & Industrial Solutions", "Capital Goods", 740.0, 113000.0),
        ("CHOLAFIN.NS", "Cholamandalam Investment & Fin", "Finance", 1420.0, 119000.0),
        ("CONCOR.NS", "Container Corporation of India", "Logistics", 980.0, 59000.0),
        ("CUMMINSIND.NS", "Cummins India Ltd", "Capital Goods", 3890.0, 107000.0),
        ("DABUR.NS", "Dabur India Ltd", "FMCG", 610.0, 108000.0),
        ("DIXON.NS", "Dixon Technologies India", "Electronics", 12400.0, 74000.0),
        ("DMART.NS", "Avenue Supermarts Ltd (DMart)", "Retail", 4650.0, 302000.0),
        ("FEDERALBNK.NS", "Federal Bank Ltd", "Banking", 195.0, 47000.0),
        ("GAIL.NS", "GAIL (India) Ltd", "Energy", 230.0, 151000.0),
        ("GODREJCP.NS", "Godrej Consumer Products", "FMCG", 1480.0, 151000.0),
        ("HAVELLS.NS", "Havells India Ltd", "Consumer Durables", 1920.0, 120000.0),
        ("IDFCFIRSTB.NS", "IDFC First Bank Ltd", "Banking", 78.0, 55000.0),
        ("INDIHOTEL.NS", "Indian Hotels Company Ltd", "Hospitality", 680.0, 96000.0),
        ("IOC.NS", "Indian Oil Corporation Ltd", "Energy", 175.0, 247000.0),
        ("IRCTC.NS", "Indian Railway Catering & Tourism", "Logistics", 940.0, 75000.0),
        ("IRFC.NS", "Indian Railway Finance Corporation", "Finance", 178.0, 232000.0),
        ("INDIGO.NS", "InterGlobe Aviation (IndiGo)", "Aviation", 4850.0, 187000.0),
        ("JINDALSTEL.NS", "Jindal Steel & Power Ltd", "Metals", 980.0, 100000.0),
        ("JSWENERGY.NS", "JSW Energy Ltd", "Power", 740.0, 129000.0),
        ("JSWSTEEL.NS", "JSW Steel Ltd", "Metals", 940.0, 229000.0),
        ("JUBLFOOD.NS", "Jubilant FoodWorks Ltd", "QSR", 620.0, 40000.0),
        ("LTIM.NS", "LTIMindtree Ltd", "IT", 5890.0, 174000.0),
        ("LUPIN.NS", "Lupin Ltd", "Pharma", 2180.0, 99000.0),
        ("MAXHEALTH.NS", "Max Healthcare Institute", "Healthcare", 980.0, 95000.0),
        ("MPHASIS.NS", "Mphasis Ltd", "IT", 3120.0, 58000.0),
        ("MRF.NS", "MRF Ltd", "Auto Ancillary", 138000.0, 58000.0),
        ("NAUKRI.NS", "Info Edge (India) Ltd (Naukri)", "Tech", 8250.0, 106000.0),
        ("NHPC.NS", "NHPC Ltd", "Power", 102.0, 102000.0),
        ("NMDC.NS", "NMDC Ltd", "Mining", 245.0, 71000.0),
        ("ONGC.NS", "Oil & Natural Gas Corporation", "Energy", 325.0, 408000.0),
        ("PFC.NS", "Power Finance Corporation", "Finance", 520.0, 171000.0),
        ("PIDILITIND.NS", "Pidilite Industries Ltd", "Chemicals", 3120.0, 158000.0),
        ("PNB.NS", "Punjab National Bank", "Banking", 124.0, 136000.0),
        ("RECLTD.NS", "REC Ltd", "Finance", 610.0, 160000.0),
        ("RVNL.NS", "Rail Vikas Nigam Ltd", "Infrastructure", 580.0, 121000.0),
        ("SAIL.NS", "Steel Authority of India Ltd", "Metals", 148.0, 61000.0),
        ("SIEMENS.NS", "Siemens Ltd", "Capital Goods", 7850.0, 279000.0),
        ("SUZLON.NS", "Suzlon Energy Ltd", "Renewables", 82.0, 111000.0),
        ("TATACONSUM.NS", "Tata Consumer Products", "FMCG", 1180.0, 115000.0),
        ("TATAPOWER.NS", "Tata Power Company Ltd", "Power", 440.0, 140000.0),
        ("TORNTPOWER.NS", "Torrent Power Ltd", "Power", 1890.0, 90000.0),
        ("VEDL.NS", "Vedanta Ltd", "Mining", 460.0, 178000.0),
        ("WIPRO.NS", "Wipro Ltd", "IT", 540.0, 282000.0),
        ("YESBANK.NS", "Yes Bank Ltd", "Banking", 24.5, 76000.0),
        ("ZYDUSLIFE.NS", "Zydus Lifesciences Ltd", "Pharma", 1180.0, 118000.0)
    ]

    for sym, name, cat, price, mcap in stocks_raw:
        catalog.append({
            "name": name,
            "amc": f"NSE: {sym}",
            "category": "Listed Stock",
            "risk_category": "Very High" if mcap < 50000 else "High",
            "expense_ratio": 0.0,
            "fund_rating": 5 if mcap > 200000 else 4,
            "aum": mcap / 10.0,
            "fund_manager": "CEO / Board",
            "manager_tenure": 6.5,
            "exit_load": "Nil",
            "lock_in_period": "None",
            "min_sip": 1.0,
            "min_lumpsum": price,
            "sharpe_ratio": round(random.uniform(1.1, 2.2), 2),
            "sortino_ratio": round(random.uniform(1.3, 2.7), 2),
            "alpha": round(random.uniform(1.5, 9.5), 1),
            "beta": round(random.uniform(0.75, 1.25), 2),
            "standard_deviation": round(random.uniform(12.0, 24.0), 1),
            "treynor_ratio": round(random.uniform(14.0, 28.0), 1),
            "upside_capture": round(random.uniform(90.0, 140.0), 1),
            "downside_capture": round(random.uniform(65.0, 95.0), 1),
            "portfolio_turnover": 0.0,
            "consistency_score": round(random.uniform(80.0, 98.0), 1),
            "drawdown": round(random.uniform(0.10, 0.22), 2),
            "benchmark_outperformance": round(random.uniform(1.0, 7.0), 1),
            "taxation": "Equity Stock: 15% STCG. 12.5% LTCG.",
            "pros": f"Market leader in {cat};Strong institutional backing",
            "cons": "Exposed to broader market cycles",
            "target_benchmark": f"NIFTY {cat.upper()}",
            "initial_nav": price,
            "annual_return": round(random.uniform(0.12, 0.28), 3),
            "volatility": round(random.uniform(0.12, 0.22), 2),
            "ticker": sym
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
                ticker=temp.get("ticker", None)
            )
            db.add(fund)
            db.commit()
            db.refresh(fund)
            
            # 52 weeks historical pricing for charts
            nav_values = []
            cur_price = temp["initial_nav"]
            today = datetime.utcnow().date()
            start_date = today - timedelta(weeks=52)
            
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
