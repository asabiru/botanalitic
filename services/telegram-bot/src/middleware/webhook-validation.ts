import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "../utils/logger.js";

// YooKassa IP ranges (CIDR)
// https://yookassa.ru/developers/using-api/webhooks
const YOOKASSA_ALLOWED_RANGES: Array<{ network: number; mask: number }> = [];

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrToRange(cidr: string): { network: number; mask: number } {
  const [ip, bits] = cidr.split("/");
  const mask = bits ? (~0 << (32 - Number(bits))) >>> 0 : 0xffffffff;
  const network = ipToNumber(ip) & mask;
  return { network, mask };
}

// Initialize allowed IP ranges
const YOOKASSA_CIDRS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11/32",
  "77.75.156.35/32"
];

for (const cidr of YOOKASSA_CIDRS) {
  YOOKASSA_ALLOWED_RANGES.push(cidrToRange(cidr));
}

function isAllowedIp(ip: string): boolean {
  // Strip IPv6 prefix if present
  const cleanIp = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  // Allow loopback and private IPs for local development
  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("192.168.")
  ) {
    return true;
  }

  const ipNum = ipToNumber(cleanIp);
  return YOOKASSA_ALLOWED_RANGES.some(
    (range) => (ipNum & range.mask) === range.network
  );
}

// Zod schema for YooKassa webhook event
export const yooKassaWebhookSchema = z.object({
  type: z.string().optional(),
  event: z.string(),
  object: z.object({
    id: z.string(),
    status: z.string(),
    amount: z
      .object({
        value: z.string(),
        currency: z.string()
      })
      .optional(),
    payment_method: z
      .object({
        type: z.string().optional(),
        id: z.string().optional()
      })
      .optional(),
    metadata: z
      .object({
        telegramUserId: z.string().optional(),
        instrumentId: z.string().optional(),
        ticker: z.string().optional(),
        orderId: z.string().optional()
      })
      .optional()
  })
});

export type YooKassaWebhookEvent = z.infer<typeof yooKassaWebhookSchema>;

/**
 * Middleware: validate that the request comes from a YooKassa IP
 */
export function validateWebhookIp(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? "";

  if (!isAllowedIp(ip)) {
    logger.warn("Webhook request from unauthorized IP", { ip });
    res.status(403).json({ ok: false, error: "forbidden" });
    return;
  }

  next();
}

/**
 * Middleware: validate webhook request body using zod schema
 */
export function validateWebhookBody(req: Request, res: Response, next: NextFunction): void {
  const result = yooKassaWebhookSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn("Webhook body validation failed", {
      errors: result.error.flatten().fieldErrors
    });
    res.status(400).json({ ok: false, error: "invalid_payload", details: result.error.flatten().fieldErrors });
    return;
  }

  // Attach parsed & validated body
  req.body = result.data;
  next();
}
