import OpenAI from "openai";
import { config } from "../../config.js";

let client: OpenAI | null = null;

/**
 * Returns a shared OpenAI client when OPENAI_API_KEY is configured, otherwise null.
 * All call sites are expected to gracefully degrade when the client is missing.
 */
export function getOpenAIClient(): OpenAI | null {
  if (!config.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return client;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(config.OPENAI_API_KEY);
}
