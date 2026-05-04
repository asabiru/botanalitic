export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: Date;
  marketCap?: number;
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

export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getHistoricalData(
    symbol: string,
    period: string,
  ): Promise<HistoricalBar[]>;
  getSupportedInstruments(): string[];
}
