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

// Shared offline portfolio response
const EMPTY_PORTFOLIO = {
  items: [],
  total_invested: 0.0,
  current_value: 0.0,
  absolute_return: 0.0,
  absolute_return_pct: 0.0,
  xirr: 0.0,
  allocation: {},
};

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
    if (!HAS_BACKEND) throw new Error("Backend not configured. Run the FastAPI server and set NEXT_PUBLIC_API_URL.");
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
    return res.json();
  },

  async login(email: string, password: string) {
    if (!HAS_BACKEND) throw new Error("Backend not configured. Run the FastAPI server and set NEXT_PUBLIC_API_URL.");
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
    if (!HAS_BACKEND) throw new Error("No backend configured");
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async updateRiskProfile(profile: any) {
    if (!HAS_BACKEND) throw new Error("No backend configured");
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
    if (!HAS_BACKEND) return FALLBACK_ASSETS.slice(0, 3);
    try {
      const res = await fetch(`${BASE_URL}/funds/recommendations`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      // fallthrough
    }
    return FALLBACK_ASSETS.slice(0, 3);
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
    if (!HAS_BACKEND) throw new Error("Backend required for comparison");
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
    if (!HAS_BACKEND) return EMPTY_PORTFOLIO;
    try {
      const res = await fetch(`${BASE_URL}/portfolio/`, { headers: getHeaders() });
      if (!res.ok) return EMPTY_PORTFOLIO;
      return await res.json();
    } catch (err) {
      return EMPTY_PORTFOLIO;
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
    if (!HAS_BACKEND) throw new Error("Backend required to add transactions");
    const res = await fetch(`${BASE_URL}/portfolio/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ fund_id: fundId, units, purchase_price: purchasePrice, purchase_date: purchaseDate, fund_name: fundName }),
    });
    if (!res.ok) throw new Error("Failed to add portfolio item");
    return res.json();
  },

  async removePortfolioItem(itemId: number) {
    if (!HAS_BACKEND) throw new Error("Backend required to remove transactions");
    const res = await fetch(`${BASE_URL}/portfolio/${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove portfolio item");
    return res.json();
  },

  async optimizePortfolio() {
    if (!HAS_BACKEND) throw new Error("Backend required for portfolio optimization");
    const res = await fetch(`${BASE_URL}/portfolio/optimize`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to optimize portfolio");
    return res.json();
  },

  // ─── Goals ─────────────────────────────────────────────────────────────────

  async getGoals() {
    if (!HAS_BACKEND) return [];
    try {
      const res = await fetch(`${BASE_URL}/goals/`, { headers: getHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  },

  async createGoal(name: string, targetAmount: number, currentAmount: number, targetDate: string) {
    if (!HAS_BACKEND) throw new Error("Backend required to create goals");
    const res = await fetch(`${BASE_URL}/goals/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate }),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
  },

  async removeGoal(goalId: number) {
    if (!HAS_BACKEND) throw new Error("Backend required to remove goals");
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
