import { FALLBACK_ASSETS } from "./fallbackAssets";
import { filterMarketMovers, TRENDING_SECTORS, TOP_GAINERS, TOP_LOSERS, TOP_VOLUME_SHOCKERS } from "./marketData";
import { liveMarketEngine } from "./liveMarketEngine";
import { getLiveNavSync, fetchLiveAMFINav, getIndianMarketStatus, syncAllMutualFunds } from "./liveSync";
import { generateAssetTimeSeries, ChartTimeframe, TimeSeriesResult } from "./historicalData";

/**
 * Resolve the backend API base URL:
 * 1. Use NEXT_PUBLIC_API_URL env var if set (recommended for all deployments)
 * 2. Fall back to localhost for local development
 * 3. Return empty string (offline/static mode) when no backend is configured
 *
 * To connect a backend: set NEXT_PUBLIC_API_URL in Vercel / Render env vars
 */
const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000/api/v1";
    }
  }
  return "";
};

const BASE_URL = getBaseUrl();

/**
 * True only when a real backend URL is configured.
 * When false, all API methods return offline fallback data immediately
 * without making any network requests (prevents 404 floods on static hosting).
 */
const HAS_BACKEND = BASE_URL !== "";

function absHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("wealthcraft_token") || localStorage.getItem("stockify_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const LOCAL_PORTFOLIO_KEY = "wealthcraft_local_portfolio";
const LOCAL_GOALS_KEY = "wealthcraft_local_goals";

export function getLocalPortfolioItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPortfolioItems(items: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_PORTFOLIO_KEY, JSON.stringify(items));
}

export function computeLocalPortfolio(): any {
  const rawItems = getLocalPortfolioItems();
  if (!rawItems || rawItems.length === 0) {
    return {
      items: [],
      total_invested: 0.0,
      current_value: 0.0,
      absolute_return: 0.0,
      absolute_return_pct: 0.0,
      xirr: 0.0,
      allocation: {},
    };
  }

  let totalInvested = 0;
  let currentValue = 0;
  const categoryValues: Record<string, number> = {};

  const mappedItems = rawItems.map((it: any, index: number) => {
    const asset =
      FALLBACK_ASSETS.find((a) => a.id === it.fund_id) ||
      FALLBACK_ASSETS.find((a) => a.name.toLowerCase() === (it.fund_name || "").toLowerCase()) ||
      FALLBACK_ASSETS.find((a) => a.ticker && it.ticker && a.ticker.toLowerCase() === it.ticker.toLowerCase());

    const units = Number(it.units) || 1;
    const purchasePrice = Number(it.purchase_price) || 100;
    let currentNav = Number(it.current_nav) || asset?.initial_nav || purchasePrice;
    if ((asset as any)?.amfi_code) {
      currentNav = getLiveNavSync((asset as any).amfi_code, currentNav);
    }
    const itemInvested = units * purchasePrice;
    const itemValue = units * currentNav;
    const absReturn = itemValue - itemInvested;
    const absReturnPct = itemInvested > 0 ? +((absReturn / itemInvested) * 100).toFixed(2) : 0;
    const category = it.fund_category || asset?.category || "Large Cap";
    const name = it.fund_name || asset?.name || "Asset";

    totalInvested += itemInvested;
    currentValue += itemValue;
    categoryValues[category] = (categoryValues[category] || 0) + itemValue;

    return {
      id: it.id || index + 1,
      fund_id: it.fund_id || asset?.id || index + 1,
      fund_name: name,
      fund_category: category,
      units,
      purchase_price: purchasePrice,
      current_nav: currentNav,
      current_value: Math.round(itemValue * 100) / 100,
      purchase_date: it.purchase_date || new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().split("T")[0],
      absolute_return: Math.round(absReturn * 100) / 100,
      absolute_return_pct: absReturnPct,
    };
  });

  const absReturn = currentValue - totalInvested;
  const absReturnPct = totalInvested > 0 ? +((absReturn / totalInvested) * 100).toFixed(2) : 0;

  const allocation: Record<string, number> = {};
  for (const [cat, val] of Object.entries(categoryValues)) {
    allocation[cat] = currentValue > 0 ? +((val / currentValue) * 100).toFixed(1) : 0;
  }

  const cagr = totalInvested > 0 ? absReturnPct * 1.15 : 0;
  const xirr = absReturn >= 0 ? Math.min(54, Math.max(6.5, +cagr.toFixed(2))) : Math.max(-30, +cagr.toFixed(2));

  return {
    items: mappedItems,
    total_invested: Math.round(totalInvested * 100) / 100,
    current_value: Math.round(currentValue * 100) / 100,
    absolute_return: Math.round(absReturn * 100) / 100,
    absolute_return_pct: absReturnPct,
    xirr,
    allocation,
  };
}

// Shared offline market indices with current real market levels
const OFFLINE_INDICES = [
  { name: "NIFTY", symbol: "^NSEI", price: 22768.90, change: -42.45, change_pct: -0.19 },
  { name: "SENSEX", symbol: "^BSESN", price: 73584.88, change: -730.73, change_pct: -0.98 },
  { name: "BANKNIFTY", symbol: "^NSEBANK", price: 54941.85, change: -868.65, change_pct: -1.56 },
  { name: "MIDCPNIFTY", symbol: "^NSEMDCP50", price: 16431.85, change: -524.45, change_pct: -3.09 },
  { name: "FINNIFTY", symbol: "NIFTY_FIN_SERVICE.NS", price: 24687.95, change: -676.25, change_pct: -2.67 },
  { name: "S&P 500", symbol: "^GSPC", price: 7757.17, change: 38.23, change_pct: 0.49 },
];

export const api = {
  // ─── Auth & Profile ──────────────────────────────────────────────────────────

  async register(email: string, password: string, fullName: string) {
    const fallbackProfile = {
      id: 1,
      email,
      full_name: fullName || "Investor",
      risk_appetite: "Moderate Aggressive",
      risk_score: 50,
      investment_horizon_years: 10,
      monthly_income: 150000,
      sip_amount: 15000,
    };
    const demoToken = "demo_jwt_token_" + Date.now();

    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        localStorage.setItem("wealthcraft_token", demoToken);
        localStorage.setItem("stockify_token", demoToken);
        localStorage.setItem("wealthcraft_user_profile", JSON.stringify(fallbackProfile));
      }
      return {
        access_token: demoToken,
        token_type: "bearer",
        user: { id: 1, email, full_name: fullName },
      };
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend register unavailable, using demo mode", e);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("wealthcraft_token", demoToken);
      localStorage.setItem("stockify_token", demoToken);
      localStorage.setItem("wealthcraft_user_profile", JSON.stringify(fallbackProfile));
    }
    return {
      access_token: demoToken,
      token_type: "bearer",
      user: { id: 1, email, full_name: fullName },
    };
  },

  async login(email: string, password: string) {
    const demoToken = "demo_jwt_token_" + Date.now();
    const fallbackUser = {
      id: 1,
      email: email || "investor@wealthcraft.ai",
      full_name: "Demo Investor",
    };

    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        localStorage.setItem("wealthcraft_token", demoToken);
        localStorage.setItem("stockify_token", demoToken);
      }
      return {
        access_token: demoToken,
        token_type: "bearer",
        user: fallbackUser,
      };
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("wealthcraft_token", data.access_token);
          localStorage.setItem("stockify_token", data.access_token);
        }
        return data;
      }
    } catch (e) {
      console.warn("Backend login failed or unreachable, switching to demo auth:", e);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("wealthcraft_token", demoToken);
      localStorage.setItem("stockify_token", demoToken);
    }
    return {
      access_token: demoToken,
      token_type: "bearer",
      user: fallbackUser,
    };
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stockify_token");
      localStorage.removeItem("wealthcraft_token");
      localStorage.removeItem("wealthcraft_user_profile");
    }
  },

  async getProfile() {
    const fallbackProfile = {
      id: 1,
      email: "investor@wealthcraft.ai",
      full_name: "Demo Investor",
      risk_appetite: "Moderate Aggressive",
      risk_score: 50,
      investment_horizon_years: 10,
      monthly_income: 150000,
      sip_amount: 15000,
    };

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wealthcraft_user_profile");
      if (saved) {
        try {
          return { ...fallbackProfile, ...JSON.parse(saved) };
        } catch {
          // ignore
        }
      }
    }

    if (!HAS_BACKEND) {
      return fallbackProfile;
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { ...fallbackProfile, ...data, risk_score: data.risk_score ?? 50 };
      }
    } catch (e) {
      console.warn("Backend getProfile failed, using fallback:", e);
    }
    return fallbackProfile;
  },

  async updateRiskProfile(profile: any) {
    if (typeof window !== "undefined") {
      const existing = await this.getProfile();
      const updated = { ...existing, ...profile, risk_score: profile.risk_score ?? existing.risk_score ?? 50 };
      localStorage.setItem("wealthcraft_user_profile", JSON.stringify(updated));
      if (!HAS_BACKEND) return updated;
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/risk-profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(profile),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend updateRiskProfile failed, saved locally:", e);
    }
    return profile;
  },

  // ─── Market Data (all have offline fallbacks) ─────────────────────────────

  async getMarketIndices() {
    if (!HAS_BACKEND) {
      const status = getIndianMarketStatus();
      if (!status.isOpen) {
        return OFFLINE_INDICES.map((idx) => ({
          ...idx,
          market_status: status.message,
          next_session: status.nextSession,
          is_live: false,
        }));
      }
      // When market is live, compute realistic continuous price discovery micro-ticks
      return OFFLINE_INDICES.map((idx) => {
        const jitterPct = Math.sin(Date.now() / 20000 + idx.name.length) * 0.05;
        const livePrice = +(idx.price * (1 + jitterPct / 100)).toFixed(2);
        const liveChange = +(idx.change + (livePrice - idx.price)).toFixed(2);
        const livePct = +(idx.change_pct + jitterPct).toFixed(2);
        return {
          ...idx,
          price: livePrice,
          change: liveChange,
          change_pct: livePct,
          market_status: "Market is Live (NSE / BSE)",
          next_session: status.nextSession,
          is_live: true,
        };
      });
    }
    try {
      const res = await fetch(`${BASE_URL}/funds/market-indices`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // network error → fallback
    }
    return OFFLINE_INDICES;
  },

  async syncAllPrices() {
    const amfiCodes = FALLBACK_ASSETS.map((a: any) => a.amfi_code).filter(Boolean);
    const liveMap = await syncAllMutualFunds(amfiCodes);
    return {
      timestamp: new Date().toISOString(),
      syncedCount: Object.keys(liveMap).length,
      marketStatus: getIndianMarketStatus(),
      liveData: liveMap,
    };
  },

  async getTopMovers(filterType: "gainers" | "losers" | "volume_shockers" = "gainers", indexFilter = "NIFTY 100") {
    if (!HAS_BACKEND) return liveMarketEngine.getTopMovers(filterType, indexFilter);
    try {
      const query = new URLSearchParams({ filter_type: filterType, index_filter: indexFilter });
      const res = await fetch(`${BASE_URL}/funds/top-movers?${query.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // fallthrough
    }
    return liveMarketEngine.getTopMovers(filterType, indexFilter);
  },

  async getTrendingSectors() {
    if (!HAS_BACKEND) return liveMarketEngine.getTrendingSectors();
    try {
      const res = await fetch(`${BASE_URL}/funds/trending-sectors`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // fallthrough
    }
    return liveMarketEngine.getTrendingSectors();
  },

  async getFunds(search?: string, category?: string, risk?: string, minRating?: number) {
    if (!HAS_BACKEND) {
      let list = FALLBACK_ASSETS.map((a: any) => {
        if (a.amfi_code) {
          const live = getLiveNavSync(a.amfi_code, a.initial_nav);
          return { ...a, initial_nav: live };
        }
        return a;
      });
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (a) =>
            a.name.toLowerCase().includes(s) ||
            (a.ticker && a.ticker.toLowerCase().includes(s)) ||
            (a.symbol && a.symbol.toLowerCase().includes(s))
        );
      }
      if (category) list = list.filter((a) => a.category.toLowerCase().includes(category.toLowerCase()));
      if (risk) list = list.filter((a) => a.risk_category.toLowerCase() === risk.toLowerCase());
      if (minRating) list = list.filter((a) => a.fund_rating >= minRating);
      return list;
    }
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (category) query.append("category", category);
      if (risk) query.append("risk", risk);
      if (minRating) query.append("min_rating", minRating.toString());
      const res = await fetch(`${BASE_URL}/funds/?${query.toString()}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    let list = FALLBACK_ASSETS.map((a: any) => {
      if (a.amfi_code) {
        const live = getLiveNavSync(a.amfi_code, a.initial_nav);
        return { ...a, initial_nav: live };
      }
      return a;
    });
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          (a.ticker && a.ticker.toLowerCase().includes(s)) ||
          (a.symbol && a.symbol.toLowerCase().includes(s))
      );
    }
    if (category) list = list.filter((a) => a.category.toLowerCase().includes(category.toLowerCase()));
    if (risk) list = list.filter((a) => a.risk_category.toLowerCase() === risk.toLowerCase());
    if (minRating) list = list.filter((a) => a.fund_rating >= minRating);
    return list;
  },

  async getRecommendations() {
    const buildFallbackRecs = () => {
      const picks = [
        FALLBACK_ASSETS.find((a) => a.ticker === "PPFCF") || FALLBACK_ASSETS[1],
        FALLBACK_ASSETS.find((a) => a.ticker === "HDFCTOP100") || FALLBACK_ASSETS[2],
        FALLBACK_ASSETS.find((a) => a.ticker === "QUANT_ACT") || FALLBACK_ASSETS[3],
      ].filter(Boolean);

      return (picks.length > 0 ? picks : FALLBACK_ASSETS.slice(0, 3)).map((fund: any, idx) => {
        const liveNav = fund.amfi_code ? getLiveNavSync(fund.amfi_code, fund.initial_nav) : fund.initial_nav;
        return {
          fund: {
            ...fund,
            initial_nav: liveNav,
            category: fund.category || "Large Cap",
            amc: fund.amc || "Asset Management",
            fund_rating: fund.fund_rating || 5,
            expense_ratio: fund.expense_ratio || 0.0075,
            sharpe_ratio: (fund as any).sharpe_ratio || 1.35,
          },
          score: +(95.0 - idx * 3.5),
          analysis: {
            explanation: `Top recommendation matching your risk profile. Strong rolling returns in ${fund.category || "equity"} with low downside volatility.`,
          },
        };
      });
    };

    if (!HAS_BACKEND) return buildFallbackRecs();
    try {
      const res = await fetch(`${BASE_URL}/funds/recommendations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any, idx: number) => {
            const fundObj = item.fund || item;
            const explanation =
              typeof item.analysis === "string"
                ? item.analysis
                : item.analysis?.explanation || "Automated quantitative portfolio matching algorithm.";
            return {
              fund: fundObj,
              score: Number(item.score) || 92 - idx * 2,
              analysis: { explanation },
            };
          });
        }
      }
    } catch (e) {
      // fallthrough
    }
    return buildFallbackRecs();
  },

  async getFundDetails(id: number) {
    // 1. Try finding in FALLBACK_ASSETS
    let asset: any = FALLBACK_ASSETS.find((a) => a.id === id);

    // 2. If not found by numeric ID, check movers & constituents
    if (!asset) {
      const allMovers = [...TOP_GAINERS, ...TOP_LOSERS, ...TOP_VOLUME_SHOCKERS];
      const match = allMovers.find((m) => {
        const hashId = (absHash(m.symbol) % 100000000) + 10000000;
        return hashId === id;
      });
      if (match) {
        const sym = match.symbol.replace(/\.NS$/i, "");
        asset = {
          id,
          name: match.name,
          ticker: match.symbol,
          category: "Listed Stock",
          sector: match.index === "NIFTY 50" ? "Large Cap Equities" : "Mid/Large Cap Equities",
          risk_category: "High",
          fund_rating: 5,
          expense_ratio: 0.0,
          aum: Math.round(match.volume * match.price * 0.05),
          pe_ratio: 24.5,
          high_52w: +(match.price * 1.22).toFixed(2),
          low_52w: +(match.price * 0.74).toFixed(2),
          initial_nav: match.price,
          amc: `NSE: ${sym}`,
        };
      }
    }

    if (!asset) {
      asset = FALLBACK_ASSETS[0];
    }

    const liveAsset = { ...asset };
    if (asset?.amfi_code) {
      liveAsset.initial_nav = getLiveNavSync(asset.amfi_code, asset.initial_nav);
    }
    if (!HAS_BACKEND) return liveAsset;
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    return liveAsset;
  },
  async getFundDetail(id: number) {
    return this.getFundDetails(id);
  },

  async getFundTimeSeries(id: number, timeframe: ChartTimeframe = "1Y"): Promise<TimeSeriesResult> {
    const asset = await this.getFundDetails(id);
    return generateAssetTimeSeries(asset, timeframe);
  },

  async getFundNAVHistory(id: number, timeframe: ChartTimeframe = "1Y") {
    const asset: any = await this.getFundDetails(id);

    // Live AMFI daily historical data if available for mutual funds in 1M timeframe
    if (asset?.amfi_code && (timeframe === "1M" || timeframe === "1W")) {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${asset.amfi_code}`);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            const limit = timeframe === "1W" ? 7 : 30;
            const points = json.data.slice(0, limit).reverse().map((p: any) => {
              const [day, month, year] = p.date.split("-");
              const val = parseFloat(p.nav);
              return { date: `${year}-${month}-${day}`, nav: val, NAV: val, close: val, open: val, high: val, low: val };
            });
            if (points.length > 0) return points;
          }
        }
      } catch (err) {
        // network error fallback
      }
    }

    const series = generateAssetTimeSeries(asset, timeframe);
    return series.points;
  },
  async getNAVHistory(id: number, timeframe: ChartTimeframe = "1Y") {
    return this.getFundNAVHistory(id, timeframe);
  },

  async getFundForecast(id: number) {
    const buildRollingForecast = async () => {
      const asset = await this.getFundDetails(id);
      const curPrice = Number(asset.initial_nav || asset.price || 1000);
      const now = new Date();
      const dates = [1, 2, 3, 6, 12].map((m) => {
        const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
        return d.toISOString().split("T")[0];
      });

      const chartData = [
        { date: "Current", Predicted: curPrice, Upper: curPrice, Lower: curPrice },
        { date: "+1M", Predicted: Math.round(curPrice * 1.025), Upper: Math.round(curPrice * 1.05), Lower: Math.round(curPrice * 0.99) },
        { date: "+3M", Predicted: Math.round(curPrice * 1.065), Upper: Math.round(curPrice * 1.11), Lower: Math.round(curPrice * 0.98) },
        { date: "+6M", Predicted: Math.round(curPrice * 1.12), Upper: Math.round(curPrice * 1.19), Lower: Math.round(curPrice * 0.96) },
        { date: "+9M", Predicted: Math.round(curPrice * 1.155), Upper: Math.round(curPrice * 1.25), Lower: Math.round(curPrice * 0.94) },
        { date: "+12M", Predicted: Math.round(curPrice * 1.182), Upper: Math.round(curPrice * 1.345), Lower: Math.round(curPrice * 0.915) },
      ];

      return {
        target_price_1y: Math.round(curPrice * 1.182),
        target_price_high: Math.round(curPrice * 1.345),
        target_price_low: Math.round(curPrice * 0.915),
        cagr: 18.2,
        confidence: 86.5,
        analyst_rating: "Strong Buy",
        total_analysts: 36,
        buy_pct: 78,
        hold_pct: 16,
        sell_pct: 6,
        return_1m: 2.5,
        return_3m: 6.5,
        return_6m: 12.0,
        return_1y: 18.2,
        return_3y_cagr: 24.8,
        dates,
        chartData,
        nav: dates.map((_, i) => Math.round(curPrice * (1.04 + i * 0.035))),
        lower_bound: dates.map((_, i) => Math.round(curPrice * (0.97 - i * 0.012))),
        upper_bound: dates.map((_, i) => Math.round(curPrice * (1.09 + i * 0.065))),
      };
    };

    if (!HAS_BACKEND) return await buildRollingForecast();
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}/forecast`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    return await buildRollingForecast();
  },

  async getFundPeers(id: number) {
    const asset = await this.getFundDetails(id);
    const sym = (asset?.ticker || asset?.symbol || "").toUpperCase();
    const name = (asset?.name || "").toLowerCase();
    const cat = (asset?.category || "").toLowerCase();

    // Auto sector
    if (sym.includes("TVS") || sym.includes("M&M") || sym.includes("TATA") || name.includes("motor") || name.includes("auto")) {
      return [
        { name: "TVS Motor Company", ticker: "TVSMOTOR.NS", price: 3992.50, pe_ratio: 42.8, aum: 189500, change_1y: 48.5, view: "STRONG BUY" },
        { name: "Mahindra & Mahindra", ticker: "M&M.NS", price: 3145.20, pe_ratio: 28.4, aum: 391200, change_1y: 52.4, view: "BUY" },
        { name: "Tata Motors Ltd", ticker: "TATAMOTORS.NS", price: 924.50, pe_ratio: 11.2, aum: 307500, change_1y: 34.8, view: "BUY" },
        { name: "Bajaj Auto Ltd", ticker: "BAJAJ-AUTO.NS", price: 10420.00, pe_ratio: 34.6, aum: 295000, change_1y: 62.1, view: "BUY" },
        { name: "Maruti Suzuki India", ticker: "MARUTI.NS", price: 12850.00, pe_ratio: 26.5, aum: 403000, change_1y: 22.0, view: "HOLD" },
      ];
    }

    // Defense & Aerospace
    if (sym.includes("BEL") || sym.includes("HAL") || name.includes("electronics") || name.includes("aeronautics")) {
      return [
        { name: "Bharat Electronics Ltd", ticker: "BEL.NS", price: 312.45, pe_ratio: 46.2, aum: 228400, change_1y: 92.4, view: "STRONG BUY" },
        { name: "Hindustan Aeronautics Ltd", ticker: "HAL.NS", price: 4581.70, pe_ratio: 38.5, aum: 306200, change_1y: 118.2, view: "STRONG BUY" },
        { name: "Mazagon Dock Shipbuilders", ticker: "MAZDOCK.NS", price: 4210.00, pe_ratio: 39.1, aum: 84900, change_1y: 145.0, view: "BUY" },
        { name: "Bharat Dynamics Ltd", ticker: "BDL.NS", price: 1180.50, pe_ratio: 54.0, aum: 43200, change_1y: 68.4, view: "HOLD" },
      ];
    }

    // NBFC & Financials
    if (sym.includes("MUTHOOT") || sym.includes("SHRIRAM") || sym.includes("BAJAJFIN") || name.includes("finance")) {
      return [
        { name: "Muthoot Finance", ticker: "MUTHOOTFIN.NS", price: 3079.00, pe_ratio: 19.8, aum: 123500, change_1y: 44.2, view: "BUY" },
        { name: "Shriram Finance", ticker: "SHRIRAMFIN.NS", price: 1061.50, pe_ratio: 15.2, aum: 142000, change_1y: 38.5, view: "BUY" },
        { name: "Bajaj Finance Ltd", ticker: "BAJFINANCE.NS", price: 7420.00, pe_ratio: 28.6, aum: 458000, change_1y: 18.2, view: "BUY" },
        { name: "Cholamandalam Inv & Fin", ticker: "CHOLAFIN.NS", price: 1485.00, pe_ratio: 31.4, aum: 124800, change_1y: 32.6, view: "HOLD" },
      ];
    }

    // IT & Software
    if (sym.includes("TECHM") || sym.includes("TCS") || sym.includes("INFY") || name.includes("technology") || name.includes("tata consultancy")) {
      return [
        { name: "Tata Consultancy Services", ticker: "TCS.NS", price: 2501.00, pe_ratio: 28.5, aum: 803613, change_1y: 14.2, view: "BUY" },
        { name: "Infosys Ltd", ticker: "INFY.NS", price: 1894.20, pe_ratio: 26.8, aum: 764100, change_1y: 18.5, view: "BUY" },
        { name: "Tech Mahindra Ltd", ticker: "TECHM.NS", price: 1580.40, pe_ratio: 32.1, aum: 154200, change_1y: 28.6, view: "BUY" },
        { name: "HCL Technologies Ltd", ticker: "HCLTECH.NS", price: 1785.00, pe_ratio: 25.2, aum: 484000, change_1y: 22.4, view: "BUY" },
      ];
    }

    // Banking
    if (sym.includes("BANK") || sym.includes("SBIN") || name.includes("bank")) {
      return [
        { name: "HDFC Bank Ltd", ticker: "HDFCBANK.NS", price: 706.95, pe_ratio: 18.25, aum: 1172694, change_1y: 16.4, view: "BUY" },
        { name: "ICICI Bank Ltd", ticker: "ICICIBANK.NS", price: 1396.70, pe_ratio: 17.53, aum: 1049555, change_1y: 24.2, view: "STRONG BUY" },
        { name: "State Bank of India", ticker: "SBIN.NS", price: 842.00, pe_ratio: 10.45, aum: 964045, change_1y: 31.0, view: "BUY" },
        { name: "IndusInd Bank Ltd", ticker: "INDUSINDBK.NS", price: 1342.15, pe_ratio: 12.80, aum: 104200, change_1y: 14.8, view: "HOLD" },
      ];
    }

    // Mutual Funds
    if (cat.includes("fund") || cat.includes("large") || cat.includes("flexi") || cat.includes("small")) {
      return [
        { name: "Parag Parikh Flexi Cap Fund", ticker: "PPFCF", price: 84.50, pe_ratio: 22.4, aum: 74200, change_1y: 28.4, view: "5 STAR" },
        { name: "HDFC Top 100 Fund", ticker: "HDFCTOP100", price: 1120.40, pe_ratio: 20.8, aum: 38400, change_1y: 24.8, view: "5 STAR" },
        { name: "Quant Active Fund", ticker: "QUANT_ACT", price: 685.20, pe_ratio: 24.5, aum: 10800, change_1y: 38.2, view: "5 STAR" },
        { name: "Mirae Asset Large & Midcap", ticker: "MIRAE_LM", price: 168.40, pe_ratio: 23.1, aum: 39500, change_1y: 26.5, view: "4 STAR" },
      ];
    }

    // General Large Cap Equities
    return [
      { name: "Reliance Industries", ticker: "RELIANCE.NS", price: 1197.80, pe_ratio: 20.31, aum: 1764237, change_1y: 18.5, view: "BUY" },
      { name: "Bharti Airtel", ticker: "BHARTIARTL.NS", price: 1917.00, pe_ratio: 35.81, aum: 1187214, change_1y: 42.0, view: "STRONG BUY" },
      { name: "HDFC Bank", ticker: "HDFCBANK.NS", price: 706.95, pe_ratio: 18.25, aum: 1172694, change_1y: 16.4, view: "BUY" },
      { name: "ICICI Bank", ticker: "ICICIBANK.NS", price: 1396.70, pe_ratio: 17.53, aum: 1049555, change_1y: 24.2, view: "STRONG BUY" },
    ];
  },

  async resolveFund(schemeCode: number, name: string, ticker?: string) {
    if (!HAS_BACKEND) throw new Error("Backend required to resolve funds");
    const res = await fetch(`${BASE_URL}/funds/resolve`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ scheme_code: schemeCode, name, ticker }),
    });
    if (!res.ok) throw new Error("Failed to resolve asset");
    return res.json();
  },

  async compareFunds(fundIds: number[]) {
    const buildFallbackCompare = () => {
      const selected = FALLBACK_ASSETS.filter((f) => fundIds.includes(f.id));
      const pool = selected.length > 0 ? selected : FALLBACK_ASSETS.slice(0, 2);
      const funds = pool.map((f: any, idx: number) => ({
        id: f.id,
        name: f.name || "Asset",
        category: f.category || "Large Cap",
        amc: f.amc || "Asset Management",
        latest_nav: f.initial_nav || 100,
        rating: f.fund_rating || 5,
        fund_rating: f.fund_rating || 5,
        expense_ratio: f.expense_ratio || 0.75,
        aum: f.aum || 25000,
        sharpe: f.sharpe_ratio || +(1.25 + idx * 0.15).toFixed(2),
        sharpe_ratio: f.sharpe_ratio || +(1.25 + idx * 0.15).toFixed(2),
        alpha: f.alpha || +(2.4 + idx * 0.8).toFixed(1),
        beta: f.beta || +(0.95 - idx * 0.04).toFixed(2),
        sortino: +(1.48 + idx * 0.22).toFixed(2),
        standard_deviation: f.standard_deviation || 14.5,
        cagr_1y: +(14.5 + idx * 2.1).toFixed(1),
        cagr_3y: +(17.8 + idx * 1.6).toFixed(1),
        cagr_5y: +(16.2 + idx * 1.9).toFixed(1),
        manager: f.fund_manager || (idx === 0 ? "Rajeev Thakkar" : "Chirag Setalvad"),
        manager_tenure: 8 + idx * 2,
        exit_load: "1% within 365 days, nil thereafter",
        taxation: "Equity scheme: 12.5% LTCG above ₹1.25 Lakh, 20% STCG under Sec 112A/111A",
        pros: [
          `Strong rolling CAGR track record in ${f.category || "category"}`,
          "Low downside volatility and defensive drawdown protection",
        ],
        cons: [
          "Expense ratio slightly above passive ETF alternatives",
          "Moderate cash balance during quick market momentum rallies",
        ],
        is_winner: idx === 0,
      }));
      return { funds, winner_id: funds[0]?.id };
    };

    if (!HAS_BACKEND) return buildFallbackCompare();
    try {
      const res = await fetch(`${BASE_URL}/funds/compare`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(fundIds),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend compareFunds failed, using fallback:", e);
    }
    return buildFallbackCompare();
  },

  // ─── Portfolio ─────────────────────────────────────────────────────────────

  async getPortfolio() {
    if (!HAS_BACKEND) return computeLocalPortfolio();
    try {
      const res = await fetch(`${BASE_URL}/portfolio/`, { headers: getHeaders() });
      if (!res.ok) return computeLocalPortfolio();
      return await res.json();
    } catch (err) {
      return computeLocalPortfolio();
    }
  },

  async getPortfolioNews() {
    if (!HAS_BACKEND) return [];
    try {
      const res = await fetch(`${BASE_URL}/portfolio/news`, { headers: getHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  },

  async addPortfolioTransaction(data: { fund_id: number; units: number; purchase_price: number; purchase_date: string; fund_name?: string }) {
    return this.addPortfolioItem(data.fund_id, data.units, data.purchase_price, data.purchase_date, data.fund_name);
  },

  async addPortfolioItem(fundId: number, units: number, purchasePrice: number, purchaseDate: string, fundName?: string) {
    const saveLocal = () => {
      const items = getLocalPortfolioItems();
      const asset =
        FALLBACK_ASSETS.find((a) => a.id === fundId) ||
        FALLBACK_ASSETS.find((a) => a.name.toLowerCase() === (fundName || "").toLowerCase());
      const name = fundName || asset?.name || "Asset";
      const newItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        fund_id: fundId || asset?.id || 1,
        fund_name: name,
        fund_category: asset?.category || "Large Cap",
        units: Number(units) || 1,
        purchase_price: Number(purchasePrice) || 100,
        current_nav: asset?.initial_nav || Number(purchasePrice),
        purchase_date: purchaseDate || new Date().toISOString().split("T")[0],
      };
      items.push(newItem);
      saveLocalPortfolioItems(items);
      return newItem;
    };

    if (!HAS_BACKEND) return saveLocal();
    try {
      const res = await fetch(`${BASE_URL}/portfolio/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ fund_id: fundId, units, purchase_price: purchasePrice, purchase_date: purchaseDate, fund_name: fundName }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend addPortfolioItem failed, saved locally:", e);
    }
    return saveLocal();
  },

  async removePortfolioItem(itemId: number) {
    const removeLocal = () => {
      const items = getLocalPortfolioItems();
      const filtered = items.filter((it: any) => it.id !== itemId);
      saveLocalPortfolioItems(filtered);
      return { success: true };
    };

    if (!HAS_BACKEND) return removeLocal();
    try {
      const res = await fetch(`${BASE_URL}/portfolio/${itemId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend removePortfolioItem failed, removed locally:", e);
    }
    return removeLocal();
  },

  async optimizePortfolio() {
    const computeLocal = () => {
      const port = computeLocalPortfolio();
      const items = port.items || [];
      if (items.length === 0) return null;

      const currentAllocation = port.allocation || {};
      const targetAllocation: Record<string, number> = {
        "Large Cap": 40.0,
        "Flexi Cap": 30.0,
        "Mid Cap": 20.0,
        "Debt & Liquid": 10.0,
      };
      for (const cat of Object.keys(currentAllocation)) {
        if (targetAllocation[cat] === undefined) {
          targetAllocation[cat] = 15.0;
        }
      }

      const suggestions = Object.keys(targetAllocation).map((cat) => {
        const cur = currentAllocation[cat] || 0.0;
        const tgt = targetAllocation[cat] || 0.0;
        const diff = +(tgt - cur).toFixed(1);
        let action = "Hold / Maintain";
        if (diff > 5) action = `Increase SIP by ₹${Math.round(diff * 200)}`;
        else if (diff < -5) action = `Trim / Rebalance ${Math.abs(diff)}%`;
        return {
          category: cat,
          current: cur,
          target: tgt,
          difference: diff,
          action,
        };
      });

      const rebalanceNeeded = suggestions.some((s) => Math.abs(s.difference) > 7);

      return {
        metrics: {
          current_allocation: currentAllocation,
          target_allocation: targetAllocation,
          rebalance_needed: rebalanceNeeded,
          suggestions,
        },
        advice_markdown: `Based on automated quantitative portfolio analysis, your current allocations have ${rebalanceNeeded ? "drifted from" : "maintained alignment with"} benchmark risk-adjusted allocations. Maintain disciplined systematic investments across anchor Large Cap & Flexi Cap funds and consider tax-loss harvesting before fiscal year end.`
      };
    };

    if (!HAS_BACKEND) return computeLocal();
    try {
      const res = await fetch(`${BASE_URL}/portfolio/optimize`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend optimizePortfolio failed, using local model:", e);
    }
    return computeLocal();
  },

  // ─── Goals ─────────────────────────────────────────────────────────────────

  async getGoals() {
    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(LOCAL_GOALS_KEY);
        let list = saved ? JSON.parse(saved) : null;
        if (!list || list.length === 0) {
          list = [
            { id: 1, name: "Retirement Corpus", target_amount: 25000000, current_amount: 1500000, target_date: "2040-12-31" },
            { id: 2, name: "Child Higher Education", target_amount: 5000000, current_amount: 800000, target_date: "2034-06-30" },
          ];
        }
        const enriched = list.map((g: any) => {
          const target = Number(g.target_amount) || 1000000;
          const current = Number(g.current_amount) || 0;
          const targetDate = g.target_date ? new Date(g.target_date) : new Date(Date.now() + 10 * 365 * 86400000);
          const now = new Date();
          const monthsRemaining = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
          const r = 0.01;
          const futureCurrent = current * Math.pow(1 + r, monthsRemaining);
          const shortfall = Math.max(0, target - futureCurrent);
          const sipRequired = shortfall > 0 ? Math.round(shortfall * (r / (Math.pow(1 + r, monthsRemaining) - 1))) : 0;
          const fundedPct = target > 0 ? (current / target) * 100 : 0;
          const probability = Math.min(99, Math.max(65, Math.round(75 + fundedPct * 0.2)));
          return {
            ...g,
            target_amount: target,
            current_amount: current,
            monthly_sip_required: g.monthly_sip_required !== undefined ? g.monthly_sip_required : (sipRequired || 5000),
            success_probability: g.success_probability !== undefined ? g.success_probability : probability,
          };
        });
        localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(enriched));
        return enriched;
      }
      return [];
    }
    try {
      const res = await fetch(`${BASE_URL}/goals/`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data)
        ? data.map((g: any) => ({
            ...g,
            monthly_sip_required: g.monthly_sip_required ?? 5000,
            success_probability: g.success_probability ?? 85,
          }))
        : [];
    } catch (err) {
      return [];
    }
  },

  async createGoal(name: string, targetAmount: number, currentAmount: number, targetDate: string) {
    const saveLocalGoal = () => {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(LOCAL_GOALS_KEY);
        const goals = raw ? JSON.parse(raw) : [];
        const target = Number(targetAmount) || 1000000;
        const current = Number(currentAmount) || 0;
        const tDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 10 * 365 * 86400000);
        const months = Math.max(1, Math.round((tDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4375)));
        const r = 0.01;
        const futureCurrent = current * Math.pow(1 + r, months);
        const shortfall = Math.max(0, target - futureCurrent);
        const sipRequired = shortfall > 0 ? Math.round(shortfall * (r / (Math.pow(1 + r, months) - 1))) : 0;
        const fundedPct = target > 0 ? (current / target) * 100 : 0;

        const newGoal = {
          id: Date.now(),
          name,
          target_amount: target,
          current_amount: current,
          target_date: targetDate,
          monthly_sip_required: sipRequired || 5000,
          success_probability: Math.min(99, Math.max(65, Math.round(75 + fundedPct * 0.2))),
        };
        goals.push(newGoal);
        localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
        return newGoal;
      }
      return { id: 1, name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate, monthly_sip_required: 5000, success_probability: 85 };
    };

    if (!HAS_BACKEND) return saveLocalGoal();
    try {
      const res = await fetch(`${BASE_URL}/goals/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend createGoal failed, saved locally:", e);
    }
    return saveLocalGoal();
  },

  async removeGoal(goalId: number) {
    const removeLocalGoal = () => {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(LOCAL_GOALS_KEY);
        const goals = raw ? JSON.parse(raw) : [];
        const filtered = goals.filter((g: any) => g.id !== goalId);
        localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(filtered));
        return { success: true };
      }
      return { success: true };
    };

    if (!HAS_BACKEND) return removeLocalGoal();
    try {
      const res = await fetch(`${BASE_URL}/goals/${goalId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend removeGoal failed, removed locally:", e);
    }
    return removeLocalGoal();
  },

  async simulateSip(sip: number, cagr: number, years: number, inflation: number = 6.0) {
    if (!HAS_BACKEND) throw new Error("No backend — local SIP calculation will be used");
    const query = new URLSearchParams({
      monthly_sip: sip.toString(),
      expected_cagr: cagr.toString(),
      years: years.toString(),
      inflation_rate: inflation.toString(),
    });
    const res = await fetch(`${BASE_URL}/goals/simulate-sip?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to simulate SIP");
    return res.json();
  },

  // ─── Chat ──────────────────────────────────────────────────────────────────

  async getChatHistory() {
    if (!HAS_BACKEND) return [];
    try {
      const res = await fetch(`${BASE_URL}/chat/`, { headers: getHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  },

  async sendChatMessage(content: string) {
    if (!HAS_BACKEND) throw new Error("No backend — offline response will be used");
    const res = await fetch(`${BASE_URL}/chat/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  // ─── Reports ───────────────────────────────────────────────────────────────

  getPdfReportUrl() {
    const token = typeof window !== "undefined" ? localStorage.getItem("stockify_token") : "";
    return HAS_BACKEND ? `${BASE_URL}/reports/pdf?token=${token}` : "#";
  },
};
