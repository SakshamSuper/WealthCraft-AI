// Personal Watchlist state and event dispatcher
const WATCHLIST_KEY = "wealthcraft_watchlist";

export const watchlist = {
  getWatchlist(): number[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      return stored ? JSON.parse(stored) : [1, 2, 4]; // Default favorite assets: Reliance, Airtel, HDFC Top 100
    } catch {
      return [1, 2, 4];
    }
  },

  isInWatchlist(id: number): boolean {
    const list = this.getWatchlist();
    return list.includes(id);
  },

  addToWatchlist(id: number): void {
    const list = this.getWatchlist();
    if (!list.includes(id)) {
      list.push(id);
      this._save(list);
    }
  },

  removeFromWatchlist(id: number): void {
    let list = this.getWatchlist();
    list = list.filter((item) => item !== id);
    this._save(list);
  },

  toggleWatchlist(id: number): boolean {
    const list = this.getWatchlist();
    let isNowStarred = false;
    if (list.includes(id)) {
      this.removeFromWatchlist(id);
      isNowStarred = false;
    } else {
      this.addToWatchlist(id);
      isNowStarred = true;
    }
    return isNowStarred;
  },

  _save(list: number[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("wealthcraft_watchlist_updated"));
    }
  },

  subscribe(callback: (list: number[]) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => callback(this.getWatchlist());
    window.addEventListener("wealthcraft_watchlist_updated", handler);
    return () => window.removeEventListener("wealthcraft_watchlist_updated", handler);
  },
};
