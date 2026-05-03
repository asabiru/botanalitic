import { InstrumentCategory } from "./catalog.js";
import type { MarketContext } from "./integrations/market-data.service.js";

type AnalysisRequest = {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
  marketContext?: MarketContext;
};

export class AiAnalysisService {
  async generateAnalysis(request: AnalysisRequest): Promise<string> {
    const tickerLine = request.ticker ? `Тикер клиента: ${request.ticker}` : "Тикер не требуется.";
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
      "<b>1. Базовый сценарий</b>",
      "Рынок сохраняет умеренную волатильность, а ключевым драйвером выступают новости по ставкам, макростатистика и технические уровни.",
      "",
      "<b>2. Что смотрим</b>",
      "• направление основного тренда",
      "• уровни поддержки/сопротивления",
      "• объёмы и импульс",
      "• новостной фон и риск-события",
      "",
      "<b>3. Сценарии</b>",
      "• Позитивный: пробой ключевого сопротивления и закрепление выше него.",
      "• Нейтральный: консолидация в диапазоне и ожидание нового драйвера.",
      "• Негативный: пробой поддержки и ускорение снижения.",
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
        lines.push(`• <a href="${n.link}">${this.escapeHtml(n.title)}</a> (${n.source})`);
      }
    }

    lines.push(
      "",
      "⚠️ Материал носит информационный характер и не является индивидуальной инвестиционной рекомендацией.",
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
      .replace(/>/g, "&gt;");
  }
}
