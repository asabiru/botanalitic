import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketCache } from "../integrations/cache/market-cache.js";

const mockTweets = [
  {
    id: "1",
    text: "Gold is rallying, strong buy signal! Bullish breakout above resistance. #gold",
    username: "analyst1",
    likes: 150,
    retweets: 30,
    views: 5000,
  },
  {
    id: "2",
    text: "Gold prices show upside potential, great opportunity for long positions.",
    username: "trader2",
    likes: 80,
    retweets: 15,
    views: 2000,
  },
  {
    id: "3",
    text: "Золото под давлением, риск коррекции. Возможно падение к поддержке.",
    username: "ru_analyst",
    likes: 45,
    retweets: 10,
    views: 1500,
  },
  {
    id: "4",
    text: "Market update: gold steady at current levels, neutral outlook.",
    username: "markets",
    likes: 200,
    retweets: 50,
    views: 10000,
  },
];

vi.mock("@the-convocation/twitter-scraper", () => {
  class MockScraper {
    async isLoggedIn() { return false; }
    async login() { return; }
    async setCookies() { return; }
    async *getTweets() {
      for (const tweet of mockTweets) {
        yield tweet;
      }
    }
    async *searchTweets() {
      for (const tweet of mockTweets) {
        yield tweet;
      }
    }
  }

  return {
    Scraper: MockScraper,
    SearchMode: { Top: 0, Latest: 1 },
  };
});

describe("XSentimentProvider", () => {
  let provider: Awaited<typeof import("../integrations/sentiment/x-sentiment.provider.js")>["XSentimentProvider"];
  let cache: MarketCache;

  beforeEach(async () => {
    cache = new MarketCache();
    const mod = await import("../integrations/sentiment/x-sentiment.provider.js");
    provider = mod.XSentimentProvider;
  });

  it("returns sentiment data for a valid instrument", async () => {
    const instance = new provider(cache);
    const result = await instance.getSentiment("gold");

    expect(result).not.toBeNull();
    expect(result!.instrument).toBe("gold");
    expect(result!.sampleSize).toBeGreaterThan(0);
    expect(["bullish", "bearish", "neutral"]).toContain(result!.label);
    expect(typeof result!.score).toBe("number");
    expect(result!.timestamp).toBeInstanceOf(Date);
  });

  it("returns tweet samples", async () => {
    const instance = new provider(cache);
    const result = await instance.getSentiment("gold");

    expect(result).not.toBeNull();
    expect(result!.tweetSamples).toBeDefined();
    expect(result!.tweetSamples.length).toBeGreaterThan(0);
    expect(result!.tweetSamples[0].username).toBeDefined();
    expect(result!.tweetSamples[0].text).toBeDefined();
  });

  it("caches results", async () => {
    const instance = new provider(cache);
    const result1 = await instance.getSentiment("gold");
    const result2 = await instance.getSentiment("gold");

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.timestamp.getTime()).toBe(result2!.timestamp.getTime());
  });

  it("returns null for unknown instrument without search queries", async () => {
    const instance = new provider(cache);
    const result = await instance.getSentiment("unknown-instrument-xyz");
    expect(result).toBeNull();
  });

  it("sentiment score is between -100 and 100", async () => {
    const instance = new provider(cache);
    const result = await instance.getSentiment("gold");

    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(-100);
    expect(result!.score).toBeLessThanOrEqual(100);
  });

  it("tweet samples are sorted by engagement", async () => {
    const instance = new provider(cache);
    const result = await instance.getSentiment("gold");

    expect(result).not.toBeNull();
    const samples = result!.tweetSamples;
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1].likes + samples[i - 1].retweets;
      const curr = samples[i].likes + samples[i].retweets;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
