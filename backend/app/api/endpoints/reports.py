from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas
from app.api import deps
from app.services.recommendation import calculate_recommendation_score
from app.services.calculators import calculate_xirr
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO
from datetime import date, datetime
from sqlalchemy import desc
from app.models.models import NAVHistory, User

router = APIRouter()

@router.get("/pdf")
def generate_pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Generates a beautiful, downloadable PDF report summarizing user risk profiling, portfolio analysis, and recommended mutual funds.
    """
    # 1. Fetch user data
    portfolio_items = crud.get_user_portfolios(db, user_id=current_user.id)
    goals = crud.get_user_goals(db, user_id=current_user.id)
    
    # 2. Get recommendations
    funds = crud.get_mutual_funds(db)
    scored_funds = []
    for f in funds:
        score = calculate_recommendation_score(f, current_user)
        scored_funds.append((f, score))
    scored_funds.sort(key=lambda x: x[1], reverse=True)
    top_picks = scored_funds[:3]
    
    # 3. Setup PDF document
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    deep_blue = colors.HexColor("#0F172A")
    emerald = colors.HexColor("#10B981")
    silver = colors.HexColor("#64748B")
    bg_light = colors.HexColor("#F8FAFC")
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=deep_blue,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=silver,
        spaceAfter=25
    )
    
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=deep_blue,
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        textColor=deep_blue,
        leading=14,
        spaceAfter=10
    )
    
    bullet_style = ParagraphStyle(
        'BulletStyleCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=deep_blue,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    story = []
    
    # Title
    story.append(Paragraph("Stockify AI – Portfolio Advice Report", title_style))
    story.append(Paragraph(f"Generated on {date.today().strftime('%B %d, %Y')} | Prepared for: {current_user.full_name or current_user.email}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Risk Profile Overview
    story.append(Paragraph("1. User Financial Profile", h2_style))
    story.append(Paragraph(
        f"Your risk appetite is classified as <b>{current_user.risk_appetite or 'Moderate'}</b>. "
        f"Stockify has calculated an overall Risk Score of <b>{current_user.risk_score:.0f}/100</b> and a Diversification Score of <b>{current_user.diversification_score:.0f}/100</b>. "
        f"This forms the mathematical basis of your fund selections.",
        body_style
    ))
    
    profile_data = [
        ["Metric", "Value"],
        ["Age", f"{current_user.age or 'N/A'} Years"],
        ["Monthly Savings", f"INR {current_user.monthly_savings or 0.0:,.2f}"],
        ["Target Investment Goal", f"{current_user.investment_goal or 'N/A'}"],
        ["Time Horizon", f"{current_user.investment_horizon or 'N/A'}"]
    ]
    t_profile = Table(profile_data, colWidths=[200, 200])
    t_profile.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), deep_blue),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    story.append(t_profile)
    story.append(Spacer(1, 15))
    
    # Portfolio Status
    story.append(Paragraph("2. Portfolio Valuation & Performance", h2_style))
    if not portfolio_items:
        story.append(Paragraph("No current portfolio holdings logged.", body_style))
    else:
        total_invested = 0.0
        total_current = 0.0
        cash_flows = []
        for item in portfolio_items:
            latest_history = db.query(NAVHistory).filter(NAVHistory.fund_id == item.fund_id).order_by(desc(NAVHistory.date)).first()
            c_nav = latest_history.nav if latest_history else item.purchase_price
            invested = item.units * item.purchase_price
            curr_v = item.units * c_nav
            total_invested += invested
            total_current += curr_v
            cash_flows.append((item.purchase_date, -invested))
        
        cash_flows.append((date.today(), total_current))
        portfolio_xirr = 0.0
        try:
            portfolio_xirr = calculate_xirr(cash_flows)
        except:
            portfolio_xirr = ((total_current / total_invested) - 1) * 100
            
        story.append(Paragraph(
            f"Your mutual fund portfolio comprises holdings valued at <b>INR {total_current:,.2f}</b>, "
            f"yielding an absolute return of <b>{((total_current - total_invested) / total_invested * 100.0) if total_invested > 0 else 0:.2f}%</b> "
            f"and an annualized XIRR of <b>{portfolio_xirr:.2f}%</b>.",
            body_style
        ))
        
    story.append(Spacer(1, 10))
    
    # Top Mutual Fund Picks
    story.append(Paragraph("3. Recommended Mutual Funds", h2_style))
    story.append(Paragraph("Based on your financial goals, these are the top recommended funds:", body_style))
    
    rec_data = [["Fund Name", "Category", "Match Score", "Risk Level"]]
    for fund, score in top_picks:
        rec_data.append([
            fund.name,
            fund.category,
            f"{score:.1f}%",
            fund.risk_category
        ])
    t_rec = Table(rec_data, colWidths=[200, 100, 100, 100])
    t_rec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), deep_blue),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), bg_light),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    story.append(t_rec)
    story.append(Spacer(1, 15))
    
    # Goal Tracking Progress
    story.append(Paragraph("4. Financial Goal Projections", h2_style))
    if not goals:
        story.append(Paragraph("No financial saving goals configured.", body_style))
    else:
        goal_data = [["Goal Name", "Target Amount", "Target Date", "Required SIP", "Probability"]]
        for g in goals:
            goal_data.append([
                g.name,
                f"INR {g.target_amount:,.0f}",
                g.target_date.strftime("%Y-%m-%d"),
                f"INR {g.monthly_sip_required:,.0f}/mo",
                f"{g.success_probability:.1f}%"
            ])
        t_goals = Table(goal_data, colWidths=[130, 100, 90, 110, 70])
        t_goals.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), deep_blue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('BACKGROUND', (0,1), (-1,-1), bg_light),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(t_goals)
        
    story.append(Spacer(1, 30))
    story.append(Paragraph("<b>Disclaimer:</b> Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Forecasts and recommendations generated by Stockify AI represent mathematical assessments and are not guaranteed sources of return.", ParagraphStyle('Disc', parent=styles['Normal'], fontSize=7.5, textColor=silver, leading=10)))
    
    # Build Document
    doc.build(story)
    
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Stockify_Report_{date.today().strftime('%Y%m%d')}.pdf"}
    )
from typing import Optional, Any
