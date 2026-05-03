import type OpenAI from "openai";
import { InstrumentCategory } from "./catalog.js";
import { buildUserPrompt, DISCLAIMER, SYSTEM_PROMPT } from "./ai/prompt-templates.js";

const TELEGRAM_MSG_LIMIT = 4096;

type AnalysisRequest = {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
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
      max_tokens: this.maxTokens,
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

    return [
      `📊 <b>AI Market View — анализ: ${request.instrument.title}</b>`,
      "",
      `Источник идеи анализа: Investing.com, TradingView, Bloomberg, X.com.`,
      tickerLine,
      profileLine,
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
      DISCLAIMER
    ].join("\n");
  }
}

function splitForTelegram(text: string): string[] {
  if (text.length <= TELEGRAM_MSG_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MSG_LIMIT) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n\n", TELEGRAM_MSG_LIMIT);
    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf("\n", TELEGRAM_MSG_LIMIT);
    }
    if (splitAt <= 0) {
      splitAt = TELEGRAM_MSG_LIMIT;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
  }

  return chunks;
}
