import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InstrumentCategory } from "../catalog.js";

vi.mock("../config.js", () => ({
  config: {
    TELEGRAM_BOT_TOKEN: "test-token",
    YOOKASSA_SHOP_ID: "shop-test",
    YOOKASSA_SECRET_KEY: "secret-test",
    YOOKASSA_RETURN_URL: "https://t.me/testbot"
  }
}));

const mockPost = vi.fn();
vi.mock("axios", () => ({
  default: { post: mockPost }
}));

describe("YooKassaService", () => {
  const instrument: InstrumentCategory = {
    id: "gold",
    title: "🥇 Золото",
    description: "Защитный актив",
    priceRub: 1990,
    promptHint: "Анализ золота"
  };

  beforeEach(() => {
    mockPost.mockReset();
  });

  it("creates payment with correct params", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "pay-abc",
        confirmation: { confirmation_url: "https://yookassa.ru/pay/abc" }
      }
    });

    const { YooKassaService } = await import("../yookassa.js");
    const service = new YooKassaService();

    const result = await service.createPayment({
      instrument,
      telegramUserId: 123,
      ticker: "XAUUSD",
      orderId: "order-1"
    });

    expect(result.paymentId).toBe("pay-abc");
    expect(result.confirmationUrl).toBe("https://yookassa.ru/pay/abc");

    expect(mockPost).toHaveBeenCalledOnce();
    const [url, payload, options] = mockPost.mock.calls[0];
    expect(url).toBe("https://api.yookassa.ru/v3/payments");
    expect(payload.amount.value).toBe("1990.00");
    expect(payload.amount.currency).toBe("RUB");
    expect(payload.metadata.telegramUserId).toBe("123");
    expect(payload.metadata.instrumentId).toBe("gold");
    expect(payload.metadata.ticker).toBe("XAUUSD");
    expect(payload.metadata.orderId).toBe("order-1");
    expect(options.auth.username).toBe("shop-test");
    expect(options.auth.password).toBe("secret-test");
  });

  it("handles missing ticker and orderId", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "pay-def",
        confirmation: { confirmation_url: "https://yookassa.ru/pay/def" }
      }
    });

    const { YooKassaService } = await import("../yookassa.js");
    const service = new YooKassaService();

    const result = await service.createPayment({
      instrument,
      telegramUserId: 456
    });

    expect(result.paymentId).toBe("pay-def");

    const [, payload] = mockPost.mock.calls[0];
    expect(payload.metadata.ticker).toBe("");
    expect(payload.metadata.orderId).toBe("");
  });

  it("propagates API errors", async () => {
    mockPost.mockRejectedValue(new Error("Network error"));

    const { YooKassaService } = await import("../yookassa.js");
    const service = new YooKassaService();

    await expect(
      service.createPayment({ instrument, telegramUserId: 789 })
    ).rejects.toThrow("Network error");
  });
});
