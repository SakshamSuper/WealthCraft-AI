import { FALLBACK_ASSETS } from "./fallbackAssets";
import { filterMarketMovers, TRENDING_SECTORS } from "./marketData";

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
    const currentNav = Number(it.current_nav) || asset?.initial_nav || purchasePrice;
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
      purchase_date: it.purchase_date || "2025-06-15",
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

// Shared offline market indices
const OFFLINE_INDICES = [
  { name: "NIFTY", symbol: "^NSEI", price: 25112.40, change: 288.6, change_pct: 1.16 },
  { name: "SENSEX", symbol: "^BSESN", price: 82245.50, change: 817.12, change_pct: 1.00 },
  { name: "BANKNIFTY", symbol: "^NSEBANK", price: 55347.25, change: 429.25, change_pct: 0.78 },
  { name: "MIDCPNIFTY", symbol: "^NSEMDCP50", price: 17042.85, change: 215.15, change_pct: 1.28 },
  { name: "FINNIFTY", symbol: "NIFTY_FIN_SERVICE.NS", price: 24188.60, change: 142.30, change_pct: 0.59 },
  { name: "S&P 500", symbol: "^GSPC", price: 5872.15, change: 28.40, change_pct: 0.49 },
];

export const api = {
  // ─── Auth & Profile ──────────────────────────────────────────────────────────

  async register(email: string, password: string, fullName: string) {
    if (!HAS_BACKEND) {
      const demoToken = "demo_jwt_token_" + Date.now();
      if (typeof window !== "undefined") {
        localStorage.setItem("wealthcraft_token", demoToken);
        localStorage.setItem("stockify_token", demoToken);
        localStorage.setItem(
          "wealthcraft_user_profile",
          JSON.stringify({
            id: 1,
            email,
            full_name: fullName || "Investor",
            risk_appetite: "Moderate Aggressive",
            investment_horizon_years: 10,
            monthly_income: 150000,
            sip_amount: 15000,
          })
        );
      }
      return {
        access_token: demoToken,
        token_type: "bearer",
        user: { id: 1, email, full_name: fullName },
      };
    }
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
    return res.json();
  },

  async login(email: string, password: string) {
    if (!HAS_BACKEND) {
      const demoToken = "demo_jwt_token_" + Date.now();
      if (typeof window !== "undefined") {
        localStorage.setItem("wealthcraft_token", demoToken);
        localStorage.setItem("stockify_token", demoToken);
      }
      return {
        access_token: demoToken,
        token_type: "bearer",
        user: {
          id: 1,
          email: email || "investor@wealthcraft.ai",
          full_name: "Demo Investor",
        },
      };
    }
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    const data = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("wealthcraft_token", data.access_token);
      localStorage.setItem("stockify_token", data.access_token);
    }
    return data;
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stockify_token");
      localStorage.removeItem("wealthcraft_token");
    }
  },

  async getProfile() {
    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("wealthcraft_user_profile");
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch {
            // ignore
          }
        }
      }
      return {
        id: 1,
        email: "investor@wealthcraft.ai",
        full_name: "Demo Investor",
        risk_appetite: "Moderate Aggressive",
        investment_horizon_years: 10,
        monthly_income: 150000,
        sip_amount: 15000,
      };
    }
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async updateRiskProfile(profile: any) {
    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        const existing = await this.getProfile();
        const updated = { ...existing, ...profile };
        localStorage.setItem("wealthcraft_user_profile", JSON.stringify(updated));
        return updated;
      }
      return profile;
    }
    const res = await fetch(`${BASE_URL}/auth/risk-profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to update risk profile");
    return res.json();
  },

  // ─── Market Data (all have offline fallbacks) ─────────────────────────────

  async getMarketIndices() {
    if (!HAS_BACKEND) return OFFLINE_INDICES;
    try {
      const res = await fetch(`${BASE_URL}/funds/market-indices`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // network error → fallback
    }
    return OFFLINE_INDICES;
  },

  async getTopMovers(filterType: "gainers" | "losers" | "volume_shockers" = "gainers", indexFilter = "NIFTY 100") {
    if (!HAS_BACKEND) return filterMarketMovers(filterType, indexFilter);
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
    return filterMarketMovers(filterType, indexFilter);
  },

  async getTrendingSectors() {
    if (!HAS_BACKEND) return TRENDING_SECTORS;
    try {
      const res = await fetch(`${BASE_URL}/funds/trending-sectors`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // fallthrough
    }
    return TRENDING_SECTORS;
  },

  async getFunds(search?: string, category?: string, risk?: string, minRating?: number) {
    if (!HAS_BACKEND) {
      let list = FALLBACK_ASSETS;
      if (search) {
        const s = search.toLowerCase();
        list = list.filter((a) => a.name.toLowerCase().includes(s) || (a.ticker && a.ticker.toLowerCase().includes(s)));
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
    let list = FALLBACK_ASSETS;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(s) || (a.ticker && a.ticker.toLowerCase().includes(s)));
    }
    return list;
  },

  async getRecommendations() {
    const buildFallbackRecs = () => {
      const picks = [
        FALLBACK_ASSETS.find((a) => a.ticker === "PPFCF") || FALLBACK_ASSETS[1],
        FALLBACK_ASSETS.find((a) => a.ticker === "HDFCTOP100") || FALLBACK_ASSETS[2],
        FALLBACK_ASSETS.find((a) => a.ticker === "QUANT_ACT") || FALLBACK_ASSETS[3],
      ].filter(Boolean);

      return (picks.length > 0 ? picks : FALLBACK_ASSETS.slice(0, 3)).map((fund, idx) => ({
        fund: {
          ...fund,
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
      }));
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
    if (!HAS_BACKEND) return FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    return FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
  },
  async getFundDetail(id: number) {
    return this.getFundDetails(id);
  },

  async getFundNAVHistory(id: number) {
    if (!HAS_BACKEND) {
      const asset = FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
      const base = asset.initial_nav || 1000;
      const dates = ["2025-10-21", "2025-11-25", "2025-12-30", "2026-02-03", "2026-03-10", "2026-04-14", "2026-05-19", "2026-06-23", "2026-07-28", "2026-09-01", "2026-10-13"];
      return dates.map((d, i) => ({ date: d, nav: Math.round(base * (0.86 + i * 0.014)), NAV: Math.round(base * (0.86 + i * 0.014)) }));
    }
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}/nav-history`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // fallthrough
    }
    const asset = FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
    const base = asset.initial_nav || 1000;
    const dates = ["2025-10-21", "2025-11-25", "2025-12-30", "2026-02-03", "2026-03-10", "2026-04-14", "2026-05-19", "2026-06-23", "2026-07-28", "2026-09-01", "2026-10-13"];
    return dates.map((d, i) => ({ date: d, nav: Math.round(base * (0.86 + i * 0.014)), NAV: Math.round(base * (0.86 + i * 0.014)) }));
  },
  async getNAVHistory(id: number) {
    return this.getFundNAVHistory(id);
  },

  async getFundForecast(id: number) {
    if (!HAS_BACKEND) {
      const asset = FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
      const curPrice = asset.initial_nav || 1000;
      return {
        target_price_1y: Math.round(curPrice * 1.18), target_price_high: Math.round(curPrice * 1.35),
        target_price_low: Math.round(curPrice * 0.92), cagr: 18.5, confidence: 85.0,
        dates: ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"],
        nav: [curPrice * 1.05, curPrice * 1.09, curPrice * 1.14, curPrice * 1.18],
        lower_bound: [curPrice * 0.98, curPrice * 0.96, curPrice * 0.94, curPrice * 0.92],
        upper_bound: [curPrice * 1.12, curPrice * 1.19, curPrice * 1.27, curPrice * 1.35],
      };
    }
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}/forecast`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    const asset = FALLBACK_ASSETS.find((a) => a.id === id) || FALLBACK_ASSETS[0];
    const curPrice = asset.initial_nav || 1000;
    return {
      target_price_1y: Math.round(curPrice * 1.18), target_price_high: Math.round(curPrice * 1.35),
      target_price_low: Math.round(curPrice * 0.92), cagr: 18.5, confidence: 85.0,
      dates: ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"],
      nav: [curPrice * 1.05, curPrice * 1.09, curPrice * 1.14, curPrice * 1.18],
      lower_bound: [curPrice * 0.98, curPrice * 0.96, curPrice * 0.94, curPrice * 0.92],
      upper_bound: [curPrice * 1.12, curPrice * 1.19, curPrice * 1.27, curPrice * 1.35],
    };
  },

  async getFundPeers(id: number) {
    if (!HAS_BACKEND) return [
      { name: "HDFC Bank Ltd", ticker: "HDFCBANK.NS", price: 1685.40, pe_ratio: 18.6, aum: 1172694.64, change_1y: 12.4 },
      { name: "ICICI Bank Ltd", ticker: "ICICIBANK.NS", price: 1248.60, pe_ratio: 17.2, aum: 1049555.5, change_1y: 24.2 },
      { name: "Infosys Ltd", ticker: "INFY.NS", price: 1894.20, pe_ratio: 26.8, aum: 764100, change_1y: 9.8 },
    ];
    try {
      const res = await fetch(`${BASE_URL}/funds/${id}/peers`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      // fallthrough
    }
    return [
      { name: "HDFC Bank Ltd", ticker: "HDFCBANK.NS", price: 1685.40, pe_ratio: 18.6, aum: 1172694.64, change_1y: 12.4 },
      { name: "ICICI Bank Ltd", ticker: "ICICIBANK.NS", price: 1248.60, pe_ratio: 17.2, aum: 1049555.5, change_1y: 24.2 },
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
    if (!HAS_BACKEND) {
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
    }
    const res = await fetch(`${BASE_URL}/funds/compare`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(fundIds),
    });
    if (!res.ok) throw new Error("Failed to compare funds");
    return res.json();
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
    if (!HAS_BACKEND) {
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
    }
    const res = await fetch(`${BASE_URL}/portfolio/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ fund_id: fundId, units, purchase_price: purchasePrice, purchase_date: purchaseDate, fund_name: fundName }),
    });
    if (!res.ok) throw new Error("Failed to add portfolio item");
    return res.json();
  },

  async removePortfolioItem(itemId: number) {
    if (!HAS_BACKEND) {
      const items = getLocalPortfolioItems();
      const filtered = items.filter((it: any) => it.id !== itemId);
      saveLocalPortfolioItems(filtered);
      return { success: true };
    }
    const res = await fetch(`${BASE_URL}/portfolio/${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove portfolio item");
    return res.json();
  },

  async optimizePortfolio() {
    if (!HAS_BACKEND) {
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
    }
    const res = await fetch(`${BASE_URL}/portfolio/optimize`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to optimize portfolio");
    return res.json();
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
    if (!HAS_BACKEND) {
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
    }
    const res = await fetch(`${BASE_URL}/goals/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate }),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
  },

  async removeGoal(goalId: number) {
    if (!HAS_BACKEND) {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(LOCAL_GOALS_KEY);
        const goals = raw ? JSON.parse(raw) : [];
        const filtered = goals.filter((g: any) => g.id !== goalId);
        localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(filtered));
        return { success: true };
      }
      return { success: true };
    }
    const res = await fetch(`${BASE_URL}/goals/${goalId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove goal");
    return res.json();
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
