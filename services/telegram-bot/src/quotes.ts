export type QuoteLevel = {
  price: number;
  label: string;
};

export type InstrumentQuote = {
  instrumentId: string;
  ticker: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  unit: string;
  support: QuoteLevel[];
  resistance: QuoteLevel[];
  updatedAt: string;
  note?: string;
};

const UPDATED_AT = "2026-05-04";

export const instrumentQuotes: InstrumentQuote[] = [
  {
    instrumentId: "cny-rub",
    ticker: "CNY/RUB",
    currentPrice: 11.82,
    previousClose: 11.75,
    change: 0.07,
    changePercent: 0.60,
    currency: "RUB",
    unit: "за 1 CNY",
    support: [
      { price: 11.60, label: "Ближайшая поддержка" },
      { price: 11.35, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 12.00, label: "Ближайшее сопротивление" },
      { price: 12.30, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT
  },
  {
    instrumentId: "usd-rub",
    ticker: "USD/RUB",
    currentPrice: 81.50,
    previousClose: 81.20,
    change: 0.30,
    changePercent: 0.37,
    currency: "RUB",
    unit: "за 1 USD",
    support: [
      { price: 80.00, label: "Ближайшая поддержка" },
      { price: 78.50, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 83.00, label: "Ближайшее сопротивление" },
      { price: 85.50, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT
  },
  {
    instrumentId: "oil",
    ticker: "Brent",
    currentPrice: 72.40,
    previousClose: 71.85,
    change: 0.55,
    changePercent: 0.77,
    currency: "USD",
    unit: "за баррель",
    support: [
      { price: 70.00, label: "Ближайшая поддержка" },
      { price: 67.50, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 75.00, label: "Ближайшее сопротивление" },
      { price: 78.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "WTI торгуется ~$68.20/барр."
  },
  {
    instrumentId: "gas",
    ticker: "NG",
    currentPrice: 2.85,
    previousClose: 2.78,
    change: 0.07,
    changePercent: 2.52,
    currency: "USD",
    unit: "за MMBtu",
    support: [
      { price: 2.60, label: "Ближайшая поддержка" },
      { price: 2.35, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 3.10, label: "Ближайшее сопротивление" },
      { price: 3.50, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "Сезонность: низкий спрос весна-лето"
  },
  {
    instrumentId: "gold",
    ticker: "XAU/USD",
    currentPrice: 2680.00,
    previousClose: 2665.50,
    change: 14.50,
    changePercent: 0.54,
    currency: "USD",
    unit: "за тр. унцию",
    support: [
      { price: 2620.00, label: "Ближайшая поддержка" },
      { price: 2560.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 2720.00, label: "Ближайшее сопротивление" },
      { price: 2790.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT
  },
  {
    instrumentId: "silver",
    ticker: "XAG/USD",
    currentPrice: 32.50,
    previousClose: 32.10,
    change: 0.40,
    changePercent: 1.25,
    currency: "USD",
    unit: "за тр. унцию",
    support: [
      { price: 31.00, label: "Ближайшая поддержка" },
      { price: 29.50, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 34.00, label: "Ближайшее сопротивление" },
      { price: 36.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT
  },
  {
    instrumentId: "us-stocks",
    ticker: "S&P 500",
    currentPrice: 5820.00,
    previousClose: 5790.00,
    change: 30.00,
    changePercent: 0.52,
    currency: "USD",
    unit: "пунктов",
    support: [
      { price: 5700.00, label: "Ближайшая поддержка" },
      { price: 5550.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 5900.00, label: "Ближайшее сопротивление" },
      { price: 6050.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "NASDAQ ~18 650, Dow ~42 800"
  },
  {
    instrumentId: "ru-stocks",
    ticker: "MOEX",
    currentPrice: 2950.00,
    previousClose: 2935.00,
    change: 15.00,
    changePercent: 0.51,
    currency: "RUB",
    unit: "пунктов",
    support: [
      { price: 2870.00, label: "Ближайшая поддержка" },
      { price: 2780.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 3020.00, label: "Ближайшее сопротивление" },
      { price: 3100.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "Газпром ~168 ₽, Сбер ~310 ₽, Лукойл ~7 450 ₽"
  },
  {
    instrumentId: "imoex",
    ticker: "IMOEX",
    currentPrice: 2950.00,
    previousClose: 2935.00,
    change: 15.00,
    changePercent: 0.51,
    currency: "RUB",
    unit: "пунктов",
    support: [
      { price: 2870.00, label: "Ближайшая поддержка" },
      { price: 2780.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 3020.00, label: "Ближайшее сопротивление" },
      { price: 3100.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "Топ по весу: Сбер, Газпром, Лукойл, Яндекс"
  },
  {
    instrumentId: "rgbi",
    ticker: "RGBI",
    currentPrice: 106.50,
    previousClose: 106.80,
    change: -0.30,
    changePercent: -0.28,
    currency: "RUB",
    unit: "пунктов",
    support: [
      { price: 105.00, label: "Ближайшая поддержка" },
      { price: 103.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 108.00, label: "Ближайшее сопротивление" },
      { price: 110.50, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "Ключевая ставка ЦБ РФ — 16%"
  },
  {
    instrumentId: "crypto",
    ticker: "BTC/USD",
    currentPrice: 95200.00,
    previousClose: 93800.00,
    change: 1400.00,
    changePercent: 1.49,
    currency: "USD",
    unit: "за 1 BTC",
    support: [
      { price: 90000.00, label: "Ближайшая поддержка" },
      { price: 85000.00, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 100000.00, label: "Ближайшее сопротивление" },
      { price: 108000.00, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT,
    note: "ETH ~$3 750, SOL ~$185, BNB ~$620"
  },
  {
    instrumentId: "eur-usd",
    ticker: "EUR/USD",
    currentPrice: 1.0950,
    previousClose: 1.0920,
    change: 0.0030,
    changePercent: 0.27,
    currency: "USD",
    unit: "за 1 EUR",
    support: [
      { price: 1.0850, label: "Ближайшая поддержка" },
      { price: 1.0750, label: "Сильная поддержка" }
    ],
    resistance: [
      { price: 1.1050, label: "Ближайшее сопротивление" },
      { price: 1.1150, label: "Сильное сопротивление" }
    ],
    updatedAt: UPDATED_AT
  }
];

export function findQuoteByInstrumentId(instrumentId: string): InstrumentQuote | undefined {
  return instrumentQuotes.find((q) => q.instrumentId === instrumentId);
}

export function formatQuote(quote: InstrumentQuote): string {
  const sign = quote.change >= 0 ? "+" : "";
  const lines: string[] = [
    `📌 <b>${quote.ticker}</b>: ${quote.currentPrice} ${quote.currency} ${quote.unit}`,
    `${sign}${quote.change} (${sign}${quote.changePercent}%) от пред. закрытия`,
    "",
    "📉 <b>Поддержка:</b>",
    ...quote.support.map((s) => `  • ${s.price} — ${s.label}`),
    "",
    "📈 <b>Сопротивление:</b>",
    ...quote.resistance.map((r) => `  • ${r.price} — ${r.label}`)
  ];

  if (quote.note) {
    lines.push("", `💡 ${quote.note}`);
  }

  lines.push("", `🕐 Обновлено: ${quote.updatedAt}`);

  return lines.join("\n");
}
