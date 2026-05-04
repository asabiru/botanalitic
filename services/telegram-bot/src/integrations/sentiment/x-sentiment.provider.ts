import { MarketCache } from "../cache/market-cache.js";

export interface SentimentData {
  instrument: string;
  score: number;
  label: "bullish" | "bearish" | "neutral";
  sampleSize: number;
  timestamp: Date;
}

export interface SentimentProvider {
  getSentiment(instrument: string): Promise<SentimentData | null>;
}

export class XSentimentProvider implements SentimentProvider {
  readonly name = "x-sentiment";

  constructor(private cache: MarketCache) {}

  async getSentiment(instrument: string): Promise<SentimentData | null> {
    const cacheKey = `sentiment:x:${instrument}`;
    const cached = this.cache.get<SentimentData>(cacheKey);
    if (cached) return cached;

    // X.com API requires an API key which is not available.
    // This is a stub that returns null until the key is configured.
    // When an API key becomes available, implement the real call here.
    return null;
  }
}
