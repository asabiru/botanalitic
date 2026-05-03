import { MarketCache } from "../cache/market-cache.js";
import type { MarketDataProvider } from "./provider.interface.js";
import { YahooFinanceProvider } from "./yahoo-finance.provider.js";
import { MoexProvider } from "./moex.provider.js";
import { CoinGeckoProvider } from "./coingecko.provider.js";
import { CbrProvider } from "./cbr.provider.js";
import type { ProviderType } from "../instrument-mapper.js";

export function createProvider(
  type: ProviderType,
  cache: MarketCache,
): MarketDataProvider {
  switch (type) {
    case "yahoo":
      return new YahooFinanceProvider(cache);
    case "moex":
      return new MoexProvider(cache);
    case "coingecko":
      return new CoinGeckoProvider(cache);
    case "cbr":
      return new CbrProvider(cache);
  }
}

export function createAllProviders(
  cache: MarketCache,
): Record<ProviderType, MarketDataProvider> {
  return {
    yahoo: new YahooFinanceProvider(cache),
    moex: new MoexProvider(cache),
    coingecko: new CoinGeckoProvider(cache),
    cbr: new CbrProvider(cache),
  };
}
