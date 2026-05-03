import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type OrderStatus =
  | "created"
  | "waiting_payment"
  | "paid"
  | "delivered"
  | "cancelled";

export type OrderRecord = {
  id: string;
  telegramUserId: number;
  instrumentId: string;
  instrumentTitle: string;
  amountRub: number;
  ticker?: string;
  investorProfile?: string;
  paymentId?: string;
  paymentUrl?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

type PersistedOrderState = {
  orders: OrderRecord[];
};

export class OrderStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "orders.json");
  private orders = new Map<string, OrderRecord>();
  private paymentIndex = new Map<string, string>();

  constructor() {
    this.load();
  }

  create(input: Omit<OrderRecord, "id" | "createdAt" | "updatedAt" | "status"> & { status?: OrderStatus }): OrderRecord {
    const now = new Date().toISOString();
    const order: OrderRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: input.status ?? "created",
      ...input
    };

    this.orders.set(order.id, order);

    if (order.paymentId) {
      this.paymentIndex.set(order.paymentId, order.id);
    }

    this.save();
    return order;
  }

  update(orderId: string, patch: Partial<OrderRecord>): OrderRecord | undefined {
    const current = this.orders.get(orderId);

    if (!current) {
      return undefined;
    }

    const updated: OrderRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.orders.set(orderId, updated);

    if (updated.paymentId) {
      this.paymentIndex.set(updated.paymentId, updated.id);
    }

    this.save();
    return updated;
  }

  getById(orderId: string): OrderRecord | undefined {
    return this.orders.get(orderId);
  }

  getByPaymentId(paymentId: string): OrderRecord | undefined {
    const orderId = this.paymentIndex.get(paymentId);
    return orderId ? this.orders.get(orderId) : undefined;
  }

  listByTelegramUserId(telegramUserId: number): OrderRecord[] {
    return [...this.orders.values()]
      .filter((order) => order.telegramUserId === telegramUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private load() {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedOrderState;

      for (const order of parsed.orders ?? []) {
        this.orders.set(order.id, order);

        if (order.paymentId) {
          this.paymentIndex.set(order.paymentId, order.id);
        }
      }
    } catch (error) {
      console.error("Failed to load persisted orders", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });

      const payload: PersistedOrderState = {
        orders: [...this.orders.values()]
      };

      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist orders", error);
    }
  }
}