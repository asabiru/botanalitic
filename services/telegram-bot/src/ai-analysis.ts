import { InstrumentCategory } from "./catalog.js";
import type { MarketContext } from "./integrations/market-data.service.js";
import type { Fundamentals, HistoricalBar } from "./integrations/market-data/provider.interface.js";
import { generatePriceChart, generateVolumeChart } from "./integrations/chart/chart-generator.js";
import { OpenAIAnalyzer, type AiInsight } from "./integrations/ai/openai-analyzer.js";
import { isOpenAIConfigured } from "./integrations/ai/openai-client.js";

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
  private openAi = new OpenAIAnalyzer();

  async generateAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    const ctx = request.marketContext;
    const fundamentalsSummary = ctx?.fundamentals
      ? this.formatFundamentalsForPrompt(ctx.fundamentals)
      : undefined;

    const insight = isOpenAIConfigured()
      ? await this.openAi.analyze({
          instrument: request.instrument,
          ticker: request.ticker,
          investorProfile: request.investorProfile,
          marketContext: request.marketContext,
          fundamentalsSummary,
        })
      : null;
    const tickerLine = request.ticker ? `Тикер: ${request.ticker}` : "";
    const profileLine = request.investorProfile
      ? `Профиль инвестора: ${request.investorProfile}`
      : "";

    const aiHeader = insight
      ? "🤖 AI-анализ: GPT (live)"
      : isOpenAIConfigured()
        ? "🤖 AI-анализ: GPT недоступен — используется детерминированный шаблон"
        : "🤖 AI-анализ: OPENAI_API_KEY не задан — используется детерминированный шаблон";

    const lines: string[] = [
      `📊 <b>AI Finance — полный аналитический отчёт</b>`,
      `<b>${request.instrument.title}</b>`,
      "",
      `Источники данных: Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ, TradingView, Investing.com, Bloomberg, X.com`,
      `Дата отчёта: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`,
      aiHeader,
    ];

    if (tickerLine) lines.push(tickerLine);
    if (profileLine) lines.push(profileLine);

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
      const source = isOpenAIConfigured() && ctx.news.length > 0
        ? "OpenAI / новостной поток"
        : "эвристика по ключевым словам";
      lines.push(
        "",
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>🐦 3. СЕНТИМЕНТ-АНАЛИЗ</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        "",
        `${sentimentEmoji[ctx.sentiment.label] ?? ""} Тональность: <b>${sentimentLabels[ctx.sentiment.label] ?? ctx.sentiment.label}</b>`,
        `Оценка: ${ctx.sentiment.score.toFixed(2)} (шкала -1..+1)`,
        `Размер выборки: ${ctx.sentiment.sampleSize} публикаций`,
        `Источник: ${source}`,
      );
    }

    // === SECTION 3.5: Fundamentals ===
    if (ctx?.fundamentals) {
      const f = ctx.fundamentals;
      const fundLines: string[] = [];
      if (f.marketCap !== null) {
        fundLines.push(`Капитализация: ${this.formatCurrencyLarge(f.marketCap, f.currency)}`);
      }
      if (f.peRatio !== null) {
        fundLines.push(`P/E (TTM): ${f.peRatio.toFixed(2)}`);
      }
      if (f.forwardPe !== null) {
        fundLines.push(`Forward P/E: ${f.forwardPe.toFixed(2)}`);
      }
      if (f.eps !== null) {
        fundLines.push(`EPS (TTM): ${f.eps.toFixed(2)}`);
      }
      if (f.dividendYield !== null) {
        fundLines.push(`Дивидендная доходность: ${(f.dividendYield * 100).toFixed(2)}%`);
      }
      if (f.dividendRate !== null) {
        fundLines.push(`Дивиденд на акцию: ${f.dividendRate.toFixed(2)}${f.currency ? " " + f.currency : ""}`);
      }
      if (f.beta !== null) {
        fundLines.push(`Beta: ${f.beta.toFixed(2)}`);
      }
      if (f.high52w !== null && f.low52w !== null) {
        fundLines.push(`Диапазон 52 нед: ${f.low52w.toFixed(2)} – ${f.high52w.toFixed(2)}`);
      }
      if (fundLines.length > 0) {
        lines.push(
          "",
          `━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `<b>📚 3.5. ФУНДАМЕНТАЛЬНЫЕ ДАННЫЕ</b>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━`,
          "",
          ...fundLines,
        );
      }
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

    if (insight) {
      lines.push(
        `<b>🤖 AI-тезис:</b> ${this.escapeHtml(insight.thesis)}`,
        "",
        `<b>Позитивный сценарий:</b> ${this.escapeHtml(insight.bullishScenario)}`,
        `<b>Нейтральный сценарий:</b> ${this.escapeHtml(insight.neutralScenario)}`,
        `<b>Негативный сценарий:</b> ${this.escapeHtml(insight.bearishScenario)}`,
      );
      if (insight.keyDrivers.length > 0) {
        lines.push("", `<b>Ключевые драйверы:</b>`);
        for (const d of insight.keyDrivers) lines.push(`  • ${this.escapeHtml(d)}`);
      }
    } else if (ctx?.quote) {
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
    );
    if (insight && insight.risks.length > 0) {
      for (const r of insight.risks) lines.push(`• ${this.escapeHtml(r)}`);
    } else {
      lines.push(
        "• Высокая волатильность на фоне макростатистики",
        "• Внезапные геополитические события",
        "• Изменение ожиданий по процентным ставкам (ФРС, ЦБ РФ)",
        "• Ликвидность: снижение объёмов = ложные пробои",
        "• Корреляция с другими классами активов",
      );
    }

    // === SECTION 7: Trading Idea ===
    lines.push(
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `<b>💡 7. ТОРГОВАЯ ИДЕЯ</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
    );

    if (insight?.recommendation) {
      lines.push(this.escapeHtml(insight.recommendation));
    } else {
      lines.push(request.instrument.promptHint);
    }

    if (ctx?.quote) {
      const q = ctx.quote;
      const levels = this.computeTradingLevels(q.price, q.high, q.low, ctx.historicalBars, insight);
      lines.push(
        "",
        `Точка входа: ${this.formatLevel(levels.entry)}${levels.entrySource ? ` (${levels.entrySource})` : ""}`,
        `Стоп-лосс: ${this.formatLevel(levels.stop)} (${levels.stopPct})`,
        `Тейк-профит 1: ${this.formatLevel(levels.tp1)} (${levels.tp1Pct})`,
        `Тейк-профит 2: ${this.formatLevel(levels.tp2)} (${levels.tp2Pct})`,
        `Горизонт: ${insight?.horizon ?? levels.horizon}`,
        levels.notes ? `Расчёт: ${levels.notes}` : "",
      );
      if (insight?.confidence) {
        const confLabel: Record<string, string> = {
          high: "высокая",
          medium: "средняя",
          low: "низкая",
        };
        lines.push(`Уверенность AI: ${confLabel[insight.confidence] ?? insight.confidence}`);
      }
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

  private formatFundamentalsForPrompt(f: Fundamentals): string {
    const parts: string[] = [];
    if (f.shortName || f.longName) parts.push(`name=${f.longName ?? f.shortName}`);
    if (f.marketCap !== null) parts.push(`marketCap=${f.marketCap}${f.currency ?? ""}`);
    if (f.peRatio !== null) parts.push(`P/E=${f.peRatio}`);
    if (f.forwardPe !== null) parts.push(`forwardP/E=${f.forwardPe}`);
    if (f.eps !== null) parts.push(`EPS=${f.eps}`);
    if (f.dividendYield !== null) parts.push(`divYield=${(f.dividendYield * 100).toFixed(2)}%`);
    if (f.dividendRate !== null) parts.push(`dividend=${f.dividendRate}`);
    if (f.beta !== null) parts.push(`beta=${f.beta}`);
    if (f.high52w !== null && f.low52w !== null) {
      parts.push(`52w=${f.low52w}–${f.high52w}`);
    }
    return parts.join("; ");
  }

  private formatCurrencyLarge(value: number, currency: string | null): string {
    const c = currency ? ` ${currency}` : "";
    if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T${c}`;
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B${c}`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M${c}`;
    return `${value.toFixed(2)}${c}`;
  }

  private formatLevel(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return "—";
    return value.toFixed(2);
  }

  /**
   * Computes dynamic entry/stop/take-profit levels using ATR(14) and recent
   * support/resistance from historical bars. Falls back to a volatility-aware
   * percent of price when ATR is not computable. AI-provided levels are
   * preferred when available and sane (within reasonable bounds).
   */
  private computeTradingLevels(
    price: number,
    dayHigh: number,
    dayLow: number,
    bars: HistoricalBar[] | undefined,
    insight: AiInsight | null,
  ): {
    entry: number | null;
    stop: number | null;
    tp1: number | null;
    tp2: number | null;
    entrySource: string;
    stopPct: string;
    tp1Pct: string;
    tp2Pct: string;
    horizon: string;
    notes: string;
  } {
    const sorted = bars ? [...bars].sort((a, b) => a.date.getTime() - b.date.getTime()) : [];
    const atr14 = this.atr(sorted.slice(-14));
    const atr = atr14 > 0 ? atr14 : Math.max(dayHigh - dayLow, price * 0.01);
    // Multipliers: SL = 1.5*ATR, TP1 = 2*ATR, TP2 = 3.5*ATR — standard volatility-based RR.
    let stop = price - 1.5 * atr;
    let tp1 = price + 2 * atr;
    let tp2 = price + 3.5 * atr;
    let notes = `ATR(14)=${atr.toFixed(2)} \u2192 SL=1.5\u00b7ATR, TP1=2\u00b7ATR, TP2=3.5\u00b7ATR`;

    let entry: number | null = price;
    let entrySource = "по текущей цене";

    if (insight) {
      if (insight.entry !== null && this.isReasonable(price, insight.entry, 0.2)) {
        entry = insight.entry;
        entrySource = "AI-уровень";
      }
      if (insight.stopLoss !== null && this.isReasonable(price, insight.stopLoss, 0.3)) {
        stop = insight.stopLoss;
        notes = "уровни от AI-аналитика";
      }
      if (insight.takeProfit1 !== null && this.isReasonable(price, insight.takeProfit1, 0.5)) {
        tp1 = insight.takeProfit1;
      }
      if (insight.takeProfit2 !== null && this.isReasonable(price, insight.takeProfit2, 1)) {
        tp2 = insight.takeProfit2;
      }
    }

    const stopPct = `${(((stop - price) / price) * 100).toFixed(2)}%`;
    const tp1Pct = `${(tp1 - price) / price >= 0 ? "+" : ""}${(((tp1 - price) / price) * 100).toFixed(2)}%`;
    const tp2Pct = `${(tp2 - price) / price >= 0 ? "+" : ""}${(((tp2 - price) / price) * 100).toFixed(2)}%`;

    // Horizon depends on volatility: very volatile assets get a shorter horizon.
    const volPct = (atr / price) * 100;
    const horizon = volPct > 4 ? "1–3 дня (intraday/swing)" : volPct > 2 ? "1–2 недели" : "2–4 недели";

    return {
      entry,
      stop,
      tp1,
      tp2,
      entrySource,
      stopPct,
      tp1Pct,
      tp2Pct,
      horizon,
      notes,
    };
  }

  private atr(bars: HistoricalBar[]): number {
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

  private isReasonable(price: number, level: number, maxFraction: number): boolean {
    if (!Number.isFinite(level) || level <= 0 || price <= 0) return false;
    return Math.abs(level - price) / price <= maxFraction;
  }
}
