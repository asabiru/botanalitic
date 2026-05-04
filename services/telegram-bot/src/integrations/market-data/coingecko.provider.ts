import axios from "axios";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";
import { parsePeriodDays } from "../utils/period.js";

const CG_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoCoinData {
  usd: number;
  usd_24h_change?: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
  usd_24h_high?: number;
  usd_24h_low?: number;
}

interface CoinGeckoPriceResponse {
  [id: string]: CoinGeckoCoinData;
}

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  total_volumes: [number, number][];
}

const TICKER_TO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  dot: "polkadot",
  avax: "avalanche-2",
  matic: "matic-network",
  link: "chainlink",
  uni: "uniswap",
  atom: "cosmos",
  ltc: "litecoin",
  etc: "ethereum-classic",
  xlm: "stellar",
  near: "near",
  apt: "aptos",
  arb: "arbitrum",
  op: "optimism",
  sui: "sui",
  ton: "the-open-network",
  trx: "tron",
  shib: "shiba-inu",
  fil: "filecoin",
};

export class CoinGeckoProvider implements MarketDataProvider {
  readonly name = "coingecko";

  constructor(private cache: MarketCache) {}

  private resolveCoinId(symbol: string): string {
    const lower = symbol.toLowerCase();
    return TICKER_TO_ID[lower] ?? lower;
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const coinId = this.resolveCoinId(symbol);
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
            include_market_cap: true,
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
        high: data.usd_24h_high ?? price,
        low: data.usd_24h_low ?? price,
        timestamp: new Date(),
        marketCap: data.usd_market_cap,
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
    const coinId = this.resolveCoinId(symbol);
    const cacheKey = `cg:hist:${coinId}:${period}`;
    const cached = this.cache.get<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    try {
      const days = parsePeriodDays(period);
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

}
