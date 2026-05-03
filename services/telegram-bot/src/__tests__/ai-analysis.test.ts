import { describe, it, expect } from "vitest";
import { AiAnalysisService } from "../ai-analysis.js";
import type { InstrumentCategory } from "../catalog.js";

describe("AiAnalysisService", () => {
  const service = new AiAnalysisService();

  const mockInstrument: InstrumentCategory = {
    id: "gold",
    title: "🥇 Золото",
    description: "Защитный актив",
    priceRub: 1990,
    promptHint: "Сделай инвестиционный анализ золота."
  };

  it("generates analysis (demo fallback)", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes instrument title in the output", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain(mockInstrument.title);
  });

  it("contains all required sections", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain("Базовый сценарий");
    expect(result).toContain("Что смотрим");
    expect(result).toContain("Сценарии");
    expect(result).toContain("Риски");
    expect(result).toContain("Идея для клиента");
  });

  it("contains disclaimer", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain("не является индивидуальной инвестиционной рекомендацией");
  });

  it("includes ticker when provided", async () => {
    const result = await service.generateAnalysis({
      instrument: mockInstrument,
      ticker: "XAUUSD"
    });
    expect(result).toContain("XAUUSD");
  });

  it("includes investor profile when provided", async () => {
    const result = await service.generateAnalysis({
      instrument: mockInstrument,
      investorProfile: "Консервативный"
    });
    expect(result).toContain("Консервативный");
  });

  it("handles missing ticker gracefully", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain("Тикер не требуется");
  });

  it("handles missing profile gracefully", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain("не указан");
  });

  it("includes promptHint in the output", async () => {
    const result = await service.generateAnalysis({ instrument: mockInstrument });
    expect(result).toContain(mockInstrument.promptHint);
  });
});
