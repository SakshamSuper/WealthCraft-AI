const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://wealthcraft-api.loca.lt/api/v1";
  }
  return "http://127.0.0.1:8000/api/v1";
};

const BASE_URL = getBaseUrl();

const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
  };
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("wealthcraft_token") || localStorage.getItem("stockify_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

export const api = {
  // --- Auth & Profile ---
  async register(email: string, password: string, fullName: string) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
    return res.json();
  },

  async login(email: string, password: string) {
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
    }
  },

  async getProfile() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async updateRiskProfile(profile: any) {
    const res = await fetch(`${BASE_URL}/auth/risk-profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to update risk profile");
    return res.json();
  },

  // --- Mutual Funds & Market Data ---
  async getMarketIndices() {
    const res = await fetch(`${BASE_URL}/funds/market-indices`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch market indices");
    return res.json();
  },

  async getTopMovers(filterType = "gainers", indexFilter = "NIFTY 100") {
    const query = new URLSearchParams({ filter_type: filterType, index_filter: indexFilter });
    const res = await fetch(`${BASE_URL}/funds/top-movers?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch top movers");
    return res.json();
  },

  async getTrendingSectors() {
    const res = await fetch(`${BASE_URL}/funds/trending-sectors`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch trending sectors");
    return res.json();
  },

  async getFunds(search?: string, category?: string, risk?: string, minRating?: number) {
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (category) query.append("category", category);
    if (risk) query.append("risk", risk);
    if (minRating) query.append("min_rating", minRating.toString());
    
    const res = await fetch(`${BASE_URL}/funds/?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to search funds");
    return res.json();
  },

  async getRecommendations() {
    const res = await fetch(`${BASE_URL}/funds/recommendations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch recommendations");
    return res.json();
  },

  async getFundDetails(id: number) {
    const res = await fetch(`${BASE_URL}/funds/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch fund details");
    return res.json();
  },
  async getFundDetail(id: number) {
    return this.getFundDetails(id);
  },

  async getFundNAVHistory(id: number) {
    const res = await fetch(`${BASE_URL}/funds/${id}/nav-history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch NAV history");
    return res.json();
  },
  async getNAVHistory(id: number) {
    return this.getFundNAVHistory(id);
  },

  async getFundForecast(id: number) {
    const res = await fetch(`${BASE_URL}/funds/${id}/forecast`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch fund forecast");
    return res.json();
  },

  async getFundPeers(id: number) {
    const res = await fetch(`${BASE_URL}/funds/${id}/peers`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch fund peers");
    return res.json();
  },

  async resolveFund(schemeCode: number, name: string, ticker?: string) {
    const res = await fetch(`${BASE_URL}/funds/resolve`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ scheme_code: schemeCode, name, ticker }),
    });
    if (!res.ok) throw new Error("Failed to resolve asset");
    return res.json();
  },

  async compareFunds(fundIds: number[]) {
    const res = await fetch(`${BASE_URL}/funds/compare`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(fundIds),
    });
    if (!res.ok) throw new Error("Failed to compare funds");
    return res.json();
  },

  // --- Portfolios ---
  async getPortfolio() {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        return {
          items: [],
          total_invested: 0.0,
          current_value: 0.0,
          absolute_return: 0.0,
          absolute_return_pct: 0.0,
          xirr: 0.0,
          allocation: {}
        };
      }
      return await res.json();
    } catch (err) {
      console.warn("Portfolio fetch fallback triggered:", err);
      return {
        items: [],
        total_invested: 0.0,
        current_value: 0.0,
        absolute_return: 0.0,
        absolute_return_pct: 0.0,
        xirr: 0.0,
        allocation: {}
      };
    }
  },

  async getPortfolioNews() {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/news`, {
        headers: getHeaders(),
      });
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
    const res = await fetch(`${BASE_URL}/portfolio/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ fund_id: fundId, units, purchase_price: purchasePrice, purchase_date: purchaseDate, fund_name: fundName }),
    });
    if (!res.ok) throw new Error("Failed to add portfolio item");
    return res.json();
  },

  async removePortfolioItem(itemId: number) {
    const res = await fetch(`${BASE_URL}/portfolio/${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove portfolio item");
    return res.json();
  },

  async optimizePortfolio() {
    const res = await fetch(`${BASE_URL}/portfolio/optimize`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to optimize portfolio");
    return res.json();
  },

  // --- Goals ---
  async getGoals() {
    const res = await fetch(`${BASE_URL}/goals/`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch goals");
    return res.json();
  },

  async createGoal(name: string, targetAmount: number, currentAmount: number, targetDate: string) {
    const res = await fetch(`${BASE_URL}/goals/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate }),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
  },

  async removeGoal(goalId: number) {
    const res = await fetch(`${BASE_URL}/goals/${goalId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove goal");
    return res.json();
  },

  async simulateSip(sip: number, cagr: number, years: number, inflation: number = 6.0) {
    const query = new URLSearchParams({
      monthly_sip: sip.toString(),
      expected_cagr: cagr.toString(),
      years: years.toString(),
      inflation_rate: inflation.toString()
    });
    const res = await fetch(`${BASE_URL}/goals/simulate-sip?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to simulate SIP");
    return res.json();
  },

  // --- Chat ---
  async getChatHistory() {
    const res = await fetch(`${BASE_URL}/chat/`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch chat history");
    return res.json();
  },

  async sendChatMessage(content: string) {
    const res = await fetch(`${BASE_URL}/chat/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  // --- PDF Download link ---
  getPdfReportUrl() {
    const token = typeof window !== "undefined" ? localStorage.getItem("stockify_token") : "";
    return `${BASE_URL}/reports/pdf?token=${token}`;
  }
};
