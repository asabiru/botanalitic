import Parser from "rss-parser";
import type { NewsProvider, NewsItem } from "./news.interface.js";
import { MarketCache } from "../cache/market-cache.js";

export class RssNewsProvider implements NewsProvider {
  readonly name = "rss-general";
  private parser = new Parser({ timeout: 10_000 });

  constructor(
    private cache: MarketCache,
    private feeds: string[] = [
      "https://www.investing.com/rss/news.rss",
    ],
  ) {}

  async getNews(keywords: string[]): Promise<NewsItem[]> {
    const cacheKey = `rss:${this.name}:${keywords.join(",")}`;
    const cached = this.cache.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    const allItems: NewsItem[] = [];

    for (const feedUrl of this.feeds) {
      try {
        const feed = await this.parser.parseURL(feedUrl);
        const items: NewsItem[] = (feed.items ?? []).map((item) => ({
          title: item.title ?? "",
          link: item.link ?? "",
          source: feed.title ?? feedUrl,
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          snippet: item.contentSnippet?.slice(0, 200),
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`[RSS] Error parsing feed ${feedUrl}:`, err);
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
