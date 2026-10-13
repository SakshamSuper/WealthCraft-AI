import os
from typing import Dict, Any, List
import openai
from sqlalchemy.orm import Session
from app.models.models import MutualFund, User, Portfolio
from app.services.recommendation import calculate_recommendation_score, generate_recommendation_explanation
from app.services.calculators import calculate_sip, plan_goal, calculate_xirr
from rag.vector_store import FinancialRAG

class AgentOrchestrator:
    """
    Orchestrates queries between different AI financial agents.
    Uses RAG search for compliance and definitions, and delegates execution
    to specialized agents.
    """
    def __init__(self):
        self.rag = FinancialRAG()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")

    def process_query(self, query: str, user: User, db: Session) -> str:
        """
        Main entry point for processing user queries. Routes to specialized agents
        and uses LLM or local templates to assemble the final advice.
        """
        query_lower = query.lower()
        
        # 1. Fetch compliance and guideline context via RAG
        rag_results = self.rag.search(query, top_k=2)
        rag_context = "\n\n".join([r["content"] for r in rag_results])
        
        # 2. Route to specialized agent
        agent_type = "general"
        agent_data = {}
        
        if any(w in query_lower for w in ["compare", "vs", "versus", "difference"]):
            agent_type = "comparison"
            agent_data = self._run_comparison_agent(query, db)
        elif any(w in query_lower for w in ["tax", "stcg", "ltcg", "elss", "80c"]):
            agent_type = "tax"
            agent_data = self._run_tax_agent(user, db)
        elif any(w in query_lower for w in ["optimize", "rebalance", "portfolio", "diversify"]):
            agent_type = "optimizer"
            agent_data = self._run_optimizer_agent(user, db)
        elif any(w in query_lower for w in ["recommend", "suggest", "pick", "buy", "best"]):
            agent_type = "advisor"
            agent_data = self._run_advisor_agent(user, db)
        
        # 3. Compile the response
        if self.openai_api_key:
            try:
                # LLM synthesis
                openai.api_key = self.openai_api_key
                prompt = (
                    f"You are Stockify AI, an intelligent, elite wealth advisor. Answer the user's query.\n\n"
                    f"User Query: {query}\n\n"
                    f"User Profile:\n"
                    f"- Age: {user.age}\n"
                    f"- Risk Appetite: {user.risk_appetite}\n"
                    f"- Goal: {user.investment_goal}\n\n"
                    f"Regulatory/RAG Context:\n{rag_context}\n\n"
                    f"Specialized Agent Output ({agent_type}):\n{agent_data}\n\n"
                    f"Write a comprehensive, professional wealth advice report in markdown. "
                    f"Highlight specific numbers, metrics, or fund recommendations. Include bullet points, pros/cons, or rebalancing tables if applicable."
                )
                
                client = openai.OpenAI(api_key=self.openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=800,
                    temperature=0.4
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Orchestrator: LLM synthesis failed: {e}. Falling back to template generation.")

        # Heuristic Template Generator
        return self._generate_template_response(agent_type, agent_data, rag_context, user)

    def _run_advisor_agent(self, user: User, db: Session) -> Dict[str, Any]:
        """
        Specialized Agent: Recommends 3 mutual funds matching user profile.
        """
        funds = db.query(MutualFund).all()
        scored_funds = []
        for f in funds:
            score = calculate_recommendation_score(f, user)
            explanation = generate_recommendation_explanation(f, user, score)
            scored_funds.append((f, score, explanation))
            
        # Sort by score descending
        scored_funds.sort(key=lambda x: x[1], reverse=True)
        top_picks = scored_funds[:3]
        
        picks_list = []
        for fund, score, expl in top_picks:
            picks_list.append({
                "name": fund.name,
                "category": fund.category,
                "score": score,
                "risk": fund.risk_category,
                "rating": fund.fund_rating,
                "manager": fund.fund_manager,
                "pros": expl["pros"][:2],
                "cons": expl["cons"][:1],
                "holding_period": expl["ideal_holding_period"]
            })
            
        return {
            "top_picks": picks_list,
            "risk_profile": user.risk_appetite or "Moderate",
            "goal": user.investment_goal or "Wealth Creation"
        }

    def _run_comparison_agent(self, query: str, db: Session) -> Dict[str, Any]:
        """
        Specialized Agent: Compares mutual funds mentioned in query.
        """
        # Find funds mentioned
        all_funds = db.query(MutualFund).all()
        matched_funds = []
        
        # Simple string matching for query
        query_lower = query.lower()
        for f in all_funds:
            if f.name.lower() in query_lower or any(word in query_lower for word in f.name.lower().split()):
                if len(f.name.split()) > 2: # Prevent matching single characters or too generic words
                    matched_funds.append(f)
                    
        # If no funds matched from string search, default to top 2 Large Cap funds to demonstrate
        if len(matched_funds) < 2:
            matched_funds = db.query(MutualFund).filter(MutualFund.category == "Large Cap").limit(2).all()
            
        comparisons = []
        for f in matched_funds[:4]:
            comparisons.append({
                "name": f.name,
                "category": f.category,
                "rating": f.fund_rating,
                "expense_ratio": f.expense_ratio * 100,
                "aum": f.aum,
                "sharpe": f.sharpe_ratio,
                "alpha": f.alpha,
                "beta": f.beta,
                "volatility": f.standard_deviation,
                "exit_load": f.exit_load
            })
            
        # Determine statistical winner (highest Sharpe & Alpha)
        winner = None
        if comparisons:
            sorted_by_metrics = sorted(comparisons, key=lambda x: (x["sharpe"], x["alpha"]), reverse=True)
            winner = sorted_by_metrics[0]["name"]
            
        return {
            "funds": comparisons,
            "winner": winner
        }

    def _run_optimizer_agent(self, user: User, db: Session) -> Dict[str, Any]:
        """
        Specialized Agent: Reviews current portfolio diversification & rebalancing recommendations.
        """
        portfolios = db.query(Portfolio).filter(Portfolio.user_id == user.id).all()
        if not portfolios:
            return {
                "message": "Your portfolio is currently empty. Please purchase or log mutual funds in the optimizer first.",
                "rebalance_needed": False
            }
            
        total_value = 0.0
        category_allocation = {}
        
        for p in portfolios:
            # Let's get the latest NAV
            latest_nav = db.query(MutualFund).filter(MutualFund.id == p.fund_id).first()
            if latest_nav:
                val = p.units * latest_nav.min_sip  # fallback proxy or simulated nav
                # Let's fetch latest nav from NAVHistory
                from sqlalchemy import desc
                from app.models.models import NAVHistory
                latest_history = db.query(NAVHistory).filter(NAVHistory.fund_id == p.fund_id).order_by(desc(NAVHistory.date)).first()
                if latest_history:
                    val = p.units * latest_history.nav
                
                total_value += val
                cat = latest_nav.category
                category_allocation[cat] = category_allocation.get(cat, 0.0) + val
                
        allocation_pct = {}
        for cat, val in category_allocation.items():
            allocation_pct[cat] = round((val / total_value) * 100.0, 1)
            
        # Rebalancing logic based on risk appetite
        # Low risk appetite: 70% Debt, 30% Equity
        # Moderate risk: 50% Equity (Large/Flexi), 30% Hybrid, 20% Debt
        # High risk: 80% Equity (Small/Mid/Flexi), 20% Debt/Hybrid
        risk = (user.risk_appetite or "Moderate").strip().lower()
        target_allocation = {}
        if risk == "low":
            target_allocation = {"Debt": 70.0, "Hybrid": 20.0, "Large Cap": 10.0}
        elif risk == "moderate":
            target_allocation = {"Large Cap": 30.0, "Flexi Cap": 30.0, "Hybrid": 20.0, "Debt": 20.0}
        else:
            target_allocation = {"Small Cap": 30.0, "Mid Cap": 20.0, "Flexi Cap": 30.0, "Debt": 10.0, "Hybrid": 10.0}
            
        rebalancing = []
        for cat, target in target_allocation.items():
            curr = allocation_pct.get(cat, 0.0)
            diff = curr - target
            if abs(diff) > 10.0:
                action = "Reduce exposure (Overweight)" if diff > 0 else "Increase exposure (Underweight)"
                rebalancing.append({
                    "category": cat,
                    "current": curr,
                    "target": target,
                    "difference": round(diff, 1),
                    "action": action
                })
                
        return {
            "total_value": round(total_value, 2),
            "current_allocation": allocation_pct,
            "target_allocation": target_allocation,
            "rebalance_needed": len(rebalancing) > 0,
            "suggestions": rebalancing
        }

    def _run_tax_agent(self, user: User, db: Session) -> Dict[str, Any]:
        """
        Specialized Agent: Analyzes tax-saving recommendations and rules.
        """
        # Suggest ELSS funds if they haven't maxed out 80C
        elss_funds = db.query(MutualFund).filter(MutualFund.category == "ELSS").all()
        suggestions = []
        for f in elss_funds:
            suggestions.append({
                "name": f.name,
                "rating": f.fund_rating,
                "expense_ratio": f.expense_ratio * 100,
                "lock_in": f.lock_in_period
            })
            
        return {
            "limit_80c": 150000.0,
            "current_savings_est": user.monthly_savings * 12.0 * 0.2 if user.monthly_savings else 50000.0,
            "tax_slab_est": "30% (High Bracket)" if (user.income or 0) > 1500000.0 else "20% (Mid Bracket)",
            "elss_options": suggestions[:2]
        }

    def _generate_template_response(self, agent_type: str, data: Dict[str, Any], context: str, user: User) -> str:
        """
        Compiles structural markdown response for local rule-based generation.
        """
        output = f"# Stockify AI Advisor Report\n\n"
        output += f"**Advisor Insight**: Based on your **{user.risk_appetite}** risk profile, I have compiled your personalized financial advice. Let's look at the breakdown:\n\n"
        
        if agent_type == "advisor":
            output += "### 🎯 Custom Mutual Fund Recommendations\n\n"
            output += "Here are the top mutual funds matching your investment profile:\n\n"
            for pick in data["top_picks"]:
                output += f"#### ⭐ {pick['name']} ({pick['category']})\n"
                output += f"- **Recommendation Match Score**: `{pick['score']}/100`\n"
                output += f"- **Risk Level**: {pick['risk']} | **Rating**: {pick['rating']}/5 Stars\n"
                output += f"- **Ideal Holding Period**: {pick['holding_period']}\n"
                output += f"- **Pros**: {', '.join(pick['pros'])}\n"
                output += f"- **Cons**: {', '.join(pick['cons'])}\n\n"
                
        elif agent_type == "comparison":
            output += "### ⚖️ Fund Comparison Summary\n\n"
            output += "We compared the funds you requested. Here is a summary of the core metrics:\n\n"
            output += "| Fund Name | Category | Sharpe Ratio | Alpha | Beta | Expense Ratio | AUM (Cr) |\n"
            output += "|---|---|---|---|---|---|---|\n"
            for f in data["funds"]:
                output += f"| **{f['name']}** | {f['category']} | {f['sharpe']} | {f['alpha']}% | {f['beta']} | {f['expense_ratio']:.2f}% | {f['aum']:,} Cr |\n"
            
            if data["winner"]:
                output += f"\n🏆 **Statistical Winner**: **{data['winner']}** shows the highest risk-adjusted returns (Sharpe Ratio) and alpha outperformance in this set.\n\n"
                
        elif agent_type == "optimizer":
            output += "### 📊 Portfolio Rebalancing Analysis\n\n"
            if "message" in data:
                output += f"{data['message']}\n\n"
                return output
            output += f"**Total Portfolio Value**: INR {data['total_value']:,}\n\n"
            if not data["rebalance_needed"]:
                output += "✅ Your portfolio allocation is highly diversified and matches your risk appetite targets. No rebalancing is needed at this time.\n\n"
            else:
                output += "⚠️ **Rebalancing Recommended**: The following sectors/categories deviate from your targets:\n\n"
                output += "| Category | Current % | Target % | Difference | Suggested Action |\n"
                output += "|---|---|---|---|---|\n"
                for sug in data["suggestions"]:
                    output += f"| {sug['category']} | {sug['current']}% | {sug['target']}% | {sug['difference']}% | **{sug['action']}** |\n"
                output += "\n💡 *Tip: Rebalancing helps lock in profits from overperforming assets and buys underperforming assets at a discount.*\n\n"
                
        elif agent_type == "tax":
            output += "### 💸 Tax Planning & ELSS Advice\n\n"
            output += f"- **Section 80C Deduction Limit**: INR {data['limit_80c']:,}/year\n"
            output += f"- **Estimated Tax Bracket**: {data['tax_slab_est']}\n\n"
            output += "To optimize your tax liabilities and earn equity-linked returns, we recommend investing in the following **ELSS Tax Saving Funds** (mandated 3-year lock-in):\n\n"
            for el in data["elss_options"]:
                output += f"- **{el['name']}** (Rating: {el['rating']} Stars | Expense: {el['expense_ratio']:.2f}%)\n"
                
        # Attach general compliance references
        if context:
            output += "\n---\n### 📘 Regulatory & Educational References (RAG)\n"
            output += context
            
        return output
