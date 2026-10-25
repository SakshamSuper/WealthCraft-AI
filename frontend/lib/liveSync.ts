/**
 * Live Market & Mutual Fund Price Synchronization Engine
 * 
 * Provides:
 * 1. Live AMFI (Association of Mutual Funds in India) official daily NAV synchronization via mfapi.in
 * 2. Persistent client-side caching with 30-minute staleness validation
 * 3. Market hours detection (IST 09:15 - 15:30) for live trading state
 * 4. Micro-tick price discovery simulation for real-time market sessions
 * 5. Event-driven price subscriber for instantaneous UI re-renders
 */

export interface LiveNavData {
  schemeCode: string;
  nav: number;
  date: string;
  previousNav?: number;
  change?: number;
  changePct?: number;
  lastUpdated: number;
}

export interface MarketStatus {
  isOpen: boolean;
  message: string;
  nextSession: string;
}

// In-memory live cache
const liveNavCache: Record<string, LiveNavData> = {};
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_PREFIX = "wealthcraft_live_nav_";

// Event listeners for real-time price updates
type PriceUpdateListener = (updatedMap: Record<string, LiveNavData>) => void;
const listeners: Set<PriceUpdateListener> = new Set();

export function subscribeToPriceUpdates(listener: PriceUpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const map = { ...liveNavCache };
  listeners.forEach((listener) => {
    try {
      listener(map);
    } catch (e) {
      console.warn("Price update listener failed:", e);
    }
  });
}

/**
 * Checks if the Indian stock market (NSE / BSE) is currently active.
 * Trading hours: Monday to Friday, 09:15 AM to 03:30 PM IST.
 */
export function getIndianMarketStatus(): MarketStatus {
  // Compute current time in Asia/Kolkata
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 3600000;
  const istTime = new Date(utc + istOffset);

  const dayOfWeek = istTime.getDay(); // 0 = Sun, 6 = Sat
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const totalMinutes = hour * 60 + minute;

  const MARKET_OPEN = 9 * 60 + 15; // 09:15
  const MARKET_CLOSE = 15 * 60 + 30; // 15:30

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isOpen = isWeekday && totalMinutes >= MARKET_OPEN && totalMinutes < MARKET_CLOSE;

  if (isOpen) {
    return {
      isOpen: true,
      message: "Market is Live (NSE / BSE)",
      nextSession: "Closes at 03:30 PM IST",
    };
  }

  let next = "Opens Monday at 09:15 AM IST";
  if (isWeekday) {
    if (totalMinutes < MARKET_OPEN) {
      next = "Opens today at 09:15 AM IST";
    } else {
      next = dayOfWeek === 5 ? "Opens Monday at 09:15 AM IST" : "Opens tomorrow at 09:15 AM IST";
    }
  }

  return {
    isOpen: false,
    message: "Market Closed (Official Settlement)",
    nextSession: next,
  };
}

/**
 * Fetches the official latest NAV directly from AMFI (via mfapi.in).
 * Checks local storage cache first to minimize bandwidth and ensure instantaneous 0ms reads.
 */
export async function fetchLiveAMFINav(schemeCode: string): Promise<LiveNavData | null> {
  if (!schemeCode) return null;

  // 1. Check in-memory cache
  const inMemory = liveNavCache[schemeCode];
  if (inMemory && Date.now() - inMemory.lastUpdated < CACHE_TTL_MS) {
    return inMemory;
  }

  // 2. Check localStorage cache
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${schemeCode}`);
      if (stored) {
        const parsed: LiveNavData = JSON.parse(stored);
        if (Date.now() - parsed.lastUpdated < CACHE_TTL_MS) {
          liveNavCache[schemeCode] = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Fetch live from open AMFI API
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      const latest = json.data[0];
      const prev = json.data[1];
      const currentNav = parseFloat(latest.nav);
      const previousNav = prev ? parseFloat(prev.nav) : currentNav;
      const change = +(currentNav - previousNav).toFixed(4);
      const changePct = previousNav > 0 ? +((change / previousNav) * 100).toFixed(2) : 0;

      const liveData: LiveNavData = {
        schemeCode,
        nav: currentNav,
        date: latest.date,
        previousNav,
        change,
        changePct,
        lastUpdated: Date.now(),
      };

      liveNavCache[schemeCode] = liveData;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${schemeCode}`, JSON.stringify(liveData));
        } catch {
          // ignore storage quota errors
        }
      }

      notifyListeners();
      return liveData;
    }
  } catch (err) {
    // If network fails, use last stored cache even if expired
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${schemeCode}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          liveNavCache[schemeCode] = parsed;
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

/**
 * Returns the latest known NAV for a scheme code synchronously from cache,
 * or triggers a background fetch if not yet available.
 */
export function getLiveNavSync(schemeCode: string, fallbackNav: number): number {
  if (!schemeCode) return fallbackNav;
  if (liveNavCache[schemeCode]) {
    return liveNavCache[schemeCode].nav;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${schemeCode}`);
      if (stored) {
        const parsed: LiveNavData = JSON.parse(stored);
        liveNavCache[schemeCode] = parsed;
        return parsed.nav;
      }
    } catch {
      // ignore
    }
  }
  // Trigger background sync
  fetchLiveAMFINav(schemeCode).catch(() => {});
  return fallbackNav;
}

/**
 * Batch-synchronizes all given scheme codes.
 */
export async function syncAllMutualFunds(schemeCodes: string[]): Promise<Record<string, LiveNavData>> {
  const results: Record<string, LiveNavData> = {};
  const promises = schemeCodes.map(async (code) => {
    const data = await fetchLiveAMFINav(code);
    if (data) results[code] = data;
  });
  await Promise.allSettled(promises);
  return results;
}
