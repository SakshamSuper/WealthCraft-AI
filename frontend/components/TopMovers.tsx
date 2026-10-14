"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, TrendingUp, TrendingDown, Zap } from "lucide-react";
import AssetDetailModal from "@/components/AssetDetailModal";
import { ensureSparkline } from "@/lib/marketData";

export default function TopMovers() {
  const [filterType, setFilterType] = useState<"gainers" | "losers" | "volume_shockers">("gainers");
  const [indexFilter, setIndexFilter] = useState("NIFTY 100");
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);

  const fetchMovers = async () => {
    setLoading(true);
    try {
      const data = await api.getTopMovers(filterType, indexFilter);
      setStocks(data);
    } catch (err) {
      console.error("Failed to load top movers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovers();
  }, [filterType, indexFilter]);

  // Generate SVG path string from sparkline array
  const generateSparklinePath = (points: number[]) => {
    if (!points || points.length === 0) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 120;
    const height = 28;

    return points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Generate SVG area fill path
  const generateAreaPath = (points: number[]) => {
    if (!points || points.length === 0) return "";
    const linePath = generateSparklinePath(points);
    const width = 120;
    const height = 28;
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  };

  // Stock Brand Colors for Logo Avatars
  const stockLogos: Record<string, { bg: string; text: string; label: string }> = {
    "TVSMOTOR.NS": { bg: "bg-red-600", text: "text-white", label: "TVS" },
    "BEL.NS": { bg: "bg-blue-700", text: "text-white", label: "BEL" },
    "MUTHOOTFIN.NS": { bg: "bg-[#181B20] border border-red-500/40", text: "text-red-500", label: "MF" },
    "SHRIRAMFIN.NS": { bg: "bg-amber-500", text: "text-black", label: "SF" },
    "HAL.NS": { bg: "bg-cyan-900 border border-cyan-400/30", text: "text-cyan-300", label: "HAL" },
    "M&M.NS": { bg: "bg-red-800", text: "text-white", label: "M&M" },
    "BAJAJFINSV.NS": { bg: "bg-blue-600", text: "text-white", label: "BJF" },
    "ICICIBANK.NS": { bg: "bg-orange-700", text: "text-white", label: "ICICI" },
    "HINDZINC.NS": { bg: "bg-slate-700", text: "text-white", label: "HZ" },
    "METROBRAND.NS": { bg: "bg-emerald-800", text: "text-emerald-200", label: "MB" },
    "RELAXO.NS": { bg: "bg-amber-700", text: "text-white", label: "REL" },
    "BATAINDIA.NS": { bg: "bg-red-700", text: "text-white", label: "BATA" },
    "INDUSINDBK.NS": { bg: "bg-rose-900", text: "text-rose-200", label: "IIB" },
    "TECHM.NS": { bg: "bg-blue-800", text: "text-white", label: "TM" },
    "NESTLEIND.NS": { bg: "bg-amber-900", text: "text-amber-200", label: "NES" },
    "ASIANPAINT.NS": { bg: "bg-indigo-700", text: "text-white", label: "AP" },
    "HINDUNILVR.NS": { bg: "bg-blue-900", text: "text-blue-200", label: "HUL" },
    "TATAMOTORS.NS": { bg: "bg-blue-600", text: "text-white", label: "TATA" },
    "SBIN.NS": { bg: "bg-sky-700", text: "text-white", label: "SBI" },
    "ZOMATO.NS": { bg: "bg-red-600", text: "text-white", label: "ZOM" },
    "JIOFIN.NS": { bg: "bg-blue-700", text: "text-white", label: "JIO" },
    "IDEA.NS": { bg: "bg-red-500", text: "text-yellow-300", label: "Vi" },
    "RELIANCE.NS": { bg: "bg-blue-800", text: "text-white", label: "RIL" },
    "TCS.NS": { bg: "bg-slate-800 border border-cyan-500/30", text: "text-cyan-400", label: "TCS" },
    "HDFCBANK.NS": { bg: "bg-blue-900 border border-blue-500/30", text: "text-white", label: "HDFC" },
  };

  const getLogoMeta = (symbol: string, name: string) => {
    if (stockLogos[symbol]) return stockLogos[symbol];
    const cleanSym = symbol.replace(/\.NS$/i, "");
    if (stockLogos[`${cleanSym}.NS`]) return stockLogos[`${cleanSym}.NS`];
    // Dynamic fallback based on ticker hash
    const colors = [
      { bg: "bg-blue-600", text: "text-white" },
      { bg: "bg-indigo-600", text: "text-white" },
      { bg: "bg-purple-600", text: "text-white" },
      { bg: "bg-emerald-600", text: "text-white" },
      { bg: "bg-teal-600", text: "text-white" },
      { bg: "bg-amber-600", text: "text-white" },
    ];
    const color = colors[absHash(symbol) % colors.length];
    return { ...color, label: (cleanSym.slice(0, 3) || name.slice(0, 2)).toUpperCase() };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {filterType === "gainers" && <TrendingUp size={20} className="text-[#00D09C]" />}
          {filterType === "losers" && <TrendingDown size={20} className="text-[#EB5757]" />}
          {filterType === "volume_shockers" && <Zap size={20} className="text-amber-400" />}
          Top movers today
        </h2>
        <span className="text-[11px] font-semibold text-slate-400">NSE Live</span>
      </div>

      {/* Filter Tabs & Index Dropdown Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType("gainers")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === "gainers"
                ? "bg-[#181B20] text-[#00D09C] border border-[#00D09C] shadow-sm shadow-[#00D09C]/20"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <TrendingUp size={13} />
            Gainers
          </button>
          <button
            onClick={() => setFilterType("losers")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === "losers"
                ? "bg-[#181B20] text-[#EB5757] border border-[#EB5757] shadow-sm shadow-[#EB5757]/20"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <TrendingDown size={13} />
            Losers
          </button>
          <button
            onClick={() => setFilterType("volume_shockers")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === "volume_shockers"
                ? "bg-[#181B20] text-amber-400 border border-amber-400 shadow-sm shadow-amber-400/20"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <Zap size={13} />
            Volume shockers
          </button>
        </div>

        {/* Index Selector Dropdown */}
        <div className="relative">
          <select
            value={indexFilter}
            onChange={(e) => setIndexFilter(e.target.value)}
            className="appearance-none bg-[#181B20] text-white text-xs font-semibold px-3.5 py-1.5 pr-8 rounded-full border border-white/10 hover:border-white/20 focus:outline-none cursor-pointer"
          >
            <option value="NIFTY 100">NIFTY 100</option>
            <option value="NIFTY 50">NIFTY 50</option>
            <option value="ALL STOCKS">ALL STOCKS</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Table Card Surface */}
      <div className="bg-[#181B20] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5">Company</th>
                <th className="py-3 px-4 text-center">Trend (1D)</th>
                <th className="py-3 px-5 text-right">Market price (1D)</th>
                <th className="py-3 px-5 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <div className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading live market movers...
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No movers available for this filter.
                  </td>
                </tr>
              ) : (
                stocks.map((st, i) => {
                  const isPositive = (st.change ?? 0) >= 0;
                  const colorClass = isPositive ? "text-[#00D09C]" : "text-[#EB5757]";
                  const strokeColor = isPositive ? "#00D09C" : "#EB5757";
                  const symbolStr = st.symbol || st.ticker || "STOCK";
                  const cleanSymbol = symbolStr.replace(/\.NS$/i, "");
                  const logoMeta = getLogoMeta(symbolStr, st.name);
                  const sparklinePoints = ensureSparkline(st.price, st.change, st.sparkline);

                  return (
                    <tr
                      key={i}
                      onClick={() =>
                        setSelectedStock({
                          id: (absHash(symbolStr) % 100000000) + 10000000,
                          name: st.name,
                          amc: `NSE: ${cleanSymbol}`,
                          category: "Listed Stock",
                          fund_rating: 5,
                          expense_ratio: 0.0,
                          aum: 250000.0,
                          risk_category: "High",
                          ticker: symbolStr,
                          initial_nav: st.price,
                        })
                      }
                      className="hover:bg-[#20242B] transition-colors cursor-pointer group"
                    >
                      {/* Company Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${logoMeta.bg} flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            <span className={logoMeta.text}>{logoMeta.label}</span>
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block group-hover:text-emerald-400 transition-colors">
                              {st.name}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                              {cleanSymbol}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mini Sparkline Chart */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          <svg width="120" height="28" className="overflow-visible">
                            <defs>
                              <linearGradient id={`grad-${i}-${isPositive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d={generateAreaPath(sparklinePoints)}
                              fill={`url(#grad-${i}-${isPositive ? "up" : "down"})`}
                            />
                            <path
                              d={generateSparklinePath(sparklinePoints)}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </td>

                      {/* Market Price & 1D Change */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="font-bold text-white text-sm">
                          ₹{Number(st.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`font-semibold ${colorClass} text-xs mt-0.5 flex items-center justify-end gap-1`}>
                          <span>
                            {st.change > 0 ? `+${st.change.toFixed(2)}` : st.change.toFixed(2)}
                          </span>
                          <span>
                            ({st.change_pct > 0 ? `+` : ""}{st.change_pct.toFixed(2)}%)
                          </span>
                        </div>
                      </td>

                      {/* Volume & Surge Multiplier */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="font-bold text-slate-200 text-xs">
                          {Number(st.volume).toLocaleString("en-IN")}
                        </div>
                        {st.volume_multiple && (
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5 inline-flex items-center gap-0.5">
                            <Zap size={10} />
                            {st.volume_multiple}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Groww-styled Asset Detail Modal */}
      <AssetDetailModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        fundId={selectedStock?.id || null}
        initialFund={selectedStock}
      />
    </div>
  );
}

function absHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
