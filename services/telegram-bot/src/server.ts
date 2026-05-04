import express from "express";
import { Input } from "telegraf";
import { bot, orderStore, aiAnalysisService, marketDataService } from "./app-context.js";
import { findInstrumentById } from "./catalog.js";

type YooKassaWebhookEvent = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: {
      telegramUserId?: string;
      instrumentId?: string;
      ticker?: string;
      orderId?: string;
    };
  };
};

export function createServer() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/webhooks/yookassa", async (req, res) => {
    const event = req.body as YooKassaWebhookEvent;

    if (event.event !== "payment.succeeded" || !event.object?.id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const paymentId = event.object.id;
    let order = orderStore.getByPaymentId(paymentId);

    if (!order && event.object.metadata?.orderId) {
      order = orderStore.getById(event.object.metadata.orderId);
    }

    if (!order) {
      res.status(404).json({ ok: false, error: "order_not_found" });
      return;
    }

    orderStore.update(order.id, { status: "paid" });

    const instrument = findInstrumentById(order.instrumentId);

    if (!instrument) {
      res.status(404).json({ ok: false, error: "instrument_not_found" });
      return;
    }

    const marketContext = await marketDataService.getMarketContext(instrument.id, order.ticker);

    const result = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker: order.ticker,
      investorProfile: order.investorProfile,
      marketContext,
    });

    await bot.telegram.sendMessage(
      order.telegramUserId,
      "✅ Оплата подтверждена. Отправляю ваш аналитический материал..."
    );

    await bot.telegram.sendMessage(order.telegramUserId, result.text, {
      parse_mode: "HTML"
    });

    for (const chart of result.charts) {
      await bot.telegram.sendPhoto(order.telegramUserId, Input.fromBuffer(chart, "chart.png"));
    }

    orderStore.update(order.id, { status: "delivered" });

    res.status(200).json({ ok: true });
  });

  app.get("/orders/:telegramUserId", (req, res) => {
    const telegramUserId = Number(req.params.telegramUserId);

    if (Number.isNaN(telegramUserId)) {
      res.status(400).json({ ok: false, error: "invalid_telegram_user_id" });
      return;
    }

    res.json({
      ok: true,
      orders: orderStore.listByTelegramUserId(telegramUserId)
    });
  });

  return app;
}