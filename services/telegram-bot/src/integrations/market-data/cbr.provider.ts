import axios from "axios";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

const CBR_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

interface CbrValute {
  ID: string;
  NumCode: string;
  CharCode: string;
  Nominal: number;
  Name: string;
  Value: number;
  Previous: number;
}

interface CbrResponse {
  Date: string;
  PreviousDate: string;
  Timestamp: string;
  Valute: Record<string, CbrValute>;
}

export class CbrProvider implements MarketDataProvider {
  readonly name = "cbr";

  constructor(private cache: MarketCache) {}

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cacheKey = `cbr:quote:${symbol}`;
    const cached = this.cache.get<MarketQuote>(cacheKey);
    if (cached) return cached;

    try {
      const resp = await axios.get<CbrResponse>(CBR_URL, { timeout: 10_000 });
      const valute = this.findValute(symbol, resp.data);
      if (!valute) return null;

      const price = valute.Value / valute.Nominal;
      const prev = valute.Previous / valute.Nominal;
      const change = price - prev;
      const changePercent = prev ? (change / prev) * 100 : 0;

      const quote: MarketQuote = {
        symbol,
        price,
        change,
        changePercent,
        volume: 0,
        high: price,
        low: price,
        timestamp: new Date(resp.data.Date),
      };

      this.cache.set(cacheKey, quote, MarketCache.ttlFor("quote"));
      return quote;
    } catch (err) {
      console.error(`[CBR] getQuote error for ${symbol}:`, err);
      return null;
    }
  }

  async getHistoricalData(
    _symbol: string,
    _period: string,
  ): Promise<HistoricalBar[]> {
    // CBR API provides only current and previous day rates.
    // Historical data requires a separate archive API that is not free-tier friendly.
    return [];
  }

  getSupportedInstruments(): string[] {
    return ["cny-rub", "usd-rub"];
  }

  private findValute(
    symbol: string,
    data: CbrResponse,
  ): CbrValute | null {
    const map: Record<string, string> = {
      USD: "USD",
      CNY: "CNY",
      EUR: "EUR",
    };
    const charCode = map[symbol] ?? symbol;
    const valutes = data.Valute;
    for (const key of Object.keys(valutes)) {
      if (valutes[key].CharCode === charCode) return valutes[key];
    }
    return null;
  }
}
