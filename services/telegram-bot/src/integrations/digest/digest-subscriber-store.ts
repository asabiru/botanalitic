import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DigestSubscriber = {
  telegramUserId: number;
  subscribedAt: string;
  isActive: boolean;
};

type PersistedState = {
  subscribers: DigestSubscriber[];
};

export class DigestSubscriberStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "digest-subscribers.json");
  private subscribers = new Map<number, DigestSubscriber>();

  constructor() {
    this.load();
  }

  subscribe(telegramUserId: number): DigestSubscriber {
    const existing = this.subscribers.get(telegramUserId);
    if (existing && existing.isActive) return existing;

    const sub: DigestSubscriber = {
      telegramUserId,
      subscribedAt: new Date().toISOString(),
      isActive: true,
    };
    this.subscribers.set(telegramUserId, sub);
    this.save();
    return sub;
  }

  unsubscribe(telegramUserId: number): boolean {
    const existing = this.subscribers.get(telegramUserId);
    if (!existing || !existing.isActive) return false;
    this.subscribers.set(telegramUserId, { ...existing, isActive: false });
    this.save();
    return true;
  }

  isSubscribed(telegramUserId: number): boolean {
    const sub = this.subscribers.get(telegramUserId);
    return sub?.isActive ?? false;
  }

  listActive(): DigestSubscriber[] {
    return [...this.subscribers.values()].filter((s) => s.isActive);
  }

  count(): { active: number; total: number } {
    const all = [...this.subscribers.values()];
    return {
      active: all.filter((s) => s.isActive).length,
      total: all.length,
    };
  }

  private load() {
    if (!existsSync(this.storagePath)) return;
    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedState;
      for (const s of parsed.subscribers ?? []) this.subscribers.set(s.telegramUserId, s);
    } catch (error) {
      console.error("Failed to load digest subscribers", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });
      const payload: PersistedState = { subscribers: [...this.subscribers.values()] };
      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist digest subscribers", error);
    }
  }
}
