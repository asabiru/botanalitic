import { getOpenAIClient } from "../ai/openai-client.js";
import { config } from "../../config.js";
import { MarketCache } from "../cache/market-cache.js";
import type { NewsItem } from "../news/news.interface.js";
import type { SentimentData, SentimentProvider } from "./x-sentiment.provider.js";

/**
 * Sentiment provider that asks GPT to score the tone of recent news headlines
 * for an instrument. Replaces the X.com stub when OPENAI_API_KEY is set.
 *
 * The provider falls back to a lightweight keyword-based heuristic when
 * OpenAI is not configured so consumers always get a meaningful signal
 * (instead of `null` like the original X.com stub).
 */
export class OpenAINewsSentimentProvider implements SentimentProvider {
  readonly name = "openai-news-sentiment";

  constructor(private cache: MarketCache) {}

  async getSentiment(instrument: string): Promise<SentimentData | null> {
    // News-driven sentiment is only meaningful with news context. Callers
    // that have news pass it via getSentimentFromNews(); the bare
    // getSentiment() path is kept for interface compatibility and returns
    // null so the cache layer doesn't poison results with empty data.
    void instrument;
    return null;
  }

  async getSentimentFromNews(
    instrument: string,
    news: NewsItem[],
  ): Promise<SentimentData | null> {
    if (news.length === 0) return null;

    const cacheKey = `sentiment:openai:${instrument}:${this.fingerprint(news)}`;
    const cached = this.cache.get<SentimentData>(cacheKey);
    if (cached) return cached;

    const sample = news.slice(0, 10);
    const result = (await this.scoreWithOpenAI(instrument, sample)) ??
      this.scoreHeuristically(instrument, sample);

    if (result) {
      this.cache.set(cacheKey, result, MarketCache.ttlFor("sentiment"));
    }
    return result;
  }

  private async scoreWithOpenAI(
    instrument: string,
    news: NewsItem[],
  ): Promise<SentimentData | null> {
    const client = getOpenAIClient();
    if (!client) return null;

    const headlines = news
      .map((n, i) => `${i + 1}. [${n.source}] ${n.title}${n.snippet ? " — " + n.snippet : ""}`)
      .join("\n");

    try {
      const completion = await client.chat.completions.create({
        model: config.OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты оцениваешь рыночный сентимент на основе свежих заголовков новостей. Отвечай ТОЛЬКО JSON: {\"score\": число от -1 до 1, \"label\": \"bullish\"|\"bearish\"|\"neutral\", \"rationale\": \"краткое обоснование на русском\"}.",
          },
          {
            role: "user",
            content: `Инструмент: ${instrument}\nНовости:\n${headlines}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = /\{[\s\S]*\}/.exec(raw);
        if (!match) return null;
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return null;
        }
      }

      if (typeof parsed !== "object" || parsed === null) return null;
      const o = parsed as Record<string, unknown>;
      const scoreNum = typeof o.score === "number" ? o.score : Number(o.score);
      if (!Number.isFinite(scoreNum)) return null;

      const score = Math.max(-1, Math.min(1, scoreNum));
      const labelRaw = typeof o.label === "string" ? o.label.toLowerCase() : "";
      const label = this.normalizeLabel(labelRaw, score);

      return {
        instrument,
        score,
        label,
        sampleSize: news.length,
        timestamp: new Date(),
      };
    } catch (err) {
      console.warn(
        "[OpenAINewsSentiment] OpenAI scoring failed, falling back:",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private scoreHeuristically(
    instrument: string,
    news: NewsItem[],
  ): SentimentData {
    const positive = [
      "rise",
      "surge",
      "rally",
      "gain",
      "beat",
      "record",
      "growth",
      "upgrade",
      "buy",
      "strong",
      "boost",
      "outperform",
      "рост",
      "прибыль",
      "укрепил",
      "дивиденд",
      "ралли",
      "побил",
    ];
    const negative = [
      "fall",
      "drop",
      "plunge",
      "loss",
      "miss",
      "downgrade",
      "sell",
      "weak",
      "crash",
      "concern",
      "warning",
      "underperform",
      "падени",
      "обвал",
      "потеря",
      "снижени",
      "санкци",
      "слабый",
    ];

    let score = 0;
    let count = 0;
    for (const item of news) {
      const text = `${item.title} ${item.snippet ?? ""}`.toLowerCase();
      let local = 0;
      for (const w of positive) if (text.includes(w)) local += 1;
      for (const w of negative) if (text.includes(w)) local -= 1;
      score += Math.max(-2, Math.min(2, local));
      count += 1;
    }

    const normalized = count > 0 ? Math.max(-1, Math.min(1, score / (count * 2))) : 0;
    return {
      instrument,
      score: normalized,
      label: this.normalizeLabel("", normalized),
      sampleSize: news.length,
      timestamp: new Date(),
    };
  }

  private normalizeLabel(label: string, score: number): SentimentData["label"] {
    if (label === "bullish" || label === "bearish" || label === "neutral") {
      return label;
    }
    if (score > 0.15) return "bullish";
    if (score < -0.15) return "bearish";
    return "neutral";
  }

  private fingerprint(news: NewsItem[]): string {
    return news
      .slice(0, 5)
      .map((n) => n.title.slice(0, 32))
      .join("|");
  }
}
