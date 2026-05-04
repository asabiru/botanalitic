export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: Date;
}

export interface HistoricalBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TechnicalSummary =
  | "strong_buy"
  | "buy"
  | "neutral"
  | "sell"
  | "strong_sell";

export interface Fundamentals {
  symbol: string;
  marketCap: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  eps: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  beta: number | null;
  high52w: number | null;
  low52w: number | null;
  currency: string | null;
  shortName: string | null;
  longName: string | null;
}

export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]>;
  getSupportedInstruments(): string[];
  getFundamentals?(symbol: string): Promise<Fundamentals | null>;
}
