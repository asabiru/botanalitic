import Parser from "rss-parser";
import type { NewsProvider, NewsItem } from "./news.interface.js";
import { MarketCache } from "../cache/market-cache.js";

const INVESTING_FEEDS: Record<string, string> = {
  general: "https://www.investing.com/rss/news.rss",
  forex: "https://www.investing.com/rss/news_14.rss",
  commodities: "https://www.investing.com/rss/news_25.rss",
  stocks: "https://www.investing.com/rss/news_2.rss",
};

const CATEGORY_MAP: Record<string, string[]> = {
  "cny-rub": ["forex"],
  "usd-rub": ["forex"],
  "eur-usd": ["forex"],
  oil: ["commodities"],
  gas: ["commodities"],
  gold: ["commodities"],
  silver: ["commodities"],
  "us-stocks": ["stocks"],
  "ru-stocks": ["stocks"],
  imoex: ["stocks"],
  rgbi: ["stocks"],
  crypto: ["general"],
};

export class InvestingRssProvider implements NewsProvider {
  readonly name = "investing-rss";
  private parser = new Parser({ timeout: 10_000 });

  constructor(private cache: MarketCache) {}

  async getNews(
    keywords: string[],
    instrumentId?: string,
  ): Promise<NewsItem[]> {
    const categories = instrumentId
      ? CATEGORY_MAP[instrumentId] ?? ["general"]
      : ["general"];

    const feedUrls = categories.map(
      (cat) => INVESTING_FEEDS[cat] ?? INVESTING_FEEDS["general"],
    );
    const uniqueUrls = [...new Set(feedUrls)];

    const cacheKey = `investing:${uniqueUrls.join(",")}:${keywords.join(",")}`;
    const cached = this.cache.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    const allItems: NewsItem[] = [];

    for (const url of uniqueUrls) {
      try {
        const feed = await this.parser.parseURL(url);
        const items: NewsItem[] = (feed.items ?? []).map((item) => ({
          title: item.title ?? "",
          link: item.link ?? "",
          source: "Investing.com",
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          snippet: item.contentSnippet?.slice(0, 200),
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`[InvestingRSS] Error parsing ${url}:`, err);
      }
    }

    const filtered = this.filterByKeywords(allItems, keywords);
    filtered.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    const top = filtered.slice(0, 5);

    this.cache.set(cacheKey, top, MarketCache.ttlFor("news"));
    return top;
  }

  private filterByKeywords(
    items: NewsItem[],
    keywords: string[],
  ): NewsItem[] {
    if (keywords.length === 0) return items;

    const lowerKw = keywords.map((k) => k.toLowerCase());
    return items.filter((item) => {
      const text = `${item.title} ${item.snippet ?? ""}`.toLowerCase();
      return lowerKw.some((kw) => text.includes(kw));
    });
  }
}
