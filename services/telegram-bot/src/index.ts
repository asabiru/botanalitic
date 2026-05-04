import { Markup } from "telegraf";
import { Input } from "telegraf";
import { findInstrumentById, instrumentCatalog } from "./catalog.js";
import { fetchLiveQuote, formatQuote } from "./quotes.js";
import { createServer } from "./server.js";
import { aiAnalysisService, bot, marketDataService, orderStore, sessionStore, yooKassaService } from "./app-context.js";
import type { AnalysisResult } from "./ai-analysis.js";

async function sendAnalysisResult(ctx: any, result: AnalysisResult): Promise<void> {
  await ctx.reply(result.text, { parse_mode: "HTML" });

  for (const chart of result.charts) {
    await ctx.replyWithPhoto(Input.fromBuffer(chart, "chart.png"));
  }
}

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📚 Каталог аналитики", "catalog")],
    [Markup.button.callback("📊 Котировки (live)", "quotes_menu")],
    [Markup.button.callback("💳 Как купить", "buy_help")],
    [Markup.button.callback("🧾 Мои заявки", "my_orders")],
    [Markup.button.callback("ℹ️ О сервисе", "about")]
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

bot.action("quotes_menu", async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Выберите инструмент для просмотра котировок в реальном времени:",
    Markup.inlineKeyboard(
      instrumentCatalog.map((item) => [Markup.button.callback(item.title, `quote:${item.id}`)])
    )
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
      [Markup.button.callback("◀️ Назад к котировкам", "quotes_menu")]
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
  const marketContext = await marketDataService.getMarketContext(instrument.id, session.ticker);

  const result = await aiAnalysisService.generateAnalysis({
    instrument,
    ticker: session.ticker,
    investorProfile: session.investorProfile,
    marketContext,
  });

  await sendAnalysisResult(ctx, result);
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
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
