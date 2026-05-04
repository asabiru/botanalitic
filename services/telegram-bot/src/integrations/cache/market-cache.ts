interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketCache {
  private store = new Map<string, CacheEntry<unknown>>();

  private static readonly TTL_QUOTES = 60_000;
  private static readonly TTL_HISTORICAL = 5 * 60_000;
  private static readonly TTL_NEWS = 15 * 60_000;
  private static readonly TTL_SENTIMENT = 10 * 60_000;
  private static readonly TTL_TECHNICAL = 2 * 60_000;

  static ttlFor(
    kind: "quote" | "historical" | "news" | "sentiment" | "technical",
  ): number {
    switch (kind) {
      case "quote":
        return MarketCache.TTL_QUOTES;
      case "historical":
        return MarketCache.TTL_HISTORICAL;
      case "news":
        return MarketCache.TTL_NEWS;
      case "sentiment":
        return MarketCache.TTL_SENTIMENT;
      case "technical":
        return MarketCache.TTL_TECHNICAL;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
