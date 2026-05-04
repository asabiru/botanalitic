import Parser from "rss-parser";
import type { NewsProvider, NewsItem } from "./news.interface.js";
import { MarketCache } from "../cache/market-cache.js";

const BLOOMBERG_FEED = "https://feeds.bloomberg.com/markets/news.rss";

export class BloombergRssProvider implements NewsProvider {
  readonly name = "bloomberg-rss";
  private parser = new Parser({ timeout: 10_000 });

  constructor(private cache: MarketCache) {}

  async getNews(keywords: string[]): Promise<NewsItem[]> {
    const cacheKey = `bloomberg:${keywords.join(",")}`;
    const cached = this.cache.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const feed = await this.parser.parseURL(BLOOMBERG_FEED);
      let items: NewsItem[] = (feed.items ?? []).map((item) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        source: "Bloomberg",
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        snippet: item.contentSnippet?.slice(0, 200),
      }));

      items = this.filterByKeywords(items, keywords);
      items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      const top = items.slice(0, 5);

      this.cache.set(cacheKey, top, MarketCache.ttlFor("news"));
      return top;
    } catch (err) {
      console.error(`[Bloomberg] Error parsing RSS:`, err);
      return [];
    }
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
