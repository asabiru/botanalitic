import express from "express";
import { bot, orderStore, aiAnalysisService } from "./app-context.js";
import { findInstrumentById } from "./catalog.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
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

        const analysis = await aiAnalysisService.generateAnalysis({
          instrument,
          ticker: order.ticker,
          investorProfile: order.investorProfile
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

  return app;
}
