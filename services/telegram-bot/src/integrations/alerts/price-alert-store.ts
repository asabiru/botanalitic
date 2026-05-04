import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type AlertDirection = "above" | "below";

export type PriceAlert = {
  id: string;
  telegramUserId: number;
  instrumentId: string;
  ticker: string;
  targetPrice: number;
  direction: AlertDirection;
  label: string;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
};

type PersistedState = {
  alerts: PriceAlert[];
};

export class PriceAlertStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "price-alerts.json");
  private alerts = new Map<string, PriceAlert>();

  constructor() {
    this.load();
  }

  add(input: {
    telegramUserId: number;
    instrumentId: string;
    ticker: string;
    targetPrice: number;
    direction: AlertDirection;
    label: string;
  }): PriceAlert {
    const alert: PriceAlert = {
      id: randomUUID(),
      isActive: true,
      triggered: false,
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.alerts.set(alert.id, alert);
    this.save();
    return alert;
  }

  trigger(id: string): PriceAlert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    const updated: PriceAlert = {
      ...alert,
      triggered: true,
      isActive: false,
      triggeredAt: new Date().toISOString(),
    };
    this.alerts.set(id, updated);
    this.save();
    return updated;
  }

  deactivate(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    this.alerts.set(id, { ...alert, isActive: false });
    this.save();
    return true;
  }

  listByUser(telegramUserId: number, activeOnly = true): PriceAlert[] {
    let result = [...this.alerts.values()].filter((a) => a.telegramUserId === telegramUserId);
    if (activeOnly) result = result.filter((a) => a.isActive);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listAllActive(): PriceAlert[] {
    return [...this.alerts.values()]
      .filter((a) => a.isActive && !a.triggered)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  countByUser(telegramUserId: number): { active: number; triggered: number } {
    const userAlerts = [...this.alerts.values()].filter((a) => a.telegramUserId === telegramUserId);
    return {
      active: userAlerts.filter((a) => a.isActive && !a.triggered).length,
      triggered: userAlerts.filter((a) => a.triggered).length,
    };
  }

  private load() {
    if (!existsSync(this.storagePath)) return;
    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedState;
      for (const a of parsed.alerts ?? []) this.alerts.set(a.id, a);
    } catch (error) {
      console.error("Failed to load price alerts", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });
      const payload: PersistedState = { alerts: [...this.alerts.values()] };
      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist price alerts", error);
    }
  }
}
