import { InstrumentCategory } from "./catalog.js";
import type { MarketContext } from "./integrations/market-data.service.js";
import { generatePriceChart, generateVolumeChart } from "./integrations/chart/chart-generator.js";

type AnalysisRequest = {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
  marketContext?: MarketContext;
};

export interface AnalysisResult {
  text: string;
  charts: Buffer[];
}

export class AiAnalysisService {
  async generateAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    const tickerLine = request.ticker ? `Тикер: ${request.ticker}` : "";
    const profileLine = request.investorProfile
      ? `Профиль инвестора: ${request.investorProfile}`
      : "";

    const lines: string[] = [
      `📊 <b>AI Finance — полный аналитический отчёт</b>`,
      `<b>${request.instrument.title}</b>`,
      "",
      `Источники данных: Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ, TradingView, Investing.com, Bloomberg, X.com`,
      `Дата отчёта: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`,
    ];

    if (tickerLine) lines.push(tickerLine);
    if (profileLine) lines.push(profileLine);

    const ctx = request.marketContext;

    // === SECTION 1: Current Quote ===
    if (ctx?.quote) {
      const q = ctx.quote;
      const arrow = q.change >= 0 ? "▲" : "▼";
      const sign = q.change >= 0 ? "+" : "";

      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>📈 1. ТЕКУЩАЯ КОТИРОВКА</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
        `Цена: <b>${q.price.toFixed(2)}</b> ${arrow} ${sign}${q.change.toFixed(2)} (${sign}${q.changePercent.toFixed(2)}%)`,
        `Диапазон дня: ${q.low.toFixed(2)} – ${q.high.toFixed(2)}`,
      );

      if (q.volume) {
        lines.push(`Объём торгов: ${this.formatVolume(q.volume)}`);
      }

      if (ctx.weeklyChange !== null) {
        const ws = ctx.weeklyChange >= 0 ? "+" : "";
        lines.push(`Изменение за неделю: ${ws}${ctx.weeklyChange.toFixed(2)}%`);
      }

      // Key levels based on daily range
      const range = q.high - q.low;
      if (range > 0) {
        const pivotPoint = (q.high + q.low + q.price) / 3;
        const s1 = 2 * pivotPoint - q.high;
        const r1 = 2 * pivotPoint - q.low;
        const s2 = pivotPoint - range;
        const r2 = pivotPoint + range;

        lines.push(
          "",
          `<b>Ключевые уровни (Pivot Points):</b>`,
          `  Pivot: ${pivotPoint.toFixed(2)}`,
          `  R2: ${r2.toFixed(2)} | R1: ${r1.toFixed(2)}`,
          `  S1: ${s1.toFixed(2)} | S2: ${s2.toFixed(2)}`,
        );
      }
    }

    // === SECTION 2: Technical Analysis ===
    if (ctx?.technicalSummary) {
      const labels: Record<string, string> = {
        strong_buy: "АКТИВНО ПОКУПАТЬ",
        buy: "ПОКУПАТЬ",
        neutral: "НЕЙТРАЛЬНО",
        sell: "ПРОДАВАТЬ",
        strong_sell: "АКТИВНО ПРОДАВАТЬ",
      };
      const emoji: Record<string, string> = {
        strong_buy: "🟢🟢",
        buy: "🟢",
        neutral: "🟡",
        sell: "🔴",
        strong_sell: "🔴🔴",
      };
      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>📊 2. ТЕХНИЧЕСКАЯ СВОДКА</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
        `TradingView: ${emoji[ctx.technicalSummary] ?? ""} <b>${labels[ctx.technicalSummary] ?? ctx.technicalSummary}</b>`,
      );

      if (ctx.technicalRecommend !== null) {
        lines.push(`Индекс рекомендации: ${ctx.technicalRecommend.toFixed(3)} (шкала от -1 до +1)`);
      }
    }

    // === SECTION 3: Sentiment ===
    if (ctx?.sentiment) {
      const sentimentLabels: Record<string, string> = {
        bullish: "ПОЗИТИВНЫЙ (бычий)",
        bearish: "НЕГАТИВНЫЙ (медвежий)",
        neutral: "НЕЙТРАЛЬНЫЙ",
      };
      const sentimentEmoji: Record<string, string> = {
        bullish: "📈",
        bearish: "📉",
        neutral: "➡️",
      };
      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>🐦 3. СЕНТИМЕНТ-АНАЛИЗ (X.com)</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
        `${sentimentEmoji[ctx.sentiment.label] ?? ""} Тональность: <b>${sentimentLabels[ctx.sentiment.label] ?? ctx.sentiment.label}</b>`,
        `Оценка: ${ctx.sentiment.score.toFixed(2)} (шкала -1..+1)`,
        `Размер выборки: ${ctx.sentiment.sampleSize} публикаций`,
      );
    }

    // === SECTION 4: Historical Analysis ===
    if (ctx?.historicalBars && ctx.historicalBars.length > 5) {
      const bars = ctx.historicalBars;
      const sorted = [...bars].sort((a, b) => a.date.getTime() - b.date.getTime());
      const last5 = sorted.slice(-5);
      const last10 = sorted.slice(-10);
      const last20 = sorted.slice(-20);
      const last50 = sorted.slice(-50);

      const avgVolume5 = last5.reduce((s, b) => s + b.volume, 0) / last5.length;
      const avgVolume20 = last20.length > 0 ? last20.reduce((s, b) => s + b.volume, 0) / last20.length : avgVolume5;

      const maxHigh = Math.max(...sorted.map((b) => b.high));
      const minLow = Math.min(...sorted.map((b) => b.low));
      const volatility = ((maxHigh - minLow) / minLow) * 100;

      const sma5 = last5.reduce((s, b) => s + b.close, 0) / last5.length;
      const sma10 = last10.length >= 10 ? last10.reduce((s, b) => s + b.close, 0) / last10.length : sma5;
      const sma20 = last20.length >= 20 ? last20.reduce((s, b) => s + b.close, 0) / last20.length : sma10;
      const sma50 = last50.length >= 50 ? last50.reduce((s, b) => s + b.close, 0) / last50.length : sma20;

      const shortTrend = sma5 > sma10 ? "восходящий" : sma5 < sma10 ? "нисходящий" : "боковой";
      const midTrend = sma10 > sma20 ? "восходящий" : sma10 < sma20 ? "нисходящий" : "боковой";
      const longTrend = sma20 > sma50 ? "восходящий" : sma20 < sma50 ? "нисходящий" : "боковой";

      const { sharpe, sortino, maxDrawdown, annualReturn } = this.computeRiskMetrics(sorted);

      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>📉 4. ИСТОРИЧЕСКИЙ АНАЛИЗ</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
        `Период: ${sorted.length} торговых дней`,
        `Диапазон цен: ${minLow.toFixed(2)} – ${maxHigh.toFixed(2)}`,
        `Волатильность: ${volatility.toFixed(1)}%`,
        "",
        `<b>Мульти-таймфрейм (SMA):</b>`,
        `  SMA(5): ${sma5.toFixed(2)}  |  SMA(10): ${sma10.toFixed(2)}`,
        `  SMA(20): ${sma20.toFixed(2)}  |  SMA(50): ${sma50.toFixed(2)}`,
        `  Краткосрочный тренд (5/10): ${shortTrend}`,
        `  Среднесрочный тренд (10/20): ${midTrend}`,
        `  Долгосрочный тренд (20/50): ${longTrend}`,
        "",
        `<b>Risk-adjusted метрики:</b>`,
        `  Sharpe ratio: ${this.formatRatio(sharpe)}  ${this.gradeRatio(sharpe)}`,
        `  Sortino ratio: ${this.formatRatio(sortino)}  ${this.gradeRatio(sortino)}`,
        `  Max drawdown: ${maxDrawdown !== null ? `${maxDrawdown.toFixed(1)}%` : "—"}`,
        `  Годовая доходность (оценка): ${annualReturn !== null ? `${annualReturn >= 0 ? "+" : ""}${annualReturn.toFixed(1)}%` : "—"}`,
        "",
        `<b>Объёмы:</b>`,
        `  Средний (5д): ${this.formatVolume(avgVolume5)}`,
        `  Средний (20д): ${this.formatVolume(avgVolume20)}`,
        `  Динамика: ${avgVolume5 > avgVolume20 ? "рост объёмов ↑" : "снижение объёмов ↓"}`,
      );
    }

    // === SECTION 5: Scenarios ===
    lines.push(
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `<b>🎯 5. ТОРГОВЫЕ СЦЕНАРИИ</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
    );

    if (ctx?.quote) {
      const q = ctx.quote;
      const range = q.high - q.low;
      const pivotPoint = (q.high + q.low + q.price) / 3;
      const r1 = 2 * pivotPoint - q.low;
      const s1 = 2 * pivotPoint - q.high;

      lines.push(
        `<b>Позитивный сценарий:</b>`,
        `  Условие: закрепление выше ${r1.toFixed(2)}`,
        `  Цель: +${(range * 1.5).toFixed(2)} от текущей цены`,
        `  Вероятность: ${ctx.technicalSummary === "strong_buy" || ctx.technicalSummary === "buy" ? "повышенная" : "умеренная"}`,
        "",
        `<b>Нейтральный сценарий:</b>`,
        `  Диапазон: ${s1.toFixed(2)} – ${r1.toFixed(2)}`,
        `  Действие: наблюдать за объёмами и новостным фоном`,
        "",
        `<b>Негативный сценарий:</b>`,
        `  Условие: пробой ${s1.toFixed(2)} вниз`,
        `  Цель: -${(range * 1.5).toFixed(2)} от текущей цены`,
        `  Стоп-лосс: ${(q.price * 1.02).toFixed(2)} (для шорта)`,
      );
    } else {
      lines.push(
        "• Позитивный: пробой ключевого сопротивления и закрепление выше него.",
        "• Нейтральный: консолидация в диапазоне и ожидание нового драйвера.",
        "• Негативный: пробой поддержки и ускорение снижения.",
      );
    }

    // === SECTION 6: Risks ===
    lines.push(
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `<b>⚡ 6. РИСКИ</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
      "• Высокая волатильность на фоне макростатистики",
      "• Внезапные геополитические события",
      "• Изменение ожиданий по процентным ставкам (ФРС, ЦБ РФ)",
      "• Ликвидность: снижение объёмов = ложные пробои",
      "• Корреляция с другими классами активов",
    );

    // === SECTION 7: Trading Idea ===
    lines.push(
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `<b>💡 7. ТОРГОВАЯ ИДЕЯ</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
      request.instrument.promptHint,
    );

    if (ctx?.quote) {
      const q = ctx.quote;
      lines.push(
        "",
        `Точка входа: ${q.price.toFixed(2)} (по текущей цене)`,
        `Стоп-лосс: ${(q.price * 0.98).toFixed(2)} (-2%)`,
        `Тейк-профит 1: ${(q.price * 1.03).toFixed(2)} (+3%)`,
        `Тейк-профит 2: ${(q.price * 1.05).toFixed(2)} (+5%)`,
        `Горизонт: 1-2 недели`,
      );
    }

    // === SECTION 8: News ===
    if (ctx?.news && ctx.news.length > 0) {
      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>📰 8. ПОСЛЕДНИЕ НОВОСТИ</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
      );
      for (const n of ctx.news.slice(0, 5)) {
        const dateStr = n.pubDate.toLocaleDateString("ru-RU");
        lines.push(`• ${dateStr} — <a href="${this.escapeHtml(n.link)}">${this.escapeHtml(n.title)}</a> (${this.escapeHtml(n.source)})`);
      }
    }

    // === Disclaimer ===
    lines.push(
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
      "⚠️ Данный материал носит исключительно информационный характер и не является индивидуальной инвестиционной рекомендацией. Торговля на финансовых рынках связана с рисками потери капитала. Принимайте решения самостоятельно.",
      "",
      "© AI Finance | Powered by TradingView, Investing.com, Bloomberg, X.com",
    );

    // === Charts ===
    const charts: Buffer[] = [];

    if (ctx?.historicalBars && ctx.historicalBars.length > 2) {
      const title = request.ticker
        ? `${request.instrument.title} (${request.ticker})`
        : request.instrument.title;

      const priceChart = await generatePriceChart({ title, bars: ctx.historicalBars });
      if (priceChart) charts.push(priceChart);

      const hasVolume = ctx.historicalBars.some((b) => b.volume > 0);
      if (hasVolume) {
        const volumeChart = await generateVolumeChart({ title, bars: ctx.historicalBars });
        if (volumeChart) charts.push(volumeChart);
      }
    }

    return {
      text: lines.join("\n"),
      charts,
    };
  }

  private formatVolume(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
  }

  private computeRiskMetrics(bars: { close: number }[]): {
    sharpe: number | null;
    sortino: number | null;
    maxDrawdown: number | null;
    annualReturn: number | null;
  } {
    if (bars.length < 5) {
      return { sharpe: null, sortino: null, maxDrawdown: null, annualReturn: null };
    }

    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1].close;
      const curr = bars[i].close;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    if (returns.length === 0) {
      return { sharpe: null, sortino: null, maxDrawdown: null, annualReturn: null };
    }

    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const downside = returns.filter((r) => r < 0);
    const downsideVar = downside.length > 0
      ? downside.reduce((s, r) => s + r * r, 0) / downside.length
      : 0;
    const downsideDev = Math.sqrt(downsideVar);

    const periodsPerYear = 252;
    const riskFreeAnnual = 0.10;
    const riskFreeDaily = riskFreeAnnual / periodsPerYear;

    const annualMean = mean * periodsPerYear;
    const annualStd = stdDev * Math.sqrt(periodsPerYear);
    const annualDownside = downsideDev * Math.sqrt(periodsPerYear);

    const sharpe = annualStd > 0 ? (annualMean - riskFreeAnnual) / annualStd : null;
    const sortino = annualDownside > 0 ? (annualMean - riskFreeAnnual) / annualDownside : null;
    void riskFreeDaily;

    let peak = bars[0].close;
    let maxDd = 0;
    for (const bar of bars) {
      if (bar.close > peak) peak = bar.close;
      const dd = peak > 0 ? (peak - bar.close) / peak : 0;
      if (dd > maxDd) maxDd = dd;
    }

    return {
      sharpe,
      sortino,
      maxDrawdown: maxDd * 100,
      annualReturn: annualMean * 100,
    };
  }

  private formatRatio(value: number | null): string {
    if (value === null || !isFinite(value)) return "—";
    return value.toFixed(2);
  }

  private gradeRatio(value: number | null): string {
    if (value === null || !isFinite(value)) return "";
    if (value >= 2) return "(отлично)";
    if (value >= 1) return "(хорошо)";
    if (value >= 0) return "(приемлемо)";
    return "(слабо)";
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
