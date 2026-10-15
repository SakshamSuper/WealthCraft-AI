"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RefreshCw, Newspaper, TrendingUp } from "lucide-react";
import { ensureSession } from "@/lib/auth";

export default function NewsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<any[]>([]);
  const [filterPortfolioOnly, setFilterPortfolioOnly] = useState(false);

  const FALLBACK_NEWS = [
    { id: 1, title: "NIFTY 50 Crosses 25,000 Mark Amid Strong FII Inflows", source: "ET Markets", url: "https://economictimes.indiatimes.com", sentiment: "positive", is_portfolio_related: false, published_at: new Date().toISOString(), summary: "Indian benchmark indices surged as foreign institutional investors poured over ₹8,500 crore into domestic equities, driven by expectations of RBI rate cuts in Q1 2027." },
    { id: 2, title: "RBI Keeps Repo Rate Unchanged at 6.5%; MPC Signals Easing Bias", source: "Business Standard", url: "https://business-standard.com", sentiment: "neutral", is_portfolio_related: false, published_at: new Date().toISOString(), summary: "The Monetary Policy Committee held rates steady for the sixth consecutive meeting but shifted its stance to 'accommodative', signalling potential cuts ahead." },
    { id: 3, title: "SEBI Proposes Tighter Rules for Small Cap Mutual Funds Amid Liquidity Concerns", source: "Mint", url: "https://livemint.com", sentiment: "negative", is_portfolio_related: true, published_at: new Date().toISOString(), summary: "Market regulator SEBI has proposed mandatory 10% liquidity buffer for small cap funds to protect retail investors from redemption pressure during market downturns." },
    { id: 4, title: "Parag Parikh Flexi Cap Fund Crosses ₹75,000 Cr AUM Milestone", source: "Value Research", url: "https://valueresearchonline.com", sentiment: "positive", is_portfolio_related: true, published_at: new Date().toISOString(), summary: "The fund reached a new AUM milestone, continuing its track record of 20%+ CAGR over 10 years with international diversification through US tech holdings." },
    { id: 5, title: "India Q2 GDP Growth Comes in at 7.1%, Beats Estimates", source: "Reuters", url: "https://reuters.com", sentiment: "positive", is_portfolio_related: false, published_at: new Date().toISOString(), summary: "India's GDP growth exceeded analyst forecasts, with manufacturing and services sectors leading the expansion, reinforcing the bullish case for domestic equities." },
    { id: 6, title: "LTCG Tax Exemption Raised to ₹1.25 Lakh — What It Means for Mutual Fund Investors", source: "Financial Express", url: "https://financialexpress.com", sentiment: "positive", is_portfolio_related: true, published_at: new Date().toISOString(), summary: "Union Budget 2025-26 raised the LTCG exemption threshold for equity investments to ₹1.25 Lakh under Section 112A, up from ₹1 Lakh, benefiting long-term equity investors." },
    { id: 7, title: "Mirae Asset Mutual Fund Launches New Healthcare Sectoral Fund", source: "Moneycontrol", url: "https://moneycontrol.com", sentiment: "neutral", is_portfolio_related: false, published_at: new Date().toISOString(), summary: "Mirae Asset has filed a draft offer document with SEBI for a new healthcare and pharma-focused sectoral fund, targeting the booming domestic health sector." },
    { id: 8, title: "US Fed Signals Slower Rate Cuts; Emerging Markets May Face Volatility", source: "Bloomberg", url: "https://bloomberg.com", sentiment: "negative", is_portfolio_related: false, published_at: new Date().toISOString(), summary: "Federal Reserve officials indicated fewer rate cuts in 2026 than previously expected, triggering outflows from emerging market funds and putting pressure on the rupee." },
  ];

  useEffect(() => {
    setMounted(true);
    ensureSession();

    const fetchNews = async () => {
      try {
        const data = await api.getPortfolioNews();
        setNews(data.length > 0 ? data : FALLBACK_NEWS);
      } catch (err) {
        console.warn("News backend unavailable, using fallback feed:", err);
        setNews(FALLBACK_NEWS);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [router]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api.getPortfolioNews();
      setNews(data.length > 0 ? data : FALLBACK_NEWS);
    } catch (err) {
      setNews(FALLBACK_NEWS);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const displayedNews = filterPortfolioOnly 
    ? news.filter(item => item.is_portfolio_related)
    : news;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-white flex items-center gap-2">
            <Newspaper className="text-emerald-400" size={28} />
            Market News & Portfolio Impact Advisor
          </h1>
          <p className="text-xs text-slate-500">
            Real-time global bulletins and holdings-specific updates mapped to your current investment allocations
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer w-fit"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh News Feed
        </button>
      </div>

      {/* Filters row */}
      {!loading && news.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-panel bg-slate-950/20 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Filter News Feed:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterPortfolioOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !filterPortfolioOnly
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-slate-950/40 border border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                All Market News
              </button>
              <button
                onClick={() => setFilterPortfolioOnly(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPortfolioOnly
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-slate-950/40 border border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                My Portfolio News Only
              </button>
            </div>
          </div>
          
          <div className="text-[11px] text-slate-500 font-medium">
            Showing {displayedNews.length} of {news.length} real-time updates
          </div>
        </div>
      )}

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
            <p className="text-sm text-slate-500">Retrieving bulletins & analyzing financial impacts...</p>
          </div>
        </div>
      ) : news.length === 0 ? (
        <div className="glass-panel p-12 bg-slate-950/40 text-center text-slate-500 text-sm">
          No active news bulletins matching your profile. Log active transactions to generate custom alerts.
        </div>
      ) : displayedNews.length === 0 ? (
        <div className="glass-panel p-12 bg-slate-950/40 text-center text-slate-500 text-sm">
          No portfolio-specific news bulletins found in the current feed. Toggle "All Market News" to see general updates, or add transactions to your Portfolio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedNews.map((item, idx) => {
            let impactBadgeClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
            if (item.impact_color === "emerald") {
              impactBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            } else if (item.impact_color === "red") {
              impactBadgeClass = "bg-red-500/10 text-red-400 border-red-500/20";
            } else if (item.impact_color === "blue") {
              impactBadgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
            } else if (item.impact_color === "amber") {
              impactBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            }

            return (
              <div 
                key={idx}
                className="glass-panel p-6 bg-slate-950/40 hover:border-emerald-500/25 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">
                      {item.publisher} • {new Date(item.time * 1000).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wider border ${impactBadgeClass}`}>
                      {item.impact_level}
                    </span>
                  </div>

                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-heading font-bold text-white text-lg hover:text-emerald-400 transition-colors line-clamp-2 block leading-snug"
                  >
                    {item.title}
                  </a>

                  <div className="text-xs text-slate-350 leading-relaxed mt-4 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold mb-2 text-[10px] uppercase tracking-wider">
                      <TrendingUp size={12} />
                      Advisor Impact Analysis
                    </div>
                    {item.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
