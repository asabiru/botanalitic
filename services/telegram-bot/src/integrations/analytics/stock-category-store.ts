import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type StockCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  instrumentId: string;
  createdAt: string;
};

export type RiskLevel = "low" | "medium" | "high";
export type Horizon = "short" | "medium" | "long";

export type StockRecommendation = {
  id: string;
  categoryId: string;
  ticker: string;
  name: string;
  reason: string;
  targetPrice?: string;
  riskLevel: RiskLevel;
  horizon: Horizon;
  addedAt: string;
  updatedAt: string;
  isActive: boolean;
};

type PersistedState = {
  categories: StockCategory[];
  recommendations: StockRecommendation[];
};

export class StockCategoryStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "stock-categories.json");
  private categories = new Map<string, StockCategory>();
  private recommendations = new Map<string, StockRecommendation>();

  constructor() {
    this.load();
    this.seedDefaults();
  }

  addCategory(input: Omit<StockCategory, "id" | "createdAt">): StockCategory {
    const category: StockCategory = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.categories.set(category.id, category);
    this.save();
    return category;
  }

  getCategory(id: string): StockCategory | undefined {
    return this.categories.get(id);
  }

  listCategories(instrumentId?: string): StockCategory[] {
    let result = [...this.categories.values()];
    if (instrumentId) result = result.filter((c) => c.instrumentId === instrumentId);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  addRecommendation(input: Omit<StockRecommendation, "id" | "addedAt" | "updatedAt" | "isActive">): StockRecommendation {
    const now = new Date().toISOString();
    const rec: StockRecommendation = {
      id: randomUUID(),
      addedAt: now,
      updatedAt: now,
      isActive: true,
      ...input,
    };
    this.recommendations.set(rec.id, rec);
    this.save();
    return rec;
  }

  updateRecommendation(id: string, patch: Partial<StockRecommendation>): StockRecommendation | undefined {
    const current = this.recommendations.get(id);
    if (!current) return undefined;
    const updated: StockRecommendation = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.recommendations.set(id, updated);
    this.save();
    return updated;
  }

  deactivateRecommendation(id: string): StockRecommendation | undefined {
    return this.updateRecommendation(id, { isActive: false });
  }

  listRecommendations(categoryId: string, activeOnly = true): StockRecommendation[] {
    let result = [...this.recommendations.values()].filter((r) => r.categoryId === categoryId);
    if (activeOnly) result = result.filter((r) => r.isActive);
    return result.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  findByTicker(ticker: string, categoryId?: string): StockRecommendation | undefined {
    const upper = ticker.toUpperCase();
    return [...this.recommendations.values()].find(
      (r) => r.ticker.toUpperCase() === upper && r.isActive && (!categoryId || r.categoryId === categoryId)
    );
  }

  listAllActive(): StockRecommendation[] {
    return [...this.recommendations.values()]
      .filter((r) => r.isActive)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  private seedDefaults() {
    if (this.categories.size > 0) return;

    const defaultCategories: Omit<StockCategory, "id" | "createdAt">[] = [
      { name: "Дивидендные акции РФ", description: "Акции российских компаний с высокой дивидендной доходностью", icon: "💰", instrumentId: "ru-stocks" },
      { name: "Акции роста РФ", description: "Быстрорастущие российские компании с потенциалом роста капитализации", icon: "🚀", instrumentId: "ru-stocks" },
      { name: "Голубые фишки РФ", description: "Наиболее ликвидные и стабильные акции российского рынка", icon: "💎", instrumentId: "ru-stocks" },
      { name: "Недооценённые акции РФ", description: "Акции с низкими мультипликаторами и потенциалом переоценки", icon: "🔍", instrumentId: "ru-stocks" },
      { name: "Tech-акции США", description: "Технологические гиганты и перспективные IT-компании", icon: "💻", instrumentId: "us-stocks" },
      { name: "Дивидендные аристократы США", description: "Компании, повышающие дивиденды 25+ лет подряд", icon: "👑", instrumentId: "us-stocks" },
      { name: "Акции роста США", description: "Быстрорастущие американские компании", icon: "📈", instrumentId: "us-stocks" },
      { name: "Крипто — Layer 1", description: "Основные блокчейн-платформы первого уровня", icon: "⛓", instrumentId: "crypto" },
      { name: "Крипто — DeFi", description: "Токены децентрализованных финансовых протоколов", icon: "🏦", instrumentId: "crypto" },
      { name: "Крипто — мемкоины", description: "Высоковолатильные мем-токены с высоким риском", icon: "🐕", instrumentId: "crypto" },
    ];

    const categoryIds: string[] = [];
    for (const cat of defaultCategories) {
      const created = this.addCategory(cat);
      categoryIds.push(created.id);
    }

    const defaultRecs: { ci: number; data: Omit<StockRecommendation, "id" | "addedAt" | "updatedAt" | "isActive" | "categoryId"> }[] = [
      { ci: 0, data: { ticker: "SBER", name: "Сбербанк", reason: "Стабильные дивиденды, P/E ниже исторического среднего, рост прибыли", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "LKOH", name: "Лукойл", reason: "Высокая дивидендная доходность, buyback программа, сильный денежный поток", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "GMKN", name: "Норникель", reason: "Дивидендная политика, уникальные активы, мировой лидер по палладию", riskLevel: "medium", horizon: "long" } },
      { ci: 1, data: { ticker: "OZON", name: "Ozon", reason: "Быстрый рост выручки, экспансия в регионы, улучшение юнит-экономики", riskLevel: "high", horizon: "long" } },
      { ci: 1, data: { ticker: "POSI", name: "Positive Technologies", reason: "Лидер кибербезопасности в РФ, рост выручки 50%+ YoY", riskLevel: "medium", horizon: "medium" } },
      { ci: 2, data: { ticker: "GAZP", name: "Газпром", reason: "Крупнейшая газовая компания мира, инфраструктурный монополист", riskLevel: "medium", horizon: "long" } },
      { ci: 2, data: { ticker: "ROSN", name: "Роснефть", reason: "Крупнейшая нефтяная компания РФ, проект Восток Ойл", riskLevel: "medium", horizon: "long" } },
      { ci: 3, data: { ticker: "MTSS", name: "МТС", reason: "Низкий P/E, стабильные дивиденды, развитие экосистемы", riskLevel: "low", horizon: "medium" } },
      { ci: 4, data: { ticker: "AAPL", name: "Apple", reason: "Крупнейшая компания мира, экосистемный эффект, сильный buyback", targetPrice: "$220", riskLevel: "low", horizon: "long" } },
      { ci: 4, data: { ticker: "NVDA", name: "NVIDIA", reason: "Лидер AI-чипов, экспоненциальный рост data center сегмента", targetPrice: "$150", riskLevel: "medium", horizon: "long" } },
      { ci: 4, data: { ticker: "MSFT", name: "Microsoft", reason: "Azure рост, интеграция AI (Copilot), диверсифицированный бизнес", targetPrice: "$480", riskLevel: "low", horizon: "long" } },
      { ci: 5, data: { ticker: "JNJ", name: "Johnson & Johnson", reason: "60+ лет роста дивидендов, фармацевтический гигант", targetPrice: "$175", riskLevel: "low", horizon: "long" } },
      { ci: 5, data: { ticker: "KO", name: "Coca-Cola", reason: "62 года роста дивидендов, глобальный бренд, защитный актив", targetPrice: "$65", riskLevel: "low", horizon: "long" } },
      { ci: 6, data: { ticker: "TSLA", name: "Tesla", reason: "Лидер EV, рост поставок, развитие AI и робототехники", targetPrice: "$300", riskLevel: "high", horizon: "long" } },
      { ci: 7, data: { ticker: "ETH", name: "Ethereum", reason: "Крупнейшая smart-contract платформа, стейкинг, дефляционная модель", riskLevel: "medium", horizon: "long" } },
      { ci: 7, data: { ticker: "SOL", name: "Solana", reason: "Высокая скорость транзакций, растущая экосистема DeFi и NFT", riskLevel: "high", horizon: "medium" } },
      { ci: 8, data: { ticker: "UNI", name: "Uniswap", reason: "Крупнейший DEX, fee switch потенциал, растущие объёмы", riskLevel: "high", horizon: "medium" } },
      { ci: 8, data: { ticker: "AAVE", name: "Aave", reason: "Лидер lending протоколов, мультичейн экспансия", riskLevel: "high", horizon: "medium" } },
      { ci: 9, data: { ticker: "DOGE", name: "Dogecoin", reason: "Сильное community, высокая ликвидность среди мемкоинов", riskLevel: "high", horizon: "short" } },
      { ci: 9, data: { ticker: "PEPE", name: "Pepe", reason: "Топ мемкоин по капитализации, вирусный рост, высокий риск", riskLevel: "high", horizon: "short" } },
    ];

    for (const rec of defaultRecs) {
      const catId = categoryIds[rec.ci];
      if (catId) this.addRecommendation({ ...rec.data, categoryId: catId });
    }
  }

  private load() {
    if (!existsSync(this.storagePath)) return;
    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedState;
      for (const c of parsed.categories ?? []) this.categories.set(c.id, c);
      for (const r of parsed.recommendations ?? []) this.recommendations.set(r.id, r);
    } catch (error) {
      console.error("Failed to load stock category data", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });
      const payload: PersistedState = {
        categories: [...this.categories.values()],
        recommendations: [...this.recommendations.values()],
      };
      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist stock category data", error);
    }
  }
}
