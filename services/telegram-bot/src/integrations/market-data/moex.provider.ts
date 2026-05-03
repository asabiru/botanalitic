import axios from "axios";
import type {
  MarketDataProvider,
  MarketQuote,
  HistoricalBar,
} from "./provider.interface.js";
import { MarketCache } from "../cache/market-cache.js";

const MOEX_BASE = "https://iss.moex.com/iss";

interface MoexColumn {
  columns: string[];
  data: (string | number | null)[][];
}

interface MoexResponse {
  securities?: MoexColumn;
  marketdata?: MoexColumn;
  history?: MoexColumn;
}

export class MoexProvider implements MarketDataProvider {
  readonly name = "moex";

  constructor(private cache: MarketCache) {}

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cacheKey = `moex:quote:${symbol}`;
    const cached = this.cache.get<MarketQuote>(cacheKey);
    if (cached) return cached;

    try {
      const url = this.buildQuoteUrl(symbol);
      const resp = await axios.get<MoexResponse>(url, { timeout: 10_000 });
      const quote = this.parseQuoteResponse(symbol, resp.data);
      if (quote) {
        this.cache.set(cacheKey, quote, MarketCache.ttlFor("quote"));
      }
      return quote;
    } catch (err) {
      console.error(`[MOEX] getQuote error for ${symbol}:`, err);
      return null;
    }
  }

  async getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]> {
    const cacheKey = `moex:hist:${symbol}:${period}`;
    const cached = this.cache.get<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    try {
      const days = this.parsePeriod(period);
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().slice(0, 10);

      const isIndex = symbol === "IMOEX" || symbol === "RGBITR";
      const engine = "stock";
      const market = isIndex ? "index" : "shares";
      const board = isIndex ? undefined : "TQBR";

      let url: string;
      if (board) {
        url = `${MOEX_BASE}/history/engines/${engine}/markets/${market}/boards/${board}/securities/${symbol}.json?from=${fromStr}&iss.meta=off`;
      } else {
        url = `${MOEX_BASE}/history/engines/${engine}/markets/${market}/securities/${symbol}.json?from=${fromStr}&iss.meta=off`;
      }

      const resp = await axios.get<MoexResponse>(url, { timeout: 10_000 });
      const history = resp.data.history;
      if (!history) return [];

      const cols = history.columns;
      const dateIdx = cols.indexOf("TRADEDATE");
      const openIdx = cols.indexOf("OPEN");
      const highIdx = cols.indexOf("HIGH");
      const lowIdx = cols.indexOf("LOW");
      const closeIdx = cols.indexOf("CLOSE");
      const volIdx = cols.indexOf("VOLUME");

      const bars: HistoricalBar[] = history.data
        .filter((row) => row[closeIdx] != null)
        .map((row) => ({
          date: new Date(row[dateIdx] as string),
          open: (row[openIdx] as number) ?? (row[closeIdx] as number),
          high: (row[highIdx] as number) ?? (row[closeIdx] as number),
          low: (row[lowIdx] as number) ?? (row[closeIdx] as number),
          close: row[closeIdx] as number,
          volume: (row[volIdx] as number) ?? 0,
        }));

      this.cache.set(cacheKey, bars, MarketCache.ttlFor("historical"));
      return bars;
    } catch (err) {
      console.error(
        `[MOEX] getHistoricalData error for ${symbol}:`,
        err,
      );
      return [];
    }
  }

  getSupportedInstruments(): string[] {
    return ["ru-stocks", "imoex", "rgbi"];
  }

  private buildQuoteUrl(symbol: string): string {
    if (symbol === "IMOEX") {
      return `${MOEX_BASE}/engines/stock/markets/index/securities/IMOEX.json?iss.meta=off`;
    }
    if (symbol === "RGBITR") {
      return `${MOEX_BASE}/engines/stock/markets/index/securities/RGBITR.json?iss.meta=off`;
    }
    return `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${symbol}.json?iss.meta=off`;
  }

  private parseQuoteResponse(
    symbol: string,
    data: MoexResponse,
  ): MarketQuote | null {
    const md = data.marketdata;
    const sec = data.securities;
    if (!md || md.data.length === 0) return null;

    const mdCols = md.columns;
    const mdRow = md.data[0];

    const val = (name: string): number => {
      const idx = mdCols.indexOf(name);
      return idx >= 0 ? (mdRow[idx] as number) ?? 0 : 0;
    };

    const price = val("LAST") || val("CURRENTVALUE");
    if (!price) return null;

    let change = val("CHANGE");
    let changePercent = val("LASTTOPREVPRICE");
    if (!changePercent && sec) {
      const secCols = sec.columns;
      const secRow = sec.data[0];
      if (secRow) {
        const prevIdx = secCols.indexOf("PREVPRICE");
        if (prevIdx >= 0) {
          const prev = secRow[prevIdx] as number;
          if (prev) {
            change = price - prev;
            changePercent = ((price - prev) / prev) * 100;
          }
        }
      }
    }

    return {
      symbol,
      price,
      change,
      changePercent,
      volume: val("VOLTODAY") || val("VOLUME") || val("VALUE"),
      high: val("HIGH") || price,
      low: val("LOW") || price,
      timestamp: new Date(),
    };
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
