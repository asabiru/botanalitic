import { config } from "../config.js";

export function isAdmin(userId: number): boolean {
  if (!config.ADMIN_CHAT_ID) return false;
  return String(userId) === config.ADMIN_CHAT_ID;
}

export async function adminGuard(ctx: any, next: () => Promise<void>): Promise<void> {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    await ctx.reply("Нет доступа");
    return;
  }
  return next();
}
