import axios from "axios";
import { MarketCache } from "../cache/market-cache.js";

export type EventImpact = "high" | "medium" | "low" | "holiday";

export type EconomicEvent = {
  id: string;
  title: string;
  country: string;
  date: Date;
  impact: EventImpact;
  forecast?: string;
  previous?: string;
  actual?: string;
};

type RawEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  actual?: string;
};

const FF_FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const TTL_CALENDAR = 60 * 60_000;
const FETCH_TIMEOUT = 10_000;

export class EconomicCalendarProvider {
  constructor(private cache: MarketCache) {}

  async getEvents(): Promise<EconomicEvent[]> {
    const cacheKey = "calendar:thisweek";
    const cached = this.cache.get<EconomicEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<RawEvent[]>(FF_FEED_URL, {
        timeout: FETCH_TIMEOUT,
        headers: { "User-Agent": "AI-Finance-Bot/1.0" },
      });
      const events = this.parseEvents(response.data);
      this.cache.set(cacheKey, events, TTL_CALENDAR);
      return events;
    } catch (err) {
      console.error("[EconomicCalendar] Failed to fetch:", err);
      return [];
    }
  }

  async getTodayEvents(): Promise<EconomicEvent[]> {
    const events = await this.getEvents();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    return events.filter((e) => e.date >= todayStart && e.date < todayEnd);
  }

  async getUpcomingHighImpact(maxItems = 10): Promise<EconomicEvent[]> {
    const events = await this.getEvents();
    const now = new Date();
    return events
      .filter((e) => e.impact === "high" && e.date >= now)
      .slice(0, maxItems);
  }

  async getEventsForCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getEvents();
    const upper = country.toUpperCase();
    return events.filter((e) => e.country.toUpperCase() === upper);
  }

  async getEventsRelevantTo(instrumentId: string): Promise<EconomicEvent[]> {
    const countries = mapInstrumentToCountries(instrumentId);
    if (countries.length === 0) return [];
    const events = await this.getEvents();
    return events.filter((e) => countries.includes(e.country.toUpperCase()));
  }

  private parseEvents(raw: RawEvent[]): EconomicEvent[] {
    if (!Array.isArray(raw)) return [];
    const events: EconomicEvent[] = [];
    raw.forEach((item, idx) => {
      const title = item.title?.trim();
      const dateStr = item.date?.trim();
      if (!title || !dateStr) return;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const impact = normalizeImpact(item.impact);

      events.push({
        id: `${idx}-${title.slice(0, 32)}`,
        title,
        country: item.country?.trim() ?? "",
        date,
        impact,
        forecast: item.forecast?.trim() || undefined,
        previous: item.previous?.trim() || undefined,
        actual: item.actual?.trim() || undefined,
      });
    });

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
  }
}

function normalizeImpact(raw: string | undefined): EventImpact {
  const lower = (raw ?? "").toLowerCase();
  if (lower.startsWith("high")) return "high";
  if (lower.startsWith("medium")) return "medium";
  if (lower.startsWith("low")) return "low";
  return "holiday";
}

const INSTRUMENT_TO_COUNTRIES: Record<string, string[]> = {
  "usd-rub": ["USD", "RUB"],
  "cny-rub": ["CNY", "RUB"],
  "eur-usd": ["USD", "EUR"],
  oil: ["USD"],
  gas: ["USD", "EUR"],
  gold: ["USD"],
  silver: ["USD"],
  "us-stocks": ["USD"],
  "ru-stocks": ["RUB"],
  imoex: ["RUB"],
  rgbi: ["RUB"],
  crypto: ["USD"],
};

function mapInstrumentToCountries(instrumentId: string): string[] {
  return INSTRUMENT_TO_COUNTRIES[instrumentId] ?? [];
}

export function formatEvent(event: EconomicEvent): string {
  const time = event.date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const impactIcon = impactEmoji(event.impact);
  const flag = countryFlag(event.country);
  const lines = [`${impactIcon} <b>${time} МСК</b> ${flag} ${escapeHtml(event.title)}`];
  const meta: string[] = [];
  if (event.forecast) meta.push(`прогноз: ${escapeHtml(event.forecast)}`);
  if (event.previous) meta.push(`пред: ${escapeHtml(event.previous)}`);
  if (event.actual) meta.push(`факт: ${escapeHtml(event.actual)}`);
  if (meta.length > 0) lines.push(`   ${meta.join(" | ")}`);
  return lines.join("\n");
}

export function impactEmoji(impact: EventImpact): string {
  switch (impact) {
    case "high":
      return "🔴";
    case "medium":
      return "🟠";
    case "low":
      return "🟡";
    case "holiday":
      return "⚪";
  }
}

const COUNTRY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CNY: "🇨🇳",
  RUB: "🇷🇺",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
};

function countryFlag(country: string): string {
  return COUNTRY_FLAGS[country.toUpperCase()] ?? country;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
