import type {
  MarketQuote,
  HistoricalBar,
  TechnicalSummary,
  Fundamentals,
} from "./market-data/provider.interface.js";
import type { NewsItem } from "./news/news.interface.js";
import type { SentimentData } from "./sentiment/x-sentiment.provider.js";
import type { TechnicalAnalysisResult } from "./market-data/tradingview.provider.js";
import type { MarketDataProvider } from "./market-data/provider.interface.js";
import { MarketCache } from "./cache/market-cache.js";
import { createAllProviders } from "./market-data/index.js";
import type { ProviderType } from "./instrument-mapper.js";
import { TradingViewProvider } from "./market-data/tradingview.provider.js";
import { RssNewsProvider } from "./news/rss-news.provider.js";
import { InvestingRssProvider } from "./news/investing-rss.provider.js";
import { BloombergRssProvider } from "./news/bloomberg-rss.provider.js";
import { XSentimentProvider } from "./sentiment/x-sentiment.provider.js";
import { OpenAINewsSentimentProvider } from "./sentiment/openai-news-sentiment.provider.js";
import { isOpenAIConfigured } from "./ai/openai-client.js";
import {
  getInstrumentMapping,
  resolveSymbol,
  getNewsKeywords,
} from "./instrument-mapper.js";

export interface MarketContext {
  quote: MarketQuote | null;
  weeklyChange: number | null;
  historicalBars: HistoricalBar[];
  news: NewsItem[];
  technicalSummary: TechnicalSummary | null;
  technicalRecommend: number | null;
  sentiment: SentimentData | null;
  fundamentals: Fundamentals | null;
  fetchedAt: Date;
}

export class MarketDataService {
  private cache = new MarketCache();
  private providers: Record<ProviderType, MarketDataProvider>;
  private tradingView: TradingViewProvider;
  private rssNews: RssNewsProvider;
  private investingRss: InvestingRssProvider;
  private bloombergRss: BloombergRssProvider;
  private xSentiment: XSentimentProvider;
  private openAiSentiment: OpenAINewsSentimentProvider;

  constructor() {
    this.providers = createAllProviders(this.cache);
    this.tradingView = new TradingViewProvider(this.cache);
    this.rssNews = new RssNewsProvider(this.cache);
    this.investingRss = new InvestingRssProvider(this.cache);
    this.bloombergRss = new BloombergRssProvider(this.cache);
    this.xSentiment = new XSentimentProvider(this.cache);
    this.openAiSentiment = new OpenAINewsSentimentProvider(this.cache);
  }

  async getMarketContext(
    instrumentId: string,
    ticker?: string,
  ): Promise<MarketContext> {
    const mapping = getInstrumentMapping(instrumentId);
    if (!mapping) {
      return this.emptyContext();
    }

    const symbol = resolveSymbol(instrumentId, ticker);
    const provider = this.providers[mapping.provider];
    const keywords = getNewsKeywords(instrumentId);

    const [quote, historicalBars, news, technical, fallbackSentiment, fundamentals] =
      await Promise.all([
        provider.getQuote(symbol),
        provider.getHistoricalData(symbol, "1m"),
        this.aggregateNews(keywords, instrumentId),
        this.fetchTechnical(mapping, ticker),
        this.xSentiment.getSentiment(instrumentId),
        provider.getFundamentals?.(symbol) ?? Promise.resolve(null),
      ]);

    const sentiment = isOpenAIConfigured() && news.length > 0
      ? (await this.openAiSentiment.getSentimentFromNews(instrumentId, news)) ?? fallbackSentiment
      : fallbackSentiment;

    const weeklyChange = this.calcWeeklyChange(historicalBars, quote);

    return {
      quote,
      weeklyChange,
      historicalBars,
      news,
      technicalSummary: technical?.summary ?? null,
      technicalRecommend: technical?.recommend ?? null,
      sentiment,
      fundamentals,
      fetchedAt: new Date(),
    };
  }

  private async aggregateNews(
    keywords: string[],
    instrumentId: string,
  ): Promise<NewsItem[]> {
    const [rss, investing, bloomberg] = await Promise.all([
      this.rssNews.getNews(keywords).catch(() => [] as NewsItem[]),
      this.investingRss
        .getNews(keywords, instrumentId)
        .catch(() => [] as NewsItem[]),
      this.bloombergRss.getNews(keywords).catch(() => [] as NewsItem[]),
    ]);

    const all = [...rss, ...investing, ...bloomberg];

    const seen = new Set<string>();
    const unique = all.filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    return unique.slice(0, 5);
  }

  private async fetchTechnical(
    mapping: {
      tvExchange?: string;
      tvSymbol?: string;
      needsTicker: boolean;
    },
    ticker?: string,
  ): Promise<TechnicalAnalysisResult | null> {
    const tvSymbol =
      mapping.tvSymbol ?? (mapping.needsTicker && ticker ? ticker : null);
    if (!tvSymbol) return null;
    return this.tradingView.getTechnicalSummary(tvSymbol, mapping.tvExchange);
  }

  private calcWeeklyChange(
    bars: HistoricalBar[],
    quote: MarketQuote | null,
  ): number | null {
    if (!quote || bars.length === 0) return null;

    const targetTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let closest = bars[0];
    let closestDiff = Math.abs(closest.date.getTime() - targetTime);

    for (const bar of bars) {
      const diff = Math.abs(bar.date.getTime() - targetTime);
      if (diff < closestDiff) {
        closest = bar;
        closestDiff = diff;
      }
    }

    if (!closest.close) return null;
    return ((quote.price - closest.close) / closest.close) * 100;
  }

  private emptyContext(): MarketContext {
    return {
      fundamentals: null,
      quote: null,
      weeklyChange: null,
      historicalBars: [],
      news: [],
      technicalSummary: null,
      technicalRecommend: null,
      sentiment: null,
      fetchedAt: new Date(),
    };
  }
}
