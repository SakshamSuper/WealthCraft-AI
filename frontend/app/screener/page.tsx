"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Search, SlidersHorizontal, ChevronRight, X, TrendingUp, Sparkles, Plus, PlusCircle, CheckCircle, Calculator, RefreshCw 
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line 
} from "recharts";
import AssetDetailModal from "@/components/AssetDetailModal";

function ScreenerPageContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [risk, setRisk] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [assetType, setAssetType] = useState<"ALL" | "STOCKS" | "MFS" | "ETFS">("ALL");

  // Detailed Modal/Pane state
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [navHistory, setNavHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Add to Portfolio form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [units, setUnits] = useState(100);
  const [purchasePrice, setPurchasePrice] = useState(100);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchFunds();
    
    // Check if query parameter has pre-selected fund ID
    const queryId = searchParams.get("id");
    if (queryId) {
      handleSelectFund(Number(queryId));
    }

    // Check assetType or type parameter
    const paramType = searchParams.get("assetType") || searchParams.get("type");
    if (paramType) {
      const upper = paramType.toUpperCase();
      if (upper === "STOCKS" || upper === "STOCK") setAssetType("STOCKS");
      else if (upper === "MFS" || upper === "MF" || upper === "MUTUAL_FUNDS" || upper === "MUTUAL_FUND") setAssetType("MFS");
      else if (upper === "ETFS" || upper === "ETF") setAssetType("ETFS");
      else if (upper === "ALL") setAssetType("ALL");
    }

    // Check search parameter
    const paramSearch = searchParams.get("search");
    if (paramSearch) {
      setSearch(paramSearch);
    }
  }, [searchParams]);

  const fetchFunds = async () => {
    setLoading(true);
    try {
      const data = await api.getFunds(
        search || undefined,
        category || undefined,
        risk || undefined,
        minRating ? Number(minRating) : undefined
      );
      setFunds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFunds();
  };

  const handleSelectFund = async (fundId: number) => {
    setChartLoading(true);
    setSelectedFund(null);
    setNavHistory([]);
    setForecast(null);
    setShowAddForm(false);
    setAddSuccess(false);

    try {
      // Find if clicked fund is custom/public in search results
      const clickedFund = funds.find((f) => f.id === fundId);
      let fund: any;
      if (clickedFund && clickedFund.is_custom) {
        // Resolve it on the fly first
        fund = await api.resolveFund(fundId, clickedFund.name, clickedFund.ticker);
        // Refresh local funds list so this fund shows as resolved (is_custom: false)
        setFunds(prev => prev.map(f => f.id === fundId ? { ...f, is_custom: false, expense_ratio: fund.expense_ratio } : f));
      } else {
        fund = await api.getFundDetails(fundId);
      }
      
      setSelectedFund(fund);
      setPurchasePrice(fund.min_lumpsum ? fund.min_lumpsum / 50 : 100); // set default purchase price guess

      const history = await api.getFundNAVHistory(fundId);
      setNavHistory(history.map((h: any) => ({
        date: new Date(h.date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        NAV: h.nav
      })));

      const forecastData = await api.getFundForecast(fundId);
      // Format forecast details for line chart
      const formattedForecast = forecastData.dates.map((d: string, idx: number) => ({
        date: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        Predicted: forecastData.nav[idx],
        Lower: forecastData.lower_bound[idx],
        Upper: forecastData.upper_bound[idx]
      }));
      setForecast({
        ...forecastData,
        chartData: formattedForecast
      });
    } catch (err) {
      console.error("Error loading fund details:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    try {
      await api.addPortfolioItem(selectedFund.id, units, purchasePrice, purchaseDate);
      setAddSuccess(true);
      setTimeout(() => {
        setShowAddForm(false);
        setAddSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  const filteredFunds = funds.filter((f) => {
    const isETF = (f.category && f.category.toLowerCase().includes("etf")) || (f.name && f.name.toLowerCase().includes("etf")) || (f.ticker && f.ticker.toLowerCase().includes("bees"));
    const isStock = ((f.category === "Listed Stock" || f.category === "Stock" || f.category === "Equity Stock") || (f.ticker && (f.ticker.endsWith(".NS") || f.ticker.endsWith(".BO")))) && !isETF;
    const isMF = !isStock && !isETF;

    if (assetType === "STOCKS") return isStock;
    if (assetType === "ETFS") return isETF;
    if (assetType === "MFS") return isMF;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Upper header with Asset Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-white">Asset Screener</h1>
          <p className="text-xs text-slate-500">Search, filter, and analyze Mutual Funds, NSE/BSE Stocks, and ETFs with ML predictions.</p>
        </div>

        {/* Asset Type Segment Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/60 border border-white/10 glass-panel">
          <button
            type="button"
            onClick={() => setAssetType("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              assetType === "ALL"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({funds.length})
          </button>
          <button
            type="button"
            onClick={() => setAssetType("STOCKS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              assetType === "STOCKS"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📈 Stocks
          </button>
          <button
            type="button"
            onClick={() => setAssetType("MFS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              assetType === "MFS"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏦 Mutual Funds
          </button>
          <button
            type="button"
            onClick={() => setAssetType("ETFS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              assetType === "ETFS"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ ETFs
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: Filter Form & Fund List */}
        <div className="flex-1 space-y-4 w-full">
          {/* Filters Bar */}
          <form onSubmit={handleSearchSubmit} className="glass-panel p-4 bg-slate-950/40 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Keyword Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search name, ticker, AMC, etc."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
              >
                <option value="">All Categories</option>
                {["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Index", "ELSS", "Debt", "Hybrid", "Equity Stock", "ETF"].map((c) => (
                  <option key={c} value={c}>{c === "Equity Stock" ? "Stocks (NSE/BSE)" : c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Risk Profile</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
              >
                <option value="">All Risks</option>
                {["Low", "Low to Moderate", "Moderate", "High", "Very High"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Min Rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
              >
                <option value="">All Ratings</option>
                {[3, 4, 5].map((r) => (
                  <option key={r} value={r}>{r}+ Stars</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              Apply Filters
            </button>
          </form>

          {/* Fund List */}
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-2" />
              <div className="text-xs text-slate-500">Fetching Assets...</div>
            </div>
          ) : filteredFunds.length === 0 ? (
            <div className="glass-panel p-12 bg-slate-950/40 text-center text-slate-500 text-sm">
              No assets found matching the selected "{assetType}" filter.
            </div>
          ) : (
            <div className="glass-panel overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/30 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Asset / Company</th>
                      <th className="px-4 py-3.5">{assetType === "STOCKS" ? "Sector" : "Category"}</th>
                      <th className="px-4 py-3.5">Rating</th>
                      <th className="px-4 py-3.5">{assetType === "STOCKS" ? "P/E Ratio" : "Expense"}</th>
                      <th className="px-4 py-3.5">{assetType === "STOCKS" ? "Market Cap" : "AUM"}</th>
                      <th className="px-4 py-3.5">Risk Level</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredFunds.map((f) => (
                      <tr 
                        key={f.id} 
                        onClick={() => handleSelectFund(f.id)}
                        className={`hover:bg-white/5 transition-all cursor-pointer ${selectedFund?.id === f.id ? "bg-emerald-500/5" : ""}`}
                      >
                        <td className="px-5 py-4 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate block">{f.name}</span>
                            {f.ticker && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 shrink-0">
                                {f.ticker}
                              </span>
                            )}
                          </div>
                          {f.sector && (
                            <span className="text-[10px] text-slate-500 block truncate">{f.sector}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-medium">
                          {f.category === "Listed Stock" && f.sector ? f.sector : f.category}
                        </td>
                        <td className="px-4 py-4 text-amber-400 font-bold">{"★".repeat(f.fund_rating)}</td>
                        <td className="px-4 py-4 text-white font-mono">
                          {f.category === "Listed Stock" ? (f.pe_ratio ? `${f.pe_ratio}x` : "22.4x") : `${(f.expense_ratio * 100).toFixed(2)}%`}
                        </td>
                        <td className="px-4 py-4 text-slate-300 font-semibold font-mono">₹{f.aum.toLocaleString()} Cr</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            f.risk_category === "Low" ? "bg-blue-500/10 text-blue-400" :
                            f.risk_category === "Moderate" ? "bg-amber-500/10 text-amber-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>
                            {f.risk_category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 ml-auto">
                            Details
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Groww-styled Key Metrics & Features Modal */}
        <AssetDetailModal
          isOpen={!!selectedFund}
          onClose={() => setSelectedFund(null)}
          fundId={selectedFund?.id || null}
          initialFund={selectedFund}
        />
      </div>
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
        Loading Screener Data...
      </div>
    }>
      <ScreenerPageContent />
    </Suspense>
  );
}
