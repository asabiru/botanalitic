import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import http from "node:http";
import { OrderStore } from "../order-store.js";
import { AiAnalysisService } from "../ai-analysis.js";

const mockSendMessage = vi.fn().mockResolvedValue(undefined);
const testOrderStore = new OrderStore();
const testAiService = new AiAnalysisService();

vi.mock("../app-context.js", () => ({
  bot: { telegram: { sendMessage: mockSendMessage } },
  orderStore: testOrderStore,
  aiAnalysisService: testAiService
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));

function request(
  server: http.Server,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      reject(new Error("Server not ready"));
      return;
    }
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: addr.port,
      path,
      method,
      headers: { "Content-Type": "application/json" }
    };

    const req = http.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk: string) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: {} });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("server integration", () => {
  let server: http.Server;

  beforeAll(async () => {
    const serverMod = await import("../server.js");
    const app = serverMod.createServer();
    server = app.listen(0);
  });

  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  afterAll(() => {
    if (server) server.close();
  });

  describe("GET /health", () => {
    it("returns 200 with ok:true", async () => {
      const res = await request(server, "GET", "/health");
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
    });
  });

  describe("POST /webhooks/yookassa", () => {
    it("ignores non-payment.succeeded events", async () => {
      const res = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.waiting_for_capture",
        object: { id: "pay-1" }
      });
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true, ignored: true });
    });

    it("ignores events without object.id", async () => {
      const res = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: {}
      });
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true, ignored: true });
    });

    it("returns 404 when order not found", async () => {
      const res = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: { id: "pay-unknown", metadata: {} }
      });
      expect(res.status).toBe(404);
      expect(res.data).toMatchObject({ ok: false, error: "order_not_found" });
    });

    it("processes valid payment.succeeded and delivers analysis", async () => {
      const order = testOrderStore.create({
        telegramUserId: 42,
        instrumentId: "gold",
        instrumentTitle: "Золото",
        amountRub: 1990,
        paymentId: "pay-success-1"
      });

      const res = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: { id: "pay-success-1", status: "succeeded" }
      });

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
      expect(mockSendMessage).toHaveBeenCalledTimes(2);

      const updated = testOrderStore.getById(order.id);
      expect(updated!.status).toBe("delivered");
    });

    it("handles idempotent re-delivery", async () => {
      testOrderStore.create({
        telegramUserId: 43,
        instrumentId: "oil",
        instrumentTitle: "Нефть",
        amountRub: 1790,
        paymentId: "pay-idem-1"
      });

      const res1 = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: { id: "pay-idem-1", status: "succeeded" }
      });
      expect(res1.status).toBe(200);

      mockSendMessage.mockClear();

      const res2 = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: { id: "pay-idem-1", status: "succeeded" }
      });
      expect(res2.status).toBe(200);
    });

    it("finds order by metadata.orderId when paymentId lookup fails", async () => {
      const order = testOrderStore.create({
        telegramUserId: 44,
        instrumentId: "silver",
        instrumentTitle: "Серебро",
        amountRub: 1990
      });

      const res = await request(server, "POST", "/webhooks/yookassa", {
        event: "payment.succeeded",
        object: {
          id: "pay-meta-1",
          status: "succeeded",
          metadata: { orderId: order.id }
        }
      });

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
    });
  });

  describe("GET /orders/:telegramUserId", () => {
    it("returns orders for user", async () => {
      const res = await request(server, "GET", "/orders/42");
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(Array.isArray(res.data.orders)).toBe(true);
    });

    it("returns 400 for invalid telegramUserId", async () => {
      const res = await request(server, "GET", "/orders/abc");
      expect(res.status).toBe(400);
      expect(res.data).toMatchObject({ ok: false, error: "invalid_telegram_user_id" });
    });
  });
});
