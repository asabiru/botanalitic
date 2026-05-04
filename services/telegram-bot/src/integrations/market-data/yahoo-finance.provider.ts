import YahooFinance from "yahoo-finance2";
import axios from "axios";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
  Fundamentals,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

export class YahooFinanceProvider implements MarketDataProvider {
  readonly name = "yahoo-finance";
  private yf: InstanceType<typeof YahooFinance>;

  private static readonly MAX_RETRIES = 4;
  private static readonly INITIAL_DELAY_MS = 500;
  private static readonly MAX_DELAY_MS = 8_000;

  constructor(private cache: MarketCache) {
    this.yf = new YahooFinance({
      suppressNotices: ["yahooSurvey", "ripHistorical"],
    });
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cacheKey = `yf:quote:${symbol}`;
    const cached = this.cache.get<MarketQuote>(cacheKey);
    if (cached) return cached;

    const quote = await this.withRetry(`getQuote(${symbol})`, async () => {
      const raw = await this.yf.quote(symbol);
      if (!raw || !raw.regularMarketPrice) return null;
      return {
        symbol: raw.symbol,
        price: raw.regularMarketPrice,
        change: raw.regularMarketChange ?? 0,
        changePercent: raw.regularMarketChangePercent ?? 0,
        volume: raw.regularMarketVolume ?? 0,
        high: raw.regularMarketDayHigh ?? raw.regularMarketPrice,
        low: raw.regularMarketDayLow ?? raw.regularMarketPrice,
        timestamp: new Date(),
      } as MarketQuote;
    });

    if (quote) {
      this.cache.set(cacheKey, quote, MarketCache.ttlFor("quote"));
      return quote;
    }

    const fallback = await this.fallbackQuoteFromStooq(symbol);
    if (fallback) {
      this.cache.set(cacheKey, fallback, MarketCache.ttlFor("quote"));
    }
    return fallback;
  }

  async getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]> {
    const cacheKey = `yf:hist:${symbol}:${period}`;
    const cached = this.cache.get<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    const bars = await this.withRetry(
      `getHistoricalData(${symbol}, ${period})`,
      async () => {
        const periodDays = this.parsePeriod(period);
        const period1 = new Date();
        period1.setDate(period1.getDate() - periodDays);

        const rows = await this.yf.historical(symbol, {
          period1,
          period2: new Date(),
          interval: "1d",
        });

        return (rows as Array<{
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
      },
    );

    if (bars && bars.length > 0) {
      this.cache.set(cacheKey, bars, MarketCache.ttlFor("historical"));
      return bars;
    }
    return [];
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    const cacheKey = `yf:fund:${symbol}`;
    const cached = this.cache.get<Fundamentals>(cacheKey);
    if (cached) return cached;

    const fundamentals = await this.withRetry(
      `getFundamentals(${symbol})`,
      async () => {
        const summary = (await this.yf.quoteSummary(symbol, {
          modules: [
            "summaryDetail",
            "defaultKeyStatistics",
            "price",
          ],
        })) as Record<string, Record<string, unknown> | undefined>;

        const detail = (summary.summaryDetail ?? {}) as Record<string, unknown>;
        const stats = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>;
        const price = (summary.price ?? {}) as Record<string, unknown>;

        const str = (v: unknown): string | null =>
          typeof v === "string" ? v : null;

        const result: Fundamentals = {
          symbol,
          marketCap: this.toNumber(price.marketCap),
          peRatio: this.toNumber(detail.trailingPE),
          forwardPe: this.toNumber(detail.forwardPE),
          eps: this.toNumber(stats.trailingEps),
          dividendYield: this.toNumber(detail.dividendYield),
          dividendRate: this.toNumber(detail.dividendRate),
          beta: this.toNumber(stats.beta ?? detail.beta),
          high52w: this.toNumber(detail.fiftyTwoWeekHigh),
          low52w: this.toNumber(detail.fiftyTwoWeekLow),
          currency: str(price.currency),
          shortName: str(price.shortName),
          longName: str(price.longName),
        };
        return result;
      },
    );

    if (fundamentals) {
      // Fundamentals change rarely; cache 1 hour.
      this.cache.set(cacheKey, fundamentals, 60 * 60_000);
    }
    return fundamentals;
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

  private async withRetry<T>(
    label: string,
    operation: () => Promise<T | null>,
  ): Promise<T | null> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < YahooFinanceProvider.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastErr = err;
        const status = this.extractStatus(err);
        const retriable =
          status === 429 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          this.isNetworkError(err);

        if (!retriable || attempt === YahooFinanceProvider.MAX_RETRIES - 1) {
          break;
        }

        const delay = Math.min(
          YahooFinanceProvider.MAX_DELAY_MS,
          YahooFinanceProvider.INITIAL_DELAY_MS *
            Math.pow(2, attempt) +
            Math.floor(Math.random() * 250),
        );
        console.warn(
          `[YahooFinance] ${label} failed (status=${status ?? "n/a"}), retrying in ${delay}ms (attempt ${attempt + 1}/${YahooFinanceProvider.MAX_RETRIES})`,
        );
        await this.sleep(delay);
      }
    }
    console.error(`[YahooFinance] ${label} gave up after retries:`, lastErr);
    return null;
  }

  private extractStatus(err: unknown): number | null {
    if (typeof err !== "object" || err === null) return null;
    const e = err as { response?: { status?: number }; status?: number };
    if (typeof e.status === "number") return e.status;
    if (typeof e.response?.status === "number") return e.response.status;
    const msg = (err as { message?: string }).message ?? "";
    const match = /\b(429|5\d\d)\b/.exec(msg);
    return match ? Number(match[1]) : null;
  }

  private isNetworkError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const e = err as { code?: string; message?: string };
    if (
      e.code === "ECONNRESET" ||
      e.code === "ETIMEDOUT" ||
      e.code === "ENETUNREACH" ||
      e.code === "EAI_AGAIN"
    ) {
      return true;
    }
    return /timeout|network|fetch failed/i.test(e.message ?? "");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "object" &&
      value !== null &&
      "raw" in (value as Record<string, unknown>) &&
      typeof (value as { raw: unknown }).raw === "number"
    ) {
      return (value as { raw: number }).raw;
    }
    return null;
  }

  /**
   * Stooq.com is a free, no-auth quote source that we use as a last-resort
   * fallback when Yahoo Finance is rate limiting (HTTP 429) or otherwise
   * unavailable. Coverage is best for US tickers, FX pairs and major commodities.
   */
  private async fallbackQuoteFromStooq(symbol: string): Promise<MarketQuote | null> {
    try {
      const stooqSymbol = this.toStooqSymbol(symbol);
      if (!stooqSymbol) return null;

      const resp = await axios.get<string>(
        `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`,
        { timeout: 10_000, responseType: "text" },
      );
      const text = String(resp.data ?? "");
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return null;

      const header = lines[0].split(",");
      const row = lines[1].split(",");
      const idx = (name: string) => header.indexOf(name);

      const closeStr = row[idx("Close")];
      const openStr = row[idx("Open")];
      const highStr = row[idx("High")];
      const lowStr = row[idx("Low")];
      const volStr = row[idx("Volume")];

      const close = Number(closeStr);
      const open = Number(openStr);
      const high = Number(highStr);
      const low = Number(lowStr);
      const volume = Number(volStr);

      if (!Number.isFinite(close) || close === 0) return null;
      const change = Number.isFinite(open) ? close - open : 0;
      const changePercent = Number.isFinite(open) && open !== 0
        ? (change / open) * 100
        : 0;

      return {
        symbol,
        price: close,
        change,
        changePercent,
        volume: Number.isFinite(volume) ? volume : 0,
        high: Number.isFinite(high) ? high : close,
        low: Number.isFinite(low) ? low : close,
        timestamp: new Date(),
      };
    } catch (err) {
      console.warn(`[YahooFinance] Stooq fallback failed for ${symbol}:`, err);
      return null;
    }
  }

  private toStooqSymbol(symbol: string): string | null {
    const sym = symbol.trim();
    if (!sym) return null;
    // Yahoo FX format: "EURUSD=X" -> Stooq "eurusd"
    if (/=X$/i.test(sym)) {
      return sym.replace(/=X$/i, "").toLowerCase();
    }
    // Yahoo continuous futures (e.g. "BZ=F", "GC=F") -> map to Stooq spot.
    if (/=F$/i.test(sym)) {
      const base = sym.replace(/=F$/i, "").toUpperCase();
      const map: Record<string, string> = {
        BZ: "brent",
        CL: "cl.f",
        NG: "ng.f",
        GC: "xauusd",
        SI: "xagusd",
      };
      return map[base] ?? null;
    }
    // Plain US tickers: append `.us`.
    if (/^[A-Z][A-Z0-9.\-]{0,9}$/i.test(sym)) {
      return `${sym.toLowerCase()}.us`;
    }
    return null;
  }
}
