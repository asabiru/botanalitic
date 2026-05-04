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

/**
 * TradingView's public scanner API is partitioned by region. The default
 * `global/scan` endpoint does NOT cover Russian (MOEX) symbols — requests for
 * MOEX:* tickers there return empty rows. Russian instruments must be queried
 * via `russia/scan`. We pick the right endpoint based on the exchange and
 * fall back to the global scanner if needed.
 */
export class TradingViewProvider {
  readonly name = "tradingview";

  private static readonly RUSSIA_EXCHANGES = new Set(["MOEX", "RUS"]);
  private static readonly CRYPTO_EXCHANGES = new Set([
    "BINANCE",
    "BYBIT",
    "OKX",
    "BITSTAMP",
    "COINBASE",
    "KRAKEN",
  ]);
  private static readonly FOREX_EXCHANGES = new Set(["FX", "FX_IDC", "OANDA"]);

  constructor(private cache: MarketCache) {}

  async getTechnicalSummary(
    symbol: string,
    exchange?: string,
  ): Promise<TechnicalAnalysisResult | null> {
    const cacheKey = `tv:tech:${exchange ?? ""}:${symbol}`;
    const cached = this.cache.get<TechnicalAnalysisResult>(cacheKey);
    if (cached) return cached;

    const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;

    // Try the region-specific scanner first; if that returns nothing,
    // fall back to the global scanner.
    const region = this.regionFor(exchange);
    const candidates = region === "global"
      ? ["global"]
      : [region, "global"];

    for (const r of candidates) {
      const result = await this.scan(fullSymbol, symbol, r);
      if (result) {
        this.cache.set(cacheKey, result, MarketCache.ttlFor("technical"));
        return result;
      }
    }
    return null;
  }

  private regionFor(exchange?: string): string {
    if (!exchange) return "global";
    const upper = exchange.toUpperCase();
    if (TradingViewProvider.RUSSIA_EXCHANGES.has(upper)) return "russia";
    if (TradingViewProvider.CRYPTO_EXCHANGES.has(upper)) return "crypto";
    if (TradingViewProvider.FOREX_EXCHANGES.has(upper)) return "forex";
    return "global";
  }

  private async scan(
    fullSymbol: string,
    symbol: string,
    region: string,
  ): Promise<TechnicalAnalysisResult | null> {
    try {
      const resp = await axios.post<TvScannerResponse>(
        `https://scanner.tradingview.com/${region}/scan`,
        {
          symbols: { tickers: [fullSymbol] },
          columns: ["Recommend.All"],
        },
        { timeout: 10_000 },
      );

      if (!resp.data.data || resp.data.data.length === 0) return null;
      const recommend = resp.data.data[0].d[0];
      if (recommend == null || Number.isNaN(recommend)) return null;

      return {
        symbol,
        summary: this.toSummary(recommend),
        recommend,
        timestamp: new Date(),
      };
    } catch (err) {
      console.warn(
        `[TradingView] scan(${region}) error for ${fullSymbol}:`,
        err instanceof Error ? err.message : err,
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
