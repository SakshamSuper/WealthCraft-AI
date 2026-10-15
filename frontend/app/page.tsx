"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User, Mail, Lock, ShieldCheck, ArrowRight, Check, CheckCircle2, TrendingUp, Cpu, Landmark } from "lucide-react";
import { getAuthToken, clearAuthSession } from "@/lib/auth";

export default function WelcomePage() {
  const router = useRouter();
  
  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Questionnaire Wizard state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: 30,
    income: 1200000,
    occupation: "Software Engineer",
    monthly_savings: 40000,
    current_investments: 200000,
    investment_goal: "Wealth Creation",
    investment_horizon: "10 Years",
    risk_appetite: "Moderate",
    preferred_categories: [] as string[],
    liquidity_needs: "Low",
    sip_amount: 15000,
    lumpsum_amount: 50000,
  });

  useEffect(() => {
    // If token exists, fetch profile and check onboarding
    const token = getAuthToken();
    if (token) {
      api.getProfile()
        .then((profile) => {
          setUser(profile);
          if ((profile?.risk_score ?? 50) > 0) {
            router.push("/dashboard");
          }
        })
        .catch(() => {
          clearAuthSession();
        });
    }
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await api.login(email, password);
        const profile = await api.getProfile();
        setUser(profile);
        router.push("/dashboard");
      } else {
        await api.register(email, password, fullName);
        // Auto-login
        await api.login(email, password);
        const profile = await api.getProfile();
        setUser(profile);
        if ((profile?.risk_score ?? 0) > 0) {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    const current = [...formData.preferred_categories];
    if (current.includes(cat)) {
      setFormData({
        ...formData,
        preferred_categories: current.filter((c) => c !== cat),
      });
    } else {
      setFormData({
        ...formData,
        preferred_categories: [...current, cat],
      });
    }
  };

  const handleOnboardingSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        preferred_categories: formData.preferred_categories.join(", "),
      };
      await api.updateRiskProfile(payload);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Failed to save profile details");
    } finally {
      setLoading(false);
    }
  };

  const categoriesList = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Index", "ELSS", "Debt", "Hybrid"];

  // Render Auth panels
  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col lg:flex-row items-center justify-center gap-12 max-w-6xl mx-auto px-4 mt-6">
        {/* Left Side Info */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Cpu size={14} /> Powered by Agentic AI & Machine Learning
          </div>
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight">
            Smart Mutual Fund Advice Built For <span className="text-emerald-400">Wealth Generation</span>
          </h1>
          <p className="text-slate-400 text-base max-w-lg leading-relaxed mx-auto lg:mx-0">
            WealthCraft AI analyzes rolling returns, capture ratios, fund manager tenures, and uses ML models to forecast NAV paths—crafting optimal, tax-efficient portfolios.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-md mx-auto lg:mx-0">
            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-center">
              <Landmark size={24} className="text-emerald-400 mx-auto mb-2" />
              <div className="font-heading font-bold text-lg text-white">16+ Funds</div>
              <div className="text-xs text-slate-500">Seed Database</div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-center">
              <TrendingUp size={24} className="text-emerald-400 mx-auto mb-2" />
              <div className="font-heading font-bold text-lg text-white">ML Forecast</div>
              <div className="text-xs text-slate-500">12-Month Outlines</div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-center">
              <ShieldCheck size={24} className="text-emerald-400 mx-auto mb-2" />
              <div className="font-heading font-bold text-lg text-white">Multi-Agent</div>
              <div className="text-xs text-slate-500">RAG Orchestration</div>
            </div>
          </div>
        </div>

        {/* Right Side Auth Card */}
        <div className="w-full max-w-md glass-panel p-8 bg-slate-950/40 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="font-heading font-bold text-2xl text-white mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {isLogin ? "Access your intelligent portfolios and predictions" : "Sign up in seconds to start planning your financial goals"}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 mt-6"
            >
              {loading ? "Authenticating..." : isLogin ? "Sign In" : "Get Started"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-emerald-400 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Questionnaire Wizard
  return (
    <div className="max-w-2xl mx-auto glass-panel p-8 bg-slate-950/40 relative mt-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step
                  ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/10"
                  : s < step
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-900 text-slate-600 border border-white/5"
              }`}
            >
              {s < step ? <Check size={14} /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-12 sm:w-20 rounded ${s < step ? "bg-emerald-500/40" : "bg-slate-900"}`} />}
          </div>
        ))}
      </div>

      <h2 className="font-heading font-extrabold text-2xl text-white mb-2">
        {step === 1 && "Personal Financial Profile"}
        {step === 2 && "Investment Goals & Timeline"}
        {step === 3 && "Risk Assessment & Selection"}
        {step === 4 && "Initial Funding Allocation"}
      </h2>
      <p className="text-xs text-slate-500 mb-6">
        {step === 1 && "Let's gather some basic info regarding your age, income, and savings profile."}
        {step === 2 && "Determine what you are investing for and when you will need liquidity."}
        {step === 3 && "Specify your risk stomach and select which asset categories you prefer to seed."}
        {step === 4 && "Configure your monthly SIP or lumpsum allocations to run calculations."}
      </p>

      {/* Step 1 Content */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Age (Years)</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Occupation</label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white focus:outline-none"
              >
                {["Software Engineer", "Doctor", "Business Owner", "Corporate Employee", "Consultant", "Student", "Retired"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Annual Income (INR)</label>
            <input
              type="number"
              value={formData.income}
              onChange={(e) => setFormData({ ...formData, income: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Monthly Savings (INR)</label>
              <input
                type="number"
                value={formData.monthly_savings}
                onChange={(e) => setFormData({ ...formData, monthly_savings: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Current Investments (INR)</label>
              <input
                type="number"
                value={formData.current_investments}
                onChange={(e) => setFormData({ ...formData, current_investments: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 Content */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Primary Investment Goal</label>
            <select
              value={formData.investment_goal}
              onChange={(e) => setFormData({ ...formData, investment_goal: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-lg py-2.5 pl-3 text-sm text-white"
            >
              {["Wealth Creation", "Retirement Planning", "Tax Saving (ELSS)", "Emergency Fund", "Child Education", "Buying a House"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Time Horizon</label>
              <select
                value={formData.investment_horizon}
                onChange={(e) => setFormData({ ...formData, investment_horizon: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              >
                {["1 Year", "3 Years", "5 Years", "10 Years", "20 Years"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Liquidity Needs</label>
              <select
                value={formData.liquidity_needs}
                onChange={(e) => setFormData({ ...formData, liquidity_needs: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              >
                {["Low", "Medium", "High"].map((l) => (
                  <option key={l} value={l}>{l} Liquidity</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 Content */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 text-white font-semibold">Risk Appetite</label>
            <div className="grid grid-cols-3 gap-3">
              {["Low", "Moderate", "High"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData({ ...formData, risk_appetite: r })}
                  className={`py-3 rounded-lg border text-sm font-semibold transition-all ${
                    formData.risk_appetite === r
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-md shadow-emerald-500/5"
                      : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
                  }`}
                >
                  {r} Risk
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 text-white font-semibold">Preferred Fund Categories</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoriesList.map((cat) => {
                const isSelected = formData.preferred_categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/35"
                        : "bg-slate-900 text-slate-500 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 Content */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Monthly SIP Amount (INR)</label>
              <input
                type="number"
                value={formData.sip_amount}
                onChange={(e) => setFormData({ ...formData, sip_amount: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Initial Lumpsum (INR)</label>
              <input
                type="number"
                value={formData.lumpsum_amount}
                onChange={(e) => setFormData({ ...formData, lumpsum_amount: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-3 text-sm text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3 mt-4">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-emerald-400 block mb-1">Onboarding Check Complete</span>
              Stockify will now build an index portfolio containing custom Large Cap, Flexi Cap, and ELSS recommendations corresponding to your Moderate/High risk thresholds.
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 border-t border-white/5 pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 border border-white/10 rounded-lg text-slate-400 hover:text-white text-sm font-semibold transition-all"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOnboardingSubmit}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-6 rounded-lg text-sm transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/10"
          >
            {loading ? "Calculating Profile..." : "Complete Profile"}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
