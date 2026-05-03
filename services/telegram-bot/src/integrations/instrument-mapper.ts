export type ProviderType = "yahoo" | "moex" | "coingecko" | "cbr";

export interface InstrumentMapping {
  provider: ProviderType;
  defaultSymbol: string;
  needsTicker: boolean;
  newsKeywords: string[];
  tvExchange?: string;
  tvSymbol?: string;
}

const mappings: Record<string, InstrumentMapping> = {
  "cny-rub": {
    provider: "cbr",
    defaultSymbol: "CNY",
    needsTicker: false,
    newsKeywords: ["юань", "cny", "rub", "рубль", "yuan"],
    tvExchange: "MOEX",
    tvSymbol: "CNYRUB_TOM",
  },
  "usd-rub": {
    provider: "cbr",
    defaultSymbol: "USD",
    needsTicker: false,
    newsKeywords: ["доллар", "usd", "rub", "рубль", "dollar"],
    tvExchange: "MOEX",
    tvSymbol: "USDRUB_TOM",
  },
  oil: {
    provider: "yahoo",
    defaultSymbol: "BZ=F",
    needsTicker: false,
    newsKeywords: ["oil", "brent", "wti", "нефть", "crude"],
    tvExchange: "NYMEX",
    tvSymbol: "CL1!",
  },
  gas: {
    provider: "yahoo",
    defaultSymbol: "NG=F",
    needsTicker: false,
    newsKeywords: ["gas", "natural gas", "газ", "henry hub"],
    tvExchange: "NYMEX",
    tvSymbol: "NG1!",
  },
  gold: {
    provider: "yahoo",
    defaultSymbol: "GC=F",
    needsTicker: false,
    newsKeywords: ["gold", "золото", "xau"],
    tvExchange: "COMEX",
    tvSymbol: "GC1!",
  },
  silver: {
    provider: "yahoo",
    defaultSymbol: "SI=F",
    needsTicker: false,
    newsKeywords: ["silver", "серебро", "xag"],
    tvExchange: "COMEX",
    tvSymbol: "SI1!",
  },
  "us-stocks": {
    provider: "yahoo",
    defaultSymbol: "AAPL",
    needsTicker: true,
    newsKeywords: ["stocks", "акции", "earnings"],
    tvExchange: "NASDAQ",
  },
  "ru-stocks": {
    provider: "moex",
    defaultSymbol: "SBER",
    needsTicker: true,
    newsKeywords: ["акции", "мосбиржа", "россия"],
    tvExchange: "MOEX",
  },
  imoex: {
    provider: "moex",
    defaultSymbol: "IMOEX",
    needsTicker: false,
    newsKeywords: ["мосбиржа", "imoex", "индекс", "moex"],
    tvExchange: "MOEX",
    tvSymbol: "IMOEX",
  },
  rgbi: {
    provider: "moex",
    defaultSymbol: "RGBITR",
    needsTicker: false,
    newsKeywords: ["rgbi", "офз", "облигации", "bonds"],
    tvExchange: "MOEX",
    tvSymbol: "RGBI",
  },
  crypto: {
    provider: "coingecko",
    defaultSymbol: "bitcoin",
    needsTicker: true,
    newsKeywords: ["crypto", "bitcoin", "крипто", "btc"],
    tvExchange: "BINANCE",
  },
  "eur-usd": {
    provider: "yahoo",
    defaultSymbol: "EURUSD=X",
    needsTicker: false,
    newsKeywords: ["eur", "usd", "евро", "доллар", "euro", "forex"],
    tvExchange: "FX",
    tvSymbol: "EURUSD",
  },
};

export function getInstrumentMapping(
  instrumentId: string,
): InstrumentMapping | null {
  return mappings[instrumentId] ?? null;
}

export function resolveSymbol(
  instrumentId: string,
  ticker?: string,
): string {
  const mapping = mappings[instrumentId];
  if (!mapping) return ticker ?? "";

  if (mapping.needsTicker && ticker) return ticker;
  return mapping.defaultSymbol;
}

export function getNewsKeywords(instrumentId: string): string[] {
  return mappings[instrumentId]?.newsKeywords ?? [];
}
