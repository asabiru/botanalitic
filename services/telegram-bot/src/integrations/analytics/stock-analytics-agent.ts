import { StockCategoryStore, StockCategory, StockRecommendation } from "./stock-category-store.js";

export class StockAnalyticsAgent {
  constructor(private readonly store: StockCategoryStore) {}

  listCategories(instrumentId?: string): StockCategory[] {
    return this.store.listCategories(instrumentId);
  }

  getCategoryWithStocks(categoryId: string): { category: StockCategory; stocks: StockRecommendation[] } | null {
    const category = this.store.getCategory(categoryId);
    if (!category) return null;
    const stocks = this.store.listRecommendations(categoryId);
    return { category, stocks };
  }

  addStock(
    categoryId: string,
    input: { ticker: string; name: string; reason: string; riskLevel: StockRecommendation["riskLevel"]; horizon: StockRecommendation["horizon"]; targetPrice?: string },
  ): StockRecommendation | null {
    const category = this.store.getCategory(categoryId);
    if (!category) return null;

    const existing = this.store.findByTicker(input.ticker, categoryId);
    if (existing) return existing;

    return this.store.addRecommendation({ categoryId, ...input });
  }

  removeStock(ticker: string, categoryId?: string): boolean {
    const rec = this.store.findByTicker(ticker, categoryId);
    if (!rec) return false;
    this.store.deactivateRecommendation(rec.id);
    return true;
  }

  formatCategoryCard(categoryId: string): string | null {
    const data = this.getCategoryWithStocks(categoryId);
    if (!data) return null;

    const { category, stocks } = data;
    const riskLabels: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий" };
    const horizonLabels: Record<string, string> = { short: "Краткосрочный", medium: "Среднесрочный", long: "Долгосрочный" };

    const lines: string[] = [
      `${category.icon} <b>${category.name}</b>`,
      `<i>${category.description}</i>`,
      "",
      `Акций в категории: ${stocks.length}`,
      "",
    ];

    if (stocks.length === 0) {
      lines.push("Пока нет рекомендаций в этой категории.");
      return lines.join("\n");
    }

    for (const s of stocks) {
      const riskIcon = s.riskLevel === "low" ? "🟢" : s.riskLevel === "medium" ? "🟡" : "🔴";
      lines.push(`<b>${s.ticker}</b> — ${s.name}`);
      lines.push(`   ${riskIcon} Риск: ${riskLabels[s.riskLevel]} | Горизонт: ${horizonLabels[s.horizon]}`);
      if (s.targetPrice) lines.push(`   🎯 Цель: ${s.targetPrice}`);
      lines.push(`   💡 ${s.reason}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  formatInstrumentCategories(instrumentId: string): string {
    const categories = this.listCategories(instrumentId);

    const instrumentLabels: Record<string, string> = {
      "ru-stocks": "📈 Акции РФ",
      "us-stocks": "🇺🇸 Акции США",
      crypto: "₿ Криптовалюты",
    };

    const lines: string[] = [
      `<b>${instrumentLabels[instrumentId] ?? instrumentId} — категории</b>`,
      "",
    ];

    if (categories.length === 0) {
      lines.push("Нет категорий для этого инструмента.");
      return lines.join("\n");
    }

    for (const cat of categories) {
      const stocks = this.store.listRecommendations(cat.id);
      lines.push(`${cat.icon} <b>${cat.name}</b> (${stocks.length} акций)`);
      lines.push(`   ${cat.description}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  formatFullReport(): string {
    const allCategories = this.store.listCategories();
    const allStocks = this.store.listAllActive();

    const lines: string[] = [
      "<b>📊 Полный аналитический отчёт по категориям</b>",
      "",
      `Всего категорий: ${allCategories.length}`,
      `Всего рекомендаций: ${allStocks.length}`,
      "",
    ];

    const byInstrument = new Map<string, StockCategory[]>();
    for (const cat of allCategories) {
      const existing = byInstrument.get(cat.instrumentId) ?? [];
      existing.push(cat);
      byInstrument.set(cat.instrumentId, existing);
    }

    const instrumentLabels: Record<string, string> = {
      "ru-stocks": "📈 Акции РФ",
      "us-stocks": "🇺🇸 Акции США",
      crypto: "₿ Криптовалюты",
    };

    for (const [instId, cats] of byInstrument.entries()) {
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push(`<b>${instrumentLabels[instId] ?? instId}</b>`);
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");

      for (const cat of cats) {
        const stocks = this.store.listRecommendations(cat.id);
        lines.push(`${cat.icon} <b>${cat.name}</b>`);
        if (stocks.length === 0) {
          lines.push("   Нет рекомендаций");
        } else {
          for (const s of stocks) {
            const riskIcon = s.riskLevel === "low" ? "🟢" : s.riskLevel === "medium" ? "🟡" : "🔴";
            lines.push(`   ${riskIcon} ${s.ticker} — ${s.name}`);
          }
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  getStore(): StockCategoryStore {
    return this.store;
  }
}
