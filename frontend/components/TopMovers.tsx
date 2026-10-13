"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, TrendingUp, TrendingDown, Zap } from "lucide-react";
import AssetDetailModal from "@/components/AssetDetailModal";

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
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Stock Brand Colors for Logo Avatars
  const stockLogos: Record<string, { bg: string; text: string; label: string }> = {
    "TVSMOTOR.NS": { bg: "bg-red-600", text: "text-white", label: "TVS" },
    "MUTHOOTFIN.NS": { bg: "bg-[#181B20] border border-red-500/30", text: "text-red-500", label: "M" },
    "SHRIRAMFIN.NS": { bg: "bg-amber-500", text: "text-black", label: "S" },
    "HINDZINC.NS": { bg: "bg-[#181B20] border border-white/20", text: "text-white", label: "HZ" },
    "BAJAJFINSV.NS": { bg: "bg-blue-600", text: "text-white", label: "B" },
    "HAL.NS": { bg: "bg-[#181B20] border border-blue-500/30", text: "text-cyan-400", label: "HAL" },
    "RELAXO.NS": { bg: "bg-amber-600", text: "text-white", label: "R" },
    "BATAINDIA.NS": { bg: "bg-red-700", text: "text-white", label: "BATA" },
    "METROBRAND.NS": { bg: "bg-[#181B20] border border-emerald-500/30", text: "text-[#00D09C]", label: "M" },
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Section Header */}
      <h2 className="text-xl font-bold text-white tracking-tight">Top movers today</h2>

      {/* Filter Tabs & Index Dropdown Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType("gainers")}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === "gainers"
                ? "bg-[#181B20] text-white border border-[#00D09C]"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            Gainers
          </button>
          <button
            onClick={() => setFilterType("losers")}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === "losers"
                ? "bg-[#181B20] text-white border border-[#EB5757]"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            Losers
          </button>
          <button
            onClick={() => setFilterType("volume_shockers")}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === "volume_shockers"
                ? "bg-[#181B20] text-white border border-amber-400"
                : "bg-[#181B20]/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            Volume shockers
          </button>
        </div>

        {/* Index Selector Dropdown */}
        <div className="relative">
          <select
            value={indexFilter}
            onChange={(e) => setIndexFilter(e.target.value)}
            className="appearance-none bg-[#181B20] text-white text-xs font-semibold px-4 py-2 pr-8 rounded-full border border-white/10 hover:border-white/20 focus:outline-none cursor-pointer"
          >
            <option value="NIFTY 100">NIFTY 100</option>
            <option value="NIFTY 50">NIFTY 50</option>
            <option value="ALL STOCKS">ALL STOCKS</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Table Card Surface */}
      <div className="bg-[#181B20] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Company</th>
                <th className="py-3.5 px-4 text-center">Trend (1D)</th>
                <th className="py-3.5 px-6 text-right">Market price (1D)</th>
                <th className="py-3.5 px-6 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading live market movers...
                  </td>
                </tr>
              ) : (
                stocks.map((st, i) => {
                  const isPositive = st.change >= 0;
                  const colorClass = isPositive ? "text-[#00D09C]" : "text-[#EB5757]";
                  const strokeColor = isPositive ? "#00D09C" : "#EB5757";
                  const logoMeta = stockLogos[st.symbol] || { bg: "bg-[#20242B]", text: "text-white", label: st.name.slice(0, 2).toUpperCase() };

                  return (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedStock({
                        id: (absHash(st.symbol) % 100000000) + 10000000,
                        name: st.name,
                        amc: `NSE: ${st.symbol}`,
                        category: "Listed Stock",
                        fund_rating: 5,
                        expense_ratio: 0.0,
                        aum: 250000.0,
                        risk_category: "High",
                        ticker: st.symbol,
                        initial_nav: st.price
                      })}
                      className="hover:bg-[#20242B] transition-colors cursor-pointer"
                    >
                      {/* Company Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl ${logoMeta.bg} flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0`}>
                            <span className={logoMeta.text}>{logoMeta.label}</span>
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{st.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{st.symbol}</span>
                          </div>
                        </div>
                      </td>

                      {/* Mini Sparkline Chart */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          <svg width="120" height="28" className="overflow-visible">
                            <path
                              d={generateSparklinePath(st.sparkline)}
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
                      <td className="py-4 px-6 text-right">
                        <div className="font-bold text-white text-sm">
                          ₹{st.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`font-semibold ${colorClass} text-xs mt-0.5`}>
                          {st.change > 0 ? `${st.change.toFixed(2)}` : st.change.toFixed(2)} ({Math.abs(st.change_pct).toFixed(2)}%)
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-6 text-right font-bold text-slate-200">
                        {st.volume.toLocaleString("en-IN")}
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
