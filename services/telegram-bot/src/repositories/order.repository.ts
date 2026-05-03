import { PrismaClient, Prisma, Order, OrderStatus } from "@prisma/client";
import type { OrderRecord, OrderStatus as LegacyOrderStatus } from "../order-store.js";

export type CreateOrderInput = {
  telegramUserId: number;
  instrumentId: string;
  instrumentTitle: string;
  amountRub: number;
  ticker?: string;
  investorProfile?: string;
  paymentId?: string;
  paymentUrl?: string;
  status?: LegacyOrderStatus;
};

function toOrderRecord(order: Order): OrderRecord {
  return {
    id: order.id,
    telegramUserId: Number(order.telegramUserId),
    instrumentId: order.instrumentId,
    instrumentTitle: order.instrumentTitle,
    amountRub: order.amountRub,
    ticker: order.ticker ?? undefined,
    investorProfile: order.investorProfile ?? undefined,
    paymentId: order.paymentId ?? undefined,
    paymentUrl: order.paymentUrl ?? undefined,
    status: order.status as LegacyOrderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function toLegacyStatus(status: string): OrderStatus {
  const mapping: Record<string, OrderStatus> = {
    created: "created",
    waiting_payment: "waiting_payment",
    paid: "paid",
    delivered: "delivered",
    cancelled: "cancelled",
  };
  return mapping[status] ?? "created";
}

export class PrismaOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateOrderInput): Promise<OrderRecord> {
    const order = await this.prisma.order.create({
      data: {
        telegramUserId: BigInt(input.telegramUserId),
        instrumentId: input.instrumentId,
        instrumentTitle: input.instrumentTitle,
        amountRub: input.amountRub,
        ticker: input.ticker ?? null,
        investorProfile: input.investorProfile ?? null,
        paymentId: input.paymentId ?? null,
        paymentUrl: input.paymentUrl ?? null,
        status: toLegacyStatus(input.status ?? "created"),
      },
    });
    return toOrderRecord(order);
  }

  async update(
    orderId: string,
    patch: Partial<OrderRecord>
  ): Promise<OrderRecord | undefined> {
    try {
      const data: Record<string, unknown> = {};
      if (patch.status !== undefined) data.status = toLegacyStatus(patch.status);
      if (patch.paymentId !== undefined) data.paymentId = patch.paymentId;
      if (patch.paymentUrl !== undefined) data.paymentUrl = patch.paymentUrl;
      if (patch.ticker !== undefined) data.ticker = patch.ticker;
      if (patch.investorProfile !== undefined) data.investorProfile = patch.investorProfile;

      const order = await this.prisma.order.update({
        where: { id: orderId },
        data,
      });
      return toOrderRecord(order);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return undefined;
      }
      throw error;
    }
  }

  async getById(orderId: string): Promise<OrderRecord | undefined> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    return order ? toOrderRecord(order) : undefined;
  }

  async getByPaymentId(paymentId: string): Promise<OrderRecord | undefined> {
    const order = await this.prisma.order.findFirst({
      where: { paymentId },
    });
    return order ? toOrderRecord(order) : undefined;
  }

  async listByTelegramUserId(telegramUserId: number): Promise<OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: { telegramUserId: BigInt(telegramUserId) },
      orderBy: { createdAt: "desc" },
    });
    return orders.map(toOrderRecord);
  }
}
