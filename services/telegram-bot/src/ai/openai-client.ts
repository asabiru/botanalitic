import OpenAI from "openai";
import type { AppConfig } from "../config.js";

export function createOpenAIClient(config: AppConfig): OpenAI | null {
  const key = config.OPENAI_API_KEY;
  if (!key || key.trim() === "") {
    return null;
  }
  return new OpenAI({ apiKey: key });
}
