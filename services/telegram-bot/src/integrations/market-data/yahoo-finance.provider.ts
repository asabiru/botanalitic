import YahooFinance from "yahoo-finance2";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

export class YahooFinanceProvider implements MarketDataProvider {
  readonly name = "yahoo-finance";
  private yf: InstanceType<typeof YahooFinance>;

  constructor(private cache: MarketCache) {
    this.yf = new YahooFinance();
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cacheKey = `yf:quote:${symbol}`;
    const cached = this.cache.get<MarketQuote>(cacheKey);
    if (cached) return cached;

    try {
      const raw = await this.yf.quote(symbol);
      if (!raw || !raw.regularMarketPrice) return null;

      const quote: MarketQuote = {
        symbol: raw.symbol,
        price: raw.regularMarketPrice,
        change: raw.regularMarketChange ?? 0,
        changePercent: raw.regularMarketChangePercent ?? 0,
        volume: raw.regularMarketVolume ?? 0,
        high: raw.regularMarketDayHigh ?? raw.regularMarketPrice,
        low: raw.regularMarketDayLow ?? raw.regularMarketPrice,
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, quote, MarketCache.ttlFor("quote"));
      return quote;
    } catch (err) {
      console.error(`[YahooFinance] getQuote error for ${symbol}:`, err);
      return null;
    }
  }

  async getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]> {
    const cacheKey = `yf:hist:${symbol}:${period}`;
    const cached = this.cache.get<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    try {
      const periodDays = this.parsePeriod(period);
      const period1 = new Date();
      period1.setDate(period1.getDate() - periodDays);

      const rows = await this.yf.historical(symbol, {
        period1,
        interval: "1d",
      });

      const bars: HistoricalBar[] = (rows as Array<{
        date: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>).map((r) => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));

      this.cache.set(cacheKey, bars, MarketCache.ttlFor("historical"));
      return bars;
    } catch (err) {
      console.error(
        `[YahooFinance] getHistoricalData error for ${symbol}:`,
        err,
      );
      return [];
    }
  }

  getSupportedInstruments(): string[] {
    return [
      "oil",
      "gas",
      "gold",
      "silver",
      "us-stocks",
      "eur-usd",
    ];
  }

  private parsePeriod(period: string): number {
    switch (period) {
      case "1d":
        return 1;
      case "1w":
        return 7;
      case "1m":
        return 30;
      case "3m":
        return 90;
      case "6m":
        return 180;
      case "1y":
        return 365;
      default:
        return 30;
    }
  }
}
