import express from "express";
import { resolve } from "node:path";
import { bot, orderStore, aiAnalysisService } from "./app-context.js";
import { findInstrumentById } from "./catalog.js";
import { config } from "./config.js";
import { auditLog } from "./admin/audit-log.js";

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

    const analysis = await aiAnalysisService.generateAnalysis({
      instrument,
      ticker: order.ticker,
      investorProfile: order.investorProfile
    });

    await bot.telegram.sendMessage(
      order.telegramUserId,
      "✅ Оплата подтверждена. Отправляю ваш аналитический материал..."
    );

    await bot.telegram.sendMessage(order.telegramUserId, analysis, {
      parse_mode: "HTML"
    });

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

  // --- Admin HTTP API ---

  const adminDir = resolve(process.cwd(), "..", "..", "admin");

  app.use("/admin/dashboard", express.static(adminDir));

  function adminApiGuard(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const key = req.headers["x-admin-key"] as string | undefined;
    if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    next();
  }

  app.get("/admin/stats", adminApiGuard, (_req, res) => {
    auditLog("http_stats", "api");
    const all = orderStore.listAll();
    const paid = all.filter((o) => o.status === "paid" || o.status === "delivered");
    const totalRevenue = paid.reduce((sum, o) => sum + o.amountRub, 0);
    const avgCheck = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;
    const uniqueUsers = orderStore.uniqueUserIds().size;

    res.json({
      ok: true,
      stats: {
        totalOrders: all.length,
        paidOrders: paid.length,
        totalRevenue,
        avgCheck,
        uniqueUsers
      }
    });
  });

  app.get("/admin/orders", adminApiGuard, (req, res) => {
    auditLog("http_orders", "api");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const all = orderStore.listAll();
    const start = (page - 1) * limit;
    const orders = all.slice(start, start + limit);

    res.json({
      ok: true,
      page,
      limit,
      total: all.length,
      orders
    });
  });

  app.get("/admin/orders/:id", adminApiGuard, (req, res) => {
    const orderId = req.params.id as string;
    auditLog("http_order_detail", "api", `orderId=${orderId}`);
    const order = orderStore.getById(orderId);

    if (!order) {
      res.status(404).json({ ok: false, error: "order_not_found" });
      return;
    }

    res.json({ ok: true, order });
  });

  app.post("/admin/orders/:id/resend", adminApiGuard, async (req, res) => {
    const orderId = req.params.id as string;
    auditLog("http_resend", "api", `orderId=${orderId}`);

    const order = orderStore.getById(orderId);

    if (!order) {
      res.status(404).json({ ok: false, error: "order_not_found" });
      return;
    }

    const instrument = findInstrumentById(order.instrumentId);

    if (!instrument) {
      res.status(404).json({ ok: false, error: "instrument_not_found" });
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
      await bot.telegram.sendMessage(order.telegramUserId, analysis, {
        parse_mode: "HTML"
      });

      orderStore.update(order.id, { status: "delivered" });

      res.json({ ok: true, message: "analysis_resent" });
    } catch (error) {
      console.error("Resend failed", error);
      res.status(500).json({ ok: false, error: "resend_failed" });
    }
  });

  return app;
}