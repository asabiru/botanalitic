import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { AiAnalysisService } from "./ai-analysis.js";
import { SessionStore } from "./session-store.js";
import { YooKassaService } from "./yookassa.js";
import { OrderStore } from "./order-store.js";
import { PromoStore } from "./promo/promo-store.js";
import { ReferralStore } from "./promo/referral.js";

export const sessionStore = new SessionStore();
export const orderStore = new OrderStore();
export const aiAnalysisService = new AiAnalysisService();
export const yooKassaService = new YooKassaService();
export const promoStore = new PromoStore();
export const referralStore = new ReferralStore();
export const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);