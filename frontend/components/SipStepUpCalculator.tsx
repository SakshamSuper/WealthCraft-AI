"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Sparkles, ChevronRight, Award, Zap } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SipStepUpCalculator() {
  const [initialSip, setInitialSip] = useState(15000);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(14);
  const [years, setYears] = useState(15);

  // Calculate annual points for Flat SIP vs Step-Up SIP
  const monthlyRate = expectedReturn / 100 / 12;

  let flatTotalInvested = 0;
  let flatFutureValue = 0;

  let stepUpTotalInvested = 0;
  let stepUpFutureValue = 0;

  const chartData = [];

  for (let yr = 1; yr <= years; yr++) {
    // Current year monthly SIP for step-up
    const currentMonthlyStepUp = initialSip * Math.pow(1 + stepUpPct / 100, yr - 1);

    // Simulate 12 months for this year
    for (let m = 1; m <= 12; m++) {
      // Flat SIP compounding
      flatTotalInvested += initialSip;
      flatFutureValue = (flatFutureValue + initialSip) * (1 + monthlyRate);

      // Step-Up SIP compounding
      stepUpTotalInvested += currentMonthlyStepUp;
      stepUpFutureValue = (stepUpFutureValue + currentMonthlyStepUp) * (1 + monthlyRate);
    }

    chartData.push({
      year: `Yr ${yr}`,
      FlatSIP: Math.round(flatFutureValue),
      StepUpSIP: Math.round(stepUpFutureValue),
      FlatInvested: Math.round(flatTotalInvested),
      StepUpInvested: Math.round(stepUpTotalInvested),
    });
  }

  const extraWealth = Math.max(0, stepUpFutureValue - flatFutureValue);
  const wealthMultiplier = flatFutureValue > 0 ? (stepUpFutureValue / flatFutureValue).toFixed(1) : "1.0";

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Math.round(val).toLocaleString()}`;
  };

  return (
    <div className="glass-panel p-6 bg-slate-950/60 border border-white/10 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
            <Zap size={22} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              SIP Step-Up Wealth Visualizer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                10x Compounding Alpha
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              See how increasing your SIP alongside annual salary increments explodes your final corpus.
            </p>
          </div>
        </div>
      </div>

      {/* Sliders & Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
        {/* Initial Monthly SIP */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Monthly SIP</span>
            <span className="text-white font-mono font-bold">₹{initialSip.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="2000"
            max="100000"
            step="1000"
            value={initialSip}
            onChange={(e) => setInitialSip(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>₹2,000</span>
            <span>₹1,00,000</span>
          </div>
        </div>

        {/* Annual Step-Up % */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Annual Step-Up</span>
            <span className="text-amber-400 font-mono font-bold">+{stepUpPct}% / yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={stepUpPct}
            onChange={(e) => setStepUpPct(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0% (Flat)</span>
            <span>25% / yr</span>
          </div>
        </div>

        {/* Expected Return */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Expected CAGR</span>
            <span className="text-emerald-400 font-mono font-bold">{expectedReturn}%</span>
          </div>
          <input
            type="range"
            min="8"
            max="22"
            step="0.5"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>8% (Debt)</span>
            <span>22% (Aggressive)</span>
          </div>
        </div>

        {/* Horizon (Years) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Investment Horizon</span>
            <span className="text-blue-400 font-mono font-bold">{years} Years</span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>3 Yrs</span>
            <span>30 Yrs</span>
          </div>
        </div>
      </div>

      {/* Comparison Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Flat SIP Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 block">Flat SIP (0% Step-Up)</span>
          <div className="text-xl font-heading font-bold text-slate-200">
            {formatCurrency(flatFutureValue)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Invested: {formatCurrency(flatTotalInvested)}
          </span>
        </div>

        {/* Step-Up SIP Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-semibold block">Step-Up SIP (+{stepUpPct}%)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
              {wealthMultiplier}x Corpus
            </span>
          </div>
          <div className="text-2xl font-heading font-black text-amber-400">
            {formatCurrency(stepUpFutureValue)}
          </div>
          <span className="text-[11px] text-amber-300/70 block">
            Invested: {formatCurrency(stepUpTotalInvested)}
          </span>
        </div>

        {/* Extra Wealth Created Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 space-y-1">
          <span className="text-xs text-emerald-300 font-semibold block">Extra Wealth Created</span>
          <div className="text-2xl font-heading font-black text-emerald-400">
            +{formatCurrency(extraWealth)}
          </div>
          <span className="text-[11px] text-emerald-300/70 block">
            Pure compounding alpha from salary step-up
          </span>
        </div>
      </div>

      {/* Projection Area Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold">Compounding Growth Projection</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Flat SIP
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Step-Up SIP (+{stepUpPct}%)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorStepUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFlat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickFormatter={(val) => {
                  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
                  return `₹${val}`;
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const stepUpVal = Number(payload.find((p) => p.dataKey === "StepUpSIP")?.value ?? 0);
                    const flatVal = Number(payload.find((p) => p.dataKey === "FlatSIP")?.value ?? 0);
                    return (
                      <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-white pb-1 border-b border-white/10">{label}</div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Step-Up SIP:</span>
                          <span className="font-mono font-bold">₹{stepUpVal.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Flat SIP:</span>
                          <span className="font-mono font-bold">₹{flatVal.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400 pt-1 border-t border-white/10 font-bold">
                          <span>Advantage:</span>
                          <span className="font-mono">+₹{(stepUpVal - flatVal).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="StepUpSIP"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorStepUp)"
              />
              <Area
                type="monotone"
                dataKey="FlatSIP"
                stroke="#94a3b8"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#colorFlat)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
