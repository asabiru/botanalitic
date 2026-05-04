import { Context } from "telegraf";
import { orderStore, aiAnalysisService, bot } from "../app-context.js";
import { findInstrumentById } from "../catalog.js";
import type { OrderRecord } from "../order-store.js";
import { auditLog } from "./audit-log.js";

function getMessageText(ctx: Context): string {
  const msg = ctx.message;
  if (msg && "text" in msg) return msg.text;
  return "";
}

function getUserId(ctx: Context): number {
  return ctx.from?.id ?? 0;
}

export async function handleAdminMenu(ctx: Context): Promise<void> {
  auditLog("admin_menu", getUserId(ctx));
  await ctx.reply(
    [
      "<b>Admin Panel</b>",
      "",
      "/admin — это меню",
      "/orders — последние 20 заказов",
      "/order &lt;id&gt; — детали заказа",
      "/stats — статистика",
      "/users — количество пользователей",
      "/resend &lt;orderId&gt; — перевыдача аналитики",
      "/broadcast &lt;text&gt; — рассылка всем пользователям"
    ].join("\n"),
    { parse_mode: "HTML" }
  );
}

export async function handleOrders(ctx: Context): Promise<void> {
  auditLog("orders_list", getUserId(ctx));
  const allOrders = await orderStore.listAll();
  const orders = allOrders.slice(0, 20);

  if (orders.length === 0) {
    await ctx.reply("Заказов пока нет.");
    return;
  }

  const lines = orders.map(
    (o: OrderRecord) =>
      `#${o.id.slice(0, 8)} | ${o.status} | ${o.amountRub} ₽ | ${String(o.createdAt).slice(0, 10)}`
  );

  await ctx.reply(["<b>Последние 20 заказов:</b>", "", ...lines].join("\n"), {
    parse_mode: "HTML"
  });
}

function extractArg(text: string, _command: string): string {
  const idx = text.indexOf(" ");
  if (idx === -1) return "";
  return text.slice(idx + 1).trim();
}

export async function handleOrderDetail(ctx: Context): Promise<void> {
  const text = getMessageText(ctx);
  const orderId = extractArg(text, "order");

  if (!orderId) {
    await ctx.reply("Использование: /order <id>");
    return;
  }

  auditLog("order_detail", getUserId(ctx), `orderId=${orderId}`);

  const order = await orderStore.getById(orderId);

  if (!order) {
    await ctx.reply(`Заказ ${orderId} не найден.`);
    return;
  }

  await ctx.reply(
    [
      `<b>Заказ #${order.id}</b>`,
      "",
      `Пользователь: ${order.telegramUserId}`,
      `Инструмент: ${order.instrumentTitle}`,
      `Тикер: ${order.ticker ?? "—"}`,
      `Сумма: ${order.amountRub} ₽`,
      `Статус: ${order.status}`,
      `Создан: ${order.createdAt}`,
      `Обновлён: ${order.updatedAt}`,
      `Payment ID: ${order.paymentId ?? "—"}`
    ].join("\n"),
    { parse_mode: "HTML" }
  );
}

export async function handleStats(ctx: Context): Promise<void> {
  auditLog("stats", getUserId(ctx));

  const all = await orderStore.listAll();
  const paid = all.filter((o: OrderRecord) => o.status === "paid" || o.status === "delivered");
  const totalRevenue = paid.reduce((sum: number, o: OrderRecord) => sum + o.amountRub, 0);
  const avgCheck = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;
  const uniqueUsers = await orderStore.uniqueUserIds();

  await ctx.reply(
    [
      "<b>Статистика</b>",
      "",
      `Всего заказов: ${all.length}`,
      `Оплаченных: ${paid.length}`,
      `Выручка: ${totalRevenue} ₽`,
      `Средний чек: ${avgCheck} ₽`,
      `Уникальных пользователей: ${uniqueUsers.length}`
    ].join("\n"),
    { parse_mode: "HTML" }
  );
}

export async function handleUsers(ctx: Context): Promise<void> {
  auditLog("users", getUserId(ctx));
  const userIds = await orderStore.uniqueUserIds();
  await ctx.reply(`Уникальных пользователей: ${userIds.length}`);
}

export async function handleResend(ctx: Context): Promise<void> {
  const text = getMessageText(ctx);
  const orderId = extractArg(text, "resend");

  if (!orderId) {
    await ctx.reply("Использование: /resend <orderId>");
    return;
  }

  auditLog("resend", getUserId(ctx), `orderId=${orderId}`);

  const order = await orderStore.getById(orderId);

  if (!order) {
    await ctx.reply(`Заказ ${orderId} не найден.`);
    return;
  }

  const instrument = findInstrumentById(order.instrumentId);

  if (!instrument) {
    await ctx.reply(`Инструмент ${order.instrumentId} не найден.`);
    return;
  }

  try {
    const analysis = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker: order.ticker,
      investorProfile: order.investorProfile
    });

    await bot.telegram.sendMessage(
      order.telegramUserId,
      "📨 Повторная отправка аналитики по вашему заказу:"
    );
    for (const chunk of analysis) {
      await bot.telegram.sendMessage(order.telegramUserId, chunk, {
        parse_mode: "HTML"
      });
    }

    await orderStore.update(order.id, { status: "delivered" });

    await ctx.reply(`Аналитика по заказу ${orderId} отправлена повторно.`);
  } catch (error) {
    console.error("Resend failed", error);
    await ctx.reply(`Ошибка при перевыдаче: ${String(error)}`);
  }
}

export async function handleBroadcast(ctx: Context): Promise<void> {
  const text = getMessageText(ctx);
  const message = extractArg(text, "broadcast");

  if (!message) {
    await ctx.reply("Использование: /broadcast <текст сообщения>");
    return;
  }

  auditLog("broadcast", getUserId(ctx), `message=${message.slice(0, 100)}`);

  const userIds = await orderStore.uniqueUserIds();
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      await bot.telegram.sendMessage(userId, message);
      sent++;
    } catch {
      failed++;
    }
  }

  await ctx.reply(`Рассылка завершена. Отправлено: ${sent}, ошибок: ${failed}`);
}
