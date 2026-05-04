import type { Telegraf } from "telegraf";
import type { MarketDataService } from "../market-data.service.js";
import type { DigestSubscriberStore } from "./digest-subscriber-store.js";
import { fetchLiveQuote, formatQuote } from "../../quotes.js";

const DIGEST_INSTRUMENTS = [
  { id: "usd-rub", label: "💵 USD/RUB" },
  { id: "cny-rub", label: "🇨🇳 CNY/RUB" },
  { id: "oil", label: "🛢 Нефть Brent" },
  { id: "gold", label: "🥇 Золото" },
  { id: "imoex", label: "🇷🇺 Индекс Мосбиржи" },
  { id: "crypto", label: "₿ Bitcoin" },
  { id: "eur-usd", label: "🇪🇺 EUR/USD" },
];

export class MorningDigestService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSentDate: string | null = null;
  private readonly checkIntervalMs = 60_000;

  constructor(
    private readonly subscriberStore: DigestSubscriberStore,
    private readonly marketData: MarketDataService,
    private readonly bot: Telegraf,
  ) {}

  start() {
    if (this.intervalId) return;
    console.log("[MorningDigest] Started scheduler (checks every 60s for 08:00 MSK)");
    this.intervalId = setInterval(() => void this.checkAndSend(), this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getMoscowTime(): { hour: number; dateStr: string } {
    const now = new Date();
    const mskOffset = 3 * 60;
    const mskTime = new Date(now.getTime() + (mskOffset + now.getTimezoneOffset()) * 60_000);
    return {
      hour: mskTime.getHours(),
      dateStr: mskTime.toISOString().slice(0, 10),
    };
  }

  private async checkAndSend() {
    const { hour, dateStr } = this.getMoscowTime();

    if (hour !== 8) return;
    if (this.lastSentDate === dateStr) return;

    const subscribers = this.subscriberStore.listActive();
    if (subscribers.length === 0) return;

    this.lastSentDate = dateStr;
    console.log(`[MorningDigest] Sending digest to ${subscribers.length} subscribers`);

    const digest = await this.generateDigest();

    for (const sub of subscribers) {
      try {
        await this.bot.telegram.sendMessage(sub.telegramUserId, digest, { parse_mode: "HTML" });
      } catch (err) {
        console.error(`[MorningDigest] Failed to send to ${sub.telegramUserId}:`, err);
      }
    }
  }

  async generateDigest(): Promise<string> {
    const { dateStr } = this.getMoscowTime();

    const lines: string[] = [
      `☀️ <b>Утренний дайджест рынков</b>`,
      `<i>${dateStr} | 08:00 МСК</i>`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
    ];

    for (const instr of DIGEST_INSTRUMENTS) {
      try {
        const quote = await fetchLiveQuote(this.marketData, instr.id);
        if (quote) {
          const sign = quote.change >= 0 ? "+" : "";
          const arrow = quote.change >= 0 ? "▲" : "▼";
          lines.push(
            `${instr.label}: <b>${quote.currentPrice.toFixed(2)}</b> ${arrow} ${sign}${quote.changePercent.toFixed(2)}%`,
          );
        } else {
          lines.push(`${instr.label}: данные недоступны`);
        }
      } catch {
        lines.push(`${instr.label}: ошибка загрузки`);
      }
    }

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push("📊 Используйте /analytics для подробного анализа");
    lines.push("🔔 /alert — настроить уведомления по уровням цен");
    lines.push("");
    lines.push("<i>Отписаться: /digest off</i>");

    return lines.join("\n");
  }
}
