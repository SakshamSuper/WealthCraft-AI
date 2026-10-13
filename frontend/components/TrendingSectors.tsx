"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronRight, Radio, Star, Building2, Home, Briefcase, ShoppingBag, Layers } from "lucide-react";

export default function TrendingSectors() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const data = await api.getTrendingSectors();
        setSectors(data);
      } catch (err) {
        console.error("Failed to load trending sectors", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  const getSectorIcon = (name: string) => {
    if (name.includes("Telecom")) return Radio;
    if (name.includes("Rating")) return Star;
    if (name.includes("Cement") || name.includes("Building")) return Building2;
    if (name.includes("Furniture")) return Home;
    if (name.includes("Leather")) return Briefcase;
    if (name.includes("Footwear")) return ShoppingBag;
    return Layers;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Section Header */}
      <h2 className="text-xl font-bold text-white tracking-tight">Sectors trending today</h2>

      {/* Main Table Card Surface */}
      <div className="bg-[#181B20] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-4 px-2">Sector</th>
                <th className="pb-4 px-6 text-center">Gainers/Losers</th>
                <th className="pb-4 px-4 text-right">1D price change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    Loading trending sectors...
                  </td>
                </tr>
              ) : (
                sectors.map((sec, i) => {
                  const Icon = getSectorIcon(sec.sector);
                  const isPositive = sec.change_pct >= 0;
                  const colorClass = isPositive ? "text-[#00D09C]" : "text-[#EB5757]";
                  const total = sec.gainers + sec.losers || 1;
                  const gainerWidthPct = (sec.gainers / total) * 100;

                  return (
                    <tr key={i} className="hover:bg-[#20242B]/50 transition-colors">
                      {/* Sector Name & Icon */}
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-xl bg-[#20242B] border border-white/5 text-slate-300 flex-shrink-0">
                            <Icon size={18} />
                          </div>
                          <span className="font-bold text-white text-sm">{sec.sector}</span>
                        </div>
                      </td>

                      {/* Gainers / Losers Split Progress Bar */}
                      <td className="py-4 px-6">
                        <div className="max-w-xs mx-auto">
                          <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1 px-0.5">
                            <span>{sec.gainers}</span>
                            <span>{sec.losers}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#EB5757] rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-[#00D09C] transition-all duration-500"
                              style={{ width: `${gainerWidthPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 1D Price Change */}
                      <td className="py-4 px-4 text-right">
                        <span className={`font-bold text-sm ${colorClass}`}>
                          {sec.change_pct > 0 ? `+${sec.change_pct.toFixed(2)}%` : `${sec.change_pct.toFixed(2)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Link */}
        <div className="pt-2">
          <button className="flex items-center gap-1 text-xs font-bold text-[#00D09C] hover:underline cursor-pointer">
            <span>See all sectors</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
