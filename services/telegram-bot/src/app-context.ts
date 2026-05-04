import { PrismaClient } from "@prisma/client";
import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { AiAnalysisService } from "./ai-analysis.js";
import { createOpenAIClient } from "./ai/openai-client.js";
import { SessionStore } from "./session-store.js";
import { YooKassaService } from "./yookassa.js";
import { OrderStore } from "./order-store.js";
import { PrismaOrderRepository, PrismaUserRepository } from "./repositories/index.js";
import type { IOrderStore } from "./order-store-interface.js";
import { MarketDataService } from "./integrations/market-data.service.js";
import { PromoStore } from "./promo/promo-store.js";
import { ReferralStore } from "./promo/referral.js";

const databaseUrl = process.env.DATABASE_URL;

export const prisma: PrismaClient | null = databaseUrl
  ? new PrismaClient()
  : null;

const openai = createOpenAIClient(config);

export const sessionStore = new SessionStore();

export const orderStore: IOrderStore = prisma
  ? new PrismaOrderRepository(prisma)
  : new OrderStore();

export const userRepository: PrismaUserRepository | null = prisma
  ? new PrismaUserRepository(prisma)
  : null;

export const aiAnalysisService = new AiAnalysisService(
  openai,
  config.OPENAI_MODEL,
  config.OPENAI_MAX_TOKENS
);
export const yooKassaService = new YooKassaService();
export const marketDataService = new MarketDataService();
export const promoStore = new PromoStore();
export const referralStore = new ReferralStore();
export const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
