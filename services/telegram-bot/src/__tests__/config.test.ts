import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("config validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.YOOKASSA_SHOP_ID = "shop-1";
    process.env.YOOKASSA_SECRET_KEY = "secret-1";

    await expect(import("../config.js")).rejects.toThrow();
  });

  it("parses successfully without YOOKASSA credentials", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "token-1";
    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.YOOKASSA_SECRET_KEY;

    const mod = await import("../config.js");
    expect(mod.config).toBeDefined();
    expect(mod.config.YOOKASSA_SHOP_ID).toBeUndefined();
    expect(mod.config.YOOKASSA_SECRET_KEY).toBeUndefined();
  });

  it("parses successfully with all env variables", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.YOOKASSA_SHOP_ID = "test-shop";
    process.env.YOOKASSA_SECRET_KEY = "test-secret";

    const mod = await import("../config.js");
    expect(mod.config).toBeDefined();
    expect(mod.config.TELEGRAM_BOT_TOKEN).toBe("test-token");
    expect(mod.config.YOOKASSA_SHOP_ID).toBe("test-shop");
    expect(mod.config.YOOKASSA_SECRET_KEY).toBe("test-secret");
  });

  it("applies defaults for optional fields", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";

    const mod = await import("../config.js");
    expect(mod.config.OPENAI_MODEL).toBe("gpt-4o-mini");
    expect(mod.config.LOG_LEVEL).toBe("info");
  });
});
