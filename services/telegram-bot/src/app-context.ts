import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { AiAnalysisService } from "./ai-analysis.js";
import { createOpenAIClient } from "./ai/openai-client.js";
import { SessionStore } from "./session-store.js";
import { YooKassaService } from "./yookassa.js";
import { OrderStore } from "./order-store.js";

const openai = createOpenAIClient(config);

export const sessionStore = new SessionStore();
export const orderStore = new OrderStore();
export const aiAnalysisService = new AiAnalysisService(
  openai,
  config.OPENAI_MODEL,
  config.OPENAI_MAX_TOKENS
);
export const yooKassaService = new YooKassaService();
export const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
