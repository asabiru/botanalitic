import express from "express";
import { bot, orderStore, aiAnalysisService, prisma } from "./app-context.js";
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
    res.json({ ok: true, database: prisma ? "postgres" : "file" });
  });

  app.post("/webhooks/yookassa", async (req, res) => {
    const event = req.body as YooKassaWebhookEvent;

    if (event.event !== "payment.succeeded" || !event.object?.id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const paymentId = event.object.id;
    let order = await orderStore.getByPaymentId(paymentId);

    if (!order && event.object.metadata?.orderId) {
      order = await orderStore.getById(event.object.metadata.orderId);
    }

    if (!order) {
      res.status(404).json({ ok: false, error: "order_not_found" });
      return;
    }

    await orderStore.update(order.id, { status: "paid" });

    const instrument = findInstrumentById(order.instrumentId);

    if (!instrument) {
      res.status(404).json({ ok: false, error: "instrument_not_found" });
      return;
    }

    const analysis = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker: order.ticker,
      investorProfile: order.investorProfile
    });

    await bot.telegram.sendMessage(
      order.telegramUserId,
      "\u2705 \u041e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u044e \u0432\u0430\u0448 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b..."
    );

    await bot.telegram.sendMessage(order.telegramUserId, analysis, {
      parse_mode: "HTML"
    });

    await orderStore.update(order.id, { status: "delivered" });

    res.status(200).json({ ok: true });
  });

  app.get("/orders/:telegramUserId", async (req, res) => {
    const telegramUserId = Number(req.params.telegramUserId);

    if (Number.isNaN(telegramUserId)) {
      res.status(400).json({ ok: false, error: "invalid_telegram_user_id" });
      return;
    }

    res.json({
      ok: true,
      orders: await orderStore.listByTelegramUserId(telegramUserId)
    });
  });

  return app;
}
