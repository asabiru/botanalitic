import { Markup } from "telegraf";
import { Input } from "telegraf";
import { findInstrumentById, instrumentCatalog } from "./catalog.js";
import { fetchLiveQuote, formatQuote } from "./quotes.js";
import { createServer } from "./server.js";
import { aiAnalysisService, bot, competitorAgent, competitorResearchService, digestSubscriberStore, economicCalendarProvider, marketDataService, morningDigestService, orderStore, priceAlertService, priceAlertStore, sessionStore, stockAnalyticsAgent, yooKassaService } from "./app-context.js";
import type { AlertDirection } from "./integrations/alerts/price-alert-store.js";
import { config } from "./config.js";
import type { AnalysisResult } from "./ai-analysis.js";
import { formatEvent, impactEmoji } from "./integrations/calendar/economic-calendar.provider.js";
import type { EconomicEvent } from "./integrations/calendar/economic-calendar.provider.js";

async function sendAnalysisResult(ctx: any, result: AnalysisResult): Promise<void> {
  await ctx.reply(result.text, { parse_mode: "HTML" });

  for (const chart of result.charts) {
    await ctx.replyWithPhoto(Input.fromBuffer(chart, "chart.png"));
  }
}

function isAdmin(userId: number): boolean {
  return config.ADMIN_CHAT_ID ? String(userId) === config.ADMIN_CHAT_ID : false;
}

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Аналитика", "analytics_hub")],
    [Markup.button.callback("🔔 Алерты по ценам", "alerts_menu")],
    [Markup.button.callback("☀️ Утренний дайджест", "digest_menu")],
    [Markup.button.callback("📅 Экономический календарь", "calendar_menu")],
    [Markup.button.callback("💳 Как купить", "buy_help")],
    [Markup.button.callback("🧾 Мои заявки", "my_orders")],
    [Markup.button.callback("ℹ️ О сервисе", "about")]
  ]);
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Отчёт по конкурентам", "admin_competitor_report")],
    [Markup.button.callback("📋 Предложения", "admin_suggestions")],
    [Markup.button.callback("🔬 Запустить анализ", "admin_run_analysis")],
    [Markup.button.callback("📈 Отчёт по категориям", "admin_analytics_report")],
    [Markup.button.callback("◀️ Главное меню", "back_main")],
  ]);
}

function catalogKeyboard() {
  return Markup.inlineKeyboard(
    instrumentCatalog.map((item) => [Markup.button.callback(`${item.title} — ${item.priceRub} ₽`, `instrument:${item.id}`)])
  );
}

bot.start(async (ctx: any) => {
  sessionStore.clear(ctx.from.id);

  await ctx.reply(
    [
      "Привет! Я бот <b>AI Finance</b>.",
      "",
      "Я помогаю клиентам купить аналитический разбор по рынкам и инструментам:",
      "• валюты",
      "• сырьё",
      "• акции США и РФ",
      "• индексы",
      "• криптовалюты",
      "",
      "Котировки обновляются в реальном времени из:",
      "• Yahoo Finance, MOEX, CoinGecko, ЦБ РФ",
      "• Новости: Investing.com, Bloomberg RSS",
      "• Тех. анализ: TradingView",
      "",
      "Оплата проходит через ЮKassa.",
      "После подтверждения оплаты бот автоматически отправит аналитический материал.",
      "",
      "⚠️ Информация в боте не является индивидуальной инвестиционной рекомендацией."
    ].join("\n"),
    {
      parse_mode: "HTML",
      ...mainMenu()
    }
  );
});

bot.action("catalog", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("Выберите инструмент для анализа:", catalogKeyboard());
});

// === Unified Analytics Hub ===
bot.action("analytics_hub", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "<b>📊 Аналитика</b>",
      "",
      "Выберите рынок для просмотра категорий и акций.",
      "После выбора конкретной акции вы получите:",
      "• live-котировку",
      "• графики цен и объёмов",
      "• полный аналитический отчёт",
    ].join("\n"),
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📈 Акции РФ", "cat_instrument:ru-stocks")],
        [Markup.button.callback("🇺🇸 Акции США", "cat_instrument:us-stocks")],
        [Markup.button.callback("₿ Криптовалюты", "cat_instrument:crypto")],
        [Markup.button.callback("🛢 Сырьё и валюты", "catalog")],
        [Markup.button.callback("◀️ Главное меню", "back_main")],
      ]),
    }
  );
});

bot.action("buy_help", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "Как проходит покупка:",
      "1. Вы выбираете рынок или актив.",
      "2. При необходимости присылаете тикер.",
      "3. Бот создаёт заказ и ссылку на оплату ЮKassa.",
      "4. После webhook-подтверждения оплаты бот отправляет аналитику автоматически.",
      "",
      "Все котировки и рекомендации формируются на основе данных в реальном времени."
    ].join("\n")
  );
});

bot.action("my_orders", async (ctx: any) => {
  await ctx.answerCbQuery();

  const orders = orderStore.listByTelegramUserId(ctx.from.id);

  if (orders.length === 0) {
    await ctx.reply("У вас пока нет заявок.");
    return;
  }

  const message = orders
    .slice(-10)
    .reverse()
    .map(
      (order) =>
        [
          `#${order.id}`,
          `${order.instrumentTitle}`,
          `Статус: ${order.status}`,
          `Сумма: ${order.amountRub} ₽`,
          order.ticker ? `Тикер: ${order.ticker}` : undefined,
          `Создан: ${order.createdAt}`
        ]
          .filter(Boolean)
          .join("\n")
    )
    .join("\n\n");

  await ctx.reply(message);
});

bot.action("about", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "AI Finance — сервис продажи аналитики по финансовым рынкам.",
      "",
      "Источники данных в реальном времени:",
      "• Yahoo Finance — нефть, газ, золото, серебро, акции США, EUR/USD",
      "• MOEX ISS — акции РФ, индекс Мосбиржи, RGBI",
      "• CoinGecko — криптовалюты",
      "• ЦБ РФ — курсы валют (USD/RUB, CNY/RUB)",
      "• TradingView Scanner — техническая сводка",
      "• Investing.com RSS — финансовые новости",
      "• Bloomberg RSS — мировые рынки",
      "",
      "Формат результата:",
      "• текущая котировка и изменение",
      "• техническая рекомендация TradingView",
      "• сценарии и риски",
      "• последние новости",
      "• идея по горизонту"
    ].join("\n")
  );
});

bot.action("competitor_research", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("⏳ Анализирую конкурентов и тренды...");

  try {
    const report = await competitorResearchService.generateReport();
    const html = competitorResearchService.formatReportHTML(report);

    const MAX_MSG_LEN = 4000;
    if (html.length <= MAX_MSG_LEN) {
      await ctx.reply(html, { parse_mode: "HTML" });
    } else {
      const parts: string[] = [];
      let current = "";
      for (const line of html.split("\n")) {
        if (current.length + line.length + 1 > MAX_MSG_LEN) {
          parts.push(current);
          current = line;
        } else {
          current += (current ? "\n" : "") + line;
        }
      }
      if (current) parts.push(current);

      for (const part of parts) {
        await ctx.reply(part, { parse_mode: "HTML" });
      }
    }
  } catch (err) {
    console.error("[CompetitorResearch] Error:", err);
    await ctx.reply("Ошибка при анализе конкурентов. Попробуйте позже.");
  }
});

// === Stock Categories (public) ===

bot.action(/^cat_instrument:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();
  const instrumentId = ctx.match[1] as string;
  const categories = stockAnalyticsAgent.listCategories(instrumentId);

  if (categories.length === 0) {
    await ctx.reply("Нет категорий для этого инструмента.");
    return;
  }

  const text = stockAnalyticsAgent.formatInstrumentCategories(instrumentId);
  const buttons = categories.map((cat) => [Markup.button.callback(`${cat.icon} ${cat.name}`, `cat_view:${cat.id}`)]);
  buttons.push([Markup.button.callback("◀️ Назад к рынкам", "analytics_hub")]);

  await ctx.reply(text, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
});

bot.action(/^cat_view:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();
  const categoryId = ctx.match[1] as string;
  const data = stockAnalyticsAgent.getCategoryWithStocks(categoryId);

  if (!data) {
    await ctx.reply("Категория не найдена.");
    return;
  }

  const { category, stocks } = data;
  const card = stockAnalyticsAgent.formatCategoryCard(categoryId);

  if (!card) {
    await ctx.reply("Категория не найдена.");
    return;
  }

  const instrumentId = category.instrumentId;
  const stockButtons = stocks.map((s) => [
    Markup.button.callback(`📊 ${s.ticker} — ${s.name}`, `stock_analyze:${instrumentId}:${s.ticker}`),
  ]);
  stockButtons.push([Markup.button.callback("◀️ Назад к категориям", `cat_instrument:${instrumentId}`)]);

  await ctx.reply(card, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(stockButtons),
  });
});

// === Stock Analysis from category ===
bot.action(/^stock_analyze:(.+):(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();
  const instrumentId = ctx.match[1] as string;
  const ticker = ctx.match[2] as string;

  const instrument = findInstrumentById(instrumentId);
  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  sessionStore.patch(ctx.from.id, {
    selectedInstrumentId: instrument.id,
    ticker: ticker,
    investorProfile: undefined,
  });

  await ctx.reply(`⏳ Загружаю данные по <b>${ticker}</b>...`, { parse_mode: "HTML" });

  try {
    const quote = await fetchLiveQuote(marketDataService, instrument.id, ticker);
    if (quote) {
      await ctx.reply(formatQuote(quote), { parse_mode: "HTML" });
    }

    const marketContext = await marketDataService.getMarketContext(instrument.id, ticker);
    const result = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker,
      investorProfile: undefined,
      marketContext,
    });

    await sendAnalysisResult(ctx, result);
  } catch (err) {
    console.error(`[StockAnalyze] Error for ${ticker}:`, err);
    await ctx.reply(`Ошибка при анализе ${ticker}. Попробуйте позже.`);
  }
});

bot.action("back_main", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("Главное меню:", mainMenu());
});

// === Admin panel ===
bot.command("admin", async (ctx: any) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Доступ запрещён.");
    return;
  }
  await ctx.reply("🔧 Панель администратора:", adminMenu());
});

bot.action("admin_competitor_report", async (ctx: any) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;

  await ctx.reply("⏳ Генерирую отчёт по конкурентам...");
  try {
    const report = await competitorResearchService.generateReport();
    const html = competitorResearchService.formatReportHTML(report);

    const MAX_MSG_LEN = 4000;
    if (html.length <= MAX_MSG_LEN) {
      await ctx.reply(html, { parse_mode: "HTML" });
    } else {
      const parts: string[] = [];
      let current = "";
      for (const line of html.split("\n")) {
        if (current.length + line.length + 1 > MAX_MSG_LEN) {
          parts.push(current);
          current = line;
        } else {
          current += (current ? "\n" : "") + line;
        }
      }
      if (current) parts.push(current);
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: "HTML" });
      }
    }
  } catch (err) {
    console.error("[Admin] CompetitorReport error:", err);
    await ctx.reply("Ошибка при генерации отчёта.");
  }
});

bot.action("admin_suggestions", async (ctx: any) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;

  const text = competitorAgent.formatSuggestionsList();
  await ctx.reply(text, { parse_mode: "HTML" });
});

bot.action("admin_run_analysis", async (ctx: any) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;

  await ctx.reply("⏳ Запускаю полный анализ конкурентов и генерацию предложений...");
  try {
    const { report, newSuggestions } = await competitorAgent.runFullAnalysis();
    const text = competitorAgent.formatAnalysisReport(report, newSuggestions);

    const MAX_MSG_LEN = 4000;
    if (text.length <= MAX_MSG_LEN) {
      await ctx.reply(text, { parse_mode: "HTML" });
    } else {
      const parts: string[] = [];
      let current = "";
      for (const line of text.split("\n")) {
        if (current.length + line.length + 1 > MAX_MSG_LEN) {
          parts.push(current);
          current = line;
        } else {
          current += (current ? "\n" : "") + line;
        }
      }
      if (current) parts.push(current);
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: "HTML" });
      }
    }
    await ctx.reply(`Анализ завершён. Новых предложений: ${newSuggestions.length}.`);
  } catch (err) {
    console.error("[Admin] RunAnalysis error:", err);
    await ctx.reply("Ошибка при запуске анализа.");
  }
});

bot.action("admin_analytics_report", async (ctx: any) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;

  const text = stockAnalyticsAgent.formatFullReport();

  const MAX_MSG_LEN = 4000;
  if (text.length <= MAX_MSG_LEN) {
    await ctx.reply(text, { parse_mode: "HTML" });
  } else {
    const parts: string[] = [];
    let current = "";
    for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > MAX_MSG_LEN) {
        parts.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) parts.push(current);
    for (const part of parts) {
      await ctx.reply(part, { parse_mode: "HTML" });
    }
  }
});

bot.action("quotes_menu", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Выберите инструмент для просмотра котировок в реальном времени:",
    Markup.inlineKeyboard(
      instrumentCatalog.map((item) => [Markup.button.callback(item.title, `quote:${item.id}`)])
    )
  );
});

bot.action("stock_categories", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("Перенаправляю в аналитику...");
  await ctx.reply(
    [
      "<b>📊 Аналитика</b>",
      "",
      "Выберите рынок для просмотра категорий и акций.",
    ].join("\n"),
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📈 Акции РФ", "cat_instrument:ru-stocks")],
        [Markup.button.callback("🇺🇸 Акции США", "cat_instrument:us-stocks")],
        [Markup.button.callback("₿ Криптовалюты", "cat_instrument:crypto")],
        [Markup.button.callback("🛢 Сырьё и валюты", "catalog")],
        [Markup.button.callback("◀️ Главное меню", "back_main")],
      ]),
    }
  );
});

bot.action(/^quote:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();

  const instrumentId = ctx.match[1];
  const instrument = findInstrumentById(instrumentId);

  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  await ctx.reply("⏳ Загружаю актуальные котировки...");

  const quote = await fetchLiveQuote(marketDataService, instrumentId);

  if (!quote) {
    await ctx.reply(`Не удалось получить котировки для ${instrument.title}. Попробуйте позже.`);
    return;
  }

  await ctx.reply(formatQuote(quote), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔄 Обновить", `quote:${instrumentId}`)],
      [Markup.button.callback("📚 Подробный анализ", `instrument:${instrumentId}`)],
      [Markup.button.callback("◀️ Назад", "analytics_hub")]
    ])
  });
});

bot.action(/^instrument:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();

  const instrumentId = ctx.match[1];
  const instrument = findInstrumentById(instrumentId);

  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  sessionStore.patch(ctx.from.id, {
    selectedInstrumentId: instrument.id,
    ticker: undefined,
    investorProfile: undefined
  });

  const quote = await fetchLiveQuote(marketDataService, instrument.id);
  const quoteBlock = quote
    ? [
        "",
        formatQuote(quote),
        ""
      ]
    : [];

  await ctx.reply(
    [
      `<b>${instrument.title}</b>`,
      instrument.description,
      `Стоимость анализа: <b>${instrument.priceRub} ₽</b>`,
      ...quoteBlock,
      "Если для этой категории нужен тикер — отправьте его следующим сообщением.",
      "Если тикер не нужен, нажмите кнопку оплаты."
    ].join("\n"),
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("💳 Оплатить", `pay:${instrument.id}`)],
        [Markup.button.callback("🤖 Получить демо-аналитику", `demo:${instrument.id}`)]
      ])
    }
  );
});

bot.action(/^demo:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();

  const instrument = findInstrumentById(ctx.match[1]);

  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  await ctx.reply("⏳ Загружаю рыночные данные и формирую анализ...");

  const session = sessionStore.get(ctx.from.id);
  try {
    const marketContext = await marketDataService.getMarketContext(instrument.id, session.ticker);
    const result = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker: session.ticker,
      investorProfile: session.investorProfile,
      marketContext,
    });
    await sendAnalysisResult(ctx, result);
  } catch (err) {
    console.error(
      `[demo] analysis failed for ${instrument.id}${session.ticker ? `/${session.ticker}` : ""}:`,
      err,
    );
    await ctx.reply(
      "⚠️ Не удалось сформировать анализ — внешний источник данных не ответил. Попробуйте ещё раз через минуту.",
    );
  }
});

bot.action(/^pay:(.+)$/, async (ctx: any) => {
  await ctx.answerCbQuery();

  const instrument = findInstrumentById(ctx.match[1]);

  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  const session = sessionStore.get(ctx.from.id);

  const order = orderStore.create({
    telegramUserId: ctx.from.id,
    instrumentId: instrument.id,
    instrumentTitle: instrument.title,
    amountRub: instrument.priceRub,
    ticker: session.ticker,
    investorProfile: session.investorProfile
  });

  if (!yooKassaService.isConfigured) {
    orderStore.update(order.id, { status: "paid" });
    await ctx.reply("⏳ Генерирую анализ на основе актуальных рыночных данных...");

    try {
      const marketContext = await marketDataService.getMarketContext(instrument.id, session.ticker);
      const result = await aiAnalysisService.generateAnalysis({
        instrument,
        ticker: session.ticker,
        investorProfile: session.investorProfile,
        marketContext,
      });
      await sendAnalysisResult(ctx, result);
      orderStore.update(order.id, { status: "delivered" });
    } catch (err) {
      console.error("Analysis generation error:", err);
      await ctx.reply("Произошла ошибка при генерации анализа. Попробуйте позже.");
    }
    return;
  }

  try {
    const payment = await yooKassaService.createPayment({
      instrument,
      telegramUserId: ctx.from.id,
      ticker: session.ticker,
      orderId: order.id
    });

    orderStore.update(order.id, {
      paymentId: payment.paymentId,
      paymentUrl: payment.confirmationUrl,
      status: "waiting_payment"
    });

    sessionStore.patch(ctx.from.id, { lastPaymentId: payment.paymentId });

    await ctx.reply(
      [
        `Заказ создан: ${order.id}`,
        `Ссылка на оплату для ${instrument.title}:`,
        payment.confirmationUrl,
        "",
        "После успешной оплаты ЮKassa отправит webhook, и бот автоматически пришлёт результат."
      ].join("\n")
    );
  } catch (error: unknown) {
    console.error("YooKassa createPayment error", error);
    orderStore.update(order.id, { status: "cancelled" });
    await ctx.reply("Не удалось создать платёж. Проверьте настройки ЮKassa и попробуйте снова.");
  }
});

// === Price Alerts ===

bot.action("alerts_menu", async (ctx: any) => {
  await ctx.answerCbQuery();
  const text = priceAlertService.formatAlertsList(ctx.from.id);
  await ctx.reply(text, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("➕ Как добавить алерт", "alert_help")],
      [Markup.button.callback("◀️ Главное меню", "back_main")],
    ]),
  });
});

bot.action("alert_help", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "<b>🔔 Как настроить алерт по цене</b>",
      "",
      "Отправьте команду в формате:",
      "<code>/alert ТИКЕР above ЦЕНА</code> — уведомить когда цена вырастет выше",
      "<code>/alert ТИКЕР below ЦЕНА</code> — уведомить когда цена упадёт ниже",
      "",
      "Примеры:",
      "<code>/alert SBER above 300</code>",
      "<code>/alert BTC below 50000</code>",
      "<code>/alert GOLD above 3000</code>",
      "<code>/alert LKOH below 6500</code>",
      "",
      "Бот проверяет цены каждые 60 секунд.",
      "",
      "Для отмены алерта: <code>/alert cancel</code>",
      "Для просмотра: <code>/alert list</code>",
    ].join("\n"),
    { parse_mode: "HTML" }
  );
});

bot.command("alert", async (ctx: any) => {
  const args = ctx.message.text.replace(/^\/alert\s*/i, "").trim().split(/\s+/);

  if (args.length === 0 || args[0] === "") {
    const text = priceAlertService.formatAlertsList(ctx.from.id);
    await ctx.reply(text, { parse_mode: "HTML" });
    return;
  }

  if (args[0] === "list") {
    const text = priceAlertService.formatAlertsList(ctx.from.id);
    await ctx.reply(text, { parse_mode: "HTML" });
    return;
  }

  if (args[0] === "cancel") {
    const alerts = priceAlertStore.listByUser(ctx.from.id);
    if (alerts.length === 0) {
      await ctx.reply("У вас нет активных алертов.");
      return;
    }

    let cancelled = 0;
    for (const a of alerts) {
      if (priceAlertStore.deactivate(a.id)) cancelled++;
    }
    await ctx.reply(`Отменено ${cancelled} алертов.`);
    return;
  }

  if (args.length < 3) {
    await ctx.reply(
      "Формат: /alert ТИКЕР above|below ЦЕНА\nПример: /alert SBER above 300",
    );
    return;
  }

  const ticker = args[0].toUpperCase();
  const direction = args[1].toLowerCase();
  const price = parseFloat(args[2]);

  if (direction !== "above" && direction !== "below") {
    await ctx.reply("Направление должно быть 'above' или 'below'.\nПример: /alert SBER above 300");
    return;
  }

  if (isNaN(price) || price <= 0) {
    await ctx.reply("Цена должна быть положительным числом.\nПример: /alert SBER above 300");
    return;
  }

  const tickerToInstrument: Record<string, string> = {
    SBER: "ru-stocks", LKOH: "ru-stocks", GAZP: "ru-stocks", ROSN: "ru-stocks",
    YDEX: "ru-stocks", VTBR: "ru-stocks", GMKN: "ru-stocks", NVTK: "ru-stocks",
    TATN: "ru-stocks", OZON: "ru-stocks", POSI: "ru-stocks", MTSS: "ru-stocks",
    NLMK: "ru-stocks", CHMF: "ru-stocks", MAGN: "ru-stocks", PLZL: "ru-stocks",
    MOEX: "ru-stocks", TCSG: "ru-stocks", FIVE: "ru-stocks", MGNT: "ru-stocks",
    ALRS: "ru-stocks", SNGS: "ru-stocks", RUAL: "ru-stocks", PIKK: "ru-stocks",
    AFKS: "ru-stocks", BSPB: "ru-stocks", VKCO: "ru-stocks", HEAD: "ru-stocks",
    IRAO: "ru-stocks", RTKM: "ru-stocks", ASTR: "ru-stocks", PHOR: "ru-stocks",
    FLOT: "ru-stocks", CBOM: "ru-stocks", POLY: "ru-stocks", WUSH: "ru-stocks",

    AAPL: "us-stocks", MSFT: "us-stocks", GOOGL: "us-stocks", AMZN: "us-stocks",
    META: "us-stocks", TSLA: "us-stocks", NVDA: "us-stocks", AMD: "us-stocks",
    NFLX: "us-stocks", CRM: "us-stocks", ORCL: "us-stocks", ADBE: "us-stocks",
    JNJ: "us-stocks", KO: "us-stocks", PG: "us-stocks", PEP: "us-stocks",
    MCD: "us-stocks", WMT: "us-stocks", XOM: "us-stocks", CVX: "us-stocks",
    PLTR: "us-stocks", SHOP: "us-stocks", UBER: "us-stocks", ABNB: "us-stocks",
    COIN: "us-stocks", JPM: "us-stocks", V: "us-stocks", MA: "us-stocks",
    BAC: "us-stocks", GS: "us-stocks", LLY: "us-stocks", UNH: "us-stocks",
    PFE: "us-stocks", ABBV: "us-stocks", MRK: "us-stocks", AVGO: "us-stocks",
    TSM: "us-stocks", INTC: "us-stocks", ARM: "us-stocks", BA: "us-stocks",

    BTC: "crypto", ETH: "crypto", SOL: "crypto", ADA: "crypto",
    AVAX: "crypto", DOT: "crypto", DOGE: "crypto", SHIB: "crypto",
    LINK: "crypto", UNI: "crypto", AAVE: "crypto", TON: "crypto",
    NEAR: "crypto", APT: "crypto", SUI: "crypto", PEPE: "crypto",

    GOLD: "gold", SILVER: "silver", OIL: "oil", GAS: "gas",
  };

  const instrumentId = tickerToInstrument[ticker] ?? "us-stocks";
  const dirLabel = direction === "above" ? "выше" : "ниже";

  const alert = priceAlertStore.add({
    telegramUserId: ctx.from.id,
    instrumentId,
    ticker,
    targetPrice: price,
    direction: direction as AlertDirection,
    label: ticker,
  });

  await ctx.reply(
    [
      `🔔 Алерт создан!`,
      "",
      `<b>${ticker}</b> — уведомить когда цена будет ${dirLabel} <b>${price}</b>`,
      "",
      "Бот проверяет цены каждые 60 секунд.",
      "Отменить все: /alert cancel",
    ].join("\n"),
    { parse_mode: "HTML" }
  );
});

// === Morning Digest ===

bot.action("digest_menu", async (ctx: any) => {
  await ctx.answerCbQuery();
  const isSubscribed = digestSubscriberStore.isSubscribed(ctx.from.id);
  const counts = digestSubscriberStore.count();

  const lines: string[] = [
    "<b>☀️ Утренний дайджест рынков</b>",
    "",
    "Ежедневная рассылка в <b>08:00 МСК</b> с обзором ключевых рынков:",
    "• USD/RUB, CNY/RUB",
    "• Нефть Brent, Золото",
    "• Индекс Мосбиржи",
    "• Bitcoin, EUR/USD",
    "",
    `Ваш статус: ${isSubscribed ? "✅ Подписан" : "❌ Не подписан"}`,
    `Подписчиков: ${counts.active}`,
  ];

  const buttons = isSubscribed
    ? [[Markup.button.callback("❌ Отписаться", "digest_unsubscribe")], [Markup.button.callback("👁 Посмотреть пример", "digest_preview")]]
    : [[Markup.button.callback("✅ Подписаться", "digest_subscribe")], [Markup.button.callback("👁 Посмотреть пример", "digest_preview")]];

  buttons.push([Markup.button.callback("◀️ Главное меню", "back_main")]);

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(buttons),
  });
});

bot.action("digest_subscribe", async (ctx: any) => {
  await ctx.answerCbQuery();
  digestSubscriberStore.subscribe(ctx.from.id);
  await ctx.reply(
    [
      "✅ Вы подписаны на утренний дайджест!",
      "",
      "Каждый день в 08:00 МСК вы будете получать обзор рынков.",
      "Отписаться: /digest off",
    ].join("\n"),
  );
});

bot.action("digest_unsubscribe", async (ctx: any) => {
  await ctx.answerCbQuery();
  digestSubscriberStore.unsubscribe(ctx.from.id);
  await ctx.reply("❌ Вы отписались от утреннего дайджеста.");
});

bot.action("digest_preview", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("⏳ Генерирую превью дайджеста...");
  try {
    const preview = await morningDigestService.generateDigest();
    await ctx.reply(preview, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[DigestPreview] Error:", err);
    await ctx.reply("Ошибка при генерации дайджеста. Попробуйте позже.");
  }
});

bot.command("digest", async (ctx: any) => {
  const arg = ctx.message.text.replace(/^\/digest\s*/i, "").trim().toLowerCase();

  if (arg === "off" || arg === "stop" || arg === "unsubscribe") {
    digestSubscriberStore.unsubscribe(ctx.from.id);
    await ctx.reply("❌ Вы отписались от утреннего дайджеста.");
    return;
  }

  if (arg === "on" || arg === "start" || arg === "subscribe" || arg === "") {
    digestSubscriberStore.subscribe(ctx.from.id);
    await ctx.reply(
      [
        "✅ Вы подписаны на утренний дайджест!",
        "",
        "Каждый день в 08:00 МСК вы будете получать обзор ключевых рынков.",
        "Отписаться: /digest off",
      ].join("\n"),
    );
    return;
  }

  if (arg === "preview") {
    await ctx.reply("⏳ Генерирую превью...");
    try {
      const preview = await morningDigestService.generateDigest();
      await ctx.reply(preview, { parse_mode: "HTML" });
    } catch (err) {
      console.error("[DigestPreview] Error:", err);
      await ctx.reply("Ошибка при генерации дайджеста.");
    }
    return;
  }

  await ctx.reply("Используйте: /digest on | off | preview");
});

// === Economic Calendar ===

async function renderCalendar(events: EconomicEvent[], title: string, emptyHint: string): Promise<string> {
  if (events.length === 0) {
    return [`<b>${title}</b>`, "", emptyHint].join("\n");
  }
  const high = events.filter((e) => e.impact === "high");
  const medium = events.filter((e) => e.impact === "medium");
  const lines: string[] = [
    `<b>${title}</b>`,
    "",
    `Всего событий: ${events.length}  |  ${impactEmoji("high")} высокого: ${high.length}  |  ${impactEmoji("medium")} среднего: ${medium.length}`,
    "",
  ];
  for (const ev of events.slice(0, 25)) {
    lines.push(formatEvent(ev));
  }
  if (events.length > 25) {
    lines.push("", `<i>...и ещё ${events.length - 25} событий</i>`);
  }
  lines.push("", "<i>Источник: ForexFactory · время МСК</i>");
  return lines.join("\n");
}

bot.action("calendar_menu", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "<b>📅 Экономический календарь</b>",
      "",
      "Важные события: решения ЦБ, NFP, CPI, FOMC, заседания ОПЕК.",
      "Источник: ForexFactory · обновляется ежечасно.",
    ].join("\n"),
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📆 События сегодня", "calendar_today")],
        [Markup.button.callback("🔴 Только high impact", "calendar_high")],
        [Markup.button.callback("🗓 Все события на неделю", "calendar_week")],
        [Markup.button.callback("◀️ Главное меню", "back_main")],
      ]),
    },
  );
});

bot.action("calendar_today", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("⏳ Загружаю события на сегодня...");
  try {
    const events = await economicCalendarProvider.getTodayEvents();
    const text = await renderCalendar(events, "📆 События сегодня", "На сегодня значимых событий не запланировано.");
    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[Calendar] today error:", err);
    await ctx.reply("Не удалось загрузить календарь. Попробуйте позже.");
  }
});

bot.action("calendar_high", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("⏳ Загружаю high impact события...");
  try {
    const events = await economicCalendarProvider.getUpcomingHighImpact(15);
    const text = await renderCalendar(events, "🔴 Ближайшие high impact события", "Пока нет событий уровня high impact на ближайшее время.");
    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[Calendar] high error:", err);
    await ctx.reply("Не удалось загрузить календарь. Попробуйте позже.");
  }
});

bot.action("calendar_week", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply("⏳ Загружаю календарь на неделю...");
  try {
    const events = await economicCalendarProvider.getEvents();
    const filtered = events.filter((e) => e.impact === "high" || e.impact === "medium");
    const text = await renderCalendar(filtered, "🗓 События на неделю (high + medium)", "Нет значимых событий.");
    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[Calendar] week error:", err);
    await ctx.reply("Не удалось загрузить календарь. Попробуйте позже.");
  }
});

bot.command("calendar", async (ctx: any) => {
  const arg = ctx.message.text.replace(/^\/calendar\s*/i, "").trim().toLowerCase();
  await ctx.reply("⏳ Загружаю календарь...");
  try {
    if (arg === "today" || arg === "") {
      const events = await economicCalendarProvider.getTodayEvents();
      const text = await renderCalendar(events, "📆 События сегодня", "На сегодня значимых событий не запланировано.");
      await ctx.reply(text, { parse_mode: "HTML" });
      return;
    }
    if (arg === "high") {
      const events = await economicCalendarProvider.getUpcomingHighImpact(15);
      const text = await renderCalendar(events, "🔴 Ближайшие high impact события", "Пока нет high impact событий.");
      await ctx.reply(text, { parse_mode: "HTML" });
      return;
    }
    if (arg === "week") {
      const events = await economicCalendarProvider.getEvents();
      const filtered = events.filter((e) => e.impact === "high" || e.impact === "medium");
      const text = await renderCalendar(filtered, "🗓 События на неделю", "Нет значимых событий.");
      await ctx.reply(text, { parse_mode: "HTML" });
      return;
    }
    const country = arg.toUpperCase();
    const events = await economicCalendarProvider.getEventsForCountry(country);
    const text = await renderCalendar(events, `📅 События по ${country}`, `Нет событий по стране ${country}.`);
    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[Calendar] command error:", err);
    await ctx.reply("Не удалось загрузить календарь. Попробуйте позже.");
  }
});

// === Text handler ===

bot.on("text", async (ctx: any) => {
  const text = ctx.message.text.trim();
  const session = sessionStore.get(ctx.from.id);

  if (session.selectedInstrumentId) {
    sessionStore.patch(ctx.from.id, { ticker: text.toUpperCase() });

    await ctx.reply(
      [`Тикер сохранён: ${text.toUpperCase()}`, "Теперь можете перейти к оплате."].join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("💳 Перейти к оплате", `pay:${session.selectedInstrumentId}`)],
        [Markup.button.callback("🤖 Показать демо-аналитику", `demo:${session.selectedInstrumentId}`)]
      ])
    );
    return;
  }

  await ctx.reply("Используйте /start, чтобы открыть меню бота.", mainMenu());
});

bot.catch((error: unknown) => {
  console.error("Telegram bot error", error);
});

const app = createServer();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`HTTP server started on port ${port}`);
});

bot.launch().then(() => {
  console.log("AI Finance bot started");
  priceAlertService.start();
  morningDigestService.start();
});

process.once("SIGINT", () => {
  priceAlertService.stop();
  morningDigestService.stop();
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  priceAlertService.stop();
  morningDigestService.stop();
  bot.stop("SIGTERM");
});
