import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrderStore } from "../order-store.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));

describe("OrderStore", () => {
  let store: OrderStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new OrderStore();
  });

  describe("create", () => {
    it("creates an order with generated id and timestamps", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });

      expect(order.id).toBeTruthy();
      expect(order.telegramUserId).toBe(100);
      expect(order.instrumentId).toBe("gold");
      expect(order.amountRub).toBe(1990);
      expect(order.status).toBe("created");
      expect(order.createdAt).toBeTruthy();
      expect(order.updatedAt).toBeTruthy();
    });

    it("allows custom initial status", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "oil",
        instrumentTitle: "Нефть",
        amountRub: 1790,
        status: "waiting_payment"
      });
      expect(order.status).toBe("waiting_payment");
    });

    it("indexes by paymentId when provided", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990,
        paymentId: "pay-123"
      });
      expect(store.getByPaymentId("pay-123")).toEqual(order);
    });
  });

  describe("update", () => {
    it("updates existing order fields", async () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });

      await new Promise((r) => setTimeout(r, 10));

      const updated = store.update(order.id, { status: "paid" });
      expect(updated).toBeDefined();
      expect(updated!.status).toBe("paid");
      expect(updated!.id).toBe(order.id);
    });

    it("returns undefined for non-existent order", () => {
      expect(store.update("nonexistent", { status: "paid" })).toBeUndefined();
    });

    it("updates payment index when paymentId is set", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });

      store.update(order.id, { paymentId: "pay-456" });
      const found = store.getByPaymentId("pay-456");
      expect(found).toBeDefined();
      expect(found!.id).toBe(order.id);
    });
  });

  describe("getById", () => {
    it("returns order by id", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });
      expect(store.getById(order.id)).toEqual(order);
    });

    it("returns undefined for non-existent id", () => {
      expect(store.getById("nonexistent")).toBeUndefined();
    });
  });

  describe("getByPaymentId", () => {
    it("returns order by payment id", () => {
      const order = store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990,
        paymentId: "pay-789"
      });
      expect(store.getByPaymentId("pay-789")!.id).toBe(order.id);
    });

    it("returns undefined for unknown payment id", () => {
      expect(store.getByPaymentId("unknown")).toBeUndefined();
    });
  });

  describe("listByTelegramUserId", () => {
    it("returns orders for a specific user", () => {
      store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });
      store.create({
        telegramUserId: 100,
        instrumentId: "oil",
        instrumentTitle: "Нефть",
        amountRub: 1790
      });
      store.create({
        telegramUserId: 200,
        instrumentId: "silver",
        instrumentTitle: "Серебро",
        amountRub: 1990
      });

      const orders = store.listByTelegramUserId(100);
      expect(orders).toHaveLength(2);
      expect(orders.every((o) => o.telegramUserId === 100)).toBe(true);
    });

    it("returns empty array for user with no orders", () => {
      expect(store.listByTelegramUserId(999)).toEqual([]);
    });

    it("returns orders sorted by createdAt descending", () => {
      store.create({
        telegramUserId: 100,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990
      });
      store.create({
        telegramUserId: 100,
        instrumentId: "oil",
        instrumentTitle: "Нефть",
        amountRub: 1790
      });

      const orders = store.listByTelegramUserId(100);
      expect(orders[0].createdAt >= orders[1].createdAt).toBe(true);
    });
  });
});
