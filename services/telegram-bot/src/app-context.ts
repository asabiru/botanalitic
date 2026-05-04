import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { AiAnalysisService } from "./ai-analysis.js";
import { SessionStore } from "./session-store.js";
import { YooKassaService } from "./yookassa.js";
import { OrderStore } from "./order-store.js";
import { MarketDataService } from "./integrations/market-data.service.js";
import { CompetitorResearchService } from "./integrations/competitor/competitor-research.service.js";
import { MarketCache } from "./integrations/cache/market-cache.js";

const competitorCache = new MarketCache();

export const sessionStore = new SessionStore();
export const orderStore = new OrderStore();
export const aiAnalysisService = new AiAnalysisService();
export const yooKassaService = new YooKassaService();
export const marketDataService = new MarketDataService();
export const competitorResearchService = new CompetitorResearchService(competitorCache);
export const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);