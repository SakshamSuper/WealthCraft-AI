import { StockMover, TrendingSector, TOP_GAINERS, TOP_LOSERS, TOP_VOLUME_SHOCKERS, ensureSparkline } from "./marketData";
import allIndianStocks from "./allIndianStocks.json";

export interface LiveMarketState {
  stocks: Map<string, StockMover & { lastTickDir?: "up" | "down"; lastTickTime?: number; sector?: string }>;
  sectors: TrendingSector[];
  lastUpdated: number;
}

type LiveMarketListener = (state: LiveMarketState) => void;

class LiveMarketEngine {
  private stocksMap: Map<string, StockMover & { lastTickDir?: "up" | "down"; lastTickTime?: number; sector?: string }> = new Map();
  private listeners: Set<LiveMarketListener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private lastUpdated: number = Date.now();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;

    // 1. Seed initial stocks from marketData.ts
    const seedStocks = [...TOP_GAINERS, ...TOP_LOSERS, ...TOP_VOLUME_SHOCKERS];
    for (const s of seedStocks) {
      if (!this.stocksMap.has(s.symbol)) {
        this.stocksMap.set(s.symbol, {
          ...s,
          sparkline: ensureSparkline(s.price, s.change, s.sparkline),
          lastTickTime: Date.now(),
        });
      }
    }

    // 2. Enhance with high-profile stocks from allIndianStocks.json
    for (const item of allIndianStocks as any[]) {
      const sym = item.ticker || `${item.symbol}.NS`;
      if (!this.stocksMap.has(sym)) {
        const price = Number(item.price || item.initial_nav || 100);
        const prevClose = Number(item.prevClose || price - (item.change || 0));
        const change = Number(item.change ?? +(price - prevClose).toFixed(2));
        const change_pct = Number(item.change_pct ?? (prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0));
        const volume = Number(item.volume || Math.floor(500000 + (item.aum || 100000) * 12));

        const indexCategory: "NIFTY 50" | "NIFTY 100" | "ALL STOCKS" =
          item.index === "NIFTY 50" ? "NIFTY 50" : item.index === "NIFTY 100" ? "NIFTY 100" : "ALL STOCKS";

        this.stocksMap.set(sym, {
          symbol: sym,
          ticker: sym,
          name: item.name,
          price,
          change,
          change_pct,
          volume,
          index: indexCategory,
          sector: item.sector,
          sparkline: ensureSparkline(price, change),
          lastTickTime: Date.now(),
        });
      } else {
        const existing = this.stocksMap.get(sym)!;
        if (!existing.sector && item.sector) {
          existing.sector = item.sector;
        }
      }
    }

    this.initialized = true;

    // 3. Start auto-ticker interval if in browser
    if (typeof window !== "undefined") {
      this.startTicker();
    }
  }

  public startTicker() {
    if (this.timer) return;
    // Tick every 3 seconds for continuous real-time market action
    this.timer = setInterval(() => {
      this.tick();
    }, 3000);
  }

  public stopTicker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Execute a live price tick across active equities.
   * Simulates real-time market trade prints and micro-oscillations.
   */
  public tick() {
    const symbols: string[] = [];
    this.stocksMap.forEach((_, k) => symbols.push(k));
    if (symbols.length === 0) return;

    // Pick 5 to 10 stocks to receive live order-flow executions this tick
    const countToTick = Math.floor(Math.random() * 6) + 5;
    const now = Date.now();

    for (let i = 0; i < countToTick; i++) {
      const randSym = symbols[Math.floor(Math.random() * symbols.length)];
      const stock = this.stocksMap.get(randSym);
      if (!stock) continue;

      // Realistic tick delta between -0.15% and +0.15% (with occasional momentum)
      const tickPct = (Math.random() * 0.30 - 0.14) / 100;
      const prevPrice = stock.price;
      const newPrice = +(prevPrice * (1 + tickPct)).toFixed(2);
      const priceDiff = +(newPrice - prevPrice).toFixed(2);

      if (priceDiff === 0) continue;

      const newChange = +(stock.change + priceDiff).toFixed(2);
      const prevClose = stock.price - stock.change;
      const newChangePct = prevClose > 0 ? +((newChange / prevClose) * 100).toFixed(2) : stock.change_pct;

      // Increment volume realistically (e.g. 500 to 18,500 shares traded)
      const tradeVolume = Math.floor(Math.random() * 18000) + 500;
      const newVolume = stock.volume + tradeVolume;

      // Update sparkline with sliding window
      const spark = [...(stock.sparkline || [newPrice])];
      if (spark.length >= 10) spark.shift();
      spark.push(newPrice);

      const dir: "up" | "down" = priceDiff > 0 ? "up" : "down";

      this.stocksMap.set(randSym, {
        ...stock,
        price: newPrice,
        change: newChange,
        change_pct: newChangePct,
        volume: newVolume,
        sparkline: spark,
        lastTickDir: dir,
        lastTickTime: now,
      });
    }

    this.lastUpdated = now;
    this.notify();
  }

  /**
   * Force an immediate refresh across the entire market state.
   */
  public async forceRefresh(): Promise<void> {
    this.tick();
  }

  /**
   * Dynamically aggregates and calculates all Trending Sectors from the live stocks
   */
  public getTrendingSectors(): TrendingSector[] {
    const sectorGroups: Record<
      string,
      {
        stocks: (StockMover & { sector?: string })[];
        gainers: number;
        losers: number;
        sumChange: number;
        topStock: StockMover;
      }
    > = {
      "Telecom Equipment & Infra": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Information Technology": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Automobile & Auto Parts": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Banking & Financial Services": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Oil, Gas & Energy": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Capital Goods & Defense": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Metals & Mining": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Healthcare & Pharma": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "FMCG & Consumer Goods": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Power & Green Energy": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Realty & Infrastructure": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
      "Chemicals & Fertilizers": { stocks: [], gainers: 0, losers: 0, sumChange: 0, topStock: null as any },
    };

    // Map each stock to its canonical sector
    this.stocksMap.forEach((stock) => {
      const s = (stock.sector || "").toLowerCase();
      let key = "Capital Goods & Defense";

      if (s.includes("telecom") || stock.symbol.includes("BHARTI")) key = "Telecom Equipment & Infra";
      else if (s.includes("information tech") || s.includes("technology") || stock.symbol.includes("TCS") || stock.symbol.includes("INFY")) key = "Information Technology";
      else if (s.includes("automobile") || s.includes("auto") || stock.symbol.includes("TVS") || stock.symbol.includes("M&M") || stock.symbol.includes("TATAMOTORS")) key = "Automobile & Auto Parts";
      else if (s.includes("financial") || s.includes("bank") || stock.symbol.includes("HDFC") || stock.symbol.includes("ICICI") || stock.symbol.includes("SBIN")) key = "Banking & Financial Services";
      else if (s.includes("oil") || s.includes("energy") || s.includes("gas") || stock.symbol.includes("RELIANCE")) key = "Oil, Gas & Energy";
      else if (s.includes("metal") || s.includes("mining") || stock.symbol.includes("TATASTEEL") || stock.symbol.includes("HINDZINC")) key = "Metals & Mining";
      else if (s.includes("health") || s.includes("pharma") || stock.symbol.includes("SUNPHARMA")) key = "Healthcare & Pharma";
      else if (s.includes("fast moving") || s.includes("fmcg") || s.includes("consumer goods") || stock.symbol.includes("ITC") || stock.symbol.includes("HUL")) key = "FMCG & Consumer Goods";
      else if (s.includes("power") || stock.symbol.includes("NTPC") || stock.symbol.includes("TATAPOWER")) key = "Power & Green Energy";
      else if (s.includes("realty") || s.includes("construction") || stock.symbol.includes("DLF")) key = "Realty & Infrastructure";
      else if (s.includes("chemical")) key = "Chemicals & Fertilizers";

      const group = sectorGroups[key];
      if (group) {
        group.stocks.push(stock);
        if (stock.change_pct >= 0) group.gainers++;
        else group.losers++;
        group.sumChange += stock.change_pct;

        if (!group.topStock || stock.change_pct > group.topStock.change_pct) {
          group.topStock = stock;
        }
      }
    });

    // Build the resultant array of trending sectors
    const results: TrendingSector[] = Object.entries(sectorGroups).map(([sectorName, data]) => {
      const count = data.stocks.length || 1;
      const avgChange = +(data.sumChange / count).toFixed(2);
      const topStockSymbol = data.topStock ? data.topStock.symbol.replace(/\.NS$/i, "") : "NIFTY";

      return {
        sector: sectorName,
        change_pct: avgChange,
        gainers: data.gainers,
        losers: data.losers,
        top_stock: topStockSymbol,
      };
    });

    // Sort by absolute performance or positive change
    return results.sort((a, b) => b.change_pct - a.change_pct);
  }

  /**
   * Get filtered movers (Gainers, Losers, Volume Shockers)
   */
  public getTopMovers(
    filterType: "gainers" | "losers" | "volume_shockers" = "gainers",
    indexFilter: string = "NIFTY 100"
  ): StockMover[] {
    let all: (StockMover & { lastTickDir?: "up" | "down"; lastTickTime?: number; sector?: string })[] = [];
    this.stocksMap.forEach((s) => all.push(s));

    if (indexFilter === "NIFTY 50") {
      all = all.filter((s) => s.index === "NIFTY 50");
    } else if (indexFilter === "NIFTY 100") {
      all = all.filter((s) => s.index === "NIFTY 50" || s.index === "NIFTY 100");
    }

    if (filterType === "gainers") {
      return all.filter((s) => s.change_pct > 0).sort((a, b) => b.change_pct - a.change_pct).slice(0, 10);
    } else if (filterType === "losers") {
      return all.filter((s) => s.change_pct < 0).sort((a, b) => a.change_pct - b.change_pct).slice(0, 10);
    } else {
      return all.sort((a, b) => b.volume - a.volume).slice(0, 10);
    }
  }

  public subscribe(listener: LiveMarketListener): () => void {
    this.listeners.add(listener);
    if (typeof window !== "undefined") {
      this.startTicker();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopTicker();
      }
    };
  }

  private notify() {
    const state: LiveMarketState = {
      stocks: this.stocksMap,
      sectors: this.getTrendingSectors(),
      lastUpdated: this.lastUpdated,
    };
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (e) {
        console.warn("LiveMarket listener error:", e);
      }
    });
  }

  public getLastUpdatedFormatted(): string {
    const d = new Date(this.lastUpdated);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  public getStockQuote(symbol: string): StockMover | undefined {
    return this.stocksMap.get(symbol);
  }
}

// Singleton instance
export const liveMarketEngine = new LiveMarketEngine();
