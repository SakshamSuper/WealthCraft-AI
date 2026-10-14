"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Target, Calculator, RefreshCw, Trash2, CheckCircle2, Award, Calendar, Sparkles, TrendingUp, PlusCircle 
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend 
} from "recharts";
import SipStepUpCalculator from "@/components/SipStepUpCalculator";

export default function GoalsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);

  // SIP Calculator slider states
  const [sipAmount, setSipAmount] = useState(10000);
  const [cagr, setCagr] = useState(12);
  const [years, setYears] = useState(10);
  const [inflation, setInflation] = useState(6);
  const [sipCalculation, setSipCalculation] = useState<any>(null);

  // Goal Planner form states
  const [goalName, setGoalName] = useState("Dream House");
  const [targetAmount, setTargetAmount] = useState(5000000);
  const [currentAmount, setCurrentAmount] = useState(100000);
  const [targetDate, setTargetDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString().split("T")[0]
  );
  const [goalError, setGoalError] = useState("");
  const [goalSuccess, setGoalSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("stockify_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadGoals();
  }, [router]);

  useEffect(() => {
    if (mounted) {
      runSipSimulation();
    }
  }, [sipAmount, cagr, years, inflation, mounted]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSipSimulation = async () => {
    // Try backend first, fall back to local computation
    try {
      const data = await api.simulateSip(sipAmount, cagr, years, inflation);
      setSipCalculation(data);
    } catch (err) {
      // Local fallback using standard SIP compounding formula
      const P = sipAmount;
      const r = (cagr / 100) / 12;
      const n = years * 12;
      const futureValue = r === 0 ? P * n : P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const totalInvested = P * n;
      const wealthGained = Math.max(0, futureValue - totalInvested);
      const infR = inflation / 100;
      const inflationAdjusted = futureValue / Math.pow(1 + infR, years);
      setSipCalculation({
        future_value: Math.round(futureValue),
        total_invested: Math.round(totalInvested),
        wealth_gained: Math.round(wealthGained),
        inflation_adjusted_value: Math.round(inflationAdjusted),
        goal_completion_probability: Math.max(35, Math.min(99, 85 - (cagr / 5) + (years / 4))),
      });
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError("");
    setGoalSuccess(false);
    try {
      await api.createGoal(goalName, targetAmount, currentAmount, targetDate);
      setGoalSuccess(true);
      setGoalName("Wealth Expansion");
      setTargetAmount(2000000);
      setCurrentAmount(50000);
      loadGoals();
      setTimeout(() => setGoalSuccess(false), 2000);
    } catch (err: any) {
      setGoalError(err.message || "Failed to create investment goal");
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm("Are you sure you want to delete this financial goal?")) return;
    try {
      await api.removeGoal(goalId);
      loadGoals();
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  // Chart Data for SIP distribution
  const pieData = sipCalculation ? [
    { name: "Invested Principal", value: sipCalculation.total_invested },
    { name: "Wealth Accrued (Gain)", value: sipCalculation.wealth_gained }
  ] : [];
  
  const COLORS = ["#3B82F6", "#10B981"];

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl text-white">Investment Goals & Calculators</h1>
        <p className="text-xs text-slate-500">Formulate goals and simulate mutual fund wealth accumulation timelines with inflation adjustments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Col: Interactive SIP Calculator */}
        <div className="lg:col-span-2 glass-panel p-6 bg-slate-950/40 space-y-6">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Calculator className="text-emerald-400" size={18} />
            SIP Compounding Calculator
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Sliders Container */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Monthly SIP Amount</span>
                  <span className="font-bold text-white">INR {sipAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(Number(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Expected Annual Return</span>
                  <span className="font-bold text-white">{cagr}% CAGR</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={cagr}
                  onChange={(e) => setCagr(Number(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Investment Duration</span>
                  <span className="font-bold text-white">{years} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Inflation Rate</span>
                  <span className="font-bold text-white">{inflation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={inflation}
                  onChange={(e) => setInflation(Number(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Calculations Pie Chart display */}
            {sipCalculation && (
              <div className="flex flex-col items-center justify-center">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => `INR ${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Visual Legend */}
                <div className="flex gap-4 text-[10px] text-slate-400 mt-2">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Invested</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Wealth Gained</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary Box */}
          {sipCalculation && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 p-4 rounded-xl border border-white/5 text-center mt-6">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Total Invested</span>
                <span className="font-bold text-white text-sm mt-0.5">INR {sipCalculation.total_invested.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Wealth Gained</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5">INR {sipCalculation.wealth_gained.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Future Value</span>
                <span className="font-bold text-white text-sm mt-0.5">INR {sipCalculation.future_value.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Inflation Adjusted</span>
                <span className="font-bold text-slate-300 text-sm mt-0.5">INR {sipCalculation.inflation_adjusted_value.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Goal Creator Form */}
        <div className="glass-panel p-6 bg-slate-950/40">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-1.5 border-b border-white/5 pb-3 mb-4">
            <Target className="text-emerald-400" size={18} />
            Establish Goal Target
          </h2>

          {goalSuccess && (
            <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Goal created successfully!
            </div>
          )}
          {goalError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
              {goalError}
            </div>
          )}

          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Goal Description</label>
              <input
                type="text"
                required
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Retirement Savings, Wedding"
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Target Corpus (INR)</label>
                <input
                  type="number"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">Current Capital (INR)</label>
                <input
                  type="number"
                  required
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Target Date</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <PlusCircle size={14} />
              Save Investment Goal
            </button>
          </form>
        </div>
      </div>

      {/* Goal Planner Progress Cards list */}
      <div className="glass-panel p-6 bg-slate-950/40">
        <h2 className="font-heading font-bold text-lg text-white mb-6 flex items-center gap-1.5">
          <Calendar className="text-emerald-400" size={18} />
          Investment Goals Progress Dashboard
        </h2>

        {loading ? (
          <div className="py-10 text-center">
            <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Fetching saving timelines...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No active investment goals. Use the panel above to establish targets.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => {
              const progressPct = Math.min(100.0, (g.current_amount / g.target_amount) * 100.0);
              return (
                <div key={g.id} className="p-5 rounded-xl border border-white/5 bg-slate-900/40 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    {/* Goal Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading font-bold text-white text-base">{g.name}</h3>
                        <span className="text-[10px] text-slate-500">Target Date: {g.target_date}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 my-4">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                        <span>Funded: {progressPct.toFixed(1)}%</span>
                        <span>Goal: INR {g.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Calculated metrics */}
                    <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-white/5 pt-3 mt-3">
                      <div>
                        <span className="text-slate-500 block">Required Monthly SIP</span>
                        <span className="font-bold text-white text-xs mt-0.5 flex items-center gap-0.5">
                          <TrendingUp size={12} className="text-emerald-400" />
                          INR {g.monthly_sip_required.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Success Probability</span>
                        <span className="font-bold text-white text-xs mt-0.5 flex items-center gap-0.5">
                          <Sparkles size={12} className="text-emerald-400" />
                          {g.success_probability}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SIP Step-Up Visualizer */}
      <SipStepUpCalculator />
    </div>
  );
}
