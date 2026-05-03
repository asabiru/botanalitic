import { describe, it, expect } from "vitest";
import { instrumentCatalog, findInstrumentById } from "../catalog.js";

describe("instrumentCatalog", () => {
  it("contains exactly 12 instruments", () => {
    expect(instrumentCatalog).toHaveLength(12);
  });

  it("every instrument has required fields", () => {
    for (const item of instrumentCatalog) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.priceRub).toBeGreaterThan(0);
      expect(item.promptHint).toBeTruthy();
    }
  });

  it("all ids are unique", () => {
    const ids = instrumentCatalog.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const expectedIds = [
    "cny-rub",
    "usd-rub",
    "oil",
    "gas",
    "gold",
    "silver",
    "us-stocks",
    "ru-stocks",
    "imoex",
    "rgbi",
    "crypto",
    "eur-usd"
  ];

  it.each(expectedIds)("contains instrument '%s'", (id) => {
    const found = instrumentCatalog.find((i) => i.id === id);
    expect(found).toBeDefined();
  });
});

describe("findInstrumentById", () => {
  it("returns instrument when id exists", () => {
    const result = findInstrumentById("gold");
    expect(result).toBeDefined();
    expect(result!.id).toBe("gold");
    expect(result!.title).toContain("Золото");
  });

  it("returns undefined for unknown id", () => {
    expect(findInstrumentById("nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(findInstrumentById("")).toBeUndefined();
  });
});
