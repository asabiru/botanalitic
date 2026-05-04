import express from "express";
import { resolve } from "node:path";
import { bot, orderStore, aiAnalysisService, marketDataService } from "./app-context.js";
import { findInstrumentById } from "./catalog.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { auditLog } from "./admin/audit-log.js";
import {
  validateWebhookIp,
  validateWebhookBody,
  YooKassaWebhookEvent
} from "./middleware/webhook-validation.js";

/** Set of paymentIds that have already been fully processed */
const processedPayments = new Set<string>();

/**
 * Send a message to admin chat (if configured) about a webhook processing error
 */
async function notifyAdmin(message: string): Promise<void> {
  if (!config.ADMIN_CHAT_ID) {
    return;
  }
  try {
    await bot.telegram.sendMessage(config.ADMIN_CHAT_ID, `⚠️ Webhook error:\n${message}`);
  } catch (err) {
    logger.error("Failed to notify admin", { error: String(err) });
  }
}

/**
 * Retry wrapper with exponential backoff (3 attempts)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.warn(`Retry ${attempt}/${maxAttempts} failed for ${label}`, {
        error: String(err)
      });
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 500; // 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export function createServer() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    "/webhooks/yookassa",
    validateWebhookIp,
    validateWebhookBody,
    async (req, res) => {
      const event = req.body as YooKassaWebhookEvent;
      const paymentId = event.object.id;

      logger.webhookEvent({
        timestamp: new Date().toISOString(),
        event: event.event,
        paymentId,
        status: event.object.status
      });

      // Only process payment.succeeded events
      if (event.event !== "payment.succeeded") {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      // Idempotent: skip if already processed
      if (processedPayments.has(paymentId)) {
        logger.info("Duplicate webhook ignored", { paymentId });
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }

      // Only skip re-processing for fully delivered orders
      const existingOrder = orderStore.getByPaymentId(paymentId);
      if (
        existingOrder &&
        existingOrder.status === "delivered"
      ) {
        processedPayments.add(paymentId);
        logger.info("Payment already processed (order status check)", {
          paymentId,
          orderId: existingOrder.id,
          status: existingOrder.status
        });
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }

      // Mark as in-progress immediately to prevent concurrent duplicates
      processedPayments.add(paymentId);
      let delivered = false;

      try {
        let order = orderStore.getByPaymentId(paymentId);

        if (!order && event.object.metadata?.orderId) {
          order = orderStore.getById(event.object.metadata.orderId);
        }

        if (!order) {
          logger.error("Order not found for payment", { paymentId });
          await notifyAdmin(`Order not found for paymentId: ${paymentId}`);
          res.status(404).json({ ok: false, error: "order_not_found" });
          return;
        }

        orderStore.update(order.id, { status: "paid", paymentId });

        const instrument = findInstrumentById(order.instrumentId);

        if (!instrument) {
          logger.error("Instrument not found", {
            paymentId,
            instrumentId: order.instrumentId
          });
          await notifyAdmin(
            `Instrument not found: ${order.instrumentId} (paymentId: ${paymentId})`
          );
          res.status(404).json({ ok: false, error: "instrument_not_found" });
          return;
        }

        let marketContext;
        try {
          marketContext = await marketDataService.getMarketContext(instrument.id, order.ticker);
        } catch (err) {
          logger.warn("Failed to fetch market context", { error: String(err) });
        }

        const analysis = await aiAnalysisService.generateAnalysis({
          instrument,
          ticker: order.ticker,
          investorProfile: order.investorProfile,
          marketContext
        });

        // Send confirmation only on first processing (not on YooKassa retry)
        if (!existingOrder || existingOrder.status !== "paid") {
          await bot.telegram.sendMessage(
            order.telegramUserId,
            "✅ Оплата подтверждена. Отправляю ваш аналитический материал..."
          );
        }

        // Retry only the analysis delivery with exponential backoff
        await withRetry(
          async () => {
            for (const chunk of analysis) {
              await bot.telegram.sendMessage(order.telegramUserId, chunk, {
                parse_mode: "HTML"
              });
            }
          },
          `telegram_send:${paymentId}`
        );

        orderStore.update(order.id, { status: "delivered" });
        delivered = true;

        logger.info("Payment processed successfully", {
          paymentId,
          orderId: order.id,
          status: "delivered"
        });

        res.status(200).json({ ok: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error("Webhook processing failed", {
          paymentId,
          error: errorMessage
        });
        await notifyAdmin(
          `Webhook processing failed for paymentId: ${paymentId}\nError: ${errorMessage}`
        );
        res.status(500).json({ ok: false, error: "internal_error" });
      } finally {
        // Only keep in processedPayments if delivery succeeded; otherwise allow retry
        if (!delivered) {
          processedPayments.delete(paymentId);
        }
      }
    }
  );

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
    const status = req.query.status as string | undefined;
    let all = orderStore.listAll();
    if (status) {
      all = all.filter((o) => o.status === status);
    }
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
