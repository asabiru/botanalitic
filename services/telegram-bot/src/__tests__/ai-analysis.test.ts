import { describe, it, expect } from "vitest";
import { AiAnalysisService } from "../ai-analysis.js";
import type { InstrumentCategory } from "../catalog.js";

describe("AiAnalysisService", () => {
  const service = new AiAnalysisService(null, "gpt-4o-mini", 2048);

  const mockInstrument: InstrumentCategory = {
    id: "gold",
    title: "🥇 Золото",
    description: "Защитный актив",
    priceRub: 1990,
    promptHint: "Сделай инвестиционный анализ золота."
  };

  it("generates analysis (demo fallback)", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    const result = chunks.join("\n");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes instrument title in the output", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain(mockInstrument.title);
  });

  it("contains all required sections", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain("Обзор рынка");
    expect(result).toContain("Ключевые уровни");
    expect(result).toContain("Сценарии");
    expect(result).toContain("Риски");
    expect(result).toContain("Идея для клиента");
  });

  it("contains disclaimer", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain("не является индивидуальной инвестиционной рекомендацией");
  });

  it("includes ticker when provided", async () => {
    const chunks = await service.generateAnalysis({
      instrument: mockInstrument,
      ticker: "XAUUSD"
    });
    const result = chunks.join("\n");
    expect(result).toContain("XAUUSD");
  });

  it("includes investor profile when provided", async () => {
    const chunks = await service.generateAnalysis({
      instrument: mockInstrument,
      investorProfile: "Консервативный"
    });
    const result = chunks.join("\n");
    expect(result).toContain("Консервативный");
  });

  it("handles missing ticker gracefully", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain("Тикер не требуется");
  });

  it("handles missing profile gracefully", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain("не указан");
  });

  it("includes promptHint in the output", async () => {
    const chunks = await service.generateAnalysis({ instrument: mockInstrument });
    const result = chunks.join("\n");
    expect(result).toContain(mockInstrument.promptHint);
  });
});
