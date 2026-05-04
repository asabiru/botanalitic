import type { Telegraf } from "telegraf";
import type { MarketDataService } from "../market-data.service.js";
import type { PriceAlertStore, PriceAlert } from "./price-alert-store.js";

export class PriceAlertService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly checkIntervalMs = 60_000;

  constructor(
    private readonly store: PriceAlertStore,
    private readonly marketData: MarketDataService,
    private readonly bot: Telegraf,
  ) {}

  start() {
    if (this.intervalId) return;
    console.log("[PriceAlerts] Started polling every 60s");
    this.intervalId = setInterval(() => void this.checkAlerts(), this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAlerts() {
    const activeAlerts = this.store.listAllActive();
    if (activeAlerts.length === 0) return;

    const byInstrument = new Map<string, PriceAlert[]>();
    for (const alert of activeAlerts) {
      const key = `${alert.instrumentId}:${alert.ticker}`;
      const existing = byInstrument.get(key) ?? [];
      existing.push(alert);
      byInstrument.set(key, existing);
    }

    for (const [key, alerts] of byInstrument.entries()) {
      const [instrumentId, ticker] = key.split(":");
      try {
        const price = await this.fetchPrice(instrumentId, ticker);
        if (price === null) continue;

        for (const alert of alerts) {
          const shouldTrigger =
            (alert.direction === "above" && price >= alert.targetPrice) ||
            (alert.direction === "below" && price <= alert.targetPrice);

          if (shouldTrigger) {
            this.store.trigger(alert.id);
            await this.notify(alert, price);
          }
        }
      } catch (err) {
        console.error(`[PriceAlerts] Error checking ${key}:`, err);
      }
    }
  }

  private async fetchPrice(instrumentId: string, ticker: string): Promise<number | null> {
    try {
      const ctx = await this.marketData.getMarketContext(instrumentId, ticker);
      return ctx.quote?.price ?? null;
    } catch {
      return null;
    }
  }

  private async notify(alert: PriceAlert, currentPrice: number) {
    const dirLabel = alert.direction === "above" ? "выше" : "ниже";
    const emoji = alert.direction === "above" ? "📈" : "📉";

    const message = [
      `${emoji} <b>Алерт сработал!</b>`,
      "",
      `<b>${alert.label}</b> (${alert.ticker})`,
      `Условие: цена ${dirLabel} ${alert.targetPrice.toFixed(2)}`,
      `Текущая цена: <b>${currentPrice.toFixed(2)}</b>`,
      "",
      `Алерт создан: ${alert.createdAt.slice(0, 16).replace("T", " ")} UTC`,
    ].join("\n");

    try {
      await this.bot.telegram.sendMessage(alert.telegramUserId, message, { parse_mode: "HTML" });
    } catch (err) {
      console.error(`[PriceAlerts] Failed to notify user ${alert.telegramUserId}:`, err);
    }
  }

  formatAlertsList(telegramUserId: number): string {
    const alerts = this.store.listByUser(telegramUserId);
    const counts = this.store.countByUser(telegramUserId);

    const lines: string[] = [
      "<b>🔔 Ваши алерты по ценам</b>",
      "",
      `Активных: ${counts.active} | Сработавших: ${counts.triggered}`,
      "",
    ];

    if (alerts.length === 0) {
      lines.push("У вас пока нет алертов.");
      lines.push("");
      lines.push("Чтобы добавить алерт, используйте команду:");
      lines.push("<code>/alert SBER above 300</code>");
      lines.push("<code>/alert BTC below 50000</code>");
      return lines.join("\n");
    }

    for (const a of alerts) {
      const dirLabel = a.direction === "above" ? "▲ выше" : "▼ ниже";
      const statusIcon = a.triggered ? "✅" : "🔔";
      lines.push(`${statusIcon} <b>${a.ticker}</b> — ${dirLabel} ${a.targetPrice}`);
      if (a.triggered && a.triggeredAt) {
        lines.push(`   Сработал: ${a.triggeredAt.slice(0, 16).replace("T", " ")} UTC`);
      }
    }

    return lines.join("\n");
  }
}
