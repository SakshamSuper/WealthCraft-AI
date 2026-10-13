from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas
from app.api import deps
from app.services.calculators import calculate_xirr
from agents.orchestrator import AgentOrchestrator
from app.models.models import NAVHistory, MutualFund, User
from typing import List, Any
from datetime import datetime, date
from sqlalchemy import desc
import requests

router = APIRouter()

@router.get("/")
def read_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current portfolio summary including current value, absolute returns, CAGR, XIRR, and asset allocation.
    """
    items = crud.get_user_portfolios(db, user_id=current_user.id)
    if not items:
        return {
            "items": [],
            "total_invested": 0.0,
            "current_value": 0.0,
            "absolute_return": 0.0,
            "absolute_return_pct": 0.0,
            "xirr": 0.0,
            "allocation": {}
        }
        
    portfolio_responses = []
    total_invested = 0.0
    total_current_value = 0.0
    cash_flows = []
    allocation = {}
    
    today = date.today()
    
    for item in items:
        fund = crud.get_mutual_fund_by_id(db, fund_id=item.fund_id)
        if not fund:
            continue
            
        # Get latest NAV
        latest_history = db.query(NAVHistory).filter(NAVHistory.fund_id == fund.id).order_by(desc(NAVHistory.date)).first()
        current_nav = latest_history.nav if latest_history else item.purchase_price
        
        invested = item.units * item.purchase_price
        current_val = item.units * current_nav
        
        total_invested += invested
        total_current_value += current_val
        
        abs_return = current_val - invested
        abs_return_pct = (abs_return / invested * 100.0) if invested > 0 else 0.0
        
        # Calculate CAGR for this specific asset
        holding_days = (today - item.purchase_date).days
        years = holding_days / 365.25
        
        if years > 0.05 and invested > 0: # > 18 days holding
            try:
                cagr = (math.pow(current_val / invested, 1.0 / years) - 1.0) * 100.0
            except:
                cagr = abs_return_pct
        else:
            cagr = abs_return_pct
            
        # Record cash flows for overall/individual XIRR
        # Purchases are negative (money leaving investor's wallet)
        cash_flows.append((item.purchase_date, -invested))
        
        # Sector/Category allocation sum
        cat = fund.category
        allocation[cat] = allocation.get(cat, 0.0) + current_val
        
        portfolio_responses.append({
            "id": item.id,
            "fund_id": fund.id,
            "fund_name": fund.name,
            "fund_category": fund.category,
            "units": item.units,
            "purchase_price": item.purchase_price,
            "purchase_date": item.purchase_date,
            "current_nav": round(current_nav, 2),
            "current_value": round(current_val, 2),
            "absolute_return": round(abs_return, 2),
            "absolute_return_pct": round(abs_return_pct, 2),
            "cagr": round(cagr, 2),
            "xirr": round(cagr, 2) # proxy for single transaction
        })
        
    # Append final positive cash flow of today's total portfolio valuation
    cash_flows.append((today, total_current_value))
    
    # Calculate overall XIRR
    overall_xirr = 0.0
    try:
        overall_xirr = calculate_xirr(cash_flows)
    except Exception as e:
        print(f"Error calculating portfolio XIRR: {e}")
        # fallback to simple time-weighted return proxy
        total_days = max(1, sum([(today - item.purchase_date).days for item in items]) // len(items))
        total_years = total_days / 365.25
        if total_current_value > 0 and total_invested > 0:
            overall_xirr = ((total_current_value / total_invested) ** (1.0 / total_years) - 1.0) * 100.0
            
    # Normalize allocation percentages
    allocation_pcts = {}
    for cat, val in allocation.items():
        allocation_pcts[cat] = round((val / total_current_value) * 100.0, 1)
        
    return {
        "items": portfolio_responses,
        "total_invested": round(total_invested, 2),
        "current_value": round(total_current_value, 2),
        "absolute_return": round(total_current_value - total_invested, 2),
        "absolute_return_pct": round(((total_current_value - total_invested) / total_invested * 100.0) if total_invested > 0 else 0.0, 2),
        "xirr": round(overall_xirr, 2),
        "allocation": allocation_pcts
    }

@router.post("/", response_model=schemas.PortfolioResponse)
def add_portfolio_item(
    item_in: schemas.PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Log a new mutual fund or stock purchase transaction.
    """
    fund = crud.get_mutual_fund_by_id(db, fund_id=item_in.fund_id)
    if not fund:
        asset_title = item_in.fund_name if (item_in.fund_name and not item_in.fund_name.startswith("Asset #")) else f"Market Asset #{item_in.fund_id}"
        # Check if any existing fund matches or auto-create asset on the fly
        new_fund = MutualFund(
            id=item_in.fund_id,
            name=asset_title,
            amc="Market Asset",
            category="Listed Stock",
            risk_category="High",
            expense_ratio=0.0,
            fund_rating=4,
            aum=50000.0,
            fund_manager="Market Desk",
            manager_tenure=5.0,
            exit_load="Nil",
            lock_in_period="None",
            min_sip=100.0,
            min_lumpsum=item_in.purchase_price,
            sharpe_ratio=1.5,
            sortino_ratio=1.8,
            alpha=3.0,
            beta=1.0,
            standard_deviation=14.0,
            treynor_ratio=15.0,
            upside_capture=100.0,
            downside_capture=80.0,
            portfolio_turnover=0.1,
            consistency_score=90.0,
            drawdown=0.15,
            benchmark_outperformance=2.0,
            taxation="Equity: 15% STCG",
            pros="Solid market asset",
            cons="Market risk",
            target_benchmark="NIFTY 50"
        )
        try:
            db.add(new_fund)
            db.commit()
            db.refresh(new_fund)
            fund = new_fund
        except Exception:
            db.rollback()
            fund = db.query(MutualFund).first()
            if not fund:
                raise HTTPException(status_code=404, detail="Mutual fund not found")
            item_in.fund_id = fund.id
        
    db_item = crud.add_portfolio_item(db, user_id=current_user.id, item=item_in)
    
    # Format response
    latest_history = db.query(NAVHistory).filter(NAVHistory.fund_id == fund.id).order_by(desc(NAVHistory.date)).first()
    current_nav = latest_history.nav if latest_history else item_in.purchase_price
    current_value = db_item.units * current_nav
    invested = db_item.units * db_item.purchase_price
    
    return schemas.PortfolioResponse(
        id=db_item.id,
        fund_id=db_item.fund_id,
        fund_name=fund.name,
        fund_category=fund.category,
        units=db_item.units,
        purchase_price=db_item.purchase_price,
        purchase_date=db_item.purchase_date,
        current_nav=current_nav,
        current_value=current_value,
        absolute_return=current_value - invested,
        absolute_return_pct=((current_value - invested) / invested * 100) if invested > 0 else 0,
        cagr=0.0,
        xirr=0.0
    )

@router.delete("/{portfolio_id}")
def delete_portfolio_item(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Delete a portfolio item.
    """
    success = crud.remove_portfolio_item(db, user_id=current_user.id, portfolio_id=portfolio_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    return {"message": "Portfolio item deleted successfully"}

@router.get("/optimize")
def optimize_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Run the portfolio optimizer agent to analyze rebalancing parameters.
    """
    orchestrator = AgentOrchestrator()
    analysis = orchestrator._run_optimizer_agent(current_user, db)
    
    # We can also get general written advice from the AI engine
    advice = orchestrator.process_query("Analyze my portfolio allocation and suggest optimization", current_user, db)
    
    return {
        "metrics": analysis,
        "advice_markdown": advice
    }

@router.get("/news")
def read_portfolio_news(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Fetch real-time news about global market incidents and user's portfolio assets,
    retrieved from Google News (crawling TOI, ET, Moneycontrol, Mint, CNBC, Tickertape) 
    and Yahoo Finance Search. Includes simulated impact analysis.
    """
    items = crud.get_user_portfolios(db, user_id=current_user.id)
    
    # 1. Determine tickers/assets in user's portfolio
    tickers = []
    asset_names = []
    for item in items:
        fund = crud.get_mutual_fund_by_id(db, fund_id=item.fund_id)
        if fund:
            asset_names.append(fund.name)
            ticker = getattr(fund, "ticker", None)
            if ticker:
                tickers.append(ticker)
                
    # 2. Build multi-source queries matching user requests
    queries = []
    
    # Add portfolio-specific targets if available
    for t in tickers[:3]:
        queries.append(t)
    for name in asset_names[:2]:
        queries.append(name.split(" - ")[0].split("(")[0].strip()[:20])
        
    # If portfolio is empty, fallback to rich defaults matching nse, bse, polymarket, global markets
    if not queries:
        queries = ["global markets", "NSE BSE Indian stock market", "Polymarket predictions finance"]
    else:
        queries.extend(["global markets", "Polymarket predictions finance"])
        
    news_items = []
    seen_urls = set()
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    import xml.etree.ElementTree as ET
    
    for q in queries[:5]:  # limit queries to prevent slow API response times
        # A. Fetch from Google News RSS feed (crawls TOI, Livemint, Moneycontrol, CNBC, etc.)
        try:
            g_url = f"https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en"
            res = requests.get(g_url, headers=headers, timeout=5.0)
            if res.status_code == 200:
                root = ET.fromstring(res.text)
                for item in root.findall(".//item")[:5]:
                    title = item.find("title").text if item.find("title") is not None else ""
                    link = item.find("link").text if item.find("link") is not None else ""
                    pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
                    source = item.find("source").text if item.find("source") is not None else "Google News"
                    
                    if link not in seen_urls:
                        seen_urls.add(link)
                        try:
                            # Strip timezone name if it fails datetime parsing
                            date_str = pub_date.rsplit(" ", 1)[0]
                            dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S")
                            ts = int(dt.timestamp())
                        except:
                            ts = int(datetime.now().timestamp())
                            
                        news_items.append({
                            "title": title,
                            "publisher": source,
                            "link": link,
                            "time": ts,
                            "related_tickers": []
                        })
        except Exception as e:
            print(f"Error fetching Google News for {q}: {e}")
            
        # B. Fetch from Yahoo Finance Search
        try:
            y_url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=0&newsCount=4"
            res = requests.get(y_url, headers=headers, timeout=5.0)
            if res.status_code == 200:
                articles = res.json().get("news", [])
                for art in articles:
                    link = art.get("link", "")
                    if link not in seen_urls:
                        seen_urls.add(link)
                        news_items.append({
                            "title": art.get("title", ""),
                            "publisher": art.get("publisher", "Yahoo Finance"),
                            "link": link,
                            "time": art.get("providerPublishTime", int(datetime.now().timestamp())),
                            "related_tickers": art.get("relatedTickers", [])
                        })
        except Exception as e:
            print(f"Error fetching Yahoo Finance news for {q}: {e}")
            
    # Sort news items by time (latest first)
    news_items = sorted(news_items, key=lambda x: x["time"], reverse=True)[:10]
    
    # 3. Analyze impact and map publishers to requested names
    analyzed_news = []
    for item in news_items:
        title_lower = item["title"].lower()
        pub_lower = item["publisher"].lower()
        
        # Clean publisher names to map directly to requested sites
        pub_name = item["publisher"]
        if "times of india" in pub_lower or "toi" in pub_lower:
            pub_name = "Times of India (TOI)"
        elif "economic times" in pub_lower or "ettimes" in pub_lower or "et telecom" in pub_lower or "et " in pub_lower:
            pub_name = "Economic Times (ET)"
        elif "moneycontrol" in pub_lower:
            pub_name = "Moneycontrol"
        elif "mint" in pub_lower or "livemint" in pub_lower:
            pub_name = "Livemint"
        elif "cnbc" in pub_lower:
            pub_name = "CNBC TV18"
        elif "tickertape" in pub_lower:
            pub_name = "Tickertape"
        elif "inshorts" in pub_lower:
            pub_name = "Inshorts"
        elif "polymarket" in pub_lower:
            pub_name = "Polymarket Predictions"
        elif "scanx" in pub_lower:
            pub_name = "ScanX Bulletin"
        elif "google" in pub_lower:
            pub_name = "Google Finance"
        elif "yahoo" in pub_lower:
            pub_name = "Yahoo Finance"
        elif "nse" in pub_lower or "bse" in pub_lower:
            pub_name = "Exchange Notice (NSE/BSE)"
            
        # Defaults
        impact_level = "Neutral"
        impact_color = "slate"
        explanation = "General financial update. Expect minor capital fluctuation across core indices."
        
        # Check matching tickers or global keywords
        matched_ticker = None
        for t in tickers:
            if t.split('.')[0].lower() in title_lower or t.lower() in [rt.lower() for rt in item["related_tickers"]]:
                matched_ticker = t
                break
                
        # Determine impact
        if matched_ticker:
            if any(kw in title_lower for kw in ["growth", "rise", "surge", "gain", "profit", "win", "high", "buy", "bull"]):
                impact_level = "Positive"
                impact_color = "emerald"
                explanation = f"Positive news bulletin regarding {matched_ticker} in your portfolio. This supports relative performance gains."
            elif any(kw in title_lower for kw in ["fall", "drop", "loss", "sink", "decline", "warn", "sell", "bear", "down"]):
                impact_level = "Negative"
                impact_color = "red"
                explanation = f"Market correction or negative sentiment reported for {matched_ticker}. Monitor allocation margins."
            else:
                impact_level = "Moderate Positive"
                impact_color = "blue"
                explanation = f"Corporate updates regarding {matched_ticker}. Supports holding liquidity profiles."
        else:
            if any(kw in title_lower for kw in ["rate hike", "inflation", "recession", "slump", "interest rate", "fed"]):
                impact_level = "Macro Headwind"
                impact_color = "amber"
                explanation = "Global interest rate or inflation adjustment. Broad systemic fluctuations may affect capital valuations."
            elif any(kw in title_lower for kw in ["gdp", "growth", "recovery", "bull run", "rally", "outperform"]):
                impact_level = "Macro Tailwind"
                impact_color = "emerald"
                explanation = "Macro-economic expansion and local tailwinds support systemic asset values across your holdings."
            elif "polymarket" in pub_lower or "odds" in title_lower or "predict" in title_lower:
                impact_level = "Market Prediction"
                impact_color = "blue"
                explanation = "Polymarket crowdsourced probability updates regarding local/global regulatory outcomes."
                
        analyzed_news.append({
            "title": item["title"],
            "publisher": pub_name,
            "link": item["link"],
            "time": item["time"],
            "impact_level": impact_level,
            "impact_color": impact_color,
            "explanation": explanation,
            "is_portfolio_related": matched_ticker is not None
        })
        
    return analyzed_news

import math
