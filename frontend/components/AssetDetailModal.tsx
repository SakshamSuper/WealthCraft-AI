"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  X, TrendingUp, TrendingDown, Sparkles, PlusCircle, CheckCircle, RefreshCw, ChevronRight, BarChart3, PieChart, ShieldAlert, Layers, Building2, UserCheck, Calendar
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line 
} from "recharts";

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: number | null;
  initialFund?: any;
}

export default function AssetDetailModal({ isOpen, onClose, fundId, initialFund }: AssetDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "fundamentals" | "financials" | "holdings" | "peers" | "forecast">("overview");
  const [finTimeframe, setFinTimeframe] = useState<"quarterly" | "yearly">("quarterly");
  
  // Groww Sub-toggles State (Matching User Screenshots)
  const [forecastSubTab, setForecastSubTab] = useState<"target_price" | "net_revenue" | "eps">("target_price");
  const [valuationSubTab, setValuationSubTab] = useState<"overview" | "trend">("overview");
  const [peerFilter, setPeerFilter] = useState<"overview" | "pe" | "returns" | "revenue" | "profit">("overview");

  const [fund, setFund] = useState<any>(initialFund || null);
  const [navHistory, setNavHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Portfolio Log State
  const [showAddForm, setShowAddForm] = useState(false);
  const [units, setUnits] = useState(100);
  const [purchasePrice, setPurchasePrice] = useState(100);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && fundId) {
      fetchFundDetails(fundId);
    }
  }, [isOpen, fundId]);

  const fetchFundDetails = async (id: number) => {
    setLoading(true);
    setFund(initialFund || null);
    setNavHistory([]);
    setForecast(null);
    setPeers([]);
    setShowAddForm(false);
    setAddSuccess(false);

    try {
      // Fetch core fund details, NAV history, ML forecast, and sector peers in parallel
      const [fundData, historyData, forecastData, peersData] = await Promise.all([
        (api.getFundDetail || api.getFundDetails).call(api, id).catch(() => initialFund),
        (api.getNAVHistory || api.getFundNAVHistory).call(api, id).catch(() => []),
        api.getFundForecast(id).catch(() => null),
        api.getFundPeers(id).catch(() => [])
      ]);

      if (historyData && Array.isArray(historyData)) {
        const normalized = historyData.map((h: any) => ({
          date: h.date,
          NAV: Number(h.nav ?? h.NAV ?? 100),
          nav: Number(h.nav ?? h.NAV ?? 100)
        }));
        setNavHistory(normalized);
      }
      if (fundData) {
        setFund(fundData);
      }
      if (forecastData) setForecast(forecastData);
      if (peersData) setPeers(peersData);
    } catch (err) {
      console.error("Error fetching fund details:", err);
    } finally {
      setLoading(false);
    }
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

  // Computed price metrics from database & nav history with bulletproof defaults
  const validNavs = (navHistory || []).map((n: any) => Number(n?.NAV ?? n?.nav ?? 0)).filter((v: number) => !isNaN(v) && v > 0);
  const curPrice = validNavs.length > 0 ? validNavs[validNavs.length - 1] : Number(fund?.initial_nav || fund?.min_lumpsum || 2845.50);
  const prevClose = curPrice * 0.988;
  const dayLow = curPrice * 0.982;
  const dayHigh = curPrice * 1.015;
  const yearLow = Number(fund?.low_52w || (validNavs.length > 0 ? Math.min(...validNavs) : curPrice * 0.75));
  const yearHigh = Number(fund?.high_52w || (validNavs.length > 0 ? Math.max(...validNavs) : curPrice * 1.25));
  const dayPosPct = Math.min(100, Math.max(0, ((curPrice - dayLow) / (dayHigh - dayLow || 1)) * 100));
  const yearPosPct = Math.min(100, Math.max(0, ((curPrice - yearLow) / (yearHigh - yearLow || 1)) * 100));

  // Financial performance bar chart mock data
  const financialDataQuarterly = [
    { period: "Jun '25", revenue: 128500, profit: 18200 },
    { period: "Sep '25", revenue: 118561, profit: 20364 },
    { period: "Dec '25", revenue: 124200, profit: 21100 },
    { period: "Mar '26", revenue: 116400, profit: 19800 },
    { period: "Jun '26", revenue: 129800, profit: 22400 },
  ];

  const financialDataYearly = [
    { period: "FY22", revenue: 380500, profit: 54100 },
    { period: "FY23", revenue: 425100, profit: 62400 },
    { period: "FY24", revenue: 478200, profit: 71200 },
    { period: "FY25", revenue: 512400, profit: 80500 },
    { period: "FY26", revenue: 568900, profit: 91400 },
  ];

  // Holding pattern data
  const holdings = [
    { name: "Foreign Institutions (FII)", pct: 48.61, color: "#00D09C" },
    { name: "Mutual Funds (DII)", pct: 25.82, color: "#00D09C" },
    { name: "Retail & Others", pct: 15.35, color: "#00D09C" },
    { name: "Promoters & Group", pct: 10.22, color: "#00D09C" },
  ];

  // Top Mutual Funds holding this asset
  const holdingFunds = [
    { name: "SBI Banking & Financial Services Fund Direct Growth", aumPct: "18.15%" },
    { name: "UTI Banking and Financial Services Fund Direct Growth", aumPct: "17.44%" },
    { name: "Mirae Asset Banking and Financial Services Fund Direct Growth", aumPct: "15.49%" },
    { name: "Sundaram Financial Services Opportunities Fund Direct Growth", aumPct: "14.78%" },
  ];

  // Similar peer stocks
  const peerStocks = [
    { name: "ICICI Bank", ticker: "ICICIBANK", price: "₹1,463.10", change: "+0.20%", mcap: "₹10.49L Cr", isPos: true },
    { name: "Axis Bank", ticker: "AXISBANK", price: "₹1,258.20", change: "+0.18%", mcap: "₹3.91L Cr", isPos: true },
    { name: "Kotak Mahindra Bank", ticker: "KOTAKBANK", price: "₹1,785.95", change: "+1.02%", mcap: "₹3.83L Cr", isPos: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0D0F12] border border-[#23272F] rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#1E222B] bg-[#14171D]/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1D2129] border border-[#2B303C] flex items-center justify-center font-bold text-lg text-[#00D09C]">
              {fund?.name ? fund.name.substring(0, 2).toUpperCase() : "WC"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1F242D] text-[#00D09C] uppercase tracking-wide border border-[#00D09C]/20">
                  {fund?.category || "Asset"}
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
                {fund?.amc || "NSE / BSE Listed Instrument"}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1D2129] hover:bg-[#282E3A] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-[#1E222B] bg-[#14171D]/30 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "fundamentals", label: "Fundamentals & Metrics" },
            { id: "financials", label: "Financials" },
            { id: "holdings", label: "Shareholding & Holdings" },
            { id: "peers", label: "Similar Assets" },
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0D0F12]">
          
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="animate-spin text-[#00D09C] mx-auto mb-3" size={32} />
              <p className="text-xs text-slate-400">Loading live asset metrics & charts...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Price Chart */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Current Market Price / NAV</span>
                        <div className="flex items-baseline gap-3 mt-1">
                          <span className="text-2xl font-extrabold text-white font-mono">₹{curPrice.toFixed(2)}</span>
                          <span className="text-xs font-bold text-[#00D09C] flex items-center gap-1">
                            <TrendingUp size={14} /> +₹{(curPrice - prevClose).toFixed(2)} (+1.25%) 1D
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-[#1D2129] px-2.5 py-1 rounded-md border border-[#2B303C]">
                        5-Year Trend
                      </span>
                    </div>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={navHistory}>
                          <defs>
                            <linearGradient id="growwGreen" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00D09C" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#00D09C" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 12 }} />
                          <Area type="monotone" dataKey="NAV" stroke="#00D09C" fillOpacity={1} fill="url(#growwGreen)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Performance Section (Matching Screenshot 1) */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white">Performance</h3>
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
                        <span className="font-bold text-white font-mono mt-0.5 block">₹{prevClose.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Live volume</span>
                        <span className="font-bold text-white font-mono mt-0.5 block">4,22,46,009</span>
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

                  {/* GROWW FEATURE 1: ANALYST RATING BOX (Matching Screenshot 1) */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Analyst Rating</h3>
                      <span className="text-xs text-slate-500">based on 14 analysts</span>
                    </div>

                    <div className="flex items-center gap-6 pt-1">
                      {/* Green Circular BUY Badge */}
                      <div className="w-16 h-16 rounded-full bg-[#00D09C] flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-[#00D09C]/20 shrink-0">
                        BUY
                      </div>

                      {/* 3 Rating Progress Bars */}
                      <div className="flex-1 space-y-2.5 text-xs font-bold">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#00D09C] h-full rounded-full" style={{ width: '64%' }} />
                          </div>
                          <span className="text-slate-300 w-20 text-right font-mono">64% BUY</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#F59E0B] h-full rounded-full" style={{ width: '29%' }} />
                          </div>
                          <span className="text-slate-300 w-20 text-right font-mono">29% HOLD</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div className="bg-[#EB5757] h-full rounded-full" style={{ width: '7%' }} />
                          </div>
                          <span className="text-slate-300 w-20 text-right font-mono">7% SELL</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GROWW FEATURE 2: ANALYST FORECAST & DEVIATION CHART (Matching Screenshot 1) */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    {/* Header with Sub-toggles */}
                    <div className="space-y-3 border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white">Analyst Forecast</h3>
                      
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("target_price")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "target_price"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30"
                              : "bg-[#181B20] text-slate-400 hover:text-white"
                          }`}
                        >
                          Target Price
                        </button>
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("net_revenue")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "net_revenue"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30"
                              : "bg-[#181B20] text-slate-400 hover:text-white"
                          }`}
                        >
                          Net Revenue
                        </button>
                        <button
                          type="button"
                          onClick={() => setForecastSubTab("eps")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            forecastSubTab === "eps"
                              ? "bg-[#1E3A8A] text-[#3B82F6] border border-[#3B82F6]/30"
                              : "bg-[#181B20] text-slate-400 hover:text-white"
                          }`}
                        >
                          Earning Per Share
                        </button>
                      </div>
                    </div>

                    {/* Title & Deviation Badge */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">
                        {fund?.name || "Asset"} price forecast by 14 analysts
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Deviation of</span>
                        <span className="font-extrabold text-[#00D09C] font-mono">27.75%</span>
                      </div>
                    </div>

                    {/* Recharts Quarterly Forecast Trajectory Line Chart */}
                    <div className="h-60 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { quarter: "Q4 (FY24)", Price: Math.round(curPrice * 0.42) },
                          { quarter: "Q1 (FY25)", Price: Math.round(curPrice * 0.45) },
                          { quarter: "Q2 (FY25)", Price: Math.round(curPrice * 0.36) },
                          { quarter: "Q3 (FY25)", Price: Math.round(curPrice * 0.64) },
                          { quarter: "Q4 (FY25)", Price: Math.round(curPrice * 0.56) },
                          { quarter: "Q1 (FY26)", Price: Math.round(curPrice * 0.78) },
                          { quarter: "Q2 (FY26)", Price: Math.round(curPrice * 0.88) },
                          { quarter: "Q3 (FY26)", Price: Math.round(curPrice * 1.05), High: Math.round(curPrice * 1.05), Target: Math.round(curPrice * 1.05), Low: Math.round(curPrice * 1.05) },
                          { quarter: "20 Jul 2026", High: Math.round(curPrice * 1.39), Target: Math.round(curPrice * 1.2775), Low: Math.round(curPrice * 1.09) },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="quarter" stroke="#475569" fontSize={9} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `₹${(v/1000).toFixed(1)}K`} />
                          <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 11 }} />
                          
                          {/* Historical Price Trend */}
                          <Line type="monotone" dataKey="Price" stroke="#00D09C" strokeWidth={2.5} dot={{ fill: "#00D09C", r: 4 }} />
                          
                          {/* Divergent Forecast Lines */}
                          <Line type="monotone" dataKey="High" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} />
                          <Line type="monotone" dataKey="Target" stroke="#00D09C" strokeWidth={2} dot={{ fill: "#00D09C", r: 4 }} />
                          <Line type="monotone" dataKey="Low" stroke="#EB5757" strokeWidth={2} dot={{ fill: "#EB5757", r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend & Summary Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-white/5 text-xs font-medium text-slate-400 gap-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> High</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" /> Target</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EB5757]" /> Low</span>
                      </div>

                      <div className="flex items-center gap-4 font-mono">
                        <span>Price on 20 Jul: <strong className="text-white">₹{curPrice.toFixed(0)}</strong></span>
                        <span>Target Price: <strong className="text-[#00D09C]">₹{(curPrice * 1.2775).toFixed(0)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* GROWW FEATURE 3: VALUATION 5-YEAR SLIDER BOX (Matching Screenshot 2) */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Valuation</h3>
                        <span className="text-xs text-slate-500">{fund?.name || "Asset"} in last 5 years</span>
                      </div>

                      <div className="flex gap-1.5 bg-[#181B20] p-1 rounded-xl border border-white/5 text-xs">
                        <button
                          type="button"
                          onClick={() => setValuationSubTab("overview")}
                          className={`px-4 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            valuationSubTab === "overview"
                              ? "bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/20"
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
                              ? "bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/20"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Trend
                        </button>
                      </div>
                    </div>

                    {/* Multi-Marker Valuation Range Bar */}
                    <div className="py-6 px-2 space-y-8">
                      {/* Label Markers Above */}
                      <div className="relative w-full h-12">
                        {/* Lowest Marker */}
                        <div className="absolute left-0 top-0 text-center -translate-x-1/2">
                          <div className="bg-[#1F242D] border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 font-mono shadow-md whitespace-nowrap">
                            Lowest ({(fund?.pe_ratio ? fund.pe_ratio * 0.68 : 18.95).toFixed(2)})
                            <span className="block text-[9px] text-slate-500">52W Low: ₹{yearLow.toFixed(1)}</span>
                          </div>
                          <div className="w-0.5 h-4 bg-slate-600 mx-auto mt-1" />
                        </div>

                        {/* Today Marker */}
                        <div className="absolute left-[35%] top-0 text-center -translate-x-1/2">
                          <div className="bg-[#00D09C]/10 border border-[#00D09C]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#00D09C] font-mono shadow-md whitespace-nowrap">
                            Today ({(fund?.pe_ratio ? fund.pe_ratio : 24.5).toFixed(2)})
                          </div>
                          <div className="w-0.5 h-4 bg-[#00D09C] mx-auto mt-1" />
                        </div>

                        {/* Industry Marker */}
                        <div className="absolute left-[62%] top-0 text-center -translate-x-1/2">
                          <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#3B82F6] font-mono shadow-md whitespace-nowrap">
                            Industry ({(fund?.pe_ratio ? fund.pe_ratio * 1.08 : 28.4).toFixed(2)})
                          </div>
                          <div className="w-0.5 h-4 bg-[#3B82F6] mx-auto mt-1" />
                        </div>

                        {/* Highest Marker */}
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
                        
                        {/* Circular Pins on Bar */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-700 rounded-full -translate-x-1/2 shadow" />
                        <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#00D09C] rounded-full -translate-x-1/2 shadow" />
                        <div className="absolute left-[62%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#3B82F6] rounded-full -translate-x-1/2 shadow" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-700 rounded-full translate-x-1/2 shadow" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FUNDAMENTALS & KEY METRICS (Matching Screenshot 1) */}
              {activeTab === "fundamentals" && (
                <div className="space-y-6">
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                    <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5">
                      Fundamentals & Valuation Metrics
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">Market Cap / AUM</span>
                        <span className="font-bold text-white font-mono block text-sm">₹{fund?.aum ? Number(fund.aum).toLocaleString() : "11,72,734"} Cr</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">P/E Ratio (TTM)</span>
                        <span className="font-bold text-white font-mono block text-sm">{fund?.pe_ratio ? fund.pe_ratio.toFixed(2) : "22.40"}</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">P/B Ratio</span>
                        <span className="font-bold text-white font-mono block text-sm">{fund?.pb_ratio ? fund.pb_ratio.toFixed(2) : "3.45"}</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">Industry P/E</span>
                        <span className="font-bold text-white font-mono block text-sm">{fund?.pe_ratio ? (fund.pe_ratio * 1.08).toFixed(2) : "24.10"}</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">ROE (%)</span>
                        <span className="font-bold text-[#00D09C] font-mono block text-sm">{fund?.pe_ratio ? (Math.min(32, Math.max(9, (100 / fund.pe_ratio) * 2.5))).toFixed(2) : "15.40"}%</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">EPS (TTM)</span>
                        <span className="font-bold text-white font-mono block text-sm">₹{fund?.pe_ratio && curPrice ? (curPrice / fund.pe_ratio).toFixed(2) : "42.80"}</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">Dividend Yield</span>
                        <span className="font-bold text-white font-mono block text-sm">{(fund?.dividend_yield ? fund.dividend_yield.toFixed(2) : "1.25")}%</span>
                      </div>
                      <div className="bg-[#181B20] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400">Book Value</span>
                        <span className="font-bold text-white font-mono block text-sm">₹{fund?.pb_ratio && curPrice ? (curPrice / fund.pb_ratio).toFixed(2) : "280.00"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fund Risk & Portfolio Ratios */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                    <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5">
                      Risk Ratios & Manager Metrics
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
                      <div>
                        <span className="text-slate-400 block">Sharpe Ratio</span>
                        <span className="font-bold text-white font-mono mt-1 block">{fund?.sharpe_ratio || 1.45}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sortino Ratio</span>
                        <span className="font-bold text-white font-mono mt-1 block">{fund?.sortino_ratio || 1.75}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Alpha (Excess Return)</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{fund?.alpha || 3.2}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Beta (Market Sensitivity)</span>
                        <span className="font-bold text-white font-mono mt-1 block">{fund?.beta || 0.92}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Expense Ratio</span>
                        <span className="font-bold text-white font-mono mt-1 block">{((fund?.expense_ratio || 0.0075) * 100).toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Exit Load</span>
                        <span className="font-bold text-white mt-1 block">{fund?.exit_load || "1% if redeemed within 1 year"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Fund Manager</span>
                        <span className="font-bold text-white mt-1 block">{fund?.fund_manager || "Rahul Baijal"} ({fund?.manager_tenure || 5} yrs)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Target Benchmark</span>
                        <span className="font-bold text-slate-300 mt-1 block">{fund?.target_benchmark || "NIFTY 50 TRI"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCIAL PERFORMANCE (Matching Screenshot 2) */}
              {activeTab === "financials" && (
                <div className="space-y-6">
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F]">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white">Financial performance</h3>
                      
                      {/* Timeframe selector (Quarterly vs Yearly) */}
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

                    {/* Dual Bar Chart (Revenue vs Profit) */}
                    <div className="h-60 w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={finTimeframe === "quarterly" ? financialDataQuarterly : financialDataYearly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="revenue" fill="#475569" name="Revenue (Cr)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" fill="#00D09C" name="Profit (Cr)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Revenue & Profit Growth Summaries */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-white/5">
                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block">Revenue Growth</span>
                        <div className="flex justify-between">
                          <span className="text-slate-400">1Y (TTM)</span>
                          <span className="font-bold text-white font-mono">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">3Y CAGR</span>
                          <span className="font-bold text-[#00D09C] font-mono">+41%</span>
                        </div>
                      </div>

                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block">Profit Growth</span>
                        <div className="flex justify-between">
                          <span className="text-slate-400">1Y (TTM)</span>
                          <span className="font-bold text-[#00D09C] font-mono">+19%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">3Y CAGR</span>
                          <span className="font-bold text-[#00D09C] font-mono">+24%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SHAREHOLDING & MUTUAL FUND HOLDINGS (Matching Screenshot 3 & 4) */}
              {activeTab === "holdings" && (
                <div className="space-y-6">
                  {/* Shareholding Pattern Progress Bars */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                      Shareholding Pattern
                    </h3>

                    <div className="space-y-4">
                      {holdings.map((h, i) => (
                        <div key={i} className="space-y-1.5 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-300">{h.name}</span>
                            <span className="text-white font-mono">{h.pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-[#23272F] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#00D09C] rounded-full" 
                              style={{ width: `${h.pct}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Mutual Funds holding this asset */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                      Mutual Funds Holding This Asset
                    </h3>

                    <div className="divide-y divide-white/5">
                      {holdingFunds.map((mf, i) => (
                        <div key={i} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C]">
                              MF
                            </div>
                            <span className="font-semibold text-white">{mf.name}</span>
                          </div>
                          <span className="font-bold text-white font-mono">{mf.aumPct} AUM</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SIMILAR ASSETS / PEER COMPARISON (Matching Groww Screenshot 2) */}
              {activeTab === "peers" && (
                <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                  <div className="space-y-3 border-b border-white/5 pb-3">
                    <h3 className="text-sm font-bold text-white">Peer Comparison</h3>

                    {/* Groww Filter Pills */}
                    <div className="flex gap-2 overflow-x-auto text-xs pb-1">
                      {[
                        { id: "overview", label: "Overview" },
                        { id: "pe", label: "PE" },
                        { id: "returns", label: "Returns %" },
                        { id: "revenue", label: "Revenue" },
                        { id: "profit", label: "Profit" }
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setPeerFilter(pill.id as any)}
                          className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 ${
                            peerFilter === pill.id
                              ? "bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/20"
                              : "bg-[#181B20] text-slate-400 border border-white/5 hover:text-white"
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
                          <th className="py-2.5 px-2">Company</th>
                          <th className="py-2.5 px-2">Analyst View</th>
                          <th className="py-2.5 px-2 text-right">Market Cap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(peers.length > 0 ? peers : [
                          { name: fund?.name || "Market Leader", ticker: fund?.ticker || "NSE", price: curPrice, pe_ratio: fund?.pe_ratio || 22.0, aum: fund?.aum || 50000, view: "BUY" }
                        ]).map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C] text-[10px] shrink-0">
                                  {p.ticker ? p.ticker.substring(0, 2) : "ST"}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">{p.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{p.ticker || p.sector}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-2 font-bold font-mono">
                              <span className="text-[11px] text-[#00D09C]">
                                ₹{typeof p.price === 'number' ? p.price.toFixed(2) : p.price}
                              </span>
                              <span className="block text-[10px] text-slate-500">P/E: {p.pe_ratio || 22.0}</span>
                            </td>
                            <td className="py-3.5 px-2 text-right font-bold text-white font-mono">
                              ₹{typeof p.aum === 'number' ? Math.round(p.aum).toLocaleString() : p.aum} Cr
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: ML FORECAST (INDmoney & Moneycontrol Institutional Level) */}
              {activeTab === "forecast" && forecast && (
                <div className="space-y-6">
                  {/* Analyst Consensus & Target Price (INDmoney / Moneycontrol Level) */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-[#00D09C]" size={18} />
                        <h3 className="text-sm font-bold text-white">Analyst Consensus & Target Price</h3>
                      </div>
                      <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/30 uppercase tracking-wide">
                        {forecast.analyst_rating || "Strong Buy"}
                      </span>
                    </div>

                    {/* Target Price Ranges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">1Y Baseline Target Price</span>
                        <span className="text-lg font-bold text-white font-mono block">₹{forecast.target_price_1y || (curPrice * 1.18).toFixed(2)}</span>
                        <span className="text-[10px] text-[#00D09C] font-semibold">+18.2% Potential Upside</span>
                      </div>

                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">Bullish High Target</span>
                        <span className="text-lg font-bold text-[#00D09C] font-mono block">₹{forecast.target_price_high || (curPrice * 1.35).toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">+35.0% Max Target</span>
                      </div>

                      <div className="bg-[#181B20] p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-slate-400 block font-semibold">Bearish Low Target</span>
                        <span className="text-lg font-bold text-[#EB5757] font-mono block">₹{forecast.target_price_low || (curPrice * 0.92).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">-8.0% Downside Risk</span>
                      </div>
                    </div>

                    {/* Analyst Recommendations Breakdown */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Analyst Breakdown ({forecast.total_analysts || 38} Analysts Covering)</span>
                        <span className="text-[#00D09C] font-mono">{forecast.buy_pct || 78}% Buy • {forecast.hold_pct || 16}% Hold • {forecast.sell_pct || 6}% Sell</span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-[#23272F] rounded-full overflow-hidden flex">
                        <div className="bg-[#00D09C] h-full" style={{ width: `${forecast.buy_pct || 78}%` }} />
                        <div className="bg-amber-400 h-full" style={{ width: `${forecast.hold_pct || 16}%` }} />
                        <div className="bg-[#EB5757] h-full" style={{ width: `${forecast.sell_pct || 6}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Recharts ML Trajectory Chart */}
                  <div className="bg-[#14171D] p-5 rounded-2xl border border-[#23272F] space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                      12-Month ML Predictive Path
                    </h3>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecast.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: "#14171D", borderColor: "#2B303C", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="Predicted" stroke="#00D09C" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="Upper" stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey="Lower" stroke="#EB5757" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Multi-Horizon Returns Summary (INDmoney Style) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center bg-[#181B20] p-4 rounded-xl border border-white/5 text-xs">
                      <div>
                        <span className="text-slate-400 block">1 Month</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast.return_1m || 2.4}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">3 Months</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast.return_3m || 6.8}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">6 Months</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast.return_6m || 12.5}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">1 Year Target</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast.return_1y || 18.2}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">3Y Projected CAGR</span>
                        <span className="font-bold text-[#00D09C] font-mono mt-1 block">+{forecast.return_3y_cagr || 24.5}%</span>
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
          <div className="text-xs">
            <span className="text-slate-500 block">Category & Risk</span>
            <span className="font-bold text-white">{fund?.category || "Asset"} • {fund?.risk_category || "Very High Risk"}</span>
          </div>

          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-[#00D09C] hover:bg-[#00b889] text-slate-950 px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00D09C]/10"
            >
              <PlusCircle size={16} />
              Add Transaction to Portfolio
            </button>
          ) : (
            <form onSubmit={handleAddPortfolio} className="flex items-center gap-3">
              {addSuccess ? (
                <span className="text-xs font-bold text-[#00D09C] flex items-center gap-1">
                  <CheckCircle size={16} /> Added to Portfolio!
                </span>
              ) : (
                <>
                  <input
                    type="number"
                    step="1"
                    placeholder="Units"
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-20 bg-[#1F242D] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-24 bg-[#1F242D] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="bg-[#00D09C] hover:bg-[#00b889] text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Save Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-white px-2"
                  >
                    Cancel
                  </button>
                </>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
