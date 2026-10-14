"use client";

import { useState } from "react";
import { X, Layers, AlertTriangle, CheckCircle, Info, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { FALLBACK_ASSETS } from "@/lib/fallbackAssets";

interface PortfolioOverlapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset top mutual fund holdings for high-fidelity X-Ray analysis
const FUND_HOLDINGS_DB: Record<string, { stock: string; weight: number }[]> = {
  "HDFC Top 100 Fund": [
    { stock: "HDFC Bank Ltd", weight: 9.8 },
    { stock: "Reliance Industries Ltd", weight: 9.2 },
    { stock: "ICICI Bank Ltd", weight: 7.9 },
    { stock: "Infosys Ltd", weight: 6.4 },
    { stock: "Larsen & Toubro Ltd", weight: 4.8 },
    { stock: "ITC Ltd", weight: 4.2 },
    { stock: "State Bank of India", weight: 3.9 },
    { stock: "Bharti Airtel Ltd", weight: 3.5 },
  ],
  "Parag Parikh Flexi Cap Fund": [
    { stock: "HDFC Bank Ltd", weight: 8.4 },
    { stock: "Bajaj Holdings", weight: 7.1 },
    { stock: "ITC Ltd", weight: 6.8 },
    { stock: "ICICI Bank Ltd", weight: 6.2 },
    { stock: "Alphabet Inc (Google)", weight: 5.5 },
    { stock: "Microsoft Corp", weight: 4.9 },
    { stock: "Coal India Ltd", weight: 4.1 },
    { stock: "Reliance Industries Ltd", weight: 3.8 },
  ],
  "Mirae Asset Large Cap Fund": [
    { stock: "HDFC Bank Ltd", weight: 9.5 },
    { stock: "Reliance Industries Ltd", weight: 8.8 },
    { stock: "ICICI Bank Ltd", weight: 8.1 },
    { stock: "Infosys Ltd", weight: 6.9 },
    { stock: "Tata Consultancy Services", weight: 4.5 },
    { stock: "Bharti Airtel Ltd", weight: 4.1 },
    { stock: "Kotak Mahindra Bank", weight: 3.2 },
    { stock: "Larsen & Toubro Ltd", weight: 3.0 },
  ],
  "Nippon India Small Cap Fund": [
    { stock: "Tube Investments of India", weight: 3.2 },
    { stock: "Apar Industries", weight: 2.8 },
    { stock: "HDFC Bank Ltd", weight: 2.1 },
    { stock: "Voltamp Transformers", weight: 2.0 },
    { stock: "Multi Commodity Exchange", weight: 1.9 },
    { stock: "Karur Vysya Bank", weight: 1.8 },
  ],
  "UTI Nifty 50 Index Fund": [
    { stock: "HDFC Bank Ltd", weight: 11.2 },
    { stock: "Reliance Industries Ltd", weight: 9.8 },
    { stock: "ICICI Bank Ltd", weight: 7.6 },
    { stock: "Infosys Ltd", weight: 5.8 },
    { stock: "Larsen & Toubro Ltd", weight: 4.4 },
    { stock: "Tata Consultancy Services", weight: 4.0 },
    { stock: "Bharti Airtel Ltd", weight: 3.8 },
    { stock: "ITC Ltd", weight: 3.6 },
  ],
};

export default function PortfolioOverlapModal({ isOpen, onClose }: PortfolioOverlapModalProps) {
  const fundNames = Object.keys(FUND_HOLDINGS_DB);
  const [fundA, setFundA] = useState(fundNames[0]);
  const [fundB, setFundB] = useState(fundNames[1]);

  if (!isOpen) return null;

  const holdingsA = FUND_HOLDINGS_DB[fundA] || [];
  const holdingsB = FUND_HOLDINGS_DB[fundB] || [];

  // Calculate overlapping stocks and minimum common weights
  const commonStocks: { stock: string; weightA: number; weightB: number; minWeight: number }[] = [];
  let totalOverlapWeight = 0;

  for (const hA of holdingsA) {
    const matchB = holdingsB.find((hB) => hB.stock === hA.stock);
    if (matchB) {
      const minWeight = Math.min(hA.weight, matchB.weight);
      commonStocks.push({
        stock: hA.stock,
        weightA: hA.weight,
        weightB: matchB.weight,
        minWeight,
      });
      totalOverlapWeight += minWeight * 2; // bidirectional overlap representation
    }
  }

  // Calculate total overlap percentage normalized to 100%
  const overlapPct = Math.min(100, Math.round(totalOverlapWeight));

  const getVerdict = (pct: number) => {
    if (pct > 40) {
      return {
        badge: "High Redundancy",
        color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        message:
          "These two funds have significant overlap (>40%). You are paying dual management fees for essentially the same top underlying stocks. Consider consolidating into a single diversified fund.",
      };
    }
    if (pct >= 20) {
      return {
        badge: "Moderate Overlap",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        message:
          "Healthy complementation. Both funds share core market leaders (e.g. HDFC Bank, Reliance) but maintain distinct satellite alpha strategies.",
      };
    }
    return {
      badge: "Excellent Diversification",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      message:
        "Very low overlap (<20%). These two funds provide genuine diversification across distinct market segments and strategies.",
    };
  };

  const verdict = getVerdict(overlapPct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel bg-slate-950/95 border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              Portfolio Overlap Analyzer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mutual Fund X-Ray
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Detect overlapping common stocks across mutual funds to eliminate duplicate expense ratios and over-concentration.
            </p>
          </div>
        </div>

        {/* Fund Selection Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Primary Fund A</label>
            <select
              value={fundA}
              onChange={(e) => setFundA(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              {fundNames.map((name) => (
                <option key={name} value={name} disabled={name === fundB}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Comparing With Fund B</label>
            <select
              value={fundB}
              onChange={(e) => setFundB(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              {fundNames.map((name) => (
                <option key={name} value={name} disabled={name === fundA}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Overlap Metric Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-white/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs text-slate-400 font-semibold block">Calculated Overlap Score</span>
            <div className="flex items-baseline gap-3 justify-center sm:justify-start">
              <span className="font-heading font-black text-4xl text-white">{overlapPct}%</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${verdict.color}`}>
                {verdict.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">{verdict.message}</p>
          </div>

          {/* Overlap Visual Indicator Bar */}
          <div className="w-full sm:w-48 space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Overlap</span>
              <span>{overlapPct}%</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overlapPct > 40
                    ? "bg-rose-500"
                    : overlapPct >= 20
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${overlapPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block text-center">
              {commonStocks.length} common companies held
            </span>
          </div>
        </div>

        {/* Common Stocks Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Common Underlying Stocks ({commonStocks.length})
          </h3>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                  <th className="py-2.5 px-4 font-semibold">Stock Name</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Weight in {fundA.split(" ")[0]}</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Weight in {fundB.split(" ")[0]}</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-indigo-400">Common Overlap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {commonStocks.map((item) => (
                  <tr key={item.stock} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-bold text-white">{item.stock}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-300">{item.weightA}%</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-300">{item.weightB}%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-400">
                      {item.minWeight}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Footnote */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <span>Want optimal asset combination? Check the AI Advisor for personalized rebalancing.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-slate-950 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
