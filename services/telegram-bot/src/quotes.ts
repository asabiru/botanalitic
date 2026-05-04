import type { MarketQuote } from "./integrations/market-data/provider.interface.js";
import type { MarketContext } from "./integrations/market-data.service.js";
import type { MarketDataService } from "./integrations/market-data.service.js";

export type InstrumentQuote = {
  instrumentId: string;
  ticker: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  unit: string;
  volume?: number;
  high?: number;
  low?: number;
  weeklyChange?: number | null;
  technicalSignal?: string | null;
  updatedAt: string;
  note?: string;
};

const INSTRUMENT_META: Record<string, { ticker: string; currency: string; unit: string }> = {
  "cny-rub": { ticker: "CNY/RUB", currency: "RUB", unit: "за 1 CNY" },
  "usd-rub": { ticker: "USD/RUB", currency: "RUB", unit: "за 1 USD" },
  oil: { ticker: "Brent", currency: "USD", unit: "за баррель" },
  gas: { ticker: "NG", currency: "USD", unit: "за MMBtu" },
  gold: { ticker: "XAU/USD", currency: "USD", unit: "за тр. унцию" },
  silver: { ticker: "XAG/USD", currency: "USD", unit: "за тр. унцию" },
  "us-stocks": { ticker: "S&P 500", currency: "USD", unit: "пунктов" },
  "ru-stocks": { ticker: "MOEX", currency: "RUB", unit: "пунктов" },
  imoex: { ticker: "IMOEX", currency: "RUB", unit: "пунктов" },
  rgbi: { ticker: "RGBI", currency: "RUB", unit: "пунктов" },
  crypto: { ticker: "BTC/USD", currency: "USD", unit: "за 1 BTC" },
  "eur-usd": { ticker: "EUR/USD", currency: "USD", unit: "за 1 EUR" },
};

const TECHNICAL_LABELS: Record<string, string> = {
  strong_buy: "Активно покупать",
  buy: "Покупать",
  neutral: "Нейтрально",
  sell: "Продавать",
  strong_sell: "Активно продавать",
};

function quoteFromMarket(instrumentId: string, mq: MarketQuote, ctx: MarketContext): InstrumentQuote {
  const meta = INSTRUMENT_META[instrumentId] ?? { ticker: mq.symbol, currency: "USD", unit: "" };
  const prev = mq.price - mq.change;

  return {
    instrumentId,
    ticker: meta.ticker,
    currentPrice: mq.price,
    previousClose: prev || mq.price,
    change: mq.change,
    changePercent: mq.changePercent,
    currency: meta.currency,
    unit: meta.unit,
    volume: mq.volume || undefined,
    high: mq.high !== mq.price ? mq.high : undefined,
    low: mq.low !== mq.price ? mq.low : undefined,
    weeklyChange: ctx.weeklyChange,
    technicalSignal: ctx.technicalSummary ? TECHNICAL_LABELS[ctx.technicalSummary] ?? ctx.technicalSummary : null,
    updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}

export async function fetchLiveQuote(
  marketDataService: MarketDataService,
  instrumentId: string,
  ticker?: string,
): Promise<InstrumentQuote | null> {
  try {
    const ctx = await marketDataService.getMarketContext(instrumentId, ticker);
    if (!ctx.quote) return null;
    return quoteFromMarket(instrumentId, ctx.quote, ctx);
  } catch (err) {
    console.error(`[Quotes] Failed to fetch live quote for ${instrumentId}:`, err);
    return null;
  }
}

export function formatQuote(quote: InstrumentQuote): string {
  const sign = quote.change >= 0 ? "+" : "";
  const arrow = quote.change >= 0 ? "▲" : "▼";

  const lines: string[] = [
    `📌 <b>${quote.ticker}</b>: ${quote.currentPrice.toFixed(2)} ${quote.currency} ${quote.unit}`,
    `${arrow} ${sign}${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)`,
  ];

  if (quote.high && quote.low) {
    lines.push(`Диапазон дня: ${quote.low.toFixed(2)} – ${quote.high.toFixed(2)}`);
  }

  if (quote.volume) {
    lines.push(`Объём: ${formatVolume(quote.volume)}`);
  }

  if (quote.weeklyChange != null) {
    const ws = quote.weeklyChange >= 0 ? "+" : "";
    lines.push(`За неделю: ${ws}${quote.weeklyChange.toFixed(2)}%`);
  }

  if (quote.technicalSignal) {
    lines.push("", `📊 TradingView: <b>${quote.technicalSignal}</b>`);
  }

  if (quote.note) {
    lines.push("", `💡 ${quote.note}`);
  }

  lines.push("", `🕐 ${quote.updatedAt}`);

  return lines.join("\n");
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}
