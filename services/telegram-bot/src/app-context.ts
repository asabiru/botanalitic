import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { AiAnalysisService } from "./ai-analysis.js";
import { SessionStore } from "./session-store.js";
import { YooKassaService } from "./yookassa.js";
import { OrderStore } from "./order-store.js";
import { MarketDataService } from "./integrations/market-data.service.js";
import { CompetitorResearchService } from "./integrations/competitor/competitor-research.service.js";
import { CompetitorSuggestionStore } from "./integrations/competitor/competitor-suggestion-store.js";
import { CompetitorAgent } from "./integrations/competitor/competitor-agent.js";
import { MarketCache } from "./integrations/cache/market-cache.js";
import { StockCategoryStore } from "./integrations/analytics/stock-category-store.js";
import { StockAnalyticsAgent } from "./integrations/analytics/stock-analytics-agent.js";
import { PriceAlertStore } from "./integrations/alerts/price-alert-store.js";
import { PriceAlertService } from "./integrations/alerts/price-alert-service.js";
import { DigestSubscriberStore } from "./integrations/digest/digest-subscriber-store.js";
import { MorningDigestService } from "./integrations/digest/morning-digest-service.js";

const competitorCache = new MarketCache();

export const sessionStore = new SessionStore();
export const orderStore = new OrderStore();
export const aiAnalysisService = new AiAnalysisService();
export const yooKassaService = new YooKassaService();
export const marketDataService = new MarketDataService();
export const competitorResearchService = new CompetitorResearchService(competitorCache);

const competitorSuggestionStore = new CompetitorSuggestionStore();
export const competitorAgent = new CompetitorAgent(competitorResearchService, competitorSuggestionStore);

const stockCategoryStore = new StockCategoryStore();
export const stockAnalyticsAgent = new StockAnalyticsAgent(stockCategoryStore);

export const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

export const priceAlertStore = new PriceAlertStore();
export const priceAlertService = new PriceAlertService(priceAlertStore, marketDataService, bot);

export const digestSubscriberStore = new DigestSubscriberStore();
export const morningDigestService = new MorningDigestService(digestSubscriberStore, marketDataService, bot);
