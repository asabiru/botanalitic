import { PrismaClient, User } from "@prisma/client";

export type UserRecord = {
  id: string;
  telegramId: number;
  username: string | null;
  createdAt: string;
};

function toUserRecord(user: User): UserRecord {
  return {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  };
}

export class PrismaUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(telegramId: number, username?: string): Promise<UserRecord> {
    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: { username: username ?? null },
      create: {
        telegramId: BigInt(telegramId),
        username: username ?? null,
      },
    });
    return toUserRecord(user);
  }

  async getByTelegramId(telegramId: number): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    return user ? toUserRecord(user) : undefined;
  }
}
