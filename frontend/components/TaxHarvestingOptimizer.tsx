"use client";

import { useState } from "react";
import { ShieldCheck, IndianRupee, Info, CheckCircle2, ArrowRight, Sparkles, TrendingUp } from "lucide-react";

interface TaxHarvestingOptimizerProps {
  portfolioItems?: any[];
}

export default function TaxHarvestingOptimizer({ portfolioItems = [] }: TaxHarvestingOptimizerProps) {
  const [harvestSimulated, setHarvestSimulated] = useState(false);

  // Indian Section 112A annual tax-free LTCG limit
  const ANNUAL_LTCG_EXEMPTION = 125000; // ₹1.25 Lakh
  const LTCG_TAX_RATE = 0.125; // 12.5%

  // Compute unrealized gains from portfolio or default simulated demo
  const sampleHoldings = portfolioItems.length > 0 ? portfolioItems : [
    { fund_name: "Reliance Industries Ltd", units: 30, purchase_price: 1180, current_nav: 1303.70, days: 420 },
    { fund_name: "HDFC Top 100 Fund", units: 150, purchase_price: 720, current_nav: 839.43, days: 395 },
    { fund_name: "Bharti Airtel Ltd", units: 25, purchase_price: 1520, current_nav: 1645.20, days: 210 },
  ];

  let totalUnrealizedLTCG = 0;
  let totalUnrealizedSTCG = 0;

  const harvestableList = sampleHoldings.map((item: any) => {
    const invested = item.units * item.purchase_price;
    const currentVal = item.units * (item.current_nav || item.purchase_price);
    const gain = Math.max(0, currentVal - invested);
    const isLTCG = (item.days || 400) > 365;

    if (isLTCG) totalUnrealizedLTCG += gain;
    else totalUnrealizedSTCG += gain;

    return {
      name: item.fund_name,
      units: item.units,
      purchasePrice: item.purchase_price,
      currentPrice: item.current_nav,
      gain,
      isLTCG,
      harvestableUnits: isLTCG ? item.units : 0,
      harvestableGain: isLTCG ? gain : 0,
    };
  });

  const remainingExemption = Math.max(0, ANNUAL_LTCG_EXEMPTION - totalUnrealizedLTCG);
  const potentialTaxSaved = Math.min(totalUnrealizedLTCG, ANNUAL_LTCG_EXEMPTION) * LTCG_TAX_RATE;
  const utilizedPct = Math.min(100, Math.round((totalUnrealizedLTCG / ANNUAL_LTCG_EXEMPTION) * 100));

  return (
    <div className="glass-panel p-6 bg-slate-950/60 border border-white/10 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              Tax Harvesting & LTCG Optimizer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Section 112A (FY 2026-27)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Harvest up to ₹1,25,000 in long-term gains tax-free before March 31 to reset your purchase cost basis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5">
          <Info size={14} className="text-emerald-400" />
          <span>Exemption Limit: ₹1,25,000 / yr</span>
        </div>
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
          <span className="text-xs text-slate-400 block">Annual Tax-Free Limit</span>
          <div className="text-xl font-heading font-bold text-white mt-1">₹1,25,000</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Sec 112A LTCG Exemption</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
          <span className="text-xs text-slate-400 block">Unrealized LTCG (&gt;1 Year)</span>
          <div className="text-xl font-heading font-bold text-emerald-400 mt-1">
            ₹{Math.round(totalUnrealizedLTCG).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-500 mt-1 block">Eligible for 0% tax harvest</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
          <span className="text-xs text-slate-400 block">Unused Exemption Allowance</span>
          <div className="text-xl font-heading font-bold text-amber-400 mt-1">
            ₹{Math.round(remainingExemption).toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-500 mt-1 block">Can harvest before Mar 31</span>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
          <span className="text-xs text-emerald-300 font-semibold block">Net Tax Saved</span>
          <div className="text-2xl font-heading font-black text-emerald-400 mt-1">
            +₹{Math.round(potentialTaxSaved).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-300/70 mt-1 block">Direct tax exemption gained</span>
        </div>
      </div>

      {/* Progress Bar of Exemption Used */}
      <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-semibold">Exemption Utilization</span>
          <span className="text-emerald-400 font-mono font-bold">{utilizedPct}% (₹{Math.round(totalUnrealizedLTCG).toLocaleString()} / ₹1,25,000)</span>
        </div>
        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${utilizedPct}%` }}
          />
        </div>
      </div>

      {/* Recommended Harvesting Actions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Eligible Holdings for Tax-Loss / Gain Harvesting
          </h3>
          <span className="text-[11px] text-slate-500">Sell & Rebuy on same/next day</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                <th className="py-2.5 px-4 font-semibold">Holding</th>
                <th className="py-2.5 px-4 font-semibold text-right">Holding Units</th>
                <th className="py-2.5 px-4 font-semibold text-right">Avg Cost</th>
                <th className="py-2.5 px-4 font-semibold text-right">Current LTP</th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-400">Harvestable Gain</th>
                <th className="py-2.5 px-4 font-semibold text-right">Tax Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {harvestableList.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 font-bold text-white">{item.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">{item.units}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">₹{item.purchasePrice}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">₹{item.currentPrice}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                    +₹{Math.round(item.gain).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.isLTCG
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}
                    >
                      {item.isLTCG ? "LTCG (Tax-Free)" : "STCG (< 1 Yr)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulation Result / CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="text-emerald-400" size={20} />
          <div className="text-xs">
            <span className="font-bold text-white block">
              {harvestSimulated
                ? "Tax Harvesting Strategy Simulated! New Purchase Base Reset."
                : `Harvesting will save ₹${Math.round(potentialTaxSaved).toLocaleString()} in taxes this financial year.`}
            </span>
            <span className="text-slate-400 block mt-0.5">
              By booking and re-buying within your ₹1.25L limit, you legally permanently avoid paying 12.5% tax on these profits.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHarvestSimulated(true)}
          disabled={harvestSimulated}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {harvestSimulated ? (
            <>
              <CheckCircle2 size={14} /> Plan Simulated
            </>
          ) : (
            <>
              Simulate Tax Harvest <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
