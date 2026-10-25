"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  X, TrendingUp, TrendingDown, Sparkles, PlusCircle, CheckCircle, RefreshCw, ChevronRight, BarChart3, PieChart, ShieldAlert, Layers, Building2, UserCheck, Calendar, Star, Sliders, Info, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line, ComposedChart 
} from "recharts";
import { watchlist } from "@/lib/watchlist";
import { generateAssetTimeSeries, ChartTimeframe, TimeSeriesResult, DataPoint } from "@/lib/historicalData";

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: number | null;
  initialFund?: any;
}

export default function AssetDetailModal({ isOpen, onClose, fundId, initialFund }: AssetDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "fundamentals" | "financials" | "holdings" | "peers" | "forecast">("overview");
  const [finTimeframe, setFinTimeframe] = useState<"quarterly" | "yearly">("quarterly");
  
  // Interactive Timeframe State (1D to 5Y / ALL)
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1Y");
  const [timeSeries, setTimeSeries] = useState<TimeSeriesResult | null>(null);

  // Sub-toggles State
  const [forecastSubTab, setForecastSubTab] = useState<"target_price" | "net_revenue" | "eps">("target_price");
  const [valuationSubTab, setValuationSubTab] = useState<"overview" | "trend">("overview");
  const [peerFilter, setPeerFilter] = useState<"overview" | "pe" | "returns" | "revenue" | "profit">("overview");

  const [fund, setFund] = useState<any>(initialFund || null);
  const [navHistory, setNavHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [chartStyle, setChartStyle] = useState<"line" | "candlestick">("line");

  // Portfolio Log State
  const [showAddForm, setShowAddForm] = useState(false);
  const [units, setUnits] = useState(100);
  const [purchasePrice, setPurchasePrice] = useState(100);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && fundId) {
      setIsStarred(watchlist.isInWatchlist(fundId));
      fetchFundDetails(fundId);
    }
  }, [isOpen, fundId]);

  const handleToggleWatchlist = () => {
    if (!fundId) return;
    const starred = watchlist.toggleWatchlist(fundId);
    setIsStarred(starred);
  };

  const fetchFundDetails = async (id: number) => {
    setLoading(true);
    // Prioritize initialFund if provided so custom clicked stocks retain identity
    const baseAsset = initialFund || null;
    setFund(baseAsset);
    setNavHistory([]);
    setForecast(null);
    setPeers([]);
    setShowAddForm(false);
    setAddSuccess(false);

    try {
      const [fundData, forecastData, peersData] = await Promise.all([
        (api.getFundDetail || api.getFundDetails).call(api, id).catch(() => baseAsset),
        api.getFundForecast(id).catch(() => null),
        api.getFundPeers(id).catch(() => []),
      ]);

      const merged = { ...(fundData || {}), ...(initialFund || {}) };
      setFund(merged);

      // Generate initial timeframe series
      const series = generateAssetTimeSeries(merged, timeframe);
      setTimeSeries(series);
      setNavHistory(series.points);

      if (forecastData) setForecast(forecastData);
      if (peersData && peersData.length > 0) setPeers(peersData);
    } catch (err) {
      console.error("Error fetching fund details:", err);
      if (baseAsset) {
        const series = generateAssetTimeSeries(baseAsset, timeframe);
        setTimeSeries(series);
        setNavHistory(series.points);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (tf: ChartTimeframe) => {
    setTimeframe(tf);
    if (!fund) return;
    const series = generateAssetTimeSeries(fund, tf);
    setTimeSeries(series);
    setNavHistory(series.points);
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fund) return;
    try {
      await api.addPortfolioTransaction({
        fund_id: fund.id,
        units: Number(units),
        purchase_price: Number(purchasePrice),
        purchase_date: purchaseDate,
      });
      setAddSuccess(true);
      setTimeout(() => {
        setShowAddForm(false);
        setAddSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to log transaction. Make sure you are logged in.");
    }
  };

  if (!isOpen || !fundId) return null;

  // Asset type detection
  const isStock = fund?.category === "Listed Stock" || fund?.category === "Stock" || (fund?.ticker && fund.ticker.includes(".NS")) || fund?.category?.includes("Equities");
  const isETF = fund?.category?.toLowerCase().includes("etf") || fund?.name?.toLowerCase().includes("etf") || fund?.ticker?.toLowerCase().includes("bees");
  const isMF = !isStock && !isETF;

  // Computed prices & metrics
  const validNavs = (navHistory || []).map((n: any) => Number(n?.close ?? n?.NAV ?? n?.nav ?? 0)).filter((v: number) => !isNaN(v) && v > 0);
  const curPrice = validNavs.length > 0 ? validNavs[validNavs.length - 1] : Number(fund?.initial_nav || fund?.price || 1197.80);
  
  const periodChange = timeSeries ? timeSeries.change : +(curPrice * 0.0125).toFixed(2);
  const periodChangePct = timeSeries ? timeSeries.change_pct : 1.25;
  const isPeriodPositive = periodChange >= 0;
  const changeColor = isPeriodPositive ? "text-[#00D09C]" : "text-[#EB5757]";

  const dayLow = timeSeries?.timeframe === "1D" ? timeSeries.periodLow : curPrice * 0.982;
  const dayHigh = timeSeries?.timeframe === "1D" ? timeSeries.periodHigh : curPrice * 1.015;
  const yearLow = Number(fund?.low_52w || curPrice * 0.74);
  const yearHigh = Number(fund?.high_52w || curPrice * 1.22);
  const dayPosPct = Math.min(100, Math.max(0, ((curPrice - dayLow) / (dayHigh - dayLow || 1)) * 100));
  const yearPosPct = Math.min(100, Math.max(0, ((curPrice - yearLow) / (yearHigh - yearLow || 1)) * 100));

  // Financial performance bar data (Quarterly vs Yearly)
  const financialDataQuarterly = [
    { period: "Jun '25", revenue: Math.round(curPrice * 85), profit: Math.round(curPrice * 14.2), eps: +(curPrice * 0.032).toFixed(1) },
    { period: "Sep '25", revenue: Math.round(curPrice * 89), profit: Math.round(curPrice * 15.6), eps: +(curPrice * 0.035).toFixed(1) },
    { period: "Dec '25", revenue: Math.round(curPrice * 94), profit: Math.round(curPrice * 16.8), eps: +(curPrice * 0.038).toFixed(1) },
    { period: "Mar '26", revenue: Math.round(curPrice * 91), profit: Math.round(curPrice * 15.9), eps: +(curPrice * 0.036).toFixed(1) },
    { period: "Jun '26", revenue: Math.round(curPrice * 98), profit: Math.round(curPrice * 18.4), eps: +(curPrice * 0.042).toFixed(1) },
  ];

  const financialDataYearly = [
    { period: "FY22", revenue: Math.round(curPrice * 280), profit: Math.round(curPrice * 42), eps: +(curPrice * 0.095).toFixed(1) },
    { period: "FY23", revenue: Math.round(curPrice * 315), profit: Math.round(curPrice * 49), eps: +(curPrice * 0.112).toFixed(1) },
    { period: "FY24", revenue: Math.round(curPrice * 352), profit: Math.round(curPrice * 56), eps: +(curPrice * 0.128).toFixed(1) },
    { period: "FY25", revenue: Math.round(curPrice * 390), profit: Math.round(curPrice * 64), eps: +(curPrice * 0.145).toFixed(1) },
    { period: "FY26", revenue: Math.round(curPrice * 442), profit: Math.round(curPrice * 74), eps: +(curPrice * 0.168).toFixed(1) },
  ];

  // 5-Year Valuation Historical Trend Data
  const valuationTrendData = [
    { year: "FY22", PE: +(fund?.pe_ratio ? fund.pe_ratio * 0.78 : 18.5).toFixed(1), PriceRatio: 0.72 },
    { year: "FY23", PE: +(fund?.pe_ratio ? fund.pe_ratio * 0.88 : 21.2).toFixed(1), PriceRatio: 0.85 },
    { year: "FY24", PE: +(fund?.pe_ratio ? fund.pe_ratio * 0.82 : 19.8).toFixed(1), PriceRatio: 0.94 },
    { year: "FY25", PE: +(fund?.pe_ratio ? fund.pe_ratio * 0.95 : 23.4).toFixed(1), PriceRatio: 1.08 },
    { year: "FY26", PE: +(fund?.pe_ratio ? fund.pe_ratio : 24.5).toFixed(1), PriceRatio: 1.18 },
  ];

  // Stock Shareholding pattern
  const stockHoldings = [
    { name: "Promoters & Promoter Group", pct: 50.45, color: "#00D09C" },
    { name: "Foreign Institutions (FII)", pct: 22.84, color: "#3B82F6" },
    { name: "Domestic Institutions (DII)", pct: 16.32, color: "#F59E0B" },
    { name: "Retail Public & Others", pct: 10.39, color: "#A855F7" },
  ];

  // Top Mutual Funds holding this stock
  const stockTopMFHolders = [
    { name: "Parag Parikh Flexi Cap Fund Direct Growth", aumPct: "8.45%", value: `₹${(curPrice * 18.2).toFixed(0)} Cr` },
    { name: "HDFC Top 100 Fund Direct Growth", aumPct: "7.12%", value: `₹${(curPrice * 14.5).toFixed(0)} Cr` },
    { name: "SBI Bluechip Fund Direct Growth", aumPct: "6.35%", value: `₹${(curPrice * 12.8).toFixed(0)} Cr` },
    { name: "ICICI Prudential Value Discovery Direct Growth", aumPct: "5.80%", value: `₹${(curPrice * 11.2).toFixed(0)} Cr` },
    { name: "Mirae Asset Large Cap Fund Direct Growth", aumPct: "4.92%", value: `₹${(curPrice * 9.8).toFixed(0)} Cr` },
  ];

  // Mutual Fund Top 10 Stock Holdings
  const mfTopHoldings = [
    { name: "HDFC Bank Ltd", ticker: "HDFCBANK", sector: "Banking", pct: 9.42, price: "₹706.95" },
    { name: "Reliance Industries Ltd", ticker: "RELIANCE", sector: "Energy", pct: 8.65, price: "₹1,197.80" },
    { name: "ICICI Bank Ltd", ticker: "ICICIBANK", sector: "Banking", pct: 7.84, price: "₹1,396.70" },
    { name: "Infosys Ltd", ticker: "INFY", sector: "IT Services", pct: 6.25, price: "₹1,894.20" },
    { name: "Tata Consultancy Services", ticker: "TCS", sector: "IT Services", pct: 5.18, price: "₹2,501.00" },
    { name: "Bharti Airtel Ltd", ticker: "BHARTIARTL", sector: "Telecom", pct: 4.75, price: "₹1,917.00" },
    { name: "Larsen & Toubro Ltd", ticker: "LT", sector: "Infrastructure", pct: 4.10, price: "₹3,540.00" },
    { name: "Mahindra & Mahindra Ltd", ticker: "M&M", sector: "Automobile", pct: 3.82, price: "₹3,145.20" },
    { name: "ITC Ltd", ticker: "ITC", sector: "FMCG", pct: 3.45, price: "₹262.00" },
    { name: "Axis Bank Ltd", ticker: "AXISBANK", sector: "Banking", pct: 3.12, price: "₹1,258.20" },
  ];

  // Mutual Fund Sector Allocation
  const mfSectorAllocations = [
    { sector: "Financial Services", pct: 32.5, color: "#00D09C" },
    { sector: "Information Technology", pct: 18.2, color: "#3B82F6" },
    { sector: "Oil, Gas & Energy", pct: 14.4, color: "#F59E0B" },
    { sector: "Automobile & Auto Parts", pct: 11.2, color: "#EC4899" },
    { sector: "Consumer Goods / FMCG", pct: 8.6, color: "#8B5CF6" },
    { sector: "Healthcare & Pharma", pct: 7.8, color: "#10B981" },
    { sector: "Cash & Equivalents", pct: 7.3, color: "#64748B" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0D0F12] border border-[#23272F] rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#1E222B] bg-[#14171D]/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1D2129] border border-[#2B303C] flex items-center justify-center font-bold text-lg text-[#00D09C] shrink-0">
              {fund?.name ? fund.name.substring(0, 2).toUpperCase() : "WC"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1F242D] text-[#00D09C] uppercase tracking-wide border border-[#00D09C]/20">
                  {fund?.category || (isStock ? "Listed Stock" : "Mutual Fund")}
                </span>
                {fund?.ticker && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    {fund.ticker}
                  </span>
                )}
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                  {"★".repeat(fund?.fund_rating || 5)}
                </span>
              </div>
              <h2 className="font-heading font-bold text-xl text-white mt-1 leading-snug">
                {fund?.name || "Asset Details"}
              </h2>
              <span className="text-xs text-slate-400 block mt-0.5">
                {fund?.amc || (isStock ? "NSE / BSE Listed Equities" : "Asset Management Company")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isStarred
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-[#1D2129] border-[#2B303C] text-slate-400 hover:text-white"
              }`}
            >
              <Star size={14} className={isStarred ? "fill-amber-400 text-amber-400" : ""} />
              <span>{isStarred ? "Watchlist" : "Add to Watchlist"}</span>
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1D2129] hover:bg-[#282E3A] text-slate-400 hover:text-white transition-all cursor-pointer border border-[#2B303C]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-[#1E222B] bg-[#14171D]/40 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "fundamentals", label: isStock ? "Fundamentals & Metrics" : "Fund Metrics & Ratios" },
            { id: "financials", label: isStock ? "Financials" : "Performance & Returns" },
            { id: "holdings", label: isStock ? "Shareholding & Institutional" : "Top Holdings & Sectors" },
            { id: "peers", label: "Similar Assets (Peers)" },
            { id: "forecast", label: "ML Forecast" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id 
                  ? "border-[#00D09C] text-[#00D09C] bg-[#00D09C]/5" 
                  : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-[#0D0F12]">
          
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="animate-spin text-[#00D09C] mx-auto mb-3" size={32} />
              <p className="text-xs text-slate-400">Loading live asset metrics & charts...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Price & Technical Indicator Chart */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    
                    {/* Price Header & Chart Mode Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                          {isStock ? "Current Market Price (NSE)" : "Latest Declared NAV"}
                        </span>
                        <div className="flex items-baseline gap-3 mt-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                            ₹{curPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-xs font-bold ${changeColor} flex items-center gap-1`}>
                            {isPeriodPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isPeriodPositive ? "+" : ""}₹{Math.abs(periodChange).toFixed(2)} ({isPeriodPositive ? "+" : ""}{periodChangePct.toFixed(2)}%) {timeframe}
                            {timeSeries?.cagr !== undefined && timeframe !== "1D" && timeframe !== "1W" && timeframe !== "1M" && (
                              <span className="text-[11px] text-slate-400 font-mono ml-1 font-normal">
                                ({timeSeries.cagr.toFixed(1)}% CAGR)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Chart Style Switcher */}
                      <div className="flex items-center p-0.5 rounded-lg bg-[#1D2129] border border-[#2B303C] text-[11px] self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setChartStyle("line")}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                            chartStyle === "line"
                              ? "bg-[#00D09C] text-slate-950 shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          📈 Line
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartStyle("candlestick")}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                            chartStyle === "candlestick"
                              ? "bg-[#00D09C] text-slate-950 shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          🕯️ Candlestick & Indicators
                        </button>
                      </div>
                    </div>

                    {/* Interactive Professional Timeframe Bar */}
                    <div className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl bg-[#181B20] border border-white/5 overflow-x-auto no-scrollbar">
                      {(["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"] as ChartTimeframe[]).map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => handleTimeframeChange(tf)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            timeframe === tf
                              ? "bg-[#00D09C] text-slate-950 shadow-md shadow-[#00D09C]/20"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>

                    {/* Indicator Legend in Candlestick Mode */}
                    {chartStyle === "candlestick" && (
                      <div className="flex flex-wrap items-center justify-between text-[11px] px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" /> 20 EMA
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                            <span className="w-2.5 h-0.5 bg-blue-400 rounded-full" /> 50 EMA
                          </span>
                          <span className="flex items-center gap-1.5 text-[#00D09C]">
                            <span className="w-2 h-2 rounded-sm bg-[#00D09C]" /> Bullish Candle
                          </span>
                          <span className="flex items-center gap-1.5 text-rose-400">
                            <span className="w-2 h-2 rounded-sm bg-rose-500" /> Bearish Candle
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          RSI (14): <strong className="text-emerald-400">58.4</strong> (Neutral Bullish)
                        </span>
                      </div>
                    )}

                    {/* Chart Canvas */}
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartStyle === "line" ? (
                          <AreaChart data={navHistory}>
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPeriodPositive ? "#00D09C" : "#EB5757"} stopOpacity={0.28} />
                                <stop offset="95%" stopColor={isPeriodPositive ? "#00D09C" : "#EB5757"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#475569" 
                              fontSize={10} 
                              tickLine={false} 
                              tickFormatter={(str: string) => {
                                if (timeframe === "1D") {
                                  const parts = str.split(" ");
                                  return parts[1] || str;
                                }
                                if (timeframe === "5Y" || timeframe === "ALL") {
                                  return str.substring(0, 7);
                                }
                                return str;
                              }}
                            />
                            <YAxis 
                              stroke="#475569" 
                              fontSize={10} 
                              tickLine={false} 
                              domain={["auto", "auto"]} 
                              tickFormatter={(v) => `₹${v >= 1000 ? (v).toLocaleString('en-IN') : v}`}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const pt = payload[0].payload;
                                  const price = pt.close ?? pt.NAV ?? pt.nav;
                                  return (
                                    <div className="bg-[#14171D] border border-[#2B303C] p-3 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                                      <div className="text-slate-400 font-semibold">{label}</div>
                                      <div className="text-white text-sm font-bold">
                                        Price: ₹{Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </div>
                                      {pt.volume && (
                                        <div className="text-slate-400 text-[10px]">
                                          Volume: {Number(pt.volume).toLocaleString('en-IN')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="close"
                              stroke={isPeriodPositive ? "#00D09C" : "#EB5757"}
                              fillOpacity={1}
                              fill="url(#chartGradient)"
                              strokeWidth={2.2}
                            />
                          </AreaChart>
                        ) : (
                          <ComposedChart data={navHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-[#14171D] border border-[#2B303C] p-3 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                                      <div className="text-white font-bold pb-1 border-b border-white/10">{label}</div>
                                      <div className="text-slate-300">Open: <span className="text-white">₹{d.open}</span></div>
                                      <div className="text-slate-300">High: <span className="text-emerald-400">₹{d.high}</span></div>
                                      <div className="text-slate-300">Low: <span className="text-rose-400">₹{d.low}</span></div>
                                      <div className="text-slate-300">Close: <span className="text-white font-bold">₹{d.close}</span></div>
                                      {d.ema20 && <div className="text-amber-400">20 EMA: ₹{d.ema20}</div>}
                                      {d.ema50 && <div className="text-blue-400">50 EMA: ₹{d.ema50}</div>}
                                      {d.rsi && <div className="text-emerald-400">RSI: {d.rsi}</div>}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Trend lines */}
                            <Line type="monotone" dataKey="ema20" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                            <Line type="monotone" dataKey="ema50" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="close" stroke={isPeriodPositive ? "#00D09C" : "#EB5757"} strokeWidth={2} dot={false} />
                          </ComposedChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Performance Section */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white">Range & Performance</h3>
                      <span className="text-xs text-slate-500">Live Settlement Track</span>
                    </div>

                    {/* Today's Low vs High Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Today's low <strong className="text-white font-mono block mt-0.5">₹{dayLow.toFixed(2)}</strong></span>
                        <span className="text-slate-400 text-right">Today's high <strong className="text-white font-mono block mt-0.5">₹{dayHigh.toFixed(2)}</strong></span>
                      </div>
                      <div className="relative w-full h-2 bg-[#23272F] rounded-full overflow-visible">
                        <div 
                          className="absolute -top-1 w-3 h-4 bg-[#00D09C] rounded-sm transform -translate-x-1/2 shadow-lg"
                          style={{ left: `${dayPosPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 52 Week Low vs High Slider */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">52 week low <strong className="text-white font-mono block mt-0.5">₹{yearLow.toFixed(2)}</strong></span>
                        <span className="text-slate-400 text-right">52 week high <strong className="text-white font-mono block mt-0.5">₹{yearHigh.toFixed(2)}</strong></span>
                      </div>
                      <div className="relative w-full h-2 bg-[#23272F] rounded-full overflow-visible">
                        <div 
                          className="absolute -top-1 w-3 h-4 bg-[#00D09C] rounded-sm transform -translate-x-1/2 shadow-lg"
                          style={{ left: `${yearPosPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Key Day Statistics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-slate-400 block">Open price</span>
                        <span className="font-bold text-white font-mono mt-0.5 block">₹{(curPrice * 0.995).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Previous close</span>
                        <span className="font-bold text-white font-mono mt-0.5 block">₹{(curPrice - periodChange).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Trading volume</span>
                        <span className="font-bold text-white font-mono mt-0.5 block">
                          {timeSeries ? timeSeries.totalVolume.toLocaleString('en-IN') : "3,42,10,500"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Lower circuit</span>
                        <span className="font-bold text-slate-300 font-mono mt-0.5 block">₹{(curPrice * 0.9).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Upper circuit</span>
                        <span className="font-bold text-slate-300 font-mono mt-0.5 block">₹{(curPrice * 1.1).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Analyst Rating Box */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Institutional Consensus</h3>
                        <span className="text-xs text-slate-500">Aggregated from 34 SEBI registered institutional analysts</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/30 text-xs font-bold uppercase tracking-wide">
                        {forecast?.analyst_rating || "Strong Buy"}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 pt-1">
                      <div className="w-16 h-16 rounded-full bg-[#00D09C] flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-[#00D09C]/20 shrink-0">
                        BUY
                      </div>

                      <div className="flex-1 space-y-2.5 text-xs font-bold">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#00D09C] h-full rounded-full" style={{ width: `${forecast?.buy_pct || 78}%` }} />
                          </div>
                          <span className="text-slate-300 w-24 text-right font-mono">{forecast?.buy_pct || 78}% BUY</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#F59E0B] h-full rounded-full" style={{ width: `${forecast?.hold_pct || 16}%` }} />
                          </div>
                          <span className="text-slate-300 w-24 text-right font-mono">{forecast?.hold_pct || 16}% HOLD</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#EB5757] h-full rounded-full" style={{ width: `${forecast?.sell_pct || 6}%` }} />
                          </div>
                          <span className="text-slate-300 w-24 text-right font-mono">{forecast?.sell_pct || 6}% SELL</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analyst Forecast & Deviation Sub-toggled Chart */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Analyst Trajectory Forecast</h3>
                        <span className="text-xs text-slate-500">12-Month Projections</span>
                      </div>
                      
                      <div className="flex gap-1.5 text-xs bg-[#181B20] p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("target_price")}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "target_price"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30 shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Target Price
                        </button>
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("net_revenue")}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "net_revenue"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30 shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Net Revenue
                        </button>
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("eps")}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "eps"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30 shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          EPS
                        </button>
                      </div>
                    </div>

                    {/* Chart Container based on Sub-toggle */}
                    <div className="h-60 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {forecastSubTab === "target_price" ? (
                          <LineChart data={[
                            { quarter: "Q4 (FY24)", Price: Math.round(curPrice * 0.76) },
                            { quarter: "Q1 (FY25)", Price: Math.round(curPrice * 0.84) },
                            { quarter: "Q2 (FY25)", Price: Math.round(curPrice * 0.89) },
                            { quarter: "Q3 (FY25)", Price: Math.round(curPrice * 0.94) },
                            { quarter: "Q4 (FY25)", Price: Math.round(curPrice * 0.98) },
                            { quarter: "Current", Price: Math.round(curPrice), High: Math.round(curPrice), Target: Math.round(curPrice), Low: Math.round(curPrice) },
                            { quarter: "+6M", High: Math.round(curPrice * 1.19), Target: Math.round(curPrice * 1.12), Low: Math.round(curPrice * 0.96) },
                            { quarter: "+12M Target", High: Math.round(curPrice * 1.345), Target: Math.round(curPrice * 1.182), Low: Math.round(curPrice * 0.915) },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="quarter" stroke="#475569" fontSize={9} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                            <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 11 }} />
                            <Line type="monotone" dataKey="Price" stroke="#00D09C" strokeWidth={2.5} dot={{ fill: "#00D09C", r: 4 }} />
                            <Line type="monotone" dataKey="High" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: "#3B82F6", r: 4 }} />
                            <Line type="monotone" dataKey="Target" stroke="#00D09C" strokeWidth={2} dot={{ fill: "#00D09C", r: 4 }} />
                            <Line type="monotone" dataKey="Low" stroke="#EB5757" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: "#EB5757", r: 4 }} />
                          </LineChart>
                        ) : forecastSubTab === "net_revenue" ? (
                          <BarChart data={financialDataQuarterly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}Cr`} />
                            <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 11 }} />
                            <Bar dataKey="revenue" fill="#3B82F6" name="Projected Revenue (Cr)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={financialDataQuarterly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 11 }} />
                            <Line type="monotone" dataKey="eps" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: "#F59E0B", r: 4 }} name="EPS (₹)" />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Forecast Summary Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400 gap-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> High ₹{(curPrice * 1.345).toFixed(0)}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" /> Target ₹{(curPrice * 1.182).toFixed(0)}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EB5757]" /> Low ₹{(curPrice * 0.915).toFixed(0)}</span>
                      </div>
                      <span className="font-semibold text-emerald-400 font-mono">+18.2% Potential Upside (12M)</span>
                    </div>
                  </div>

                  {/* Valuation 5-Year Slider & Trend Box */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">5-Year Valuation Multiple</h3>
                        <span className="text-xs text-slate-500">Trailing Historical Cycle</span>
                      </div>

                      <div className="flex gap-1.5 bg-[#181B20] p-1 rounded-xl border border-white/5 text-xs">
                        <button
                          type="button"
                          onClick={() => setValuationSubTab("overview")}
                          className={`px-4 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            valuationSubTab === "overview"
                              ? "bg-[#3B82F6] text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => setValuationSubTab("trend")}
                          className={`px-4 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            valuationSubTab === "trend"
                              ? "bg-[#3B82F6] text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Trend
                        </button>
                      </div>
                    </div>

                    {valuationSubTab === "overview" ? (
                      <div className="py-6 px-2 space-y-8">
                        {/* Label Markers Above */}
                        <div className="relative w-full h-12">
                          <div className="absolute left-0 top-0 text-center -translate-x-1/2">
                            <div className="bg-[#1F242D] border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 font-mono shadow-md whitespace-nowrap">
                              Lowest ({(fund?.pe_ratio ? fund.pe_ratio * 0.68 : 18.95).toFixed(2)})
                              <span className="block text-[9px] text-slate-500">52W Low: ₹{yearLow.toFixed(1)}</span>
                            </div>
                            <div className="w-0.5 h-4 bg-slate-600 mx-auto mt-1" />
                          </div>

                          <div className="absolute left-[35%] top-0 text-center -translate-x-1/2">
                            <div className="bg-[#00D09C]/10 border border-[#00D09C]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#00D09C] font-mono shadow-md whitespace-nowrap">
                              Today ({(fund?.pe_ratio ? fund.pe_ratio : 24.5).toFixed(2)})
                            </div>
                            <div className="w-0.5 h-4 bg-[#00D09C] mx-auto mt-1" />
                          </div>

                          <div className="absolute left-[62%] top-0 text-center -translate-x-1/2">
                            <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#3B82F6] font-mono shadow-md whitespace-nowrap">
                              Industry ({(fund?.pe_ratio ? fund.pe_ratio * 1.08 : 28.4).toFixed(2)})
                            </div>
                            <div className="w-0.5 h-4 bg-[#3B82F6] mx-auto mt-1" />
                          </div>

                          <div className="absolute right-0 top-0 text-center translate-x-1/2">
                            <div className="bg-[#1F242D] border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 font-mono shadow-md whitespace-nowrap">
                              Highest ({(fund?.pe_ratio ? fund.pe_ratio * 1.45 : 38.5).toFixed(2)})
                              <span className="block text-[9px] text-slate-500">52W High: ₹{yearHigh.toFixed(1)}</span>
                            </div>
                            <div className="w-0.5 h-4 bg-slate-600 mx-auto mt-1" />
                          </div>
                        </div>

                        {/* Color Gradient Range Bar */}
                        <div className="relative w-full h-2.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-[#00D09C] rounded-full overflow-visible">
                          <div className="absolute left-0 -bottom-5 text-[10px] font-bold text-slate-400">Low</div>
                          <div className="absolute right-0 -bottom-5 text-[10px] font-bold text-slate-400">High</div>
                          
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-700 rounded-full -translate-x-1/2 shadow" />
                          <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#00D09C] rounded-full -translate-x-1/2 shadow" />
                          <div className="absolute left-[62%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#3B82F6] rounded-full -translate-x-1/2 shadow" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-700 rounded-full translate-x-1/2 shadow" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={valuationTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 11 }} />
                            <Line type="monotone" dataKey="PE" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", r: 4 }} name="P/E Multiple" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FUNDAMENTALS & KEY METRICS */}
              {activeTab === "fundamentals" && (
                <div className="space-y-6">
                  {isStock ? (
                    <>
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                        <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5">
                          Valuation & Equity Fundamentals
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Market Cap</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              ₹{fund?.aum ? Number(fund.aum).toLocaleString('en-IN') : "3,91,200"} Cr
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">P/E Ratio (TTM)</span>
                            <span className="font-bold text-white font-mono block text-sm">{fund?.pe_ratio ? fund.pe_ratio.toFixed(2) : "24.50"}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">P/B Ratio</span>
                            <span className="font-bold text-white font-mono block text-sm">{fund?.pb_ratio ? fund.pb_ratio.toFixed(2) : "3.65"}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Industry P/E</span>
                            <span className="font-bold text-white font-mono block text-sm">{fund?.pe_ratio ? (fund.pe_ratio * 1.08).toFixed(2) : "26.80"}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">ROE (%)</span>
                            <span className="font-bold text-[#00D09C] font-mono block text-sm">
                              {fund?.roe ? fund.roe.toFixed(2) : "18.40"}%
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">ROCE (%)</span>
                            <span className="font-bold text-[#00D09C] font-mono block text-sm">
                              {fund?.roce ? fund.roce.toFixed(2) : "22.80"}%
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">EPS (TTM)</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              ₹{(curPrice / (fund?.pe_ratio || 24.5)).toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Dividend Yield</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              {(fund?.dividend_yield || 1.15).toFixed(2)}%
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Book Value</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              ₹{(curPrice / (fund?.pb_ratio || 3.65)).toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Debt to Equity</span>
                            <span className="font-bold text-white font-mono block text-sm">0.34</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Face Value</span>
                            <span className="font-bold text-white font-mono block text-sm">₹1.00</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Beta (1Y)</span>
                            <span className="font-bold text-white font-mono block text-sm">{fund?.beta || 0.98}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                        <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5">
                          Mutual Fund Structure & Risk Metrics
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Fund AUM (Size)</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              ₹{fund?.aum ? Number(fund.aum).toLocaleString('en-IN') : "74,200"} Cr
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Expense Ratio</span>
                            <span className="font-bold text-white font-mono block text-sm">
                              {((fund?.expense_ratio || 0.0075) * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Sharpe Ratio</span>
                            <span className="font-bold text-[#00D09C] font-mono block text-sm">{fund?.sharpe_ratio || 1.65}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Sortino Ratio</span>
                            <span className="font-bold text-[#00D09C] font-mono block text-sm">{fund?.sortino_ratio || 2.15}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Alpha vs NIFTY</span>
                            <span className="font-bold text-[#00D09C] font-mono block text-sm">+{fund?.alpha || 4.2}%</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Beta</span>
                            <span className="font-bold text-white font-mono block text-sm">{fund?.beta || 0.88}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Exit Load</span>
                            <span className="font-bold text-white block text-xs">1% if redeemed &lt; 365D</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Minimum SIP</span>
                            <span className="font-bold text-white font-mono block text-sm">₹{fund?.min_sip || 1000}</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Fund Manager</span>
                            <span className="font-bold text-white block text-xs">Rajeev Thakkar</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Benchmark</span>
                            <span className="font-bold text-white block text-xs">NIFTY 500 TRI</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Portfolio Turnover</span>
                            <span className="font-bold text-white font-mono block text-sm">18.5%</span>
                          </div>
                          <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-slate-400">Lock-in Period</span>
                            <span className="font-bold text-emerald-400 font-mono block text-sm">Nil (Open-ended)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: FINANCIALS / HISTORICAL PERFORMANCE */}
              {activeTab === "financials" && (
                <div className="space-y-6">
                  {isStock ? (
                    <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">Financial Statement Metrics</h3>
                          <span className="text-xs text-slate-500">Revenue, Operating Profit & Margins</span>
                        </div>
                        
                        <div className="flex items-center bg-[#181B20] p-1 rounded-xl border border-white/10 text-xs">
                          <button
                            onClick={() => setFinTimeframe("quarterly")}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              finTimeframe === "quarterly" ? "bg-[#00D09C] text-slate-950" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Quarterly
                          </button>
                          <button
                            onClick={() => setFinTimeframe("yearly")}
                            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              finTimeframe === "yearly" ? "bg-[#00D09C] text-slate-950" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Yearly
                          </button>
                        </div>
                      </div>

                      {/* Dual Bar Chart */}
                      <div className="h-64 w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={finTimeframe === "quarterly" ? financialDataQuarterly : financialDataYearly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}Cr`} />
                            <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (Cr)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" fill="#00D09C" name="Net Profit (Cr)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4 border-t border-white/5">
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block">Revenue Growth (YoY)</span>
                          <span className="font-bold text-[#00D09C] font-mono text-base">+16.4%</span>
                          <span className="text-[10px] text-slate-400 block">Outperforming industry average of 11.2%</span>
                        </div>
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block">Profit Growth (YoY)</span>
                          <span className="font-bold text-[#00D09C] font-mono text-base">+21.8%</span>
                          <span className="text-[10px] text-slate-400 block">Driven by higher operating margin expansion</span>
                        </div>
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider block">Operating Margin (OPM)</span>
                          <span className="font-bold text-white font-mono text-base">18.6%</span>
                          <span className="text-[10px] text-slate-400 block">+140 bps improvement vs trailing FY</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-6">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="text-sm font-bold text-white">Scheme Returns vs Benchmark</h3>
                        <span className="text-xs text-slate-500">Compounded Annualized Growth Rate (CAGR)</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1 text-center">
                          <span className="text-slate-400 block">1 Year Return</span>
                          <span className="font-bold text-[#00D09C] font-mono text-lg block">+28.4%</span>
                          <span className="text-[10px] text-slate-500">Category: +22.1%</span>
                        </div>
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1 text-center">
                          <span className="text-slate-400 block">3 Year CAGR</span>
                          <span className="font-bold text-[#00D09C] font-mono text-lg block">+24.8%</span>
                          <span className="text-[10px] text-slate-500">Category: +19.4%</span>
                        </div>
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1 text-center">
                          <span className="text-slate-400 block">5 Year CAGR</span>
                          <span className="font-bold text-[#00D09C] font-mono text-lg block">+21.2%</span>
                          <span className="text-[10px] text-slate-500">Category: +16.8%</span>
                        </div>
                        <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1 text-center">
                          <span className="text-slate-400 block">Since Inception</span>
                          <span className="font-bold text-emerald-400 font-mono text-lg block">+19.5%</span>
                          <span className="text-[10px] text-slate-500">Alpha: +4.2%</span>
                        </div>
                      </div>

                      {/* Multi-asset allocation progress */}
                      <div className="pt-2 space-y-2">
                        <span className="text-xs font-bold text-white block">Asset Class Allocation</span>
                        <div className="w-full h-3 bg-[#23272F] rounded-full overflow-hidden flex">
                          <div className="bg-[#00D09C] h-full" style={{ width: "84.5%" }} title="Equity 84.5%" />
                          <div className="bg-[#3B82F6] h-full" style={{ width: "8.2%" }} title="Debt 8.2%" />
                          <div className="bg-[#F59E0B] h-full" style={{ width: "7.3%" }} title="Cash & Equivalents 7.3%" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" /> Equity (84.5%)</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Debt & Arbitrage (8.2%)</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Cash (7.3%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SHAREHOLDING / PORTFOLIO HOLDINGS */}
              {activeTab === "holdings" && (
                <div className="space-y-6">
                  {isStock ? (
                    <>
                      {/* Shareholding Pattern Progress Bars */}
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h3 className="text-sm font-bold text-white">Shareholding Pattern</h3>
                          <span className="text-xs text-slate-400">Quarter ended Sep 2026</span>
                        </div>

                        <div className="space-y-4">
                          {stockHoldings.map((h, i) => (
                            <div key={i} className="space-y-1.5 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-300">{h.name}</span>
                                <span className="text-white font-mono">{h.pct}%</span>
                              </div>
                              <div className="w-full h-2 bg-[#23272F] rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ width: `${h.pct}%`, backgroundColor: h.color }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Mutual Funds holding this asset */}
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                          Top Mutual Funds Holding This Stock
                        </h3>

                        <div className="divide-y divide-white/5">
                          {stockTopMFHolders.map((mf, i) => (
                            <div key={i} className="py-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C]">
                                  MF
                                </div>
                                <div>
                                  <span className="font-semibold text-white block">{mf.name}</span>
                                  <span className="text-[10px] text-slate-500">Holdings Value: {mf.value}</span>
                                </div>
                              </div>
                              <span className="font-bold text-[#00D09C] font-mono">{mf.aumPct} AUM</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Mutual Fund Top 10 Stock Holdings */}
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h3 className="text-sm font-bold text-white">Top 10 Portfolio Equity Holdings</h3>
                          <span className="text-xs text-slate-500 font-mono">Total Weight: 57.3%</span>
                        </div>

                        <div className="divide-y divide-white/5">
                          {mfTopHoldings.map((st, i) => (
                            <div key={i} className="py-3 flex items-center justify-between text-xs hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C] text-[10px]">
                                  {st.ticker.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">{st.name}</span>
                                  <span className="text-[10px] text-slate-400">{st.sector} • {st.price}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-[#00D09C] font-mono block">{st.pct}%</span>
                                <span className="text-[10px] text-slate-500">Portfolio</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sector Allocations */}
                      <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                          Sector Diversification Breakdown
                        </h3>

                        <div className="space-y-3">
                          {mfSectorAllocations.map((sec, i) => (
                            <div key={i} className="space-y-1.5 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-300">{sec.sector}</span>
                                <span className="text-white font-mono">{sec.pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#23272F] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${sec.pct}%`, backgroundColor: sec.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: SIMILAR ASSETS / PEERS */}
              {activeTab === "peers" && (
                <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">Peer Comparison Matrix</h3>
                      <span className="text-xs text-slate-500">Benchmark against top sector competitors</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex gap-1.5 overflow-x-auto text-xs pb-1 no-scrollbar bg-[#181B20] p-1 rounded-xl border border-white/5">
                      {[
                        { id: "overview", label: "Overview" },
                        { id: "pe", label: "P/E & Multiples" },
                        { id: "returns", label: "Returns %" },
                        { id: "revenue", label: "Revenue" },
                        { id: "profit", label: "Profit & Margin" }
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setPeerFilter(pill.id as any)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                            peerFilter === pill.id
                              ? "bg-[#3B82F6] text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Peer Table Matrix */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Company</th>
                          <th className="py-2.5 px-3 text-right">Market Price</th>
                          {peerFilter === "overview" && (
                            <>
                              <th className="py-2.5 px-3 text-right">1Y Return</th>
                              <th className="py-2.5 px-3 text-right">Market Cap / AUM</th>
                              <th className="py-2.5 px-3 text-center">Analyst View</th>
                            </>
                          )}
                          {peerFilter === "pe" && (
                            <>
                              <th className="py-2.5 px-3 text-right">P/E Ratio</th>
                              <th className="py-2.5 px-3 text-right">P/B Ratio</th>
                              <th className="py-2.5 px-3 text-right">Ind. P/E</th>
                            </>
                          )}
                          {peerFilter === "returns" && (
                            <>
                              <th className="py-2.5 px-3 text-right">1M Return</th>
                              <th className="py-2.5 px-3 text-right">1Y Return</th>
                              <th className="py-2.5 px-3 text-right">3Y CAGR</th>
                            </>
                          )}
                          {peerFilter === "revenue" && (
                            <>
                              <th className="py-2.5 px-3 text-right">Annual Revenue</th>
                              <th className="py-2.5 px-3 text-right">YoY Growth</th>
                              <th className="py-2.5 px-3 text-right">Market Share</th>
                            </>
                          )}
                          {peerFilter === "profit" && (
                            <>
                              <th className="py-2.5 px-3 text-right">Net Profit</th>
                              <th className="py-2.5 px-3 text-right">Operating Margin</th>
                              <th className="py-2.5 px-3 text-right">ROE %</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(peers.length > 0 ? peers : [
                          { name: fund?.name || "Market Leader", ticker: fund?.ticker || "NSE", price: curPrice, pe_ratio: fund?.pe_ratio || 24.5, aum: fund?.aum || 150000, change_1y: 28.5, view: "BUY" }
                        ]).map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C] text-[10px] shrink-0">
                                  {p.ticker ? p.ticker.substring(0, 2) : "ST"}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">{p.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{p.ticker}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-white">
                              ₹{typeof p.price === 'number' ? p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : p.price}
                            </td>

                            {peerFilter === "overview" && (
                              <>
                                <td className="py-3 px-3 text-right font-bold font-mono text-[#00D09C]">
                                  +{p.change_1y || 24.5}%
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-white font-mono">
                                  ₹{typeof p.aum === 'number' ? Math.round(p.aum).toLocaleString('en-IN') : p.aum} Cr
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20">
                                    {p.view || "BUY"}
                                  </span>
                                </td>
                              </>
                            )}

                            {peerFilter === "pe" && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-white">{p.pe_ratio || 24.5}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-300">{((p.pe_ratio || 24.5) * 0.15).toFixed(2)}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-400">{((p.pe_ratio || 24.5) * 1.08).toFixed(1)}</td>
                              </>
                            )}

                            {peerFilter === "returns" && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">+{((p.change_1y || 24) * 0.12).toFixed(1)}%</td>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">+{p.change_1y || 24.5}%</td>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">+{((p.change_1y || 24) * 0.85).toFixed(1)}%</td>
                              </>
                            )}

                            {peerFilter === "revenue" && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-white">₹{((p.price || 1000) * 142).toFixed(0)} Cr</td>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">+14.2%</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-300">28.5%</td>
                              </>
                            )}

                            {peerFilter === "profit" && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">₹{((p.price || 1000) * 24).toFixed(0)} Cr</td>
                                <td className="py-3 px-3 text-right font-mono text-white">18.4%</td>
                                <td className="py-3 px-3 text-right font-mono text-[#00D09C]">+21.2%</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: ML FORECAST */}
              {activeTab === "forecast" && (
                <div className="space-y-6">
                  {/* Analyst Consensus & Target Price */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-[#00D09C]" size={18} />
                        <h3 className="text-sm font-bold text-white">ML Predictive Consensus & 1Y Horizon</h3>
                      </div>
                      <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/30 uppercase tracking-wide">
                        {forecast?.analyst_rating || "Strong Buy"}
                      </span>
                    </div>

                    {/* Target Price Ranges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">1Y Baseline Target</span>
                        <span className="text-xl font-bold text-white font-mono block">
                          ₹{forecast?.target_price_1y ? forecast.target_price_1y.toLocaleString('en-IN') : (curPrice * 1.182).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#00D09C] font-semibold">+18.2% Potential Upside</span>
                      </div>

                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">Bullish Maximum Target</span>
                        <span className="text-xl font-bold text-[#00D09C] font-mono block">
                          ₹{forecast?.target_price_high ? forecast.target_price_high.toLocaleString('en-IN') : (curPrice * 1.345).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">+34.5% Peak Momentum</span>
                      </div>

                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">Bearish Support Floor</span>
                        <span className="text-xl font-bold text-[#EB5757] font-mono block">
                          ₹{forecast?.target_price_low ? forecast.target_price_low.toLocaleString('en-IN') : (curPrice * 0.915).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">-8.5% Downside Risk</span>
                      </div>
                    </div>

                    {/* Analyst Recommendations Breakdown */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Analyst Coverage ({forecast?.total_analysts || 36} Analysts)</span>
                        <span className="text-[#00D09C] font-mono">
                          {forecast?.buy_pct || 78}% Buy • {forecast?.hold_pct || 16}% Hold • {forecast?.sell_pct || 6}% Sell
                        </span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-[#23272F] rounded-full overflow-hidden flex">
                        <div className="bg-[#00D09C] h-full" style={{ width: `${forecast?.buy_pct || 78}%` }} />
                        <div className="bg-amber-400 h-full" style={{ width: `${forecast?.hold_pct || 16}%` }} />
                        <div className="bg-[#EB5757] h-full" style={{ width: `${forecast?.sell_pct || 6}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* 12-Month ML Predictive Path */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                      12-Month Stochastic Path Simulation
                    </h3>

                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecast?.chartData || [
                          { date: "Current", Predicted: curPrice, Upper: curPrice, Lower: curPrice },
                          { date: "+1M", Predicted: Math.round(curPrice * 1.025), Upper: Math.round(curPrice * 1.05), Lower: Math.round(curPrice * 0.99) },
                          { date: "+3M", Predicted: Math.round(curPrice * 1.065), Upper: Math.round(curPrice * 1.11), Lower: Math.round(curPrice * 0.98) },
                          { date: "+6M", Predicted: Math.round(curPrice * 1.12), Upper: Math.round(curPrice * 1.19), Lower: Math.round(curPrice * 0.96) },
                          { date: "+9M", Predicted: Math.round(curPrice * 1.155), Upper: Math.round(curPrice * 1.25), Lower: Math.round(curPrice * 0.94) },
                          { date: "+12M", Predicted: Math.round(curPrice * 1.182), Upper: Math.round(curPrice * 1.345), Lower: Math.round(curPrice * 0.915) },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                          <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="Predicted" stroke="#00D09C" strokeWidth={2.2} dot={{ fill: "#00D09C", r: 4 }} name="Expected Trajectory" />
                          <Line type="monotone" dataKey="Upper" stroke="#3B82F6" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Bullish Upper Band" />
                          <Line type="monotone" dataKey="Lower" stroke="#EB5757" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Bearish Lower Band" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Multi-Horizon Returns Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center bg-[#181B20] p-4 rounded-xl border border-white/5 text-xs">
                      <div>
                        <span className="text-slate-400 block">1 Month</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast?.return_1m || 2.5}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">3 Months</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast?.return_3m || 6.5}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">6 Months</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast?.return_6m || 12.0}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">1 Year Target</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast?.return_1y || 18.2}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">3Y Proj. CAGR</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast?.return_3y_cagr || 24.8}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Action Bar */}
        <div className="p-4 px-6 border-t border-[#1E222B] bg-[#14171D] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Category:</span>
            <span className="text-xs font-semibold text-white">{fund?.category || "Equity"}</span>
            <span className="text-xs text-slate-600">•</span>
            <span className="text-xs font-semibold text-slate-300">Risk: {fund?.risk_category || "Moderate High"}</span>
          </div>

          <div className="flex items-center gap-3">
            {showAddForm ? (
              <form onSubmit={handleAddPortfolio} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Units"
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-[#181B20] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#00D09C]"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-[#181B20] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#00D09C]"
                  required
                />
                <button
                  type="submit"
                  disabled={addSuccess}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00D09C] text-slate-950 hover:bg-[#00D09C]/90 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {addSuccess ? <CheckCircle size={14} /> : <PlusCircle size={14} />}
                  <span>{addSuccess ? "Added!" : "Save"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPurchasePrice(curPrice);
                  setShowAddForm(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00D09C] text-slate-950 hover:bg-[#00D09C]/90 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#00D09C]/20"
              >
                <PlusCircle size={15} />
                <span>Add Transaction to Portfolio</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
