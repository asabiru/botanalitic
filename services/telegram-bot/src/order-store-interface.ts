import type { OrderRecord, OrderStatus } from "./order-store.js";

export type CreateOrderInput = Omit<
  OrderRecord,
  "id" | "createdAt" | "updatedAt" | "status"
> & { status?: OrderStatus };

export interface IOrderStore {
  create(input: CreateOrderInput): OrderRecord | Promise<OrderRecord>;
  update(orderId: string, patch: Partial<OrderRecord>): OrderRecord | undefined | Promise<OrderRecord | undefined>;
  getById(orderId: string): OrderRecord | undefined | Promise<OrderRecord | undefined>;
  getByPaymentId(paymentId: string): OrderRecord | undefined | Promise<OrderRecord | undefined>;
  listByTelegramUserId(telegramUserId: number): OrderRecord[] | Promise<OrderRecord[]>;
}
