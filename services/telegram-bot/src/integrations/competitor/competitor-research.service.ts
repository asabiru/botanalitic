import Parser from "rss-parser";
import { MarketCache } from "../cache/market-cache.js";
import type {
  CompetitorProfile,
  CompetitorFeature,
  CompetitorReport,
  CompetitorIdea,
} from "./competitor.interface.js";

const TTL_COMPETITOR_RESEARCH = 24 * 60 * 60_000; // 24 hours

const KNOWN_COMPETITORS: CompetitorProfile[] = [
  {
    name: "StockChangeAlertBot",
    url: "https://t.me/StockChangeAlertBot",
    type: "telegram_bot",
    features: [
      "Сигналы акций и фьючерсов",
      "Технический анализ по индикаторам",
      "Коэффициенты Шарпа и Сортино",
      "Кривая бескупонной доходности",
      "Мульти-таймфрейм анализ",
      "Подписка (1980 ₽/мес)",
      "7 дней бесплатно",
    ],
    pricing: "1980 ₽/мес (скидка с 2750 ₽), 7 дней бесплатно",
    lastChecked: new Date(),
  },
  {
    name: "FinamTradeBot",
    url: "https://t.me/FinamTradeBot",
    type: "telegram_bot",
    features: [
      "Котировки валют, акций, нефти, золота",
      "Фьючерсы в реальном времени",
      "Новости экономики",
      "Бесплатный",
    ],
    pricing: "Бесплатно",
    lastChecked: new Date(),
  },
  {
    name: "Trader.dev",
    url: "https://trader.dev",
    type: "web_service",
    features: [
      "AI-стратегии торговли",
      "Копитрейдинг",
      "Интеграция с биржами (Bybit, BloFin)",
      "Live-аналитика портфеля",
      "Smart Automation без кода",
      "Собственный токен $TRADER",
      "Стейкинг и тарифные уровни",
    ],
    pricing: "Подписка + токен $TRADER для доступа",
    lastChecked: new Date(),
  },
  {
    name: "Trojan Bot",
    url: "https://t.me/solaborttrade_bot",
    type: "telegram_bot",
    features: [
      "DEX-трейдинг через Telegram",
      "Auto Buy/Sell по адресу токена",
      "Copy Trading",
      "Sniping новых листингов",
      "Limit Orders",
      "DCA стратегии",
    ],
    pricing: "Комиссия с каждой сделки",
    lastChecked: new Date(),
  },
  {
    name: "Maestro Bot",
    url: "https://t.me/MaesrtroBot",
    type: "telegram_bot",
    features: [
      "Мультичейн (Solana, ETH, BSC, Base)",
      "Sniping + Anti-MEV",
      "Автоматические стоп-лоссы",
      "Whale watching (отслеживание китов)",
      "Bridge между сетями",
    ],
    pricing: "1% комиссия от сделок",
    lastChecked: new Date(),
  },
  {
    name: "TradingView",
    url: "https://tradingview.com",
    type: "web_service",
    features: [
      "Интерактивные графики с 100+ индикаторами",
      "Скринер акций и крипто",
      "Pine Script (собственные стратегии)",
      "Социальная сеть трейдеров",
      "Алерты по условиям",
      "Бумажный трейдинг",
      "Мультитаймфрейм",
    ],
    pricing: "Free / Pro $12.95 / Pro+ $24.95 / Premium $49.95 /мес",
    lastChecked: new Date(),
  },
  {
    name: "Investing.com",
    url: "https://investing.com",
    type: "web_service",
    features: [
      "Экономический календарь",
      "Технический анализ",
      "Прогнозы аналитиков",
      "Скринер акций",
      "Портфель",
      "Криптовалюты",
      "Новости и обзоры",
    ],
    pricing: "Free / InvestingPro $6.99/мес",
    lastChecked: new Date(),
  },
  {
    name: "Тинькофф Инвестиции",
    url: "https://www.tinkoff.ru/invest/",
    type: "web_service",
    features: [
      "Торговля акциями, облигациями, ETF, фьючерсами",
      "Социальная сеть Пульс",
      "AI-рекомендации и скринер",
      "Робо-советник",
      "Обучение инвестициям",
      "Мобильное приложение",
      "IPO-доступ",
    ],
    pricing: "Free / Premium 299 ₽/мес, комиссии от 0.04%",
    lastChecked: new Date(),
  },
  {
    name: "БКС Мир Инвестиций",
    url: "https://bcs.ru",
    type: "web_service",
    features: [
      "Торговля на MOEX и СПБ Бирже",
      "Аналитические обзоры",
      "Идеи от аналитиков",
      "Структурные продукты",
      "ИИС и ПИФы",
      "Quik терминал",
    ],
    pricing: "Комиссии от 0.01%, подписки на аналитику",
    lastChecked: new Date(),
  },
  {
    name: "InvestingBot (FinanceBot)",
    url: "https://t.me/InvestingBot",
    type: "telegram_bot",
    features: [
      "Котировки по запросу",
      "Курсы валют ЦБ РФ",
      "Графики акций и криптовалют",
      "Конвертер валют",
      "Калькулятор инвестиций",
    ],
    pricing: "Бесплатно",
    lastChecked: new Date(),
  },
  {
    name: "CoinMarketCap",
    url: "https://coinmarketcap.com",
    type: "web_service",
    features: [
      "Рейтинг криптовалют по капитализации",
      "Отслеживание портфеля",
      "Листинг новых токенов",
      "Earn программы",
      "NFT скринер",
      "DEX аггрегатор",
      "API для разработчиков",
    ],
    pricing: "Free / Diamond $29.99/мес",
    lastChecked: new Date(),
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com",
    type: "web_service",
    features: [
      "Котировки акций в реальном времени",
      "Отслеживание портфеля",
      "Финансовая отчётность компаний",
      "Новости и аналитика",
      "Скринер акций и ETF",
      "Интерактивные графики",
    ],
    pricing: "Free / Yahoo Finance Plus $24.99/мес",
    lastChecked: new Date(),
  },
  {
    name: "Smart-Lab",
    url: "https://smart-lab.ru",
    type: "web_service",
    features: [
      "Форум трейдеров и инвесторов",
      "Блоги профессиональных аналитиков",
      "Скринер акций РФ",
      "Дивидендный календарь",
      "Отчётность компаний",
      "Стакан заявок",
    ],
    pricing: "Бесплатно / Premium функции",
    lastChecked: new Date(),
  },
  {
    name: "3Commas",
    url: "https://3commas.io",
    type: "web_service",
    features: [
      "Торговые боты (DCA, Grid, Signal)",
      "SmartTrade терминал",
      "Портфельный трекер",
      "Copy Trading",
      "Подключение к 18+ биржам",
      "TradingView сигналы",
    ],
    pricing: "Free / Pro $37/мес / Expert $59/мес",
    lastChecked: new Date(),
  },
  {
    name: "Bybit",
    url: "https://www.bybit.com",
    type: "web_service",
    features: [
      "Спот и деривативы",
      "Copy Trading",
      "Торговые боты",
      "Earn продукты (стейкинг, фарминг)",
      "Launchpad для новых токенов",
      "NFT маркетплейс",
    ],
    pricing: "Комиссии от 0.01%",
    lastChecked: new Date(),
  },
];

const OUR_FEATURES = [
  "Котировки в реальном времени",
  "12 финансовых инструментов",
  "Yahoo Finance, MOEX, CoinGecko, ЦБ РФ",
  "TradingView техническая сводка",
  "Графики цен и объёмов (PNG)",
  "Полный аналитический отчёт 8 разделов",
  "Pivot Points, SMA, волатильность",
  "Торговые сценарии с уровнями",
  "RSS-новости (Investing.com, Bloomberg)",
  "X.com сентимент (stub)",
  "ЮKassa оплата (опционально)",
  "Telegram бот",
  "Алерты по уровням цены (60с polling)",
  "Утренний дайджест рынков (08:00 МСК)",
  "21 категория акций (152 рекомендации)",
  "Анализ 15 конкурентов",
];

export class CompetitorResearchService {
  private cache: MarketCache;
  private parser = new Parser({ timeout: 15_000 });

  private readonly newsSources = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cryptonews.com/news/feed/",
  ];

  constructor(cache: MarketCache) {
    this.cache = cache;
  }

  async generateReport(): Promise<CompetitorReport> {
    const cacheKey = "competitor:report";
    const cached = this.cache.get<CompetitorReport>(cacheKey);
    if (cached) return cached;

    const trendIdeas = await this.scanTrends();
    const featureMatrix = this.buildFeatureMatrix();
    const topIdeas = [...this.generateIdeas(), ...trendIdeas];

    topIdeas.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });

    const report: CompetitorReport = {
      generatedAt: new Date(),
      competitors: KNOWN_COMPETITORS,
      featureMatrix,
      topIdeas: topIdeas.slice(0, 15),
      summary: this.buildSummary(featureMatrix, topIdeas),
    };

    this.cache.set(cacheKey, report, TTL_COMPETITOR_RESEARCH);
    return report;
  }

  private buildFeatureMatrix(): CompetitorFeature[] {
    return [
      {
        feature: "Копитрейдинг (Copy Trading)",
        competitors: ["Trojan Bot", "Trader.dev"],
        weHaveIt: false,
        priority: "medium",
        effort: "large",
        description: "Копирование сделок успешных трейдеров",
      },
      {
        feature: "Алерты по уровням цены",
        competitors: ["TradingView", "StockChangeAlertBot", "Maestro Bot"],
        weHaveIt: true,
        priority: "high",
        effort: "medium",
        description: "У нас есть — /alert ТИКЕР above|below ЦЕНА, polling каждые 60с",
      },
      {
        feature: "Экономический календарь",
        competitors: ["Investing.com", "FinamTradeBot"],
        weHaveIt: true,
        priority: "high",
        effort: "medium",
        description: "У нас есть — ForexFactory feed, /calendar today|high|week, REST API /api/calendar",
      },
      {
        feature: "AI-стратегии торговли",
        competitors: ["Trader.dev"],
        weHaveIt: false,
        priority: "high",
        effort: "large",
        description: "ML-модели для автоматической генерации торговых стратегий",
      },
      {
        feature: "Мульти-таймфрейм анализ",
        competitors: ["StockChangeAlertBot", "TradingView"],
        weHaveIt: true,
        priority: "medium",
        effort: "small",
        description: "У нас есть — SMA(5/10/20/50) с трендами на разных горизонтах в аналитическом отчёте",
      },
      {
        feature: "Коэффициент Шарпа / Сортино",
        competitors: ["StockChangeAlertBot"],
        weHaveIt: true,
        priority: "medium",
        effort: "small",
        description: "У нас есть — Sharpe и Sortino ratio в отчёте по историческим барам (rf=10% годовых)",
      },
      {
        feature: "Скринер акций / инструментов",
        competitors: ["TradingView", "Investing.com"],
        weHaveIt: false,
        priority: "medium",
        effort: "medium",
        description: "Поиск инструментов по фильтрам (P/E, объём, сектор)",
      },
      {
        feature: "Утренний/вечерний обзор",
        competitors: ["FinamTradeBot"],
        weHaveIt: true,
        priority: "high",
        effort: "small",
        description: "У нас есть — утренний дайджест в 08:00 МСК, /digest on|off",
      },
      {
        feature: "Социальный компонент",
        competitors: ["TradingView"],
        weHaveIt: false,
        priority: "low",
        effort: "large",
        description: "Сообщество трейдеров, обмен идеями, рейтинги",
      },
      {
        feature: "Отслеживание китов (Whale Watching)",
        competitors: ["Maestro Bot"],
        weHaveIt: false,
        priority: "medium",
        effort: "medium",
        description: "Отслеживание крупных транзакций на блокчейне",
      },
      {
        feature: "Бумажный трейдинг (демо)",
        competitors: ["TradingView"],
        weHaveIt: false,
        priority: "low",
        effort: "medium",
        description: "Виртуальная торговля без реальных денег для обучения",
      },
      {
        feature: "Интерактивные графики",
        competitors: ["TradingView"],
        weHaveIt: false,
        priority: "medium",
        effort: "medium",
        description: "Web-виджет TradingView с интерактивными инструментами",
      },
      {
        feature: "Графики (статичные PNG)",
        competitors: [],
        weHaveIt: true,
        priority: "low",
        effort: "small",
        description: "У нас есть — QuickChart.io графики цен и объёмов",
      },
      {
        feature: "Real-time котировки",
        competitors: ["FinamTradeBot", "TradingView", "Investing.com"],
        weHaveIt: true,
        priority: "low",
        effort: "small",
        description: "У нас есть — Yahoo Finance, MOEX, CoinGecko, ЦБ РФ",
      },
      {
        feature: "Полный аналитический отчёт",
        competitors: [],
        weHaveIt: true,
        priority: "low",
        effort: "small",
        description: "У нас есть — 8 разделов с Pivot Points, SMA, сценариями",
      },
    ];
  }

  private generateIdeas(): CompetitorIdea[] {
    return [
      {
        title: "Экономический календарь (Forex Factory / Investing.com)",
        source: "Investing.com, TradingView",
        description:
          "Парсить экономический календарь и предупреждать пользователей за 30 мин до важных событий (решение по ставке, NFP, CPI). Можно использовать Investing.com Economic Calendar RSS или API.",
        impact: "high",
        category: "feature",
      },
      {
        title: "Алерты по уровням цены",
        source: "TradingView, StockChangeAlertBot",
        description:
          "Пользователь задаёт уровень (например, золото > $3000), бот проверяет каждые 60 сек и уведомляет. Минимальная реализация: cron-job + проверка quote.price vs threshold.",
        impact: "high",
        category: "feature",
      },
      {
        title: "Утренний дайджест рынков",
        source: "FinamTradeBot, финансовые каналы",
        description:
          "Ежедневная рассылка в 08:00 МСК: индексы, нефть, золото, крипто, курс рубля, ключевые новости. Cron-based, 1 сообщение в день. Отличный retention-инструмент.",
        impact: "high",
        category: "feature",
      },
      {
        title: "Мульти-таймфрейм анализ в отчёте",
        source: "StockChangeAlertBot, TradingView",
        description:
          "Добавить в отчёт секцию: «TF 1H → buy, TF 4H → neutral, TF 1D → sell». Данные можно получить из TradingView Scanner API с разными interval.",
        impact: "medium",
        category: "feature",
      },
      {
        title: "Free trial → подписка (как у StockChangeAlertBot)",
        source: "StockChangeAlertBot",
        description:
          "7 дней бесплатно, затем подписка 1980 ₽/мес. Реализация: таблица users с trial_end, middleware проверяющий доступ.",
        impact: "high",
        category: "monetization",
      },
      {
        title: "Коэффициенты Шарпа / Сортино",
        source: "StockChangeAlertBot",
        description:
          "Вычислять risk-adjusted метрики из historicalBars. Формула простая: (mean_return - risk_free) / std_dev. Добавляет доверие к отчёту.",
        impact: "medium",
        category: "data",
      },
      {
        title: "Inline-режим: @aifinanceint_bot AAPL",
        source: "Общий UX-паттерн Telegram-ботов",
        description:
          "Быстрый запрос котировки прямо из любого чата — удобный виральный инструмент. Telegraf поддерживает inline queries из коробки.",
        impact: "medium",
        category: "ux",
      },
      {
        title: "Портфель пользователя",
        source: "Investing.com, TradingView",
        description:
          "Пользователь добавляет свои позиции (AAPL: 10 шт по $150) — бот считает текущую стоимость, P&L, и отправляет алерт при просадке.",
        impact: "medium",
        category: "feature",
      },
      {
        title: "Web App (Telegram Mini App)",
        source: "Тренд Telegram 2024-2025",
        description:
          "Telegram Mini App для интерактивных графиков, портфеля, настроек. TradingView widget можно встроить в WebApp.",
        impact: "medium",
        category: "ux",
      },
      {
        title: "Реферальная программа",
        source: "Trader.dev, Trojan Bot",
        description:
          "Invite link с % от оплат рефералов. Виральный рост. Реализация: users.referral_code + отслеживание в payments.",
        impact: "medium",
        category: "marketing",
      },
    ];
  }

  async scanTrends(): Promise<CompetitorIdea[]> {
    const ideas: CompetitorIdea[] = [];

    for (const feedUrl of this.newsSources) {
      try {
        const feed = await this.parser.parseURL(feedUrl);
        const items = feed.items ?? [];

        const trendKeywords = [
          "ai trading", "trading bot", "telegram bot",
          "signal", "alert", "portfolio", "copy trad",
          "sentiment", "analysis", "predict",
        ];

        for (const item of items.slice(0, 20)) {
          const text = `${item.title ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
          const matched = trendKeywords.some((kw) => text.includes(kw));

          if (matched) {
            ideas.push({
              title: item.title ?? "Тренд из новостей",
              source: feed.title ?? feedUrl,
              description: item.contentSnippet?.slice(0, 300) ?? "",
              impact: "low",
              category: "feature",
            });
          }
        }
      } catch {
        // RSS feed unavailable — skip silently
      }
    }

    return ideas.slice(0, 5);
  }

  formatReportHTML(report: CompetitorReport): string {
    const lines: string[] = [];

    lines.push("📊<b>AI Finance — Исследование конкурентов</b>");
    lines.push(`Дата: ${report.generatedAt.toLocaleDateString("ru-RU")}\n`);

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("<b>🏢 Конкуренты</b>");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    for (const c of report.competitors) {
      const typeLabel = c.type === "telegram_bot" ? "🤖" : "🌐";
      lines.push(`${typeLabel} <b>${c.name}</b>`);
      lines.push(`   Цена: ${c.pricing ?? "н/д"}`);
      lines.push(`   Фичи: ${c.features.slice(0, 3).join(", ")}`);
      lines.push("");
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("<b>🔍 Чего у нас нет (но есть у конкурентов)</b>");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const missing = report.featureMatrix.filter((f) => !f.weHaveIt);
    const highPriority = missing.filter((f) => f.priority === "high");
    const medPriority = missing.filter((f) => f.priority === "medium");

    if (highPriority.length > 0) {
      lines.push("<b>🔴 Высокий приоритет:</b>");
      for (const f of highPriority) {
        lines.push(`• ${f.feature} (${f.competitors.join(", ")})`);
        lines.push(`  ↳ ${f.description}`);
      }
      lines.push("");
    }

    if (medPriority.length > 0) {
      lines.push("<b>🟡 Средний приоритет:</b>");
      for (const f of medPriority) {
        lines.push(`• ${f.feature} (${f.competitors.join(", ")})`);
      }
      lines.push("");
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("<b>💡 Топ-идеи для развития</b>");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const topIdeas = report.topIdeas.filter((i) => i.impact === "high");
    for (let i = 0; i < Math.min(topIdeas.length, 5); i++) {
      const idea = topIdeas[i];
      lines.push(`<b>${i + 1}. ${idea.title}</b>`);
      lines.push(`   Источник: ${idea.source}`);
      lines.push(`   ${idea.description.slice(0, 150)}`);
      lines.push("");
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("<b>✅ Наши преимущества</b>");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const ours = report.featureMatrix.filter((f) => f.weHaveIt);
    for (const f of ours) {
      lines.push(`• ${f.feature}`);
    }

    lines.push(`\n<i>${report.summary}</i>`);

    return lines.join("\n");
  }

  private buildSummary(
    features: CompetitorFeature[],
    ideas: CompetitorIdea[],
  ): string {
    const missing = features.filter((f) => !f.weHaveIt).length;
    const have = features.filter((f) => f.weHaveIt).length;
    const highIdeas = ideas.filter((i) => i.impact === "high").length;

    return (
      `Проанализировано ${KNOWN_COMPETITORS.length} конкурентов. ` +
      `У нас: ${have} фич из ${features.length}. ` +
      `Отсутствует: ${missing} фич. ` +
      `Высокоприоритетных идей: ${highIdeas}. ` +
      `Топ-3 quick wins: алерты по уровням, утренний дайджест, экономический календарь.`
    );
  }
}
