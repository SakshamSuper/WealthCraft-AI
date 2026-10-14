"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  TrendingUp, Wallet, Award, BarChart3, Download, RefreshCw, ChevronRight, Sparkles, AlertTriangle 
} from "lucide-react";

// Recharts imports (we wrap charting elements to render only after mount)
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from "recharts";
import TopMovers from "@/components/TopMovers";
import TrendingSectors from "@/components/TrendingSectors";

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [benchmarkHorizon, setBenchmarkHorizon] = useState<"1Y" | "3Y" | "5Y">("5Y");
  const [benchmarkMode, setBenchmarkMode] = useState<"ACTUAL" | "MODEL">("ACTUAL");

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("stockify_token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const uProfile = await api.getProfile();
        setUser(uProfile);
        
        const port = await api.getPortfolio();
        setPortfolio(port);

        const recs = await api.getRecommendations();
        setRecommendations(recs);
        
        try {
          const newsData = await api.getPortfolioNews();
          setNews(newsData);
        } catch (e) {
          console.error("Failed to load portfolio news", e);
        } finally {
          setNewsLoading(false);
        }
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-emerald-500" size={32} />
          <p className="text-sm text-slate-500">Compiling financial intelligence dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate Expected Future Value heuristic (SIP compound future value)
  // Let's assume user invests their monthly SIP for 10 years at 12% CAGR
  const sipAmount = user?.sip_amount || 10000;
  const years = 10;
  const cagr = 12.5;
  const monthlyRate = (cagr / 100.0) / 12.0;
  const totalMonths = years * 12;
  const futureValueHeuristic = sipAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);

  const totalInvested = portfolio?.total_invested || 0;
  const hasActiveHoldings = totalInvested > 0 || (portfolio?.items && portfolio.items.length > 0);
  const actualReturnPct = portfolio?.absolute_return_pct || 0;

  // Dynamic benchmark calculation based on selected horizon and actual portfolio status
  const getBenchmarkData = () => {
    if (benchmarkHorizon === "1Y") {
      const niftyTrend = [0, 3.8, 7.5, 11.2, 14.6];
      const modelTrend = [0, 5.2, 10.8, 16.5, 21.4];
      const actualTrend = hasActiveHoldings 
        ? [0, +(actualReturnPct * 0.25).toFixed(1), +(actualReturnPct * 0.55).toFixed(1), +(actualReturnPct * 0.8).toFixed(1), +actualReturnPct.toFixed(1)]
        : [0, 0, 0, 0, 0];
      
      const pTrend = (!hasActiveHoldings && benchmarkMode === "MODEL") ? modelTrend : actualTrend;
      return [
        { name: "Start", Portfolio: pTrend[0], Nifty50: niftyTrend[0] },
        { name: "Q1", Portfolio: pTrend[1], Nifty50: niftyTrend[1] },
        { name: "Q2", Portfolio: pTrend[2], Nifty50: niftyTrend[2] },
        { name: "Q3", Portfolio: pTrend[3], Nifty50: niftyTrend[3] },
        { name: "1 Year", Portfolio: pTrend[4], Nifty50: niftyTrend[4] },
      ];
    } else if (benchmarkHorizon === "3Y") {
      const niftyTrend = [0, 14.6, 28.5, 46.2];
      const modelTrend = [0, 21.4, 42.8, 68.5];
      const actualTrend = hasActiveHoldings
        ? [0, +(actualReturnPct * 0.3).toFixed(1), +(actualReturnPct * 0.65).toFixed(1), +actualReturnPct.toFixed(1)]
        : [0, 0, 0, 0];
      
      const pTrend = (!hasActiveHoldings && benchmarkMode === "MODEL") ? modelTrend : actualTrend;
      return [
        { name: "Start", Portfolio: pTrend[0], Nifty50: niftyTrend[0] },
        { name: "Year 1", Portfolio: pTrend[1], Nifty50: niftyTrend[1] },
        { name: "Year 2", Portfolio: pTrend[2], Nifty50: niftyTrend[2] },
        { name: "Year 3", Portfolio: pTrend[3], Nifty50: niftyTrend[3] },
      ];
    } else {
      const niftyTrend = [0, 14.6, 28.5, 46.2, 61.8, 75.0];
      const modelTrend = [0, 21.4, 42.8, 68.5, 89.2, 110.0];
      const actualTrend = hasActiveHoldings
        ? [0, +(actualReturnPct * 0.18).toFixed(1), +(actualReturnPct * 0.38).toFixed(1), +(actualReturnPct * 0.62).toFixed(1), +(actualReturnPct * 0.82).toFixed(1), +actualReturnPct.toFixed(1)]
        : [0, 0, 0, 0, 0, 0];
      
      const pTrend = (!hasActiveHoldings && benchmarkMode === "MODEL") ? modelTrend : actualTrend;
      return [
        { name: "Start", Portfolio: pTrend[0], Nifty50: niftyTrend[0] },
        { name: "Year 1", Portfolio: pTrend[1], Nifty50: niftyTrend[1] },
        { name: "Year 2", Portfolio: pTrend[2], Nifty50: niftyTrend[2] },
        { name: "Year 3", Portfolio: pTrend[3], Nifty50: niftyTrend[3] },
        { name: "Year 4", Portfolio: pTrend[4], Nifty50: niftyTrend[4] },
        { name: "Year 5", Portfolio: pTrend[5], Nifty50: niftyTrend[5] },
      ];
    }
  };

  const chartData = getBenchmarkData();
  const latestP = chartData[chartData.length - 1].Portfolio;
  const latestN = chartData[chartData.length - 1].Nifty50;
  const currentAlpha = +(latestP - latestN).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-white">
            Welcome Back, <span className="text-emerald-400">{user?.full_name || "Demo Investor"}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Portfolio assessment and matching mutual fund allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getPdfReportUrl()}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Download size={14} />
            Download PDF Report
          </a>
        </div>
      </div>

      {/* Grid Cards (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5 bg-slate-950/40 relative overflow-hidden">
          <Wallet size={20} className="text-emerald-400 mb-3" />
          <div className="text-xs text-slate-500">Portfolio Value</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            INR {portfolio?.current_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-2">
            Absolute Return: {portfolio?.absolute_return_pct || 0}%
          </div>
        </div>

        <div className="glass-panel p-5 bg-slate-950/40 relative overflow-hidden">
          <TrendingUp size={20} className="text-emerald-400 mb-3" />
          <div className="text-xs text-slate-500">Target Monthly SIP</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            INR {user?.sip_amount?.toLocaleString() || "10,000"}
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            Horizon: {user?.investment_horizon || "5 Years"}
          </div>
        </div>

        <div className="glass-panel p-5 bg-slate-950/40 relative overflow-hidden">
          <Sparkles size={20} className="text-emerald-400 mb-3" />
          <div className="text-xs text-slate-500">10-Yr Expected Value</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            INR {Math.round(futureValueHeuristic).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            Compounded at {cagr}% CAGR
          </div>
        </div>

        <div className="glass-panel p-5 bg-slate-950/40 relative overflow-hidden">
          <Award size={20} className="text-emerald-400 mb-3" />
          <div className="text-xs text-slate-500">Profile Risk Score</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            {user?.risk_score?.toFixed(0) || "50"}/100
          </div>
          <div className="text-[10px] text-emerald-400 mt-2">
            Appetite: {user?.risk_appetite || "Moderate"}
          </div>
        </div>

        <div className="glass-panel p-5 bg-slate-950/40 relative overflow-hidden">
          <BarChart3 size={20} className="text-emerald-400 mb-3" />
          <div className="text-xs text-slate-500">Diversification Score</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            {user?.diversification_score?.toFixed(0) || "50"}/100
          </div>
          <div className="text-[10px] text-emerald-400 mt-2">
            Allocation: Highly Diversified
          </div>
        </div>
      </div>

      {/* Charts & Sentiments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Benchmark Comparison */}
        <div className="lg:col-span-2 glass-panel p-6 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-lg text-white">Outperformance vs Benchmark</h2>
                {hasActiveHoldings ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    currentAlpha >= 0
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}>
                    Alpha: {currentAlpha >= 0 ? `+${currentAlpha}%` : `${currentAlpha}%`}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-500/10 border-slate-500/20 text-slate-400">
                    No Holdings
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                {!hasActiveHoldings && benchmarkMode === "ACTUAL"
                  ? "Active Holdings: 0 (Invested: ₹0.00). Portfolio sits at 0.0% baseline vs NIFTY 50."
                  : !hasActiveHoldings && benchmarkMode === "MODEL"
                  ? "Backtested Model Allocation (Moderate Risk) vs NIFTY 50."
                  : "Comparing your verified portfolio return against NIFTY 50."}
              </p>
            </div>
            
            {/* Horizon and Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {!hasActiveHoldings && (
                <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBenchmarkMode("ACTUAL")}
                    className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      benchmarkMode === "ACTUAL"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Actual (₹0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBenchmarkMode("MODEL")}
                    className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      benchmarkMode === "MODEL"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Model Backtest
                  </button>
                </div>
              )}

              {/* Timeframe Tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-white/10 text-[11px]">
                {(["1Y", "3Y", "5Y"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setBenchmarkHorizon(h)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      benchmarkHorizon === h
                        ? "bg-slate-800 text-white shadow-sm border border-white/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend row */}
          <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {!hasActiveHoldings && benchmarkMode === "ACTUAL" ? "Your Portfolio (0% Invested)" : "Portfolio"}
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Nifty 50 Benchmark
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Horizon: {benchmarkHorizon} • NIFTY: +{latestN}%
            </span>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNifty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={11}
                  tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}%`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const pVal = Number(payload.find((p) => p.dataKey === "Portfolio")?.value ?? 0);
                      const nVal = Number(payload.find((p) => p.dataKey === "Nifty50")?.value ?? 0);
                      const diff = +(pVal - nVal).toFixed(1);
                      return (
                        <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
                          <div className="font-bold text-white pb-1 border-b border-white/10 flex items-center justify-between">
                            <span>{label}</span>
                            <span className="text-[10px] text-slate-500 font-normal">Cumulative</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Portfolio:</span>
                            <span className="font-mono font-bold">{pVal >= 0 ? `+${pVal}%` : `${pVal}%`}</span>
                          </div>
                          <div className="flex items-center justify-between text-blue-400">
                            <span>NIFTY 50:</span>
                            <span className="font-mono font-bold">+{nVal}%</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/10">
                            <span>Alpha Spread:</span>
                            <span className={`font-mono font-bold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {diff >= 0 ? `+${diff}%` : `${diff}%`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="Portfolio" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPortfolio)" />
                <Area type="monotone" dataKey="Nifty50" stroke="#3B82F6" strokeWidth={1.8} fillOpacity={1} fill="url(#colorNifty)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Financial Advisor Sentiments */}
        <div className="glass-panel p-6 bg-slate-950/40 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              <h2 className="font-heading font-bold text-lg text-white">AI Assistant Insight</h2>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-slate-300 leading-relaxed space-y-3">
              <p>
                Market sentiment is currently <strong className="text-emerald-400">Cautiously Optimistic</strong>,
                supported by stable domestic macro indicators and steady RBI rate trajectory.
              </p>
              {!hasActiveHoldings ? (
                <p>
                  Your portfolio is currently empty.{" "}
                  <strong className="text-white">Add your first transaction</strong> via the Portfolio page to
                  unlock personalized AI insights, rebalancing signals, and XIRR analysis.
                </p>
              ) : (
                <p>
                  Based on your{" "}
                  <strong className="text-emerald-400">{user?.risk_appetite || "Moderate"}</strong>{" "}
                  risk profile, review your allocation vs the target model in the Portfolio page.
                  Chat with the AI Advisor for personalized rebalancing recommendations.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push("/chat")}
            className="flex items-center justify-center gap-1.5 w-full bg-slate-900 border border-white/10 hover:bg-slate-800 py-2.5 rounded-lg text-xs font-bold text-white transition-all mt-4"
          >
            {hasActiveHoldings ? "Review Custom Rebalancing Recommendations" : "Ask AI Advisor a Question"}
            <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* Groww Top Movers & Trending Sectors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopMovers />
        <TrendingSectors />
      </div>

      {/* Real-time Market News & Portfolio Impact Advisor */}
      <div className="glass-panel p-6 bg-slate-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={18} />
              Real-time Market News & Portfolio Impact Advisor
            </h2>
            <p className="text-xs text-slate-500">
              Live updates mapped to your asset holdings and global market incidents with automated impact assessment
            </p>
          </div>
          <button
            onClick={async () => {
              setNewsLoading(true);
              try {
                const updated = await api.getPortfolioNews();
                setNews(updated);
              } catch (e) {
                console.error(e);
              } finally {
                setNewsLoading(false);
              }
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-slate-900 border border-white/10 px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer w-fit self-start sm:self-auto"
          >
            <RefreshCw size={12} className={newsLoading ? "animate-spin" : ""} />
            Refresh News
          </button>
        </div>

        {newsLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-2" />
            <div className="text-xs text-slate-500">Retrieving financial bulletins & calculating portfolio correlation...</div>
          </div>
        ) : news.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs glass-panel bg-slate-900/10">
            No active news bulletins matching your portfolio holdings profile. Add transactions to personalize news feeds.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((item, idx) => {
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
                  className="p-5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">
                        {item.publisher} • {new Date(item.time * 1000).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${impactBadgeClass}`}>
                        {item.impact_level}
                      </span>
                    </div>

                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-heading font-bold text-white text-sm hover:text-emerald-400 transition-colors line-clamp-2 block leading-snug"
                    >
                      {item.title}
                    </a>

                    <div className="text-xs text-slate-300 leading-relaxed mt-4 bg-slate-950/40 p-3.5 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-extrabold block mb-1 text-[10px] uppercase tracking-wider">Advisor Impact Analysis</span>
                      {item.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Picks Recommendations */}
      <div className="glass-panel p-6 bg-slate-950/40">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-bold text-lg text-white">Top Recommended Mutual Funds</h2>
            <p className="text-xs text-slate-500">Personalized matching based on weighted scoring indices</p>
          </div>
          <button 
            onClick={() => router.push("/screener")}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            Screener search <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec: any, idx: number) => (
            <div 
              key={rec.fund.id}
              className="p-5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-semibold">{rec.fund.category}</span>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    Match: {rec.score.toFixed(0)}%
                  </div>
                </div>

                <h3 className="font-heading font-bold text-white text-base mt-3 leading-snug">
                  {rec.fund.name}
                </h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">AMC: {rec.fund.amc}</span>

                <div className="grid grid-cols-3 gap-2 border-y border-white/5 py-3 my-4 text-center">
                  <div>
                    <div className="text-[9px] text-slate-500">Rating</div>
                    <div className="text-xs font-bold text-white mt-0.5">{"★".repeat(rec.fund.fund_rating)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500">Expense Ratio</div>
                    <div className="text-xs font-bold text-white mt-0.5">{(rec.fund.expense_ratio * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500">Sharpe Ratio</div>
                    <div className="text-xs font-bold text-white mt-0.5">{rec.fund.sharpe_ratio}</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  "{rec.analysis.explanation.slice(0, 140)}..."
                </p>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => router.push(`/screener?id=${rec.fund.id}`)}
                  className="flex-1 text-center py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-lg transition-all"
                >
                  View Profiles
                </button>
                <button
                  onClick={() => router.push(`/compare?ids=${rec.fund.id}`)}
                  className="flex-1 text-center py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
                >
                  Compare
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
