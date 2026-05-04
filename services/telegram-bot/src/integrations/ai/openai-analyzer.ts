import { getOpenAIClient } from "./openai-client.js";
import { config } from "../../config.js";
import type { MarketContext } from "../market-data.service.js";
import type { InstrumentCategory } from "../../catalog.js";

export interface AiInsight {
  thesis: string;
  bullishScenario: string;
  neutralScenario: string;
  bearishScenario: string;
  keyDrivers: string[];
  risks: string[];
  recommendation: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  horizon: string;
  confidence: "low" | "medium" | "high";
}

interface AnalyzerInput {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
  marketContext?: MarketContext;
  fundamentalsSummary?: string;
}

/**
 * Calls OpenAI with the aggregated market context and returns a structured
 * AI insight. Returns null whenever OpenAI is not configured or the call fails;
 * callers should fall back to the deterministic template in that case.
 */
export class OpenAIAnalyzer {
  async analyze(input: AnalyzerInput): Promise<AiInsight | null> {
    const client = getOpenAIClient();
    if (!client) return null;

    const prompt = this.buildPrompt(input);

    try {
      const completion = await client.chat.completions.create({
        model: config.OPENAI_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты — старший рыночный аналитик AI Finance. Отвечай ТОЛЬКО валидным JSON в одной строке без комментариев и markdown. Все поля обязательны. Числовые уровни (entry, stopLoss, takeProfit1, takeProfit2) указывай в той же валюте, что и текущая котировка; если данных недостаточно — используй null. Анализ должен быть конкретным, с опорой на переданные числа, без воды и без шаблонов вида «-2%/+3%». Все тексты — на русском языке.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;
      return this.parseInsight(raw);
    } catch (err) {
      console.error("[OpenAIAnalyzer] analyze error:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  private buildPrompt(input: AnalyzerInput): string {
    const { instrument, ticker, investorProfile, marketContext, fundamentalsSummary } = input;
    const ctx = marketContext;
    const lines: string[] = [];

    lines.push(`Инструмент: ${instrument.title} (${instrument.id}).`);
    if (ticker) lines.push(`Тикер: ${ticker}.`);
    if (investorProfile) lines.push(`Профиль инвестора: ${investorProfile}.`);
    lines.push(`Контекст подсказки аналитика: ${instrument.promptHint}`);

    if (ctx?.quote) {
      const q = ctx.quote;
      lines.push("");
      lines.push("Текущая котировка:");
      lines.push(`  цена=${q.price}`);
      lines.push(`  изменение=${q.change} (${q.changePercent}%)`);
      lines.push(`  диапазон_дня=${q.low}–${q.high}`);
      if (q.volume) lines.push(`  объём=${q.volume}`);
    }

    if (ctx?.weeklyChange !== null && ctx?.weeklyChange !== undefined) {
      lines.push(`Изменение за неделю: ${ctx.weeklyChange.toFixed(2)}%`);
    }

    if (ctx?.technicalSummary) {
      lines.push(
        `TradingView технический рейтинг: ${ctx.technicalSummary} (recommend=${ctx.technicalRecommend ?? "n/a"})`,
      );
    }

    if (ctx?.sentiment) {
      lines.push(
        `Сентимент по новостям/соцсетям: label=${ctx.sentiment.label}, score=${ctx.sentiment.score}, выборка=${ctx.sentiment.sampleSize}`,
      );
    }

    if (ctx?.historicalBars && ctx.historicalBars.length > 5) {
      const sorted = [...ctx.historicalBars].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
      const last = sorted.slice(-30);
      const closes = last.map((b) => b.close);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const sma5 = this.sma(closes.slice(-5));
      const sma10 = this.sma(closes.slice(-10));
      const sma20 = this.sma(closes.slice(-20));
      const sma50 = this.sma(sorted.slice(-50).map((b) => b.close));
      const atr = this.atr(sorted.slice(-14));
      lines.push("");
      lines.push("История (последние 30 баров):");
      lines.push(`  диапазон=${min.toFixed(2)}–${max.toFixed(2)}`);
      lines.push(
        `  SMA(5)=${sma5.toFixed(2)} SMA(10)=${sma10.toFixed(2)} SMA(20)=${sma20.toFixed(2)} SMA(50)=${sma50.toFixed(2)}`,
      );
      lines.push(`  ATR(14)=${atr.toFixed(2)}`);
    }

    if (ctx?.news && ctx.news.length > 0) {
      lines.push("");
      lines.push("Свежие новости:");
      ctx.news.slice(0, 7).forEach((n, i) => {
        lines.push(
          `  ${i + 1}. [${n.source}] ${n.title}${n.snippet ? " — " + n.snippet : ""}`,
        );
      });
    }

    if (fundamentalsSummary) {
      lines.push("");
      lines.push("Фундаментальные данные:");
      lines.push(fundamentalsSummary);
    }

    lines.push("");
    lines.push(
      "Сформируй JSON со следующими полями: thesis (1–2 предложения), bullishScenario, neutralScenario, bearishScenario (по одному предложению каждый), keyDrivers (массив 3–5 драйверов), risks (массив 3–5 рисков), recommendation (что делать клиенту), entry (число или null), stopLoss (число или null), takeProfit1 (число или null), takeProfit2 (число или null), horizon ('intraday'/'1-2 недели'/'1-3 месяца' и т.п.), confidence ('low'/'medium'/'high'). Уровни рассчитывай от ATR/волатильности и поддержек/сопротивлений, а не от фиксированных процентов.",
    );

    return lines.join("\n");
  }

  private parseInsight(raw: string): AiInsight | null {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      const match = /\{[\s\S]*\}/.exec(raw);
      if (!match) return null;
      try {
        json = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }

    if (typeof json !== "object" || json === null) return null;
    const o = json as Record<string, unknown>;

    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const num = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };
    const arr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.map((x) => String(x)).filter((x) => x.trim().length > 0)
        : [];
    const conf = str(o.confidence).toLowerCase();
    const confidence: AiInsight["confidence"] =
      conf === "high" || conf === "low" ? conf : "medium";

    const thesis = str(o.thesis);
    if (!thesis) return null;

    return {
      thesis,
      bullishScenario: str(o.bullishScenario) || str(o.bullish_scenario),
      neutralScenario: str(o.neutralScenario) || str(o.neutral_scenario),
      bearishScenario: str(o.bearishScenario) || str(o.bearish_scenario),
      keyDrivers: arr(o.keyDrivers ?? o.key_drivers),
      risks: arr(o.risks),
      recommendation: str(o.recommendation),
      entry: num(o.entry),
      stopLoss: num(o.stopLoss ?? o.stop_loss),
      takeProfit1: num(o.takeProfit1 ?? o.take_profit_1 ?? o.tp1),
      takeProfit2: num(o.takeProfit2 ?? o.take_profit_2 ?? o.tp2),
      horizon: str(o.horizon) || "1-2 недели",
      confidence,
    };
  }

  private sma(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  private atr(
    bars: { high: number; low: number; close: number }[],
  ): number {
    if (bars.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1];
      const cur = bars[i];
      const tr = Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close),
      );
      sum += tr;
    }
    return sum / (bars.length - 1);
  }
}
