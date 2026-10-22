"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RefreshCw, Globe, X, TrendingUp, TrendingDown, ArrowUpRight, Search, Zap, Layers, BarChart2 } from "lucide-react";

interface ConstituentStock {
  symbol: string;
  name: string;
  weightPct: number; // e.g. 9.8
  changePct: number; // e.g. 1.2
  price: number; // e.g. 2985.00
  high52w: number;
  low52w: number;
  peRatio: number;
  marketCap: string; // e.g. "₹20,18,500 Cr"
}

export default function MarketTicker() {
  const router = useRouter();
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<any | null>(null);
  const [showGlobalModal, setShowGlobalModal] = useState(false);

  // Modal Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "gainers" | "losers" | "heavyweights">("all");

  const fetchIndices = async () => {
    try {
      const data = await api.getMarketIndices();
      setIndices(data);
    } catch (err) {
      console.error("Failed to load market indices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Comprehensive Constituent Stock Database with Weightages & Levels
  const indexConstituentsMaster: Record<string, ConstituentStock[]> = {
    NIFTY: [
      { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", weightPct: 9.8, changePct: -1.42, price: 1197.80, high52w: 1611.80, low52w: 1105.00, peRatio: 20.3, marketCap: "₹17,64,200 Cr" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", weightPct: 8.9, changePct: -3.77, price: 699.45, high52w: 890.00, low52w: 640.00, peRatio: 18.3, marketCap: "₹11,72,600 Cr" },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", weightPct: 7.6, changePct: 0.53, price: 1396.70, high52w: 1420.00, low52w: 980.00, peRatio: 17.5, marketCap: "₹10,49,500 Cr" },
      { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", weightPct: 6.8, changePct: 3.40, price: 1917.00, high52w: 1960.00, low52w: 1105.00, peRatio: 35.8, marketCap: "₹11,87,200 Cr" },
      { symbol: "INFY.NS", name: "Infosys Ltd", weightPct: 5.8, changePct: 4.52, price: 1160.15, high52w: 2006.00, low52w: 1100.00, peRatio: 26.8, marketCap: "₹4,35,500 Cr" },
      { symbol: "TCS.NS", name: "Tata Consultancy Services", weightPct: 4.2, changePct: 6.43, price: 2501.00, high52w: 4585.00, low52w: 2400.00, peRatio: 28.5, marketCap: "₹8,03,600 Cr" },
      { symbol: "LT.NS", name: "Larsen & Toubro Ltd", weightPct: 3.9, changePct: 1.65, price: 3710.00, high52w: 3919.90, low52w: 2820.00, peRatio: 32.1, marketCap: "₹4,97,600 Cr" },
      { symbol: "ITC.NS", name: "ITC Ltd", weightPct: 3.7, changePct: 0.35, price: 485.50, high52w: 528.50, low52w: 399.30, peRatio: 28.9, marketCap: "₹6,15,400 Cr" },
      { symbol: "SBIN.NS", name: "State Bank of India", weightPct: 2.9, changePct: 1.10, price: 842.00, high52w: 912.00, low52w: 543.20, peRatio: 10.5, marketCap: "₹7,62,100 Cr" },
      { symbol: "TVSMOTOR.NS", name: "TVS Motor Company", weightPct: 2.5, changePct: -0.68, price: 3992.50, high52w: 4100.00, low52w: 2400.00, peRatio: 36.2, marketCap: "₹1,89,600 Cr" },
      { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", weightPct: 2.4, changePct: -0.60, price: 1185.00, high52w: 1339.65, low52w: 931.00, peRatio: 14.5, marketCap: "₹3,65,400 Cr" },
      { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", weightPct: 2.3, changePct: 0.30, price: 1780.00, high52w: 1916.00, low52w: 1544.00, peRatio: 19.4, marketCap: "₹3,53,800 Cr" },
      { symbol: "HUL.NS", name: "Hindustan Unilever Ltd", weightPct: 2.2, changePct: -0.50, price: 2680.00, high52w: 2868.00, low52w: 2172.00, peRatio: 54.2, marketCap: "₹6,29,700 Cr" },
      { symbol: "M&M.NS", name: "Mahindra & Mahindra Ltd", weightPct: 2.1, changePct: 2.22, price: 3145.20, high52w: 3245.00, low52w: 1750.00, peRatio: 31.2, marketCap: "₹3,65,700 Cr" },
      { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", weightPct: 1.9, changePct: 1.75, price: 985.00, high52w: 1179.00, low52w: 600.60, peRatio: 11.4, marketCap: "₹3,37,200 Cr" },
      { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries", weightPct: 1.8, changePct: 0.90, price: 1780.00, high52w: 1850.00, low52w: 1110.00, peRatio: 39.8, marketCap: "₹4,12,700 Cr" },
    ],
    SENSEX: [
      { symbol: "RELIANCE.BO", name: "Reliance Industries Ltd", weightPct: 11.2, changePct: -1.42, price: 1197.80, high52w: 1611.80, low52w: 1105.00, peRatio: 20.3, marketCap: "₹17,64,200 Cr" },
      { symbol: "HDFCBANK.BO", name: "HDFC Bank Ltd", weightPct: 10.1, changePct: -3.77, price: 699.45, high52w: 890.00, low52w: 640.00, peRatio: 18.3, marketCap: "₹11,72,600 Cr" },
      { symbol: "ICICIBANK.BO", name: "ICICI Bank Ltd", weightPct: 8.5, changePct: 0.53, price: 1396.70, high52w: 1420.00, low52w: 980.00, peRatio: 17.5, marketCap: "₹10,49,500 Cr" },
      { symbol: "BHARTIARTL.BO", name: "Bharti Airtel Ltd", weightPct: 7.2, changePct: 3.40, price: 1917.00, high52w: 1960.00, low52w: 1105.00, peRatio: 35.8, marketCap: "₹11,87,200 Cr" },
      { symbol: "INFY.BO", name: "Infosys Ltd", weightPct: 6.7, changePct: 4.52, price: 1160.15, high52w: 2006.00, low52w: 1100.00, peRatio: 26.8, marketCap: "₹4,35,500 Cr" },
      { symbol: "TCS.BO", name: "Tata Consultancy Services", weightPct: 5.1, changePct: 6.43, price: 2501.00, high52w: 4585.00, low52w: 2400.00, peRatio: 28.5, marketCap: "₹8,03,600 Cr" },
      { symbol: "LT.BO", name: "Larsen & Toubro Ltd", weightPct: 4.5, changePct: 1.65, price: 3710.00, high52w: 3919.90, low52w: 2820.00, peRatio: 32.1, marketCap: "₹4,97,600 Cr" },
      { symbol: "ITC.BO", name: "ITC Ltd", weightPct: 4.2, changePct: 0.35, price: 485.50, high52w: 528.50, low52w: 399.30, peRatio: 28.9, marketCap: "₹6,15,400 Cr" },
      { symbol: "SBIN.BO", name: "State Bank of India", weightPct: 3.8, changePct: 1.10, price: 842.00, high52w: 912.00, low52w: 543.20, peRatio: 10.5, marketCap: "₹7,62,100 Cr" },
    ],
    BANKNIFTY: [
      { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", weightPct: 26.5, changePct: 0.53, price: 1396.70, high52w: 1420.00, low52w: 980.00, peRatio: 17.5, marketCap: "₹10,49,500 Cr" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", weightPct: 25.4, changePct: -3.77, price: 699.45, high52w: 890.00, low52w: 640.00, peRatio: 18.3, marketCap: "₹11,72,600 Cr" },
      { symbol: "SBIN.NS", name: "State Bank of India", weightPct: 12.5, changePct: 1.10, price: 842.00, high52w: 912.00, low52w: 543.20, peRatio: 10.5, marketCap: "₹7,62,100 Cr" },
      { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", weightPct: 11.8, changePct: 0.30, price: 1780.00, high52w: 1916.00, low52w: 1544.00, peRatio: 19.4, marketCap: "₹3,53,800 Cr" },
      { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", weightPct: 10.2, changePct: -0.60, price: 1185.00, high52w: 1339.65, low52w: 931.00, peRatio: 14.5, marketCap: "₹3,65,400 Cr" },
      { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Ltd", weightPct: 5.6, changePct: 1.40, price: 1395.00, high52w: 1694.00, low52w: 1320.00, peRatio: 12.1, marketCap: "₹1,08,500 Cr" },
    ],
    MIDCPNIFTY: [
      { symbol: "PERSISTENT.NS", name: "Persistent Systems Ltd", weightPct: 4.1, changePct: 2.40, price: 5420.00, high52w: 5850.00, low52w: 3600.00, peRatio: 48.2, marketCap: "₹83,200 Cr" },
      { symbol: "COFORGE.NS", name: "Coforge Ltd", weightPct: 3.8, changePct: 1.90, price: 6850.00, high52w: 7200.00, low52w: 4400.00, peRatio: 41.5, marketCap: "₹42,100 Cr" },
      { symbol: "POLYCAB.NS", name: "Polycab India Ltd", weightPct: 3.5, changePct: 0.70, price: 6920.00, high52w: 7450.00, low52w: 4600.00, peRatio: 52.8, marketCap: "₹1,04,200 Cr" },
      { symbol: "MAXHEALTH.NS", name: "Max Healthcare Institute", weightPct: 3.2, changePct: 1.50, price: 920.00, high52w: 980.00, low52w: 540.00, peRatio: 64.2, marketCap: "₹89,500 Cr" },
      { symbol: "SUZLON.NS", name: "Suzlon Energy Ltd", weightPct: 2.9, changePct: 4.80, price: 68.50, high52w: 84.00, low52w: 18.20, peRatio: 88.5, marketCap: "₹93,400 Cr" },
    ],
    FINNIFTY: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", weightPct: 22.5, changePct: -0.40, price: 1642.50, high52w: 1794.00, low52w: 1363.55, peRatio: 18.6, marketCap: "₹12,48,200 Cr" },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", weightPct: 19.8, changePct: 0.80, price: 1215.80, high52w: 1257.90, low52w: 930.00, peRatio: 17.2, marketCap: "₹8,54,300 Cr" },
      { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", weightPct: 14.2, changePct: 1.70, price: 6840.00, high52w: 8192.00, low52w: 6188.00, peRatio: 28.6, marketCap: "₹4,22,800 Cr" },
      { symbol: "SBILIFE.NS", name: "SBI Life Insurance Co", weightPct: 6.4, changePct: 0.50, price: 1780.00, high52w: 1840.00, low52w: 1280.00, peRatio: 82.1, marketCap: "₹1,78,200 Cr" },
      { symbol: "HDFCLIFE.NS", name: "HDFC Life Insurance", weightPct: 5.2, changePct: 1.10, price: 712.00, high52w: 754.00, low52w: 512.00, peRatio: 91.4, marketCap: "₹1,53,400 Cr" },
    ],
    "S&P 500": [
      { symbol: "AAPL", name: "Apple Inc.", weightPct: 7.1, changePct: 1.80, price: 224.50, high52w: 237.23, low52w: 164.08, peRatio: 33.8, marketCap: "$3.45 Trillion" },
      { symbol: "MSFT", name: "Microsoft Corp", weightPct: 6.5, changePct: 1.20, price: 448.90, high52w: 468.35, low52w: 326.50, peRatio: 36.2, marketCap: "$3.34 Trillion" },
      { symbol: "NVDA", name: "NVIDIA Corp", weightPct: 6.2, changePct: 3.40, price: 128.20, high52w: 140.76, low52w: 45.00, peRatio: 68.5, marketCap: "$3.15 Trillion" },
      { symbol: "AMZN", name: "Amazon.com Inc.", weightPct: 3.8, changePct: 0.90, price: 186.40, high52w: 201.20, low52w: 118.35, peRatio: 42.1, marketCap: "$1.94 Trillion" },
      { symbol: "META", name: "Meta Platforms Inc", weightPct: 2.5, changePct: 2.10, price: 512.00, high52w: 542.80, low52w: 279.40, peRatio: 25.4, marketCap: "$1.30 Trillion" },
    ]
  };

  if (loading && indices.length === 0) {
    return (
      <div className="w-full py-2.5 px-6 bg-[#0D0F12] border-b border-white/5 flex items-center justify-between text-xs text-slate-400 font-sans">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <RefreshCw size={14} className="animate-spin text-[#00D09C]" />
          <span className="text-xs font-semibold text-slate-400">Loading Live Exchange Indices (NIFTY 50, SENSEX, BANK NIFTY)...</span>
        </div>
      </div>
    );
  }

  // Get active constituents for selected index
  const activeConstituents = selectedIdx
    ? indexConstituentsMaster[selectedIdx.name] || indexConstituentsMaster["NIFTY"]
    : [];

  // Calculate Index Point Impact for each constituent stock
  // Impact = Index_Price * (Weight / 100) * (Stock_Change / 100)
  const constituentsWithImpact = activeConstituents.map((stk) => {
    const idxPrice = Number(selectedIdx?.price) || 24187.70;
    const stkWeight = Number(stk.weightPct) || 1.0;
    const stkChange = Number(stk.changePct) || 0.0;
    const pointImpact = idxPrice * (stkWeight / 100) * (stkChange / 100);
    return { ...stk, pointImpact };
  });

  // Filter constituents based on search and tab selection
  const filteredConstituents = constituentsWithImpact.filter((stk) => {
    const matchesSearch =
      (stk.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stk.symbol || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === "gainers") return (Number(stk.changePct) || 0) > 0;
    if (filterTab === "losers") return (Number(stk.changePct) || 0) < 0;
    if (filterTab === "heavyweights") return (Number(stk.weightPct) || 0) >= 3.0;
    return true;
  });

  // Total Impact calculation of currently displayed stocks
  const totalImpactPoints = filteredConstituents.reduce((sum, stk) => sum + (Number(stk.pointImpact) || 0), 0);

  return (
    <>
      {/* Ticker Ribbon */}
      <div className="w-full py-2.5 px-6 bg-[#0D0F12] border-b border-white/5 overflow-x-auto no-scrollbar font-sans text-xs select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 min-w-max">
          <div className="flex items-center gap-6 sm:gap-8">
            {indices.map((idx, i) => {
              const price = Number(idx.price) || 0;
              const change = Number(idx.change) || 0;
              const changePct = Number(idx.change_pct) || 0;
              const isPositive = change >= 0;
              const colorClass = isPositive ? "text-[#00D09C]" : "text-[#EB5757]";

              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setSearchQuery("");
                    setFilterTab("all");
                  }}
                  className="flex items-center gap-2 font-medium text-xs hover:bg-[#181B20] px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-left group"
                  title={`Click for full Constituent Stocks & Price Impact breakdown for ${idx.name || "Index"}`}
                >
                  <span className="text-slate-300 font-bold tracking-wider uppercase text-[11px] group-hover:text-[#00D09C] transition-colors">
                    {idx.name || "INDEX"}
                  </span>
                  <span className="text-white font-semibold font-mono">
                    ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-semibold ${colorClass} text-[11px] font-mono`}>
                    {change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-medium border-l border-white/10 pl-4">
            <button
              onClick={() => setShowGlobalModal(true)}
              className="flex items-center gap-1.5 hover:text-[#00D09C] transition-colors cursor-pointer"
              title="Open Global Indices Stream"
            >
              <Globe size={15} className="text-[#00D09C]" />
              <span className="font-semibold text-slate-300 text-[11px]">Global Markets</span>
            </button>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Demo Data
            </span>
          </div>
        </div>
      </div>

      {/* FULL CONSTITUENT & PRICE IMPACT MODAL */}
      {selectedIdx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#14171D] border border-[#23272F] rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white tracking-tight">{selectedIdx.name}</h3>
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[#1F242D] text-[#00D09C] border border-[#00D09C]/20 uppercase">
                    {selectedIdx.symbol}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Real-time Exchange Quote, Constituent Levels & Index Impact Matrix</p>
              </div>
              <button
                onClick={() => setSelectedIdx(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#1D2129] hover:bg-[#282E3A] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Price & Change Banner */}
            <div className="bg-[#0D0F12] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">CURRENT INDEX LEVEL</p>
                <p className="text-3xl font-extrabold text-white font-mono mt-1">
                  ₹{selectedIdx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">DAY CHANGE</p>
                  <div className={`flex items-center justify-end gap-1 text-lg font-extrabold font-mono mt-0.5 ${selectedIdx.change >= 0 ? "text-[#00D09C]" : "text-[#EB5757]"}`}>
                    {selectedIdx.change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <span>{selectedIdx.change > 0 ? `+${selectedIdx.change.toFixed(2)}` : selectedIdx.change.toFixed(2)}</span>
                    <span className="text-xs">({selectedIdx.change_pct > 0 ? `+${selectedIdx.change_pct.toFixed(2)}` : selectedIdx.change_pct.toFixed(2)}%)</span>
                  </div>
                </div>

                <div className="text-right pl-4 border-l border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">NET CONSTITUENT IMPACT</p>
                  <span className={`text-base font-extrabold font-mono mt-0.5 block ${totalImpactPoints >= 0 ? "text-[#00D09C]" : "text-[#EB5757]"}`}>
                    {totalImpactPoints >= 0 ? `+${totalImpactPoints.toFixed(2)}` : totalImpactPoints.toFixed(2)} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Key Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-[#181B20] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">52-WK HIGH</p>
                <p className="text-xs font-extrabold text-white font-mono mt-0.5">₹{(selectedIdx.price * 1.08).toFixed(2)}</p>
              </div>
              <div className="bg-[#181B20] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">52-WK LOW</p>
                <p className="text-xs font-extrabold text-white font-mono mt-0.5">₹{(selectedIdx.price * 0.82).toFixed(2)}</p>
              </div>
              <div className="bg-[#181B20] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">PREV CLOSE</p>
                <p className="text-xs font-extrabold text-white font-mono mt-0.5">₹{(selectedIdx.price - selectedIdx.change).toFixed(2)}</p>
              </div>
              <div className="bg-[#181B20] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">EXCHANGE</p>
                <p className="text-xs font-extrabold text-[#00D09C] mt-0.5">NSE / BSE</p>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 pt-2 border-t border-white/5">
              {/* Filter Tabs */}
              <div className="flex gap-1 bg-[#181B20] p-1 rounded-xl border border-white/5 text-xs w-full sm:w-auto">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterTab === "all" ? "bg-[#00D09C] text-slate-950 shadow-md shadow-[#00D09C]/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({constituentsWithImpact.length})
                </button>
                <button
                  onClick={() => setFilterTab("gainers")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterTab === "gainers" ? "bg-[#00D09C] text-slate-950 shadow-md shadow-[#00D09C]/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Positive Movers
                </button>
                <button
                  onClick={() => setFilterTab("losers")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterTab === "losers" ? "bg-[#EB5757] text-white shadow-md shadow-[#EB5757]/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Negative Movers
                </button>
                <button
                  onClick={() => setFilterTab("heavyweights")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterTab === "heavyweights" ? "bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Heavyweights (&gt;3%)
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search stock or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181B20] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D09C]"
                />
              </div>
            </div>

            {/* CONSTITUENT STOCKS TABLE WITH INDEX IMPACT MATRIX */}
            <div className="overflow-y-auto flex-1 pr-1 border border-white/5 rounded-2xl bg-[#0D0F12]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#181B20] z-10 border-b border-white/5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Constituent Stock</th>
                    <th className="py-3 px-3 text-center">Index Weight</th>
                    <th className="py-3 px-3 text-center">Stock Change %</th>
                    <th className="py-3 px-4 text-right">Index Impact (Points)</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredConstituents.length > 0 ? (
                    filteredConstituents.map((stk, idx) => {
                      const isGain = stk.changePct >= 0;
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            setSelectedIdx(null);
                            router.push(`/screener?search=${encodeURIComponent(stk.name)}`);
                          }}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          {/* Stock Name & Symbol */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[#1F242D] border border-white/10 flex items-center justify-center font-bold text-[#00D09C] text-[10px] shrink-0 group-hover:border-[#00D09C]/40">
                                {stk.symbol.substring(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-white block group-hover:text-[#00D09C] transition-colors">{stk.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{stk.symbol}</span>
                              </div>
                            </div>
                          </td>

                          {/* Index Weightage */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-slate-200 font-mono bg-[#181B20] px-2.5 py-1 rounded-lg border border-white/5">
                              {stk.weightPct.toFixed(1)}%
                            </span>
                          </td>

                          {/* Stock Change % */}
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md ${isGain ? "bg-[#00D09C]/10 text-[#00D09C]" : "bg-[#EB5757]/10 text-[#EB5757]"}`}>
                              {isGain ? `+${(Number(stk.changePct) || 0).toFixed(2)}%` : `${(Number(stk.changePct) || 0).toFixed(2)}%`}
                            </span>
                          </td>

                          {/* INDEX PRICE IMPACT (POINTS CONTRIBUTION) */}
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                                (Number(stk.pointImpact) || 0) >= 0 
                                  ? "bg-[#00D09C]/10 text-[#00D09C] border-[#00D09C]/30" 
                                  : "bg-[#EB5757]/10 text-[#EB5757] border-[#EB5757]/30"
                              }`}>
                                {(Number(stk.pointImpact) || 0) >= 0 ? `+${(Number(stk.pointImpact) || 0).toFixed(2)} pts` : `${(Number(stk.pointImpact) || 0).toFixed(2)} pts`}
                              </span>
                            </div>
                          </td>

                          {/* Current Stock Price */}
                          <td className="py-3 px-4 text-right font-bold text-white font-mono">
                            ₹{(Number(stk.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        No constituent stocks found matching "{searchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Footer */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedIdx(null);
                  router.push(`/screener?assetType=STOCKS`);
                }}
                className="flex-1 py-3 bg-[#00D09C] text-slate-950 rounded-xl font-bold text-xs hover:bg-[#00B386] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#00D09C]/10"
              >
                <span>Explore All Stocks in Screener</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() => setSelectedIdx(null)}
                className="px-6 py-3 bg-[#1F242D] text-slate-300 rounded-xl font-bold text-xs hover:bg-[#282E37] transition-colors cursor-pointer border border-white/5"
              >
                Close Modal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Indices Overview Modal */}
      {showGlobalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181B20] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-[#00D09C]" />
                <h3 className="text-xl font-bold text-white">Global & Domestic Market Streams</h3>
              </div>
              <button
                onClick={() => setShowGlobalModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {indices.map((idx, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0D0F12] rounded-xl border border-white/5 hover:border-white/20 transition-all">
                  <div>
                    <span className="font-extrabold text-white text-sm">{idx.name}</span>
                    <span className="text-xs text-slate-400 block">{idx.symbol}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold text-sm">
                      ₹{(Number(idx.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`block text-xs font-bold ${(Number(idx.change) || 0) >= 0 ? "text-[#00D09C]" : "text-[#EB5757]"}`}>
                      {(Number(idx.change) || 0) > 0 ? `+${(Number(idx.change) || 0).toFixed(2)}` : (Number(idx.change) || 0).toFixed(2)} ({(Number(idx.change_pct) || 0) > 0 ? `+${(Number(idx.change_pct) || 0).toFixed(2)}` : (Number(idx.change_pct) || 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowGlobalModal(false)}
                className="px-5 py-2 bg-[#00D09C] text-slate-950 font-bold text-xs rounded-xl hover:bg-[#00B386] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
