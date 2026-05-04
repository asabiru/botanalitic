import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const LOG_PATH = resolve(process.cwd(), "tmp", "audit.log");

function ensureDir(): void {
  const dir = dirname(LOG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function auditLog(action: string, actor: string | number, details?: string): void {
  ensureDir();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] actor=${actor} action=${action}${details ? ` ${details}` : ""}\n`;
  try {
    appendFileSync(LOG_PATH, line, "utf8");
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
