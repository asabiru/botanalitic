import type OpenAI from "openai";
import { InstrumentCategory } from "./catalog.js";
import { buildUserPrompt, DISCLAIMER, SYSTEM_PROMPT } from "./ai/prompt-templates.js";
import type { MarketContext } from "./integrations/market-data.service.js";

const TELEGRAM_MSG_LIMIT = 4096;

type AnalysisRequest = {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
  marketContext?: MarketContext;
};

export class AiAnalysisService {
  private openai: OpenAI | null;
  private model: string;
  private maxTokens: number;

  constructor(openai: OpenAI | null, model: string, maxTokens: number) {
    this.openai = openai;
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async generateAnalysis(request: AnalysisRequest): Promise<string[]> {
    let text: string;
    if (this.openai) {
      try {
        text = await this.generateWithOpenAI(request);
      } catch (error) {
        console.error("[AiAnalysisService] OpenAI error, falling back to demo:", error);
        text = this.generateDemo(request);
      }
    } else {
      text = this.generateDemo(request);
    }
    return splitForTelegram(text);
  }

  private async generateWithOpenAI(request: AnalysisRequest): Promise<string> {
    const userPrompt = buildUserPrompt(
      request.instrument,
      request.ticker,
      request.investorProfile
    );

    const response = await this.openai!.chat.completions.create({
      model: this.model,
      max_completion_tokens: this.maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const header = `📊 <b>AI Market View — анализ: ${request.instrument.title}</b>\n\n`;
    return header + content.trim() + DISCLAIMER;
  }

  private generateDemo(request: AnalysisRequest): string {
    const tickerLine = request.ticker
      ? `Тикер клиента: ${request.ticker}`
      : "Тикер не требуется.";
    const profileLine = request.investorProfile
      ? `Профиль клиента: ${request.investorProfile}`
      : "Профиль клиента: не указан.";

    const lines: string[] = [
      `📊 <b>AI Market View — анализ: ${request.instrument.title}</b>`,
      "",
      `Источник идеи анализа: Investing.com, TradingView, Bloomberg, X.com.`,
      tickerLine,
      profileLine,
    ];

    const ctx = request.marketContext;
    if (ctx?.quote) {
      const q = ctx.quote;
      const arrow = q.change >= 0 ? "▲" : "▼";
      lines.push(
        "",
        `<b>📈 Текущая котировка</b>`,
        `Цена: <b>${q.price.toFixed(2)}</b> ${arrow} ${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`,
        `Диапазон дня: ${q.low.toFixed(2)} – ${q.high.toFixed(2)}`,
      );
      if (q.volume) {
        lines.push(`Объём: ${this.formatVolume(q.volume)}`);
      }
      if (ctx.weeklyChange !== null) {
        lines.push(`Изменение за неделю: ${ctx.weeklyChange >= 0 ? "+" : ""}${ctx.weeklyChange.toFixed(2)}%`);
      }
    }

    if (ctx?.technicalSummary) {
      const labels: Record<string, string> = {
        strong_buy: "🟢 Активно покупать",
        buy: "🟢 Покупать",
        neutral: "🟡 Нейтрально",
        sell: "🔴 Продавать",
        strong_sell: "🔴 Активно продавать",
      };
      lines.push(
        "",
        `<b>📊 Техническая сводка</b>`,
        `TradingView: ${labels[ctx.technicalSummary] ?? ctx.technicalSummary}`,
      );
    }

    lines.push(
      "",
      "<b>1. Обзор рынка</b>",
      "Рынок сохраняет умеренную волатильность, а ключевым драйвером выступают новости по ставкам, макростатистика и технические уровни.",
      "",
      "<b>2. Ключевые уровни</b>",
      "• Поддержка: определяется на основе технического анализа",
      "• Сопротивление: определяется на основе технического анализа",
      "",
      "<b>3. Сценарии</b>",
      "• <b>Позитивный:</b> пробой ключевого сопротивления и закрепление выше него.",
      "• <b>Нейтральный:</b> консолидация в диапазоне и ожидание нового драйвера.",
      "• <b>Негативный:</b> пробой поддержки и ускорение снижения.",
      "",
      "<b>4. Риски</b>",
      "Высокая волатильность, внезапные новости, изменение ожиданий по ставкам, геополитика.",
      "",
      "<b>5. Идея для клиента</b>",
      `${request.instrument.promptHint} Добавь понятные уровни входа, отмены сценария и горизонты.`,
    );

    if (ctx?.news && ctx.news.length > 0) {
      lines.push("", "<b>📰 Последние новости</b>");
      for (const n of ctx.news.slice(0, 3)) {
        lines.push(`• <a href="${this.escapeHtml(n.link)}">${this.escapeHtml(n.title)}</a> (${this.escapeHtml(n.source)})`);
      }
    }

    lines.push(
      "",
      DISCLAIMER,
    );

    return lines.join("\n");
  }

  private formatVolume(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

const HTML_TAGS = ["b", "i", "u", "code", "pre"] as const;
const MAX_CLOSING_RESERVE = HTML_TAGS.reduce((sum, t) => sum + t.length + 3, 0);

function getOpenTags(text: string): string[] {
  const stack: string[] = [];
  const combined = new RegExp(`<(/?)\\b(${HTML_TAGS.join("|")})\\b>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    const isClose = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (isClose) {
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1) stack.splice(idx, 1);
    } else {
      stack.push(tag);
    }
  }
  return stack;
}

function splitForTelegram(text: string): string[] {
  if (text.length <= TELEGRAM_MSG_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  let inheritedOpenTags: string[] = [];

  while (remaining.length > 0) {
    const prefix = inheritedOpenTags.map((t) => `<${t}>`).join("");
    const available = TELEGRAM_MSG_LIMIT - prefix.length - MAX_CLOSING_RESERVE;

    if (prefix.length + remaining.length <= TELEGRAM_MSG_LIMIT) {
      chunks.push(prefix + remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n\n", available);
    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf("\n", available);
    }
    if (splitAt <= 0) {
      splitAt = available;
    }

    const rawChunk = remaining.slice(0, splitAt);
    const openTags = getOpenTags(prefix + rawChunk);
    const closingSuffix = openTags
      .slice()
      .reverse()
      .map((t) => `</${t}>`)
      .join("");

    chunks.push(prefix + rawChunk + closingSuffix);
    inheritedOpenTags = openTags;
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
  }

  return chunks;
}
