import express from "express";
import { Input } from "telegraf";
import { bot, orderStore, aiAnalysisService, marketDataService, competitorAgent, competitorResearchService, stockAnalyticsAgent, priceAlertStore, digestSubscriberStore, morningDigestService } from "./app-context.js";
import { findInstrumentById } from "./catalog.js";
import type { SuggestionStatus, SuggestionPriority } from "./integrations/competitor/competitor-suggestion-store.js";
import type { RiskLevel, Horizon } from "./integrations/analytics/stock-category-store.js";

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

  // === Competitor Agent API ===

  app.get("/api/competitors/report", async (_req, res) => {
    try {
      const report = await competitorResearchService.generateReport();
      res.json({ ok: true, report });
    } catch (err) {
      console.error("[API] competitor report error", err);
      res.status(500).json({ ok: false, error: "report_failed" });
    }
  });

  app.post("/api/competitors/analyze", async (_req, res) => {
    try {
      const { report, newSuggestions } = await competitorAgent.runFullAnalysis();
      res.json({
        ok: true,
        competitorsCount: report.competitors.length,
        ideasCount: report.topIdeas.length,
        suggestionsGenerated: newSuggestions.length,
      });
    } catch (err) {
      console.error("[API] competitor analyze error", err);
      res.status(500).json({ ok: false, error: "analysis_failed" });
    }
  });

  app.get("/api/suggestions", (req, res) => {
    const status = req.query.status as SuggestionStatus | undefined;
    const priority = req.query.priority as SuggestionPriority | undefined;
    res.json({ ok: true, suggestions: competitorAgent.getSuggestionStore().list({ status, priority }) });
  });

  app.patch("/api/suggestions/:id", (req, res) => {
    const { status } = req.body as { status?: SuggestionStatus };
    if (!status) {
      res.status(400).json({ ok: false, error: "status_required" });
      return;
    }
    const updated = competitorAgent.getSuggestionStore().update(req.params.id, { status });
    if (!updated) {
      res.status(404).json({ ok: false, error: "suggestion_not_found" });
      return;
    }
    res.json({ ok: true, suggestion: updated });
  });

  // === Stock Analytics Agent API ===

  app.get("/api/stock-categories", (req, res) => {
    const instrumentId = req.query.instrumentId as string | undefined;
    res.json({ ok: true, categories: stockAnalyticsAgent.listCategories(instrumentId) });
  });

  app.get("/api/stock-categories/:id", (req, res) => {
    const data = stockAnalyticsAgent.getCategoryWithStocks(req.params.id);
    if (!data) {
      res.status(404).json({ ok: false, error: "category_not_found" });
      return;
    }
    res.json({ ok: true, ...data });
  });

  app.post("/api/stock-categories", (req, res) => {
    const { name, description, icon, instrumentId } = req.body as {
      name?: string; description?: string; icon?: string; instrumentId?: string;
    };
    if (!name || !instrumentId) {
      res.status(400).json({ ok: false, error: "name_and_instrumentId_required" });
      return;
    }
    const category = stockAnalyticsAgent.getStore().addCategory({
      name,
      description: description ?? "",
      icon: icon ?? "📊",
      instrumentId,
    });
    res.status(201).json({ ok: true, category });
  });

  app.post("/api/stock-categories/:id/recommendations", (req, res) => {
    const { ticker, name, reason, riskLevel, horizon, targetPrice } = req.body as {
      ticker?: string; name?: string; reason?: string;
      riskLevel?: RiskLevel; horizon?: Horizon; targetPrice?: string;
    };
    if (!ticker || !name || !reason || !riskLevel || !horizon) {
      res.status(400).json({ ok: false, error: "missing_required_fields" });
      return;
    }
    const rec = stockAnalyticsAgent.addStock(req.params.id, { ticker, name, reason, riskLevel, horizon, targetPrice });
    if (!rec) {
      res.status(404).json({ ok: false, error: "category_not_found" });
      return;
    }
    res.status(201).json({ ok: true, recommendation: rec });
  });

  app.delete("/api/stock-categories/:categoryId/recommendations/:ticker", (req, res) => {
    const removed = stockAnalyticsAgent.removeStock(req.params.ticker, req.params.categoryId);
    if (!removed) {
      res.status(404).json({ ok: false, error: "recommendation_not_found" });
      return;
    }
    res.json({ ok: true });
  });

  app.get("/api/analytics/report", (_req, res) => {
    const categories = stockAnalyticsAgent.listCategories();
    const report = categories.map((cat) => ({
      ...cat,
      recommendations: stockAnalyticsAgent.getStore().listRecommendations(cat.id),
    }));
    res.json({ ok: true, report });
  });

  // === Price Alerts API ===

  app.get("/api/alerts", (req, res) => {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    if (userId) {
      res.json({ ok: true, alerts: priceAlertStore.listByUser(userId, false) });
    } else {
      res.json({ ok: true, alerts: priceAlertStore.listAllActive() });
    }
  });

  app.post("/api/alerts", (req, res) => {
    const { telegramUserId, instrumentId, ticker, targetPrice, direction, label } = req.body as {
      telegramUserId?: number; instrumentId?: string; ticker?: string;
      targetPrice?: number; direction?: string; label?: string;
    };
    if (!telegramUserId || !instrumentId || !ticker || !targetPrice || !direction) {
      res.status(400).json({ ok: false, error: "missing_required_fields" });
      return;
    }
    if (direction !== "above" && direction !== "below") {
      res.status(400).json({ ok: false, error: "direction_must_be_above_or_below" });
      return;
    }
    const alert = priceAlertStore.add({
      telegramUserId,
      instrumentId,
      ticker,
      targetPrice,
      direction,
      label: label ?? ticker,
    });
    res.status(201).json({ ok: true, alert });
  });

  app.delete("/api/alerts/:id", (req, res) => {
    const removed = priceAlertStore.deactivate(req.params.id);
    if (!removed) {
      res.status(404).json({ ok: false, error: "alert_not_found" });
      return;
    }
    res.json({ ok: true });
  });

  // === Digest API ===

  app.get("/api/digest/subscribers", (_req, res) => {
    const counts = digestSubscriberStore.count();
    res.json({ ok: true, ...counts, subscribers: digestSubscriberStore.listActive() });
  });

  app.post("/api/digest/subscribe", (req, res) => {
    const { telegramUserId } = req.body as { telegramUserId?: number };
    if (!telegramUserId) {
      res.status(400).json({ ok: false, error: "telegramUserId_required" });
      return;
    }
    const sub = digestSubscriberStore.subscribe(telegramUserId);
    res.json({ ok: true, subscriber: sub });
  });

  app.post("/api/digest/preview", async (_req, res) => {
    try {
      const preview = await morningDigestService.generateDigest();
      res.json({ ok: true, preview });
    } catch (err) {
      console.error("[API] digest preview error", err);
      res.status(500).json({ ok: false, error: "preview_failed" });
    }
  });

  return app;
}