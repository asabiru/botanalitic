import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  YOOKASSA_SHOP_ID: z.string().min(1, "YOOKASSA_SHOP_ID is required"),
  YOOKASSA_SECRET_KEY: z.string().min(1, "YOOKASSA_SECRET_KEY is required"),
  YOOKASSA_RETURN_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().default(2000),
  ADMIN_CHAT_ID: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  LOG_LEVEL: z.string().default("info")
});

export type AppConfig = z.infer<typeof envSchema>;

export const config: AppConfig = envSchema.parse({
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  APP_BASE_URL: process.env.APP_BASE_URL,
  YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID,
  YOOKASSA_SECRET_KEY: process.env.YOOKASSA_SECRET_KEY,
  YOOKASSA_RETURN_URL: process.env.YOOKASSA_RETURN_URL ?? "https://t.me",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS,
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL
});