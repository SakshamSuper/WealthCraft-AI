"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AssetDetailModal from "@/components/AssetDetailModal";
import ScanPortfolioModal from "@/components/ScanPortfolioModal";
import PortfolioOverlapModal from "@/components/PortfolioOverlapModal";
import TaxHarvestingOptimizer from "@/components/TaxHarvestingOptimizer";
import { 
  Briefcase, Trash2, ShieldAlert, CheckCircle, RefreshCw, BarChart3, TrendingUp, AlertTriangle, Sparkles, Plus, Search, X, Camera, Layers, ShieldCheck 
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell 
} from "recharts";

export default function PortfolioPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [optimizerData, setOptimizerData] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Asset Detail Modal state
  const [detailFundId, setDetailFundId] = useState<number | null>(null);
  const [detailFundObj, setDetailFundObj] = useState<any | null>(null);
  
  // Add Transaction Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [units, setUnits] = useState<number | "">(10);
  const [purchasePrice, setPurchasePrice] = useState<number | "">(100);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("stockify_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadPortfolioData();
  }, [router]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      const port = await api.getPortfolio();
      setPortfolio(port);

      // Optimizer is optional — silently fail if backend unavailable
      try {
        const opt = await api.optimizePortfolio();
        setOptimizerData(opt);
      } catch (optErr) {
        console.warn("Portfolio optimizer unavailable (backend offline or no holdings):", optErr);
        setOptimizerData(null);
      }
    } catch (err) {
      console.error(err);
      // Set empty portfolio so the page still renders
      setPortfolio({ items: [], total_invested: 0, current_value: 0, absolute_return: 0, absolute_return_pct: 0, xirr: 0, allocation: {} });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this asset transaction log?")) return;
    setDeletingId(itemId);
    try {
      await api.removePortfolioItem(itemId);
      await loadPortfolioData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchFunds = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.getFunds(query);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectFund = async (fund: any) => {
    setSelectedFund(fund);
    setSearchQuery("");
    setSearchResults([]);
    
    if (fund.is_custom) {
      setSearching(true);
      try {
        const resolved = await api.resolveFund(fund.id, fund.name, fund.ticker);
        setSelectedFund(resolved);
        setPurchasePrice(resolved.min_lumpsum ? resolved.min_lumpsum / 50 : 100);
      } catch (err) {
        console.error(err);
        setPurchasePrice(100);
      } finally {
        setSearching(false);
      }
    } else {
      setPurchasePrice(fund.min_lumpsum ? fund.min_lumpsum / 50 : 100);
    }
  };

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) {
      setErrorMessage("Please search and select an asset (stock/fund).");
      return;
    }
    if (!units || Number(units) <= 0) {
      setErrorMessage("Please enter a valid number of units.");
      return;
    }
    if (!purchasePrice || Number(purchasePrice) <= 0) {
      setErrorMessage("Please enter a valid purchase price.");
      return;
    }
    
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      let fundId = selectedFund.id;
      if (selectedFund.is_custom) {
        try {
          const resolved = await api.resolveFund(selectedFund.id, selectedFund.name, selectedFund.ticker);
          if (resolved && resolved.id) {
            fundId = resolved.id;
          }
        } catch (resErr) {
          console.warn("Dynamic fund resolution warning, proceeding with fundId:", resErr);
        }
      }
      await api.addPortfolioItem(fundId, Number(units), Number(purchasePrice), purchaseDate, selectedFund.name);
      setSuccessMessage("Transaction logged successfully!");
      setSelectedFund(null);
      setUnits(10);
      setPurchasePrice(100);
      setSearchQuery("");
      await loadPortfolioData();
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to log transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-emerald-500" size={32} />
          <p className="text-sm text-slate-500">Recalculating XIRR return matrices...</p>
        </div>
      </div>
    );
  }

  // Format category allocations for bar chart comparison
  const categoriesList = optimizerData?.metrics?.target_allocation
    ? Object.keys(optimizerData.metrics.target_allocation)
    : [];
  const allocationChartData = categoriesList.map((cat: string) => ({
    name: cat,
    Current: optimizerData?.metrics?.current_allocation?.[cat] || 0.0,
    Target: optimizerData?.metrics?.target_allocation?.[cat] || 0.0,
  }));

  const hasHoldings = (portfolio?.items?.length || 0) > 0;


  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl text-white">Portfolio Manager & Optimizer</h1>
        <p className="text-xs text-slate-500">Track mutual fund transactions, calculate exact XIRR returns, and analyze rebalancing structures.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 bg-slate-950/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Current Value</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            {hasHoldings ? `₹${portfolio?.current_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : <span className="text-slate-600">₹0.00</span>}
          </div>
          {!hasHoldings && <span className="text-[10px] text-slate-600">Add holdings to track value</span>}
        </div>
        <div className="glass-panel p-5 bg-slate-950/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Invested</div>
          <div className="font-heading font-bold text-2xl text-white mt-1">
            {hasHoldings ? `₹${portfolio?.total_invested?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : <span className="text-slate-600">₹0.00</span>}
          </div>
          {!hasHoldings && <span className="text-[10px] text-slate-600">No transactions yet</span>}
        </div>
        <div className="glass-panel p-5 bg-slate-950/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Absolute Returns</div>
          {hasHoldings ? (
            <div className={`font-heading font-bold text-2xl mt-1 ${(portfolio?.absolute_return || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ₹{portfolio?.absolute_return?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="text-xs font-semibold ml-1">({portfolio?.absolute_return_pct}%)</span>
            </div>
          ) : (
            <div className="font-heading font-bold text-2xl mt-1 text-slate-600">—</div>
          )}
          {!hasHoldings && <span className="text-[10px] text-slate-600">Calculated from holdings</span>}
        </div>
        <div className="glass-panel p-5 bg-slate-950/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Annualized Returns (XIRR)</div>
          {hasHoldings ? (
            <div className="font-heading font-bold text-2xl text-white mt-1 flex items-center gap-1.5">
              <TrendingUp className="text-emerald-400" size={20} />
              {portfolio?.xirr ?? 0}%
            </div>
          ) : (
            <div className="font-heading font-bold text-2xl mt-1 text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="text-slate-700" size={20} />
              N/A
            </div>
          )}
          {!hasHoldings && <span className="text-[10px] text-slate-600">Requires at least 1 holding</span>}
        </div>
      </div>

      {/* Portfolio Holdings Table */}
      <div className="glass-panel p-6 bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-1.5 mb-0">
            <Briefcase className="text-emerald-400" size={18} />
            Current Holdings Log
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScanModal(true)}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/10"
            >
              <Camera size={14} />
              Scan Photo / Report
            </button>

            <button
              type="button"
              onClick={() => setShowOverlapModal(true)}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-500/10"
            >
              <Layers size={14} />
              Overlap X-Ray
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFund(null);
                setSearchQuery("");
                setSearchResults([]);
                setShowAddModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-emerald-500/10"
            >
              <Plus size={14} />
              Add Transaction
            </button>
          </div>
        </div>

        {portfolio?.items.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs leading-relaxed">
            No assets registered. Route to the <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => router.push("/screener")}>Screener</span> to log purchase transactions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3 w-44">Fund Name</th>
                  <th className="pb-3 px-3">Units</th>
                  <th className="pb-3 px-3">Purchase Price</th>
                  <th className="pb-3 px-3">Latest NAV</th>
                  <th className="pb-3 px-3">Current Value</th>
                  <th className="pb-3 px-3">Purchase Date</th>
                  <th className="pb-3 px-3">Abs Return</th>
                  <th className="pb-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolio?.items.map((item: any) => (
                  <tr 
                    key={item.id} 
                    onClick={() => {
                      setDetailFundId(item.fund_id);
                      setDetailFundObj({
                        id: item.fund_id,
                        name: item.fund_name,
                        category: item.fund_category || "Asset",
                        initial_nav: item.current_nav || item.purchase_price
                      });
                    }}
                    className="hover:bg-white/5 transition-all cursor-pointer group"
                    title="Click to view full asset metrics, fundamentals, ML forecast and valuation"
                  >
                    <td className="py-3.5 font-bold text-white max-w-[180px] truncate group-hover:text-emerald-400 transition-colors">
                      {item.fund_name}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-semibold">{item.units.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-slate-300">INR {item.purchase_price}</td>
                    <td className="py-3.5 px-3 text-slate-300">INR {item.current_nav}</td>
                    <td className="py-3.5 px-3 text-white font-bold">INR {item.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-3 text-slate-400">{item.purchase_date}</td>
                    <td className={`py-3.5 px-3 font-semibold ${item.absolute_return >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {item.absolute_return_pct}%
                    </td>
                    <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Indian Tax Harvesting & LTCG Optimizer (Section 112A) */}
      <TaxHarvestingOptimizer portfolioItems={portfolio?.items || []} />

      {/* Optimizer & Rebalancing Advice Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rebalancing Chart */}
        <div className="glass-panel p-6 bg-slate-950/40">
          <h2 className="font-heading font-bold text-lg text-white mb-2 flex items-center gap-1.5">
            <BarChart3 className="text-emerald-400" size={18} />
            Allocation vs Target Profile
          </h2>
          <span className="text-xs text-slate-500 block mb-4">Comparing current category exposures to target allocations</span>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={allocationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Current" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#10B981" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rebalancing suggestions & Agent instructions */}
        <div className="glass-panel p-6 bg-slate-950/40 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-400" size={18} />
              <h2 className="font-heading font-bold text-lg text-white">AI Portfolio Optimizer Agent Suggestions</h2>
            </div>
            
            {optimizerData?.metrics?.rebalance_needed ? (
              <div className="space-y-3">
                {/* Custom warning alert */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-semibold text-amber-400 block mb-1">Rebalancing Action Required</span>
                    Your asset classes deviate significantly from target models. Check the suggestions below:
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-center">Current</th>
                        <th className="pb-2 text-center">Target</th>
                        <th className="pb-2 text-center">Diff</th>
                        <th className="pb-2 text-right">Suggested Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {optimizerData.metrics.suggestions.map((sug: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2.5 font-bold text-white">{sug.category}</td>
                          <td className="py-2.5 text-center">{sug.current}%</td>
                          <td className="py-2.5 text-center">{sug.target}%</td>
                          <td className="py-2.5 text-center text-red-400">{sug.difference}%</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-400">{sug.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 rounded-lg flex items-start gap-2.5">
                <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-semibold text-emerald-400 block mb-0.5">Asset Allocation is Optimal</span>
                  No rebalancing actions are required for your portfolio at this time. Good job!
                </div>
              </div>
            )}

            {/* Markdown advice from RAG/Agent Orchestrator */}
            <div className="border-t border-white/5 pt-4 text-xs text-slate-400 leading-relaxed max-h-[140px] overflow-y-auto">
              <span className="font-semibold text-white block mb-1">Financial Advisor Written Note:</span>
              <div className="prose prose-invert prose-xs">
                {optimizerData?.advice_markdown ? (
                  <p>{optimizerData.advice_markdown.replace(/#+[\s\w]+/g, "").slice(0, 320)}...</p>
                ) : (
                  <p>Initializing portfolio optimization guidelines...</p>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

      {/* Add Transaction Modal overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900/90 w-full max-w-md p-6 relative border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <h3 className="font-heading font-bold text-lg text-white mb-1 flex items-center gap-1.5">
              <Briefcase className="text-emerald-400" size={18} />
              Log Purchase Transaction
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Search and add transactions for any of the 15,000+ mutual funds dynamically.</p>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                  {successMessage}
                </div>
              )}

              {/* Autocomplete Search input */}
              <div className="space-y-1 relative">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Search Mutual Fund</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedFund ? selectedFund.name : searchQuery}
                    disabled={!!selectedFund}
                    onChange={(e) => handleSearchFunds(e.target.value)}
                    placeholder="Type at least 3 letters (e.g. HDFC, Parag, SBI...)"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-80"
                  />
                  <Search className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
                  {selectedFund && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFund(null);
                        setSearchQuery("");
                      }}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-red-400 text-xs cursor-pointer bg-slate-800 px-1.5 py-0.5 rounded"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown list */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-lg max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-white/5">
                    {searchResults.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => handleSelectFund(f)}
                        className="p-2.5 hover:bg-emerald-500/10 cursor-pointer text-xs text-slate-300 transition-all flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-white leading-tight">{f.name}</span>
                        <span className="text-[10px] text-slate-500">{f.amc} | {f.category}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searching && (
                  <div className="absolute right-3 top-7 flex items-center gap-1.5">
                    <RefreshCw className="animate-spin text-emerald-500" size={12} />
                  </div>
                )}
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Units Purchased</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={units}
                    onChange={(e) => setUnits(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 150.45"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Purchase NAV (INR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 110.25"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Purchase Date</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !selectedFund}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Logging Asset...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Log Transaction
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Asset Detail & Forecast Modal */}
      <AssetDetailModal
        isOpen={!!detailFundId}
        onClose={() => {
          setDetailFundId(null);
          setDetailFundObj(null);
        }}
        fundId={detailFundId}
        initialFund={detailFundObj}
      />

      {/* AI Holding & Statement Scanner Modal */}
      <ScanPortfolioModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onImportComplete={loadPortfolioData}
      />

      {/* Portfolio Overlap X-Ray Modal */}
      <PortfolioOverlapModal
        isOpen={showOverlapModal}
        onClose={() => setShowOverlapModal(false)}
      />
    </div>
  );
}
