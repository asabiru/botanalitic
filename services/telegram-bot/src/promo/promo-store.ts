import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type PromoCode = {
  code: string;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  createdAt: string;
};

type PersistedPromoState = {
  promoCodes: PromoCode[];
};

const MAX_DISCOUNT_PERCENT = 50;

export class PromoStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "promo-codes.json");
  private codes = new Map<string, PromoCode>();

  constructor() {
    this.load();
    this.seedDefaults();
  }

  create(input: Omit<PromoCode, "usedCount" | "createdAt">): PromoCode | { error: string } {
    const key = input.code.toUpperCase();

    if (this.codes.has(key)) {
      return { error: "Промокод уже существует" };
    }

    if (input.discountPercent <= 0 || input.discountPercent > MAX_DISCOUNT_PERCENT) {
      return { error: `Скидка должна быть от 1 до ${MAX_DISCOUNT_PERCENT}%` };
    }

    const promo: PromoCode = {
      ...input,
      code: key,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.codes.set(key, promo);
    this.save();
    return promo;
  }

  getByCode(code: string): PromoCode | undefined {
    return this.codes.get(code.toUpperCase());
  }

  validate(code: string): { valid: true; promo: PromoCode } | { valid: false; reason: string } {
    const promo = this.getByCode(code);

    if (!promo) {
      return { valid: false, reason: "Промокод не найден" };
    }

    if (!promo.active) {
      return { valid: false, reason: "Промокод деактивирован" };
    }

    const now = new Date();

    if (now < new Date(promo.validFrom)) {
      return { valid: false, reason: "Промокод ещё не действует" };
    }

    if (now > new Date(promo.validUntil)) {
      return { valid: false, reason: "Промокод истёк" };
    }

    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return { valid: false, reason: "Лимит использований исчерпан" };
    }

    return { valid: true, promo };
  }

  use(code: string): PromoCode | { error: string } {
    const result = this.validate(code);

    if (!result.valid) {
      return { error: result.reason };
    }

    const promo = result.promo;
    promo.usedCount += 1;
    this.codes.set(promo.code, promo);
    this.save();
    return promo;
  }

  deactivate(code: string): PromoCode | undefined {
    const promo = this.getByCode(code);

    if (!promo) {
      return undefined;
    }

    promo.active = false;
    this.codes.set(promo.code, promo);
    this.save();
    return promo;
  }

  list(): PromoCode[] {
    return [...this.codes.values()];
  }

  private seedDefaults() {
    const defaults: Omit<PromoCode, "usedCount" | "createdAt">[] = [
      {
        code: "LAUNCH100",
        discountPercent: 30,
        maxUses: 100,
        validFrom: "2024-01-01T00:00:00Z",
        validUntil: "2030-12-31T23:59:59Z",
        active: true,
      },
      {
        code: "FRIEND20",
        discountPercent: 20,
        maxUses: 0,
        validFrom: "2024-01-01T00:00:00Z",
        validUntil: "2030-12-31T23:59:59Z",
        active: true,
      },
      {
        code: "FIRST",
        discountPercent: 15,
        maxUses: 0,
        validFrom: "2024-01-01T00:00:00Z",
        validUntil: "2030-12-31T23:59:59Z",
        active: true,
      },
    ];

    for (const def of defaults) {
      if (!this.codes.has(def.code)) {
        this.codes.set(def.code, {
          ...def,
          usedCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.save();
  }

  private load() {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedPromoState;

      for (const promo of parsed.promoCodes ?? []) {
        this.codes.set(promo.code, promo);
      }
    } catch (error) {
      console.error("Failed to load persisted promo codes", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });

      const payload: PersistedPromoState = {
        promoCodes: [...this.codes.values()],
      };

      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist promo codes", error);
    }
  }
}
