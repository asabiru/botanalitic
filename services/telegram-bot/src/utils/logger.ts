import { config } from "../config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function getConfiguredLevel(): LogLevel {
  const level = config.LOG_LEVEL as string;
  if (level in LOG_LEVELS) {
    return level as LogLevel;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getConfiguredLevel()];
}

export type WebhookLogEntry = {
  timestamp: string;
  event: string;
  paymentId: string | undefined;
  status: string;
  details?: Record<string, unknown>;
};

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },

  webhookEvent(entry: WebhookLogEntry): void {
    if (shouldLog("info")) {
      console.info(JSON.stringify(entry));
    }
  }
};
