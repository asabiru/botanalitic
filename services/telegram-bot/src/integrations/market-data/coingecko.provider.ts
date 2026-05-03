import axios from "axios";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

const CG_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoPriceResponse {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
  };
}

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  total_volumes: [number, number][];
}

export class CoinGeckoProvider implements MarketDataProvider {
  readonly name = "coingecko";

  constructor(private cache: MarketCache) {}

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const coinId = symbol.toLowerCase();
    const cacheKey = `cg:quote:${coinId}`;
    const cached = this.cache.get<MarketQuote>(cacheKey);
    if (cached) return cached;

    try {
      const resp = await axios.get<CoinGeckoPriceResponse>(
        `${CG_BASE}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: "usd",
            include_24hr_change: true,
            include_24hr_vol: true,
          },
          timeout: 10_000,
        },
      );

      const data = resp.data[coinId];
      if (!data) return null;

      const price = data.usd;
      const changePct = data.usd_24h_change ?? 0;
      const change = price * (changePct / 100);

      const quote: MarketQuote = {
        symbol: coinId,
        price,
        change,
        changePercent: changePct,
        volume: data.usd_24h_vol ?? 0,
        high: price,
        low: price,
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, quote, MarketCache.ttlFor("quote"));
      return quote;
    } catch (err) {
      console.error(`[CoinGecko] getQuote error for ${coinId}:`, err);
      return null;
    }
  }

  async getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]> {
    const coinId = symbol.toLowerCase();
    const cacheKey = `cg:hist:${coinId}:${period}`;
    const cached = this.cache.get<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    try {
      const days = this.parsePeriod(period);
      const resp = await axios.get<CoinGeckoMarketChartResponse>(
        `${CG_BASE}/coins/${coinId}/market_chart`,
        {
          params: { vs_currency: "usd", days },
          timeout: 10_000,
        },
      );

      const prices = resp.data.prices;
      const volumes = resp.data.total_volumes;

      const bars: HistoricalBar[] = prices.map((p, i) => {
        const priceVal = p[1];
        return {
          date: new Date(p[0]),
          open: priceVal,
          high: priceVal,
          low: priceVal,
          close: priceVal,
          volume: volumes[i]?.[1] ?? 0,
        };
      });

      this.cache.set(cacheKey, bars, MarketCache.ttlFor("historical"));
      return bars;
    } catch (err) {
      console.error(
        `[CoinGecko] getHistoricalData error for ${coinId}:`,
        err,
      );
      return [];
    }
  }

  getSupportedInstruments(): string[] {
    return ["crypto"];
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
