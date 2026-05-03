import { Markup } from "telegraf";
import { findInstrumentById, instrumentCatalog } from "./catalog.js";
import { createServer } from "./server.js";
import { aiAnalysisService, bot, marketDataService, orderStore, sessionStore, yooKassaService } from "./app-context.js";

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📚 Каталог аналитики", "catalog")],
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
      "Привет! Я бот <b>AI Market View</b>.",
      "",
      "Я помогаю клиентам купить аналитический разбор по рынкам и инструментам:",
      "• валюты",
      "• сырьё",
      "• акции США и РФ",
      "• индексы",
      "• криптовалюты",
      "",
      "Оплата проходит через ЮKassa.",
      "После подтверждения оплаты бот может автоматически отправить аналитический материал.",
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
      "4. После webhook-подтверждения оплаты бот отправляет аналитику автоматически."
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
      "AI Market View — сервис продажи аналитики по финансовым рынкам.",
      "Источники идей и данных: Investing.com, TradingView, Bloomberg, X.com.",
      "",
      "Формат результата:",
      "• краткий рыночный обзор",
      "• ключевые уровни",
      "• сценарии",
      "• риски",
      "• идея по горизонту"
    ].join("\n")
  );
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

  await ctx.reply(
    [
      `<b>${instrument.title}</b>`,
      instrument.description,
      `Стоимость: <b>${instrument.priceRub} ₽</b>`,
      "",
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

  const session = sessionStore.get(ctx.from.id);

  let marketContext;
  try {
    marketContext = await marketDataService.getMarketContext(instrument.id, session.ticker);
  } catch (err) {
    console.error("Failed to fetch market context:", err);
  }

  const analysis = await aiAnalysisService.generateAnalysis({
    instrument,
    ticker: session.ticker,
    investorProfile: session.investorProfile,
    marketContext
  });

  await ctx.reply(analysis, { parse_mode: "HTML" });
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
  } catch (error: any) {
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

bot.catch((error: any) => {
  console.error("Telegram bot error", error);
});

const app = createServer();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`HTTP server started on port ${port}`);
});

bot.launch().then(() => {
  console.log("AI Market View bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));