"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronRight, ChevronDown, Radio, Star, Building2, Home, Briefcase, ShoppingBag, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { TRENDING_SECTORS } from "@/lib/marketData";

export default function TrendingSectors() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const data = await api.getTrendingSectors();
        if (Array.isArray(data) && data.length > 0) {
          setSectors(data);
        } else {
          setSectors(TRENDING_SECTORS);
        }
      } catch (err) {
        console.error("Failed to load trending sectors", err);
        setSectors(TRENDING_SECTORS);
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  const getSectorIcon = (name: string) => {
    if (name.includes("Telecom")) return Radio;
    if (name.includes("Defense") || name.includes("Rating") || name.includes("Capital")) return Star;
    if (name.includes("Cement") || name.includes("Building") || name.includes("Bank")) return Building2;
    if (name.includes("Furniture") || name.includes("Realty") || name.includes("Infra")) return Home;
    if (name.includes("Leather")) return Briefcase;
    if (name.includes("Footwear") || name.includes("FMCG") || name.includes("Consumer")) return ShoppingBag;
    return Layers;
  };

  const displayedSectors = showAll ? sectors : sectors.slice(0, 5);

  return (
    <div className="space-y-4 font-sans">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers size={20} className="text-cyan-400" />
          Sectors trending today
        </h2>
        <span className="text-[11px] font-semibold text-slate-400">10 NSE Sectors</span>
      </div>

      {/* Main Table Card Surface */}
      <div className="bg-[#181B20] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-2">Sector</th>
                <th className="pb-3 px-4 text-center">Gainers / Losers</th>
                <th className="pb-3 px-3 text-right">1D price change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    <div className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading trending sectors...
                  </td>
                </tr>
              ) : displayedSectors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No sectors available.
                  </td>
                </tr>
              ) : (
                displayedSectors.map((sec, i) => {
                  const Icon = getSectorIcon(sec.sector);
                  const isPositive = (sec.change_pct ?? 0) >= 0;
                  const colorClass = isPositive ? "text-[#00D09C]" : "text-[#EB5757]";
                  
                  // Defensive fallback for gainers/losers counts
                  const gainers = typeof sec.gainers === "number" ? sec.gainers : (isPositive ? 25 : 8);
                  const losers = typeof sec.losers === "number" ? sec.losers : (isPositive ? 7 : 24);
                  const total = gainers + losers || 1;
                  const gainerWidthPct = Math.min(100, Math.max(0, (gainers / total) * 100));
                  const topStockClean = (sec.top_stock || "").replace(/\.NS$/i, "");

                  return (
                    <tr key={i} className="hover:bg-[#20242B]/60 transition-colors group">
                      {/* Sector Name & Icon */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#20242B] border border-white/5 text-slate-300 group-hover:text-cyan-400 transition-colors flex-shrink-0">
                            <Icon size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block group-hover:text-cyan-400 transition-colors">
                              {sec.sector}
                            </span>
                            {topStockClean && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Top: <span className="text-slate-300">{topStockClean}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Gainers / Losers Split Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="max-w-[180px] mx-auto">
                          <div className="flex justify-between items-center text-[10px] font-bold mb-1 px-0.5">
                            <span className="text-[#00D09C] flex items-center gap-0.5">
                              ▲ {gainers}
                            </span>
                            <span className="text-slate-500 font-normal">vs</span>
                            <span className="text-[#EB5757] flex items-center gap-0.5">
                              ▼ {losers}
                            </span>
                          </div>
                          <div 
                            className="w-full h-2 bg-[#EB5757] rounded-full overflow-hidden flex shadow-inner cursor-help"
                            title={`${gainers} Gainers (${gainerWidthPct.toFixed(0)}%) • ${losers} Losers (${(100 - gainerWidthPct).toFixed(0)}%)`}
                          >
                            <div
                              className="h-full bg-[#00D09C] transition-all duration-500"
                              style={{ width: `${gainerWidthPct}%` }}
                            />
                            <div
                              className="h-full bg-[#EB5757] transition-all duration-500"
                              style={{ width: `${100 - gainerWidthPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 1D Price Change */}
                      <td className="py-3 px-3 text-right">
                        <span className={`font-bold text-sm ${colorClass} inline-flex items-center gap-0.5`}>
                          {(Number(sec.change_pct) || 0) > 0 ? `+${(Number(sec.change_pct) || 0).toFixed(2)}%` : `${(Number(sec.change_pct) || 0).toFixed(2)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Expand / Collapse Toggle Link */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#00D09C] hover:text-[#00D09C]/80 transition-colors cursor-pointer"
          >
            <span>{showAll ? "Show top 5 sectors" : `See all ${sectors.length || 10} sectors`}</span>
            {showAll ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronRight size={14} />}
          </button>
          <span className="text-[10px] text-slate-500">Updated realtime</span>
        </div>
      </div>
    </div>
  );
}
