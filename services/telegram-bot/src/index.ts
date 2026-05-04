import { Markup } from "telegraf";
import { findInstrumentById, instrumentCatalog } from "./catalog.js";
import { createServer } from "./server.js";
import { aiAnalysisService, bot, marketDataService, orderStore, promoStore, referralStore, sessionStore, userRepository, yooKassaService } from "./app-context.js";
import { config } from "./config.js";
import { adminGuard } from "./admin/admin-guard.js";
import {
  handleAdminMenu,
  handleOrders,
  handleOrderDetail,
  handleStats,
  handleUsers,
  handleResend,
  handleBroadcast
} from "./admin/admin-handlers.js";
import { LEGAL_INFO_MESSAGE } from "./legal/legal-texts.js";

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📚 Каталог аналитики", "catalog")],
    [Markup.button.callback("🎁 Промокод", "promo_enter")],
    [Markup.button.callback("💳 Как купить", "buy_help")],
    [Markup.button.callback("🧾 Мои заявки", "my_orders")],
    [Markup.button.callback("ℹ️ О сервисе", "about")],
    [Markup.button.callback("📄 Юридическая информация", "legal")]
  ]);
}

function catalogKeyboard() {
  return Markup.inlineKeyboard(
    instrumentCatalog.map((item) => [Markup.button.callback(`${item.title} — ${item.priceRub} ₽`, `instrument:${item.id}`)])
  );
}

function calculateDiscount(priceRub: number, discountPercent: number): number {
  return Math.round(priceRub * (1 - discountPercent / 100));
}

function formatPriceWithDiscount(originalPrice: number, discountPercent: number, promoCode: string): string {
  const newPrice = calculateDiscount(originalPrice, discountPercent);
  return `Цена: <s>${originalPrice}₽</s> → ${newPrice}₽ (скидка ${discountPercent}% по промокоду ${promoCode})`;
}

bot.command("admin", adminGuard, handleAdminMenu);
bot.command("orders", adminGuard, handleOrders);
bot.command("order", adminGuard, handleOrderDetail);
bot.command("stats", adminGuard, handleStats);
bot.command("users", adminGuard, handleUsers);
bot.command("resend", adminGuard, handleResend);
bot.command("broadcast", adminGuard, handleBroadcast);

bot.start(async (ctx) => {
  sessionStore.clear(ctx.from.id);

  if (userRepository) {
    await userRepository.upsert(ctx.from.id, ctx.from.username);
  }

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

bot.action("catalog", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("Выберите инструмент для анализа:", catalogKeyboard());
});

bot.action("buy_help", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "Как проходит покупка:",
      "1. Вы выбираете рынок или актив.",
      "2. При необходимости присылаете тикер.",
      "3. Бот создаёт заказ и ссылку на оплату ЮKassa.",
      "4. После webhook-подтверждения оплаты бот отправляет аналитику автоматически.",
      "",
      "💡 Используйте промокод для получения скидки!"
    ].join("\n")
  );
});

bot.action("my_orders", async (ctx) => {
  await ctx.answerCbQuery();

  const orders = await orderStore.listByTelegramUserId(ctx.from.id);

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
          order.originalAmountRub
            ? `Сумма: ${order.amountRub} ₽ (было ${order.originalAmountRub} ₽, скидка ${order.discountPercent}%)`
            : `Сумма: ${order.amountRub} ₽`,
          order.promoCode ? `Промокод: ${order.promoCode}` : undefined,
          order.ticker ? `Тикер: ${order.ticker}` : undefined,
          `Создан: ${order.createdAt}`
        ]
          .filter(Boolean)
          .join("\n")
    )
    .join("\n\n");

  await ctx.reply(message);
});

bot.action("about", async (ctx) => {
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

/* ── Promo code flow ─────────────────────────────────────────── */

bot.action("promo_enter", async (ctx) => {
  await ctx.answerCbQuery();
  sessionStore.patch(ctx.from.id, { awaitingPromoInput: true });
  await ctx.reply("Введите промокод:");
});

bot.action("promo_clear", async (ctx) => {
  await ctx.answerCbQuery();
  sessionStore.patch(ctx.from.id, { appliedPromoCode: undefined });
  await ctx.reply("Промокод сброшен.", mainMenu());
});

/* ── Referral system ──────────────────────────────────────────── */

bot.command("referral", async (ctx) => {
  const record = referralStore.getOrCreate(ctx.from.id);
  const botUsername = config.TELEGRAM_BOT_USERNAME ?? (await bot.telegram.getMe()).username;

  await ctx.reply(
    [
      "🤝 <b>Реферальная программа</b>",
      "",
      `Ваш реферальный код: <code>${record.referralCode}</code>`,
      "",
      `Ссылка для друзей:`,
      `https://t.me/${botUsername}?start=${record.referralCode}`,
      "",
      `Приглашённых: ${record.referredUsers.length}`,
      "",
      "Когда друг введёт ваш реферальный код, он получит скидку 20%, а вы — уведомление и бонус на следующий заказ."
    ].join("\n"),
    { parse_mode: "HTML" }
  );
});

/* ── Legal ────────────────────────────────────────────────────── */

bot.command("legal", async (ctx) => {
  await ctx.reply(LEGAL_INFO_MESSAGE, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
});

bot.action("legal", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(LEGAL_INFO_MESSAGE, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
});

/* ── Instrument selection ─────────────────────────────────────── */

bot.action(/^instrument:(.+)$/, async (ctx) => {
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

  const session = sessionStore.get(ctx.from.id);
  const priceLines: string[] = [`Стоимость: <b>${instrument.priceRub} ₽</b>`];

  if (session.appliedPromoCode) {
    const result = promoStore.validate(session.appliedPromoCode);
    if (result.valid) {
      const discounted = calculateDiscount(instrument.priceRub, result.promo.discountPercent);
      priceLines.push(formatPriceWithDiscount(instrument.priceRub, result.promo.discountPercent, session.appliedPromoCode));
      priceLines[0] = `Стоимость со скидкой: <b>${discounted} ₽</b>`;
    }
  }

  await ctx.reply(
    [
      `<b>${instrument.title}</b>`,
      instrument.description,
      ...priceLines,
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

bot.action(/^demo:(.+)$/, async (ctx) => {
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

  const chunks = await aiAnalysisService.generateAnalysis({
    instrument,
    ticker: session.ticker,
    investorProfile: session.investorProfile,
    marketContext
  });

  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: "HTML" });
  }
});

/* ── Payment with promo discount ──────────────────────────────── */

bot.action(/^pay:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const instrument = findInstrumentById(ctx.match[1]);

  if (!instrument) {
    await ctx.reply("Инструмент не найден.");
    return;
  }

  const session = sessionStore.get(ctx.from.id);

  if (userRepository) {
    await userRepository.upsert(ctx.from.id, ctx.from.username);
  }

  let finalAmount = instrument.priceRub;
  let appliedCode: string | undefined;
  let discountPercent: number | undefined;
  let originalAmount: number | undefined;

  if (session.appliedPromoCode) {
    const result = promoStore.validate(session.appliedPromoCode);
    if (result.valid) {
      originalAmount = instrument.priceRub;
      discountPercent = result.promo.discountPercent;
      finalAmount = calculateDiscount(instrument.priceRub, discountPercent);
      appliedCode = session.appliedPromoCode;
    }
  }

  const order = await orderStore.create({
    telegramUserId: ctx.from.id,
    instrumentId: instrument.id,
    instrumentTitle: instrument.title,
    amountRub: finalAmount,
    ticker: session.ticker,
    investorProfile: session.investorProfile,
    promoCode: appliedCode,
    discountPercent,
    originalAmountRub: originalAmount
  });

  try {
    const payment = await yooKassaService.createPayment({
      instrument,
      telegramUserId: ctx.from.id,
      ticker: session.ticker,
      orderId: order.id,
      amountRub: finalAmount
    });

    await orderStore.update(order.id, {
      paymentId: payment.paymentId,
      paymentUrl: payment.confirmationUrl,
      status: "waiting_payment"
    });

    sessionStore.patch(ctx.from.id, {
      lastPaymentId: payment.paymentId,
      appliedPromoCode: undefined
    });

    const lines: string[] = [`Заказ создан: ${order.id}`];

    if (appliedCode && discountPercent && originalAmount) {
      lines.push(formatPriceWithDiscount(originalAmount, discountPercent, appliedCode));
    }

    lines.push(
      `Ссылка на оплату для ${instrument.title}:`,
      payment.confirmationUrl,
      "",
      "После успешной оплаты ЮKassa отправит webhook, и бот автоматически пришлёт результат."
    );

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } catch (error: unknown) {
    console.error("YooKassa createPayment error", error);
    await orderStore.update(order.id, { status: "cancelled" });
    await ctx.reply("Не удалось создать платёж. Проверьте настройки ЮKassa и попробуйте снова.");
  }
});

/* ── Admin commands ───────────────────────────────────────────── */

function isAdmin(userId: number): boolean {
  return config.ADMIN_CHAT_ID ? String(userId) === config.ADMIN_CHAT_ID : false;
}

bot.command("promo_list", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Команда доступна только администратору.");
    return;
  }

  const codes = promoStore.list();

  if (codes.length === 0) {
    await ctx.reply("Промокодов нет.");
    return;
  }

  const message = codes
    .map(
      (p) =>
        [
          `<b>${p.code}</b>`,
          `Скидка: ${p.discountPercent}%`,
          `Использовано: ${p.usedCount}${p.maxUses > 0 ? `/${p.maxUses}` : " (безлимит)"}`,
          `Активен: ${p.active ? "да" : "нет"}`,
          `Действует: ${p.validFrom.slice(0, 10)} — ${p.validUntil.slice(0, 10)}`
        ].join("\n")
    )
    .join("\n\n");

  await ctx.reply(message, { parse_mode: "HTML" });
});

bot.command("promo_create", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Команда доступна только администратору.");
    return;
  }

  const args = ctx.message.text.split(/\s+/).slice(1);

  if (args.length < 3) {
    await ctx.reply("Формат: /promo_create <code> <discount%> <maxUses>\nПример: /promo_create SUMMER25 25 50");
    return;
  }

  const [code, discountStr, maxUsesStr] = args;
  const discountPercent = parseInt(discountStr, 10);
  const maxUses = parseInt(maxUsesStr, 10);

  if (isNaN(discountPercent) || isNaN(maxUses)) {
    await ctx.reply("discount% и maxUses должны быть числами.");
    return;
  }

  const result = promoStore.create({
    code,
    discountPercent,
    maxUses,
    validFrom: new Date().toISOString(),
    validUntil: "2030-12-31T23:59:59Z",
    active: true,
  });

  if ("error" in result) {
    await ctx.reply(`Ошибка: ${result.error}`);
    return;
  }

  await ctx.reply(`Промокод <b>${result.code}</b> создан (скидка ${result.discountPercent}%, макс. ${result.maxUses || "безлимит"}).`, { parse_mode: "HTML" });
});

bot.command("promo_deactivate", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("Команда доступна только администратору.");
    return;
  }

  const code = ctx.message.text.split(/\s+/)[1];

  if (!code) {
    await ctx.reply("Формат: /promo_deactivate <code>");
    return;
  }

  const result = promoStore.deactivate(code);

  if (!result) {
    await ctx.reply("Промокод не найден.");
    return;
  }

  await ctx.reply(`Промокод <b>${result.code}</b> деактивирован.`, { parse_mode: "HTML" });
});

/* ── Text handler (ticker + promo input) ──────────────────────── */

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  const session = sessionStore.get(ctx.from.id);

  if (session.awaitingPromoInput) {
    sessionStore.patch(ctx.from.id, { awaitingPromoInput: false });

    const referralRecord = referralStore.getByCode(text.toUpperCase());
    if (referralRecord) {
      const refResult = referralStore.applyReferral(text.toUpperCase(), ctx.from.id);
      if (refResult.success) {
        sessionStore.patch(ctx.from.id, { referralCode: text.toUpperCase(), appliedPromoCode: text.toUpperCase() });

        const referralPromoResult = promoStore.validate("FRIEND20");
        if (referralPromoResult.valid) {
          sessionStore.patch(ctx.from.id, { appliedPromoCode: "FRIEND20" });
          await ctx.reply(
            [
              `✅ Реферальный код принят!`,
              `Вам доступна скидка ${referralPromoResult.promo.discountPercent}% (промокод FRIEND20).`,
              "",
              "Скидка будет применена при оплате."
            ].join("\n"),
            mainMenu()
          );
        } else {
          sessionStore.patch(ctx.from.id, { appliedPromoCode: undefined });
          await ctx.reply("✅ Реферальный код принят, но скидка по реферальной программе сейчас недоступна.", mainMenu());
        }

        if (refResult.referrerUserId) {
          try {
            await bot.telegram.sendMessage(
              refResult.referrerUserId,
              "🎉 По вашей реферальной ссылке зарегистрировался новый пользователь! Вам доступна скидка на следующий заказ."
            );
          } catch {
            // referrer may have blocked the bot
          }
        }
        return;
      } else {
        await ctx.reply(`❌ ${refResult.error}`, mainMenu());
        return;
      }
    }

    const result = promoStore.validate(text);
    if (result.valid) {
      sessionStore.patch(ctx.from.id, { appliedPromoCode: result.promo.code });
      await ctx.reply(
        [
          `✅ Промокод <b>${result.promo.code}</b> принят!`,
          `Скидка: ${result.promo.discountPercent}%`,
          "",
          "Скидка будет применена при следующей оплате."
        ].join("\n"),
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("📚 Перейти к каталогу", "catalog")],
            [Markup.button.callback("❌ Сбросить промокод", "promo_clear")]
          ])
        }
      );
    } else {
      await ctx.reply(`❌ ${result.reason}`, mainMenu());
    }
    return;
  }

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
  console.log("AI Market View bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
