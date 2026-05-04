import axios from "axios";
import type { TechnicalSummary } from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

interface TvScannerRow {
  s: string;
  d: number[];
}

interface TvScannerResponse {
  data?: TvScannerRow[];
}

export interface TechnicalAnalysisResult {
  symbol: string;
  summary: TechnicalSummary;
  recommend: number;
  timestamp: Date;
}

export class TradingViewProvider {
  readonly name = "tradingview";

  constructor(private cache: MarketCache) {}

  async getTechnicalSummary(
    symbol: string,
    exchange?: string,
  ): Promise<TechnicalAnalysisResult | null> {
    const cacheKey = `tv:tech:${exchange ?? ""}:${symbol}`;
    const cached = this.cache.get<TechnicalAnalysisResult>(cacheKey);
    if (cached) return cached;

    try {
      const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;

      const resp = await axios.post<TvScannerResponse>(
        "https://scanner.tradingview.com/global/scan",
        {
          symbols: { tickers: [fullSymbol] },
          columns: ["Recommend.All"],
        },
        { timeout: 10_000 },
      );

      if (!resp.data.data || resp.data.data.length === 0) {
        return null;
      }

      const recommend = resp.data.data[0].d[0];
      if (recommend == null || Number.isNaN(recommend)) return null;
      const summary = this.toSummary(recommend);

      const result: TechnicalAnalysisResult = {
        symbol,
        summary,
        recommend,
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, result, MarketCache.ttlFor("technical"));
      return result;
    } catch (err) {
      console.error(
        `[TradingView] getTechnicalSummary error for ${symbol}:`,
        err,
      );
      return null;
    }
  }

  private toSummary(recommend: number): TechnicalSummary {
    if (recommend >= 0.5) return "strong_buy";
    if (recommend >= 0.1) return "buy";
    if (recommend > -0.1) return "neutral";
    if (recommend > -0.5) return "sell";
    return "strong_sell";
  }
}
