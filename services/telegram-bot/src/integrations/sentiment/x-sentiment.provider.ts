import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import type { Tweet } from "@the-convocation/twitter-scraper";
import { MarketCache } from "../cache/market-cache.js";

export interface SentimentData {
  instrument: string;
  score: number;
  label: "bullish" | "bearish" | "neutral";
  sampleSize: number;
  tweetSamples: TweetSample[];
  timestamp: Date;
}

export interface TweetSample {
  text: string;
  username: string;
  likes: number;
  retweets: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface SentimentProvider {
  getSentiment(instrument: string): Promise<SentimentData | null>;
}

const BULLISH_KEYWORDS = [
  "buy", "long", "bullish", "moon", "pump", "rally", "breakout",
  "undervalued", "opportunity", "рост", "покупать", "бычий",
  "growth", "upgrade", "outperform", "upside", "recovery",
  "accumulate", "strong buy", "target raise", "beat expectations",
  "покупка", "лонг", "разворот вверх", "пробой вверх",
];

const BEARISH_KEYWORDS = [
  "sell", "short", "bearish", "dump", "crash", "correction",
  "overvalued", "recession", "падение", "продавать", "медвежий",
  "downgrade", "underperform", "downside", "decline", "risk",
  "bubble", "strong sell", "target cut", "miss expectations",
  "продажа", "шорт", "разворот вниз", "пробой вниз",
];

const INSTRUMENT_SEARCH_QUERIES: Record<string, string[]> = {
  "cny-rub": ["CNYRUB", "юань рубль", "yuan ruble"],
  "usd-rub": ["USDRUB", "доллар рубль", "dollar ruble"],
  oil: ["$CL_F", "crude oil", "brent oil", "#oil", "нефть"],
  gas: ["natural gas", "$NG_F", "#natgas", "газ"],
  gold: ["$GC_F", "#gold", "gold price", "золото"],
  silver: ["$SI_F", "#silver", "silver price", "серебро"],
  "us-stocks": ["$SPY", "$QQQ", "stock market", "S&P 500"],
  "ru-stocks": ["MOEX", "мосбиржа", "российские акции"],
  imoex: ["IMOEX", "индекс мосбиржи", "MOEX index"],
  rgbi: ["RGBI", "ОФЗ", "Russian bonds", "облигации"],
  crypto: ["#bitcoin", "$BTC", "#crypto", "cryptocurrency"],
  "eur-usd": ["EURUSD", "euro dollar", "#forex"],
};

const FINANCIAL_ACCOUNTS = [
  "markets", "business", "ReutersBiz", "ABORONKOV",
  "markaboronkov", "MarketWatch", "business",
  "YahooFinance", "Investingcom", "ForexLive",
];

const MAX_TWEETS_PER_SEARCH = 20;
const MAX_TIMELINE_TWEETS = 10;

export class XSentimentProvider implements SentimentProvider {
  readonly name = "x-sentiment";
  private scraper: Scraper;
  private initialized = false;
  private loginAttempted = false;

  constructor(private cache: MarketCache) {
    this.scraper = new Scraper();
  }

  async getSentiment(instrument: string): Promise<SentimentData | null> {
    const cacheKey = `sentiment:x:${instrument}`;
    const cached = this.cache.get<SentimentData>(cacheKey);
    if (cached) return cached;

    try {
      const tweets = await this.collectTweets(instrument);
      if (tweets.length === 0) return null;

      const result = this.analyzeSentiment(instrument, tweets);
      this.cache.set(cacheKey, result, MarketCache.ttlFor("sentiment"));
      return result;
    } catch (err) {
      console.error(`[X-Sentiment] Error for ${instrument}:`, err);
      return null;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (this.loginAttempted) return;
    this.loginAttempted = true;

    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;
    const cookies = process.env.TWITTER_COOKIES;

    if (cookies) {
      try {
        const parsedCookies = JSON.parse(cookies) as string[];
        await this.scraper.setCookies(parsedCookies);
        console.log("[X-Sentiment] Authenticated via cookies");
        return;
      } catch (err) {
        console.error("[X-Sentiment] Cookie auth failed:", err);
      }
    }

    if (username && password) {
      try {
        await this.scraper.login(username, password, email);
        console.log("[X-Sentiment] Authenticated via login");
      } catch (err) {
        console.error("[X-Sentiment] Login failed, using guest mode:", err);
      }
    }
  }

  private async collectTweets(instrument: string): Promise<Tweet[]> {
    await this.ensureInitialized();

    const allTweets: Tweet[] = [];

    const loggedIn = await this.isLoggedIn();
    if (loggedIn) {
      const searchTweets = await this.searchByQuery(instrument);
      allTweets.push(...searchTweets);
    }

    if (allTweets.length < 5) {
      const timelineTweets = await this.fetchFromTimelines(instrument);
      allTweets.push(...timelineTweets);
    }

    const seen = new Set<string>();
    return allTweets.filter((t) => {
      const id = t.id ?? t.text;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private async isLoggedIn(): Promise<boolean> {
    try {
      return await this.scraper.isLoggedIn();
    } catch {
      return false;
    }
  }

  private async searchByQuery(instrument: string): Promise<Tweet[]> {
    const queries = INSTRUMENT_SEARCH_QUERIES[instrument];
    if (!queries || queries.length === 0) return [];

    const searchQuery = queries.join(" OR ");
    const tweets: Tweet[] = [];

    try {
      const generator = this.scraper.searchTweets(
        searchQuery,
        MAX_TWEETS_PER_SEARCH,
        SearchMode.Top,
      );

      for await (const tweet of generator) {
        if (tweet.text) {
          tweets.push(tweet);
        }
        if (tweets.length >= MAX_TWEETS_PER_SEARCH) break;
      }
    } catch (err) {
      console.error(`[X-Sentiment] Search failed for ${instrument}:`, err);
    }

    return tweets;
  }

  private async fetchFromTimelines(instrument: string): Promise<Tweet[]> {
    const keywords = INSTRUMENT_SEARCH_QUERIES[instrument] ?? [];
    if (keywords.length === 0) return [];

    const lowerKw = keywords.map((k) => k.toLowerCase());
    const tweets: Tweet[] = [];

    for (const account of FINANCIAL_ACCOUNTS.slice(0, 3)) {
      if (tweets.length >= MAX_TIMELINE_TWEETS) break;

      try {
        const generator = this.scraper.getTweets(account, 50);
        for await (const tweet of generator) {
          if (!tweet.text) continue;
          const text = tweet.text.toLowerCase();
          if (lowerKw.some((kw) => text.includes(kw.toLowerCase()))) {
            tweets.push(tweet);
          }
          if (tweets.length >= MAX_TIMELINE_TWEETS) break;
        }
      } catch (err) {
        console.error(`[X-Sentiment] Timeline fetch failed for @${account}:`, err);
      }
    }

    return tweets;
  }

  private analyzeSentiment(instrument: string, tweets: Tweet[]): SentimentData {
    let bullishScore = 0;
    let bearishScore = 0;
    const samples: TweetSample[] = [];

    for (const tweet of tweets) {
      const text = tweet.text ?? "";
      const lower = text.toLowerCase();

      const weight = this.tweetWeight(tweet);
      let tweetBullish = 0;
      let tweetBearish = 0;

      for (const kw of BULLISH_KEYWORDS) {
        if (lower.includes(kw)) tweetBullish++;
      }
      for (const kw of BEARISH_KEYWORDS) {
        if (lower.includes(kw)) tweetBearish++;
      }

      bullishScore += tweetBullish * weight;
      bearishScore += tweetBearish * weight;

      let tweetLabel: "bullish" | "bearish" | "neutral" = "neutral";
      if (tweetBullish > tweetBearish) tweetLabel = "bullish";
      else if (tweetBearish > tweetBullish) tweetLabel = "bearish";

      samples.push({
        text: text.slice(0, 280),
        username: tweet.username ?? "unknown",
        likes: tweet.likes ?? 0,
        retweets: tweet.retweets ?? 0,
        sentiment: tweetLabel,
      });
    }

    const total = bullishScore + bearishScore;
    let score = 0;
    if (total > 0) {
      score = ((bullishScore - bearishScore) / total) * 100;
    }

    let label: "bullish" | "bearish" | "neutral" = "neutral";
    if (score > 15) label = "bullish";
    else if (score < -15) label = "bearish";

    samples.sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets));

    return {
      instrument,
      score: Math.round(score * 100) / 100,
      label,
      sampleSize: tweets.length,
      tweetSamples: samples.slice(0, 5),
      timestamp: new Date(),
    };
  }

  private tweetWeight(tweet: Tweet): number {
    const likes = tweet.likes ?? 0;
    const retweets = tweet.retweets ?? 0;
    const views = tweet.views ?? 0;
    const engagement = likes + retweets * 2 + views * 0.01;
    return 1 + Math.log10(Math.max(engagement, 1));
  }
}
