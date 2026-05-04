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
      // Акции РФ
      { name: "Дивидендные акции РФ", description: "Акции российских компаний с высокой дивидендной доходностью", icon: "💰", instrumentId: "ru-stocks" },
      { name: "Акции роста РФ", description: "Быстрорастущие российские компании с потенциалом роста капитализации", icon: "🚀", instrumentId: "ru-stocks" },
      { name: "Голубые фишки РФ", description: "Наиболее ликвидные и стабильные акции российского рынка", icon: "💎", instrumentId: "ru-stocks" },
      { name: "Недооценённые акции РФ", description: "Акции с низкими мультипликаторами и потенциалом переоценки", icon: "🔍", instrumentId: "ru-stocks" },
      { name: "Нефтегаз РФ", description: "Крупнейшие нефтегазовые компании России", icon: "🛢", instrumentId: "ru-stocks" },
      { name: "Банки и финансы РФ", description: "Крупнейшие банки и финансовые компании российского рынка", icon: "🏦", instrumentId: "ru-stocks" },
      { name: "Металлургия и добыча РФ", description: "Горнодобывающие и металлургические компании России", icon: "⛏", instrumentId: "ru-stocks" },
      { name: "IT и телеком РФ", description: "Технологические и телекоммуникационные компании России", icon: "📡", instrumentId: "ru-stocks" },
      { name: "Ритейл и потребсектор РФ", description: "Розничная торговля и потребительские компании России", icon: "🛒", instrumentId: "ru-stocks" },
      // Акции США
      { name: "Tech-акции США", description: "Технологические гиганты и перспективные IT-компании", icon: "💻", instrumentId: "us-stocks" },
      { name: "Дивидендные аристократы США", description: "Компании, повышающие дивиденды 25+ лет подряд", icon: "👑", instrumentId: "us-stocks" },
      { name: "Акции роста США", description: "Быстрорастущие американские компании", icon: "📈", instrumentId: "us-stocks" },
      { name: "Healthcare США", description: "Фармацевтические и биотехнологические компании", icon: "💊", instrumentId: "us-stocks" },
      { name: "Финансовый сектор США", description: "Крупнейшие банки, страховые и платёжные компании", icon: "🏛", instrumentId: "us-stocks" },
      { name: "Промышленность и энергетика США", description: "Энергетические и промышленные гиганты", icon: "⚡", instrumentId: "us-stocks" },
      { name: "AI и полупроводники", description: "Компании в сфере искусственного интеллекта и чипов", icon: "🤖", instrumentId: "us-stocks" },
      // Крипто
      { name: "Крипто — Layer 1", description: "Основные блокчейн-платформы первого уровня", icon: "⛓", instrumentId: "crypto" },
      { name: "Крипто — DeFi", description: "Токены децентрализованных финансовых протоколов", icon: "🏦", instrumentId: "crypto" },
      { name: "Крипто — мемкоины", description: "Высоковолатильные мем-токены с высоким риском", icon: "🐕", instrumentId: "crypto" },
      { name: "Крипто — инфраструктура", description: "Оракулы, мосты, хранение данных и другая инфраструктура", icon: "🔗", instrumentId: "crypto" },
      { name: "Крипто — GameFi и метавселенные", description: "Игровые токены и проекты метавселенных", icon: "🎮", instrumentId: "crypto" },
    ];

    const categoryIds: string[] = [];
    for (const cat of defaultCategories) {
      const created = this.addCategory(cat);
      categoryIds.push(created.id);
    }

    const defaultRecs: { ci: number; data: Omit<StockRecommendation, "id" | "addedAt" | "updatedAt" | "isActive" | "categoryId"> }[] = [
      // 0: Дивидендные акции РФ
      { ci: 0, data: { ticker: "SBER", name: "Сбербанк", reason: "Стабильные дивиденды, P/E ниже исторического среднего, рост прибыли", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "LKOH", name: "Лукойл", reason: "Высокая дивидендная доходность, buyback программа, сильный денежный поток", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "GMKN", name: "Норникель", reason: "Дивидендная политика, уникальные активы, мировой лидер по палладию", riskLevel: "medium", horizon: "long" } },
      { ci: 0, data: { ticker: "NVTK", name: "Новатэк", reason: "Крупнейший частный газодобытчик, проекты СПГ, стабильные дивиденды", riskLevel: "medium", horizon: "long" } },
      { ci: 0, data: { ticker: "TATN", name: "Татнефть", reason: "Стабильная дивидендная политика, низкая себестоимость добычи, нефтехимия", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "SNGS", name: "Сургутнефтегаз", reason: "Огромная валютная кубышка, дивиденды по привилегированным акциям", riskLevel: "low", horizon: "medium" } },
      { ci: 0, data: { ticker: "PHOR", name: "Фосагро", reason: "Мировой лидер по фосфорным удобрениям, высокие дивиденды", riskLevel: "medium", horizon: "medium" } },
      { ci: 0, data: { ticker: "BANEP", name: "Башнефть преф", reason: "Высокая дивидендная доходность привилегированных акций", riskLevel: "low", horizon: "medium" } },

      // 1: Акции роста РФ
      { ci: 1, data: { ticker: "OZON", name: "Ozon", reason: "Быстрый рост выручки, экспансия в регионы, улучшение юнит-экономики", riskLevel: "high", horizon: "long" } },
      { ci: 1, data: { ticker: "POSI", name: "Positive Technologies", reason: "Лидер кибербезопасности в РФ, рост выручки 50%+ YoY", riskLevel: "medium", horizon: "medium" } },
      { ci: 1, data: { ticker: "YDEX", name: "Яндекс", reason: "Экосистема: поиск, такси, e-commerce, облако, AI-разработки", riskLevel: "medium", horizon: "long" } },
      { ci: 1, data: { ticker: "VKCO", name: "VK", reason: "Крупнейшая соцсеть Рунета, VK Play, VK Музыка, рост экосистемы", riskLevel: "high", horizon: "long" } },
      { ci: 1, data: { ticker: "HEAD", name: "HeadHunter", reason: "Монополист на рынке онлайн-рекрутинга РФ, рост ARPU", riskLevel: "medium", horizon: "medium" } },
      { ci: 1, data: { ticker: "WUSH", name: "Whoosh", reason: "Лидер кикшеринга в РФ, быстрая экспансия в регионы", riskLevel: "high", horizon: "medium" } },
      { ci: 1, data: { ticker: "ASTR", name: "Астра", reason: "Импортозамещение ОС, рост клиентской базы в госсекторе и бизнесе", riskLevel: "medium", horizon: "long" } },

      // 2: Голубые фишки РФ
      { ci: 2, data: { ticker: "GAZP", name: "Газпром", reason: "Крупнейшая газовая компания мира, инфраструктурный монополист", riskLevel: "medium", horizon: "long" } },
      { ci: 2, data: { ticker: "ROSN", name: "Роснефть", reason: "Крупнейшая нефтяная компания РФ, проект Восток Ойл", riskLevel: "medium", horizon: "long" } },
      { ci: 2, data: { ticker: "VTBR", name: "ВТБ", reason: "Второй крупнейший банк РФ, госбанк с широкой сетью", riskLevel: "medium", horizon: "long" } },
      { ci: 2, data: { ticker: "NLMK", name: "НЛМК", reason: "Крупнейший металлург РФ, экспортная выручка, низкие издержки", riskLevel: "medium", horizon: "long" } },
      { ci: 2, data: { ticker: "MOEX", name: "Мосбиржа", reason: "Монополист биржевой инфраструктуры, рост объёмов торгов", riskLevel: "low", horizon: "long" } },

      // 3: Недооценённые акции РФ
      { ci: 3, data: { ticker: "MTSS", name: "МТС", reason: "Низкий P/E, стабильные дивиденды, развитие экосистемы", riskLevel: "low", horizon: "medium" } },
      { ci: 3, data: { ticker: "RUAL", name: "Русал", reason: "Крупнейший производитель алюминия, низкие мультипликаторы", riskLevel: "high", horizon: "long" } },
      { ci: 3, data: { ticker: "PIKK", name: "ПИК", reason: "Крупнейший девелопер РФ, восстановление рынка жилья", riskLevel: "high", horizon: "long" } },
      { ci: 3, data: { ticker: "AFKS", name: "АФК Система", reason: "Холдинг с недооценёнными активами: МТС, Ozon, Segezha, Медси", riskLevel: "high", horizon: "long" } },
      { ci: 3, data: { ticker: "BSPB", name: "Банк Санкт-Петербург", reason: "Низкий P/E, высокая рентабельность, рост кредитного портфеля", riskLevel: "medium", horizon: "medium" } },
      { ci: 3, data: { ticker: "IRAO", name: "Интер РАО", reason: "Низкие мультипликаторы, большая кубышка на балансе, энергетика", riskLevel: "low", horizon: "long" } },

      // 4: Нефтегаз РФ
      { ci: 4, data: { ticker: "LKOH", name: "Лукойл", reason: "Крупнейшая частная нефтяная компания, сильный buyback, дивиденды", riskLevel: "low", horizon: "medium" } },
      { ci: 4, data: { ticker: "ROSN", name: "Роснефть", reason: "Проект Восток Ойл, крупнейшие запасы нефти, госкомпания", riskLevel: "medium", horizon: "long" } },
      { ci: 4, data: { ticker: "GAZP", name: "Газпром", reason: "Газовый монополист, Сила Сибири, огромные запасы", riskLevel: "medium", horizon: "long" } },
      { ci: 4, data: { ticker: "NVTK", name: "Новатэк", reason: "Лидер СПГ в РФ, проект Арктик СПГ-2, рост добычи", riskLevel: "medium", horizon: "long" } },
      { ci: 4, data: { ticker: "TATN", name: "Татнефть", reason: "Эффективная нефтяная компания, нефтехимия, стабильные дивиденды", riskLevel: "low", horizon: "medium" } },
      { ci: 4, data: { ticker: "SNGS", name: "Сургутнефтегаз", reason: "Валютная подушка $50+ млрд, хедж от девальвации рубля", riskLevel: "low", horizon: "medium" } },
      { ci: 4, data: { ticker: "TRNFP", name: "Транснефть преф", reason: "Монополист нефтепроводов, стабильный cash flow и дивиденды", riskLevel: "low", horizon: "long" } },

      // 5: Банки и финансы РФ
      { ci: 5, data: { ticker: "SBER", name: "Сбербанк", reason: "Крупнейший банк РФ, рекордная прибыль, digital-экосистема", riskLevel: "low", horizon: "medium" } },
      { ci: 5, data: { ticker: "VTBR", name: "ВТБ", reason: "Второй банк по активам, широкая розница, рост кредитования", riskLevel: "medium", horizon: "long" } },
      { ci: 5, data: { ticker: "TCSG", name: "Т-Банк (Тинькофф)", reason: "Крупнейший онлайн-банк РФ, экосистема, рост клиентской базы", riskLevel: "medium", horizon: "long" } },
      { ci: 5, data: { ticker: "BSPB", name: "Банк Санкт-Петербург", reason: "Высокая рентабельность, региональный лидер, низкий P/E", riskLevel: "medium", horizon: "medium" } },
      { ci: 5, data: { ticker: "MOEX", name: "Мосбиржа", reason: "Биржевой монополист, рост объёмов торгов, комиссионный доход", riskLevel: "low", horizon: "long" } },
      { ci: 5, data: { ticker: "CBOM", name: "МКБ", reason: "Растущий универсальный банк, корпоративное кредитование", riskLevel: "medium", horizon: "medium" } },

      // 6: Металлургия и добыча РФ
      { ci: 6, data: { ticker: "GMKN", name: "Норникель", reason: "Мировой лидер по палладию и никелю, уникальные месторождения", riskLevel: "medium", horizon: "long" } },
      { ci: 6, data: { ticker: "NLMK", name: "НЛМК", reason: "Крупнейший производитель стали, низкие издержки, экспорт", riskLevel: "medium", horizon: "long" } },
      { ci: 6, data: { ticker: "CHMF", name: "Северсталь", reason: "Вертикальная интеграция, высокая маржа, дивиденды", riskLevel: "medium", horizon: "medium" } },
      { ci: 6, data: { ticker: "MAGN", name: "ММК", reason: "Крупный производитель стали, модернизация производства", riskLevel: "medium", horizon: "medium" } },
      { ci: 6, data: { ticker: "ALRS", name: "АЛРОСА", reason: "Мировой лидер по добыче алмазов, восстановление спроса", riskLevel: "medium", horizon: "long" } },
      { ci: 6, data: { ticker: "PLZL", name: "Полюс Золото", reason: "Крупнейший золотодобытчик РФ, рост цен на золото", riskLevel: "medium", horizon: "long" } },
      { ci: 6, data: { ticker: "RUAL", name: "Русал", reason: "Второй в мире по производству алюминия, зелёная энергетика", riskLevel: "high", horizon: "long" } },
      { ci: 6, data: { ticker: "POLY", name: "Полиметалл", reason: "Золото и серебро, международные операции, дивиденды", riskLevel: "medium", horizon: "long" } },

      // 7: IT и телеком РФ
      { ci: 7, data: { ticker: "YDEX", name: "Яндекс", reason: "Поиск, такси, e-commerce, облако, AI, самоуправляемые авто", riskLevel: "medium", horizon: "long" } },
      { ci: 7, data: { ticker: "VKCO", name: "VK", reason: "Соцсети, мессенджер, VK Play, VK Музыка, образование", riskLevel: "high", horizon: "long" } },
      { ci: 7, data: { ticker: "MTSS", name: "МТС", reason: "Крупнейший телеком-оператор, MTS Банк, стриминг, экосистема", riskLevel: "low", horizon: "medium" } },
      { ci: 7, data: { ticker: "POSI", name: "Positive Technologies", reason: "Кибербезопасность №1 в РФ, рост 50%+ в год", riskLevel: "medium", horizon: "medium" } },
      { ci: 7, data: { ticker: "RTKM", name: "Ростелеком", reason: "Крупнейший телеком-оператор, ГосОблако, ЦОД, кибербезопасность", riskLevel: "low", horizon: "long" } },
      { ci: 7, data: { ticker: "ASTR", name: "Астра", reason: "Операционная система Astra Linux, импортозамещение IT", riskLevel: "medium", horizon: "long" } },
      { ci: 7, data: { ticker: "HEAD", name: "HeadHunter", reason: "Онлайн-рекрутинг, монопольное положение, высокая маржа", riskLevel: "medium", horizon: "medium" } },

      // 8: Ритейл и потребсектор РФ
      { ci: 8, data: { ticker: "FIVE", name: "X5 Group (Пятёрочка)", reason: "Крупнейший продуктовый ритейлер, рост like-for-like, онлайн", riskLevel: "low", horizon: "medium" } },
      { ci: 8, data: { ticker: "MGNT", name: "Магнит", reason: "Второй продуктовый ритейлер, экспансия, дивиденды", riskLevel: "low", horizon: "medium" } },
      { ci: 8, data: { ticker: "OZON", name: "Ozon", reason: "Крупнейший маркетплейс, рост GMV 70%+, финтех", riskLevel: "high", horizon: "long" } },
      { ci: 8, data: { ticker: "WBAY", name: "Wildberries", reason: "Лидер e-commerce в РФ, глобальная экспансия", riskLevel: "high", horizon: "long" } },
      { ci: 8, data: { ticker: "LENT", name: "Лента", reason: "Гипермаркеты и супермаркеты, рост онлайн-продаж", riskLevel: "medium", horizon: "medium" } },
      { ci: 8, data: { ticker: "FLOT", name: "Совкомфлот", reason: "Крупнейший судоходный оператор РФ, высокие фрахтовые ставки", riskLevel: "medium", horizon: "medium" } },

      // 9: Tech-акции США
      { ci: 9, data: { ticker: "AAPL", name: "Apple", reason: "Крупнейшая компания мира, экосистемный эффект, сильный buyback", targetPrice: "$220", riskLevel: "low", horizon: "long" } },
      { ci: 9, data: { ticker: "MSFT", name: "Microsoft", reason: "Azure рост, интеграция AI (Copilot), диверсифицированный бизнес", targetPrice: "$480", riskLevel: "low", horizon: "long" } },
      { ci: 9, data: { ticker: "GOOGL", name: "Alphabet (Google)", reason: "Доминирование в поиске, YouTube, Google Cloud, AI Gemini", targetPrice: "$190", riskLevel: "low", horizon: "long" } },
      { ci: 9, data: { ticker: "AMZN", name: "Amazon", reason: "E-commerce + AWS лидер, рекламный бизнес, логистика", targetPrice: "$210", riskLevel: "low", horizon: "long" } },
      { ci: 9, data: { ticker: "META", name: "Meta Platforms", reason: "Facebook, Instagram, WhatsApp, Reality Labs, AI инвестиции", targetPrice: "$550", riskLevel: "medium", horizon: "long" } },
      { ci: 9, data: { ticker: "NFLX", name: "Netflix", reason: "Лидер стриминга, рост подписчиков, рекламная модель", targetPrice: "$700", riskLevel: "medium", horizon: "long" } },
      { ci: 9, data: { ticker: "CRM", name: "Salesforce", reason: "Лидер CRM, AI Einstein, рост маржи, M&A стратегия", targetPrice: "$320", riskLevel: "medium", horizon: "long" } },
      { ci: 9, data: { ticker: "ORCL", name: "Oracle", reason: "Облачная инфраструктура, OCI рост, база данных №1", targetPrice: "$160", riskLevel: "low", horizon: "long" } },
      { ci: 9, data: { ticker: "ADBE", name: "Adobe", reason: "Монополист креативного ПО, AI Firefly, подписочная модель", targetPrice: "$580", riskLevel: "medium", horizon: "long" } },

      // 10: Дивидендные аристократы США
      { ci: 10, data: { ticker: "JNJ", name: "Johnson & Johnson", reason: "60+ лет роста дивидендов, фармацевтический гигант", targetPrice: "$175", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "KO", name: "Coca-Cola", reason: "62 года роста дивидендов, глобальный бренд, защитный актив", targetPrice: "$65", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "PG", name: "Procter & Gamble", reason: "68 лет роста дивидендов, FMCG гигант, стабильный cash flow", targetPrice: "$175", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "PEP", name: "PepsiCo", reason: "51 год роста дивидендов, снэки + напитки, глобальный охват", targetPrice: "$185", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "MCD", name: "McDonald's", reason: "49 лет роста дивидендов, франшизная модель, глобальный лидер", targetPrice: "$310", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "WMT", name: "Walmart", reason: "51 год роста дивидендов, крупнейший ритейлер мира, e-commerce рост", targetPrice: "$185", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "XOM", name: "ExxonMobil", reason: "42 года роста дивидендов, крупнейшая нефтяная компания", targetPrice: "$120", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "CVX", name: "Chevron", reason: "37 лет роста дивидендов, сильный баланс, buyback", targetPrice: "$170", riskLevel: "low", horizon: "long" } },
      { ci: 10, data: { ticker: "ABT", name: "Abbott Laboratories", reason: "52 года роста дивидендов, медоборудование и диагностика", targetPrice: "$120", riskLevel: "low", horizon: "long" } },

      // 11: Акции роста США
      { ci: 11, data: { ticker: "TSLA", name: "Tesla", reason: "Лидер EV, рост поставок, развитие AI и робототехники", targetPrice: "$300", riskLevel: "high", horizon: "long" } },
      { ci: 11, data: { ticker: "PLTR", name: "Palantir", reason: "AI-аналитика для госсектора и бизнеса, рост AIP платформы", targetPrice: "$30", riskLevel: "high", horizon: "long" } },
      { ci: 11, data: { ticker: "SHOP", name: "Shopify", reason: "Лидер e-commerce платформ, рост GMV, международная экспансия", targetPrice: "$80", riskLevel: "high", horizon: "long" } },
      { ci: 11, data: { ticker: "UBER", name: "Uber", reason: "Доминирование в райдшеринге и доставке, рост прибыльности", targetPrice: "$85", riskLevel: "medium", horizon: "long" } },
      { ci: 11, data: { ticker: "ABNB", name: "Airbnb", reason: "Лидер краткосрочной аренды, рост ADR, новые категории", targetPrice: "$170", riskLevel: "medium", horizon: "long" } },
      { ci: 11, data: { ticker: "COIN", name: "Coinbase", reason: "Крупнейшая крипто-биржа США, рост от институциональных клиентов", targetPrice: "$280", riskLevel: "high", horizon: "medium" } },
      { ci: 11, data: { ticker: "SQ", name: "Block (Square)", reason: "Платёжная экосистема, Cash App, Bitcoin интеграция", targetPrice: "$85", riskLevel: "high", horizon: "long" } },
      { ci: 11, data: { ticker: "SNOW", name: "Snowflake", reason: "Облачная аналитика данных, рост выручки, расширение клиентской базы", targetPrice: "$200", riskLevel: "high", horizon: "long" } },
      { ci: 11, data: { ticker: "CRWD", name: "CrowdStrike", reason: "Лидер облачной кибербезопасности, рост ARR 30%+", targetPrice: "$380", riskLevel: "medium", horizon: "long" } },

      // 12: Healthcare США
      { ci: 12, data: { ticker: "LLY", name: "Eli Lilly", reason: "Лидер GLP-1 (Mounjaro, Zepbound), рост выручки 30%+", targetPrice: "$900", riskLevel: "medium", horizon: "long" } },
      { ci: 12, data: { ticker: "UNH", name: "UnitedHealth", reason: "Крупнейшая медицинская страховая, Optum, стабильный рост", targetPrice: "$580", riskLevel: "low", horizon: "long" } },
      { ci: 12, data: { ticker: "PFE", name: "Pfizer", reason: "Фарма-гигант, новый портфель онкопрепаратов, дивиденды", targetPrice: "$35", riskLevel: "medium", horizon: "medium" } },
      { ci: 12, data: { ticker: "ABBV", name: "AbbVie", reason: "Иммунология (Skyrizi, Rinvoq), замещение Humira, дивиденды", targetPrice: "$200", riskLevel: "low", horizon: "long" } },
      { ci: 12, data: { ticker: "MRK", name: "Merck", reason: "Keytruda — топ онкопрепарат, сильный пайплайн, дивиденды", targetPrice: "$140", riskLevel: "low", horizon: "long" } },
      { ci: 12, data: { ticker: "TMO", name: "Thermo Fisher", reason: "Лидер лабораторного оборудования, рост биотеха", targetPrice: "$620", riskLevel: "low", horizon: "long" } },
      { ci: 12, data: { ticker: "NVO", name: "Novo Nordisk", reason: "Лидер GLP-1 (Ozempic, Wegovy), крупнейшая фарма Европы", targetPrice: "$150", riskLevel: "medium", horizon: "long" } },

      // 13: Финансовый сектор США
      { ci: 13, data: { ticker: "JPM", name: "JPMorgan Chase", reason: "Крупнейший банк США, лидер инвестбанкинга, стабильные дивиденды", targetPrice: "$220", riskLevel: "low", horizon: "long" } },
      { ci: 13, data: { ticker: "V", name: "Visa", reason: "Доминирование в платежах, рост безналичных транзакций", targetPrice: "$310", riskLevel: "low", horizon: "long" } },
      { ci: 13, data: { ticker: "MA", name: "Mastercard", reason: "Второй платёжный гигант, рост cross-border транзакций", targetPrice: "$500", riskLevel: "low", horizon: "long" } },
      { ci: 13, data: { ticker: "BAC", name: "Bank of America", reason: "Второй банк США, рост NII от высоких ставок", targetPrice: "$42", riskLevel: "medium", horizon: "medium" } },
      { ci: 13, data: { ticker: "GS", name: "Goldman Sachs", reason: "Лидер инвестбанкинга, восстановление IPO-рынка", targetPrice: "$430", riskLevel: "medium", horizon: "medium" } },
      { ci: 13, data: { ticker: "BRK.B", name: "Berkshire Hathaway", reason: "Конгломерат Баффетта, страхование, $150+ млрд кэша", targetPrice: "$430", riskLevel: "low", horizon: "long" } },

      // 14: Промышленность и энергетика США
      { ci: 14, data: { ticker: "XOM", name: "ExxonMobil", reason: "Крупнейшая нефтяная компания, сильный баланс, дивиденды", targetPrice: "$120", riskLevel: "low", horizon: "long" } },
      { ci: 14, data: { ticker: "CVX", name: "Chevron", reason: "Второй нефтяной гигант, buyback, Пермский бассейн", targetPrice: "$170", riskLevel: "low", horizon: "long" } },
      { ci: 14, data: { ticker: "NEE", name: "NextEra Energy", reason: "Крупнейший производитель возобновляемой энергии", targetPrice: "$85", riskLevel: "low", horizon: "long" } },
      { ci: 14, data: { ticker: "CAT", name: "Caterpillar", reason: "Лидер тяжёлого машиностроения, инфраструктурный бум", targetPrice: "$320", riskLevel: "medium", horizon: "long" } },
      { ci: 14, data: { ticker: "GE", name: "GE Aerospace", reason: "Лидер авиадвигателей, рост авиаперевозок, высокая маржа", targetPrice: "$200", riskLevel: "medium", horizon: "long" } },
      { ci: 14, data: { ticker: "LMT", name: "Lockheed Martin", reason: "Крупнейший оборонный подрядчик, F-35, рост бюджетов", targetPrice: "$520", riskLevel: "low", horizon: "long" } },
      { ci: 14, data: { ticker: "BA", name: "Boeing", reason: "Дуополия в авиастроении, восстановление поставок 737 MAX", targetPrice: "$230", riskLevel: "high", horizon: "long" } },

      // 15: AI и полупроводники
      { ci: 15, data: { ticker: "NVDA", name: "NVIDIA", reason: "Лидер AI-чипов, экспоненциальный рост data center сегмента", targetPrice: "$150", riskLevel: "medium", horizon: "long" } },
      { ci: 15, data: { ticker: "AMD", name: "AMD", reason: "MI300 конкурент NVIDIA, рост в серверных CPU и GPU", targetPrice: "$190", riskLevel: "medium", horizon: "long" } },
      { ci: 15, data: { ticker: "AVGO", name: "Broadcom", reason: "Лидер custom AI чипов, VMware интеграция, дивиденды", targetPrice: "$185", riskLevel: "medium", horizon: "long" } },
      { ci: 15, data: { ticker: "TSM", name: "TSMC", reason: "Крупнейший контрактный производитель чипов, монополия на 3нм", targetPrice: "$180", riskLevel: "medium", horizon: "long" } },
      { ci: 15, data: { ticker: "ARM", name: "ARM Holdings", reason: "Архитектура чипов для мобильных и AI, роялти модель", targetPrice: "$160", riskLevel: "high", horizon: "long" } },
      { ci: 15, data: { ticker: "INTC", name: "Intel", reason: "Восстановление позиций, Intel 18A, контрактное производство", targetPrice: "$35", riskLevel: "high", horizon: "long" } },
      { ci: 15, data: { ticker: "MRVL", name: "Marvell Technology", reason: "Custom AI чипы, рост data center, 5G инфраструктура", targetPrice: "$85", riskLevel: "medium", horizon: "long" } },
      { ci: 15, data: { ticker: "MU", name: "Micron", reason: "HBM память для AI, рост спроса на серверную память", targetPrice: "$110", riskLevel: "medium", horizon: "medium" } },

      // 16: Крипто — Layer 1
      { ci: 16, data: { ticker: "BTC", name: "Bitcoin", reason: "Крупнейшая криптовалюта, цифровое золото, институциональный спрос, ETF", riskLevel: "medium", horizon: "long" } },
      { ci: 16, data: { ticker: "ETH", name: "Ethereum", reason: "Крупнейшая smart-contract платформа, стейкинг, дефляционная модель", riskLevel: "medium", horizon: "long" } },
      { ci: 16, data: { ticker: "SOL", name: "Solana", reason: "Высокая скорость транзакций, растущая экосистема DeFi и NFT", riskLevel: "high", horizon: "medium" } },
      { ci: 16, data: { ticker: "ADA", name: "Cardano", reason: "Научный подход, Hydra масштабирование, развитие DeFi", riskLevel: "high", horizon: "long" } },
      { ci: 16, data: { ticker: "AVAX", name: "Avalanche", reason: "Subnet архитектура, быстрый финалити, институциональный интерес", riskLevel: "high", horizon: "medium" } },
      { ci: 16, data: { ticker: "DOT", name: "Polkadot", reason: "Мультичейн архитектура, парачейны, кросс-чейн мосты", riskLevel: "high", horizon: "long" } },
      { ci: 16, data: { ticker: "NEAR", name: "NEAR Protocol", reason: "Шардинг, абстракция аккаунтов, рост экосистемы AI + Web3", riskLevel: "high", horizon: "medium" } },
      { ci: 16, data: { ticker: "APT", name: "Aptos", reason: "Move язык, высокая пропускная способность, институциональные партнёрства", riskLevel: "high", horizon: "medium" } },
      { ci: 16, data: { ticker: "SUI", name: "Sui", reason: "Move VM, параллельная обработка, быстрый рост TVL", riskLevel: "high", horizon: "medium" } },
      { ci: 16, data: { ticker: "TON", name: "Toncoin", reason: "Интеграция с Telegram, 900M+ пользователей, рост mini apps", riskLevel: "high", horizon: "medium" } },

      // 17: Крипто — DeFi
      { ci: 17, data: { ticker: "UNI", name: "Uniswap", reason: "Крупнейший DEX, fee switch потенциал, растущие объёмы", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "AAVE", name: "Aave", reason: "Лидер lending протоколов, мультичейн экспансия, GHO стейблкоин", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "MKR", name: "Maker (Sky)", reason: "DAI стейблкоин, Real World Assets, стабильный доход протокола", riskLevel: "medium", horizon: "long" } },
      { ci: 17, data: { ticker: "LDO", name: "Lido", reason: "Крупнейший liquid staking протокол для Ethereum", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "CRV", name: "Curve", reason: "Лидер стейблкоин-свопов, crvUSD, gauge система", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "DYDX", name: "dYdX", reason: "Децентрализованная биржа деривативов, собственный блокчейн", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "GMX", name: "GMX", reason: "Perp DEX на Arbitrum, реальная доходность для стейкеров", riskLevel: "high", horizon: "medium" } },
      { ci: 17, data: { ticker: "PENDLE", name: "Pendle", reason: "Торговля доходностью, рост TVL, интеграция с LSD", riskLevel: "high", horizon: "short" } },

      // 18: Крипто — мемкоины
      { ci: 18, data: { ticker: "DOGE", name: "Dogecoin", reason: "Сильное community, высокая ликвидность среди мемкоинов", riskLevel: "high", horizon: "short" } },
      { ci: 18, data: { ticker: "PEPE", name: "Pepe", reason: "Топ мемкоин по капитализации, вирусный рост, высокий риск", riskLevel: "high", horizon: "short" } },
      { ci: 18, data: { ticker: "SHIB", name: "Shiba Inu", reason: "Shibarium L2, burn механизм, большое сообщество", riskLevel: "high", horizon: "short" } },
      { ci: 18, data: { ticker: "WIF", name: "dogwifhat", reason: "Топ мемкоин на Solana, высокая волатильность и ликвидность", riskLevel: "high", horizon: "short" } },
      { ci: 18, data: { ticker: "FLOKI", name: "Floki", reason: "Утилити-мемкоин: FlokiFi, Valhalla метавселенная", riskLevel: "high", horizon: "short" } },
      { ci: 18, data: { ticker: "BONK", name: "Bonk", reason: "Мемкоин Solana, интеграции с кошельками, высокий объём", riskLevel: "high", horizon: "short" } },

      // 19: Крипто — инфраструктура
      { ci: 19, data: { ticker: "LINK", name: "Chainlink", reason: "Крупнейший оракул, CCIP кросс-чейн протокол, стейкинг", riskLevel: "medium", horizon: "long" } },
      { ci: 19, data: { ticker: "FIL", name: "Filecoin", reason: "Децентрализованное хранение данных, рост enterprise adoption", riskLevel: "high", horizon: "long" } },
      { ci: 19, data: { ticker: "GRT", name: "The Graph", reason: "Индексация блокчейн-данных, SQL для Web3, рост запросов", riskLevel: "high", horizon: "medium" } },
      { ci: 19, data: { ticker: "ARB", name: "Arbitrum", reason: "Крупнейший L2 для Ethereum, Orbit chains, растущий TVL", riskLevel: "high", horizon: "medium" } },
      { ci: 19, data: { ticker: "OP", name: "Optimism", reason: "OP Stack, Superchain экосистема, Base на Optimism", riskLevel: "high", horizon: "medium" } },
      { ci: 19, data: { ticker: "RNDR", name: "Render", reason: "Децентрализованный GPU-рендеринг, AI и 3D графика", riskLevel: "high", horizon: "medium" } },
      { ci: 19, data: { ticker: "INJ", name: "Injective", reason: "DeFi-хаб, orderbook DEX, быстрый рост экосистемы", riskLevel: "high", horizon: "medium" } },

      // 20: Крипто — GameFi и метавселенные
      { ci: 20, data: { ticker: "AXS", name: "Axie Infinity", reason: "Пионер play-to-earn, Ronin сайдчейн, новые игры", riskLevel: "high", horizon: "medium" } },
      { ci: 20, data: { ticker: "SAND", name: "The Sandbox", reason: "Метавселенная, виртуальная недвижимость, бренд-партнёрства", riskLevel: "high", horizon: "long" } },
      { ci: 20, data: { ticker: "MANA", name: "Decentraland", reason: "Первая метавселенная, события и концерты, виртуальный мир", riskLevel: "high", horizon: "long" } },
      { ci: 20, data: { ticker: "IMX", name: "ImmutableX", reason: "L2 для NFT-игр, zero gas fees, партнёрство с GameStop", riskLevel: "high", horizon: "medium" } },
      { ci: 20, data: { ticker: "GALA", name: "Gala Games", reason: "Платформа блокчейн-игр, Gala Music, Gala Film", riskLevel: "high", horizon: "medium" } },
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
