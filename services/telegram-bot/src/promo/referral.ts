import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

export type ReferralRecord = {
  referrerUserId: number;
  referralCode: string;
  referredUsers: number[];
  createdAt: string;
};

type PersistedReferralState = {
  referrals: ReferralRecord[];
};

const REFERRAL_DISCOUNT_PERCENT = 20;

export class ReferralStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "referrals.json");
  private byUserId = new Map<number, ReferralRecord>();
  private byCode = new Map<string, ReferralRecord>();

  constructor() {
    this.load();
  }

  getOrCreate(userId: number): ReferralRecord {
    const existing = this.byUserId.get(userId);

    if (existing) {
      return existing;
    }

    const code = `REF${userId}_${randomBytes(3).toString("hex").toUpperCase()}`;
    const record: ReferralRecord = {
      referrerUserId: userId,
      referralCode: code,
      referredUsers: [],
      createdAt: new Date().toISOString(),
    };

    this.byUserId.set(userId, record);
    this.byCode.set(code, record);
    this.save();
    return record;
  }

  getByCode(code: string): ReferralRecord | undefined {
    return this.byCode.get(code.toUpperCase());
  }

  getByUserId(userId: number): ReferralRecord | undefined {
    return this.byUserId.get(userId);
  }

  applyReferral(referralCode: string, newUserId: number): {
    success: boolean;
    discountPercent: number;
    referrerUserId?: number;
    error?: string;
  } {
    const record = this.getByCode(referralCode);

    if (!record) {
      return { success: false, discountPercent: 0, error: "Реферальный код не найден" };
    }

    if (record.referrerUserId === newUserId) {
      return { success: false, discountPercent: 0, error: "Нельзя использовать свой реферальный код" };
    }

    if (record.referredUsers.includes(newUserId)) {
      return { success: false, discountPercent: 0, error: "Вы уже использовали этот реферальный код" };
    }

    record.referredUsers.push(newUserId);
    this.save();

    return {
      success: true,
      discountPercent: REFERRAL_DISCOUNT_PERCENT,
      referrerUserId: record.referrerUserId,
    };
  }

  get discountPercent(): number {
    return REFERRAL_DISCOUNT_PERCENT;
  }

  private load() {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedReferralState;

      for (const record of parsed.referrals ?? []) {
        this.byUserId.set(record.referrerUserId, record);
        this.byCode.set(record.referralCode, record);
      }
    } catch (error) {
      console.error("Failed to load persisted referrals", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });

      const payload: PersistedReferralState = {
        referrals: [...this.byUserId.values()],
      };

      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist referrals", error);
    }
  }
}
