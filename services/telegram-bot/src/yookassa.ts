import axios from "axios";
import { randomUUID } from "node:crypto";
import { InstrumentCategory } from "./catalog.js";
import { config } from "./config.js";

export type PaymentResult = {
  paymentId: string;
  confirmationUrl: string;
};

export class YooKassaService {
  async createPayment(params: {
    instrument: InstrumentCategory;
    telegramUserId: number;
    ticker?: string;
    orderId?: string;
  }): Promise<PaymentResult> {
    const payload = {
      amount: {
        value: params.instrument.priceRub.toFixed(2),
        currency: "RUB"
      },
      confirmation: {
        type: "redirect",
        return_url: config.YOOKASSA_RETURN_URL ?? "https://t.me"
      },
      capture: true,
      description: `Оплата анализа: ${params.instrument.title}${params.ticker ? ` (${params.ticker})` : ""}`,
      metadata: {
        telegramUserId: String(params.telegramUserId),
        instrumentId: params.instrument.id,
        ticker: params.ticker ?? "",
        orderId: params.orderId ?? ""
      }
    };

    const response = await axios.post("https://api.yookassa.ru/v3/payments", payload, {
      auth: {
        username: config.YOOKASSA_SHOP_ID,
        password: config.YOOKASSA_SECRET_KEY
      },
      headers: {
        "Idempotence-Key": randomUUID(),
        "Content-Type": "application/json"
      }
    });

    return {
      paymentId: response.data.id,
      confirmationUrl: response.data.confirmation.confirmation_url
    };
  }
}